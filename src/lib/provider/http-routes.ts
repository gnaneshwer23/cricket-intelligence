import { NextResponse } from "next/server";
import { getDataAdapter } from "@/lib/provider";
import { CricApiAdapter } from "@/lib/provider/cricapi-adapter";

export const PROVIDER_SOURCE =
  "CricketData.org (CricAPI) — free tier is delayed; responses are cached and shared to stay within the daily quota.";

/** CricAPI-only routes; truth mode (no key) refuses instead of inventing data. */
export function cricApi(): CricApiAdapter | null {
  const adapter = getDataAdapter();
  return adapter instanceof CricApiAdapter ? adapter : null;
}

export function providerUnavailable() {
  return NextResponse.json(
    {
      ok: false,
      error: "Live provider not configured (set CRICKETOS_DATA_PROVIDER=cricapi and CRICKETOS_DATA_API_KEY).",
      freshness: "UNAVAILABLE",
    },
    { status: 503 },
  );
}

export function providerError(error: string | undefined) {
  const message = error ?? "provider request failed";
  const status = /invalid .* id/.test(message) ? 400 : 502;
  return NextResponse.json({ ok: false, error: message.slice(0, 300) }, { status });
}
