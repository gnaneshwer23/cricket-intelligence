import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { strToU8, zipSync } from "fflate";
import { ingestCricsheetZip } from "../ingestion/cricsheet-ingest.ts";
import { createPool, PostgresStorage } from "../storage/postgres.ts";
import { isModelable, rowsToTrajectories, winnerFromResult } from "../winprob/data.ts";
import {
  parForYear,
  probabilityBattingFirstWins,
  terminalChaseProbability,
  type ChaseState,
} from "../winprob/model.ts";
import { brier, ece, fitLogistic, reliability, solve } from "../winprob/train.ts";
import { computeWorm, turningPoints, WIN_PROB_MODEL, wormForMatch } from "../winprob/worm.ts";
import { syntheticCricsheetMatch } from "./fixtures/cricsheet-match.ts";

/** Deterministic PRNG so the regression test is stable. */
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

describe("logistic regression + metrics", () => {
  it("solves linear systems", () => {
    assert.deepEqual(solve([[2, 1], [1, 3]], [3, 5]).map((v) => Number(v.toFixed(6))), [0.8, 1.4]);
  });

  it("recovers known coefficients", () => {
    const rand = lcg(7);
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 20000; i += 1) {
      const x1 = rand() * 2 - 1;
      const x2 = rand() * 2 - 1;
      const p = 1 / (1 + Math.exp(-(0.5 + 2 * x1 - 1.5 * x2)));
      X.push([1, x1, x2]);
      y.push(rand() < p ? 1 : 0);
    }
    const fit = fitLogistic(X, y, { l2: 0 });
    assert.ok(fit.converged);
    const [b0, b1, b2] = fit.coefficients;
    assert.ok(Math.abs(b0! - 0.5) < 0.1 && Math.abs(b1! - 2) < 0.15 && Math.abs(b2! + 1.5) < 0.15, String(fit.coefficients));
  });

  it("scores calibration", () => {
    assert.equal(brier([1, 0], [1, 0]), 0);
    assert.equal(brier([0.5, 0.5], [1, 0]), 0.25);
    const bins = reliability([0.05, 0.05, 0.95, 0.95], [0, 0, 1, 1]);
    assert.equal(bins[0]!.n, 2);
    assert.equal(bins[9]!.observed, 1);
    assert.ok(Math.abs(ece(bins) - 0.05) < 1e-9);
  });
});

describe("win probability model v1", () => {
  const chase = (runs: number, wickets: number, legalBalls: number): ChaseState => ({
    innings: 2, target: 181, runs, wickets, legalBalls, year: 2024,
  });
  const pChase = (s: ChaseState) => 1 - probabilityBattingFirstWins(WIN_PROB_MODEL, s);

  it("applies settled-chase rules", () => {
    assert.equal(terminalChaseProbability(chase(181, 3, 100)), 1);
    assert.equal(terminalChaseProbability(chase(150, 10, 100)), 0);
    assert.equal(terminalChaseProbability(chase(179, 4, 120)), 0);
    assert.equal(terminalChaseProbability(chase(180, 4, 120)), 0.5);
    assert.equal(terminalChaseProbability(chase(100, 4, 60)), null);
  });

  it("moves the right way with runs, wickets and balls", () => {
    assert.ok(pChase(chase(120, 3, 90)) > pChase(chase(100, 3, 90)), "more runs helps the chase");
    assert.ok(pChase(chase(120, 3, 90)) > pChase(chase(120, 6, 90)), "wickets hurt the chase");
    assert.ok(pChase(chase(120, 3, 84)) > pChase(chase(120, 3, 96)), "same score earlier is better");
    const first = (runs: number, wickets: number) =>
      probabilityBattingFirstWins(WIN_PROB_MODEL, { innings: 1, runs, wickets, legalBalls: 72, year: 2024 });
    assert.ok(first(110, 2) > first(80, 2));
    assert.ok(first(110, 2) > first(110, 6));
  });

  it("uses the previous season's par", () => {
    const pars = { "2023": 183, "2024": 190.1 };
    assert.equal(parForYear(pars, 2025, 160), 190.1);
    assert.equal(parForYear(pars, 2030, 160), 190.1, "falls back to the latest earlier season");
    assert.equal(parForYear(pars, 2020, 160), 160);
  });

  it("ships coefficients that match its feature lists", () => {
    assert.equal(WIN_PROB_MODEL.firstInnings.coefficients.length, WIN_PROB_MODEL.firstInnings.features.length);
    assert.equal(WIN_PROB_MODEL.chase.coefficients.length, WIN_PROB_MODEL.chase.features.length);
    assert.equal(WIN_PROB_MODEL.version, "t20-wp-v1");
  });
});

