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
  toFixtureItem,
} from "@/lib/ingestion/normalise";
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

export type CricApiAdapterOptions = {
  apiKey?: string | null;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
};

export class CricApiAdapter implements CricketDataAdapter {
  readonly id = "cricapi" as const;
  private apiKey: string | null;
  private baseUrl: string;
  private fetchImpl?: typeof fetch;
  private timeoutMs: number;
  private maxRetries: number;

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
  }

  private url(path: string, params: Record<string, string | number | undefined> = {}): string {
    const u = new URL(`${this.baseUrl}${path}`);
    if (this.apiKey) u.searchParams.set("apikey", this.apiKey);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) u.searchParams.set(k, String(v));
    }
    return u.toString();
  }

  async health(): Promise<AdapterHealth> {
    const checkedAt = new Date().toISOString();
    if (!this.apiKey) {
      return {
        provider: "cricapi",
        ok: false,
        message: "CRICKETOS_DATA_API_KEY not configured",
        checkedAt,
      };
    }
    const res = await providerFetch({
      url: this.url("/currentMatches", { offset: 0 }),
      timeoutMs: this.timeoutMs,
      maxRetries: this.maxRetries,
      logLabel: "cricapi.health",
      fetchImpl: this.fetchImpl,
    });
    return {
      provider: "cricapi",
      ok: res.ok,
      message: res.ok ? "currentMatches reachable" : res.error ?? "health failed",
      checkedAt,
    };
  }

  async listFixtures(params?: ListFixturesParams): Promise<AdapterResult<DomainFixtureListItem[]>> {
    if (!this.apiKey) return { ok: false, error: "API key missing" };
    const res = await providerFetch({
      url: this.url("/matches", { offset: params?.offset ?? 0 }),
      timeoutMs: this.timeoutMs,
      maxRetries: this.maxRetries,
      logLabel: "cricapi.listFixtures",
      fetchImpl: this.fetchImpl,
    });
    if (!res.ok) return { ok: false, error: res.error, raw: res.body };
    const validated = validateCricApiMatchList(res.body);
    if (!validated.ok || !validated.value) {
      return { ok: false, error: validated.issues.map((i) => i.message).join("; "), raw: res.body };
    }
    const matches = validated.value.map(normaliseCricApiMatch);
    const limit = params?.limit ?? matches.length;
    return { ok: true, data: matches.slice(0, limit).map(toFixtureItem), raw: res.body };
  }

  async getMatch(id: string): Promise<AdapterResult<DomainMatch>> {
    // CricAPI match detail often via list / current; try currentMatches scan then matches
    const list = await this.listFixtures({ limit: 100 });
    if (!list.ok || !list.data) return { ok: false, error: list.error ?? "list failed" };
    const hit = list.data.find((m) => m.id === id || m.id.endsWith(id));
    if (!hit) return { ok: false, error: "match not in recent list" };
    // Re-fetch raw via currentMatches for score
    if (!this.apiKey) return { ok: false, error: "API key missing" };
    const res = await providerFetch({
      url: this.url("/currentMatches", { offset: 0 }),
      timeoutMs: this.timeoutMs,
      maxRetries: this.maxRetries,
      logLabel: "cricapi.getMatch",
      fetchImpl: this.fetchImpl,
    });
    const validated = validateCricApiMatchList(res.body);
    const row = validated.value?.find((r) => `cricapi-${String(r.id)}`.includes(String(r.id)) && hit.id.includes(String(r.id).slice(0, 8)));
    if (row) return { ok: true, data: normaliseCricApiMatch(row), raw: row };
    // Fallback minimal from fixture item
    return {
      ok: true,
      data: {
        id: hit.id,
        providerIds: { cricapi: id },
        status: hit.status,
        freshness: hit.freshness,
        title: hit.title,
        venue: hit.venue,
        series: hit.series,
        format: hit.format,
        startTimeIso: hit.startTimeIso,
        teams: {
          home: {
            id: "team-home",
            providerIds: {},
            name: hit.homeName,
            shortName: hit.homeName.slice(0, 3).toUpperCase(),
          },
          away: {
            id: "team-away",
            providerIds: {},
            name: hit.awayName,
            shortName: hit.awayName.slice(0, 3).toUpperCase(),
          },
        },
        provenance: hit.provenance,
        updatedAt: hit.updatedAt,
      },
    };
  }

  async getScorecard(matchId: string): Promise<AdapterResult<DomainScorecard>> {
    if (!this.apiKey) return { ok: false, error: "API key missing" };
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
    const res = await providerFetch({
      url: this.url("/players", {
        offset: params?.offset ?? 0,
        search: params?.search ?? "",
      }),
      timeoutMs: this.timeoutMs,
      maxRetries: this.maxRetries,
      logLabel: "cricapi.players",
      fetchImpl: this.fetchImpl,
    });
    if (!res.ok) return { ok: false, error: res.error, raw: res.body };
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
