"use client";

import { useEffect, useState } from "react";
import type { CoverageLevel, GenderFilter } from "@/lib/coverage";
import type { FreshnessStatus, MatchLifecycle } from "@/lib/contracts";
import type { CricketFormat } from "@/lib/domain/models";

export type ArchiveCoverage = {
  level: CoverageLevel;
  hasResult: boolean;
  hasScorecard: boolean;
  hasInningsRows: boolean;
  hasBallByBall: boolean;
  gender: GenderFilter;
  year?: number;
  note?: string;
};

export type ArchiveMatchRow = {
  id: string;
  title: string;
  status: MatchLifecycle | string;
  freshness: FreshnessStatus | string;
  venue: string;
  format: string;
  series?: string;
  startTimeIso?: string;
  score?: { runs: number; wickets: number; overs: string };
  statusLine?: string;
  resultText?: string;
  coverage?: ArchiveCoverage;
  provenance?: { source: string; asOf: string; note?: string; kind?: string };
  teams?: { home: string; away: string };
  homeName?: string;
  awayName?: string;
};

export type ArchiveFilters = {
  yearFrom?: number;
  yearTo?: number;
  format?: CricketFormat | "";
  gender?: GenderFilter | "";
  team?: string;
  player?: string;
  competition?: string;
  venue?: string;
  result?: string;
  coverage?: CoverageLevel | "";
  page?: number;
  limit?: number;
};

export type ArchiveMeta = {
  claim: string;
  filterYearMin: number;
  filterYearMax: number;
  measuredYearMin: number;
  measuredYearMax: number;
  blockers: string[];
};

function buildQuery(filters: ArchiveFilters): string {
  const params = new URLSearchParams();
  if (filters.yearFrom != null) params.set("yearFrom", String(filters.yearFrom));
  if (filters.yearTo != null) params.set("yearTo", String(filters.yearTo));
  if (filters.format) params.set("format", filters.format);
  if (filters.gender) params.set("gender", filters.gender);
  if (filters.team?.trim()) params.set("team", filters.team.trim());
  if (filters.player?.trim()) params.set("player", filters.player.trim());
  if (filters.competition?.trim()) params.set("competition", filters.competition.trim());
  if (filters.venue?.trim()) params.set("venue", filters.venue.trim());
  if (filters.result?.trim()) params.set("result", filters.result.trim());
  if (filters.coverage) params.set("coverage", filters.coverage);
  params.set("page", String(filters.page ?? 0));
  params.set("limit", String(filters.limit ?? 12));
  return params.toString();
}

export function useHistoricalArchive(filters: ArchiveFilters) {
  const [status, setStatus] = useState<"loading" | "ok" | "unavailable">("loading");
  const [matches, setMatches] = useState<ArchiveMatchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [hasMore, setHasMore] = useState(false);
  const [archive, setArchive] = useState<ArchiveMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const query = buildQuery(filters);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`/api/matches?${query}`);
        const json = (await r.json()) as {
          ok: boolean;
          matches?: ArchiveMatchRow[];
          total?: number;
          page?: number;
          pageSize?: number;
          hasMore?: boolean;
          archive?: ArchiveMeta;
          error?: string;
        };
        if (cancelled) return;
        if (!r.ok || !json.ok) {
          setStatus("unavailable");
          setError(json.error ?? "Archive unavailable");
          setMatches([]);
          return;
        }
        setMatches(json.matches ?? []);
        setTotal(json.total ?? json.matches?.length ?? 0);
        setPage(json.page ?? 0);
        setPageSize(json.pageSize ?? 12);
        setHasMore(Boolean(json.hasMore));
        setArchive(json.archive ?? null);
        setError(null);
        setStatus("ok");
      } catch {
        if (!cancelled) {
          setStatus("unavailable");
          setError("Archive unavailable");
          setMatches([]);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return {
    status,
    matches,
    total,
    page,
    pageSize,
    hasMore,
    archive,
    error,
    reload: () => undefined,
  };
}
