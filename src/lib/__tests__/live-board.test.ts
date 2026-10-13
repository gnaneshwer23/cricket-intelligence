import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeCrr,
  defaultBoardTab,
  formatCrr,
  matchesBoardTab,
  tabCounts,
  type BoardRowInput,
} from "../live-board.ts";
import { teamAbbr } from "../team-abbr.ts";

function row(partial: Partial<BoardRowInput> & Pick<BoardRowInput, "id" | "status" | "freshness">): BoardRowInput {
  return {
    title: partial.title ?? "Test",
    venue: partial.venue ?? "Venue",
    format: partial.format ?? "t20",
    isDemo: partial.isDemo ?? false,
    ...partial,
  };
}

describe("teamAbbr", () => {
  it("maps known internationals and franchises", () => {
    assert.equal(teamAbbr("England"), "ENG");
    assert.equal(teamAbbr("West Indies"), "WI");
    assert.equal(teamAbbr("India Women"), "IND-W");
    assert.equal(teamAbbr("Mumbai Indians"), "MI");
    assert.equal(teamAbbr("Kolkata Knight Riders"), "KKR");
  });
});

describe("live-board filters", () => {
  const demo = row({
    id: "demo-1",
    status: "DEMO",
    freshness: "DEMO",
    isDemo: true,
  });
  const live = row({
    id: "live-1",
    status: "LIVE",
    freshness: "LIVE",
    score: { runs: 120, wickets: 2, overs: "15.0" },
  });
  const upcoming = row({
    id: "up-1",
    status: "UPCOMING",
    freshness: "UPCOMING",
  });
  const done = row({
    id: "done-1",
    status: "COMPLETED",
    freshness: "HISTORICAL",
  });

  it("never puts DEMO on Live tab", () => {
    assert.equal(matchesBoardTab(demo, "live"), false);
    assert.equal(matchesBoardTab(live, "live"), true);
  });

  it("requires both LIVE status and freshness for Live tab", () => {
    const staleish = row({ id: "x", status: "LIVE", freshness: "STALE" });
    assert.equal(matchesBoardTab(staleish, "live"), false);
  });

  it("splits upcoming / recent / all", () => {
    const rows = [demo, live, upcoming, done];
    assert.equal(tabCounts(rows).live, 1);
    assert.equal(tabCounts(rows).upcoming, 1);
    assert.ok(tabCounts(rows).recent >= 2);
    assert.equal(tabCounts(rows).all, 4);
    assert.equal(defaultBoardTab(rows), "live");
    assert.equal(defaultBoardTab([upcoming, done]), "upcoming");
  });

  it("computes CRR from overs without inventing RRR", () => {
    assert.equal(formatCrr(computeCrr({ runs: 120, wickets: 2, overs: "15.0" })), "8.00");
    assert.equal(computeCrr(undefined), null);
  });
});
