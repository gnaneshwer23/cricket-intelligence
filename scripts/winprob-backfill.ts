/**
 * Store per-ball win probability for every stored T20 match (current model version).
 *   DATABASE_URL=... npm run winprob:backfill [-- --competition "Indian Premier League"]
 */
import { parseArgs } from "node:util";
import { Pool } from "pg";
import { loadTrajectories } from "@/lib/winprob/data";
import { computeWorm, storeWorm, WIN_PROB_MODEL } from "@/lib/winprob/worm";

async function main() {
  const { values } = parseArgs({ options: { competition: { type: "string" } } });
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not set.");
  const pool = new Pool({ connectionString: url, max: 2 });
  try {
    const { trajectories } = await loadTrajectories(pool, { competition: values.competition });
    let stored = 0;
    for (const t of trajectories) {
      await storeWorm(pool, t.matchId, WIN_PROB_MODEL.version, computeWorm(WIN_PROB_MODEL, t));
      stored += 1;
    }
    console.log(`stored ${WIN_PROB_MODEL.version} worms for ${stored} matches`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
