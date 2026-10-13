"use client";

import { useMemo } from "react";
import { FreshnessBadge, ProvenanceStrip, StatusBadge } from "@/components/status-badge";
import { Kicker } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import {
  useDataHealth,
  useFixtures,
  useMatchList,
  type ApiMatchRow,
  type FixtureRow,
} from "@/hooks/use-data-layer";
import type { FreshnessStatus, MatchLifecycle } from "@/lib/contracts";
import { matchMeta } from "@/lib/data";

export type BoardRow = {
  id: string;
  title: string;
  status: MatchLifecycle;
  freshness: FreshnessStatus;
  venue: string;
  format: string;
  series?: string;
  score?: { runs: number; wickets: number; overs: string };
  homeName?: string;
  awayName?: string;
  provenance?: { source: string; asOf: string; note?: string };
  isDemo: boolean;
};

const STATUS_RANK: Record<string, number> = {
  LIVE: 0,
  DEMO: 1,
  UPCOMING: 2,
  COMPLETED: 3,
  HISTORICAL: 3,
  STALE: 1,
};

function asLifecycle(raw: string | undefined, freshness: string | undefined): MatchLifecycle {
  // Never promote DEMO → LIVE
  if (raw === "DEMO" || freshness === "DEMO") return "DEMO";
  if (raw === "LIVE" && freshness === "LIVE") return "LIVE";
  if (raw === "LIVE") return "LIVE";
  if (raw === "UPCOMING" || freshness === "UPCOMING") return "UPCOMING";
  if (raw === "COMPLETED" || freshness === "HISTORICAL") return "COMPLETED";
  if (raw === "DEMO") return "DEMO";
  return "COMPLETED";
}

function asFreshness(raw: string | undefined, status: MatchLifecycle): FreshnessStatus {
  if (status === "DEMO" || raw === "DEMO") return "DEMO";
  if (raw === "LIVE" && status === "LIVE") return "LIVE";
  if (raw === "STALE") return "STALE";
  if (raw === "UPCOMING" || status === "UPCOMING") return "UPCOMING";
  if (raw === "HISTORICAL" || status === "COMPLETED") return "HISTORICAL";
  if (raw === "UNAVAILABLE") return "UNAVAILABLE";
  return status === "LIVE" ? "LIVE" : "HISTORICAL";
}

function fromFixture(f: FixtureRow): BoardRow {
  const status = asLifecycle(String(f.status), String(f.freshness));
  const freshness = asFreshness(String(f.freshness), status);
  return {
    id: f.id,
    title: f.title,
    status,
    freshness,
    venue: f.venue,
    format: f.format,
    series: f.series,
    homeName: f.homeName,
    awayName: f.awayName,
    provenance: f.provenance,
    isDemo: status === "DEMO" || f.id === matchMeta.id || f.id.startsWith("demo-"),
  };
}

function fromMatch(m: ApiMatchRow): BoardRow {
  const status = asLifecycle(String(m.status), String(m.freshness));
  const freshness = asFreshness(String(m.freshness), status);
  return {
    id: m.id,
    title: m.title,
    status,
    freshness,
    venue: m.venue,
    format: m.format,
    series: m.series,
    score: m.score,
    homeName: m.homeName ?? m.teams?.home,
    awayName: m.awayName ?? m.teams?.away,
    provenance: m.provenance
      ? { source: m.provenance.source, asOf: m.provenance.asOf, note: m.provenance.note }
      : undefined,
    isDemo: status === "DEMO" || m.id === matchMeta.id || m.id.startsWith("demo-"),
  };
}

function mergeBoard(fixtures: FixtureRow[], matches: ApiMatchRow[]): BoardRow[] {
  const map = new Map<string, BoardRow>();
  for (const f of fixtures) map.set(f.id, fromFixture(f));
  for (const m of matches) {
    const next = fromMatch(m);
    const prev = map.get(m.id);
    if (!prev) {
      map.set(m.id, next);
      continue;
    }
    // Prefer row with score / richer provenance; never let DEMO become LIVE
    map.set(m.id, {
      ...prev,
      ...next,
      status: prev.isDemo || next.isDemo ? "DEMO" : next.status,
      freshness: prev.isDemo || next.isDemo ? "DEMO" : next.freshness,
      score: next.score ?? prev.score,
      isDemo: prev.isDemo || next.isDemo,
    });
  }
  // Ensure DEMO Lord's is always present as a labelled option
  if (![...map.values()].some((r) => r.isDemo)) {
    map.set(matchMeta.id, {
      id: matchMeta.id,
      title: `${matchMeta.title} (DEMO)`,
      status: "DEMO",
      freshness: "DEMO",
      venue: matchMeta.venue,
      format: "test",
      series: matchMeta.series,
      score: matchMeta.score,
      homeName: "England",
      awayName: "India",
      provenance: {
        source: matchMeta.provenance.source,
        asOf: matchMeta.provenance.asOf,
        note: matchMeta.provenance.note,
      },
      isDemo: true,
    });
  }
  return [...map.values()].sort((a, b) => {
    const ra = STATUS_RANK[a.status] ?? 9;
    const rb = STATUS_RANK[b.status] ?? 9;
    if (ra !== rb) return ra - rb;
    return a.title.localeCompare(b.title);
  });
}

