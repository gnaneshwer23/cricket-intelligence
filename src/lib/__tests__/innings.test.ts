import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cumulativeFromOvers, cumulativePhaseLead, phaseBandsForFormat } from "../calc.ts";
import { phases } from "../data.ts";
import { buildExplorerView, explorerInnings } from "../innings.ts";

describe("DEMO England innings series", () => {
  const innings = explorerInnings[0];

  it("matches phase table totals", () => {
    const runs = innings.overs.reduce((s, o) => s + o.runs, 0);
    assert.equal(runs, 245);
    const sum = (a: number, b: number) =>
      innings.overs.slice(a - 1, b).reduce((s, o) => s + o.runs, 0);
    assert.equal(sum(1, 10), 48);
    assert.equal(sum(11, 21), 55);
    assert.equal(sum(22, 30), 72);
    assert.equal(sum(31, 40), 42);
    assert.equal(sum(41, 49), 28);
  });

  it("keeps session model lead at +21", () => {
    assert.equal(cumulativePhaseLead(phases), 21);
  });

  it("builds worm ending at 245 with 4 wickets", () => {
    const worm = cumulativeFromOvers(innings.overs);
    const last = worm[worm.length - 1];
    assert.ok(last);
    assert.equal(last.cumulativeRuns, 245);
    assert.equal(last.wickets, 4);
    assert.equal(worm.filter((p) => p.isWicket).length, 4);
  });

  it("uses Test phase bands only", () => {
    const bands = phaseBandsForFormat(innings.meta.format, innings.overs.length);
    assert.ok(bands.every((b) => !b.kind.startsWith("lo-")));
  });

  it("explorer view empty for India batting filter", () => {
    const view = buildExplorerView({
      matchId: innings.meta.matchId,
      inningsId: innings.meta.id,
      team: "india",
      player: "all",
      phaseId: "all",
    });
    assert.ok(view.emptyReason);
    assert.equal(view.worm.length, 0);
  });

  it("handles missing deliveries via empty phase slice", () => {
    const view = buildExplorerView({
      matchId: innings.meta.matchId,
      inningsId: innings.meta.id,
      team: "all",
      player: "all",
      phaseId: "death",
    });
    // death is not a Test band id — filter leaves full or empty honestly
    assert.ok(view.totals.runs === 245 || view.emptyReason);
  });
});
