"use client";

import { useEffect, useState } from "react";
import type { FreshnessStatus, MatchLifecycle } from "@/lib/contracts";

export type HealthSummary = {
  demoMode: boolean;
  dataProvider: string;
  dataApiKeyConfigured: boolean;
  storageBackend: string;
  storageLabel: string;
  matchCount: number;
  freshnessCounts: Partial<Record<FreshnessStatus, number>>;
  briefingLabel?: string;
  primaryFreshness?: FreshnessStatus;
};

export type HealthState = {
  status: "loading" | "ok" | "unavailable";
  summary: HealthSummary | null;
  adapter: { ok: boolean; message: string; provider: string } | null;
  primaryFreshness: FreshnessStatus;
};

export type ApiMatchRow = {
  id: string;
  title: string;
  status: MatchLifecycle | string;
  freshness: FreshnessStatus | string;
  venue: string;
  format: string;
  series?: string;
  score?: { runs: number; wickets: number; overs: string };
  provenance?: { source: string; asOf: string; note?: string; kind?: string };
  teams?: { home: string; away: string };
  homeName?: string;
  awayName?: string;
};

export type FixtureRow = {
  id: string;
  title: string;
  status: MatchLifecycle | string;
  freshness: FreshnessStatus | string;
  venue: string;
  series?: string;
  format: string;
  startTimeIso?: string;
  homeName: string;
  awayName: string;
  provenance?: { source: string; asOf: string; note?: string };
};

/** Poll `/api/health` — UNAVAILABLE when fetch fails. Never invents LIVE. */
export function useDataHealth(): HealthState {
  const [state, setState] = useState<HealthState>({
    status: "loading",
    summary: null,
    adapter: null,
    primaryFreshness: "UNAVAILABLE",
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then(async (r) => {
        const json = (await r.json()) as {
          ok: boolean;
          summary?: HealthSummary;
          adapter?: { ok: boolean; message: string; provider: string };
        };
        if (cancelled) return;
        if (!r.ok || !json.ok || !json.summary) {
          setState({
            status: "unavailable",
            summary: null,
            adapter: null,
            primaryFreshness: "UNAVAILABLE",
          });
          return;
        }
        const primary =
          json.summary.primaryFreshness ??
          (json.summary.demoMode ? "DEMO" : "UNAVAILABLE");
        setState({
          status: "ok",
          summary: json.summary,
          adapter: json.adapter ?? null,
          primaryFreshness: primary === "LIVE" && json.summary.demoMode ? "DEMO" : primary,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: "unavailable",
            summary: null,
            adapter: null,
            primaryFreshness: "UNAVAILABLE",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function useMatchList(limit = 20): {
  status: "loading" | "ok" | "unavailable";
  matches: ApiMatchRow[];
  error: string | null;
} {
  const [status, setStatus] = useState<"loading" | "ok" | "unavailable">("loading");
  const [matches, setMatches] = useState<ApiMatchRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/matches?limit=${limit}`)
      .then(async (r) => {
        const json = (await r.json()) as {
          ok: boolean;
          matches?: ApiMatchRow[];
          error?: string;
        };
        if (cancelled) return;
        if (!r.ok || !json.ok) {
          setStatus("unavailable");
          setError(json.error ?? "Matches unavailable");
          setMatches([]);
          return;
        }
        setMatches(json.matches ?? []);
        setStatus("ok");
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("unavailable");
          setError("Matches unavailable");
          setMatches([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { status, matches, error };
}

export function useFixtures(): {
  status: "loading" | "ok" | "unavailable";
  fixtures: FixtureRow[];
  upcoming: FixtureRow | null;
  historical: FixtureRow[];
  error: string | null;
} {
  const [status, setStatus] = useState<"loading" | "ok" | "unavailable">("loading");
  const [fixtures, setFixtures] = useState<FixtureRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fixtures")
      .then(async (r) => {
        const json = (await r.json()) as {
          ok: boolean;
          fixtures?: FixtureRow[];
          error?: string;
        };
        if (cancelled) return;
        if (!r.ok || !json.ok) {
          setStatus("unavailable");
          setError(json.error ?? "Fixtures unavailable");
          setFixtures([]);
          return;
        }
        setFixtures(json.fixtures ?? []);
        setStatus("ok");
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("unavailable");
          setError("Fixtures unavailable");
          setFixtures([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const upcoming =
    fixtures.find((f) => f.freshness === "UPCOMING" || f.status === "UPCOMING") ?? null;
  const historical = fixtures.filter(
    (f) => f.freshness === "HISTORICAL" || f.status === "COMPLETED",
  );

  return { status, fixtures, upcoming, historical, error };
}
