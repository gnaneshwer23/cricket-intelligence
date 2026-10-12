/**
 * Data-quality invariants for normalised cricket entities.
 * Synthetic fixtures in tests are labelled as test data.
 */

import { oversToBalls } from "@/lib/calc";
import type {
  DomainBall,
  DomainMatch,
  DomainScorecard,
  QualityIssue,
  QualityReport,
} from "@/lib/domain/models";

function issue(code: string, message: string, severity: "error" | "warn" = "error", path?: string): QualityIssue {
  return { code, severity, message, path };
}

export function checkMatch(match: DomainMatch): QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (!match.id) issues.push(issue("match.id", "match id required"));
  if (!match.title) issues.push(issue("match.title", "title required"));
  if (match.status === "DEMO" && match.freshness !== "DEMO") {
    issues.push(issue("match.freshness", "DEMO lifecycle must use DEMO freshness", "error", "freshness"));
  }
  if (match.status === "LIVE" && match.freshness === "DEMO") {
    issues.push(issue("match.live-demo", "LIVE status cannot carry DEMO freshness", "error"));
  }
  if (match.score) {
    if (match.score.runs < 0 || match.score.wickets < 0) {
      issues.push(issue("match.score.negative", "runs/wickets cannot be negative"));
    }
    if (match.score.wickets > 10) {
      issues.push(issue("match.score.wickets", "wickets cannot exceed 10", "warn"));
    }
    const balls = oversToBalls(match.score.overs);
    if (balls < 0) issues.push(issue("match.score.overs", "invalid overs"));
  }
  if (!match.provenance?.source) {
    issues.push(issue("match.provenance", "provenance.source required"));
  }
  return issues;
}

/**
 * Reconcile innings total with batting card + extras.
 * Wickets should align with dismissals (not-outs excluded).
 */
export function checkScorecard(card: DomainScorecard): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const inn of card.innings) {
    const bat = card.batting[inn.id] ?? [];
    const extrasTotal = inn.extras?.total ?? 0;
    if (bat.length) {
      const batRuns = bat.reduce((s, r) => s + r.runs, 0);
      const expected = batRuns + extrasTotal;
      if (expected !== inn.score.runs) {
        issues.push(
          issue(
            "scorecard.runs-reconcile",
            `innings ${inn.inningsNumber}: batting ${batRuns} + extras ${extrasTotal} ≠ total ${inn.score.runs}`,
            "error",
            inn.id,
          ),
        );
      }
      const dismissals = bat.filter((r) => !r.notOut && r.dismissal).length;
      // Allow all-out 10 wickets with 10 dismissals; warn on mismatch
      if (inn.score.wickets !== dismissals && !(inn.score.wickets === 10 && dismissals === 10)) {
        if (Math.abs(inn.score.wickets - dismissals) > 0) {
          issues.push(
            issue(
              "scorecard.wickets-reconcile",
              `innings ${inn.inningsNumber}: wickets ${inn.score.wickets} vs dismissals ${dismissals}`,
              "warn",
              inn.id,
            ),
          );
        }
      }
    }
    if (inn.score.wickets < 0 || inn.score.runs < 0) {
      issues.push(issue("scorecard.negative", "negative score", "error", inn.id));
    }
  }
  return issues;
}

/**
 * Ball-by-ball cumulative runs should match innings total when a complete series is present.
 * Extras on balls must be non-negative; wicket flags consistent.
 */
export function checkBalls(balls: DomainBall[], expectedRuns?: number, expectedWickets?: number): QualityIssue[] {
  const issues: QualityIssue[] = [];
  let runs = 0;
  let wickets = 0;
  let prevOver = -1;
  let prevBall = -1;

  for (const ball of balls) {
    if (ball.totalRuns < 0 || ball.extras < 0 || ball.runsOffBat < 0) {
      issues.push(issue("ball.negative", `negative runs on ${ball.id}`, "error", ball.id));
    }
    if (ball.runsOffBat + ball.extras !== ball.totalRuns) {
      issues.push(
        issue(
          "ball.parts",
          `runsOffBat+extras ≠ totalRuns on ${ball.id}`,
          "error",
          ball.id,
        ),
      );
    }
    // Legal ball sequence soft-check
    if (
      ball.overNumber < prevOver ||
      (ball.overNumber === prevOver && ball.ballInOver < prevBall)
    ) {
      issues.push(issue("ball.order", `out-of-order ball ${ball.id}`, "warn", ball.id));
    }
    prevOver = ball.overNumber;
    prevBall = ball.ballInOver;
    runs += ball.totalRuns;
    if (ball.isWicket) wickets += 1;
  }

  if (expectedRuns != null && balls.length > 0 && runs !== expectedRuns) {
    issues.push(
      issue(
        "ball.runs-total",
        `ball sum ${runs} ≠ expected innings runs ${expectedRuns}`,
        "error",
      ),
    );
  }
  if (expectedWickets != null && balls.length > 0 && wickets !== expectedWickets) {
    issues.push(
      issue(
        "ball.wickets-total",
        `ball wickets ${wickets} ≠ expected ${expectedWickets}`,
        "warn",
      ),
    );
  }
  return issues;
}

export function runQualityChecks(input: {
  match?: DomainMatch;
  scorecard?: DomainScorecard;
  balls?: DomainBall[];
  expectedBallRuns?: number;
  expectedBallWickets?: number;
}): QualityReport {
  const issues: QualityIssue[] = [];
  if (input.match) issues.push(...checkMatch(input.match));
  if (input.scorecard) issues.push(...checkScorecard(input.scorecard));
  if (input.balls) {
    issues.push(
      ...checkBalls(input.balls, input.expectedBallRuns, input.expectedBallWickets),
    );
  }
  return {
    ok: !issues.some((i) => i.severity === "error"),
    issues,
    checkedAt: new Date().toISOString(),
  };
}
