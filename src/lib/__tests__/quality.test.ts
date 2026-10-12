import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkBalls,
  checkMatch,
  checkScorecard,
  runQualityChecks,
} from "../ingestion/quality.ts";
import {
  brokenScorecard,
  SYNTHETIC_LABEL,
  syntheticBalls,
  syntheticMatch,
  syntheticScorecard,
} from "./fixtures/synthetic-match.ts";

describe("data quality · synthetic fixtures", () => {
  it("labels synthetic provenance", () => {
    assert.equal(syntheticMatch().provenance.source, SYNTHETIC_LABEL);
  });

  it("accepts reconciled scorecard (bat + extras = total)", () => {
    const issues = checkScorecard(syntheticScorecard());
    assert.equal(
      issues.filter((i) => i.code === "scorecard.runs-reconcile").length,
      0,
    );
  });

  it("flags runs reconciliation errors", () => {
    const issues = checkScorecard(brokenScorecard());
    assert.ok(issues.some((i) => i.code === "scorecard.runs-reconcile"));
  });

  it("reconciles ball totals with extras parts", () => {
    const balls = syntheticBalls();
    const issues = checkBalls(balls, 120, 3);
    assert.equal(issues.filter((i) => i.severity === "error").length, 0);
  });

  it("rejects DEMO freshness on LIVE lifecycle", () => {
    const m = syntheticMatch();
    m.status = "LIVE";
    m.freshness = "DEMO";
    const issues = checkMatch(m);
    assert.ok(issues.some((i) => i.code === "match.live-demo"));
  });

  it("runQualityChecks ok on consistent synthetic bundle", () => {
    const report = runQualityChecks({
      match: syntheticMatch(),
      scorecard: syntheticScorecard(),
      balls: syntheticBalls(),
      expectedBallRuns: 120,
      expectedBallWickets: 3,
    });
    assert.equal(report.ok, true);
  });

  it("flags ball part mismatch", () => {
    const balls = syntheticBalls();
    balls[0]!.totalRuns = 99;
    const issues = checkBalls(balls);
    assert.ok(issues.some((i) => i.code === "ball.parts"));
  });
});
