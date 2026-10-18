/**
 * Per-ball win-probability worm for a stored T20 match, cached in
 * `win_probability` per model version.
 */

import type { Pool } from "pg";
import type { Evidence } from "@/lib/stats/engine";
import { loadTrajectories, type MatchTrajectory } from "@/lib/winprob/data";
import modelJson from "@/lib/winprob/model-v1.json";
import { probabilityBattingFirstWins, type MatchState, type WinProbModel } from "@/lib/winprob/model";

export const WIN_PROB_MODEL = modelJson as WinProbModel;

export type WormPoint = {
  seq: number;
  innings: 1 | 2;
  /** Overs bowled after this delivery, cricket notation ("12.3"). */
  overs: string;
  battingTeam: string;
  runs: number;
  wickets: number;
  /** "W", "4", "6" or null; "start" for an innings start. */
  event: string | null;
  ballId: string | null;
  pBattingFirst: number;
};

export type TurningPoint = {
  seq: number;
  innings: 1 | 2;
  overs: string;
  event: string | null;
  battingTeam: string;
  from: number;
  to: number;
  /** Change in P(batting first wins), percentage points. */
  deltaPts: number;
};

const r4 = (x: number) => Number(x.toFixed(4));
const oversLabel = (legal: number) => `${Math.floor(legal / 6)}.${legal % 6}`;

export function computeWorm(model: WinProbModel, t: MatchTrajectory): WormPoint[] {
  const points: WormPoint[] = [];
  const push = (p: Omit<WormPoint, "seq">) => points.push({ seq: points.length, ...p });
  const start1: MatchState = { innings: 1, runs: 0, wickets: 0, legalBalls: 0, year: t.year };
  push({
    innings: 1, overs: "0.0", battingTeam: t.battingFirst, runs: 0, wickets: 0, event: "start", ballId: null,
    pBattingFirst: r4(probabilityBattingFirstWins(model, start1)),
  });
  let chaseStarted = false;
  for (const b of t.balls) {
    if (b.innings === 2 && !chaseStarted && t.target != null) {
      chaseStarted = true;
      const start2: MatchState = { innings: 2, target: t.target, runs: 0, wickets: 0, legalBalls: 0, year: t.year };
      push({
        innings: 2, overs: "0.0", battingTeam: t.chasing, runs: 0, wickets: 0, event: "start", ballId: null,
        pBattingFirst: r4(probabilityBattingFirstWins(model, start2)),
      });
    }
    push({
      innings: b.innings,
      overs: oversLabel(b.state.legalBalls),
      battingTeam: b.battingTeam,
      runs: b.state.runs,
      wickets: b.state.wickets,
      event: b.isWicket ? "W" : b.isSix ? "6" : b.isFour ? "4" : null,
      ballId: b.ballId,
      pBattingFirst: r4(probabilityBattingFirstWins(model, b.state)),
    });
  }
  return points;
}

/** Largest single-delivery swings (the innings-break jump between models is excluded). */
export function turningPoints(points: WormPoint[], limit = 5): TurningPoint[] {
  const swings: TurningPoint[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const cur = points[i]!;
    if (cur.event === "start") continue;
    const prev = points[i - 1]!;
    const delta = (cur.pBattingFirst - prev.pBattingFirst) * 100;
    swings.push({
      seq: cur.seq,
      innings: cur.innings,
      overs: cur.overs,
      event: cur.event,
      battingTeam: cur.battingTeam,
      from: prev.pBattingFirst,
      to: cur.pBattingFirst,
      deltaPts: Number(delta.toFixed(1)),
    });
  }
  return swings.sort((a, b) => Math.abs(b.deltaPts) - Math.abs(a.deltaPts)).slice(0, limit);
}

