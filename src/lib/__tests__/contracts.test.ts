import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveFreshness, freshnessLabel } from "../contracts.ts";

describe("freshness", () => {
  it("forces DEMO when demoMode", () => {
    assert.equal(
      deriveFreshness({ lifecycle: "LIVE", demoMode: true, updatedAtIso: new Date().toISOString() }),
      "DEMO",
    );
  });

  it("marks STALE when LIVE update is old", () => {
    assert.equal(
      deriveFreshness({
        lifecycle: "LIVE",
        demoMode: false,
        updatedAtIso: new Date(Date.now() - 600_000).toISOString(),
        staleAfterMs: 120_000,
        providerAvailable: true,
      }),
      "STALE",
    );
  });

  it("labels all statuses", () => {
    for (const s of ["LIVE", "STALE", "UNAVAILABLE", "DEMO", "HISTORICAL", "UPCOMING"] as const) {
      assert.ok(freshnessLabel(s).length > 0);
    }
  });
});
