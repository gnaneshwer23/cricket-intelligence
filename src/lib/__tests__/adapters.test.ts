import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CricApiAdapter } from "../provider/cricapi-adapter.ts";
import { DemoAdapter } from "../provider/demo-adapter.ts";
import { SportmonksAdapter } from "../provider/sportmonks-adapter.ts";

describe("DemoAdapter", () => {
  const adapter = new DemoAdapter();

  it("health is ok and not LIVE", async () => {
    const h = await adapter.health();
    assert.equal(h.ok, true);
    assert.match(h.message, /DEMO/i);
  });

  it("returns DEMO freshness for match", async () => {
    const list = await adapter.listFixtures();
    assert.equal(list.ok, true);
    assert.equal(list.data?.[0]?.freshness, "DEMO");
    assert.equal(list.data?.[0]?.status, "DEMO");
  });

  it("scorecard batting reconciles with innings total", async () => {
    const m = await adapter.getMatch("demo-eng-ind-lords-d2");
    assert.equal(m.ok, true);
    const card = await adapter.getScorecard("demo-eng-ind-lords-d2");
    assert.equal(card.ok, true);
    const inn = card.data!.innings[0]!;
    const bat = card.data!.batting[inn.id] ?? [];
    const sum = bat.reduce((s, r) => s + r.runs, 0) + (inn.extras?.total ?? 0);
    assert.equal(sum, inn.score.runs);
  });
});

describe("CricApiAdapter with mocked fetch", () => {
  it("lists fixtures from mock payload", async () => {
    const body = {
      status: "success",
      data: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          name: "India vs Australia, 1st T20I",
          matchType: "t20",
          status: "Finished",
          venue: "Mock Stadium",
          dateTimeGMT: "2024-01-01T10:00:00Z",
          teams: ["India", "Australia"],
          score: [{ r: 180, w: 5, o: 20, inning: "India Inning 1" }],
        },
      ],
      info: { hitsToday: 1, hitsLimit: 100 },
    };
    const adapter = new CricApiAdapter({
      apiKey: "00000000-0000-0000-0000-000000000000",
      fetchImpl: async () =>
        new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
    });
    const list = await adapter.listFixtures({ limit: 5 });
    assert.equal(list.ok, true);
    assert.equal(list.data?.length, 1);
    assert.equal(list.data?.[0]?.freshness, "HISTORICAL");
    assert.ok(list.data?.[0]?.id.startsWith("cricapi-"));
  });

  it("health fails without key", async () => {
    const adapter = new CricApiAdapter({ apiKey: null });
    const h = await adapter.health();
    assert.equal(h.ok, false);
  });
});

describe("SportmonksAdapter with mocked fetch", () => {
  it("normalises fixture include payload", async () => {
    const body = {
      data: {
        id: 20094,
        status: "Finished",
        type: "T20I",
        live: 0,
        starting_at: "2020-01-01T16:00:00.000000Z",
        note: "Mock finished",
        localteam: { id: 1, name: "South Africa" },
        visitorteam: { id: 2, name: "England" },
        scoreboards: [{ total: 150, wickets: 6, overs: 20 }],
      },
    };
    const adapter = new SportmonksAdapter({
      apiKey: "test-token",
      fetchImpl: async () =>
        new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
    });
    const match = await adapter.getMatch("20094");
    assert.equal(match.ok, true);
    assert.equal(match.data?.status, "COMPLETED");
    assert.equal(match.data?.freshness, "HISTORICAL");
    assert.equal(match.data?.score?.runs, 150);
  });
});
