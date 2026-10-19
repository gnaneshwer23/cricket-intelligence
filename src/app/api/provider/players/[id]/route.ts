import { connection, NextResponse } from "next/server";
import { cricApi, PROVIDER_SOURCE, providerError, providerUnavailable } from "@/lib/provider/http-routes";

/** Player profile + career stats by format: GET /api/provider/players/:id */
export async function GET(_request: Request, ctx: RouteContext<"/api/provider/players/[id]">) {
  await connection();
  const api = cricApi();
  if (!api) return providerUnavailable();
  const { id } = await ctx.params;
  const res = await api.getPlayerInfo(id);
  if (!res.ok) return providerError(res.error);
  return NextResponse.json({ ok: true, player: res.data, source: PROVIDER_SOURCE });
}
