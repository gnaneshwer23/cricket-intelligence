"use client";

import { FreshnessBadge } from "@/components/status-badge";
import { useDataHealth } from "@/hooks/use-data-layer";

/** Compact non-secret data-layer status for Match Room / Explorer / Home. */
export function DataStatusStrip() {
  const health = useDataHealth();

  if (health.status === "loading") {
    return (
      <p className="text-[11px] text-muted-foreground" role="status">
        Data layer · checking…
      </p>
    );
  }

  if (health.status === "unavailable" || !health.summary) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground" role="status">
        <FreshnessBadge freshness="UNAVAILABLE" />
        <span>Data layer unreachable — not claiming LIVE</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground" role="status">
      <FreshnessBadge freshness={health.primaryFreshness} />
      <span>
        Provider {health.summary.dataProvider}
        {health.summary.demoMode ? " · demo + seeded archive" : ""}
      </span>
      <span>· {health.summary.storageBackend}</span>
      <span className="max-w-xl truncate" title={health.summary.storageLabel}>
        · {health.summary.matchCount} match
        {health.summary.matchCount === 1 ? "" : "es"}
      </span>
      {health.summary.briefingLabel ? (
        <span className="max-w-md truncate" title={health.summary.briefingLabel}>
          · {health.summary.briefingLabel}
        </span>
      ) : null}
      {health.adapter ? (
        <span>· adapter {health.adapter.ok ? "ok" : "degraded"}</span>
      ) : null}
      {!health.summary.dataApiKeyConfigured ? (
        <span>· set CRICKETOS_DATA_PROVIDER + CRICKETOS_DATA_API_KEY for live feed</span>
      ) : null}
    </div>
  );
}
