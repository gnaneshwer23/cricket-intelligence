/**
 * Load the Cricsheet people register (aliases + cross-source keys).
 *   DATABASE_URL=... npm run ingest:register
 *   DATABASE_URL=... npm run ingest:register -- --dir ./data   # local names.csv + people.csv
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { Pool } from "pg";
import { loadRegister, REGISTER_BASE_URL } from "@/lib/ingestion/cricsheet-register";

async function fetchText(file: string): Promise<string> {
  const res = await fetch(`${REGISTER_BASE_URL}/${file}`);
  if (!res.ok) throw new Error(`register ${file}: HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const { values } = parseArgs({ options: { dir: { type: "string" } } });
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const read = (f: string) => (values.dir ? readFile(path.join(values.dir, f), "utf8") : fetchText(f));
  const [names, people] = await Promise.all([read("names.csv"), read("people.csv")]);
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const res = await loadRegister(pool, names, people);
    console.log(`register loaded: ${res.aliases} aliases, ${res.people} people`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
