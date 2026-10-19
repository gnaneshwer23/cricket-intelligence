import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ingestFixtures } from "@/lib/ingestion/runner";
import { getDataAdapter } from "@/lib/provider";
import { getIngestionToken } from "@/lib/provider/config";
import { getStorage } from "@/lib/storage";

/**
 * Protected ingestion trigger — requires CRICKETOS_INGESTION_TOKEN header.
 * Refuses when token unset (no public unbounded ingestion).
 */
export async function POST(request: Request) {
  const expected = getIngestionToken();
  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Ingestion trigger disabled — set CRICKETOS_INGESTION_TOKEN on the server to enable operator runs",
      },
      { status: 403 },
    );
  }

  const provided =
    request.headers.get("x-cricketos-ingestion-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const a = Buffer.from(provided ?? "");
  const b = Buffer.from(expected);
  if (!provided || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let deep = false;
  let limit = 25;
  try {
    const body = (await request.json()) as { deep?: boolean; limit?: number };
    deep = Boolean(body.deep);
    if (typeof body.limit === "number" && body.limit > 0) {
      limit = Math.min(50, Math.floor(body.limit));
    }
  } catch {
    // empty body ok
  }

  const record = await ingestFixtures({
    adapter: getDataAdapter(),
    storage: getStorage(),
    deep,
    limit,
  });

  return NextResponse.json({
    ok: record.status === "success" || record.status === "partial",
    run: {
      id: record.id,
      status: record.status,
      provider: record.provider,
      fetched: record.fetched,
      upserted: record.upserted,
      skipped: record.skipped,
      errorCount: record.errors.length,
      // Do not echo full error strings that might contain URLs with keys
      errors: record.errors.map((e) => e.slice(0, 200)),
      finishedAt: record.finishedAt,
    },
  });
}
