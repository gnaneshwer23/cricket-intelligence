import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ARCHIVE_POLICY,
  coverageLabel,
  deriveCoverage,
  inferGender,
  yearFromIso,
} from "../coverage.ts";

describe("coverage provenance", () => {
  it("infers women’s cricket from titles", () => {
    assert.equal(
      inferGender({ title: "Australia Women vs England Women, Final" }),
      "women",
    );
    assert.equal(inferGender({ title: "England vs Australia, 3rd Test" }), "men");
  });

  it("derives scorecard level without inventing innings rows", () => {
    const meta = deriveCoverage({
      status: "COMPLETED",
      note: "England won by 1 wicket",
      score: { runs: 362, wickets: 9, overs: "125.4" },
      startTimeIso: "2019-08-22T10:00:00.000Z",
      title: "England vs Australia",
      battingRowCount: 0,
      bowlingRowCount: 0,
      ballCount: 0,
    });
    assert.equal(meta.level, "scorecard");
    assert.equal(meta.hasScorecard, true);
    assert.equal(meta.hasInningsRows, false);
    assert.equal(meta.hasBallByBall, false);
    assert.equal(meta.year, 2019);
    assert.match(meta.note ?? "", /batting\/bowling rows not verified/i);
  });

  it("labels DEMO as ball-by-ball without claiming licensed live", () => {
    const meta = deriveCoverage({
      status: "DEMO",
      isDemo: true,
      score: { runs: 290, wickets: 3, overs: "48.2" },
      ballCount: 1,
    });
    assert.equal(meta.level, "ball_by_ball");
    assert.match(meta.note ?? "", /DEMO playground/i);
  });

  it("exposes honest archive policy — not full 1973–present", () => {
    assert.equal(ARCHIVE_POLICY.filterYearMin, 1973);
    assert.ok(ARCHIVE_POLICY.measuredSeedEarliest >= 1973);
    assert.match(ARCHIVE_POLICY.claim, /not a full 1973/i);
    assert.equal(coverageLabel("result"), "Result");
    assert.equal(yearFromIso("1975-06-21T10:00:00.000Z"), 1975);
  });
});
