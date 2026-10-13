import { NextResponse } from "next/server";
import { ARCHIVE_POLICY, type CoverageLevel, type GenderFilter } from "@/lib/coverage";
import type { FreshnessStatus } from "@/lib/contracts";
import type { CricketFormat } from "@/lib/domain/models";
import { getDataService } from "@/lib/service/data-service";
import { searchHistoricalMatchesPaged } from "@/lib/service/historical";

function mapMatch(m: Awaited<ReturnType<typeof searchHistoricalMatchesPaged>>["matches"][number]) {
  return {
    id: m.id,
    title: m.title,
    status: m.status,
    freshness: m.freshness,
    venue: m.venue,
    series: m.series,
    format: m.format,
    startTimeIso: m.startTimeIso,
    score: m.score,
    statusLine: m.note ?? m.resultText,
    resultText: m.resultText ?? m.note,
    coverage: m.coverage,
    provenance: m.provenance,
    teams: {
      home: m.teams.home.name,
      away: m.teams.away.name,
    },
    homeName: m.teams.home.name,
    awayName: m.teams.away.name,
    homeShort: m.teams.home.shortName,
    awayShort: m.teams.away.shortName,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const team =
      searchParams.get("team") ?? searchParams.get("teamContains") ?? undefined;
    const format = (searchParams.get("format") as CricketFormat | null) ?? undefined;
    const venue = searchParams.get("venue") ?? undefined;
    const series =
      searchParams.get("series") ?? searchParams.get("competition") ?? undefined;
    const player = searchParams.get("player") ?? undefined;
    const result = searchParams.get("result") ?? undefined;
    const gender = (searchParams.get("gender") as GenderFilter | null) ?? undefined;
    const coverageLevel =
      (searchParams.get("coverage") as CoverageLevel | null) ?? undefined;
    const coverageAtLeast =
      (searchParams.get("coverageAtLeast") as CoverageLevel | null) ?? undefined;
    const yearFromRaw = searchParams.get("yearFrom");
    const yearToRaw = searchParams.get("yearTo");
    const yearFrom = yearFromRaw ? Number.parseInt(yearFromRaw, 10) : undefined;
    const yearTo = yearToRaw ? Number.parseInt(yearToRaw, 10) : undefined;
    const freshnessRaw = searchParams.get("freshness");
    const freshness = freshnessRaw
      ? (freshnessRaw.split(",").filter(Boolean) as FreshnessStatus[])
      : undefined;
    const page = Number.parseInt(searchParams.get("page") ?? "0", 10);
    const limit = Number.parseInt(searchParams.get("limit") ?? "20", 10);

    const service = getDataService();
    await service.ensureReady();

    const paged = await searchHistoricalMatchesPaged({
      teamContains: team,
      format: format || undefined,
      venueContains: venue ?? undefined,
      competitionContains: series ?? undefined,
      playerContains: player ?? undefined,
      resultContains: result ?? undefined,
      gender: gender || undefined,
      coverageLevel: coverageLevel || undefined,
      coverageAtLeast: coverageAtLeast || undefined,
      yearFrom: Number.isFinite(yearFrom) ? yearFrom : undefined,
      yearTo: Number.isFinite(yearTo) ? yearTo : undefined,
      freshness,
      page: Number.isFinite(page) ? page : 0,
      limit: Number.isFinite(limit) ? limit : 20,
    });

    return NextResponse.json({
      ok: true,
      count: paged.matches.length,
      total: paged.total,
      page: paged.page,
      pageSize: paged.pageSize,
      hasMore: paged.hasMore,
      archive: {
        claim: paged.archiveClaim,
        filterYearMin: ARCHIVE_POLICY.filterYearMin,
        filterYearMax: ARCHIVE_POLICY.filterYearMax,
        measuredYearMin: paged.measuredYearMin ?? ARCHIVE_POLICY.measuredSeedEarliest,
        measuredYearMax: paged.measuredYearMax ?? ARCHIVE_POLICY.measuredSeedLatest,
        blockers: [
          "Player filter only matches scorecard batting/bowling rows — seed cards often have empty player arrays.",
          "Ball-by-ball coverage requires DEMO playground or a licensed provider with balls.",
          "Full 1973–present archive is not claimed without provider ingest.",
        ],
      },
      matches: paged.matches.map(mapMatch),
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
