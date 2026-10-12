import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analysePhases,
  applyWinSwing,
  cumulativePhaseLead,
  phaseDelta,
  runsToMilestone,
  sampleSizeWarning,
  speedUpliftPct,
  strikeRate,
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
