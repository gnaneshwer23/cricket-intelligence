import { NextResponse } from "next/server";
import { playerBattingTrend } from "@/lib/service/historical";
import { getDataService } from "@/lib/service/data-service";
import { getStorage } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { searchParams } = new URL(request.url);
    const compareId = searchParams.get("compare");
    const trendPlayer = searchParams.get("trendPlayer");
    const service = getDataService();
    await service.ensureReady();

    if (compareId) {
      const cmp = await service.compare(id, compareId);
      if (!cmp) {
        return NextResponse.json({ ok: false, error: "one or both matches missing" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, comparison: cmp });
    }

    if (trendPlayer) {
      const trend = await playerBattingTrend(trendPlayer);
      return NextResponse.json({
        ok: true,
        trend: trend ?? {
          playerId: trendPlayer,
          sampleSize: 0,
          points: [],
          warning: "No scorecard rows for this player in stored matches — empty state.",
        },
      });
    }

    const match = await service.getMatch(id);
    if (!match) {
      return NextResponse.json({ ok: false, error: "match not found" }, { status: 404 });
    }
    const scorecard = await service.getScorecard(id);
    const balls = await getStorage().getBalls(id);

    return NextResponse.json({
      ok: true,
      match,
      scorecard: scorecard ?? null,
      ballCount: balls.length,
      /** Honest empty: no wagon wheel / second innings fabrication */
      missing: {
        secondInnings: !scorecard?.innings.some((i) => i.inningsNumber >= 2),
        ballByBall: balls.length === 0,
        wagonWheel: true,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "match detail failed" },
      { status: 500 },
    );
  }
}
