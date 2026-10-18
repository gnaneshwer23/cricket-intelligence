import { connection, NextResponse } from "next/server";
import { battingStats, bowlingStats, getPlayerName } from "@/lib/stats/engine";
import { parseStatsFilter, statsError, statsPool, statsUnavailable } from "@/lib/stats/http";

/**
 * Player batting + bowling with SQL evidence.
 * GET /api/stats/players/:id?format=t20&phase=death&yearFrom=2020&competition=Indian%20Premier%20League
 */
export async function GET(request: Request, ctx: RouteContext<"/api/stats/players/[id]">) {
  await connection();
  const pool = statsPool();
  if (!pool) return statsUnavailable();
  try {
    const { id } = await ctx.params;
    const filter = parseStatsFilter(new URL(request.url).searchParams);
    const name = await getPlayerName(pool, id);
    if (!name) return NextResponse.json({ ok: false, error: "player not found" }, { status: 404 });
    const [batting, bowling] = await Promise.all([
      battingStats(pool, id, filter),
      bowlingStats(pool, id, filter),
    ]);
    return NextResponse.json({ ok: true, player: { id, name }, batting, bowling });
  } catch (err) {
    return statsError(err);
  }
}
