import { timingSafeEqual } from "node:crypto";
import { connection, NextResponse } from "next/server";
import { fetchCricsheetZip, ingestCricsheetZip } from "@/lib/ingestion/cricsheet-ingest";
import { getIngestionToken } from "@/lib/provider/config";
import { getStorage } from "@/lib/storage";

/** Allow the 7-day delta (tens of matches) to finish on Vercel. */
export const maxDuration = 300;

const ALLOWED_FILES = new Set([
  "recently_added_2_json.zip",
  "recently_added_7_json.zip",
  "recently_added_30_json.zip",
]);

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; operators may use the ingestion token. */
function authorised(request: Request): boolean {
  const provided =
    request.headers.get("x-cricketos-ingestion-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!provided) return false;
  const secrets = [process.env.CRON_SECRET?.trim(), getIngestionToken()].filter(
    (s): s is string => Boolean(s),
  );
  return secrets.some((s) => safeEqual(provided, s));
}

/**
 * Nightly Cricsheet delta. Full backfills run from the CLI
 * (`npm run ingest:cricsheet`), not here — they exceed function limits.
 */
export async function GET(request: Request) {
  await connection();
  if (!process.env.CRON_SECRET?.trim() && !getIngestionToken()) {
    return NextResponse.json(
      { ok: false, error: "Cricsheet ingest disabled — set CRON_SECRET or CRICKETOS_INGESTION_TOKEN" },
      { status: 403 },
    );
  }
  if (!authorised(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const storage = getStorage();
  if (storage.kind !== "postgres") {
    return NextResponse.json(
      { ok: false, error: "Refusing to ingest into ephemeral memory storage — configure Postgres" },
      { status: 409 },
    );
  }

  const file = new URL(request.url).searchParams.get("file") ?? "recently_added_7_json.zip";
  if (!ALLOWED_FILES.has(file)) {
    return NextResponse.json({ ok: false, error: "Only recently_added_* deltas run here" }, { status: 400 });
  }

  try {
    const run = await ingestCricsheetZip({
      zip: await fetchCricsheetZip(file),
      storage,
      sourceLabel: file,
    });
    return NextResponse.json({
      ok: run.status !== "failed",
      run: {
        id: run.id,
        status: run.status,
        fetched: run.fetched,
        upserted: run.upserted,
        skipped: run.skipped,
        errorCount: run.errors.length,
        errors: run.errors.slice(0, 20),
        finishedAt: run.finishedAt,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message.slice(0, 200) : "ingest failed" },
      { status: 502 },
    );
  }
}
