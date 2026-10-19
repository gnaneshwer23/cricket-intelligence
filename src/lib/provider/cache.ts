/**
 * Shared, quota-guarded cache for rate-limited providers (CricAPI free tier:
 * 100 hits/day). Postgres-backed when durable storage is configured, so every
 * serverless instance shares one copy; in-memory otherwise.
 *
 * Rules:
 * - Fresh entry (age < ttl) → served without calling the provider.
 * - Stale entry → one instance refreshes (claim with `refreshing_until`); the
 *   others keep serving the stale copy, labelled by its `fetchedAt`.
 * - Daily quota guard → once hits reach `limit − reserve`, no more calls until
 *   the provider's day rolls over; stale data is served instead.
 * - Failed refresh → the last good copy is kept and returned with the error.
 */

import type { Pool } from "pg";

export type CachedResponse = {
  body: unknown;
  ok: boolean;
  status: number;
  error?: string;
  fetchedAt: string;
};

export type CacheResult = CachedResponse & {
  /** "fresh" from cache, "network" just fetched, "stale" served past ttl, "none" nothing to serve. */
  source: "fresh" | "network" | "stale" | "none";
  ageMs: number;
  /** Why the network was not used (quota guard, refresh in progress). */
  note?: string;
};

export type QuotaState = { hitsToday: number; hitsLimit: number; day: string };

export interface ProviderCacheStore {
  get(key: string): Promise<CachedResponse | null>;
  set(key: string, value: CachedResponse): Promise<void>;
  /** Claim the right to refresh `key` for `ms`; false when another instance holds it. */
  claim(key: string, ms: number): Promise<boolean>;
}

export class MemoryCacheStore implements ProviderCacheStore {
  private rows = new Map<string, CachedResponse>();
  private claims = new Map<string, number>();
  async get(key: string) {
    return this.rows.get(key) ?? null;
  }
  async set(key: string, value: CachedResponse) {
    this.rows.set(key, value);
    this.claims.delete(key);
  }
  async claim(key: string, ms: number) {
    const until = this.claims.get(key) ?? 0;
    if (until > Date.now()) return false;
    this.claims.set(key, Date.now() + ms);
    return true;
  }
}

export class PostgresCacheStore implements ProviderCacheStore {
  constructor(private readonly pool: Pool) {}

  async get(key: string): Promise<CachedResponse | null> {
    const res = await this.pool.query<{
      body: unknown;
      ok: boolean;
      status: number;
      error: string | null;
      fetched_at: Date;
    }>("SELECT body, ok, status, error, fetched_at FROM provider_cache WHERE key = $1", [key]);
    const r = res.rows[0];
    if (!r) return null;
    return {
      body: r.body,
      ok: r.ok,
      status: r.status,
      error: r.error ?? undefined,
      fetchedAt: r.fetched_at.toISOString(),
    };
  }

  async set(key: string, value: CachedResponse): Promise<void> {
    await this.pool.query(
      `INSERT INTO provider_cache (key, body, ok, status, error, fetched_at, refreshing_until)
       VALUES ($1, $2, $3, $4, $5, $6, NULL)
       ON CONFLICT (key) DO UPDATE SET body = EXCLUDED.body, ok = EXCLUDED.ok, status = EXCLUDED.status,
         error = EXCLUDED.error, fetched_at = EXCLUDED.fetched_at, refreshing_until = NULL`,
      [key, JSON.stringify(value.body ?? null), value.ok, value.status, value.error ?? null, value.fetchedAt],
    );
  }

  async claim(key: string, ms: number): Promise<boolean> {
    // Upsert a placeholder if the key is new, then take the claim only if it is free.
    const res = await this.pool.query(
      `INSERT INTO provider_cache (key, body, ok, status, fetched_at, refreshing_until)
       VALUES ($1, NULL, false, 0, to_timestamp(0), NOW() + ($2 || ' milliseconds')::interval)
       ON CONFLICT (key) DO UPDATE SET refreshing_until = EXCLUDED.refreshing_until
         WHERE provider_cache.refreshing_until IS NULL OR provider_cache.refreshing_until < NOW()
       RETURNING key`,
      [key, String(ms)],
    );
    return (res.rowCount ?? 0) > 0;
  }
}

