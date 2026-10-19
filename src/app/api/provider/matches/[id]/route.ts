import { connection, NextResponse } from "next/server";
import { cricApi, PROVIDER_SOURCE, providerError, providerUnavailable } from "@/lib/provider/http-routes";

/** Match detail (score by innings, toss, series): GET /api/provider/matches/:id */
export async function GET(_request: Request, ctx: RouteContext<"/api/provider/matches/[id]">) {
  await connection();
  const api = cricApi();
  if (!api) return providerUnavailable();
  const { id } = await ctx.params;
  const res = await api.getMatchInfo(id.replace(/^cricapi-/, ""));
  if (!res.ok) return providerError(res.error);
  return NextResponse.json({ ok: true, ...res.data, source: PROVIDER_SOURCE });
}
