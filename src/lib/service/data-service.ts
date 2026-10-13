/**
 * Unified data service — UI / API prefer this over importing data.ts alone.
 * Bootstraps seeded historical fixtures through the normalisation path,
 * then optionally syncs from a configured provider. Never promotes seed/demo to LIVE.
 */

import type { FreshnessStatus } from "@/lib/contracts";
import type {
  DomainFixtureListItem,
  DomainMatch,
  DomainScorecard,
  HistoricalMatchFilter,
  OperatorHealthSummary,
} from "@/lib/domain/models";
import { toFixtureItem } from "@/lib/ingestion/normalise";
import { ingestFixtures } from "@/lib/ingestion/runner";
import { getCricketOsConfig, getPublicRuntimeFlags } from "@/lib/provider/config";
import { getDataAdapter } from "@/lib/provider";
import { getDemoMatch, getDemoScorecard } from "@/lib/provider/demo-adapter";
import { buildSeedBundle, SEED_PROVIDER } from "@/lib/provider/seed-historical";
import {
  compareMatches,
  searchHistoricalMatches,
} from "@/lib/service/historical";
import {
  getMatchById,
  getOperatorHealth,
  getScorecardByMatchId,
  listStoredMatches,
} from "@/lib/service/match-service";
import { getStorage } from "@/lib/storage";

let bootPromise: Promise<BootstrapResult> | null = null;

export type BootstrapResult = {
  seeded: number;
  providerSynced: number;
  demoMode: boolean;
  provider: string;
  errors: string[];
};

async function runBootstrap(): Promise<BootstrapResult> {
  const cfg = getCricketOsConfig();
  const storage = getStorage();
  const errors: string[] = [];
  let seeded = 0;
  let providerSynced = 0;

  const existing = await storage.listMatches();
  const hasSeed = existing.some((m) => m.providerIds?.[SEED_PROVIDER] || m.id.startsWith("seed-"));

  if (!hasSeed) {
    const bundle = buildSeedBundle();
    for (const match of bundle.matches) {
      // Honesty: never write LIVE from seed
      if (match.status === "LIVE" || match.freshness === "LIVE") continue;
      await storage.upsertMatch(match);
      seeded += 1;
    }
    for (const card of bundle.scorecards) {
      await storage.upsertScorecard(card);
    }
  }

  // Always ensure demo board is available in storage for id lookups
  const demo = getDemoMatch();
  if (!(await storage.getMatch(demo.id))) {
    await storage.upsertMatch(demo);
    await storage.upsertScorecard(getDemoScorecard());
  }

  if (!cfg.demoMode) {
    try {
      const run = await ingestFixtures({
        adapter: getDataAdapter(),
        storage,
        limit: 15,
        deep: false,
      });
      providerSynced = run.upserted;
      if (run.errors.length) errors.push(...run.errors.slice(0, 5));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "provider sync failed");
    }
  }

  return {
    seeded,
    providerSynced,
    demoMode: cfg.demoMode,
    provider: cfg.dataProvider,
    errors,
  };
}

/** Idempotent bootstrap — safe to call from every API route. */
export async function ensureDataReady(): Promise<BootstrapResult> {
  if (!bootPromise) bootPromise = runBootstrap();
  try {
    return await bootPromise;
  } catch (err) {
    bootPromise = null;
    throw err;
  }
}

/** Test helper — clear bootstrap latch after storage reset. */
export function resetDataServiceForTests(): void {
  bootPromise = null;
}

export type DataService = {
  ensureReady: () => Promise<BootstrapResult>;
  health: () => Promise<OperatorHealthSummary & { adapterOk: boolean; adapterMessage: string }>;
  listMatches: (filter?: HistoricalMatchFilter) => Promise<DomainMatch[]>;
  getMatch: (id: string) => Promise<DomainMatch | null>;
  getScorecard: (matchId: string) => Promise<DomainScorecard | null>;
  listFixtures: () => Promise<DomainFixtureListItem[]>;
  compare: typeof compareMatches;
  primaryFreshness: (counts: Partial<Record<FreshnessStatus, number>>, demoMode: boolean) => FreshnessStatus;
};

function primaryFreshness(
  counts: Partial<Record<FreshnessStatus, number>>,
  demoMode: boolean,
): FreshnessStatus {
  if (demoMode) {
    // Prefer DEMO when present; never claim LIVE in demoMode
    if (counts.DEMO) return "DEMO";
    if (counts.HISTORICAL) return "HISTORICAL";
    if (counts.UPCOMING) return "UPCOMING";
    return "DEMO";
  }
  const order: FreshnessStatus[] = ["LIVE", "STALE", "UPCOMING", "HISTORICAL", "DEMO", "UNAVAILABLE"];
  for (const key of order) {
    if (counts[key]) return key;
  }
  return "UNAVAILABLE";
}

async function listFixturesUnified(): Promise<DomainFixtureListItem[]> {
  await ensureDataReady();
  const cfg = getCricketOsConfig();
  const stored = await listStoredMatches();
  const fromStorage = stored.map(toFixtureItem);

  if (!cfg.demoMode) {
    const adapter = getDataAdapter();
    const remote = await adapter.listFixtures({ limit: 20 });
    if (remote.ok && remote.data?.length) {
      // Merge by id; remote wins when not demo
      const map = new Map<string, DomainFixtureListItem>();
      for (const f of fromStorage) map.set(f.id, f);
      for (const f of remote.data) {
        // Never accept LIVE if somehow still in demoMode (belt + braces)
        if (cfg.demoMode && f.freshness === "LIVE") continue;
        map.set(f.id, f);
      }
      return [...map.values()];
    }
  }

  return fromStorage;
}

export function getDataService(): DataService {
  return {
    ensureReady: ensureDataReady,
    async health() {
      await ensureDataReady();
      const summary = await getOperatorHealth();
      const adapter = getDataAdapter();
      const adapterHealth = await adapter.health();
      return {
        ...summary,
        adapterOk: adapterHealth.ok,
        adapterMessage: adapterHealth.message,
      };
    },
    async listMatches(filter) {
      await ensureDataReady();
      return searchHistoricalMatches(filter);
    },
    async getMatch(id) {
      await ensureDataReady();
      return getMatchById(id);
    },
    async getScorecard(matchId) {
      await ensureDataReady();
      return getScorecardByMatchId(matchId);
    },
    listFixtures: listFixturesUnified,
    compare: async (left, right) => {
      await ensureDataReady();
      return compareMatches(left, right);
    },
    primaryFreshness,
  };
}

/** Client-safe briefing flags derived from public config (no secrets). */
export function getBriefingDataFlags() {
  const flags = getPublicRuntimeFlags();
  return {
    demoMode: flags.demoMode,
    dataProvider: flags.dataProvider,
    hasLiveProvider: !flags.demoMode,
    label: flags.demoMode
      ? "DEMO + seeded HISTORICAL archive"
      : `Provider ${flags.dataProvider} · LIVE only when feed confirms`,
  };
}
