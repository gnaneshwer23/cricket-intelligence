import { connection, NextResponse } from "next/server";
import { getPlayerName, matchup } from "@/lib/stats/engine";
import { parseStatsFilter, statsError, statsPool, statsUnavailable } from "@/lib/stats/http";

/** Batter vs bowler: GET /api/stats/matchup?batter=<id>&bowler=<id>&format=t20 */
export async function GET(request: Request) {
  await connection();
  const pool = statsPool();
  if (!pool) return statsUnavailable();
  try {
    const params = new URL(request.url).searchParams;
    const batter = params.get("batter");
    const bowler = params.get("bowler");
    if (!batter || !bowler) {
      return NextResponse.json({ ok: false, error: "batter and bowler ids are required" }, { status: 400 });
    }
    const [batterName, bowlerName] = await Promise.all([getPlayerName(pool, batter), getPlayerName(pool, bowler)]);
    if (!batterName || !bowlerName) {
      return NextResponse.json({ ok: false, error: "player not found" }, { status: 404 });
    }
    const result = await matchup(pool, batter, bowler, parseStatsFilter(params));
    return NextResponse.json({
      ok: true,
      batter: { id: batter, name: batterName },
      bowler: { id: bowler, name: bowlerName },
      ...result,
    });
  } catch (err) {
    return statsError(err);
  }
}
