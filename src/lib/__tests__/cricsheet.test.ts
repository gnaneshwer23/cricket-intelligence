import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { strToU8, zipSync } from "fflate";
import { cricsheetResultText, mapCricsheetFormat, parseCricsheetMatch } from "../ingestion/cricsheet.ts";
import { ingestCricsheetZip, listCricsheetEntries } from "../ingestion/cricsheet-ingest.ts";
import { MemoryStorage } from "../storage/memory.ts";
import { SYNTHETIC_CRICSHEET_ID, syntheticCricsheetMatch } from "./fixtures/cricsheet-match.ts";

const bundle = () => parseCricsheetMatch(syntheticCricsheetMatch, SYNTHETIC_CRICSHEET_ID);

function syntheticZip() {
  return zipSync({
    "README.txt": strToU8("not a match"),
    [`${SYNTHETIC_CRICSHEET_ID}.json`]: strToU8(JSON.stringify(syntheticCricsheetMatch)),
  });
}

describe("cricsheet parser (synthetic test data)", () => {
  it("builds a labelled historical match", () => {
    const { match } = bundle();
    assert.equal(match.id, "cs-9900001");
    assert.equal(match.status, "COMPLETED");
    assert.equal(match.freshness, "HISTORICAL");
    assert.equal(match.format, "t20");
    assert.equal(match.title, "Team A vs Team B, Match 7 (Women)");
    assert.equal(match.series, "Synthetic League 2026");
    assert.equal(match.venue, "Synthetic Oval, Testville");
    assert.equal(match.resultText, "Team A won by 14 runs (D/L)");
    assert.deepEqual(match.toss, { winner: "Team B", decision: "field" });
    assert.deepEqual(match.playerOfMatch, ["A1"]);
    assert.equal(match.scheduledOvers, 20);
    assert.equal(match.provenance.provider, "cricsheet");
    assert.equal(match.coverage?.level, "ball_by_ball");
    assert.equal(match.coverage?.gender, "women");
  });

  it("reconciles innings totals, extras and penalty runs", () => {
    const { scorecard, quality } = bundle();
    assert.equal(scorecard.innings.length, 2, "super over excluded from scorecard");
    const [first, second] = scorecard.innings;
    assert.deepEqual(first!.score, { runs: 19, wickets: 2, overs: "2.0", balls: 12 });
    assert.deepEqual(first!.extras, { total: 8, byes: 0, legByes: 1, wides: 1, noBalls: 1, penalties: 5 });
    assert.deepEqual(second!.score, { runs: 5, wickets: 1, overs: "0.4", balls: 4 });
    assert.ok(quality.ok, JSON.stringify(quality.issues));
    assert.equal(quality.issues.length, 0);
  });

  it("computes batting rows (balls faced, boundaries, dismissals)", () => {
    const { scorecard } = bundle();
    const rows = scorecard.batting["cs-9900001-inn-1"]!;
    const by = Object.fromEntries(rows.map((r) => [r.playerName, r]));
    assert.deepEqual(rows.map((r) => r.playerName), ["A1", "A2", "A3"]);
    assert.equal(by.A1!.playerId, "cs-aaaa0001");
    assert.deepEqual([by.A1!.runs, by.A1!.balls, by.A1!.sixes, by.A1!.notOut], [7, 10, 1, true]);
    assert.deepEqual([by.A2!.runs, by.A2!.balls, by.A2!.fours], [4, 2, 1]);
    assert.equal(by.A2!.dismissal, "c Y1 b B1");
    assert.equal(by.A3!.dismissal, "run out (Y3)");

    const second = Object.fromEntries(
      scorecard.batting["cs-9900001-inn-2"]!.map((r) => [r.playerName, r]),
    );
    assert.equal(second.Y1!.fours, 0, "all-run four is not a boundary");
    assert.equal(second.Y3!.dismissal, "b A1");
    assert.equal(second.Y4!.dismissal, "retired hurt");
    assert.equal(second.Y4!.notOut, true);
  });

  it("charges bowlers correctly and finds maidens", () => {
    const { scorecard } = bundle();
    const by = Object.fromEntries(
      scorecard.bowling["cs-9900001-inn-1"]!.map((r) => [r.playerName, r]),
    );
    assert.deepEqual(by.B1, { playerId: "player-b1", playerName: "B1", overs: "1.0", maidens: 0, runs: 13, wickets: 1 });
    assert.deepEqual(by.B2, { playerId: "player-b2", playerName: "B2", overs: "1.0", maidens: 1, runs: 0, wickets: 0 });
    const a1 = scorecard.bowling["cs-9900001-inn-2"]![0]!;
    assert.equal(a1.runs, 4, "byes not charged to the bowler");
    assert.equal(a1.wickets, 1, "retired hurt not credited");
  });

  it("emits typed deliveries including the super over", () => {
    const { balls } = bundle();
    assert.equal(balls.length, 8 + 6 + 4 + 1);
    const wide = balls[1]!;
    assert.equal(wide.isWide, true);
    assert.equal(wide.ballInOver, 2);
    const caught = balls[3]!;
    assert.equal(caught.isWicket, true);
    assert.equal(caught.wicketKind, "caught");
    assert.equal(caught.playerOutId, "player-a2");
    const retired = balls[17]!;
    assert.equal(retired.isWicket, false);
    assert.equal(balls.at(-1)!.inningsNumber, 3);
    assert.ok(balls.every((b) => b.runsOffBat + b.extras === b.totalRuns));
  });

  it("lists squads as appearances", () => {
    const { appearances, players } = bundle();
    assert.equal(appearances.length, 8);
    assert.ok(appearances.some((a) => a.playerId === "cs-aaaa0001" && a.teamName === "Team A"));
    assert.ok(players.length >= 8);
  });

  it("maps formats and result text", () => {
    assert.equal(mapCricsheetFormat("IT20"), "t20");
    assert.equal(mapCricsheetFormat("MDM"), "other");
    assert.equal(
      cricsheetResultText({ winner: "X", by: { innings: 1, runs: 1 } }),
      "X won by an innings and 1 run",
    );
    assert.equal(cricsheetResultText({ result: "tie", eliminator: "Y" }), "Match tied (Y won the eliminator)");
    assert.equal(cricsheetResultText({ result: "draw" }), "Match drawn");
  });

  it("rejects structurally invalid input", () => {
    assert.throws(() => parseCricsheetMatch({ info: { teams: ["A"] } }, "1"), /missing info.teams/);
  });
});

