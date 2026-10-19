import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cricApiLifecycle, normaliseCricApiMatch } from "../ingestion/normalise.ts";
import { cachedFetch, MemoryCacheStore, PostgresCacheStore } from "../provider/cache.ts";
import { createPool } from "../storage/postgres.ts";
import { after } from "node:test";
import { CricApiAdapter, playerInfoFromRow } from "../provider/cricapi-adapter.ts";

const MIN = 60_000;

function clock(start = Date.parse("2026-10-19T10:00:00Z")) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

const quota = () => ({
  key: "q",
  reserve: 10,
  fromBody: (b: unknown) => (b as { info?: { hitsToday: number; hitsLimit: number } }).info ?? null,
});

describe("provider cache", () => {
  it("serves fresh copies without calling the provider", async () => {
    const store = new MemoryCacheStore();
    const c = clock();
    let calls = 0;
    const fetcher = async () => ({ body: { n: ++calls }, ok: true, status: 200 });
    const a = await cachedFetch({ store, key: "k", ttlMs: 30 * MIN, fetcher, now: c.now });
    c.advance(10 * MIN);
    const b = await cachedFetch({ store, key: "k", ttlMs: 30 * MIN, fetcher, now: c.now });
    assert.equal(calls, 1);
    assert.equal(a.source, "network");
    assert.equal(b.source, "fresh");
    assert.equal(b.ageMs, 10 * MIN);
    c.advance(25 * MIN);
    const d = await cachedFetch({ store, key: "k", ttlMs: 30 * MIN, fetcher, now: c.now });
    assert.equal(calls, 2);
    assert.equal(d.source, "network");
  });

  it("collapses concurrent requests into one call", async () => {
    const store = new MemoryCacheStore();
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 5));
      return { body: { ok: 1 }, ok: true, status: 200 };
    };
    await Promise.all(Array.from({ length: 5 }, () => cachedFetch({ store, key: "c", ttlMs: MIN, fetcher })));
    assert.equal(calls, 1);
  });

  it("stops calling near the daily quota and serves stale data", async () => {
    const store = new MemoryCacheStore();
    const c = clock();
    let calls = 0;
    const fetcher = async () => ({ body: { info: { hitsToday: 91, hitsLimit: 100 }, n: ++calls }, ok: true, status: 200 });
    await cachedFetch({ store, key: "k", ttlMs: MIN, fetcher, now: c.now, quota: quota() });
    c.advance(5 * MIN);
    const r = await cachedFetch({ store, key: "k", ttlMs: MIN, fetcher, now: c.now, quota: quota() });
    assert.equal(calls, 1);
    assert.equal(r.source, "stale");
    assert.match(r.note ?? "", /quota guard: 91\/100/);
    // A new UTC day lifts the guard.
    c.advance(24 * 60 * MIN);
    await cachedFetch({ store, key: "k", ttlMs: MIN, fetcher, now: c.now, quota: quota() });
    assert.equal(calls, 2);
  });

  it("keeps the last good copy when a refresh fails, and backs off when there is none", async () => {
    const store = new MemoryCacheStore();
    const c = clock();
    let fail = false;
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return fail ? { body: null, ok: false, status: 500, error: "HTTP 500" } : { body: { good: true }, ok: true, status: 200 };
    };
    await cachedFetch({ store, key: "k", ttlMs: MIN, fetcher, now: c.now });
    fail = true;
    c.advance(2 * MIN);
    const r = await cachedFetch({ store, key: "k", ttlMs: MIN, fetcher, now: c.now });
    assert.equal(r.source, "stale");
    assert.deepEqual(r.body, { good: true });
    assert.match(r.note ?? "", /refresh failed/);

    const bad = new MemoryCacheStore();
    await cachedFetch({ store: bad, key: "x", ttlMs: MIN, fetcher, now: c.now });
    const before = calls;
    const again = await cachedFetch({ store: bad, key: "x", ttlMs: MIN, fetcher, now: c.now });
    assert.equal(calls, before, "no retry inside the back-off window");
    assert.equal(again.source, "none");
  });
});

/** SYNTHETIC TEST DATA — CricAPI-shaped rows. */
const liveRow = {
  id: "d1a5aeba-24cc-4546-b214-df6de78f1247",
  name: "Oman vs Nepal, 139th Match",
  matchType: "odi",
  status: "Oman need 150 runs",
  venue: "Al Amerat",
  dateTimeGMT: "2026-10-19T06:00:00",
  teams: ["Oman", "Nepal"],
  score: [{ r: 280, w: 10, o: 50, inning: "Nepal Inning 1" }, { r: 131, w: 1, o: 29, inning: "Oman Inning 1" }],
  matchStarted: true,
  matchEnded: false,
};
const doneRow = { ...liveRow, id: "7896b60c-6f71-40ad-ad18-1521bb2f3475", status: "Kuwait won by 9 wkts", matchEnded: true };

