/**
 * CricketData.org / CricAPI adapter.
 * Uses official v1 paths; never logs API keys.
 * Without a key, factory should not select this adapter.
 */

import type {
  DomainBall,
  DomainFixtureListItem,
  DomainMatch,
  DomainPlayer,
  DomainScorecard,
} from "@/lib/domain/models";
import {
  emptyScorecard,
  normaliseCricApiMatch,
  normaliseCricApiPlayer,
  slugId,
  toFixtureItem,
} from "@/lib/ingestion/normalise";
import { cachedFetch, getProviderCacheStore, type CacheResult, type ProviderCacheStore } from "@/lib/provider/cache";
import { validateCricApiMatchList, isRecordExport } from "@/lib/ingestion/validate";
import { getCricketOsConfig, getDataApiKey } from "@/lib/provider/config";
import { providerFetch } from "@/lib/provider/http";
import type {
  AdapterHealth,
  AdapterResult,
  CricketDataAdapter,
  ListFixturesParams,
  ListPlayersParams,
} from "@/lib/provider/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CricApiSeries = {
  id: string;
  name: string;
  startDate?: string;
  /** CricAPI often sends a partial end date such as "Nov 21". */
  endDate?: string;
  matches: number;
  odi: number;
  t20: number;
  test: number;
  squads: number;
};

export type CricApiMatchInfo = {
  match: DomainMatch;
  innings: { inning: string; runs: number; wickets: number; overs: string }[];
  tossWinner?: string;
  tossChoice?: string;
  seriesId?: string;
  fetchedAt: string;
  cache: CacheResult["source"];
};

export type CricApiCareerStat = { fn: string; format: string; stat: string; value: string };

export type CricApiPlayerInfo = {
  id: string;
  name: string;
  country?: string;
  role?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  placeOfBirth?: string;
  imageUrl?: string;
  /** Career stats grouped as fn → format → stat → value (strings as sent). */
  career: Record<string, Record<string, Record<string, string>>>;
  fetchedAt: string;
};

const num0 = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0) || 0);
const str = (v: unknown) => (typeof v === "string" && v.trim() && v.trim() !== "--" ? v.trim() : undefined);

export function seriesFromRow(r: Record<string, unknown>): CricApiSeries {
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    startDate: str(r.startDate ?? r.startdate),
    endDate: str(r.endDate ?? r.enddate),
    matches: num0(r.matches),
    odi: num0(r.odi),
    t20: num0(r.t20),
    test: num0(r.test),
    squads: num0(r.squads),
  };
}

export function playerInfoFromRow(d: Record<string, unknown>, fetchedAt: string): CricApiPlayerInfo {
  const career: CricApiPlayerInfo["career"] = {};
  for (const s of Array.isArray(d.stats) ? d.stats.filter(isRecordExport) : []) {
    const fn = String(s.fn ?? "").trim();
    const format = String(s.matchtype ?? "").trim();
    const stat = String(s.stat ?? "").trim();
    if (!fn || !format || !stat) continue;
    ((career[fn] ??= {})[format] ??= {})[stat] = String(s.value ?? "").trim();
  }
  const img = str(d.playerImg);
  return {
    id: String(d.id ?? ""),
    name: String(d.name ?? ""),
    country: str(d.country),
    role: str(d.role),
    battingStyle: str(d.battingStyle),
    bowlingStyle: str(d.bowlingStyle),
    placeOfBirth: str(d.placeOfBirth),
    // The generic placeholder icon is not a player photo.
    imageUrl: img && !img.endsWith("/icon512.png") ? img : undefined,
    career,
    fetchedAt,
  };
}

export type CricApiAdapterOptions = {
  apiKey?: string | null;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
  /** Cache store override (tests); defaults to the shared Postgres/memory store. */
  store?: ProviderCacheStore;
  now?: () => number;
};

