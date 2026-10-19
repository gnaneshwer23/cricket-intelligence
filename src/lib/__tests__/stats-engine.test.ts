import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { strToU8, zipSync } from "fflate";
import { loadRegister, parseCsv } from "../ingestion/cricsheet-register.ts";
import { ingestCricsheetZip } from "../ingestion/cricsheet-ingest.ts";
import {
  battingStats,
  bowlingStats,
  buildStatsWhere,
  matchup,
  searchPlayers,
  StatsInputError,
} from "../stats/engine.ts";
import { parseStatsFilter } from "../stats/http.ts";
import { createPool, PostgresStorage } from "../storage/postgres.ts";
import { syntheticCricsheetMatch } from "./fixtures/cricsheet-match.ts";

describe("stats filter parsing", () => {
  it("accepts valid filters", () => {
    const f = parseStatsFilter(
      new URLSearchParams("format=t20&phase=death&yearFrom=2016&yearTo=2016&gender=women&competition=IPL"),
    );
    assert.deepEqual(f, {
      format: "t20",
      phase: "death",
      gender: "women",
      yearFrom: 2016,
      yearTo: 2016,
      competition: "IPL",
    });
  });

  it("rejects bad enums and years", () => {
    assert.throws(() => parseStatsFilter(new URLSearchParams("format=t10")), StatsInputError);
    assert.throws(() => parseStatsFilter(new URLSearchParams("yearFrom=abc")), StatsInputError);
  });

  it("requires a limited-overs format for phases and excludes super overs", () => {
    assert.throws(() => buildStatsWhere({ phase: "death" }, { clauses: [], params: [] }), /format=t20/);
    const q = { clauses: [] as string[], params: [] as unknown[] };
    buildStatsWhere({ format: "odi", phase: "death" }, q);
    assert.ok(q.clauses.includes("NOT b.is_super_over"));
    assert.deepEqual(q.params, ["odi", 40, 49]);
  });
});

describe("register CSV", () => {
  it("parses quoted fields and CRLF", () => {
    const rows = parseCsv('identifier,name\r\nab12,"Smith, Jr"\r\ncd34,"Say ""hi"""\r\n');
    assert.deepEqual(rows, [
      { identifier: "ab12", name: "Smith, Jr" },
      { identifier: "cd34", name: 'Say "hi"' },
    ]);
  });
});

const url = process.env.CRICKETOS_TEST_DATABASE_URL?.trim();

/** SYNTHETIC TEST DATA — expected values are hand-computed from the fixture. */
describe("stats engine (integration)", { skip: url ? false : "CRICKETOS_TEST_DATABASE_URL not set" }, () => {
  const pool = url ? createPool(url, { max: 2 }) : null;
  const matchId = "cs-9900002";

  before(async () => {
    const zip = zipSync({ "9900002.json": strToU8(JSON.stringify(syntheticCricsheetMatch)) });
    const run = await ingestCricsheetZip({
      zip,
      storage: new PostgresStorage(pool!),
      sourceLabel: "stats-test.zip",
      force: true,
    });
    assert.equal(run.status, "success", run.errors.join("\n"));
    await loadRegister(pool!, "identifier,name\naaaa0001,Alpha Onesimus\n", "identifier,name,unique_name\naaaa0001,A1,A1\n");
  });

  after(async () => {
    await pool!.query("DELETE FROM matches WHERE id = $1", [matchId]);
    await pool!.query("DELETE FROM ingestion_runs WHERE operation = 'cricsheet:stats-test.zip'");
    await pool!.query("DELETE FROM player_aliases WHERE player_id = 'cs-aaaa0001'");
    await pool!.query("DELETE FROM player_register WHERE player_id = 'cs-aaaa0001'");
    await pool!.end();
  });

  // Scope every query to the synthetic competition so other data cannot leak in.
  const scope = { competition: "Synthetic League", yearFrom: 2026, yearTo: 2026 };

  it("computes batting with balls faced, dots and not-outs", async () => {
    const a1 = await battingStats(pool!, "cs-aaaa0001", scope);
    assert.deepEqual(
      {
        innings: a1.data.innings,
        runs: a1.data.runs,
        balls: a1.data.ballsFaced,
        outs: a1.data.outs,
        sixes: a1.data.sixes,
        dotPct: a1.data.dotPct,
        highest: a1.data.highest?.runs,
        notOut: a1.data.highest?.notOut,
      },
      { innings: 1, runs: 7, balls: 10, outs: 0, sixes: 1, dotPct: 80, highest: 7, notOut: true },
      "super-over six excluded",
    );
    assert.equal(a1.sample.n, 1);
    assert.match(a1.sample.warning ?? "", /Small sample/);
    assert.match(a1.evidence[0]!.sql, /FROM balls b JOIN matches m/);

    const a2 = await battingStats(pool!, "player-a2", scope);
    assert.deepEqual([a2.data.runs, a2.data.ballsFaced, a2.data.outs, a2.data.fours, a2.data.average], [4, 2, 1, 1, 4]);

    const y4 = await battingStats(pool!, "player-y4", scope);
    assert.equal(y4.data.outs, 0, "retired hurt is not out");
  });

  it("charges bowlers correctly", async () => {
    const b1 = await bowlingStats(pool!, "player-b1", scope);
    assert.deepEqual(
      [b1.data.overs, b1.data.runsConceded, b1.data.wickets, b1.data.wides, b1.data.noBalls, b1.data.economy],
      ["1.0", 13, 1, 1, 1, 13],
    );
    const b2 = await bowlingStats(pool!, "player-b2", scope);
    assert.deepEqual([b2.data.runsConceded, b2.data.wickets, b2.data.dotPct], [0, 0, 100], "run out not credited");
    const a1 = await bowlingStats(pool!, "cs-aaaa0001", scope);
    assert.deepEqual([a1.data.overs, a1.data.runsConceded, a1.data.wickets], ["0.4", 4, 1], "byes uncharged");
    assert.deepEqual(a1.missing, []);
  });

  it("returns matchups and respects phase filters", async () => {
    const m = await matchup(pool!, "player-a2", "player-b1", scope);
    assert.deepEqual([m.data.balls, m.data.runs, m.data.dismissals, m.data.strikeRate], [2, 4, 1, 200]);
    assert.deepEqual(m.sample, { n: 2, unit: "balls", warning: m.sample.warning });
    assert.ok(m.sample.warning);

    const death = await battingStats(pool!, "cs-aaaa0001", { ...scope, format: "t20", phase: "death" });
    assert.equal(death.data.innings, 0);
    assert.equal(death.data.hundreds, null);
  });

  it("finds players by register alias", async () => {
    const hits = await searchPlayers(pool!, "alpha onesimus");
    assert.equal(hits.data[0]?.id, "cs-aaaa0001");
  });
});
