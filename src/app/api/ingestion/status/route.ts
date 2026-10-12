import { NextResponse } from "next/server";
import { getOperatorHealth } from "@/lib/service/match-service";
import { getStorage } from "@/lib/storage";

/** Operator health summary — no secrets, no trigger. */
export async function GET() {
  try {
    const summary = await getOperatorHealth();
    const runs = await getStorage().listIngestionRuns(10);
    return NextResponse.json({
      ok: true,
      summary: {
        demoMode: summary.demoMode,
        dataProvider: summary.dataProvider,
        dataApiKeyConfigured: summary.dataApiKeyConfigured,
        storageBackend: summary.storageBackend,
        storageLabel: summary.storageLabel,
        matchCount: summary.matchCount,
        playerCount: summary.playerCount,
        freshnessCounts: summary.freshnessCounts,
        asOf: summary.asOf,
      },
      recentRuns: runs.map((r) => ({
        id: r.id,
        provider: r.provider,
        operation: r.operation,
        status: r.status,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        fetched: r.fetched,
        upserted: r.upserted,
        skipped: r.skipped,
        errorCount: r.errors.length,
        notes: r.notes,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "status failed" },
      { status: 500 },
    );
  }
}
