import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { buildSeedBundle } from "../provider/seed-historical.ts";
import {
  searchHistoricalMatches,
  searchHistoricalMatchesPaged,
} from "../service/historical.ts";
import { MemoryStorage } from "../storage/memory.ts";
import { resetStorageForTests } from "../storage/index.ts";

describe("historical filters + coverage", () => {
  beforeEach(async () => {
    const storage = new MemoryStorage();
    const bundle = buildSeedBundle();
    for (const m of bundle.matches) await storage.upsertMatch(m);
    for (const c of bundle.scorecards) await storage.upsertScorecard(c);
    resetStorageForTests(storage);
  });

  it("filters by year range including 1975 sample", async () => {
    const early = await searchHistoricalMatches({ yearFrom: 1973, yearTo: 1985, limit: 50 });
    assert.ok(early.some((m) => m.id.includes("1975") || m.startTimeIso?.startsWith("1975")));
    assert.ok(early.every((m) => {
      const y = Number.parseInt((m.startTimeIso ?? "").slice(0, 4), 10);
      return y >= 1973 && y <= 1985;
    }));
  });

  it("filters women’s matches when gender supported", async () => {
    const women = await searchHistoricalMatches({ gender: "women", limit: 50 });
    assert.ok(women.length >= 1);
    assert.ok(women.every((m) => m.coverage?.gender === "women"));
  });

  it("filters by format + competition + venue", async () => {
    const ashes = await searchHistoricalMatches({
      competitionContains: "Ashes",
      format: "test",
      venueContains: "Headingley",
      limit: 20,
    });
    assert.ok(ashes.length >= 1);
    assert.ok(ashes.every((m) => m.format === "test"));
    assert.ok(ashes.every((m) => /ashes/i.test(m.series ?? "")));
  });

  it("distinguishes coverage levels and never invents innings for seeds", async () => {
    const page = await searchHistoricalMatchesPaged({
      freshness: ["HISTORICAL"],
      limit: 50,
    });
    assert.ok(page.total >= 5);
    assert.match(page.archiveClaim, /not a full 1973/i);
    const withScore = page.matches.filter((m) => m.score);
    assert.ok(withScore.length >= 1);
    for (const m of withScore) {
      assert.ok(m.coverage);
      assert.notEqual(m.coverage?.level, "innings");
      assert.equal(m.coverage?.hasInningsRows, false);
      assert.equal(m.coverage?.hasBallByBall, false);
    }
  });

  it("paginates results", async () => {
    const first = await searchHistoricalMatchesPaged({ page: 0, limit: 3 });
    const second = await searchHistoricalMatchesPaged({ page: 1, limit: 3 });
    assert.equal(first.matches.length, 3);
    assert.equal(first.hasMore, true);
    assert.ok(second.matches[0]?.id !== first.matches[0]?.id);
  });

  it("player filter returns empty for seed-only names without batting rows (honest)", async () => {
    // Seeds have empty batting arrays; DEMO may mention Stokes — exclude via freshness.
    const hits = await searchHistoricalMatches({
      playerContains: "Stokes",
      freshness: ["HISTORICAL"],
      limit: 20,
    });
    assert.equal(hits.length, 0);
    const nonsense = await searchHistoricalMatches({
      playerContains: "ZzNoSuchBatter999",
      limit: 20,
    });
    assert.equal(nonsense.length, 0);
  });
});
