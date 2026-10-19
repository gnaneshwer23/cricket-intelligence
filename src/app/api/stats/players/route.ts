import { connection, NextResponse } from "next/server";
import { searchPlayers } from "@/lib/stats/engine";
import { statsError, statsPool, statsUnavailable } from "@/lib/stats/http";

/** Typo-tolerant player search: GET /api/stats/players?q=kholi */
export async function GET(request: Request) {
  await connection();
  const pool = statsPool();
  if (!pool) return statsUnavailable();
  try {
    const params = new URL(request.url).searchParams;
    const limit = Number.parseInt(params.get("limit") ?? "10", 10);
    const result = await searchPlayers(pool, params.get("q") ?? "", Number.isFinite(limit) ? limit : 10);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return statsError(err);
  }
}
