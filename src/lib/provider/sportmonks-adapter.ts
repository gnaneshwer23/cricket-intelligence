/**
 * Sportmonks Cricket API v2 adapter.
 * Auth via api_token query param (server-side only).
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
  normaliseSportmonksBalls,
  normaliseSportmonksFixture,
  slugId,
  toFixtureItem,
} from "@/lib/ingestion/normalise";
import { isRecordExport, validateSportmonksList } from "@/lib/ingestion/validate";
import { getCricketOsConfig, getDataApiKey } from "@/lib/provider/config";
import { providerFetch } from "@/lib/provider/http";
import type {
  AdapterHealth,
  AdapterResult,
  CricketDataAdapter,
  ListFixturesParams,
  ListPlayersParams,
} from "@/lib/provider/types";

export type SportmonksAdapterOptions = {
  apiKey?: string | null;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
};

export class SportmonksAdapter implements CricketDataAdapter {
  readonly id = "sportmonks" as const;
  private apiKey: string | null;
  private baseUrl: string;
  private fetchImpl?: typeof fetch;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(opts: SportmonksAdapterOptions = {}) {
    const cfg = getCricketOsConfig();
    this.apiKey = opts.apiKey ?? getDataApiKey();
    this.baseUrl = (
      opts.baseUrl ??
      cfg.dataApiBaseUrl ??
      "https://cricket.sportmonks.com/api/v2.0"
    ).replace(/\/$/, "");
    this.fetchImpl = opts.fetchImpl;
    this.timeoutMs = opts.timeoutMs ?? cfg.providerTimeoutMs;
    this.maxRetries = opts.maxRetries ?? cfg.providerMaxRetries;
  }

  private url(path: string, params: Record<string, string | number | undefined> = {}): string {
    const u = new URL(`${this.baseUrl}${path}`);
    if (this.apiKey) u.searchParams.set("api_token", this.apiKey);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") u.searchParams.set(k, String(v));
    }
    return u.toString();
  }

  async health(): Promise<AdapterHealth> {
    const checkedAt = new Date().toISOString();
    if (!this.apiKey) {
      return {
        provider: "sportmonks",
        ok: false,
        message: "CRICKETOS_DATA_API_KEY not configured",
        checkedAt,
      };
    }
    const res = await providerFetch({
      url: this.url("/leagues"),
      timeoutMs: this.timeoutMs,
      maxRetries: this.maxRetries,
      logLabel: "sportmonks.health",
      fetchImpl: this.fetchImpl,
    });
    return {
      provider: "sportmonks",
      ok: res.ok,
      message: res.ok ? "leagues reachable" : res.error ?? "health failed",
      checkedAt,
    };
  }

  async listFixtures(params?: ListFixturesParams): Promise<AdapterResult<DomainFixtureListItem[]>> {
    if (!this.apiKey) return { ok: false, error: "API key missing" };
    const res = await providerFetch({
      url: this.url("/fixtures", {
        include: "localteam,visitorteam,scoreboards",
      }),
      timeoutMs: this.timeoutMs,
      maxRetries: this.maxRetries,
      logLabel: "sportmonks.listFixtures",
      fetchImpl: this.fetchImpl,
    });
    if (!res.ok) return { ok: false, error: res.error, raw: res.body };
    const validated = validateSportmonksList(res.body);
    if (!validated.ok || !validated.value) {
      return { ok: false, error: validated.issues.map((i) => i.message).join("; "), raw: res.body };
    }
    const matches = validated.value.map(normaliseSportmonksFixture);
    const limit = params?.limit ?? matches.length;
    return { ok: true, data: matches.slice(0, limit).map(toFixtureItem), raw: res.body };
  }

  async getMatch(id: string): Promise<AdapterResult<DomainMatch>> {
    if (!this.apiKey) return { ok: false, error: "API key missing" };
    const providerId = id.replace(/^sportmonks-/, "");
    const res = await providerFetch({
      url: this.url(`/fixtures/${providerId}`, {
        include: "localteam,visitorteam,scoreboards,batting,bowling",
      }),
      timeoutMs: this.timeoutMs,
      maxRetries: this.maxRetries,
      logLabel: "sportmonks.getMatch",
      fetchImpl: this.fetchImpl,
    });
    if (!res.ok) return { ok: false, error: res.error, raw: res.body };
    const validated = validateSportmonksList(res.body);
    const row = validated.value?.[0];
    if (!row) return { ok: false, error: "empty fixture", raw: res.body };
    return { ok: true, data: normaliseSportmonksFixture(row), raw: res.body };
  }

  async getScorecard(matchId: string): Promise<AdapterResult<DomainScorecard>> {
    const matchRes = await this.getMatch(matchId);
    if (!matchRes.ok || !matchRes.data) return { ok: false, error: matchRes.error };
    // Full batting/bowling normalisation deferred — do not invent cards
    return { ok: true, data: emptyScorecard(matchRes.data.id), raw: matchRes.raw };
  }

  async getBallByBall(matchId: string): Promise<AdapterResult<DomainBall[]>> {
    if (!this.apiKey) return { ok: false, error: "API key missing" };
    const providerId = matchId.replace(/^sportmonks-/, "");
    const res = await providerFetch({
      url: this.url(`/fixtures/${providerId}`, { include: "balls" }),
      timeoutMs: this.timeoutMs,
      maxRetries: this.maxRetries,
      logLabel: "sportmonks.balls",
      fetchImpl: this.fetchImpl,
    });
    if (!res.ok) return { ok: false, error: res.error, raw: res.body };
    if (!isRecordExport(res.body) || !isRecordExport(res.body.data)) {
      return { ok: false, error: "unexpected fixture payload", raw: res.body };
    }
    const ballsRaw = res.body.data.balls;
    const rows = Array.isArray(ballsRaw)
      ? ballsRaw.filter(isRecordExport)
      : isRecordExport(ballsRaw) && Array.isArray(ballsRaw.data)
        ? ballsRaw.data.filter(isRecordExport)
        : [];
    const matchIdNorm = slugId("sportmonks", providerId);
    const balls = normaliseSportmonksBalls(matchIdNorm, `${matchIdNorm}-inn-1`, rows);
    return { ok: true, data: balls, raw: res.body };
  }

  async listPlayers(params?: ListPlayersParams): Promise<AdapterResult<DomainPlayer[]>> {
    if (!this.apiKey) return { ok: false, error: "API key missing" };
    const res = await providerFetch({
      url: this.url("/players"),
      timeoutMs: this.timeoutMs,
      maxRetries: this.maxRetries,
      logLabel: "sportmonks.players",
      fetchImpl: this.fetchImpl,
    });
    if (!res.ok) return { ok: false, error: res.error, raw: res.body };
    const validated = validateSportmonksList(res.body);
    if (!validated.ok || !validated.value) {
      return { ok: false, error: "players validation failed", raw: res.body };
    }
    let players: DomainPlayer[] = validated.value.map((row) => ({
      id: slugId("player", String(row.id ?? row.fullname ?? "x")),
      providerIds: { sportmonks: String(row.id ?? "") },
      name: typeof row.fullname === "string" ? row.fullname : String(row.id ?? "Unknown"),
    }));
    const q = params?.search?.toLowerCase();
    if (q) players = players.filter((p) => p.name.toLowerCase().includes(q));
    return { ok: true, data: players.slice(0, params?.limit ?? 50), raw: res.body };
  }

  async listHistorical(params?: ListFixturesParams): Promise<AdapterResult<DomainFixtureListItem[]>> {
    return this.listFixtures(params);
  }
}
