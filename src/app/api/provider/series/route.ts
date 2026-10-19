import { connection, NextResponse } from "next/server";
import { cricApi, PROVIDER_SOURCE, providerError, providerUnavailable } from "@/lib/provider/http-routes";

/** Current and upcoming series: GET /api/provider/series?search=&offset=0 */
export async function GET(request: Request) {
  await connection();
  const api = cricApi();
  if (!api) return providerUnavailable();
  const params = new URL(request.url).searchParams;
  const offset = Number.parseInt(params.get("offset") ?? "0", 10);
  const res = await api.listSeries({
    offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
    search: params.get("search")?.slice(0, 80) ?? undefined,
  });
  if (!res.ok) return providerError(res.error);
  return NextResponse.json({ ok: true, count: res.data!.length, series: res.data, source: PROVIDER_SOURCE });
}
