/** Shared data contracts — live facts vs historical vs model vs hypothetical. */

export type MatchLifecycle = "LIVE" | "COMPLETED" | "UPCOMING" | "DEMO";

/**
 * Distinguishes feed freshness for UI / operators.
 * DEMO is never promoted to LIVE without a verified provider health check.
 */
export type FreshnessStatus =
  | "LIVE"
  | "STALE"
  | "UNAVAILABLE"
  | "DEMO"
  | "HISTORICAL"
  | "UPCOMING";

export type DataKind =
  | "fact"
  | "historical"
  | "model"
  | "hypothetical"
  | "demo";

export type Provenance = {
  kind: DataKind;
  source: string;
  asOf: string;
  note?: string;
  /** Provider id when sourced externally */
  provider?: string;
  /** Provider-native entity id */
  providerEntityId?: string;
};

export type EvidenceItem = {
  id: string;
  label: string;
  detail: string;
  kind: DataKind;
  relatedPlayerIds?: string[];
  relatedEventIds?: string[];
};

export type MatchMeta = {
  id: string;
  status: MatchLifecycle;
  /** Feed freshness — defaults to DEMO for bundled board */
  freshness?: FreshnessStatus;
  title: string;
  venue: string;
  dayLabel: string;
  series: string;
  score: { runs: number; wickets: number; overs: string };
  winModel: { eng: number; ind: number; draw?: number };
  provenance: Provenance;
};

export function statusLabel(status: MatchLifecycle): string {
  switch (status) {
    case "LIVE":
      return "LIVE";
    case "COMPLETED":
      return "COMPLETED";
    case "UPCOMING":
      return "UPCOMING";
    case "DEMO":
      return "DEMO";
  }
}

export function freshnessLabel(status: FreshnessStatus): string {
  switch (status) {
    case "LIVE":
      return "LIVE";
    case "STALE":
      return "STALE";
    case "UNAVAILABLE":
      return "UNAVAILABLE";
    case "DEMO":
      return "DEMO";
    case "HISTORICAL":
      return "HISTORICAL";
    case "UPCOMING":
      return "UPCOMING";
  }
}

export function kindLabel(kind: DataKind): string {
  switch (kind) {
    case "fact":
      return "Fact";
    case "historical":
      return "Historical";
    case "model":
      return "Model";
    case "hypothetical":
      return "Hypothetical";
    case "demo":
      return "Demo dataset";
  }
}

/** Map lifecycle + age into a freshness badge for UI. */
export function deriveFreshness(input: {
  lifecycle: MatchLifecycle;
  demoMode: boolean;
  updatedAtIso?: string;
  staleAfterMs?: number;
  providerAvailable?: boolean;
}): FreshnessStatus {
  if (input.demoMode || input.lifecycle === "DEMO") return "DEMO";
  if (input.providerAvailable === false) return "UNAVAILABLE";
  if (input.lifecycle === "UPCOMING") return "UPCOMING";
  if (input.lifecycle === "COMPLETED") return "HISTORICAL";
  if (input.lifecycle === "LIVE") {
    if (!input.updatedAtIso) return "STALE";
    const age = Date.now() - Date.parse(input.updatedAtIso);
    const limit = input.staleAfterMs ?? 120_000;
    if (!Number.isFinite(age) || age > limit) return "STALE";
    return "LIVE";
  }
  return "UNAVAILABLE";
}
