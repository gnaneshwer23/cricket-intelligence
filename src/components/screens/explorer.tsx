"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/app-state";
import { DataStatusStrip } from "@/components/data-status-strip";
import { FreshnessBadge, KindBadge, ProvenanceStrip, StatusBadge } from "@/components/status-badge";
import { Kicker, PageTitle, Panel } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatMetric } from "@/lib/calc";
import { matchMeta } from "@/lib/data";
import {
  buildExplorerView,
  explorerInnings,
  explorerPlayers,
  graphEventForOver,
  type ExplorerFilters,
} from "@/lib/innings";

type ChartTab = "worm" | "manhattan" | "phases";

export function ExplorerScreen() {
  const { go, explorerFocus, clearExplorerFocus } = useApp();
  const [chart, setChart] = useState<ChartTab>(explorerFocus?.chart ?? "worm");
  const [filters, setFilters] = useState<ExplorerFilters>({
    matchId: matchMeta.id,
    inningsId: explorerInnings[0]?.meta.id ?? "eng-1",
    team: "all",
    player: "all",
    phaseId: "all",
  });
  const [activePoint, setActivePoint] = useState<number | null>(
    explorerFocus?.ballIndex ?? null,
  );
  const [activeOver, setActiveOver] = useState<number | null>(
    explorerFocus?.overNumber ?? null,
  );

  const view = useMemo(() => buildExplorerView(filters), [filters]);
  const highlightPlayer = filters.player;

  function openGraph(eventId?: string) {
    if (!eventId) {
      go("match");
      return;
    }
    go("match", { graphNodeId: eventId });
  }

  function openLabsFromWicket() {
    const lastWicket = [...view.worm].reverse().find((p) => p.isWicket);
    const runs = lastWicket?.cumulativeRuns ?? view.totals.runs;
    const ballsFaced = lastWicket?.ballIndex ?? view.totals.balls;
    go("labs", {
      labsSeed: {
        source: "match-graph",
        label: lastWicket?.eventLabel ?? "Revised after wicket",
        runsRequired: Math.max(0, 350 - runs),
        ballsRemaining: Math.max(0, 540 - ballsFaced),
        wicketsInHand: Math.max(0, 10 - (lastWicket?.wickets ?? view.totals.wickets)),
        currentRuns: runs,
        ballsFaced,
        assumedRpo: 3.8,
        observedNote: `Observed DEMO score ${runs}/${lastWicket?.wickets ?? view.totals.wickets} at ${lastWicket?.overs ?? view.totals.overs}.`,
      },
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        kicker="Cricket Explorer · DEMO"
        title="See how the innings was built."
        lede="Scoring progression, Manhattan, and phase rates from the bundled Lord’s series — not a live feed. Click a point to open Match Graph evidence."
      />

      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status="DEMO" />
          <FreshnessBadge freshness="DEMO" />
          <KindBadge kind="demo" />
        </div>
        <DataStatusStrip />
        <ProvenanceStrip
          source={matchMeta.provenance.source}
          asOf={matchMeta.provenance.asOf}
          note="Charts use authored over summaries tied to the DEMO scorecard."
        />
      </div>

      <Panel className="mb-4 border-border/80">
        <Kicker>Historical / multi-match</Kicker>
        <p className="mt-2 text-sm text-muted-foreground">
          Search and compare use the normalised match service (`/api/matches`). Only the Lord’s DEMO
          board has an authored over series for worm/Manhattan. Other matches show an empty state —
          second innings, wagon wheels, and missing series are never fabricated.
        </p>
        <HistoricalMatchPanel
          activeMatchId={filters.matchId}
          onSelectDemo={() =>
            setFilters((f) => ({
              ...f,
              matchId: matchMeta.id,
              inningsId: explorerInnings[0]?.meta.id ?? "eng-1",
            }))
          }
        />
      </Panel>

      {explorerFocus ? (
        <Panel className="mb-4 border-lime/30 bg-lime/5">
          <p className="text-sm">
            Opened from {explorerFocus.from ?? "another surface"}
            {explorerFocus.overNumber ? ` · over ${explorerFocus.overNumber}` : null}.
          </p>
          <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={clearExplorerFocus}>
            Clear focus
          </Button>
        </Panel>
      ) : null}

      <Panel className="mb-4">
        <Kicker>Filters</Kicker>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm">
            <span className="text-muted-foreground">Match</span>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              value={filters.matchId}
              onChange={(e) => setFilters((f) => ({ ...f, matchId: e.target.value }))}
            >
              <option value={matchMeta.id}>{matchMeta.title}</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Innings</span>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              value={filters.inningsId}
              onChange={(e) => setFilters((f) => ({ ...f, inningsId: e.target.value }))}
            >
              {explorerInnings.map((inn) => (
                <option key={inn.meta.id} value={inn.meta.id}>
                  {inn.meta.battingTeamName} {inn.meta.innings}
                  {inn.meta.innings === 1 ? "st" : "nd"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Team</span>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              value={filters.team}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  team: e.target.value as ExplorerFilters["team"],
                }))
              }
            >
              <option value="all">All</option>
              <option value="england">England</option>
              <option value="india">India</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Player (events)</span>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              value={filters.player}
              onChange={(e) => setFilters((f) => ({ ...f, player: e.target.value }))}
            >
              <option value="all">All</option>
              {explorerPlayers.map((p) => (
                <option key={p.id} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Phase</span>
            <select
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              value={filters.phaseId}
              onChange={(e) => setFilters((f) => ({ ...f, phaseId: e.target.value }))}
            >
              <option value="all">Full innings</option>
              {view.bands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Format: Test — phase bands are session / over-range (not powerplay / death). Competition:{" "}
          {matchMeta.series}.
        </p>
      </Panel>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Explorer charts">
        {(
          [
            ["worm", "Scoring progression"],
            ["manhattan", "Manhattan"],
            ["phases", "Run-rate / phases"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            role="tab"
            aria-selected={chart === id}
            variant={chart === id ? "default" : "secondary"}
            onClick={() => setChart(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Metric tip="Cumulative runs in the filtered series" label="Runs" value={String(view.totals.runs)} />
        <Metric tip="Wickets fallen in the filtered series" label="Wickets" value={String(view.totals.wickets)} />
        <Metric tip="Cricket overs (balls÷6 with remainder)" label="Overs" value={view.totals.overs} />
        <Metric tip="Runs per over = runs × 6 ÷ balls" label="RPO" value={formatMetric(view.totals.rpo)} />
      </div>

      {view.emptyReason ? (
        <Panel>
          <Kicker>Empty</Kicker>
          <p className="mt-2 text-sm text-muted-foreground">{view.emptyReason}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setFilters((f) => ({ ...f, team: "all", phaseId: "all" }))}>
              Reset filters
            </Button>
            <Button type="button" variant="secondary" onClick={() => go("match")}>
              Open Match Room
            </Button>
          </div>
        </Panel>
      ) : (
        <>
          {chart === "worm" ? (
            <Panel>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <Kicker>Scoring progression · runs vs deliveries</Kicker>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Units: cumulative runs (y) vs legal balls (x). Boundaries and wickets highlighted.
                  </p>
                </div>
                <StatusBadge status="DEMO" />
              </div>
              <WormChart
                points={view.worm}
                active={activePoint}
                highlightPlayer={highlightPlayer}
                onSelect={(idx, graphId) => {
                  setActivePoint(idx);
                  if (graphId) openGraph(graphId);
                }}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => go("ask", { seedAsk: "Which over scored the most runs?" })}>
                  Ask Copilot
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => go("match")}>
                  Match Room
                </Button>
              </div>
            </Panel>
          ) : null}

          {chart === "manhattan" ? (
            <Panel>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <Kicker>Manhattan · runs per over</Kicker>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Units: runs in the over. Markers show wickets; click an over for Match Graph.
                  </p>
                </div>
                {!view.compare ? (
                  <p className="text-xs text-muted-foreground">Innings compare unavailable — India innings not in DEMO file.</p>
                ) : null}
              </div>
              <ManhattanChart
                overs={view.manhattan}
                active={activeOver}
                onSelect={(overNumber) => {
                  setActiveOver(overNumber);
                  const gid = view.innings ? graphEventForOver(view.innings, overNumber) : undefined;
                  openGraph(gid);
                }}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={openLabsFromWicket}>
                  What-If from last wicket
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => go("ask", { seedAsk: "Compare phase run rates in this innings" })}>
                  Ask Copilot
                </Button>
              </div>
            </Panel>
          ) : null}

          {chart === "phases" ? (
            <Panel>
              <Kicker>Run-rate / phase analysis · Test bands</Kicker>
              <p className="mt-1 text-sm text-muted-foreground">
                Powerplay / middle / death apply to limited overs only — this DEMO is a Test, so bands are over-ranges and session blocks.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th className="pb-2 font-medium">Phase</th>
                      <th className="pb-2 font-medium">Runs</th>
                      <th className="pb-2 font-medium">Overs</th>
                      <th className="pb-2 font-medium">RPO</th>
                      <th className="pb-2 font-medium">Wkts</th>
                      <th className="pb-2 font-medium">4s / 6s</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.phaseRows.map((row) => (
                      <tr key={row.band.id} className="border-t border-border">
                        <td className="py-2.5">{row.band.label}</td>
                        <td className="py-2.5 tabular-nums">{row.runs}</td>
                        <td className="py-2.5 tabular-nums">{row.overs}</td>
                        <td className="py-2.5 tabular-nums">{formatMetric(row.rpo)}</td>
                        <td className="py-2.5 tabular-nums">{row.wickets}</td>
                        <td className="py-2.5 tabular-nums">
                          {row.fours} / {row.sixes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6">
                <Kicker>Session model table (expected vs scored)</Kicker>
                <ul className="mt-3 space-y-2">
                  {view.phaseTable.map((row) => {
                    const delta = row.scored - row.expected;
                    return (
                      <li
                        key={row.label}
                        className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl bg-muted/40 px-3 py-2 text-sm"
                      >
                        <span>{row.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {row.scored} vs {row.expected}{" "}
                          <span className={delta > 0 ? "text-lime" : delta < 0 ? "text-gold" : ""}>
                            ({delta > 0 ? `+${delta}` : delta})
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => go("ask", { seedAsk: "How did the run rate change by phase?" })}
                >
                  Ask Copilot about phases
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => go("match", { graphNodeId: "evt-phase-22-30" })}>
                  Open surge on Match Graph
                </Button>
              </div>
            </Panel>
          ) : null}
        </>
      )}
    </div>
  );
}

function Metric({ label, value, tip }: { label: string; value: string; tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="rounded-2xl border border-border bg-card/80 px-4 py-3">
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
          <p className="font-display mt-1 text-2xl tabular-nums">{value}</p>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

function WormChart({
  points,
  active,
  highlightPlayer,
  onSelect,
}: {
  points: ReturnType<typeof buildExplorerView>["worm"];
  active: number | null;
  highlightPlayer: string;
  onSelect: (ballIndex: number, graphEventId?: string) => void;
}) {
  if (!points.length) {
    return <p className="mt-6 text-sm text-muted-foreground">No deliveries to plot.</p>;
  }
  const w = 720;
  const h = 280;
  const pad = { l: 44, r: 16, t: 16, b: 36 };
  const maxX = points[points.length - 1]?.ballIndex ?? 1;
  const maxY = Math.max(...points.map((p) => p.cumulativeRuns), 1);
  const x = (ball: number) => pad.l + ((ball - 1) / Math.max(1, maxX - 1)) * (w - pad.l - pad.r);
  const y = (runs: number) => pad.t + (1 - runs / maxY) * (h - pad.t - pad.b);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.ballIndex)} ${y(p.cumulativeRuns)}`).join(" ");
  const activePt = active !== null ? points.find((p) => p.ballIndex === active) : null;

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto w-full"
        role="img"
        aria-label="Cumulative scoring worm chart"
      >
        <title>Cumulative runs versus deliveries</title>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const yy = pad.t + (1 - t) * (h - pad.t - pad.b);
          const label = Math.round(maxY * t);
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={yy} y2={yy} stroke="currentColor" className="text-border" strokeWidth={1} />
              <text x={pad.l - 8} y={yy + 4} textAnchor="end" className="fill-muted-foreground" fontSize={11}>
                {label}
              </text>
            </g>
          );
        })}
        <path d={d} fill="none" stroke="currentColor" className="text-lime" strokeWidth={2.5} />
        {points.map((p) => {
          const playerHit =
            highlightPlayer !== "all" &&
            (p.eventLabel?.toLowerCase().includes(highlightPlayer.toLowerCase()) ?? false);
          const r = p.isWicket ? 5 : p.isBoundary ? 4 : playerHit ? 3.5 : 0;
          if (r === 0 && active !== p.ballIndex) return null;
          return (
            <circle
              key={p.ballIndex}
              cx={x(p.ballIndex)}
              cy={y(p.cumulativeRuns)}
              r={active === p.ballIndex ? r + 2 : r || 3}
              className={
                p.isWicket
                  ? "fill-gold"
                  : p.isBoundary
                    ? "fill-lime"
                    : playerHit
                      ? "fill-eng"
                      : "fill-muted-foreground"
              }
              tabIndex={0}
              role="button"
              aria-label={`Over ${p.overs}, ${p.cumulativeRuns} runs, ${p.wickets} wickets${p.eventLabel ? `, ${p.eventLabel}` : ""}`}
              onClick={() => onSelect(p.ballIndex, p.graphEventId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(p.ballIndex, p.graphEventId);
                }
              }}
            >
              <title>
                {p.overs} ov · {p.cumulativeRuns}/{p.wickets}
                {p.eventLabel ? ` · ${p.eventLabel}` : ""}
                {p.isBoundary ? " · boundary" : ""}
              </title>
            </circle>
          );
        })}
        {/* Invisible denser hit targets every ~6 balls for keyboard list below */}
        <text x={w / 2} y={h - 8} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
          Deliveries (legal balls)
        </text>
        <text
          x={14}
          y={h / 2}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={11}
          transform={`rotate(-90 14 ${h / 2})`}
        >
          Cumulative runs
        </text>
      </svg>
      {activePt ? (
        <p className="mt-2 rounded-2xl bg-muted/50 px-3 py-2 text-sm" aria-live="polite">
          <span className="font-medium">{activePt.overs} ov</span>
          {" · "}
          {activePt.cumulativeRuns}/{activePt.wickets}
          {activePt.eventLabel ? ` · ${activePt.eventLabel}` : null}
          {activePt.graphEventId ? " · linked to Match Graph" : null}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Hover or focus a marker · gold = wicket · lime = boundary. Click opens Match Graph when linked.
        </p>
      )}
      <div className="mt-3 flex max-h-28 flex-wrap gap-1 overflow-y-auto">
        {points
          .filter((p) => p.isWicket || p.isBoundary || p.graphEventId)
          .map((p) => (
            <button
              key={`chip-${p.ballIndex}`}
              type="button"
              className="rounded-lg border border-border px-2 py-1 text-[11px] hover:border-lime/40 focus-visible:ring-2 focus-visible:ring-lime"
              onClick={() => onSelect(p.ballIndex, p.graphEventId)}
            >
              {p.overs}
              {p.isWicket ? " W" : ""}
              {p.isBoundary ? " ▲" : ""}
            </button>
          ))}
      </div>
    </div>
  );
}

function ManhattanChart({
  overs,
  active,
  onSelect,
}: {
  overs: ReturnType<typeof buildExplorerView>["manhattan"];
  active: number | null;
  onSelect: (overNumber: number) => void;
}) {
  if (!overs.length) {
    return <p className="mt-6 text-sm text-muted-foreground">No overs to plot.</p>;
  }
  const w = 720;
  const h = 260;
  const pad = { l: 44, r: 12, t: 16, b: 36 };
  const maxY = Math.max(...overs.map((o) => o.runs), 1);
  const bw = (w - pad.l - pad.r) / overs.length;

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Manhattan runs per over">
        <title>Runs per over</title>
        {overs.map((over, i) => {
          const barH = (over.runs / maxY) * (h - pad.t - pad.b);
          const x = pad.l + i * bw;
          const y = pad.t + (h - pad.t - pad.b) - barH;
          const selected = active === over.overNumber;
          return (
            <g key={over.overNumber}>
              <rect
                x={x + 1}
                y={y}
                width={Math.max(2, bw - 2)}
                height={Math.max(barH, over.runs === 0 ? 0 : 2)}
                className={selected ? "fill-lime" : "fill-eng/80"}
                tabIndex={0}
                role="button"
                aria-label={`Over ${over.overNumber}: ${over.runs} runs, ${over.wickets} wickets`}
                onClick={() => onSelect(over.overNumber)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(over.overNumber);
                  }
                }}
              >
                <title>
                  Over {over.overNumber}: {over.runs} runs
                  {over.wickets ? `, ${over.wickets} wicket(s)` : ""}
                  {over.fours || over.sixes ? `, ${over.fours} fours, ${over.sixes} sixes` : ""}
                </title>
              </rect>
              {over.wickets > 0 ? (
                <circle cx={x + bw / 2} cy={y - 6} r={3.5} className="fill-gold" />
              ) : null}
            </g>
          );
        })}
        <text x={w / 2} y={h - 8} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
          Over number
        </text>
        <text
          x={14}
          y={h / 2}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={11}
          transform={`rotate(-90 14 ${h / 2})`}
        >
          Runs in over
        </text>
      </svg>
      {active !== null ? (
        <p className="mt-2 text-sm" aria-live="polite">
          Over {active}:{" "}
          {overs.find((o) => o.overNumber === active)?.runs ?? "—"} runs
          {overs.find((o) => o.overNumber === active)?.events[0]?.label
            ? ` · ${overs.find((o) => o.overNumber === active)?.events[0]?.label}`
            : null}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Click or focus a bar · gold dots mark wickets.</p>
      )}
    </div>
  );
}

type ApiMatchRow = {
  id: string;
  title: string;
  freshness: string;
  venue: string;
  format: string;
  score?: { runs: number; wickets: number; overs: string };
  provenance?: { source: string; asOf: string };
};

function HistoricalMatchPanel({
  activeMatchId,
  onSelectDemo,
}: {
  activeMatchId: string;
  onSelectDemo: () => void;
}) {
  const [rows, setRows] = useState<ApiMatchRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string>("");
  const [compareNote, setCompareNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/matches?limit=20")
      .then((r) => r.json())
      .then((json: { ok: boolean; matches?: ApiMatchRow[]; error?: string }) => {
        if (cancelled) return;
        if (!json.ok) {
          setError(json.error ?? "Failed to load matches");
          return;
        }
        setRows(json.matches ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load matches");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function runCompare() {
    if (!compareId) return;
    setCompareNote(null);
    const res = await fetch(`/api/matches/${activeMatchId}?compare=${encodeURIComponent(compareId)}`);
    const json = (await res.json()) as {
      ok: boolean;
      comparison?: {
        notes: string[];
        comparable: { scoreLeft?: string; scoreRight?: string; formatSame: boolean };
      };
      error?: string;
    };
    if (!json.ok || !json.comparison) {
      setCompareNote(json.error ?? "Comparison unavailable");
      return;
    }
    const c = json.comparison;
    setCompareNote(
      [
        c.comparable.scoreLeft ? `Left: ${c.comparable.scoreLeft}` : "Left: no score",
        c.comparable.scoreRight ? `Right: ${c.comparable.scoreRight}` : "Right: no score",
        c.comparable.formatSame ? "Format matches" : "Format differs",
        ...c.notes,
      ].join(" · "),
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {error ? <p className="text-sm text-gold">{error}</p> : null}
      <ul className="space-y-2 text-sm">
        {rows.map((m) => {
          const hasCharts = m.id === matchMeta.id;
          return (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2"
            >
              <div>
                <p className="font-medium text-foreground">{m.title}</p>
                <p className="text-xs text-muted-foreground">
                  {m.venue} · {m.format} · {m.freshness}
                  {m.score ? ` · ${m.score.runs}/${m.score.wickets}` : " · no score"}
                </p>
                {!hasCharts ? (
                  <p className="text-xs text-muted-foreground">
                    Empty state: no over series for Explorer charts (not fabricated).
                  </p>
                ) : null}
              </div>
              {hasCharts ? (
                <Button type="button" size="sm" variant="secondary" onClick={onSelectDemo}>
                  Use for charts
                </Button>
              ) : (
                <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Charts unavailable
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="text-muted-foreground">Compare with match id</span>
          <input
            className="mt-1 block w-64 rounded-xl border border-border bg-background px-3 py-2"
            value={compareId}
            onChange={(e) => setCompareId(e.target.value)}
            placeholder={matchMeta.id}
          />
        </label>
        <Button type="button" size="sm" onClick={() => void runCompare()}>
          Compare
        </Button>
      </div>
      {compareNote ? <p className="text-xs text-muted-foreground">{compareNote}</p> : null}
    </div>
  );
}
