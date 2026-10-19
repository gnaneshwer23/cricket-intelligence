/**
 * Metadata-only Cricsheet backfill: toss, player of the match and scheduled
 * overs for matches already loaded. Updates those columns (and the matches
 * payload) in place — no ball or scorecard rewrite.
 */

import { unzipSync } from "fflate";
import type { Pool } from "pg";
import { cricsheetMatchMeta, type CricsheetMatch } from "@/lib/ingestion/cricsheet";

const BATCH = 500;

export type MatchMetaRow = {
  id: string;
  tossWinner: string | null;
  tossDecision: string | null;
  playerOfMatch: string[] | null;
  scheduledOvers: number | null;
};

/** Parse only `info` from each match JSON in a Cricsheet zip. */
export function readCricsheetMatchMeta(zip: Uint8Array): MatchMetaRow[] {
  const files = unzipSync(zip, { filter: (f) => /^(?:.*\/)?\d+\.json$/.test(f.name) });
  const decoder = new TextDecoder();
  const rows: MatchMetaRow[] = [];
  for (const [name, bytes] of Object.entries(files)) {
    const cricsheetId = name.replace(/^.*\//, "").replace(/\.json$/, "");
    const info = (JSON.parse(decoder.decode(bytes)) as Partial<CricsheetMatch>).info;
    if (!info) continue;
    const meta = cricsheetMatchMeta(info);
    rows.push({
      id: `cs-${cricsheetId}`,
      tossWinner: meta.toss?.winner ?? null,
      tossDecision: meta.toss?.decision ?? null,
      playerOfMatch: meta.playerOfMatch ?? null,
      scheduledOvers: meta.scheduledOvers ?? null,
    });
  }
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

/** UPDATE existing matches only; returns how many rows matched. */
export async function backfillMatchMeta(pool: Pool, rows: MatchMetaRow[]): Promise<number> {
  let updated = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await pool.query(
      `UPDATE matches m SET
         toss_winner = v.toss_winner,
         toss_decision = v.toss_decision,
         player_of_match = v.pom,
         scheduled_overs = v.overs,
         payload = (m.payload - 'toss' - 'playerOfMatch' - 'scheduledOvers') || jsonb_strip_nulls(jsonb_build_object(
           'toss', CASE WHEN v.toss_winner IS NULL THEN NULL
                        ELSE jsonb_build_object('winner', v.toss_winner, 'decision', v.toss_decision) END,
           'playerOfMatch', CASE WHEN v.pom IS NULL THEN NULL ELSE to_jsonb(v.pom) END,
           'scheduledOvers', v.overs))
       FROM (
         SELECT u.id, u.toss_winner, u.toss_decision, u.overs,
                CASE WHEN u.pom_json IS NULL THEN NULL
                     ELSE ARRAY(SELECT jsonb_array_elements_text(u.pom_json)) END AS pom
           FROM UNNEST($1::text[], $2::text[], $3::text[], $4::jsonb[], $5::int[])
             AS u(id, toss_winner, toss_decision, pom_json, overs)
       ) v
       WHERE m.id = v.id`,
      [
        batch.map((r) => r.id),
        batch.map((r) => r.tossWinner),
        batch.map((r) => r.tossDecision),
        batch.map((r) => (r.playerOfMatch ? JSON.stringify(r.playerOfMatch) : null)),
        batch.map((r) => r.scheduledOvers),
      ],
    );
    updated += res.rowCount ?? 0;
  }
  return updated;
}
