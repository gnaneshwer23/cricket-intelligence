"use client";

import { useMemo, useState } from "react";
import { FreshnessBadge, ProvenanceStrip, StatusBadge } from "@/components/status-badge";
import { TruthSetupPanel } from "@/components/truth-setup-panel";
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
import {
  computeCrr,
  defaultBoardTab,
  formatCrr,
  matchesBoardTab,
  rowAwayShort,
  rowHomeShort,
  tabCounts,
  type BoardRowInput,
  type LiveBoardTab,
} from "@/lib/live-board";
import { filterProductFixtures, isDemoMatchId, openDemoPlayground } from "@/lib/truth-mode";

export type BoardRow = BoardRowInput;

const STATUS_RANK: Record<string, number> = {
  LIVE: 0,
  DEMO: 1,
  UPCOMING: 2,
  COMPLETED: 3,
  HISTORICAL: 3,
  STALE: 1,
};

const TAB_LABELS: { id: LiveBoardTab; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "upcoming", label: "Upcoming" },
  { id: "recent", label: "Recent" },
  { id: "all", label: "All" },
];

function asLifecycle(raw: string | undefined, freshness: string | undefined): MatchLifecycle {
  // Never promote DEMO → LIVE
  if (raw === "DEMO" || freshness === "DEMO") return "DEMO";
  if (raw === "LIVE" && freshness === "LIVE") return "LIVE";
  if (raw === "LIVE") return "LIVE";
  if (raw === "UPCOMING" || freshness === "UPCOMING") return "UPCOMING";
  if (raw === "COMPLETED" || freshness === "HISTORICAL") return "COMPLETED";
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
    score: f.score,
    homeName: f.homeName,
    awayName: f.awayName,
    homeShort: f.homeShort,
    awayShort: f.awayShort,
    statusLine: f.statusLine,
    provenance: f.provenance,
    isDemo: status === "DEMO" || isDemoMatchId(f.id),
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
    homeShort: m.homeShort,
    awayShort: m.awayShort,
    statusLine: m.statusLine,
    provenance: m.provenance
      ? { source: m.provenance.source, asOf: m.provenance.asOf, note: m.provenance.note }
      : undefined,
    isDemo: status === "DEMO" || isDemoMatchId(m.id),
  };
}

/**
 * Product Live Scores board: provider fixtures only.
 * Seeds / DEMO never appear here — DEMO is only via Try DEMO playground.
 */