export type CachedFetchOptions = {
  store: ProviderCacheStore;
  key: string;
  ttlMs: number;
  fetcher: () => Promise<Omit<CachedResponse, "fetchedAt">>;
  /** Read/update daily quota from the provider body; null for providers without one. */
  quota?: {
    key: string;
    reserve: number;
    fromBody: (body: unknown) => { hitsToday: number; hitsLimit: number } | null;
  };
  now?: () => number;
};

const inflight = new Map<string, Promise<CacheResult>>();
const CLAIM_MS = 30_000;
const FAILURE_BACKOFF_MS = 5 * 60_000;

/** UTC day — CricAPI resets its daily counter on a fixed daily boundary. */
const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export async function cachedFetch(opts: CachedFetchOptions): Promise<CacheResult> {
  const pending = inflight.get(opts.key);
  if (pending) return pending;
  const p = run(opts).finally(() => inflight.delete(opts.key));
  inflight.set(opts.key, p);
  return p;
}

async function run(opts: CachedFetchOptions): Promise<CacheResult> {
  const now = opts.now ?? Date.now;
  const t = now();
  const cached = await opts.store.get(opts.key);
  const usable = cached && cached.fetchedAt !== new Date(0).toISOString() && cached.body != null ? cached : null;
  const age = usable ? t - Date.parse(usable.fetchedAt) : Number.POSITIVE_INFINITY;
  const serve = (source: CacheResult["source"], note?: string): CacheResult =>
    usable
      ? { ...usable, source, ageMs: age, note }
      : { body: null, ok: false, status: 0, error: note ?? "no cached data", fetchedAt: new Date(t).toISOString(), source: "none", ageMs: 0, note };

  if (usable?.ok && age < opts.ttlMs) return serve("fresh");

  // Back off after a failure with nothing good to serve (bad key, outage).
  if (!usable && cached && !cached.ok && t - Date.parse(cached.fetchedAt) < FAILURE_BACKOFF_MS) {
    return serve("none", `backing off after failure: ${cached.error ?? `HTTP ${cached.status}`}`);
  }

  if (opts.quota) {
    const q = await opts.store.get(opts.quota.key);
    const state = q?.body as QuotaState | null;
    if (state && state.day === dayOf(t) && state.hitsToday >= state.hitsLimit - opts.quota.reserve) {
      return serve("stale", `quota guard: ${state.hitsToday}/${state.hitsLimit} hits used today`);
    }
  }

  if (!(await opts.store.claim(opts.key, CLAIM_MS))) {
    return serve("stale", "refresh in progress on another instance");
  }

  const res = await opts.fetcher();
  const fetchedAt = new Date(now()).toISOString();

  if (opts.quota && res.body != null) {
    const info = opts.quota.fromBody(res.body);
    if (info) {
      await opts.store.set(opts.quota.key, {
        body: { ...info, day: dayOf(now()) } satisfies QuotaState,
        ok: true,
        status: 200,
        fetchedAt,
      });
    }
  }

  if (res.ok) {
    const entry: CachedResponse = { ...res, fetchedAt };
    await opts.store.set(opts.key, entry);
    return { ...entry, source: "network", ageMs: 0 };
  }

  // Keep the last good copy; release the claim by re-writing it unchanged.
  if (usable) {
    await opts.store.set(opts.key, usable);
    return { ...usable, source: "stale", ageMs: age, note: `refresh failed: ${res.error ?? `HTTP ${res.status}`}` };
  }
  await opts.store.set(opts.key, { ...res, body: null, fetchedAt });
  return { ...res, fetchedAt, source: "none", ageMs: 0, note: res.error };
}

/** Test helper. */
export function resetInflightForTests() {
  inflight.clear();
}

let memoryStore: MemoryCacheStore | null = null;

/** Shared store: Postgres when durable storage is configured, else process memory. */
export async function getProviderCacheStore(): Promise<ProviderCacheStore> {
  const [{ getStorage }, { PostgresStorage }] = await Promise.all([
    import("@/lib/storage"),
    import("@/lib/storage/postgres"),
  ]);
  const storage = getStorage();
  if (storage instanceof PostgresStorage) return new PostgresCacheStore(storage.pool);
  memoryStore ??= new MemoryCacheStore();
  return memoryStore;
}