type Props = {
  selectedId?: string | null;
  onSelect?: (row: BoardRow) => void;
  /** Compact strip for Home; full board for Match Room */
  compact?: boolean;
  limit?: number;
};

export function LiveFixturesBoard({
  selectedId,
  onSelect,
  compact = false,
  limit = 12,
}: Props) {
  const health = useDataHealth();
  const fixtures = useFixtures(15_000);
  const matches = useMatchList(24, 15_000);

  const rows = useMemo(
    () => mergeBoard(fixtures.fixtures, matches.matches).slice(0, limit),
    [fixtures.fixtures, matches.matches, limit],
  );

  const liveCount = rows.filter((r) => r.status === "LIVE" && !r.isDemo).length;
  const providerReady =
    health.status === "ok" &&
    health.summary &&
    !health.summary.demoMode &&
    health.summary.dataApiKeyConfigured;

  const loading = fixtures.status === "loading" && matches.status === "loading";
  const unavailable =
    fixtures.status === "unavailable" && matches.status === "unavailable";

  return (
    <div className="rounded-[1.75rem] border border-white/8 bg-card/40">
      <div className={`flex flex-wrap items-end justify-between gap-3 ${compact ? "p-4" : "p-5 sm:p-6"}`}>
        <div>
          <Kicker className="text-cyan">Live Scores</Kicker>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {providerReady
              ? `Provider synced · ${liveCount} LIVE · polls /api/fixtures + /api/matches`
              : "Seeds + DEMO · add CRICKETOS_DATA_API_KEY for real LIVE scores"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {health.summary ? (
            <span className="tracking-[0.12em] uppercase">
              {health.summary.demoMode ? "DEMO mode" : health.summary.dataProvider}
            </span>
          ) : null}
          {rows[0]?.provenance?.asOf ? (
            <span className="tabular-nums">as of {rows[0].provenance.asOf.slice(0, 19)}</span>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="border-t border-white/8 px-5 py-6 text-sm text-muted-foreground">
          Loading fixtures board…
        </p>
      ) : unavailable ? (
        <p className="border-t border-white/8 px-5 py-6 text-sm text-gold">
          Fixtures UNAVAILABLE — not claiming LIVE
        </p>
      ) : (
        <ul className="divide-y divide-white/8 border-t border-white/8">
          {rows.map((row) => {
            const selected = selectedId === row.id;
            const label = row.isDemo ? `${row.title.replace(/ \(DEMO\)$/, "")}` : row.title;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(row)}
                  className={`flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-left transition sm:px-6 ${
                    selected ? "bg-lime/10" : "hover:bg-white/4"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={row.status} />
                      <FreshnessBadge freshness={row.freshness} />
                      {row.isDemo ? (
                        <span className="text-[10px] tracking-[0.14em] text-gold uppercase">
                          DEMO option
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 font-medium tracking-tight">{label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.venue}
                      {row.format ? ` · ${row.format}` : ""}
                      {row.series ? ` · ${row.series}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    {row.score ? (
                      <p className="font-display text-2xl font-semibold tabular-nums">
                        {row.score.runs}
                        <span className="text-lime">/{row.score.wickets}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {row.status === "UPCOMING" ? "Not started" : "—"}
                      </p>
                    )}
                    {row.score?.overs ? (
                      <p className="mt-0.5 font-mono text-[11px] text-cyan">{row.score.overs} ov</p>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!compact && rows[0]?.provenance ? (
        <div className="border-t border-white/8 px-5 py-3 sm:px-6">
          <ProvenanceStrip
            source={rows.find((r) => r.status === "LIVE")?.provenance?.source ?? rows[0].provenance.source}
            asOf={rows.find((r) => r.status === "LIVE")?.provenance?.asOf ?? rows[0].provenance.asOf}
            note={
              providerReady
                ? "LIVE only when provider reports in-progress. DEMO sim is never labelled LIVE."
                : "No provider key — board shows seeded HISTORICAL / UPCOMING + Lord's DEMO."
            }
          />
          {!providerReady ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3 border-white/12"
              onClick={() => {
                window.open("https://cricketdata.org/", "_blank", "noopener,noreferrer");
              }}
            >
              Get free CricAPI key
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
