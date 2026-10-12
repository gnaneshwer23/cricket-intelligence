import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  compareMatches,
  playerBattingTrend,
  searchHistoricalMatches,
} from "../service/historical.ts";
import { MemoryStorage } from "../storage/memory.ts";
import { resetStorageForTests } from "../storage/index.ts";
import { syntheticMatch, syntheticScorecard } from "./fixtures/synthetic-match.ts";

describe("historical intelligence", () => {
  beforeEach(() => {
    resetStorageForTests(new MemoryStorage());
  });

  it("includes demo board when storage empty", async () => {
    const list = await searchHistoricalMatches({ limit: 10 });
    assert.ok(list.some((m) => m.freshness === "DEMO"));
  });

  it("filters by venue", async () => {
    const storage = new MemoryStorage();
    await storage.upsertMatch(syntheticMatch());
    resetStorageForTests(storage);
    const list = await searchHistoricalMatches({ venueContains: "Test Oval" });
    assert.ok(list.some((m) => m.id === "test-synth-t20-001"));
    const miss = await searchHistoricalMatches({ venueContains: "NoSuchVenueZZZ" });
    assert.equal(miss.length, 0);
  });

  it("compares matches with honest empty notes", async () => {
    const storage = new MemoryStorage();
    const synth = syntheticMatch();
    await storage.upsertMatch(synth);
    resetStorageForTests(storage);
    const cmp = await compareMatches("demo-eng-ind-lords-d2", synth.id);
    assert.ok(cmp);
    assert.ok(cmp.notes.some((n) => /DEMO/i.test(n)));
    assert.ok(cmp.comparable.scoreLeft);
    assert.ok(cmp.comparable.scoreRight);
  });

  it("player trend reports sample size", async () => {
    const storage = new MemoryStorage();
    await storage.upsertMatch(syntheticMatch());
    await storage.upsertScorecard(syntheticScorecard());
    resetStorageForTests(storage);
    const trend = await playerBattingTrend("p-opener");
    assert.ok(trend);
    assert.equal(trend.sampleSize, 1);
    assert.ok(trend.warning); // sample size < 10
    assert.equal(trend.points[0]?.runs, 40);
  });
});
