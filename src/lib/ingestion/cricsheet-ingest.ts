/**
 * Cricsheet zip → storage. Server-side only (CLI + cron route).
 * Idempotent: rows are upserted by stable ids; existing matches are skipped
 * unless `force` is set.
 */

import { unzipSync } from "fflate";
import type { IngestionRunRecord } from "@/lib/domain/models";
import { CRICSHEET_PROVIDER, parseCricsheetMatch } from "@/lib/ingestion/cricsheet";
import type { CricketStorage } from "@/lib/storage/types";

export const CRICSHEET_BASE_URL = "https://cricsheet.org/downloads";

/** Files decompressed per pass — bounds memory on the 20k-match all_json.zip. */
const CHUNK = 200;
const MAX_RECORDED_ERRORS = 200;

export type CricsheetIngestOptions = {
  zip: Uint8Array;
  storage: CricketStorage;
  /** Label for the run record, e.g. "ipl_json.zip". */
  sourceLabel: string;
  limit?: number;
  force?: boolean;
  onProgress?: (done: number, total: number) => void;
};

function runId(): string {
  return `ing-cs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Fetch a Cricsheet download (e.g. "recently_added_7_json.zip"). */
export async function fetchCricsheetZip(file: string, fetchImpl: typeof fetch = fetch): Promise<Uint8Array> {
  if (!/^[a-z0-9_]+\.zip$/i.test(file)) throw new Error(`invalid Cricsheet file name: ${file}`);
  const res = await fetchImpl(`${CRICSHEET_BASE_URL}/${file}`, {
    headers: { "user-agent": "Cricket Intelligence ingest (+https://cricsheet.org attribution)" },
  });
  if (!res.ok) throw new Error(`Cricsheet download ${file} failed: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Match JSON entries in the zip (README / metadata files excluded). */
export function listCricsheetEntries(zip: Uint8Array): string[] {
  const names: string[] = [];
  unzipSync(zip, {
    filter: (f) => {
      if (/^(?:.*\/)?\d+\.json$/.test(f.name)) names.push(f.name);
      return false;
    },
  });
  return names.sort();
}

function stem(name: string): string {
  return name.replace(/^.*\//, "").replace(/\.json$/, "");
}

export async function ingestCricsheetZip(opts: CricsheetIngestOptions): Promise<IngestionRunRecord> {
  const { storage } = opts;
  const record: IngestionRunRecord = {
    id: runId(),
    provider: CRICSHEET_PROVIDER,
    operation: `cricsheet:${opts.sourceLabel}`,
    status: "running",
    startedAt: new Date().toISOString(),
    fetched: 0,
    upserted: 0,
    skipped: 0,
    errors: [],
    notes: `storage=${storage.kind}; force=${Boolean(opts.force)}`,
  };
  await storage.recordIngestionRun(record);

  const pushError = (msg: string) => {
    if (record.errors.length < MAX_RECORDED_ERRORS) record.errors.push(msg.slice(0, 300));
  };

  let qualityFlagged = 0;
  try {
    let entries = listCricsheetEntries(opts.zip);
    if (opts.limit != null) entries = entries.slice(0, opts.limit);
    record.fetched = entries.length;

    const decoder = new TextDecoder();
    for (let i = 0; i < entries.length; i += CHUNK) {
      const wanted = new Set(entries.slice(i, i + CHUNK));
      const files = unzipSync(opts.zip, { filter: (f) => wanted.has(f.name) });

      for (const name of wanted) {
        const id = stem(name);
        try {
          if (!opts.force && (await storage.getMatch(`cs-${id}`))) {
            record.skipped += 1;
            continue;
          }
          const bytes = files[name];
          if (!bytes) throw new Error("entry missing from zip");
          const bundle = parseCricsheetMatch(JSON.parse(decoder.decode(bytes)), id);

          // Quality issues are recorded for review, never silently dropped.
          if (bundle.quality.issues.length) {
            qualityFlagged += 1;
            const worst = bundle.quality.issues.find((q) => q.severity === "error") ?? bundle.quality.issues[0]!;
            pushError(`quality ${id} [${worst.severity}] ${worst.code}: ${worst.message}`);
          }

          await storage.upsertMatch(bundle.match);
          if (storage.upsertPlayers) await storage.upsertPlayers(bundle.players);
          else for (const p of bundle.players) await storage.upsertPlayer(p);
          await storage.upsertScorecard(bundle.scorecard);
          await storage.upsertBalls(bundle.match.id, bundle.balls);
          await storage.upsertMatchPlayers?.(bundle.match.id, bundle.appearances);
          record.upserted += 1;
        } catch (err) {
          record.skipped += 1;
          pushError(`match ${id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      opts.onProgress?.(Math.min(i + CHUNK, entries.length), entries.length);
      // Persist progress so long runs are observable from /api/ingestion/status.
      await storage.recordIngestionRun(record);
    }

    const parseFailures = record.errors.filter((e) => e.startsWith("match ")).length;
    record.status = parseFailures === 0 ? "success" : record.upserted > 0 ? "partial" : "failed";
  } catch (err) {
    record.status = "failed";
    pushError(err instanceof Error ? err.message : String(err));
  }

  record.notes = `${record.notes}; qualityFlagged=${qualityFlagged}`;
  record.finishedAt = new Date().toISOString();
  await storage.recordIngestionRun(record);
  return record;
}
