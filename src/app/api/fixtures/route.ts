import { NextResponse } from "next/server";
import { getDataService } from "@/lib/service/data-service";

export const dynamic = "force-dynamic";

/** Fixture list from normalised storage (+ provider when configured). Never invents LIVE. */
export async function GET() {
  try {
    const service = getDataService();
    await service.ensureReady();
    const fixtures = await service.listFixtures();
    return NextResponse.json({
      ok: true,
      count: fixtures.length,
      fixtures: fixtures.map((f) => ({
        id: f.id,
        title: f.title,
        status: f.status,
        freshness: f.freshness,
        venue: f.venue,
        series: f.series,
        format: f.format,
        startTimeIso: f.startTimeIso,
        homeName: f.homeName,
        awayName: f.awayName,
        provenance: f.provenance,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "fixtures failed",
        freshness: "UNAVAILABLE",
      },
      { status: 500 },
    );
  }
}