function mergeBoard(fixtures: FixtureRow[], matches: ApiMatchRow[]): BoardRow[] {
  const productFixtures = filterProductFixtures(fixtures);
  const productMatches = filterProductFixtures(matches);
  const map = new Map<string, BoardRow>();
  for (const f of productFixtures) map.set(f.id, fromFixture(f));
  for (const m of productMatches) {
    const next = fromMatch(m);
    const prev = map.get(m.id);
    if (!prev) {
      map.set(m.id, next);
      continue;
    }
    map.set(m.id, {
      ...prev,
      ...next,
      status: next.status === "DEMO" || prev.status === "DEMO" ? "DEMO" : next.status,
      freshness:
        next.freshness === "DEMO" || prev.freshness === "DEMO" ? "DEMO" : next.freshness,
      score: next.score ?? prev.score,
      statusLine: next.statusLine ?? prev.statusLine,
      homeShort: next.homeShort ?? prev.homeShort,
      awayShort: next.awayShort ?? prev.awayShort,
      isDemo: prev.isDemo || next.isDemo,
    });
  }
  return [...map.values()]
    .filter((r) => !r.isDemo)
    .sort((a, b) => {
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
  /** Initial tab override (e.g. Live hub) */
  initialTab?: LiveBoardTab;
};

export function LiveFixturesBoard({
  selectedId,
  onSelect,
  compact = false,
  limit = 12,
  initialTab,
}: Props) {
  const health = useDataHealth();
  /** null = follow smart default from loaded rows; set when user picks a tab */
  const [tabOverride, setTabOverride] = useState<LiveBoardTab | null>(initialTab ?? null);
  const [pollLive, setPollLive] = useState(initialTab === "live");

  const fixtures = useFixtures(pollLive ? 15_000 : 0);
  const matches = useMatchList(24, pollLive ? 15_000 : 0);

  const rows = useMemo(
    () => mergeBoard(fixtures.fixtures, matches.matches),
    [fixtures.fixtures, matches.matches],
  );

  const tab: LiveBoardTab =
    tabOverride ?? (rows.length > 0 ? defaultBoardTab(rows) : "all");

  // Enable 15s polling only while Live tab is active (adjust-on-render)
  if (tab === "live" && !pollLive) setPollLive(true);
  if (tab !== "live" && pollLive) setPollLive(false);

  const counts = useMemo(() => tabCounts(rows), [rows]);
  const filtered = useMemo(() => {
    const list = rows.filter((r) => matchesBoardTab(r, tab));
    return list.slice(0, limit);
  }, [rows, tab, limit]);

  const liveCount = counts.live;
  const providerReady =
    health.status === "ok" &&
    health.summary &&
    !health.summary.demoMode &&
    health.summary.dataApiKeyConfigured;

  const loading = fixtures.status === "loading" && matches.status === "loading";
  const unavailable =
    fixtures.status === "unavailable" && matches.status === "unavailable";

  return (
    <div id="live" className="rounded-[1.75rem] border border-white/8 bg-card/40 scroll-mt-24">
      <div className={`flex flex-wrap items-end justify-between gap-3 ${compact ? "p-4" : "p-5 sm:p-6"}`}>
        <div>
          <Kicker className="text-cyan">Live Scores</Kicker>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {providerReady
              ? `Provider synced · ${liveCount} LIVE · polls every 15s on Live tab`
              : "Truth mode · add CricAPI key for live scores (no invented fixtures)"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {health.summary ? (
            <span className="tracking-[0.12em] uppercase">
              {health.summary.demoMode ? "DEMO mode" : health.summary.dataProvider}
            </span>
          ) : null}
          {tab === "live" ? (
            <span className="tabular-nums text-lime/80">auto-refresh 15s</span>
          ) : rows[0]?.provenance?.asOf ? (
            <span className="tabular-nums">as of {rows[0].provenance.asOf.slice(0, 19)}</span>
          ) : null}
        </div>
      </div>

      <div
        className="flex gap-1 overflow-x-auto border-t border-white/8 px-3 py-2 sm:px-5"
        role="tablist"
        aria-label="Fixture filters"
      >
        {TAB_LABELS.map((t) => {
          const active = tab === t.id;
          const count = counts[t.id];
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTabOverride(t.id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium tracking-wide transition ${
                active
                  ? "bg-lime/15 text-lime"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 tabular-nums ${active ? "text-lime/80" : "text-muted-foreground/70"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="border-t border-white/8 px-5 py-6 text-sm text-muted-foreground">
          Loading fixtures board…
        </p>
      ) : unavailable ? (
        <p className="border-t border-white/8 px-5 py-6 text-sm text-gold">
          Fixtures UNAVAILABLE — not claiming LIVE
        </p>
      ) : !providerReady && rows.length === 0 ? (
        <div className="border-t border-white/8 p-4 sm:p-5">
          <TruthSetupPanel compact showDemoLink />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-t border-white/8 px-5 py-6">
          <p className="text-sm text-muted-foreground">
            {tab === "live"
              ? providerReady
                ? "No in-progress matches from the provider right now."
                : "No LIVE matches without a provider key."
              : "Nothing in this filter."}
          </p>
          {!providerReady ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-3 text-gold"
              onClick={() => openDemoPlayground()}
            >
              Try DEMO playground
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="divide-y divide-white/8 border-t border-white/8">
          {filtered.map((row) => {
            const selected = selectedId === row.id;
            const home = rowHomeShort(row);
            const away = rowAwayShort(row);
            const crr = formatCrr(computeCrr(row.score));
            const mini =
              row.statusLine ??
              (row.isDemo ? "Scripted DEMO board — not a broadcast feed" : undefined);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(row)}
                  className={`flex w-full flex-col gap-2 px-4 py-3.5 text-left transition sm:px-6 ${
                    selected ? "bg-lime/10" : "hover:bg-white/4"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                      {row.series ?? row.format}
                      {row.series && row.format ? ` · ${row.format}` : ""}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={row.status} />
                      {row.freshness !== row.status ? (
                        <FreshnessBadge freshness={row.freshness} />
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-semibold tracking-tight sm:text-xl">
                        <span className="tabular-nums">{home}</span>
                        <span className="mx-1.5 text-sm font-normal text-muted-foreground">vs</span>
                        <span className="tabular-nums">{away}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {row.homeName && row.awayName
                          ? `${row.homeName} vs ${row.awayName}`
                          : row.title.replace(/ \(DEMO\)$/, "")}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground/90">
                        {row.venue}
                      </p>
                    </div>

                    <div className="text-right">
                      {row.score ? (
                        <>
                          <p className="font-display text-2xl font-semibold tabular-nums leading-none sm:text-[1.75rem]">
                            {row.score.runs}
                            <span className="text-lime">/{row.score.wickets}</span>
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-cyan">
                            {row.score.overs ? `${row.score.overs} ov` : ""}
                            {crr ? ` · CRR ${crr}` : ""}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {row.status === "UPCOMING" ? "Not started" : "—"}
                        </p>
                      )}
                    </div>
                  </div>

                  {mini ? (
                    <p className="line-clamp-1 text-xs leading-relaxed text-muted-foreground">
                      {mini}
                    </p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!compact ? (
        <div className="border-t border-white/8 px-5 py-3 sm:px-6">
          {rows[0]?.provenance ? (
            <ProvenanceStrip
              source={
                rows.find((r) => r.status === "LIVE" && !r.isDemo)?.provenance?.source ??
                rows[0].provenance.source
              }
              asOf={
                rows.find((r) => r.status === "LIVE" && !r.isDemo)?.provenance?.asOf ??
                rows[0].provenance.asOf
              }
              note={
                providerReady
                  ? "LIVE only when provider reports in-progress. Seeds and DEMO never appear on this board."
                  : "No provider key — product board stays empty. Open DEMO playground for the scripted sim."
              }
            />
          ) : null}
          {!providerReady ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/12"
                onClick={() => {
                  window.open("https://cricketdata.org/", "_blank", "noopener,noreferrer");
                }}
              >
                Add CricAPI key for live scores
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-gold"
                onClick={() => openDemoPlayground()}
              >
                Try DEMO playground
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
