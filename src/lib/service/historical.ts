/**
 * Historical intelligence over normalised stored matches (+ demo board).
 * Never fabricates second innings, wagon wheels, or missing fields.
 */

import { sampleSizeWarning } from "@/lib/calc";
import type {
  DomainMatch,
  HistoricalMatchFilter,
  PlayerTrend,
} from "@/lib/domain/models";
import { getDemoMatch, getDemoScorecard } from "@/lib/provider/demo-adapter";
import { getStorage } from "@/lib/storage";

async function allMatches(): Promise<DomainMatch[]> {
  const stored = await getStorage().listMatches();
  const demo = getDemoMatch();
  if (!stored.length) return [demo];
  if (!stored.some((m) => m.id === demo.id)) return [demo, ...stored];
  return stored;
}

export async function searchHistoricalMatches(
  filter: HistoricalMatchFilter = {},
): Promise<DomainMatch[]> {
  let list = await allMatches();

  if (filter.teamId) {
    const t = filter.teamId.toLowerCase();
    list = list.filter(
      (m) =>
        m.teams.home.id.includes(t) ||
        m.teams.away.id.includes(t) ||
        m.teams.home.name.toLowerCase().includes(t) ||
        m.teams.away.name.toLowerCase().includes(t),
    );
  }
  if (filter.format) list = list.filter((m) => m.format === filter.format);
  if (filter.venueContains) {
    const v = filter.venueContains.toLowerCase();
    list = list.filter((m) => m.venue.toLowerCase().includes(v));
  }
  if (filter.seriesContains) {
    const s = filter.seriesContains.toLowerCase();
    list = list.filter((m) => (m.series ?? "").toLowerCase().includes(s));
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

  const limit = filter.limit ?? 50;
  return list.slice(0, limit);
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
  const list = await allMatches();
  const left = list.find((m) => m.id === leftId);
  const right = list.find((m) => m.id === rightId);
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
  const matches = await allMatches();
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