describe("trajectories + worm", () => {
  type Row = Parameters<typeof rowsToTrajectories>[0][number];
  const row = (innings: number, seq: number, team: string, runs: number, wkts: number, legal: number, extra: Partial<Row> = {}): Row => ({
    match_id: "m1",
    ball_id: `b${innings}-${seq}`,
    innings_number: innings,
    over_number: Math.floor((legal - 1) / 6),
    ball_in_over: seq,
    batting_team: team,
    runs_total: 0,
    is_wicket: false,
    is_four: false,
    is_six: false,
    title: "A vs B",
    result_text: "B won by 9 wickets",
    year: 2024,
    cum_runs: String(runs),
    cum_wkts: String(wkts),
    cum_legal: String(legal),
    ...extra,
  });

  it("builds states, target and flags", () => {
    const rows = [
      row(1, 1, "A", 4, 0, 1, { is_four: true }),
      ...Array.from({ length: 119 }, (_, i) => row(1, i + 2, "A", 4, 0, i + 2)),
      row(2, 1, "B", 6, 0, 1, { is_six: true }),
      row(2, 2, "B", 6, 1, 2, { is_wicket: true }),
    ];
    const [t] = rowsToTrajectories(rows);
    assert.equal(t!.target, 5);
    assert.equal(t!.winner, "B");
    assert.equal(t!.chasing, "B");
    assert.equal(t!.flags.shortened, false);
    assert.ok(isModelable(t!));
    const worm = computeWorm(WIN_PROB_MODEL, t!);
    assert.equal(worm.filter((p) => p.event === "start").length, 2);
    assert.equal(worm.length, rows.length + 2);
    assert.equal(worm.at(-2)!.pBattingFirst, 0, "target reached");
    const tp = turningPoints(worm);
    assert.ok(tp.every((p) => p.event !== "start"));
  });

  it("parses winners and flags revised targets", () => {
    assert.equal(winnerFromResult("Kolkata Knight Riders won by 7 wickets (D/L)"), "Kolkata Knight Riders");
    assert.equal(winnerFromResult("Match tied (X won the eliminator)"), null);
    const [t] = rowsToTrajectories([row(1, 1, "A", 1, 0, 1, { result_text: "A won by 5 runs (D/L)" })]);
    assert.equal(t!.flags.revisedTarget, true);
    assert.equal(t!.flags.shortened, true);
    assert.equal(t!.flags.noChase, true);
    assert.equal(isModelable(t!), false);
  });
});

const url = process.env.CRICKETOS_TEST_DATABASE_URL?.trim();

describe("win probability storage (integration)", { skip: url ? false : "CRICKETOS_TEST_DATABASE_URL not set" }, () => {
  const pool = url ? createPool(url, { max: 2 }) : null;
  const matchId = "cs-9900003";

  after(async () => {
    await pool!.query("DELETE FROM matches WHERE id = $1", [matchId]);
    await pool!.query("DELETE FROM ingestion_runs WHERE operation = 'cricsheet:winprob-test.zip'");
    await pool!.end();
  });

  it("computes, stores and re-serves a worm with honest caveats", async () => {
    const zip = zipSync({ "9900003.json": strToU8(JSON.stringify(syntheticCricsheetMatch)) });
    const run = await ingestCricsheetZip({ zip, storage: new PostgresStorage(pool!), sourceLabel: "winprob-test.zip", force: true });
    assert.equal(run.status, "success");
    await pool!.query("DELETE FROM win_probability WHERE match_id = $1", [matchId]);

    const first = await wormForMatch(pool!, matchId, "Synthetic League 2026");
    assert.ok(first);
    assert.equal(first.cached, false);
    assert.equal(first.reliable, false, "D/L result in the fixture");
    assert.ok(first.caveats.some((c) => c.includes("trained on IPL")));
    // 14 + 4 deliveries (super over excluded) + 2 innings starts
    assert.equal(first.points.length, 20);

    const second = await wormForMatch(pool!, matchId, "Synthetic League 2026");
    assert.equal(second!.cached, true);
    assert.deepEqual(second!.points, first.points);
    assert.equal(second!.evidence.length, 2);
  });
});
