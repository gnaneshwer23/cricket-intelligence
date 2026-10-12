/**
 * Normalised match service — UI / Copilot / Explorer should prefer this over raw data.ts
 * for provider-backed reads. Demo board remains available via getDemoBoard().
 */

import type { MatchMeta } from "@/lib/contracts";
import { deriveFreshness } from "@/lib/contracts";
import type {
  DomainMatch,
  DomainScorecard,
  OperatorHealthSummary,
} from "@/lib/domain/models";
import { matchMeta as demoMatchMeta } from "@/lib/data";
import { getDemoMatch, getDemoScorecard } from "@/lib/provider/demo-adapter";
import { getCricketOsConfig, getPublicRuntimeFlags } from "@/lib/provider/config";
import { getDataAdapter } from "@/lib/provider";
import { getStorage } from "@/lib/storage";

export function getDemoBoard(): MatchMeta {
  const cfg = getCricketOsConfig();
  return {
    ...demoMatchMeta,
    freshness: "DEMO",
    status: "DEMO",
    provenance: {
      ...demoMatchMeta.provenance,
      provider: "demo",
      providerEntityId: demoMatchMeta.id,
    },
    // Ensure demoMode never surfaces as LIVE
    ...(cfg.demoMode ? {} : {}),
  };
}

export async function getMatchById(id: string): Promise<DomainMatch | null> {
  const storage = getStorage();
  const cached = await storage.getMatch(id);
  if (cached) {
    const cfg = getCricketOsConfig();
    return {
      ...cached,
      freshness: deriveFreshness({
        lifecycle: cached.status,
        demoMode: cfg.demoMode || cached.status === "DEMO",
        updatedAtIso: cached.updatedAt,
        staleAfterMs: cfg.staleAfterMs,
        providerAvailable: !cfg.demoMode,
      }),
    };
  }

  if (id === demoMatchMeta.id || id === "demo") return getDemoMatch();

  const adapter = getDataAdapter();
  const res = await adapter.getMatch(id);
  if (res.ok && res.data) {
    await storage.upsertMatch(res.data);
    return res.data;
  }
  return null;
}

export async function getScorecardByMatchId(matchId: string): Promise<DomainScorecard | null> {
  const storage = getStorage();
  const cached = await storage.getScorecard(matchId);
  if (cached) return cached;
  if (matchId === demoMatchMeta.id || matchId === "demo") return getDemoScorecard();
  const adapter = getDataAdapter();
  const res = await adapter.getScorecard(matchId);
  if (res.ok && res.data) {
    await storage.upsertScorecard(res.data);
    return res.data;
  }
  return null;
}

export async function listStoredMatches(): Promise<DomainMatch[]> {
  const storage = getStorage();
  const list = await storage.listMatches();
  if (list.length === 0) return [getDemoMatch()];
  return list;
}

export async function getOperatorHealth(): Promise<OperatorHealthSummary> {
  const cfg = getCricketOsConfig();
  const flags = getPublicRuntimeFlags();
  const storage = getStorage();
  const matches = await storage.listMatches();
  const players = await storage.listPlayers();
  const last = await storage.latestIngestionRun();
  const freshnessCounts: OperatorHealthSummary["freshnessCounts"] = {};
  for (const m of matches.length ? matches : [getDemoMatch()]) {
    freshnessCounts[m.freshness] = (freshnessCounts[m.freshness] ?? 0) + 1;
  }

  return {
    demoMode: flags.demoMode,
    dataProvider: flags.dataProvider,
    dataApiKeyConfigured: cfg.dataApiKeyConfigured,
    llmEnabled: flags.llmEnabled,
    storageBackend: storage.kind,
    storageLabel: storage.label,
    lastIngestion: last,
    freshnessCounts,
    matchCount: matches.length || 1,
    playerCount: players.length,
    asOf: new Date().toISOString(),
  };
}

export { copilotEvidenceScope } from "@/lib/service/evidence-scope";