describe("cricsheet zip ingest (memory storage)", () => {
  it("ignores non-match entries", () => {
    assert.deepEqual(listCricsheetEntries(syntheticZip()), [`${SYNTHETIC_CRICSHEET_ID}.json`]);
  });

  it("upserts once, skips on rerun, re-upserts with force", async () => {
    const storage = new MemoryStorage();
    const zip = syntheticZip();
    const first = await ingestCricsheetZip({ zip, storage, sourceLabel: "test.zip" });
    assert.equal(first.status, "success");
    assert.equal(first.upserted, 1);
    assert.equal((await storage.getBalls("cs-9900001")).length, 19);
    assert.ok(await storage.getScorecard("cs-9900001"));

    const second = await ingestCricsheetZip({ zip, storage, sourceLabel: "test.zip" });
    assert.deepEqual([second.upserted, second.skipped], [0, 1]);

    const forced = await ingestCricsheetZip({ zip, storage, sourceLabel: "test.zip", force: true });
    assert.equal(forced.upserted, 1);
    assert.equal((await storage.getBalls("cs-9900001")).length, 19, "idempotent ball ids");
    assert.equal((await storage.stats()).matchCount, 1);
  });

  it("records broken files as partial, not silent drops", async () => {
    const storage = new MemoryStorage();
    const zip = zipSync({
      "1.json": strToU8(JSON.stringify(syntheticCricsheetMatch)),
      "2.json": strToU8("{not json"),
    });
    const run = await ingestCricsheetZip({ zip, storage, sourceLabel: "bad.zip" });
    assert.equal(run.status, "partial");
    assert.equal(run.upserted, 1);
    assert.equal(run.skipped, 1);
    assert.ok(run.errors.some((e) => e.startsWith("match 2:")));
  });
});
