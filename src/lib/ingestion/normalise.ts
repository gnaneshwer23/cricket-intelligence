/**
 * Map provider payloads → domain models + stable CricketOS IDs.
 */

import type { FreshnessStatus, MatchLifecycle, Provenance } from "@/lib/contracts";
import type {
  CricketFormat,
  DomainBall,
  DomainFixtureListItem,
  DomainMatch,
  DomainPlayer,
  DomainScore,
  DomainScorecard,
  DomainTeam,
} from "@/lib/domain/models";
import { ballsToOvers, oversToBalls } from "@/lib/calc";
import { isRecordExport } from "@/lib/ingestion/validate";
import { teamAbbr } from "@/lib/team-abbr";

export function slugId(prefix: string, raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return `${prefix}-${cleaned || "unknown"}`;
}

export function mapFormat(raw: string | undefined): CricketFormat {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("test")) return "test";
  if (s.includes("odi") || s === "list a") return "odi";
  if (s.includes("t20") || s.includes("twenty20")) return "t20";
  return "other";
}

export function mapLifecycle(
  statusRaw: string | undefined,
  opts?: { demo?: boolean; liveFlag?: boolean },
): MatchLifecycle {
  if (opts?.demo) return "DEMO";
  const s = (statusRaw ?? "").toLowerCase().trim();
  if (opts?.liveFlag || s.includes("live") || s.includes("in progress")) return "LIVE";
  // Completed checks BEFORE short tokens — "finished" contains "ns" as a substring.
  if (
    s.includes("complete") ||
    s.includes("finished") ||
    s.includes("result") ||
    /\bwon\b/.test(s) ||
    s.includes("draw")
  ) {
    return "COMPLETED";
  }
  // Sportmonks uses status code "NS" (not started) — match as a word, not substring.
  if (
    s.includes("upcoming") ||
    s.includes("not started") ||
    s.includes("scheduled") ||
    /\bns\b/.test(s) ||
    s === "ns"
  ) {
    return "UPCOMING";
  }
  return "UPCOMING";
}

export function lifecycleToFreshness(
  lifecycle: MatchLifecycle,
  opts?: { stale?: boolean; unavailable?: boolean },
): FreshnessStatus {
  if (opts?.unavailable) return "UNAVAILABLE";
  if (lifecycle === "DEMO") return "DEMO";
  if (lifecycle === "UPCOMING") return "UPCOMING";
  if (lifecycle === "COMPLETED") return "HISTORICAL";
  if (lifecycle === "LIVE") return opts?.stale ? "STALE" : "LIVE";
  return "UNAVAILABLE";
}

export function parseScore(raw: unknown): DomainScore | undefined {
  if (!isRecordExport(raw)) return undefined;
  const runs = typeof raw.runs === "number" ? raw.runs : typeof raw.r === "number" ? raw.r : null;
  const wickets =
    typeof raw.wickets === "number" ? raw.wickets : typeof raw.w === "number" ? raw.w : null;
  const oversVal = raw.overs ?? raw.o;
  if (runs === null || wickets === null) return undefined;
  let overs = "0.0";
  if (typeof oversVal === "string") overs = oversVal;
  else if (typeof oversVal === "number") {
    // Sportmonks/CricAPI may send decimal overs — convert carefully via balls when possible
    overs = ballsToOvers(oversToBalls(oversVal));
  }
  return { runs, wickets, overs, balls: oversToBalls(overs) };
}

export function teamFromNames(
  homeName: string,
  awayName: string,
  provider: string,
): { home: DomainTeam; away: DomainTeam } {
  return {
    home: {
      id: slugId("team", homeName),
      providerIds: { [provider]: homeName },
      name: homeName,
      shortName: teamAbbr(homeName),
    },
    away: {
      id: slugId("team", awayName),
      providerIds: { [provider]: awayName },
      name: awayName,
      shortName: teamAbbr(awayName),
    },
  };
}

export function provenanceFor(
  provider: string,
  kind: Provenance["kind"],
  entityId?: string,
  note?: string,
): Provenance {
  return {
    kind,
    source: provider === "demo" ? "Bundled CricketOS demo dataset" : `${provider} adapter`,
    asOf: new Date().toISOString(),
    note,
    provider,
    providerEntityId: entityId,
  };
}

/** Normalise a CricAPI match row */
export type CricApiNormaliseOptions = {
  /** When the provider response was fetched (cache-aware); defaults to now. */
  fetchedAtIso?: string;
  /** LIVE rows older than this become STALE. */
  staleAfterMs?: number;
  nowMs?: number;
};

/**
 * CricAPI lifecycle: its in-progress status text reads like "India need 45
 * runs", so trust matchStarted / matchEnded when present, text otherwise.
 */
export function cricApiLifecycle(row: Record<string, unknown>): MatchLifecycle {
  const status = typeof row.status === "string" ? row.status : undefined;
  if (typeof row.matchStarted === "boolean" || typeof row.matchEnded === "boolean") {
    if (row.matchEnded === true) return "COMPLETED";
    if (row.matchStarted === true) return "LIVE";
    return "UPCOMING";
  }
  return mapLifecycle(status);
}

