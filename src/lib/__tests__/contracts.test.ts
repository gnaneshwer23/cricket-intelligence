import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveFreshness, freshnessLabel } from "../contracts.ts";

describe("freshness", () => {
  it("maps unverified LIVE to UNAVAILABLE in truth mode (never LIVE, not DEMO)", () => {
    assert.equal(
      deriveFreshness({ lifecycle: "LIVE", demoMode: true, updatedAtIso: new Date().toISOString() }),
      "UNAVAILABLE",
    );
  });

  it("preserves HISTORICAL and UPCOMING under truth mode", () => {
    assert.equal(
      deriveFreshness({ lifecycle: "COMPLETED", demoMode: true }),
      "HISTORICAL",
    );
    assert.equal(
      deriveFreshness({ lifecycle: "UPCOMING", demoMode: true }),
      "UPCOMING",
    );
    assert.equal(
      deriveFreshness({ lifecycle: "DEMO", demoMode: true }),
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
