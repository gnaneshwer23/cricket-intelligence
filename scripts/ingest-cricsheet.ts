/**
 * Load Cricsheet ball-by-ball data into Postgres.
 *
 *   npm run ingest:cricsheet -- --file ipl_json.zip            # download from cricsheet.org
 *   npm run ingest:cricsheet -- --zip ./data/all_json.zip      # local zip
 *   npm run ingest:cricsheet -- --file t20s_json.zip --limit 50 --force
 *   npm run ingest:cricsheet -- --file ipl_json.zip --memory   # dry run, no DB
 *
 * Downloads list: https://cricsheet.org/downloads/ (all_json.zip, tests_json.zip,
 * odis_json.zip, t20s_json.zip, ipl_json.zip, recently_added_7_json.zip, …).
 * Data is ODC-By 1.0 — attribution to cricsheet.org is required in the product.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { fetchCricsheetZip, ingestCricsheetZip } from "@/lib/ingestion/cricsheet-ingest";
import { createStorage } from "@/lib/storage/postgres";

async function main() {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      zip: { type: "string" },
      limit: { type: "string" },
      force: { type: "boolean", default: false },
      memory: { type: "boolean", default: false },
    },
  });
  if (!values.file === !values.zip) {
    console.error("Pass exactly one of --file <cricsheet zip name> or --zip <local path>.");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL?.trim() || null;
  if (!values.memory && !databaseUrl) {
    console.error("DATABASE_URL is not set (use --memory for a dry run).");
    process.exit(1);
  }
  const storage = createStorage(values.memory ? "memory" : "postgres", databaseUrl);

  const sourceLabel = values.file ?? path.basename(values.zip!);
  console.log(`Loading ${sourceLabel} → ${storage.kind}`);
  const zip = values.file
    ? await fetchCricsheetZip(values.file)
    : new Uint8Array(await readFile(values.zip!));

  const started = Date.now();
  const run = await ingestCricsheetZip({
    zip,
    storage,
    sourceLabel,
    limit: values.limit ? Number.parseInt(values.limit, 10) : undefined,
    force: values.force,
    onProgress: (done, total) => {
      const secs = ((Date.now() - started) / 1000).toFixed(0);
      process.stdout.write(`\r  ${done}/${total} files · ${secs}s`);
    },
  });
  process.stdout.write("\n");

  console.log(
    `${run.status}: fetched=${run.fetched} upserted=${run.upserted} skipped=${run.skipped} (${run.notes})`,
  );
  for (const e of run.errors.slice(0, 15)) console.log(`  · ${e}`);
  if (run.errors.length > 15) console.log(`  … ${run.errors.length - 15} more in ingestion_runs`);

  const stats = await storage.stats();
  console.log(`storage: ${stats.matchCount} matches, ${stats.playerCount} players`);
  await storage.close?.();
  if (run.status === "failed") process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