export function normaliseCricApiMatch(row: Record<string, unknown>, opts: CricApiNormaliseOptions = {}): DomainMatch {
  const idRaw = String(row.id);
  const teams = Array.isArray(row.teams) ? row.teams.map(String) : [];
  const homeName = teams[0] ?? "Team A";
  const awayName = teams[1] ?? "Team B";
  const lifecycle = cricApiLifecycle(row);
  const fetchedAt = opts.fetchedAtIso ?? new Date(opts.nowMs ?? Date.now()).toISOString();
  const ageMs = (opts.nowMs ?? Date.now()) - Date.parse(fetchedAt);
  const stale = opts.staleAfterMs != null && ageMs > opts.staleAfterMs;
  const scoreArr = Array.isArray(row.score) ? row.score : [];
  const lastScore = scoreArr.length ? scoreArr[scoreArr.length - 1] : undefined;
  const score = parseScore(lastScore);

  return {
    id: slugId("cricapi", idRaw),
    providerIds: {
      cricapi: idRaw,
      ...(typeof row.series_id === "string" ? { cricapiSeries: row.series_id } : {}),
    },
    status: lifecycle,
    freshness: lifecycleToFreshness(lifecycle, { stale }),
    title: typeof row.name === "string" ? row.name : `${homeName} vs ${awayName}`,
    venue: typeof row.venue === "string" ? row.venue : "Unknown venue",
    // currentMatches carries only series_id; the adapter fills `series` from the cached series list.
    series: typeof row.series === "string" && row.series.trim() ? row.series.trim() : undefined,
    format: mapFormat(typeof row.matchType === "string" ? row.matchType : undefined),
    startTimeIso: typeof row.dateTimeGMT === "string" ? row.dateTimeGMT : undefined,
    teams: teamFromNames(homeName, awayName, "cricapi"),
    score,
    note: typeof row.status === "string" ? row.status : undefined,
    provenance: {
      ...provenanceFor("cricapi", lifecycle === "COMPLETED" ? "historical" : "fact", idRaw),
      asOf: fetchedAt,
      note: "CricketData.org (CricAPI) — free tier is delayed; cached and shared to stay within the daily quota.",
    },
    updatedAt: fetchedAt,
  };
}

export function toFixtureItem(match: DomainMatch): DomainFixtureListItem {
  return {
    id: match.id,
    title: match.title,
    status: match.status,
    freshness: match.freshness,
    venue: match.venue,
    series: match.series,
    format: match.format,
    startTimeIso: match.startTimeIso,
    provenance: match.provenance,
    updatedAt: match.updatedAt,
    note: match.note,
    score: match.score,
    homeName: match.teams.home.name,
    awayName: match.teams.away.name,
    homeShort: match.teams.home.shortName,
    awayShort: match.teams.away.shortName,
  };
}

/** Normalise Sportmonks fixture row */
export function normaliseSportmonksFixture(row: Record<string, unknown>): DomainMatch {
  const idRaw = String(row.id ?? "");
  const local = isRecordExport(row.localteam) ? row.localteam : null;
  const visitor = isRecordExport(row.visitorteam) ? row.visitorteam : null;
  const homeName = local && typeof local.name === "string" ? local.name : "Home";
  const awayName = visitor && typeof visitor.name === "string" ? visitor.name : "Away";
  const liveFlag = row.live === 1 || row.live === true;
  const lifecycle = mapLifecycle(typeof row.status === "string" ? row.status : undefined, {
    liveFlag,
  });

  let score: DomainScore | undefined;
  const scoreboards = Array.isArray(row.scoreboards) ? row.scoreboards : [];
  if (scoreboards.length) {
    const last = scoreboards[scoreboards.length - 1];
    if (isRecordExport(last)) {
      score = parseScore({
        runs: last.total ?? last.score,
        wickets: last.wickets,
        overs: last.overs,
      });
    }
  }

  return {
    id: slugId("sportmonks", idRaw),
    providerIds: { sportmonks: idRaw },
    status: lifecycle,
    freshness: lifecycleToFreshness(lifecycle),
    title: `${homeName} vs ${awayName}`,
    venue: typeof row.venue_id === "number" ? `venue:${row.venue_id}` : "Unknown venue",
    series: typeof row.round === "string" ? row.round : undefined,
    format: mapFormat(typeof row.type === "string" ? row.type : undefined),
    startTimeIso: typeof row.starting_at === "string" ? row.starting_at : undefined,
    teams: teamFromNames(homeName, awayName, "sportmonks"),
    score,
    note: typeof row.note === "string" ? row.note : undefined,
    provenance: provenanceFor(
      "sportmonks",
      lifecycle === "COMPLETED" ? "historical" : "fact",
      idRaw,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function normaliseSportmonksBalls(
  matchId: string,
  inningsId: string,
  rows: Record<string, unknown>[],
): DomainBall[] {
  return rows.map((row, idx) => {
    const score = typeof row.score === "number" ? row.score : 0;
    const extra = typeof row.extra_runs === "number" ? row.extra_runs : 0;
    const ballId = String(row.id ?? `${matchId}-ball-${idx}`);
    return {
      id: slugId("ball", ballId),
      matchId,
      inningsId,
      overNumber: typeof row.overs === "number" ? Math.floor(row.overs) : 0,
      ballInOver: typeof row.ball === "number" ? row.ball : idx % 6,
      batsmanId: row.batsman_id != null ? String(row.batsman_id) : undefined,
      bowlerId: row.bowler_id != null ? String(row.bowler_id) : undefined,
      runsOffBat: Math.max(0, score - extra),
      extras: extra,
      totalRuns: score,
      isWicket: Boolean(row.is_wicket || row.out),
      isFour: score === 4,
      isSix: score === 6,
      commentary: typeof row.scoreboard === "string" ? row.scoreboard : undefined,
    };
  });
}

export function emptyScorecard(matchId: string): DomainScorecard {
  return { matchId, innings: [], batting: {}, bowling: {} };
}

export function normaliseCricApiPlayer(row: Record<string, unknown>): DomainPlayer {
  const idRaw = String(row.id ?? row.name ?? "unknown");
  return {
    id: slugId("player", idRaw),
    providerIds: { cricapi: idRaw },
    name: typeof row.name === "string" ? row.name : idRaw,
    role: typeof row.role === "string" ? row.role : undefined,
  };
}
