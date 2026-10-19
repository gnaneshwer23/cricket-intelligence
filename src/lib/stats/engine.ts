/**
 * Verified stats engine over stored deliveries (Postgres only).
 *
 * Every figure is computed by SQL over ball-level rows and returned with the
 * exact query, parameters and row counts as evidence, so an answer can always
 * be traced and re-run. Thin samples carry a warning; missing inputs are
 * reported, never filled in.
 */

import type { Pool } from "pg";
import { sampleSizeWarning } from "@/lib/calc";
import type { CricketFormat, GenderFilter } from "@/lib/domain/models";
import { escapeLike } from "@/lib/storage/postgres";

export type Phase = "powerplay" | "middle" | "death";

export type StatsFilter = {
  format?: CricketFormat;
  phase?: Phase;
  yearFrom?: number;
  yearTo?: number;
  competition?: string;
  gender?: GenderFilter;
};

export type Evidence = {
  label: string;
  sql: string;
  params: unknown[];
  rowCount: number;
};

export type Verified<T> = {
  data: T;
  filter: StatsFilter;
  sample: { n: number; unit: string; warning?: string };
  /** Inputs the engine could not use — surfaced for review, never imputed. */
  missing: string[];
  evidence: Evidence[];
  source: string;
};

export const STATS_SOURCE = "Cricsheet ball-by-ball (cricsheet.org, ODC-By 1.0) via Cricket Intelligence";

/** Dismissal kinds credited to the bowler. */
export const BOWLER_WICKET_KINDS = [
  "bowled",
  "caught",
  "caught and bowled",
  "lbw",
  "stumped",
  "hit wicket",
];
/** Dismissal kinds that do not end an innings as "out". */
export const NOT_OUT_KINDS = ["retired hurt", "retired not out"];

/** 0-based over ranges per limited-overs format. */
export const PHASE_OVERS: Record<"t20" | "odi", Record<Phase, [number, number]>> = {
  t20: { powerplay: [0, 5], middle: [6, 14], death: [15, 19] },
  odi: { powerplay: [0, 9], middle: [10, 39], death: [40, 49] },
};

export class StatsInputError extends Error {}

type Sql = { clauses: string[]; params: unknown[] };

function p(q: Sql, value: unknown): string {
  q.params.push(value);
  return `$${q.params.length}`;
}

/** WHERE fragments shared by every stats query (alias b = balls, m = matches). */
export function buildStatsWhere(filter: StatsFilter, q: Sql): void {
  q.clauses.push("NOT b.is_super_over");
  if (filter.format) q.clauses.push(`m.format = ${p(q, filter.format)}`);
  if (filter.gender && filter.gender !== "unknown") q.clauses.push(`m.gender = ${p(q, filter.gender)}`);
  if (filter.yearFrom != null) q.clauses.push(`EXTRACT(YEAR FROM m.start_time) >= ${p(q, filter.yearFrom)}`);
  if (filter.yearTo != null) q.clauses.push(`EXTRACT(YEAR FROM m.start_time) <= ${p(q, filter.yearTo)}`);
  if (filter.competition?.trim()) {
    q.clauses.push(`m.series ILIKE ${p(q, `%${escapeLike(filter.competition.trim())}%`)}`);
  }
  if (filter.phase) {
    if (filter.format !== "t20" && filter.format !== "odi") {
      throw new StatsInputError("phase needs format=t20 or format=odi");
    }
    const [from, to] = PHASE_OVERS[filter.format][filter.phase];
    q.clauses.push(`b.over_number BETWEEN ${p(q, from)} AND ${p(q, to)}`);
  }
}

