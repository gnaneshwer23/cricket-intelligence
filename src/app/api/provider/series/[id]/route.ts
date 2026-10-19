import { connection, NextResponse } from "next/server";
import { cricApi, PROVIDER_SOURCE, providerError, providerUnavailable } from "@/lib/provider/http-routes";

/** Series header + fixtures: GET /api/provider/series/:id */
export async function GET(_request: Request, ctx: RouteContext<"/api/provider/series/[id]">) {
  await connection();
  const api = cricApi();
  if (!api) return providerUnavailable();
  const { id } = await ctx.params;
  const res = await api.getSeriesInfo(id);
  if (!res.ok) return providerError(res.error);
  return NextResponse.json({ ok: true, ...res.data, source: PROVIDER_SOURCE });
}
