/**
 * Cricsheet people register → player aliases + cross-source keys.
 * Ids match the parser: `cs-<identifier>`.
 */

import type { Pool } from "pg";

export const REGISTER_BASE_URL = "https://cricsheet.org/register";

/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, idx) => [h, r[idx] ?? ""])));
}

export type RegisterLoadResult = { aliases: number; people: number };

export async function loadRegister(
  pool: Pool,
  namesCsv: string,
  peopleCsv: string,
): Promise<RegisterLoadResult> {
  const names = parseCsv(namesCsv).filter((r) => r.identifier && r.name);
  const people = parseCsv(peopleCsv).filter((r) => r.identifier && r.unique_name);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < names.length; i += 5000) {
      const chunk = names.slice(i, i + 5000);
      await client.query(
        `INSERT INTO player_aliases (player_id, alias)
         SELECT * FROM UNNEST($1::text[], $2::text[]) ON CONFLICT DO NOTHING`,
        [chunk.map((r) => `cs-${r.identifier}`), chunk.map((r) => r.name)],
      );
    }
    for (let i = 0; i < people.length; i += 5000) {
      const chunk = people.slice(i, i + 5000);
      await client.query(
        `INSERT INTO player_register (player_id, unique_name, cricinfo_id, cricbuzz_id, updated_at)
         SELECT id, un, NULLIF(ci, ''), NULLIF(cb, ''), NOW()
           FROM UNNEST($1::text[], $2::text[], $3::text[], $4::text[]) AS t(id, un, ci, cb)
         ON CONFLICT (player_id) DO UPDATE SET unique_name = EXCLUDED.unique_name,
           cricinfo_id = EXCLUDED.cricinfo_id, cricbuzz_id = EXCLUDED.cricbuzz_id, updated_at = NOW()`,
        [
          chunk.map((r) => `cs-${r.identifier}`),
          chunk.map((r) => r.unique_name),
          chunk.map((r) => r.key_cricinfo ?? ""),
          chunk.map((r) => r.key_cricbuzz ?? ""),
        ],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return { aliases: names.length, people: people.length };
}
