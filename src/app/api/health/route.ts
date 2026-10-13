import { NextResponse } from "next/server";
import { getDataAdapter } from "@/lib/provider";
import { getBriefingDataFlags, getDataService } from "@/lib/service/data-service";

export const dynamic = "force-dynamic";

/** Public operator-safe health — no secrets, no API keys. */
export async function GET() {
  try {
    const service = getDataService();
    const summary = await service.health();
    const adapter = getDataAdapter();
    const adapterHealth = await adapter.health();
    const flags = getBriefingDataFlags();
    const primaryFreshness = service.primaryFreshness(
      summary.freshnessCounts,
      summary.demoMode,
    );
    return NextResponse.json({
      ok: true,
      summary: {
        demoMode: summary.demoMode,
        dataProvider: summary.dataProvider,
        dataApiKeyConfigured: summary.dataApiKeyConfigured,
        llmEnabled: summary.llmEnabled,
        storageBackend: summary.storageBackend,
        storageLabel: summary.storageLabel,
        lastIngestion: summary.lastIngestion,
        freshnessCounts: summary.freshnessCounts,
        matchCount: summary.matchCount,
        playerCount: summary.playerCount,
        asOf: summary.asOf,
        briefingLabel: flags.label,
        primaryFreshness,
      },
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
        freshness: "UNAVAILABLE",
      },
      { status: 500 },
    );
  }
}
