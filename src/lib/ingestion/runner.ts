/**
 * Server-side ingestion: fetch → validate → normalise → quality → upsert.
 * Idempotent upserts; records IngestionRunRecord; never logs secrets.
 */

import type { IngestionRunRecord } from "@/lib/domain/models";
import { runQualityChecks } from "@/lib/ingestion/quality";
import { getCricketOsConfig } from "@/lib/provider/config";
import type { CricketDataAdapter } from "@/lib/provider/types";
import type { CricketStorage } from "@/lib/storage/types";

function runId(): string {
  return `ing-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export type IngestFixturesOptions = {
  adapter: CricketDataAdapter;
  storage: CricketStorage;
  limit?: number;
  /** When true, also pull scorecard + balls per match (rate-limit sensitive) */
  deep?: boolean;
};

export async function ingestFixtures(opts: IngestFixturesOptions): Promise<IngestionRunRecord> {
  const cfg = getCricketOsConfig();
  const record: IngestionRunRecord = {
    id: runId(),
    provider: opts.adapter.id,
    operation: opts.deep ? "fixtures+deep" : "fixtures",
    status: "running",
    startedAt: new Date().toISOString(),
    fetched: 0,
    upserted: 0,
    skipped: 0,
    errors: [],
    notes: cfg.demoMode
      ? "demoMode=true — demo adapter only"
      : `timeoutMs=${cfg.providerTimeoutMs}; storage=${opts.storage.kind}`,
  };
  await opts.storage.recordIngestionRun(record);

  try {
    const list = await opts.adapter.listFixtures({ limit: opts.limit ?? 25 });
    if (!list.ok || !list.data) {
      record.status = "failed";
      record.errors.push(list.error ?? "listFixtures failed");
      record.finishedAt = new Date().toISOString();
      await opts.storage.recordIngestionRun(record);
      return record;
    }

    record.fetched = list.data.length;

    for (const item of list.data) {
      const matchRes = await opts.adapter.getMatch(item.id);
      if (!matchRes.ok || !matchRes.data) {
        // Fall back to minimal match from fixture item
        record.skipped += 1;
        record.errors.push(`getMatch ${item.id}: ${matchRes.error ?? "fail"}`);
        continue;
      }

      const quality = runQualityChecks({ match: matchRes.data });
      if (!quality.ok) {
        record.skipped += 1;
        record.errors.push(
          `quality ${item.id}: ${quality.issues
            .filter((i) => i.severity === "error")
            .map((i) => i.code)
            .join(",")}`,
        );
        continue;
      }

      await opts.storage.upsertMatch(matchRes.data);
      record.upserted += 1;

      if (opts.deep) {
        const card = await opts.adapter.getScorecard(matchRes.data.id);
        if (card.ok && card.data) {
          const cq = runQualityChecks({ scorecard: card.data });
          if (cq.ok || card.data.innings.length === 0) {
            await opts.storage.upsertScorecard(card.data);
          }
        }
        const balls = await opts.adapter.getBallByBall(matchRes.data.id);
        if (balls.ok && balls.data?.length) {
          const bq = runQualityChecks({
            balls: balls.data,
            expectedBallRuns: matchRes.data.score?.runs,
            expectedBallWickets: matchRes.data.score?.wickets,
          });
          if (bq.ok) await opts.storage.upsertBalls(matchRes.data.id, balls.data);
          else {
            // Still store with warning note — do not invent corrections
            record.errors.push(`balls quality warn ${matchRes.data.id}`);
            await opts.storage.upsertBalls(matchRes.data.id, balls.data);
          }
        }
      }
    }

    // Players snapshot (optional, bounded)
    const players = await opts.adapter.listPlayers({ limit: 30 });
    if (players.ok && players.data) {
      for (const p of players.data) await opts.storage.upsertPlayer(p);
    }

    record.status =
      record.errors.length === 0 ? "success" : record.upserted > 0 ? "partial" : "failed";
    record.finishedAt = new Date().toISOString();
    await opts.storage.recordIngestionRun(record);
    return record;
  } catch (err) {
    record.status = "failed";
    record.errors.push(err instanceof Error ? err.message : "ingest crashed");
    record.finishedAt = new Date().toISOString();
    await opts.storage.recordIngestionRun(record);
    return record;
  }
}
