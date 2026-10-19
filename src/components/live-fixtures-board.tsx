"use client";

import { useMemo, useState } from "react";
import { EmptyState, LivePill, SourceChip, StatRing } from "@/components/ui-bits";
import {
  useDataHealth,
  useFixtures,
  useMatchList,
  type ApiMatchRow,
  type FixtureRow,
} from "@/hooks/use-data-layer";
import { oversToBalls } from "@/lib/calc";
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
import { filterProductFixtures, isDemoMatchId } from "@/lib/truth-mode";

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
    // The fixture row is the fresh provider read; the stored match is a snapshot
    // from ingest time, so it only fills gaps and never overrides live scores.
    map.set(m.id, {
      ...next,
      ...prev,
      status: next.status === "DEMO" || prev.status === "DEMO" ? "DEMO" : prev.status,
      freshness:
        next.freshness === "DEMO" || prev.freshness === "DEMO" ? "DEMO" : prev.freshness,
      score: prev.score ?? next.score,
      statusLine: prev.statusLine ?? next.statusLine,
      series: prev.series ?? next.series,
      homeShort: prev.homeShort ?? next.homeShort,
      awayShort: prev.awayShort ?? next.awayShort,
      provenance: prev.provenance ?? next.provenance,
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

  const providerReady =
    health.status === "ok" &&
    health.summary &&
    !health.summary.demoMode &&
    health.summary.dataApiKeyConfigured;

  const loading = fixtures.status === "loading" && matches.status === "loading";
  const unavailable = fixtures.status === "unavailable" && matches.status === "unavailable";
  const asOf = rows.find((r) => r.status === "LIVE" && !r.isDemo)?.provenance?.asOf ?? rows[0]?.provenance?.asOf;

  return (
    <div id="live" className="scroll-mt-28">
      <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? "mb-3" : "mb-5"}`}>
        <div role="tablist" aria-label="Fixture filters" className="glass inline-flex gap-1 rounded-full p-1">
          {TAB_LABELS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTabOverride(t.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  active ? "bg-navy text-white" : "text-slate hover:text-navy"
                }`}
              >
                {t.label}
                <span className={`ml-1.5 tabular-nums ${active ? "text-white/70" : "text-mist"}`}>{counts[t.id]}</span>
              </button>
            );
          })}
        </div>
        {asOf ? <SourceChip>Live feed · as of {asOf.slice(11, 16)} UTC</SourceChip> : null}
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="glass h-36 animate-pulse rounded-[1.5rem]" />
          ))}
        </div>
      ) : unavailable ? (
        <EmptyState title="Scores are unavailable right now" detail="The live feed didn't respond. Try again in a minute." />
      ) : !providerReady && rows.length === 0 ? (
        <EmptyState title="Live scores aren't connected yet" detail="Connect a live data provider to see current and upcoming matches." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tab === "live" ? "No matches in progress" : "Nothing here yet"}
          detail={tab === "live" ? "Check Upcoming for the next fixtures." : undefined}
        />
      ) : (
        <ul className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
          {filtered.map((row) => {
            const selected = selectedId === row.id;
            const home = rowHomeShort(row);
            const away = rowAwayShort(row);
            const crr = formatCrr(computeCrr(row.score));
            const live = row.status === "LIVE";
            const scheduled = row.format === "t20" ? 20 : row.format === "odi" ? 50 : 0;
            const legal = row.score?.overs ? oversToBalls(String(row.score.overs)) : 0;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(row)}
                  className={`glass group flex h-full w-full flex-col gap-3 rounded-[1.5rem] p-4 text-left transition hover:-translate-y-0.5 sm:p-5 ${
                    selected ? "ring-2 ring-cobalt/40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[10.5px] tracking-[0.14em] text-slate uppercase">
                      {row.series ?? row.format}
                    </p>
                    {live ? (
                      <LivePill stale={row.freshness === "STALE"} />
                    ) : (
                      <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10.5px] font-medium text-slate">
                        {row.status === "UPCOMING" ? "Upcoming" : "Result"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-xl font-semibold tracking-tight text-navy">
                        {home} <span className="text-sm font-light text-mist">vs</span> {away}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate">
                        {row.homeName && row.awayName ? `${row.homeName} vs ${row.awayName}` : row.title}
                      </p>
                    </div>
                    {row.score ? (
                      live && scheduled ? (
                        <StatRing value={legal} max={scheduled * 6} size={70} label={`${row.score.overs} of ${scheduled} overs`}>
                          <div className="leading-none">
                            <p className="font-display text-base font-semibold tabular-nums text-navy">
                              {row.score.runs}/{row.score.wickets}
                            </p>
                            <p className="mt-0.5 text-[9.5px] text-slate tabular-nums">{row.score.overs} ov</p>
                          </div>
                        </StatRing>
                      ) : (
                        <div className="text-right">
                          <p className="font-display text-2xl font-semibold tabular-nums leading-none text-navy">
                            {row.score.runs}/{row.score.wickets}
                          </p>
                          <p className="mt-1 text-[11px] text-slate tabular-nums">
                            {row.score.overs ? `${row.score.overs} ov` : ""}
                            {crr ? ` · RR ${crr}` : ""}
                          </p>
                        </div>
                      )
                    ) : (
                      <p className="text-sm text-slate">{row.status === "UPCOMING" ? "Not started" : "—"}</p>
                    )}
                  </div>

                  {row.statusLine ? <p className="line-clamp-2 text-xs leading-relaxed text-slate">{row.statusLine}</p> : null}
                  {row.venue ? <p className="mt-auto truncate text-[11px] text-mist">{row.venue}</p> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
