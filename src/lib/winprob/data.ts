/**
 * Ball-by-ball match trajectories from stored deliveries — the single source
 * of states for both training and serving win probability.
 */

import type { Pool } from "pg";
import { escapeLike } from "@/lib/storage/postgres";
import { T20_BALLS, type MatchState } from "@/lib/winprob/model";

export type TrajectoryBall = {
  ballId: string;
  innings: 1 | 2;
  overNumber: number;
  ballInOver: number;
  battingTeam: string;
  runsTotal: number;
  isWicket: boolean;
  isFour: boolean;
  isSix: boolean;
  /** State after this delivery. */
  state: MatchState;
};

export type TrajectoryFlags = {
  /** Revised target (D/L, DLS, VJD) — chase state uses the unrevised target. */
  revisedTarget: boolean;
  tied: boolean;
  noResult: boolean;
  /** First innings ended short of 20 overs without being bowled out (reduced overs). */
  shortened: boolean;
  /** No second innings recorded. */
  noChase: boolean;
};

export type MatchTrajectory = {
  matchId: string;
  year: number;
  title: string;
  battingFirst: string;
  chasing: string;
  target: number | null;
  winner: string | null;
  resultText: string | null;
  flags: TrajectoryFlags;
  balls: TrajectoryBall[];
};

export type TrajectoryQuery = {
  matchIds?: string[];
  competition?: string;
  yearFrom?: number;
  yearTo?: number;
};

export const TRAJECTORY_SQL_BASE = `
  WITH d AS (
    SELECT b.match_id, b.id AS ball_id, b.innings_number, b.over_number, b.ball_in_over,
           b.batting_team, b.runs_total, b.is_wicket,
           (NOT b.is_wide AND NOT b.is_no_ball) AS legal,
           COALESCE((b.payload->>'isFour')::boolean, false) AS is_four,
           COALESCE((b.payload->>'isSix')::boolean, false) AS is_six,
           m.title, m.result_text, EXTRACT(YEAR FROM m.start_time)::int AS year
      FROM balls b JOIN matches m ON m.id = b.match_id
     WHERE m.format = 't20' AND NOT b.is_super_over AND b.innings_number IN (1, 2)
       AND /*FILTERS*/ TRUE
  )
  SELECT d.*,
         SUM(runs_total) OVER w AS cum_runs,
         COUNT(*) FILTER (WHERE is_wicket) OVER w AS cum_wkts,
         COUNT(*) FILTER (WHERE legal) OVER w AS cum_legal
    FROM d
  WINDOW w AS (PARTITION BY match_id, innings_number ORDER BY over_number, ball_in_over
               ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
   ORDER BY match_id, innings_number, over_number, ball_in_over`;

export function buildTrajectorySql(q: TrajectoryQuery): { sql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const add = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (q.matchIds?.length) clauses.push(`m.id = ANY(${add(q.matchIds)}::text[])`);
  if (q.competition) clauses.push(`m.series ILIKE ${add(`%${escapeLike(q.competition)}%`)}`);
  if (q.yearFrom != null) clauses.push(`EXTRACT(YEAR FROM m.start_time) >= ${add(q.yearFrom)}`);
  if (q.yearTo != null) clauses.push(`EXTRACT(YEAR FROM m.start_time) <= ${add(q.yearTo)}`);
  const filters = clauses.length ? `${clauses.join(" AND ")} AND` : "";
  return { sql: TRAJECTORY_SQL_BASE.replace("/*FILTERS*/", filters), params };
}

type Row = {
  match_id: string;
  ball_id: string;
  innings_number: number;
  over_number: number;
  ball_in_over: number;
  batting_team: string;
  runs_total: number;
  is_wicket: boolean;
  is_four: boolean;
  is_six: boolean;
  title: string;
  result_text: string | null;
  year: number;
  cum_runs: string;
  cum_wkts: string;
  cum_legal: string;
};

export function winnerFromResult(resultText: string | null): string | null {
  // Ties name the eliminator winner in brackets — not a match winner for the model.
  if (!resultText || /^(match tied|no result|match drawn)/i.test(resultText)) return null;
  const m = resultText.match(/^(.+?) won\b/);
  return m ? m[1]!.trim() : null;
}

/** Group window-function rows into per-match trajectories. Exported for tests. */
export function rowsToTrajectories(rows: Row[]): MatchTrajectory[] {
  const byMatch = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byMatch.get(r.match_id) ?? [];
    list.push(r);
    byMatch.set(r.match_id, list);
  }
  const out: MatchTrajectory[] = [];
  for (const [matchId, list] of byMatch) {
    const inn1 = list.filter((r) => r.innings_number === 1);
    const inn2 = list.filter((r) => r.innings_number === 2);
    if (!inn1.length) continue;
    const first = inn1[0]!;
    const last1 = inn1[inn1.length - 1]!;
    const battingFirst = first.batting_team;
    const chasing = inn2[0]?.batting_team ?? null;
    const target = Number(last1.cum_runs) + 1;
    const resultText = first.result_text;
    const flags: TrajectoryFlags = {
      revisedTarget: /\((D\/L|DLS|VJD)\)/.test(resultText ?? ""),
      tied: /tied/i.test(resultText ?? ""),
      noResult: /no result/i.test(resultText ?? ""),
      shortened: Number(last1.cum_legal) < T20_BALLS && Number(last1.cum_wkts) < 10,
      noChase: !inn2.length,
    };
    const balls: TrajectoryBall[] = list.map((r) => {
      const runs = Number(r.cum_runs);
      const wickets = Number(r.cum_wkts);
      const legalBalls = Number(r.cum_legal);
      const state: MatchState =
        r.innings_number === 1
          ? { innings: 1, runs, wickets, legalBalls, year: r.year }
          : { innings: 2, target, runs, wickets, legalBalls, year: r.year };
      return {
        ballId: r.ball_id,
        innings: r.innings_number as 1 | 2,
        overNumber: r.over_number,
        ballInOver: r.ball_in_over,
        battingTeam: r.batting_team,
        runsTotal: r.runs_total,
        isWicket: r.is_wicket,
        isFour: r.is_four,
        isSix: r.is_six,
        state,
      };
    });
    out.push({
      matchId,
      year: first.year,
      title: first.title,
      battingFirst,
      chasing: chasing ?? "",
      target: inn2.length ? target : null,
      winner: winnerFromResult(resultText),
      resultText,
      flags,
      balls,
    });
  }
  return out;
}

export async function loadTrajectories(
  pool: Pool,
  q: TrajectoryQuery,
): Promise<{ trajectories: MatchTrajectory[]; sql: string; params: unknown[]; rowCount: number }> {
  const { sql, params } = buildTrajectorySql(q);
  const res = await pool.query<Row>(sql, params);
  return {
    trajectories: rowsToTrajectories(res.rows),
    sql: sql.replace(/\s+/g, " ").trim(),
    params,
    rowCount: res.rowCount ?? res.rows.length,
  };
}

/** Matches clean enough to train or evaluate on. */
export function isModelable(t: MatchTrajectory): boolean {
  const f = t.flags;
  return Boolean(t.winner) && !f.revisedTarget && !f.tied && !f.noResult && !f.shortened && !f.noChase;
}
