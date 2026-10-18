/**
 * Historical intelligence over normalised stored matches (+ demo board).
 * Never fabricates second innings, wagon wheels, or missing fields.
 */

import { sampleSizeWarning } from "@/lib/calc";
import {
  ARCHIVE_POLICY,
  deriveCoverage,
  type CoverageLevel,
  type CoverageMeta,
} from "@/lib/coverage";
import type {
  DomainMatch,
  DomainScorecard,
  HistoricalMatchFilter,
  HistoricalSearchResult,
  PlayerTrend,
} from "@/lib/domain/models";
import { getDemoMatch, getDemoScorecard } from "@/lib/provider/demo-adapter";
import { getStorage } from "@/lib/storage";

const COVERAGE_RANK: Record<CoverageLevel, number> = {
  result: 1,
  scorecard: 2,
  innings: 3,
  ball_by_ball: 4,
};

async function allMatches(): Promise<DomainMatch[]> {
  const stored = await getStorage().listMatches();
  const demo = getDemoMatch();
  if (!stored.length) return [demo];
  if (!stored.some((m) => m.id === demo.id)) return [demo, ...stored];
  return stored;
}

async function matchById(id: string): Promise<DomainMatch | null> {
  const stored = await getStorage().getMatch(id);
  if (stored) return stored;
  const demo = getDemoMatch();
  return id === demo.id ? demo : null;
}

async function scorecardFor(matchId: string): Promise<DomainScorecard | null> {
  const storage = getStorage();
  let card = await storage.getScorecard(matchId);
  if (!card && matchId === getDemoMatch().id) card = getDemoScorecard();
  return card;
}

function countCardRows(card: DomainScorecard | null): {
  battingRowCount: number;
  bowlingRowCount: number;
} {
  if (!card) return { battingRowCount: 0, bowlingRowCount: 0 };
  const battingRowCount = Object.values(card.batting).reduce(
    (n, rows) => n + (Array.isArray(rows) ? rows.length : 0),
    0,
  );
  const bowlingRowCount = Object.values(card.bowling).reduce(
    (n, rows) => n + (Array.isArray(rows) ? rows.length : 0),
    0,
  );
  return { battingRowCount, bowlingRowCount };
}

export async function attachCoverage(match: DomainMatch): Promise<DomainMatch> {
  if (match.coverage) return match;
  const card = await scorecardFor(match.id);
  const { battingRowCount, bowlingRowCount } = countCardRows(card);
  const isDemo = match.freshness === "DEMO" || match.status === "DEMO";
  const coverage = deriveCoverage({
    status: match.status,
    note: match.note ?? match.resultText,
    score: match.score,
    startTimeIso: match.startTimeIso,
    title: match.title,
    series: match.series,
    homeName: match.teams.home.name,
    awayName: match.teams.away.name,
    battingRowCount,
    bowlingRowCount,
    ballCount: isDemo ? 1 : 0,
    isDemo,
  });
  return {
    ...match,
    coverage,
    resultText: match.resultText ?? match.note,
  };
}

function yearOf(match: DomainMatch, coverage?: CoverageMeta): number | undefined {
  return coverage?.year ?? (match.startTimeIso ? Number.parseInt(match.startTimeIso.slice(0, 4), 10) : undefined);
}

async function cardMentionsPlayer(matchId: string, needle: string): Promise<boolean> {
  const card = await scorecardFor(matchId);
  if (!card) return false;
  const n = needle.toLowerCase();
  for (const rows of Object.values(card.batting)) {
    if (rows?.some((r) => r.playerName.toLowerCase().includes(n))) return true;
  }
  for (const rows of Object.values(card.bowling)) {
    if (rows?.some((r) => r.playerName.toLowerCase().includes(n))) return true;
  }
  return false;
}

/**
 * Filter + paginate historical matches with honest coverage metadata.
 */