export function caveatsFor(t: MatchTrajectory, series: string | null): { reliable: boolean; caveats: string[] } {
  const caveats: string[] = [];
  if (t.flags.revisedTarget) caveats.push("Revised target (D/L) — the chase uses the unrevised target, so second-innings WP is not reliable.");
  if (t.flags.shortened) caveats.push("Reduced-overs match — the model assumes 20 overs per side.");
  if (t.flags.noResult) caveats.push("No result.");
  if (t.flags.tied) caveats.push("Tied match — decided by a super over, which the model does not cover.");
  if (!/Indian Premier League/i.test(series ?? "")) {
    caveats.push("Model trained on IPL only — treat other T20 competitions as indicative.");
  }
  caveats.push(
    "v1 under-predicts chasing teams in 2025–26 (see docs/WIN_PROBABILITY.md) — mid-range chase probabilities run low.",
  );
  const reliable = !t.flags.revisedTarget && !t.flags.shortened && !t.flags.noResult;
  return { reliable, caveats };
}

export type WormResult = {
  trajectory: Pick<MatchTrajectory, "matchId" | "title" | "battingFirst" | "chasing" | "target" | "winner" | "resultText">;
  points: WormPoint[];
  reliable: boolean;
  caveats: string[];
  cached: boolean;
  evidence: Evidence[];
};

type CacheRow = {
  seq: number;
  ball_id: string | null;
  innings_number: number;
  overs_label: string;
  batting_team: string;
  runs: number;
  wickets: number;
  event: string | null;
  p_batting_first: number;
};

const CACHE_SELECT = `SELECT seq, ball_id, innings_number, overs_label, batting_team, runs, wickets, event, p_batting_first
  FROM win_probability WHERE match_id = $1 AND model_version = $2 ORDER BY seq`;

export async function storeWorm(pool: Pool, matchId: string, version: string, points: WormPoint[]): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM win_probability WHERE match_id = $1 AND model_version = $2", [matchId, version]);
    await client.query(
      `INSERT INTO win_probability (match_id, model_version, seq, ball_id, innings_number, overs_label,
         batting_team, runs, wickets, event, p_batting_first)
       SELECT $1::text, $2::text, * FROM UNNEST($3::int[], $4::text[], $5::int[], $6::text[], $7::text[],
         $8::int[], $9::int[], $10::text[], $11::float8[])`,
      [
        matchId,
        version,
        points.map((p) => p.seq),
        points.map((p) => p.ballId),
        points.map((p) => p.innings),
        points.map((p) => p.overs),
        points.map((p) => p.battingTeam),
        points.map((p) => p.runs),
        points.map((p) => p.wickets),
        points.map((p) => p.event),
        points.map((p) => p.pBattingFirst),
      ],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Worm for one match: compute from deliveries (always, for flags/caveats —
 * a single match is cheap), and persist it the first time per model version.
 */
export async function wormForMatch(
  pool: Pool,
  matchId: string,
  series: string | null,
  model: WinProbModel = WIN_PROB_MODEL,
): Promise<WormResult | null> {
  const loaded = await loadTrajectories(pool, { matchIds: [matchId] });
  const t = loaded.trajectories[0];
  if (!t) return null;
  const evidence: Evidence[] = [
    { label: "deliveries → match states", sql: loaded.sql, params: loaded.params, rowCount: loaded.rowCount },
  ];

  const cached = await pool.query<CacheRow>(CACHE_SELECT, [matchId, model.version]);
  let points: WormPoint[];
  let fromCache = false;
  if (cached.rows.length) {
    fromCache = true;
    evidence.push({ label: "stored win probability", sql: CACHE_SELECT.replace(/\s+/g, " "), params: [matchId, model.version], rowCount: cached.rows.length });
    points = cached.rows.map((r) => ({
      seq: r.seq,
      innings: r.innings_number as 1 | 2,
      overs: r.overs_label,
      battingTeam: r.batting_team,
      runs: r.runs,
      wickets: r.wickets,
      event: r.event,
      ballId: r.ball_id,
      pBattingFirst: Number(r.p_batting_first),
    }));
  } else {
    points = computeWorm(model, t);
    await storeWorm(pool, matchId, model.version, points);
  }

  const { reliable, caveats } = caveatsFor(t, series);
  return {
    trajectory: {
      matchId: t.matchId,
      title: t.title,
      battingFirst: t.battingFirst,
      chasing: t.chasing,
      target: t.target,
      winner: t.winner,
      resultText: t.resultText,
    },
    points,
    reliable,
    caveats,
    cached: fromCache,
    evidence,
  };
}
