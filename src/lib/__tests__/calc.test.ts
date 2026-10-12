import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregatePhase,
  analyseChase,
  analysePhases,
  applyWinSwing,
  ballsToOvers,
  ballsToOversNumber,
  cumulativeFromOvers,
  cumulativePhaseLead,
  formatMetric,
  oversToBalls,
  phaseBandsForFormat,
  phaseDelta,
  projectScenarios,
  runsPerOver,
  runsToMilestone,
  sampleSizeWarning,
  speedUpliftPct,
  strikeRate,
  type OverBucket,
} from "../calc.ts";

describe("phaseDelta", () => {
  it("subtracts expected from scored", () => {
    assert.equal(phaseDelta(72, 48), 24);
    assert.equal(phaseDelta(42, 46), -4);
  });
});

describe("analysePhases + cumulativePhaseLead", () => {
  const phases = [
    { label: "1–10", scored: 48, expected: 44 },
    { label: "11–21", scored: 55, expected: 58 },
    { label: "22–30", scored: 72, expected: 48 },
    { label: "31–40", scored: 42, expected: 46 },
    { label: "41–48.2", scored: 28, expected: 28 },
  ];

  it("flags ahead phases", () => {
    const rows = analysePhases(phases);
    assert.equal(rows[2].delta, 24);
    assert.equal(rows[2].ahead, true);
    assert.equal(rows[1].ahead, false);
  });

  it("sums to demo +21 lead", () => {
    assert.equal(cumulativePhaseLead(phases), 21);
  });
});

describe("strikeRate", () => {
  it("computes Root 89/120", () => {
    assert.equal(strikeRate(89, 120), 74.2);
  });

  it("returns 0 for zero balls", () => {
    assert.equal(strikeRate(10, 0), 0);
  });
});

describe("runsToMilestone", () => {
  it("computes Root to 14000", () => {
    assert.equal(runsToMilestone(13927, 14000), 73);
  });

  it("never goes negative", () => {
    assert.equal(runsToMilestone(14000, 14000), 0);
    assert.equal(runsToMilestone(14050, 14000), 0);
  });
});

describe("applyWinSwing", () => {
  it("clamps and complements to 100", () => {
    const mid = applyWinSwing(58, -8);
    assert.equal(mid.eng, 50);
    assert.equal(mid.ind, 50);

    const floor = applyWinSwing(58, -100);
    assert.equal(floor.eng, 5);
    assert.equal(floor.ind, 95);

    const ceil = applyWinSwing(58, 100);
    assert.equal(ceil.eng, 92);
    assert.equal(ceil.ind, 8);
  });
});

describe("speedUpliftPct", () => {
  it("matches Bumrah demo uplift", () => {
    assert.equal(speedUpliftPct(146.2, 134.1), 9);
  });
});

describe("sampleSizeWarning", () => {
  it("warns under threshold", () => {
    assert.match(sampleSizeWarning(7) ?? "", /n=7/);
    assert.equal(sampleSizeWarning(12), null);
  });
});

describe("overs ↔ balls", () => {
  it("treats 17.4 as 17 overs + 4 balls", () => {
    assert.equal(oversToBalls(17.4), 106);
    assert.equal(oversToBalls("17.4"), 106);
    assert.equal(ballsToOvers(106), "17.4");
    assert.equal(ballsToOversNumber(106), 17.4);
  });

  it("handles zero and invalid", () => {
    assert.equal(oversToBalls(0), 0);
    assert.equal(oversToBalls(-3), 0);
    assert.equal(ballsToOvers(0), "0.0");
    assert.equal(ballsToOvers(-1), "0.0");
  });

  it("round-trips common cricket overs", () => {
    for (const o of ["0.1", "4.3", "48.2", "14.1", "47.5"] as const) {
      assert.equal(ballsToOvers(oversToBalls(o)), o.includes(".") ? o : `${o}.0`);
    }
  });
});

describe("runsPerOver", () => {
  it("computes RPO from balls", () => {
    assert.equal(runsPerOver(48, 60), 4.8);
    assert.equal(runsPerOver(10, 0), 0);
  });
});