export class CricApiAdapter implements CricketDataAdapter {
  readonly id = "cricapi" as const;
  private apiKey: string | null;
  private baseUrl: string;
  private fetchImpl?: typeof fetch;
  private timeoutMs: number;
  private maxRetries: number;
  private store?: ProviderCacheStore;
  private now?: () => number;
  private ttlCurrentMs: number;
  private ttlScheduleMs: number;
  private ttlPlayersMs: number;
  private ttlSeriesMs: number;
  private ttlSeriesInfoMs: number;
  private ttlPlayerInfoMs: number;
  private quotaReserve: number;
  private staleAfterMs: number;
  private scorecardEnabled: boolean;

  constructor(opts: CricApiAdapterOptions = {}) {
    const cfg = getCricketOsConfig();
    this.apiKey = opts.apiKey ?? getDataApiKey();
    this.baseUrl = (opts.baseUrl ?? cfg.dataApiBaseUrl ?? "https://api.cricapi.com/v1").replace(
      /\/$/,
      "",
    );
    this.fetchImpl = opts.fetchImpl;
    this.timeoutMs = opts.timeoutMs ?? cfg.providerTimeoutMs;
    this.maxRetries = opts.maxRetries ?? cfg.providerMaxRetries;
    this.store = opts.store;
    this.now = opts.now;
    this.ttlCurrentMs = cfg.providerTtlCurrentMs;
    this.ttlScheduleMs = cfg.providerTtlScheduleMs;
    this.ttlPlayersMs = cfg.providerTtlPlayersMs;
    // Series lists, series fixtures and player profiles change slowly.
    this.ttlSeriesMs = 24 * 60 * 60_000;
    this.ttlSeriesInfoMs = 6 * 60 * 60_000;
    this.ttlPlayerInfoMs = 7 * 24 * 60 * 60_000;
    this.quotaReserve = cfg.providerQuotaReserve;
    this.staleAfterMs = cfg.staleAfterMs;
    this.scorecardEnabled = process.env.CRICKETOS_CRICAPI_SCORECARD === "on";
  }

