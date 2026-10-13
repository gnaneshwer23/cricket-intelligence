import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { buildSeedBundle, normaliseSeedMatch, SEED_CRICAPI_ROWS } from "../provider/seed-historical.ts";
import {
  getDataService,
  resetDataServiceForTests,
} from "../service/data-service.ts";
import { MemoryStorage } from "../storage/memory.ts";
import { resetStorageForTests } from "../storage/index.ts";

describe("seed historical normalisation", () => {
  it("never emits LIVE freshness", () => {
    for (const row of SEED_CRICAPI_ROWS) {
      const m = normaliseSeedMatch(row);
      assert.notEqual(m.freshness, "LIVE");
      assert.notEqual(m.status, "LIVE");
    }
  });

  it("builds quality-passing seed bundle with HISTORICAL + UPCOMING", () => {
    const bundle = buildSeedBundle();
    assert.ok(bundle.matches.length >= 8);
    const historical = bundle.matches.filter((m) => m.freshness === "HISTORICAL");
    const upcoming = bundle.matches.filter((m) => m.freshness === "UPCOMING");
    assert.ok(historical.length >= 6, `expected ≥6 HISTORICAL, got ${historical.length}`);
    assert.ok(upcoming.length >= 2, `expected ≥2 UPCOMING, got ${upcoming.length}`);
    assert.ok(bundle.matches.every((m) => m.freshness !== "LIVE"));
    assert.ok(bundle.matches.some((m) => /Women|IPL|Knight|West Indies/i.test(m.title)));
  });
});

describe("getDataService bootstrap", () => {
  beforeEach(() => {
    resetStorageForTests(new MemoryStorage());
    resetDataServiceForTests();
  });

  it("seeds archive into storage and lists matches", async () => {
    const service = getDataService();
    const boot = await service.ensureReady();
    assert.ok(boot.seeded >= 4);
    assert.equal(boot.demoMode, true);
    const matches = await service.listMatches({ limit: 50 });
    assert.ok(matches.some((m) => m.freshness === "DEMO"));
    assert.ok(matches.some((m) => m.freshness === "HISTORICAL"));
    assert.ok(matches.every((m) => m.freshness !== "LIVE"));
  });

  it("truth mode: product fixtures stay empty without a provider key", async () => {
    const service = getDataService();
    const fixtures = await service.listFixtures();
    assert.equal(fixtures.length, 0);
    // Seeds remain available via listMatches for API tests — not as product truth
    const matches = await service.listMatches({ limit: 50 });
    assert.ok(matches.some((m) => m.freshness === "HISTORICAL"));
    assert.ok(matches.every((m) => m.freshness !== "LIVE"));
  });

  it("primaryFreshness stays UNAVAILABLE in demoMode (never LIVE)", () => {
    const service = getDataService();
    assert.equal(
      service.primaryFreshness({ DEMO: 1, HISTORICAL: 4, LIVE: 1 }, true),
      "UNAVAILABLE",
    );
  });
});