function compact(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

async function run<T extends Record<string, unknown>>(
  pool: Pool,
  label: string,
  sql: string,
  params: unknown[],
  evidence: Evidence[],
): Promise<T[]> {
  const res = await pool.query<T>(sql, params);
  evidence.push({ label, sql: compact(sql), params, rowCount: res.rowCount ?? res.rows.length });
  return res.rows;
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const ratio = (a: number, b: number, scale = 1, dp = 2): number | null =>
  b > 0 ? Number(((a * scale) / b).toFixed(dp)) : null;
const oversFromBalls = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

// ── Player search ───────────────────────────────────────────────────────────

export type PlayerHit = { id: string; name: string; matches: number; score: number };

/**
 * Typo-tolerant player search over Cricsheet names and register aliases:
 * trigram similarity, surname edit distance and a phonetic (double metaphone)
 * surname bonus. Multi-word queries must agree on the first initial.
 */
export async function searchPlayers(pool: Pool, query: string, limit = 10): Promise<Verified<PlayerHit[]>> {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (q.length < 2) throw new StatsInputError("query must be at least 2 characters");
  const evidence: Evidence[] = [];
  const sql = `
    WITH q AS (
      SELECT $1::text AS full_q,
             regexp_replace($1::text, '^.*\\s', '') AS last_q,
             CASE WHEN position(' ' IN $1::text) > 0 THEN left($1::text, 1) END AS initial_q
    ),
    cands AS (
      SELECT p.id, p.name, lower(p.name) AS cand FROM players p
      UNION ALL
      SELECT p.id, p.name, lower(a.alias) FROM player_aliases a JOIN players p ON p.id = a.player_id
    ),
    scored AS (
      SELECT c.id, c.name,
             (GREATEST(
                word_similarity(q.full_q, c.cand),
                similarity(q.full_q, c.cand),
                1 - levenshtein(q.last_q, regexp_replace(c.cand, '^.*\\s', ''))::float
                    / GREATEST(length(q.last_q), length(regexp_replace(c.cand, '^.*\\s', '')), 1)
              )
              + CASE WHEN dmetaphone(q.last_q) <> ''
                      AND dmetaphone(q.last_q) = dmetaphone(regexp_replace(c.cand, '^.*\\s', ''))
                     THEN 0.25 ELSE 0 END)
             * CASE WHEN q.initial_q IS NULL OR left(c.cand, 1) = q.initial_q THEN 1 ELSE 0.6 END AS score
        FROM cands c CROSS JOIN q
    ),
    best AS (SELECT id, name, MAX(score) AS score FROM scored GROUP BY id, name)
    SELECT b.id, b.name, b.score, COUNT(mp.match_id) AS matches
      FROM best b LEFT JOIN match_players mp ON mp.player_id = b.id
     WHERE b.score >= 0.5
     GROUP BY b.id, b.name, b.score
     ORDER BY b.score DESC, matches DESC, b.name
     LIMIT $2`;
  const rows = await run<{ id: string; name: string; score: number; matches: string }>(
    pool,
    "player search",
    sql,
    [q, Math.min(Math.max(limit, 1), 50)],
    evidence,
  );
  return {
    data: rows.map((r) => ({ id: r.id, name: r.name, matches: num(r.matches), score: Number(Number(r.score).toFixed(3)) })),
    filter: {},
    sample: { n: rows.length, unit: "players" },
    missing: [],
    evidence,
    source: STATS_SOURCE,
  };
}

export async function getPlayerName(pool: Pool, id: string): Promise<string | null> {
  const res = await pool.query<{ name: string }>("SELECT name FROM players WHERE id = $1", [id]);
  return res.rows[0]?.name ?? null;
}

// ── Batting ─────────────────────────────────────────────────────────────────

export type BattingStats = {
  innings: number;
  runs: number;
  ballsFaced: number;
  outs: number;
  notOuts: number;
  average: number | null;
  strikeRate: number | null;
  fours: number;
  sixes: number;
  dotPct: number | null;
  /** Null under a phase filter — milestones are whole-innings concepts. */
  fifties: number | null;
  hundreds: number | null;
  highest: { runs: number; notOut: boolean; matchId: string } | null;
};

export async function battingStats(pool: Pool, playerId: string, filter: StatsFilter): Promise<Verified<BattingStats>> {
  const q: Sql = { clauses: [], params: [] };
  const pid = p(q, playerId);
  q.clauses.push(`(b.batter_id = ${pid} OR b.non_striker_id = ${pid} OR b.player_out_id = ${pid})`);
  buildStatsWhere(filter, q);
  const notOutKinds = p(q, NOT_OUT_KINDS);
  const sql = `
    SELECT b.match_id, b.innings_id,
           COALESCE(SUM(b.runs_batter) FILTER (WHERE b.batter_id = ${pid}), 0) AS runs,
           COUNT(*) FILTER (WHERE b.batter_id = ${pid} AND NOT b.is_wide) AS balls,
           COUNT(*) FILTER (WHERE b.batter_id = ${pid} AND NOT b.is_wide AND b.runs_batter = 0) AS dots,
           COUNT(*) FILTER (WHERE b.batter_id = ${pid} AND (b.payload->>'isFour')::boolean) AS fours,
           COUNT(*) FILTER (WHERE b.batter_id = ${pid} AND (b.payload->>'isSix')::boolean) AS sixes,
           BOOL_OR(b.player_out_id = ${pid} AND NOT (b.wicket_kind = ANY(${notOutKinds}::text[]))) AS out
      FROM balls b JOIN matches m ON m.id = b.match_id
     WHERE ${q.clauses.join(" AND ")}
     GROUP BY b.match_id, b.innings_id`;
  const evidence: Evidence[] = [];
  const rows = await run<{
    match_id: string;
    runs: string;
    balls: string;
    dots: string;
    fours: string;
    sixes: string;
    out: boolean;
  }>(pool, "batting innings", sql, q.params, evidence);

  let runs = 0, ballsFaced = 0, dots = 0, fours = 0, sixes = 0, outs = 0, fifties = 0, hundreds = 0;
  let highest: BattingStats["highest"] = null;
  for (const r of rows) {
    const inRuns = num(r.runs);
    runs += inRuns;
    ballsFaced += num(r.balls);
    dots += num(r.dots);
    fours += num(r.fours);
    sixes += num(r.sixes);
    if (r.out) outs += 1;
    if (inRuns >= 100) hundreds += 1;
    else if (inRuns >= 50) fifties += 1;
    const notOut = !r.out;
    if (!highest || inRuns > highest.runs || (inRuns === highest.runs && notOut && !highest.notOut)) {
      highest = { runs: inRuns, notOut, matchId: r.match_id };
    }
  }
  const innings = rows.length;
  return {
    data: {
      innings,
      runs,
      ballsFaced,
      outs,
      notOuts: innings - outs,
      average: ratio(runs, outs),
      strikeRate: ratio(runs, ballsFaced, 100),
      fours,
      sixes,
      dotPct: ratio(dots, ballsFaced, 100, 1),
      fifties: filter.phase ? null : fifties,
      hundreds: filter.phase ? null : hundreds,
      highest: filter.phase ? null : highest,
    },
    filter,
    sample: { n: innings, unit: "innings", warning: sampleSizeWarning(innings) ?? undefined },
    missing: [],
    evidence,
    source: STATS_SOURCE,
  };
}

// ── Bowling ─────────────────────────────────────────────────────────────────

export type BowlingStats = {
  innings: number;
  legalBalls: number;
  overs: string;
  runsConceded: number;
  wickets: number;
  economy: number | null;
  average: number | null;
  strikeRate: number | null;
  dotPct: number | null;
  wides: number;
  noBalls: number;
  best: { wickets: number; runs: number; matchId: string } | null;
};

export async function bowlingStats(pool: Pool, playerId: string, filter: StatsFilter): Promise<Verified<BowlingStats>> {
  const q: Sql = { clauses: [], params: [] };
  const pid = p(q, playerId);
  q.clauses.push(`b.bowler_id = ${pid}`);
  buildStatsWhere(filter, q);
  const credited = p(q, BOWLER_WICKET_KINDS);
  const sql = `
    SELECT b.match_id, b.innings_id,
           COUNT(*) FILTER (WHERE NOT b.is_wide AND NOT b.is_no_ball) AS legal,
           SUM(b.bowler_runs) AS runs,
           COUNT(*) FILTER (WHERE b.bowler_runs IS NULL) AS missing_runs,
           COUNT(*) FILTER (WHERE b.wicket_kind = ANY(${credited}::text[])) AS wickets,
           COUNT(*) FILTER (WHERE NOT b.is_wide AND NOT b.is_no_ball AND b.bowler_runs = 0) AS dots,
           COUNT(*) FILTER (WHERE b.is_wide) AS wides,
           COUNT(*) FILTER (WHERE b.is_no_ball) AS no_balls
      FROM balls b JOIN matches m ON m.id = b.match_id
     WHERE ${q.clauses.join(" AND ")}
     GROUP BY b.match_id, b.innings_id`;
  const evidence: Evidence[] = [];
  const rows = await run<{
    match_id: string;
    legal: string;
    runs: string | null;
    missing_runs: string;
    wickets: string;
    dots: string;
    wides: string;
    no_balls: string;
  }>(pool, "bowling innings", sql, q.params, evidence);

  let legalBalls = 0, runsConceded = 0, wickets = 0, dots = 0, wides = 0, noBalls = 0, missingRuns = 0;
  let best: BowlingStats["best"] = null;
  for (const r of rows) {
    const w = num(r.wickets);
    const rc = num(r.runs);
    legalBalls += num(r.legal);
    runsConceded += rc;
    wickets += w;
    dots += num(r.dots);
    wides += num(r.wides);
    noBalls += num(r.no_balls);
    missingRuns += num(r.missing_runs);
    if (!best || w > best.wickets || (w === best.wickets && rc < best.runs)) {
      best = { wickets: w, runs: rc, matchId: r.match_id };
    }
  }
  const innings = rows.length;
  const missing = missingRuns
    ? [`${missingRuns} deliveries lack bowler-charged runs (re-ingest with --force); runs/economy/average exclude them`]
    : [];
  return {
    data: {
      innings,
      legalBalls,
      overs: oversFromBalls(legalBalls),
      runsConceded,
      wickets,
      economy: ratio(runsConceded, legalBalls, 6),
      average: ratio(runsConceded, wickets),
      strikeRate: ratio(legalBalls, wickets, 1, 1),
      dotPct: ratio(dots, legalBalls, 100, 1),
      wides,
      noBalls,
      best,
    },
    filter,
    sample: { n: innings, unit: "innings", warning: sampleSizeWarning(innings) ?? undefined },
    missing,
    evidence,
    source: STATS_SOURCE,
  };
}

// ── Matchup ─────────────────────────────────────────────────────────────────

export type MatchupStats = {
  balls: number;
  runs: number;
  dismissals: number;
  strikeRate: number | null;
  average: number | null;
  dotPct: number | null;
  fours: number;
  sixes: number;
  matches: number;
  bySeason: { year: number; balls: number; runs: number; dismissals: number }[];
};

/** Batter vs bowler. Dismissals count only kinds credited to the bowler. */
export async function matchup(
  pool: Pool,
  batterId: string,
  bowlerId: string,
  filter: StatsFilter,
): Promise<Verified<MatchupStats>> {
  const q: Sql = { clauses: [], params: [] };
  const bat = p(q, batterId);
  const bowl = p(q, bowlerId);
  q.clauses.push(`b.batter_id = ${bat}`, `b.bowler_id = ${bowl}`);
  buildStatsWhere(filter, q);
  const credited = p(q, BOWLER_WICKET_KINDS);
  const sql = `
    SELECT EXTRACT(YEAR FROM m.start_time)::int AS year,
           COUNT(DISTINCT b.match_id) AS matches,
           COUNT(*) FILTER (WHERE NOT b.is_wide) AS balls,
           COALESCE(SUM(b.runs_batter), 0) AS runs,
           COUNT(*) FILTER (WHERE b.player_out_id = ${bat} AND b.wicket_kind = ANY(${credited}::text[])) AS dismissals,
           COUNT(*) FILTER (WHERE NOT b.is_wide AND b.runs_batter = 0) AS dots,
           COUNT(*) FILTER (WHERE (b.payload->>'isFour')::boolean) AS fours,
           COUNT(*) FILTER (WHERE (b.payload->>'isSix')::boolean) AS sixes
      FROM balls b JOIN matches m ON m.id = b.match_id
     WHERE ${q.clauses.join(" AND ")}
     GROUP BY 1 ORDER BY 1`;
  const evidence: Evidence[] = [];
  const rows = await run<{
    year: number;
    matches: string;
    balls: string;
    runs: string;
    dismissals: string;
    dots: string;
    fours: string;
    sixes: string;
  }>(pool, "matchup by season", sql, q.params, evidence);

  const t = { balls: 0, runs: 0, dismissals: 0, dots: 0, fours: 0, sixes: 0, matches: 0 };
  for (const r of rows) {
    t.balls += num(r.balls);
    t.runs += num(r.runs);
    t.dismissals += num(r.dismissals);
    t.dots += num(r.dots);
    t.fours += num(r.fours);
    t.sixes += num(r.sixes);
    t.matches += num(r.matches);
  }
  return {
    data: {
      balls: t.balls,
      runs: t.runs,
      dismissals: t.dismissals,
      strikeRate: ratio(t.runs, t.balls, 100),
      average: ratio(t.runs, t.dismissals),
      dotPct: ratio(t.dots, t.balls, 100, 1),
      fours: t.fours,
      sixes: t.sixes,
      matches: t.matches,
      bySeason: rows.map((r) => ({
        year: r.year,
        balls: num(r.balls),
        runs: num(r.runs),
        dismissals: num(r.dismissals),
      })),
    },
    filter,
    // Balls, not matches, are the unit that matters for a matchup.
    sample: { n: t.balls, unit: "balls", warning: sampleSizeWarning(t.balls, 30) ?? undefined },
    missing: [],
    evidence,
    source: STATS_SOURCE,
  };
}
