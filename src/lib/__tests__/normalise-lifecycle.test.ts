import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapLifecycle } from "../ingestion/normalise.ts";

describe("mapLifecycle", () => {
  it("treats finished matches as COMPLETED even though finished contains ns", () => {
    assert.equal(mapLifecycle("Match finished · England won by 2 runs"), "COMPLETED");
    assert.equal(mapLifecycle("Match finished · Australia won by 209 runs"), "COMPLETED");
  });

  it("treats Sportmonks NS as UPCOMING without matching inside finished", () => {
    assert.equal(mapLifecycle("NS"), "UPCOMING");
    assert.equal(mapLifecycle("ns"), "UPCOMING");
    assert.equal(mapLifecycle("Match not started"), "UPCOMING");
  });
});
