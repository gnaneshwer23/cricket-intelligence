import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ingestFixtures } from "../ingestion/runner.ts";
import { DemoAdapter } from "../provider/demo-adapter.ts";
import { CricApiAdapter } from "../provider/cricapi-adapter.ts";
import { MemoryStorage } from "../storage/memory.ts";

describe("ingestion runner", () => {
  it("upserts demo fixtures idempotently", async () => {
    const storage = new MemoryStorage();
    const adapter = new DemoAdapter();
    const first = await ingestFixtures({ adapter, storage, deep: true, limit: 5 });
    assert.ok(first.status === "success" || first.status === "partial");
    assert.ok(first.upserted >= 1);
    const second = await ingestFixtures({ adapter, storage, deep: true, limit: 5 });
    assert.ok(second.upserted >= 1);
    const matches = await storage.listMatches();
    assert.equal(matches.length, 1);
    const card = await storage.getScorecard(matches[0]!.id);
    assert.ok(card);
  });

  it("records failure when mock provider errors", async () => {
    const storage = new MemoryStorage();
    const adapter = new CricApiAdapter({
      apiKey: "00000000-0000-0000-0000-000000000000",
      fetchImpl: async () => new Response(JSON.stringify({ status: "failure", reason: "Invalid API Key" }), { status: 401 }),
      maxRetries: 0,
    });
    const run = await ingestFixtures({ adapter, storage, limit: 5 });
    assert.equal(run.status, "failed");
    assert.ok(run.errors.length >= 1);
  });
});
