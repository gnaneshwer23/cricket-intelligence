import { NextResponse } from "next/server";
import type { FreshnessStatus } from "@/lib/contracts";
import type { CricketFormat } from "@/lib/domain/models";
import { getDataService } from "@/lib/service/data-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("team") ?? undefined;
    const format = (searchParams.get("format") as CricketFormat | null) ?? undefined;
    const venue = searchParams.get("venue") ?? undefined;
    const series = searchParams.get("series") ?? undefined;
    const freshnessRaw = searchParams.get("freshness");
    const freshness = freshnessRaw
      ? (freshnessRaw.split(",").filter(Boolean) as FreshnessStatus[])
      : undefined;
    const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);

    const service = getDataService();
    const matches = await service.listMatches({
      teamId,
      format: format || undefined,
      venueContains: venue,
      seriesContains: series,
      freshness,
      limit: Number.isFinite(limit) ? limit : 50,
    });

    return NextResponse.json({
      ok: true,
      count: matches.length,
      matches: matches.map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        freshness: m.freshness,
        venue: m.venue,
        series: m.series,
        format: m.format,
        score: m.score,
        statusLine: m.note,
        provenance: m.provenance,
        teams: {
          home: m.teams.home.name,
          away: m.teams.away.name,
        },
        homeName: m.teams.home.name,
        awayName: m.teams.away.name,
        homeShort: m.teams.home.shortName,
        awayShort: m.teams.away.shortName,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "matches failed",
        freshness: "UNAVAILABLE",
      },
      { status: 500 },
    );
  }
}