export async function searchHistoricalMatchesPaged(
  filter: HistoricalMatchFilter = {},
): Promise<HistoricalSearchResult> {
  const storage = getStorage();
  if (storage.searchMatches) {
    const pageSize = Math.min(Math.max(filter.limit ?? 20, 1), 100);
    const page = Math.max(filter.page ?? 0, 0);
    const found = await storage.searchMatches({ ...filter, page, limit: pageSize });
    return {
      matches: await Promise.all(found.matches.map((m) => attachCoverage(m))),
      total: found.total,
      page,
      pageSize,
      hasMore: (page + 1) * pageSize < found.total,
      archiveClaim: ARCHIVE_POLICY.claim,
      measuredYearMin: found.yearMin,
      measuredYearMax: found.yearMax,
    };
  }

  let list = await Promise.all((await allMatches()).map((m) => attachCoverage(m)));

  const teamNeedle = (filter.teamContains ?? filter.teamId ?? "").toLowerCase();
  if (teamNeedle) {
    list = list.filter(
      (m) =>
        m.teams.home.id.includes(teamNeedle) ||
        m.teams.away.id.includes(teamNeedle) ||
        m.teams.home.name.toLowerCase().includes(teamNeedle) ||
        m.teams.away.name.toLowerCase().includes(teamNeedle) ||
        m.teams.home.shortName.toLowerCase().includes(teamNeedle) ||
        m.teams.away.shortName.toLowerCase().includes(teamNeedle),
    );
  }
  if (filter.format) list = list.filter((m) => m.format === filter.format);
  if (filter.venueContains) {
    const v = filter.venueContains.toLowerCase();
    list = list.filter((m) => m.venue.toLowerCase().includes(v));
  }
  const seriesNeedle = (filter.competitionContains ?? filter.seriesContains ?? "").toLowerCase();
  if (seriesNeedle) {
    list = list.filter((m) => (m.series ?? "").toLowerCase().includes(seriesNeedle));
  }
  if (filter.resultContains) {
    const r = filter.resultContains.toLowerCase();
    list = list.filter((m) =>
      `${m.note ?? ""} ${m.resultText ?? ""}`.toLowerCase().includes(r),
    );
  }
  if (filter.gender && filter.gender !== "unknown") {
    list = list.filter((m) => m.coverage?.gender === filter.gender);
  }
  if (filter.yearFrom != null) {
    list = list.filter((m) => {
      const y = yearOf(m, m.coverage);
      return y != null && y >= filter.yearFrom!;
    });
  }
  if (filter.yearTo != null) {
    list = list.filter((m) => {
      const y = yearOf(m, m.coverage);
      return y != null && y <= filter.yearTo!;
    });
  }
  if (filter.fromIso) {
    list = list.filter((m) => (m.startTimeIso ?? "") >= filter.fromIso!);
  }
  if (filter.toIso) {
    list = list.filter((m) => (m.startTimeIso ?? "") <= filter.toIso!);
  }
  if (filter.freshness?.length) {
    list = list.filter((m) => filter.freshness!.includes(m.freshness));
  }
  if (filter.coverageLevel) {
    list = list.filter((m) => m.coverage?.level === filter.coverageLevel);
  }
  if (filter.coverageAtLeast) {
    const min = COVERAGE_RANK[filter.coverageAtLeast];
    list = list.filter((m) => COVERAGE_RANK[m.coverage?.level ?? "result"] >= min);
  }
  if (filter.playerContains?.trim()) {
    const needle = filter.playerContains.trim();
    const kept: DomainMatch[] = [];
    for (const m of list) {
      // Title/series mention is not player evidence — only scorecard rows.
      if (await cardMentionsPlayer(m.id, needle)) kept.push(m);
    }
    list = kept;
  }

  // Sort newest first when dates exist
  list = [...list].sort((a, b) => (b.startTimeIso ?? "").localeCompare(a.startTimeIso ?? ""));

  const years = list
    .map((m) => yearOf(m, m.coverage))
    .filter((y): y is number => typeof y === "number");
  const measuredYearMin = years.length ? Math.min(...years) : undefined;
  const measuredYearMax = years.length ? Math.max(...years) : undefined;

  const pageSize = Math.min(Math.max(filter.limit ?? 20, 1), 100);
  const page = Math.max(filter.page ?? 0, 0);
  const total = list.length;
  const start = page * pageSize;
  const matches = list.slice(start, start + pageSize);

  return {
    matches,
    total,
    page,
    pageSize,
    hasMore: start + pageSize < total,
    archiveClaim: ARCHIVE_POLICY.claim,
    measuredYearMin,
    measuredYearMax,
  };
}

