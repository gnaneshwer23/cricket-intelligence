import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { strToU8, zipSync } from "fflate";
import { ingestCricsheetZip } from "../ingestion/cricsheet-ingest.ts";
import { buildMatchWhere, createPool, escapeLike, PostgresStorage } from "../storage/postgres.ts";
import { SYNTHETIC_CRICSHEET_ID, syntheticCricsheetMatch } from "./fixtures/cricsheet-match.ts";

describe("postgres query builder", () => {
  it("escapes LIKE wildcards", () => {
    assert.equal(escapeLike("100%_a\\b"), "100\\%\\_a\\\\b");
  });

  it("parameterises every filter value", () => {
    const w = buildMatchWhere({
      teamContains: "India'; DROP TABLE matches;--",
      format: "test",
      yearFrom: 2000,
      coverageAtLeast: "innings",
      playerContains: "Kohli",
    });
    assert.equal(w.params.length, 5);
    assert.ok(!w.clauses.join(" ").includes("DROP"));
    assert.deepEqual(w.params[3], ["innings", "ball_by_ball"]);
  });
});

/**
 * Integration — needs a migrated database:
 *   CRICKETOS_TEST_DATABASE_URL=postgres://localhost/cricketos_test npm test
 * CI provides one via a Postgres service container.
 */
const url = process.env.CRICKETOS_TEST_DATABASE_URL?.trim();

describe("PostgresStorage (integration)", { skip: url ? false : "CRICKETOS_TEST_DATABASE_URL not set" }, () => {
  const pool = url ? createPool(url, { max: 2 }) : null;
  const storage = pool ? new PostgresStorage(pool) : null;
  const matchId = `cs-${SYNTHETIC_CRICSHEET_ID}`;

  after(async () => {
    await pool?.query("DELETE FROM matches WHERE id = $1", [matchId]);
    await pool?.query("DELETE FROM ingestion_runs WHERE operation = 'cricsheet:pg-test.zip'");
    await pool?.end();
  });

  it("round-trips a Cricsheet match idempotently", async () => {
    const zip = zipSync({ [`${SYNTHETIC_CRICSHEET_ID}.json`]: strToU8(JSON.stringify(syntheticCricsheetMatch)) });
    for (let i = 0; i < 2; i += 1) {
      const run = await ingestCricsheetZip({ zip, storage: storage!, sourceLabel: "pg-test.zip", force: true });
      assert.equal(run.status, "success", run.errors.join("\n"));
    }
    const match = await storage!.getMatch(matchId);
    assert.equal(match?.resultText, "Team A won by 14 runs (D/L)");

    const balls = await storage!.getBalls(matchId);
    assert.equal(balls.length, 19);
    assert.equal(balls.at(-1)!.inningsNumber, 3, "ordered by innings");

    const card = await storage!.getScorecard(matchId);
    assert.equal(card?.innings[0]?.score.runs, 19);

    const typed = await pool!.query(
      "SELECT SUM(runs_total)::int AS runs, COUNT(*) FILTER (WHERE is_wicket)::int AS wkts FROM balls WHERE match_id = $1 AND innings_number = 1",
      [matchId],
    );
    assert.deepEqual(typed.rows[0], { runs: 14, wkts: 2 });
  });

  it("pushes search filters down to SQL", async () => {
    const byPlayer = await storage!.searchMatches({ playerContains: "Y4", gender: "women", limit: 5 });
    assert.ok(byPlayer.matches.some((m) => m.id === matchId));

    const wrongYear = await storage!.searchMatches({ playerContains: "Y4", yearTo: 2000 });
    assert.ok(!wrongYear.matches.some((m) => m.id === matchId));

    const deep = await storage!.searchMatches({ teamContains: "Team A", coverageAtLeast: "ball_by_ball" });
    assert.ok(deep.matches.some((m) => m.id === matchId));

    assert.ok((await storage!.matchIdsForPlayer("cs-aaaa0001")).includes(matchId));
    assert.ok((await storage!.stats()).matchCount >= 1);
  });
});