  private url(path: string, params: Record<string, string | number | undefined> = {}): string {
    const u = new URL(`${this.baseUrl}${path}`);
    if (this.apiKey) u.searchParams.set("apikey", this.apiKey);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) u.searchParams.set(k, String(v));
    }
    return u.toString();
  }

  /**
   * Every CricAPI call goes through the shared cache (keys never include the
   * API key). Free tier = 100 hits/day across all instances and visitors.
   */
  private async cached(
    path: string,
    params: Record<string, string | number | undefined>,
    ttlMs: number,
    logLabel: string,
  ): Promise<CacheResult> {
    const keyParams = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return cachedFetch({
      store: this.store ?? (await getProviderCacheStore()),
      key: `cricapi:${path}?${keyParams}`,
      ttlMs,
      now: this.now,
      quota: {
        key: "cricapi:quota",
        reserve: this.quotaReserve,
        fromBody: (body) => {
          if (!isRecordExport(body) || !isRecordExport(body.info)) return null;
          const { hitsToday, hitsLimit } = body.info as { hitsToday?: unknown; hitsLimit?: unknown };
          return typeof hitsToday === "number" && typeof hitsLimit === "number" ? { hitsToday, hitsLimit } : null;
        },
      },
      fetcher: async () => {
        const res = await providerFetch({
          url: this.url(path, params),
          timeoutMs: this.timeoutMs,
          maxRetries: this.maxRetries,
          logLabel,
          fetchImpl: this.fetchImpl,
        });
        // CricAPI reports failures (bad key, quota) as 200 + status:"failure".
        const failed = isRecordExport(res.body) && res.body.status === "failure";
        return {
          body: res.body,
          ok: res.ok && !failed,
          status: res.status,
          error: failed ? String((res.body as Record<string, unknown>).reason ?? "provider failure") : res.error,
        };
      },
    });
  }

  private rows(res: CacheResult): Record<string, unknown>[] {
    if (!res.ok) return [];
    const validated = validateCricApiMatchList(res.body);
    return validated.ok && validated.value ? validated.value : [];
  }

  /** series_id → name from the cached series list (≈1 call/day). */
  private async seriesNames(): Promise<Map<string, string>> {
    const res = await this.cached("/series", { offset: 0 }, this.ttlSeriesMs, "cricapi.series");
    const out = new Map<string, string>();
    if (res.ok && isRecordExport(res.body) && Array.isArray(res.body.data)) {
      for (const r of res.body.data.filter(isRecordExport)) {
        if (typeof r.id === "string" && typeof r.name === "string") out.set(r.id, r.name);
      }
    }
    return out;
  }

  private withSeries(row: Record<string, unknown>, names: Map<string, string>): Record<string, unknown> {
    if (typeof row.series === "string" && row.series.trim()) return row;
    const fromList = typeof row.series_id === "string" ? names.get(row.series_id) : undefined;
    // Fallback: CricAPI names read "A vs B, 139th Match, Series Name".
    const parts = typeof row.name === "string" ? row.name.split(", ") : [];
    const fromName = parts.length >= 3 ? parts.slice(2).join(", ").trim() : undefined;
    const name = fromList ?? fromName;
    return name ? { ...row, series: name } : row;
  }

  private normalise(row: Record<string, unknown>, res: CacheResult): DomainMatch {
    return normaliseCricApiMatch(row, {
      fetchedAtIso: res.fetchedAt,
      staleAfterMs: this.staleAfterMs,
      nowMs: this.now?.(),
    });
  }

  async health(): Promise<AdapterHealth> {
    const checkedAt = new Date().toISOString();
    if (!this.apiKey) {
      return { provider: "cricapi", ok: false, message: "CRICKETOS_DATA_API_KEY not configured", checkedAt };
    }
    // Served from the shared cache — health checks never spend extra quota.
    const res = await this.cached("/currentMatches", { offset: 0 }, this.ttlCurrentMs, "cricapi.health");
    const asOf = res.source === "none" ? "" : ` · as of ${res.fetchedAt}`;
    return {
      provider: "cricapi",
      ok: res.ok,
      message: res.ok
        ? `currentMatches cached (${res.source})${asOf}${res.note ? ` · ${res.note}` : ""}`
        : `CricAPI unavailable: ${res.note ?? res.error ?? "unknown error"}`,
      checkedAt,
    };
  }

  async listFixtures(params?: ListFixturesParams): Promise<AdapterResult<DomainFixtureListItem[]>> {
    if (!this.apiKey) return { ok: false, error: "API key missing" };
    const [current, schedule, names] = await Promise.all([
      this.cached("/currentMatches", { offset: 0 }, this.ttlCurrentMs, "cricapi.currentMatches"),
      this.cached("/matches", { offset: params?.offset ?? 0 }, this.ttlScheduleMs, "cricapi.matches"),
      this.seriesNames(),
    ]);

    // Current matches win over the schedule for the same id (fresher scores).
    const byId = new Map<string, DomainFixtureListItem>();
    for (const [res, rows] of [
      [schedule, this.rows(schedule)],
      [current, this.rows(current)],
    ] as const) {
      for (const row of rows) {
        byId.set(slugId("cricapi", String(row.id)), toFixtureItem(this.normalise(this.withSeries(row, names), res)));
      }
    }

    if (!byId.size) {
      return {
        ok: false,
        error: current.note ?? current.error ?? schedule.note ?? schedule.error ?? "no fixtures from currentMatches/matches",
      };
    }
    const order: Record<string, number> = { LIVE: 0, STALE: 1, UPCOMING: 2, HISTORICAL: 3 };
    const matches = [...byId.values()].sort(
      (a, b) => (order[a.freshness] ?? 9) - (order[b.freshness] ?? 9) || (a.startTimeIso ?? "").localeCompare(b.startTimeIso ?? ""),
    );
    return { ok: true, data: matches.slice(0, params?.limit ?? matches.length) };
  }

  async getMatch(id: string): Promise<AdapterResult<DomainMatch>> {
    if (!this.apiKey) return { ok: false, error: "API key missing" };
    const want = id.startsWith("cricapi-") ? id : slugId("cricapi", id);
    // Same cached lists as listFixtures — no extra provider calls per match.
    for (const [path, ttl] of [
      ["/currentMatches", this.ttlCurrentMs],
      ["/matches", this.ttlScheduleMs],
    ] as const) {
      const res = await this.cached(path, { offset: 0 }, ttl, `cricapi.getMatch${path}`);
      const row = this.rows(res).find((r) => slugId("cricapi", String(r.id)) === want);
      if (row) return { ok: true, data: this.normalise(row, res), raw: row };
    }
    // Not in the lists: one match_info call (UUIDs only), cached.
    const providerId = id.replace(/^cricapi-/, "");
    if (!UUID_RE.test(providerId)) return { ok: false, error: "match not in the cached current/scheduled lists" };
    const info = await this.getMatchInfo(providerId);
    return info.ok && info.data ? { ok: true, data: info.data.match, raw: info.raw } : { ok: false, error: info.error };
  }

  /** `match_info`: score per innings, toss, series id. Live matches refresh like currentMatches. */
  async getMatchInfo(providerId: string): Promise<AdapterResult<CricApiMatchInfo>> {
    if (!this.apiKey) return { ok: false, error: "API key missing" };
    if (!UUID_RE.test(providerId)) return { ok: false, error: "invalid match id" };
    const res = await this.cached("/match_info", { id: providerId }, this.ttlCurrentMs, "cricapi.match_info");
    if (!res.ok) return { ok: false, error: res.note ?? res.error };
    const data = isRecordExport(res.body) && isRecordExport(res.body.data) ? res.body.data : null;
    if (!data) return { ok: false, error: "unexpected match_info payload" };
    const match = this.normalise(data, res);
    const innings = (Array.isArray(data.score) ? data.score : []).filter(isRecordExport).map((s) => ({
      inning: String(s.inning ?? ""),
      runs: Number(s.r ?? 0),
      wickets: Number(s.w ?? 0),
      overs: String(s.o ?? "0"),
    }));
    return {
      ok: true,
      data: {
        match,
        innings,
        tossWinner: typeof data.tossWinner === "string" ? data.tossWinner : undefined,
        tossChoice: typeof data.tossChoice === "string" ? data.tossChoice : undefined,
        seriesId: typeof data.series_id === "string" ? data.series_id : undefined,
        fetchedAt: res.fetchedAt,
        cache: res.source,
      },
      raw: data,
    };
  }

  /** `series`: upcoming/current series with match counts. */
  async listSeries(params: { offset?: number; search?: string } = {}): Promise<AdapterResult<CricApiSeries[]>> {
    if (!this.apiKey) return { ok: false, error: "API key missing" };
    const res = await this.cached(
      "/series",
      { offset: params.offset ?? 0, search: params.search?.trim() || undefined },
      this.ttlSeriesMs,
      "cricapi.series",
    );
    if (!res.ok) return { ok: false, error: res.note ?? res.error };
    if (!isRecordExport(res.body) || !Array.isArray(res.body.data)) return { ok: false, error: "unexpected series payload" };
    return { ok: true, data: res.body.data.filter(isRecordExport).map(seriesFromRow) };
  }

  /** `series_info`: series header plus its match list (normalised fixtures). */
  async getSeriesInfo(seriesId: string): Promise<AdapterResult<{ series: CricApiSeries; matches: DomainFixtureListItem[]; fetchedAt: string }>> {
    if (!this.apiKey) return { ok: false, error: "API key missing" };
    if (!UUID_RE.test(seriesId)) return { ok: false, error: "invalid series id" };
    const res = await this.cached("/series_info", { id: seriesId }, this.ttlSeriesInfoMs, "cricapi.series_info");
    if (!res.ok) return { ok: false, error: res.note ?? res.error };
    const data = isRecordExport(res.body) && isRecordExport(res.body.data) ? res.body.data : null;
    if (!data || !isRecordExport(data.info)) return { ok: false, error: "unexpected series_info payload" };
    const list = Array.isArray(data.matchList) ? data.matchList.filter(isRecordExport) : [];
    return {
      ok: true,
      data: {
        series: seriesFromRow(data.info),
        matches: list.map((row) => toFixtureItem(this.normalise(row, res))),
        fetchedAt: res.fetchedAt,
      },
    };
  }

  /** `players_info`: profile plus career stats by format. Cached for a week. */
  async getPlayerInfo(playerId: string): Promise<AdapterResult<CricApiPlayerInfo>> {
    if (!this.apiKey) return { ok: false, error: "API key missing" };
    if (!UUID_RE.test(playerId)) return { ok: false, error: "invalid player id" };
    const res = await this.cached("/players_info", { id: playerId }, this.ttlPlayerInfoMs, "cricapi.players_info");
    if (!res.ok) return { ok: false, error: res.note ?? res.error };
    const d = isRecordExport(res.body) && isRecordExport(res.body.data) ? res.body.data : null;
    if (!d) return { ok: false, error: "unexpected players_info payload" };
    return { ok: true, data: playerInfoFromRow(d, res.fetchedAt) };
  }

  async getScorecard(matchId: string): Promise<AdapterResult<DomainScorecard>> {
    if (!this.apiKey) return { ok: false, error: "API key missing" };
    if (!this.scorecardEnabled) {
      // Fantasy-gated on CricAPI and not normalised yet — don't spend daily quota on it.
      return {
        ok: false,
        error: "CricAPI scorecards are not enabled (fantasy-gated; set CRICKETOS_CRICAPI_SCORECARD=on with a paid plan)",
      };
    }
    // Provider entity id may be embedded
    const providerId = matchId.replace(/^cricapi-/, "");
    const res = await providerFetch({
      url: this.url("/match_scorecard", { id: providerId, offset: 0 }),
      timeoutMs: this.timeoutMs,
      maxRetries: this.maxRetries,
      logLabel: "cricapi.scorecard",
      fetchImpl: this.fetchImpl,
    });
    if (!res.ok) {
      return {
        ok: false,
        error:
          res.error ??
          "scorecard unavailable (may require fantasyEnabled / paid Fantasy API — see PROVIDER_EVALUATION)",
        raw: res.body,
      };
    }
    // Structure varies; return empty card with note rather than invent innings
    if (!isRecordExport(res.body)) return { ok: true, data: emptyScorecard(matchId), raw: res.body };
    return { ok: true, data: emptyScorecard(matchId), raw: res.body };
  }

  async getBallByBall(matchId: string): Promise<AdapterResult<DomainBall[]>> {
    return {
      ok: false,
      error: `Ball-by-ball for ${matchId} not normalised from CricAPI in this build (fantasy/bbb gated — see docs/PROVIDER_EVALUATION.md)`,
      data: [],
    };
  }

  async listPlayers(params?: ListPlayersParams): Promise<AdapterResult<DomainPlayer[]>> {
    if (!this.apiKey) return { ok: false, error: "API key missing" };
    const res = await this.cached(
      "/players",
      { offset: params?.offset ?? 0, search: params?.search ?? "" },
      this.ttlPlayersMs,
      "cricapi.players",
    );
    if (!res.ok) return { ok: false, error: res.note ?? res.error };
    if (!isRecordExport(res.body) || !Array.isArray(res.body.data)) {
      return { ok: false, error: "unexpected players payload", raw: res.body };
    }
    const players = res.body.data
      .filter(isRecordExport)
      .map(normaliseCricApiPlayer)
      .slice(0, params?.limit ?? 50);
    return { ok: true, data: players, raw: res.body };
  }

  async listHistorical(params?: ListFixturesParams): Promise<AdapterResult<DomainFixtureListItem[]>> {
    return this.listFixtures(params);
  }
}
