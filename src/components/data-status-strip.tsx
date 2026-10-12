"use client";

import { useEffect, useState } from "react";
import { FreshnessBadge } from "@/components/status-badge";
import type { FreshnessStatus } from "@/lib/contracts";

type HealthPayload = {
  ok: boolean;
  summary?: {
    demoMode: boolean;
    dataProvider: string;
    storageBackend: string;
    storageLabel: string;
    matchCount: number;
    freshnessCounts: Partial<Record<FreshnessStatus, number>>;
  };
  adapter?: { ok: boolean; message: string; provider: string };
};

/** Compact non-secret data-layer status for Match Room / Explorer. */
export function DataStatusStrip() {
  const [health, setHealth] = useState<HealthPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => r.json())
      .then((json: HealthPayload) => {
        if (!cancelled) setHealth(json);
      })
      .catch(() => {
        if (!cancelled) setHealth({ ok: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!health?.summary) {
    return (
      <p className="text-[11px] text-muted-foreground" role="status">
        Data layer · checking…
      </p>
    );
  }

  const primaryFreshness: FreshnessStatus = health.summary.demoMode
    ? "DEMO"
    : ((Object.keys(health.summary.freshnessCounts)[0] as FreshnessStatus | undefined) ??
      "UNAVAILABLE");

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground" role="status">
      <FreshnessBadge freshness={primaryFreshness} />
      <span>
        Provider {health.summary.dataProvider}
        {health.summary.demoMode ? " · demo fallback" : ""}
      </span>
      <span>· {health.summary.storageBackend}</span>
      <span className="max-w-xl truncate" title={health.summary.storageLabel}>
        · {health.summary.matchCount} match
        {health.summary.matchCount === 1 ? "" : "es"}
      </span>
      {health.adapter ? (
        <span>· adapter {health.adapter.ok ? "ok" : "degraded"}</span>
      ) : null}
    </div>
  );
}
