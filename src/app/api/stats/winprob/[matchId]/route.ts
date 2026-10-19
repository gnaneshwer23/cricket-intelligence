import { connection, NextResponse } from "next/server";
import { statsError, statsPool, statsUnavailable } from "@/lib/stats/http";
import { turningPoints, WIN_PROB_MODEL, wormForMatch } from "@/lib/winprob/worm";

/**
 * Per-ball win probability worm for a stored T20 match.
 * GET /api/stats/winprob/:matchId — p = P(team batting first wins).
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/stats/winprob/[matchId]">) {
  await connection();
  const pool = statsPool();
  if (!pool) return statsUnavailable();
  try {
    const { matchId } = await ctx.params;
    const match = await pool.query<{ format: string; series: string | null }>(
      "SELECT format, series FROM matches WHERE id = $1",
      [matchId],
    );
    const row = match.rows[0];
    if (!row) return NextResponse.json({ ok: false, error: "match not found" }, { status: 404 });
    if (row.format !== "t20") {
      return NextResponse.json(
        { ok: false, error: `win probability v1 covers T20 only (this match is ${row.format})` },
        { status: 400 },
      );
    }
    const worm = await wormForMatch(pool, matchId, row.series);
    if (!worm) {
      return NextResponse.json(
        { ok: false, error: "no ball-by-ball deliveries stored for this match" },
        { status: 404 },
      );
    }
    const metrics = WIN_PROB_MODEL.metrics as {
      holdoutChase: Record<string, { brier: number }>;
      holdoutFirstInnings: Record<string, { brier: number }>;
    };
    return NextResponse.json({
      ok: true,
      match: worm.trajectory,
      model: {
        version: WIN_PROB_MODEL.version,
        kind: "logistic regression per innings (chase state / first-innings state + season par)",
        trainedOn: WIN_PROB_MODEL.trainedOn,
        holdout: WIN_PROB_MODEL.holdout,
        holdoutBrier: {
          firstInnings: metrics.holdoutFirstInnings["v1 model"]?.brier,
          chase: metrics.holdoutChase["v1 model"]?.brier,
        },
        docs: "docs/WIN_PROBABILITY.md",
      },
      probability: "pBattingFirst = P(team batting first wins); 1 − pBattingFirst for the chasing team",
      reliable: worm.reliable,
      caveats: worm.caveats,
      cached: worm.cached,
      worm: worm.points,
      turningPoints: turningPoints(worm.points),
      evidence: worm.evidence,
      source: "Cricsheet ball-by-ball (cricsheet.org, ODC-By 1.0) via Cricket Intelligence",
    });
  } catch (err) {
    return statsError(err);
  }
}
