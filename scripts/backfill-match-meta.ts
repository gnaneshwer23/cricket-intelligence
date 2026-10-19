/**
 * Fill toss / player of the match / scheduled overs for matches already
 * loaded from a Cricsheet zip — no re-ingest of balls or scorecards.
 *
 *   DATABASE_URL=postgres://... npm run backfill:match-meta -- --zip ./data/ipl_json.zip
 *   DATABASE_URL=postgres://... npm run backfill:match-meta -- --file t20s_json.zip
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { fetchCricsheetZip } from "@/lib/ingestion/cricsheet-ingest";
import { backfillMatchMeta, readCricsheetMatchMeta } from "@/lib/ingestion/cricsheet-meta";
import { createPool } from "@/lib/storage/postgres";

async function main() {
  const { values } = parseArgs({ options: { file: { type: "string" }, zip: { type: "string" } } });
  if (!values.file === !values.zip) {
    console.error("Pass exactly one of --file <cricsheet zip name> or --zip <local path>.");
    process.exit(1);
  }
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const label = values.file ?? path.basename(values.zip!);
  const zip = values.file ? await fetchCricsheetZip(values.file) : new Uint8Array(await readFile(values.zip!));
  const rows = readCricsheetMatchMeta(zip);
  const pool = createPool(databaseUrl, { max: 1 });
  try {
    const updated = await backfillMatchMeta(pool, rows);
    const withToss = rows.filter((r) => r.tossWinner).length;
    const withPom = rows.filter((r) => r.playerOfMatch).length;
    console.log(
      `${label}: ${rows.length} matches in zip (toss ${withToss}, player of match ${withPom}); ${updated} rows updated`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
