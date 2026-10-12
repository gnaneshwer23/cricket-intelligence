import { NextResponse } from "next/server";
import { getDataAdapter } from "@/lib/provider";
import { getOperatorHealth } from "@/lib/service/match-service";

/** Public operator-safe health — no secrets, no API keys. */
export async function GET() {
  try {
    const summary = await getOperatorHealth();
    const adapter = getDataAdapter();
    const adapterHealth = await adapter.health();
    return NextResponse.json({
      ok: true,
      summary,
      adapter: {
        provider: adapterHealth.provider,
        ok: adapterHealth.ok,
        message: adapterHealth.message,
        checkedAt: adapterHealth.checkedAt,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "health failed",
      },
      { status: 500 },
    );
  }
}