export async function searchHistoricalMatches(
  filter: HistoricalMatchFilter = {},
): Promise<DomainMatch[]> {
  const page = await searchHistoricalMatchesPaged(filter);
  return page.matches;
}

export type MatchComparison = {
  left: DomainMatch;
  right: DomainMatch;
  notes: string[];
  /** Only fields present on both */
  comparable: {
    formatSame: boolean;
    venueSame: boolean;
    scoreLeft?: string;
    scoreRight?: string;
  };
};

export async function compareMatches(
  leftId: string,
  rightId: string,
): Promise<MatchComparison | null> {
  const [left, right] = await Promise.all([matchById(leftId), matchById(rightId)]);
  if (!left || !right) return null;

  const notes: string[] = [];
  if (left.freshness === "DEMO" || right.freshness === "DEMO") {
    notes.push("At least one side is DEMO — not an official record comparison.");
  }
  if (!left.score) notes.push(`No score on ${left.title} — empty state, not fabricated.`);
  if (!right.score) notes.push(`No score on ${right.title} — empty state, not fabricated.`);

  return {
    left,
    right,
    notes,
    comparable: {
      formatSame: left.format === right.format,
      venueSame: left.venue === right.venue,
      scoreLeft: left.score
        ? `${left.score.runs}/${left.score.wickets} (${left.score.overs})`
        : undefined,
      scoreRight: right.score
        ? `${right.score.runs}/${right.score.wickets} (${right.score.overs})`
        : undefined,
    },
  };
}

/**
 * Player batting trend from stored scorecards only.
 * Sample-size warning when n is small; never invents missing innings.
 */
export async function playerBattingTrend(playerId: string): Promise<PlayerTrend | null> {
  const storage = getStorage();
  const matches = storage.matchIdsForPlayer
    ? (
        await Promise.all((await storage.matchIdsForPlayer(playerId)).map((id) => matchById(id)))
      ).filter((m): m is DomainMatch => Boolean(m))
    : await allMatches();
  const points: PlayerTrend["points"] = [];
  let playerName = playerId;

  for (const match of matches) {
    let card = await storage.getScorecard(match.id);
    if (!card && match.id === getDemoMatch().id) card = getDemoScorecard();
    if (!card) continue;
    for (const innId of Object.keys(card.batting)) {
      const row = card.batting[innId]?.find((r) => r.playerId === playerId);
      if (!row) continue;
      playerName = row.playerName;
      points.push({
        matchId: match.id,
        matchTitle: match.title,
        runs: row.runs,
        balls: row.balls,
        asOf: match.updatedAt,
        kind: match.provenance.kind,
      });
    }
  }

  if (!points.length) return null;

  const warning = sampleSizeWarning(points.length) ?? undefined;
  return {
    playerId,
    playerName,
    sampleSize: points.length,
    points,
    warning,
  };
}

/** Explorer integration: list innings-capable matches (have scorecard or demo series). */
export async function matchesWithExplorerData(): Promise<
  { match: DomainMatch; hasOverSeries: boolean; hasScorecard: boolean; emptyReason?: string }[]
> {
  const matches = await allMatches();
  const storage = getStorage();
  const demoId = getDemoMatch().id;
  const out = [];
  for (const match of matches) {
    const card = await storage.getScorecard(match.id);
    const hasScorecard = Boolean(card?.innings.length) || match.id === demoId;
    const hasOverSeries = match.id === demoId; // only demo has authored over series today
    out.push({
      match,
      hasOverSeries,
      hasScorecard,
      emptyReason: hasOverSeries
        ? undefined
        : "No ball/over series for this match — Explorer charts unavailable (not fabricated).",
    });
  }
  return out;
}
