/**
 * Server-side tools for the Cricket Intelligence assistant.
 *
 * Every number the assistant says must come from one of these tools, each of
 * which wraps an existing verified path (Cricsheet stats engine, cached live
 * provider, archive search, win-probability model). Outputs are compact so
 * answers stay fast and cheap, and every result carries its source.
 */

import { tool } from "ai";
import { z } from "zod";
import { CricApiAdapter } from "@/lib/provider/cricapi-adapter";
import { getDataAdapter } from "@/lib/provider";
import { getDataService } from "@/lib/service/data-service";
import { searchHistoricalMatchesPaged } from "@/lib/service/historical";
import {
  battingStats,
  bowlingStats,
  getPlayerName,
  matchup,
  searchPlayers,
  STATS_SOURCE,
  type StatsFilter,
} from "@/lib/stats/engine";
import { statsPool } from "@/lib/stats/http";
import { turningPoints, WIN_PROB_MODEL, wormForMatch } from "@/lib/winprob/worm";

const NO_DB = {
  ok: false,
  error: "Historical ball-by-ball stats are not available on this deployment (no database).",
};

const filterSchema = z.object({
  format: z.enum(["test", "odi", "t20", "other"]).optional().describe("Match format"),
  phase: z
    .enum(["powerplay", "middle", "death"])
    .optional()
    .describe("Innings phase; requires format t20 or odi"),
  yearFrom: z.number().int().min(1870).max(2100).optional(),
  yearTo: z.number().int().min(1870).max(2100).optional(),
  competition: z.string().max(80).optional().describe('Series name fragment, e.g. "Indian Premier League"'),
  gender: z.enum(["men", "women"]).optional(),
});

/** Common short names → the series names stored from Cricsheet. */
const COMPETITION_ALIASES: Record<string, string> = {
  ipl: "Indian Premier League",
  wpl: "Women's Premier League",
  bbl: "Big Bash League",
  psl: "Pakistan Super League",
  cpl: "Caribbean Premier League",
};

export function expandCompetition(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const key = raw.trim().toLowerCase();
  return COMPETITION_ALIASES[key] ?? raw.trim();
}

function toFilter(f: z.infer<typeof filterSchema>): StatsFilter {
  return { ...f, competition: expandCompetition(f.competition) };
}

