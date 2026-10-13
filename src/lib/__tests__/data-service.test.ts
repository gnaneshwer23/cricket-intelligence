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
    assert.ok(bundle.matches.length >= 4);
    assert.ok(bundle.matches.some((m) => m.freshness === "HISTORICAL"));
    assert.ok(bundle.matches.some((m) => m.freshness === "UPCOMING"));
    assert.ok(bundle.matches.every((m) => m.freshness !== "LIVE"));
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

  it("exposes upcoming fixture without LIVE badge", async () => {
    const service = getDataService();
    const fixtures = await service.listFixtures();
    const upcoming = fixtures.find((f) => f.freshness === "UPCOMING");
    assert.ok(upcoming);
    assert.notEqual(upcoming.freshness, "LIVE");
  });

  it("primaryFreshness stays DEMO in demoMode", () => {
    const service = getDataService();
    assert.equal(
      service.primaryFreshness({ DEMO: 1, HISTORICAL: 4, LIVE: 1 }, true),
      "DEMO",
    );
  });
});