describe("cumulative scoring + manhattan", () => {
  const overs: OverBucket[] = [
    {
      overNumber: 1,
      balls: 6,
      runs: 6,
      wickets: 0,
      fours: 1,
      sixes: 0,
      startRuns: 0,
      endRuns: 6,
      events: [{ ball: 3, kind: "four", label: "boundary" }],
    },
    {
      overNumber: 2,
      balls: 6,
      runs: 2,
      wickets: 1,
      fours: 0,
      sixes: 0,
      startRuns: 6,
      endRuns: 8,
      events: [{ ball: 4, kind: "wicket", label: "out" }],
    },
    {
      overNumber: 3,
      balls: 0,
      runs: 0,
      wickets: 0,
      fours: 0,
      sixes: 0,
      startRuns: 8,
      endRuns: 8,
      events: [],
    },
  ];

  it("builds cumulative worm with wickets and boundaries", () => {
    const points = cumulativeFromOvers(overs);
    assert.equal(points.length, 12);
    assert.equal(points[points.length - 1]?.cumulativeRuns, 8);
    assert.equal(points.filter((p) => p.isWicket).length, 1);
    assert.ok(points.some((p) => p.isBoundary));
  });

  it("skips empty overs with zero balls", () => {
    const points = cumulativeFromOvers(overs);
    assert.equal(points.filter((p) => p.overs.startsWith("2.")).length, 0);
  });
});

describe("phase aggregation by format", () => {
  it("uses Test bands — not LO powerplay labels", () => {
    const bands = phaseBandsForFormat("test", 48);
    assert.ok(bands.every((b) => b.kind.startsWith("test")));
    assert.ok(!bands.some((b) => b.label.toLowerCase().includes("powerplay")));
  });

  it("uses LO bands for T20", () => {
    const bands = phaseBandsForFormat("t20", 20);
    assert.ok(bands.some((b) => b.kind === "lo-powerplay"));
    assert.ok(bands.some((b) => b.kind === "lo-death"));
  });

  it("aggregates runs/rpo/wickets", () => {
    const overs: OverBucket[] = Array.from({ length: 6 }, (_, i) => ({
      overNumber: i + 1,
      balls: 6,
      runs: 6,
      wickets: i === 2 ? 1 : 0,
      fours: 1,
      sixes: 0,
      startRuns: i * 6,
      endRuns: (i + 1) * 6,
      events: [],
    }));
    const band = phaseBandsForFormat("t20", 20)[0];
    const agg = aggregatePhase(overs, band);
    assert.equal(agg.runs, 36);
    assert.equal(agg.wickets, 1);
    assert.equal(agg.rpo, 6);
  });
});

describe("analyseChase / RRR", () => {
  it("computes required rate", () => {
    const a = analyseChase({ runsRequired: 12, ballsRemaining: 6, wicketsInHand: 5 });
    assert.equal(a.status, "ok");
    assert.equal(a.requiredRunRate, 12);
    assert.equal(a.oversRemaining, "1.0");
  });

  it("handles zero balls", () => {
    const a = analyseChase({ runsRequired: 10, ballsRemaining: 0, wicketsInHand: 3 });
    assert.equal(a.status, "zero-balls");
    assert.equal(a.requiredRunRate, null);
    assert.equal(formatMetric(a.requiredRunRate), "—");
  });

  it("handles completed chase", () => {
    const a = analyseChase({ runsRequired: 0, ballsRemaining: 24, wicketsInHand: 4 });
    assert.equal(a.status, "completed");
    assert.equal(a.requiredRunRate, 0);
  });

  it("handles negative required", () => {
    const a = analyseChase({ runsRequired: -5, ballsRemaining: 12, wicketsInHand: 4 });
    assert.equal(a.status, "negative-required");
    assert.equal(a.requiredRunRate, 0);
  });

  it("rejects invalid inputs without NaN", () => {
    const a = analyseChase({ runsRequired: Number.NaN, ballsRemaining: 10, wicketsInHand: 2 });
    assert.equal(a.valid, false);
    assert.equal(a.status, "invalid");
    assert.equal(formatMetric(Number.POSITIVE_INFINITY), "—");
  });

  it("projects three scenarios without win probs", () => {
    const rows = projectScenarios({
      runsRequired: 100,
      ballsRemaining: 120,
      wicketsInHand: 7,
      currentRuns: 200,
    });
    assert.equal(rows.length, 3);
    assert.ok(rows.every((r) => r.endTotal !== null && Number.isFinite(r.endTotal)));
    assert.ok(rows.every((r) => r.preset.label !== "Win probability"));
  });
});