export function assistantTools() {
  return {
    findPlayer: tool({
      description:
        "Find a player's id by name (typo-tolerant). Always call this before player stats or matchups. Historical data is Cricsheet ball-by-ball.",
      inputSchema: z.object({ name: z.string().min(2).max(60) }),
      execute: async ({ name }) => {
        const pool = statsPool();
        if (!pool) return NO_DB;
        const res = await searchPlayers(pool, name, 5);
        return { ok: true, players: res.data, source: res.source };
      },
    }),

    playerStats: tool({
      description:
        "Verified batting and bowling numbers for one player from stored ball-by-ball data, with optional filters (format, phase, years, competition).",
      inputSchema: z.object({ playerId: z.string().max(40), filters: filterSchema.optional() }),
      execute: async ({ playerId, filters }) => {
        const pool = statsPool();
        if (!pool) return NO_DB;
        const filter = toFilter(filters ?? {});
        const name = await getPlayerName(pool, playerId);
        if (!name) return { ok: false, error: "player not found" };
        const [bat, bowl] = await Promise.all([
          battingStats(pool, playerId, filter),
          bowlingStats(pool, playerId, filter),
        ]);
        const b = bat.data;
        const w = bowl.data;
        const battingSummary = b.innings
          ? `${b.innings} innings, ${b.runs} runs off ${b.ballsFaced} balls, ${b.outs} dismissals (${b.notOuts} not out), ` +
            `average ${b.average ?? "n/a"}, strike rate ${b.strikeRate ?? "n/a"}` +
            (b.hundreds != null ? `, ${b.hundreds} hundreds, ${b.fifties} fifties` : "") +
            (b.highest ? `, highest ${b.highest.runs}${b.highest.notOut ? "*" : ""}` : "") +
            `, ${b.fours} fours, ${b.sixes} sixes`
          : "no batting innings in this filter";
        const bowlingSummary = w.innings
          ? `${w.innings} innings, ${w.overs} overs, ${w.wickets} wickets for ${w.runsConceded} runs, ` +
            `economy ${w.economy ?? "n/a"}, average ${w.average ?? "n/a"}` +
            (w.best ? `, best ${w.best.wickets}/${w.best.runs}` : "")
          : "did not bowl in this filter";
        return {
          ok: true,
          player: name,
          filter,
          battingSummary,
          bowlingSummary,
          batting: bat.data,
          battingSample: bat.sample,
          bowling: bowl.data,
          bowlingSample: bowl.sample,
          missing: [...bat.missing, ...bowl.missing],
          source: STATS_SOURCE,
        };
      },
    }),

    matchup: tool({
      description: "Batter vs bowler head-to-head from ball-by-ball data (balls, runs, dismissals, strike rate, by season).",
      inputSchema: z.object({
        batterId: z.string().max(40),
        bowlerId: z.string().max(40),
        filters: filterSchema.optional(),
      }),
      execute: async ({ batterId, bowlerId, filters }) => {
        const pool = statsPool();
        if (!pool) return NO_DB;
        const [batter, bowler] = await Promise.all([getPlayerName(pool, batterId), getPlayerName(pool, bowlerId)]);
        if (!batter || !bowler) return { ok: false, error: "player not found" };
        const res = await matchup(pool, batterId, bowlerId, toFilter(filters ?? {}));
        const d = res.data;
        const summary = d.balls
          ? `${batter} vs ${bowler}: ${d.runs} runs off ${d.balls} balls, ${d.dismissals} dismissals by the bowler, ` +
            `strike rate ${d.strikeRate ?? "n/a"}, average ${d.average ?? "n/a"}, across ${d.matches} matches`
          : `${batter} has not faced ${bowler} in this filter`;
        return { ok: true, summary, ...d, sample: res.sample, source: res.source };
      },
    }),

    liveFixtures: tool({
      description:
        "Current, upcoming and recent fixtures from the live provider (cached; free feed may be delayed). Use for 'what's on now', live scores and schedules.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(15).optional() }),
      execute: async ({ limit }) => {
        const fixtures = await getDataService().listFixtures();
        if (!fixtures.length) {
          return { ok: false, error: "No live provider configured or no fixtures returned right now." };
        }
        return {
          ok: true,
          fixtures: fixtures.slice(0, limit ?? 8).map((f) => ({
            id: f.id,
            title: f.title,
            freshness: f.freshness,
            status: f.note,
            score: f.score,
            series: f.series,
            startTimeIso: f.startTimeIso,
            asOf: f.provenance?.asOf,
          })),
          source: "CricketData.org (CricAPI), cached; LIVE turns STALE when older than ~2 minutes",
        };
      },
    }),

    matchDetail: tool({
      description:
        "Innings scores, toss and series for a live/recent provider match id (ids start with 'cricapi-').",
      inputSchema: z.object({ matchId: z.string().max(80) }),
      execute: async ({ matchId }) => {
        const adapter = getDataAdapter();
        if (!(adapter instanceof CricApiAdapter)) return { ok: false, error: "Live provider not configured." };
        const res = await adapter.getMatchInfo(matchId.replace(/^cricapi-/, ""));
        if (!res.ok || !res.data) return { ok: false, error: res.error };
        const d = res.data;
        return {
          ok: true,
          title: d.match.title,
          status: d.match.note,
          freshness: d.match.freshness,
          innings: d.innings,
          toss: d.tossWinner ? `${d.tossWinner} chose to ${d.tossChoice}` : undefined,
          venue: d.match.venue,
          asOf: d.fetchedAt,
          source: "CricketData.org (CricAPI), cached",
        };
      },
    }),

    searchArchive: tool({
      description:
        "Search stored historical matches (Cricsheet IPL archive + seeds) by team, competition, year, venue or result text. Returns match ids usable with winProbability.",
      inputSchema: z.object({
        team: z.string().max(60).optional(),
        competition: z.string().max(80).optional(),
        venue: z.string().max(60).optional(),
        result: z.string().max(60).optional(),
        title: z.string().max(60).optional().describe('Match title fragment, e.g. "Final", "Qualifier 1", "Match 14"'),
        yearFrom: z.number().int().optional(),
        yearTo: z.number().int().optional(),
        format: z.enum(["test", "odi", "t20", "other"]).optional(),
      }),
      execute: async (q) => {
        const res = await searchHistoricalMatchesPaged({
          teamContains: q.team,
          competitionContains: expandCompetition(q.competition),
          titleContains: q.title,
          venueContains: q.venue,
          resultContains: q.result,
          yearFrom: q.yearFrom,
          yearTo: q.yearTo,
          format: q.format,
          limit: 8,
        });
        return {
          ok: true,
          total: res.total,
          matches: res.matches.map((m) => ({
            id: m.id,
            title: m.title,
            date: m.startTimeIso?.slice(0, 10),
            venue: m.venue,
            result: m.resultText ?? m.note,
            score: m.score,
            source: m.provenance.source,
          })),
        };
      },
    }),

    winProbability: tool({
      description:
        "T20 win-probability story for a stored match id (cs-…): start, end and the biggest swings, from the calibrated v1 model.",
      inputSchema: z.object({ matchId: z.string().max(80) }),
      execute: async ({ matchId }) => {
        const pool = statsPool();
        if (!pool) return NO_DB;
        const meta = await pool.query<{ format: string; series: string | null }>(
          "SELECT format, series FROM matches WHERE id = $1",
          [matchId],
        );
        const row = meta.rows[0];
        if (!row) return { ok: false, error: "match not found" };
        if (row.format !== "t20") return { ok: false, error: "win probability v1 covers T20 only" };
        const worm = await wormForMatch(pool, matchId, row.series);
        if (!worm) return { ok: false, error: "no ball-by-ball data for this match" };
        const first = worm.points[0];
        const chaseStart = worm.points.find((p) => p.innings === 2 && p.event === "start");
        return {
          ok: true,
          match: worm.trajectory.title,
          result: worm.trajectory.resultText,
          battingFirst: worm.trajectory.battingFirst,
          pBattingFirstAtStart: first?.pBattingFirst,
          pBattingFirstAtChaseStart: chaseStart?.pBattingFirst,
          turningPoints: turningPoints(worm.points, 3),
          reliable: worm.reliable,
          caveats: worm.caveats.slice(0, 2),
          model: WIN_PROB_MODEL.version,
        };
      },
    }),

    seriesList: tool({
      description: "Current and upcoming series from the live provider, optionally filtered by name.",
      inputSchema: z.object({ search: z.string().max(60).optional() }),
      execute: async ({ search }) => {
        const adapter = getDataAdapter();
        if (!(adapter instanceof CricApiAdapter)) return { ok: false, error: "Live provider not configured." };
        const res = await adapter.listSeries({ search });
        if (!res.ok) return { ok: false, error: res.error };
        return { ok: true, series: res.data!.slice(0, 10), source: "CricketData.org (CricAPI), cached" };
      },
    }),
  };
}

export const ASSISTANT_INSTRUCTIONS = `You are the Cricket Intelligence assistant: a friendly, sharp cricket analyst.

Rules:
- Every number, score, result or stat you state MUST come from a tool result in this conversation. Never use memory for figures. If the tools don't have it, say so plainly and suggest what you can answer instead.
- For a player, call findPlayer first, then playerStats or matchup with the returned id.
- When a tool returns a summary line (battingSummary, bowlingSummary, summary), quote its numbers exactly — do not recompute or relabel them (innings are not dismissals).
- Historical stats come from Cricsheet ball-by-ball data (currently the IPL archive). Live scores come from a cached, delayed free feed: always say "as of <time>" and mention when data is STALE.
- Mention sample-size warnings when a tool returns one. Never present win probabilities as certainties.
- Never narrate your process ("let me look that up", "I have their IDs"); just give the answer.
- Keep replies short and conversational (2–5 sentences, under 120 words) — they may be read aloud. Use plain numbers, no tables, no markdown headers.
- End with one short source line, e.g. "Source: Cricsheet ball-by-ball." or "Source: CricAPI, as of 12:07 UTC."
- Opinions are fine when clearly labelled as opinion and grounded in the numbers you fetched.`;