describe("CricAPI adapter quota discipline", () => {
  it("labels in-progress matches LIVE from matchStarted, then STALE as the cache ages", () => {
    assert.equal(cricApiLifecycle(liveRow), "LIVE");
    assert.equal(cricApiLifecycle(doneRow), "COMPLETED");
    assert.equal(cricApiLifecycle({ ...liveRow, matchStarted: false }), "UPCOMING");
    const now = Date.parse("2026-10-19T10:00:00Z");
    const fresh = normaliseCricApiMatch(liveRow, { fetchedAtIso: new Date(now - 30_000).toISOString(), staleAfterMs: 120_000, nowMs: now });
    const old = normaliseCricApiMatch(liveRow, { fetchedAtIso: new Date(now - 10 * MIN).toISOString(), staleAfterMs: 120_000, nowMs: now });
    assert.equal(fresh.freshness, "LIVE");
    assert.equal(old.freshness, "STALE");
    assert.equal(old.updatedAt, new Date(now - 10 * MIN).toISOString());
  });

  it("serves fixtures, match detail and health from three cached calls", async () => {
    const urls: string[] = [];
    const fetchImpl = (async (url: string) => {
      urls.push(String(url));
      const u = String(url);
      const body = u.includes("/currentMatches")
        ? { status: "success", data: [{ ...liveRow, series_id: "7ac098a3-5d70-4c81-8e81-199edbeffc29" }], info: { hitsToday: 5, hitsLimit: 100 } }
        : u.includes("/series")
          ? { status: "success", data: [{ id: "7ac098a3-5d70-4c81-8e81-199edbeffc29", name: "ICC CWC League Two 2023-27" }] }
          : { status: "success", data: [doneRow], info: { hitsToday: 6, hitsLimit: 100 } };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;
    const api = new CricApiAdapter({ apiKey: "00000000-0000-0000-0000-000000000000", fetchImpl, store: new MemoryCacheStore(), maxRetries: 0 });

    const list = await api.listFixtures();
    assert.equal(list.ok, true);
    assert.equal(list.data![0]!.title, "Oman vs Nepal, 139th Match", "live first");
    assert.equal(list.data![0]!.series, "ICC CWC League Two 2023-27", "series name resolved from cached list");
    const match = await api.getMatch(`cricapi-${liveRow.id}`);
    assert.equal(match.ok, true);
    assert.equal(match.data!.status, "LIVE");
    const health = await api.health();
    assert.equal(health.ok, true);
    assert.equal(urls.length, 3, "currentMatches + matches + series only");
    assert.ok(urls.every((u) => !u.includes("cricapi:")), "cache keys never reach the network");
  });

  it("treats CricAPI status:failure as an error and skips fantasy scorecards", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ status: "failure", reason: "Invalid API Key" }), { status: 200 });
    }) as typeof fetch;
    const api = new CricApiAdapter({ apiKey: "00000000-0000-0000-0000-000000000000", fetchImpl, store: new MemoryCacheStore(), maxRetries: 0 });
    const health = await api.health();
    assert.equal(health.ok, false);
    assert.match(health.message, /Invalid API Key/);
    const card = await api.getScorecard("cricapi-x");
    assert.equal(card.ok, false);
    assert.equal(calls, 1, "scorecard did not spend quota");
  });

  it("groups player career stats and drops the placeholder image", () => {
    const p = playerInfoFromRow(
      {
        id: "fe07f9f3-69e4-4526-aae4-67f8285aabc6",
        name: "Srishti Raha",
        role: "WK-Batsman",
        placeOfBirth: "--",
        country: "Canada",
        playerImg: "https://h.cricapi.com/img/icon512.png",
        stats: [
          { fn: "batting", matchtype: "t20i", stat: " runs ", value: " 120 " },
          { fn: "batting", matchtype: "t20i", stat: " avg ", value: " 15.0 " },
          { fn: "bowling", matchtype: "odi", stat: " wkts ", value: " 3 " },
        ],
      },
      "2026-10-19T10:00:00.000Z",
    );
    assert.equal(p.imageUrl, undefined);
    assert.equal(p.placeOfBirth, undefined);
    assert.deepEqual(p.career, { batting: { t20i: { runs: "120", avg: "15.0" } }, bowling: { odi: { wkts: "3" } } });
  });
});

const url = process.env.CRICKETOS_TEST_DATABASE_URL?.trim();

describe("Postgres provider cache (integration)", { skip: url ? false : "CRICKETOS_TEST_DATABASE_URL not set" }, () => {
  const pool = url ? createPool(url, { max: 2 }) : null;
  after(async () => {
    await pool!.query("DELETE FROM provider_cache WHERE key LIKE 'test:%'");
    await pool!.end();
  });

  it("shares entries and lets only one instance claim a refresh", async () => {
    const store = new PostgresCacheStore(pool!);
    const other = new PostgresCacheStore(pool!);
    assert.equal(await store.claim("test:claim", 30_000), true);
    assert.equal(await other.claim("test:claim", 30_000), false, "second instance must not refresh");
    await store.set("test:claim", { body: { a: 1 }, ok: true, status: 200, fetchedAt: "2026-10-19T10:00:00.000Z" });
    const got = await other.get("test:claim");
    assert.deepEqual(got?.body, { a: 1 });
    assert.equal(await other.claim("test:claim", 30_000), true, "claim released by set");

    let calls = 0;
    const r = await cachedFetch({
      store,
      key: "test:fresh",
      ttlMs: MIN,
      fetcher: async () => ({ body: { n: ++calls }, ok: true, status: 200 }),
    });
    assert.equal(r.source, "network");
    const r2 = await cachedFetch({ store: other, key: "test:fresh", ttlMs: MIN, fetcher: async () => ({ body: { n: ++calls }, ok: true, status: 200 }) });
    assert.equal(r2.source, "fresh");
    assert.equal(calls, 1);
  });
});
