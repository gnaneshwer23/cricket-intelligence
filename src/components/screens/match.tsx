"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/app-state";
import { LiveCommentary } from "@/components/live-commentary";
import { LiveFixturesBoard, type BoardRow } from "@/components/live-fixtures-board";
import { LiveScoreStrip } from "@/components/live-score-strip";
import { DataStatusStrip } from "@/components/data-status-strip";
import { DemoPlaygroundBanner } from "@/components/demo-playground-banner";
import { TruthSetupPanel } from "@/components/truth-setup-panel";
import {
  FreshnessBadge,
  KindBadge,
  ProvenanceStrip,
  StatusBadge,
} from "@/components/status-badge";
import { Kicker, Meter, Panel, WinSplit } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDataHealth, useMatchList } from "@/hooks/use-data-layer";
import { useLiveMatch } from "@/hooks/use-live-match";
import { analysePhases, applyWinSwing, strikeRate } from "@/lib/calc";
import type { FreshnessStatus, MatchLifecycle } from "@/lib/contracts";
import {
  batting,
  bowling,
  fieldPlans,
  matchMeta,
  matchPredictions,
  matchReport,
  matchups,
  phases,
  simScript,
} from "@/lib/data";
import {
  getGraphNode,
  matchGraphNodes,
  matchEvidence,
  outgoing,
  type MatchGraphNode,
} from "@/lib/match-graph";
import { clamp, MOODS, moodBreakdown } from "@/lib/format";
import type { MatchFocus } from "@/lib/types";
import {
  DEMO_PLAYGROUND_ID,
  DEMO_PLAYGROUND_STORAGE_KEY,
  isDemoMatchId,
  isDemoPlaygroundHash,
  isSeedMatchId,
  openDemoPlayground,
} from "@/lib/truth-mode";

const graphKindLabel: Record<MatchGraphNode["kind"], string> = {
  event: "Event",
  player: "Player",
  consequence: "Consequence",
  scenario: "Scenario",
};

function enterDemoPlaygroundSelection(): BoardRow {
  return {
    id: DEMO_PLAYGROUND_ID,
    title: `${matchMeta.title} (DEMO)`,
    status: "DEMO",
    freshness: "DEMO",
    venue: matchMeta.venue,
    format: "test",
    series: matchMeta.series,
    score: matchMeta.score,
    homeName: "England",
    awayName: "India",
    isDemo: true,
    provenance: {
      source: matchMeta.provenance.source,
      asOf: matchMeta.provenance.asOf,
      note: matchMeta.provenance.note,
    },
  };
}

function boardRowToFocus(row: BoardRow): MatchFocus {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    freshness: row.freshness,
    venue: row.venue,
    format: row.format,
    series: row.series,
    score: row.score,
    homeName: row.homeName,
    awayName: row.awayName,
    isDemo: Boolean(row.isDemo) || isDemoMatchId(row.id),
    isSeed: isSeedMatchId(row.id),
    provenance: row.provenance,
  };
}

function focusToBoardRow(focus: MatchFocus): BoardRow {
  return {
    id: focus.id,
    title: focus.title,
    status: focus.status as MatchLifecycle,
    freshness: focus.freshness as FreshnessStatus,
    venue: focus.venue ?? "",
    format: focus.format ?? "",
    series: focus.series,
    score: focus.score,
    homeName: focus.homeName,
    awayName: focus.awayName,
    isDemo: focus.isDemo,
    provenance: focus.provenance
      ? {
          source: focus.provenance.source,
          asOf: focus.provenance.asOf ?? focus.freshness,
          note: focus.provenance.note,
        }
      : undefined,
  };
}

export function MatchScreen() {
  const { mood, react, go, graphNodeId, clearGraphNodeId, matchFocus, setMatchFocus } = useApp();
  const live = useLiveMatch();
  const health = useDataHealth();
  const archive = useMatchList(40);
  const providerReady =
    health.status === "ok" &&
    health.summary &&
    !health.summary.demoMode &&
    health.summary.dataApiKeyConfigured;

  const [playground, setPlayground] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return (
        isDemoPlaygroundHash() ||
        sessionStorage.getItem(DEMO_PLAYGROUND_STORAGE_KEY) === "1"
      );
    } catch {
      return isDemoPlaygroundHash();
    }
  });

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      if (isDemoPlaygroundHash() || sessionStorage.getItem(DEMO_PLAYGROUND_STORAGE_KEY) === "1") {
        return DEMO_PLAYGROUND_ID;
      }
      if (matchFocus?.id) return matchFocus.id;
      const pick = sessionStorage.getItem("cricketos-match-pick");
      // Keep pick for return navigation — do not one-shot remove
      if (pick === DEMO_PLAYGROUND_ID || pick?.startsWith("demo-")) {
        sessionStorage.setItem(DEMO_PLAYGROUND_STORAGE_KEY, "1");
        return pick;
      }
      return pick;
    } catch {
      return null;
    }
  });
  const [selectedRow, setSelectedRow] = useState<BoardRow | null>(() => {
    if (playground) return enterDemoPlaygroundSelection();
    if (matchFocus && !matchFocus.isDemo) return focusToBoardRow(matchFocus);
    return null;
  });
  const [planId, setPlanId] = useState(fieldPlans[0].id);
  const [side, setSide] = useState<"england" | "india">("england");
  const [noted, setNoted] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const [running, setRunning] = useState(false);
  const [graphId, setGraphId] = useState(matchGraphNodes[0].id);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [tab, setTab] = useState("situation");
  const [appliedGraphNode, setAppliedGraphNode] = useState<string | null>(null);
  const [detailMissing, setDetailMissing] = useState<{
    ballByBall: boolean;
    secondInnings: boolean;
    battingRows: number;
  } | null>(null);

  useEffect(() => {
    function syncHash() {
      if (!isDemoPlaygroundHash()) return;
      try {
        sessionStorage.setItem(DEMO_PLAYGROUND_STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      const row = enterDemoPlaygroundSelection();
      setPlayground(true);
      setSelectedMatchId(DEMO_PLAYGROUND_ID);
      setSelectedRow(row);
      setMatchFocus(boardRowToFocus(row));
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [setMatchFocus]);

  // Sync from shared focus when returning from Ask / Labs / Players (adjust-on-render).
  if (matchFocus && matchFocus.id !== selectedMatchId) {
    if (matchFocus.isDemo) {
      setPlayground(true);
      setSelectedMatchId(matchFocus.id);
      setSelectedRow(enterDemoPlaygroundSelection());
    } else {
      setPlayground(false);
      setSelectedMatchId(matchFocus.id);
      setSelectedRow(focusToBoardRow(matchFocus));
    }
  }

  // Load honest missing fields for non-DEMO selections
  useEffect(() => {
    if (!selectedMatchId || playground) return;
    let cancelled = false;
    fetch(`/api/matches/${encodeURIComponent(selectedMatchId)}`)
      .then((r) => r.json())
      .then((body: {
        ok?: boolean;
        scorecard?: { batting?: Record<string, unknown[]> };
        missing?: { ballByBall?: boolean; secondInnings?: boolean };
      }) => {
        if (cancelled || !body?.ok) return;
        const battingMap = body.scorecard?.batting ?? {};
        const battingRows = Object.values(battingMap).reduce(
          (n, rows) => n + (Array.isArray(rows) ? rows.length : 0),
          0,
        );
        setDetailMissing({
          ballByBall: Boolean(body.missing?.ballByBall),
          secondInnings: Boolean(body.missing?.secondInnings),
          battingRows,
        });
      })
      .catch(() => {
        /* keep prior detailMissing */
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMatchId, playground]);

  const shownDetailMissing =
    selectedMatchId && !playground ? detailMissing : null;

  const showDemoIntel =
    playground &&
    (selectedMatchId === matchMeta.id ||
      selectedMatchId === "demo-eng-ind-lords-d2" ||
      (selectedRow?.isDemo ?? false));

  const archiveRows = useMemo(() => {
    if (archive.status !== "ok") return [];
    return archive.matches
      .filter((m) => isSeedMatchId(m.id) && m.freshness !== "DEMO")
      .slice(0, 8);
  }, [archive.status, archive.matches]);

  function pickMatch(row: BoardRow) {
    if (row.isDemo) {
      try {
        sessionStorage.setItem(DEMO_PLAYGROUND_STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      setPlayground(true);
    } else {
      try {
        sessionStorage.removeItem(DEMO_PLAYGROUND_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setPlayground(false);
    }
    setSelectedMatchId(row.id);
    setSelectedRow(row);
    setMatchFocus(boardRowToFocus(row));
  }

  function pickArchive(m: {
    id: string;
    title: string;
    status: string;
    freshness: string;
    venue: string;
    format: string;
    series?: string;
    score?: { runs: number; wickets: number; overs: string };
    homeName?: string;
    awayName?: string;
    provenance?: { source: string; asOf?: string; note?: string };
  }) {
    pickMatch({
      id: m.id,
      title: m.title,
      status: m.status as MatchLifecycle,
      freshness: m.freshness as FreshnessStatus,
      venue: m.venue,
      format: m.format,
      series: m.series,
      score: m.score,
      homeName: m.homeName,
      awayName: m.awayName,
      isDemo: false,
      provenance: m.provenance
        ? {
            source: m.provenance.source,
            asOf: m.provenance.asOf ?? m.freshness,
            note: m.provenance.note,
          }
        : undefined,
    });
  }

  // Apply deep-link from Explorer / Copilot when graphNodeId changes (React-recommended adjust-on-render).
  if (graphNodeId && graphNodeId !== appliedGraphNode) {
    const node = getGraphNode(graphNodeId);
    setAppliedGraphNode(graphNodeId);
    if (node) {
      setGraphId(node.id);
      setEvidenceId(node.evidenceIds?.[0] ?? null);
      setTab("graph");
    }
    queueMicrotask(() => clearGraphNodeId());
  }
  const plan = fieldPlans.find((item) => item.id === planId) ?? fieldPlans[0];
  const played = simScript.slice(0, step + 1);
  const simRuns = matchMeta.score.runs + played.reduce((sum, event) => sum + event.runs, 0);
  const simWickets = matchMeta.score.wickets + played.reduce((sum, event) => sum + event.wickets, 0);
  const swing = played.reduce((sum, event) => sum + event.swing, 0);
  const { eng, ind } = applyWinSwing(matchMeta.winModel.eng, swing);
  const moods = moodBreakdown(mood[side]);
  const phaseRows = useMemo(() => analysePhases(phases), []);
  const graphNode = getGraphNode(graphId) ?? matchGraphNodes[0];
  const nextLinks = outgoing(graphId);
  const selectedEvidence = matchEvidence.find((item) => item.id === evidenceId) ?? null;

  const finished = step >= simScript.length - 1;
  useEffect(() => {
    if (!running || finished) return;
    const id = window.setTimeout(() => setStep((current) => current + 1), 800);
    return () => window.clearTimeout(id);
  }, [running, finished, step]);

  const focusAsk =
    showDemoIntel
      ? "What is the situation in this DEMO match?"
      : selectedRow
        ? `What do we know about ${selectedRow.title}?`
        : providerReady
          ? "What fixtures are available?"
          : "What data do you have?";

  return (
    <div className="mx-auto max-w-6xl cos-match-enter">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <Kicker className="text-cyan">
            {showDemoIntel
              ? "DEMO playground · Match Intelligence"
              : "Match Intelligence"}
          </Kicker>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {showDemoIntel
              ? `${matchMeta.title} (DEMO)`
              : selectedRow?.title ?? "Select a match"}
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            {showDemoIntel
              ? "Quarantined scripted session — watermarked DEMO, never labelled LIVE. Progressive: situation → timeline → evidence → Ask → What-If."
              : providerReady
                ? "Provider fixtures only · what happened, source, freshness — no invented filler."
                : "Truth mode: pick the DEMO playground for a full E2E path, or browse the labelled historical archive. No invented live scores."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showDemoIntel ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cos-cta border-border"
              onClick={() =>
                go("explorer", { explorerFocus: { chart: "worm", from: "DEMO playground" } })
              }
            >
              DEMO Explorer charts
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-border"
            onClick={() => go("archive")}
          >
            Historical Archive
          </Button>
          <Button
            type="button"
            size="sm"
            className="cos-cta"
            onClick={() =>
              go("ask", {
                seedAsk: focusAsk,
                mode: showDemoIntel ? "predictions" : "general",
              })
            }
          >
            Ask CricketOS
          </Button>
        </div>
      </header>

      {showDemoIntel ? <DemoPlaygroundBanner /> : null}

      {!showDemoIntel ? (
        <>
          <LiveFixturesBoard
            selectedId={selectedMatchId}
            onSelect={pickMatch}
            limit={14}
            initialTab="all"
          />
          <div className="mt-3">
            <DataStatusStrip />
          </div>

          {!providerReady ? (
            <Panel className="mt-4 border-border bg-card/40">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <Kicker className="text-gold">Historical archive · labelled</Kicker>
                <Button type="button" size="sm" variant="secondary" onClick={() => go("archive")}>
                  Full filters
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Seeded completed / upcoming rows for Match Intelligence browsing. Not live truth —
                quarantined from Copilot evidence. Prefer DEMO playground for event → evidence →
                What-If.
              </p>
              {archive.status === "loading" ? (
                <p className="mt-3 text-sm text-muted-foreground">Loading archive…</p>
              ) : archiveRows.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No archive rows available in this session.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-border">
                  {archiveRows.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        className={`flex w-full flex-wrap items-baseline justify-between gap-2 py-3 text-left transition hover:text-action ${
                          selectedMatchId === m.id ? "text-action" : ""
                        }`}
                        onClick={() => pickArchive(m)}
                      >
                        <span className="min-w-0">
                          <span className="block font-medium tracking-tight">{m.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {m.venue}
                            {m.series ? ` · ${m.series}` : ""}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <FreshnessBadge freshness={m.freshness as FreshnessStatus} />
                          {m.score ? (
                            <span className="font-mono text-xs tabular-nums">
                              {m.score.runs}/{m.score.wickets}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                Or{" "}
                <button
                  type="button"
                  className="text-gold underline-offset-2 hover:underline"
                  onClick={() => openDemoPlayground()}
                >
                  open DEMO playground
                </button>{" "}
                for the full intelligence workspace.
              </p>
            </Panel>
          ) : null}
        </>
      ) : null}

      {!providerReady && !showDemoIntel && !selectedMatchId ? (
        <div className="mt-6">
          <TruthSetupPanel showDemoLink />
        </div>
      ) : null}

      {providerReady && !selectedMatchId && !showDemoIntel ? (
        <Panel className="mt-6 border-border bg-card/40">
          <Kicker>Select a fixture</Kicker>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a provider row above for scores and provenance. Optional:{" "}
            <button
              type="button"
              className="text-gold underline-offset-2 hover:underline"
              onClick={() => openDemoPlayground()}
            >
              Try DEMO playground
            </button>
            .
          </p>
        </Panel>
      ) : null}

      {selectedMatchId && !showDemoIntel && selectedRow ? (
        <div className="mt-6 space-y-4">
          <Panel className="border-border bg-card/40">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selectedRow.status} />
              <FreshnessBadge freshness={selectedRow.freshness} />
              {selectedRow.isDemo ? null : isSeedMatchId(selectedRow.id) ? (
                <span className="text-[10px] tracking-[0.14em] text-gold uppercase">
                  Seed archive
                </span>
              ) : (
                <span className="text-[10px] tracking-[0.14em] text-blue uppercase">
                  Provider
                </span>
              )}
            </div>
            <h2 className="font-display mt-3 text-2xl tracking-tight">{selectedRow.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {[selectedRow.homeName, selectedRow.awayName].filter(Boolean).join(" vs ") ||
                selectedRow.title}
              {selectedRow.series ? ` · ${selectedRow.series}` : ""}
              {selectedRow.venue ? ` · ${selectedRow.venue}` : ""}
              {selectedRow.format ? ` · ${selectedRow.format}` : ""}
            </p>
            {selectedRow.score ? (
              <p className="font-display mt-4 text-5xl font-semibold tabular-nums">
                {selectedRow.score.runs}
                <span className="text-lime">/{selectedRow.score.wickets}</span>
                {selectedRow.score.overs ? (
                  <span className="ml-3 font-mono text-base text-blue">
                    {selectedRow.score.overs} ov
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                {selectedRow.status === "UPCOMING"
                  ? "No ball in play yet — fixture prior only."
                  : "Scorecard detail not in this row."}
              </p>
            )}
            {selectedRow.provenance ? (
              <div className="mt-4">
                <ProvenanceStrip
                  source={selectedRow.provenance.source}
                  asOf={selectedRow.provenance.asOf}
                  note={selectedRow.provenance.note}
                />
              </div>
            ) : null}
          </Panel>

          <Panel className="border-border bg-card/30">
            <Kicker>Situation</Kicker>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {selectedRow.status === "UPCOMING"
                ? "Upcoming fixture — no innings situation yet. Supported facts: teams, venue, series, scheduled status."
                : selectedRow.score
                  ? `Supported scoreline ${selectedRow.score.runs}/${selectedRow.score.wickets}${
                      selectedRow.score.overs ? ` at ${selectedRow.score.overs}` : ""
                    }. Freshness ${selectedRow.freshness}.`
                  : "No supported scoreline in this row."}
            </p>
            {shownDetailMissing ? (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                <li>
                  · Batting rows:{" "}
                  {shownDetailMissing.battingRows > 0
                    ? `${shownDetailMissing.battingRows} available`
                    : "unavailable (empty scorecard detail)"}
                </li>
                <li>
                  · Ball-by-ball:{" "}
                  {shownDetailMissing.ballByBall ? "unavailable" : "present in storage"}
                </li>
                <li>
                  · Second innings:{" "}
                  {shownDetailMissing.secondInnings ? "not in dataset" : "present"}
                </li>
                <li>· Timeline / Match Graph: DEMO playground only in this build</li>
              </ul>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Checking `/api/matches/:id` for supported fields…
              </p>
            )}
          </Panel>

          <Panel className="border-border bg-card/30">
            <Kicker>Continue</Kicker>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask with this match in focus, or open a transparent What-If with stated assumptions.
              Seed rows are not used as Copilot live evidence.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="cos-cta"
                onClick={() =>
                  go("ask", {
                    seedAsk: isSeedMatchId(selectedRow.id)
                      ? "What data do you have?"
                      : focusAsk,
                  })
                }
              >
                Ask about this match
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  go("labs", {
                    labsSeed: {
                      source: "manual",
                      label: selectedRow.title,
                      runsRequired: 105,
                      ballsRemaining: 120,
                      wicketsInHand: 7,
                      currentRuns: selectedRow.score?.runs,
                      assumedRpo: 4.5,
                      observedNote: selectedRow.score
                        ? `Observed (${selectedRow.freshness}): ${selectedRow.score.runs}/${selectedRow.score.wickets}. Scenario is hypothetical — not an AI prediction.`
                        : `No observed scoreline. Scenario is hypothetical — assumptions only.`,
                    },
                  })
                }
              >
                What-If (assumptions)
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openDemoPlayground()}
              >
                Full DEMO workspace
              </Button>
              {selectedRow.homeName ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => go("players")}
                >
                  Related players
                </Button>
              ) : null}
            </div>
          </Panel>
        </div>
      ) : null}

      {showDemoIntel ? (
        <>
          <div className="mt-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge status="DEMO" />
              <FreshnessBadge freshness="DEMO" />
              <span className="text-sm text-muted-foreground">
                England vs India · {matchMeta.series} · {matchMeta.venue}
              </span>
            </div>
            <Kicker className="text-gold">Situation · DEMO sim</Kicker>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              Not a broadcast feed — labelled DEMO, never LIVE. Score{" "}
              {matchMeta.score.runs}/{matchMeta.score.wickets} ({matchMeta.score.overs}).
            </p>
            <LiveScoreStrip />
            <div className="mt-3">
              <ProvenanceStrip
                source={matchMeta.provenance.source}
                asOf={matchMeta.provenance.asOf}
                note="Score strip is a scripted DEMO sim. Graph and report stay on the session snapshot."
              />
            </div>
          </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList variant="line" className="h-auto! w-full justify-start overflow-x-auto">
          <TabsTrigger value="situation">Situation</TabsTrigger>
          <TabsTrigger value="graph">Timeline · Graph</TabsTrigger>
          <TabsTrigger value="scorecard">Evidence · Scorecard</TabsTrigger>
          <TabsTrigger value="intel">Intelligence</TabsTrigger>
          <TabsTrigger value="commentary">Commentary</TabsTrigger>
          <TabsTrigger value="report">Session Report</TabsTrigger>
          <TabsTrigger value="predictions">Model notes</TabsTrigger>
          <TabsTrigger value="emotions">Mood</TabsTrigger>
          <TabsTrigger value="matchups">Matchups</TabsTrigger>
          <TabsTrigger value="tactical">Tactical</TabsTrigger>
          <TabsTrigger value="sim">Simulations</TabsTrigger>
        </TabsList>

        <TabsContent value="situation" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-5">
            <Panel className="lg:col-span-3">
              <Kicker>What happened (DEMO facts)</Kicker>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                England {matchMeta.score.runs}/{matchMeta.score.wickets} after{" "}
                {matchMeta.score.overs} overs at {matchMeta.venue}. Session snapshot only —
                not a live feed. Select an event in Timeline · Graph for evidence, then Ask or
                What-If without losing this match focus.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="cos-cta"
                  onClick={() =>
                    go("ask", {
                      mode: "predictions",
                      seedAsk: "What is the situation in this DEMO match?",
                    })
                  }
                >
                  Ask CricketOS (contextual)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setTab("graph");
                    setGraphId(matchGraphNodes[0].id);
                    setEvidenceId(matchGraphNodes[0].evidenceIds?.[0] ?? null);
                  }}
                >
                  Open timeline
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    go("labs", {
                      labsSeed: {
                        source: "match-graph",
                        label: "DEMO situation · rate scenario",
                        runsRequired: 105,
                        ballsRemaining: 120,
                        wicketsInHand: 7,
                        currentRuns: matchMeta.score.runs,
                        ballsFaced: 290,
                        assumedRpo: 4.5,
                        observedNote: `Observed (DEMO): ${matchMeta.score.runs}/${matchMeta.score.wickets} at ${matchMeta.score.overs}. Hypothetical rates — not AI predictions.`,
                      },
                    })
                  }
                >
                  What-If (assumptions)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => go("players", { playerId: "joe-root" })}
                >
                  Related · Root
                </Button>
              </div>
            </Panel>
            <Panel className="lg:col-span-2">
              <Kicker>Limitations</Kicker>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>· Label: DEMO — never LIVE</li>
                <li>· Source: bundled CricketOS demo dataset</li>
                <li>· Win model figures are illustrative model, not official</li>
                <li>· Persistence: in-memory unless Postgres is configured</li>
              </ul>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="commentary" className="mt-4">
          <LiveCommentary />
        </TabsContent>

        <TabsContent value="graph" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-5">
            <Panel className="lg:col-span-2">
              <Kicker>Journey</Kicker>
              <p className="mt-2 text-sm text-muted-foreground">
                Event → player → consequence → scenario. Click a node, then follow the edge.
              </p>
              <ol className="mt-4 space-y-2">
                {matchGraphNodes.map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setGraphId(node.id);
                        setEvidenceId(node.evidenceIds?.[0] ?? null);
                      }}
                      className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                        graphId === node.id
                          ? "border-lime/50 bg-lime/10"
                          : "border-border bg-muted/30 hover:border-lime/30"
                      }`}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                          {graphKindLabel[node.kind]}
                        </span>
                        <KindBadge kind={node.dataKind} />
                      </span>
                      <span className="mt-1 block text-sm font-medium">{node.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </Panel>
            <Panel className="lg:col-span-3">
              <div className="flex flex-wrap items-center gap-2">
                <Kicker>{graphKindLabel[graphNode.kind]}</Kicker>
                <KindBadge kind={graphNode.dataKind} />
                {graphNode.overs ? (
                  <span className="font-mono text-xs text-lime">{graphNode.overs}</span>
                ) : null}
              </div>
              <h2 className="font-display mt-3 text-3xl tracking-tight">{graphNode.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{graphNode.detail}</p>

              {graphNode.evidenceIds?.length ? (
                <div className="mt-5">
                  <Kicker>Evidence</Kicker>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {graphNode.evidenceIds.map((id) => {
                      const item = matchEvidence.find((row) => row.id === id);
                      if (!item) return null;
                      return (
                        <Button
                          key={id}
                          type="button"
                          size="sm"
                          variant={evidenceId === id ? "default" : "secondary"}
                          onClick={() => setEvidenceId(id)}
                        >
                          {item.label}
                        </Button>
                      );
                    })}
                  </div>
                  {selectedEvidence ? (
                    <p className="mt-3 rounded-2xl bg-muted/50 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                      <KindBadge kind={selectedEvidence.kind} className="mb-2" />
                      <span className="block">{selectedEvidence.detail}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              {nextLinks.length ? (
                <div className="mt-6">
                  <Kicker>What happens next</Kicker>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {nextLinks.map((edge) => {
                      const target = getGraphNode(edge.to);
                      return (
                        <Button
                          key={`${edge.from}-${edge.to}`}
                          type="button"
                          variant="outline"
                          className="h-auto px-3 py-2 text-left whitespace-normal"
                          onClick={() => {
                            setGraphId(edge.to);
                            setEvidenceId(target?.evidenceIds?.[0] ?? null);
                          }}
                        >
                          <span className="text-lime">{edge.label}</span>
                          <span className="mx-2 text-muted-foreground">→</span>
                          {target?.title ?? edge.to}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                {graphNode.kind === "scenario" || graphNode.kind === "event" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      go("labs", {
                        labsSeed: {
                          source: "match-graph",
                          label: graphNode.title,
                          runsRequired: graphNode.id.includes("brook") ? 110 : 105,
                          ballsRemaining: graphNode.id.includes("wicket") || graphNode.kind === "event" ? 96 : 120,
                          wicketsInHand: graphNode.id.includes("brook") ? 6 : 7,
                          currentRuns: matchMeta.score.runs,
                          ballsFaced: 290,
                          assumedRpo: 4.2,
                          observedNote: `Observed (DEMO): ${matchMeta.score.runs}/${matchMeta.score.wickets} at ${matchMeta.score.overs}. Scenario is hypothetical.`,
                        },
                      })
                    }
                  >
                    Revise situation in What-If Lab
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    go("explorer", {
                      explorerFocus: {
                        chart: graphNode.overs?.includes("–") ? "phases" : "manhattan",
                        from: "Match Graph",
                        overNumber: graphNode.overs && !graphNode.overs.includes("–")
                          ? Number.parseInt(graphNode.overs, 10)
                          : undefined,
                      },
                    })
                  }
                >
                  View in Explorer
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    go("ask", { mode: "predictions", seedAsk: "What are the turning points?" })
                  }
                >
                  Ask Copilot about this phase
                </Button>
              </div>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="scorecard" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-5">
            <Panel className="overflow-x-auto lg:col-span-3">
              <div className="flex items-center gap-2">
                <Kicker>England, 1st innings</Kicker>
                <StatusBadge status="DEMO" />
              </div>
              <table className="mt-4 w-full min-w-[32rem] text-left text-sm">
                <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="pb-2 font-medium">Batter</th>
                    <th className="pb-2 font-medium">R</th>
                    <th className="pb-2 font-medium">B</th>
                    <th className="pb-2 font-medium">4s</th>
                    <th className="pb-2 font-medium">6s</th>
                    <th className="pb-2 font-medium">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {batting.map((row) => (
                    <tr key={row.name} className="border-t border-border">
                      <td className="py-2">
                        <span className={row.out ? "" : "text-lime"}>{row.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{row.how}</span>
                      </td>
                      <td className="py-2 tabular-nums">
                        {row.runs}
                        {row.out ? "" : "*"}
                      </td>
                      <td className="py-2 tabular-nums">{row.balls}</td>
                      <td className="py-2 tabular-nums">{row.fours}</td>
                      <td className="py-2 tabular-nums">{row.sixes}</td>
                      <td className="py-2 tabular-nums">{strikeRate(row.runs, row.balls)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm text-muted-foreground">
                Extras 8 (b 5, lb 3, w 4) · Demo sim total {live.runs}/{live.wickets} ({live.overs}) ·
                snapshot {matchMeta.score.runs}/{matchMeta.score.wickets}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Fall: {live.fow.join(" · ")}</p>
            </Panel>
            <Panel className="lg:col-span-2">
              <Kicker>Bowling</Kicker>
              <table className="mt-4 w-full text-left text-sm">
                <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="pb-2 font-medium">Bowler</th>
                    <th className="pb-2 font-medium">O</th>
                    <th className="pb-2 font-medium">R</th>
                    <th className="pb-2 font-medium">W</th>
                  </tr>
                </thead>
                <tbody>
                  {bowling.map((row) => (
                    <tr key={row.name} className="border-t border-border">
                      <td className="py-2">{row.name}</td>
                      <td className="py-2 tabular-nums">{row.overs}</td>
                      <td className="py-2 tabular-nums">{row.runs}</td>
                      <td className="py-2 tabular-nums">{row.wickets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="intel" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-5">
            <Panel className="lg:col-span-3">
              <Kicker>Grounded summary</Kicker>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>
                  England are {phaseRows.reduce((s, p) => s + p.delta, 0) > 0 ? "+" : ""}
                  {phaseRows.reduce((s, p) => s + p.delta, 0)} runs vs phase expectation
                  (deterministic sum). The decisive phase was overs 22–30.
                </p>
                <p>
                  Root neutralised spin. Brook scored quickly enough to force a change of plan, then
                  edged Kuldeep. India’s older-ball bowling never pulled the phase back.
                </p>
                <p>
                  Key matchup in the demo snapshot: Stokes vs Kuldeep. Turning point already played:
                  over 27. Next shift in the script: a wicket in Bumrah’s first four overs.
                </p>
              </div>
              <Button
                type="button"
                className="mt-5"
                variant="secondary"
                onClick={() => {
                  go("ask", { mode: "predictions", seedAsk: "Why is England winning?" });
                }}
              >
                Ask: why is England ahead in the model?
              </Button>
            </Panel>
            <Panel className="lg:col-span-2">
              <Kicker>Phase against the model</Kicker>
              <ul className="mt-4 space-y-4">
                {phaseRows.map((phase) => (
                  <li key={phase.label}>
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        setGraphId("evt-phase-22-30");
                        setEvidenceId("ev-phase-2230");
                      }}
                      aria-label={`${phase.label}: ${phase.delta > 0 ? "+" : ""}${phase.delta} vs expected`}
                    >
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{phase.label}</span>
                        <span className={phase.ahead ? "text-lime" : "text-muted-foreground"}>
                          {phase.delta > 0 ? `+${phase.delta}` : phase.delta}
                        </span>
                      </div>
                      <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="bg-lime"
                          style={{ width: `${clamp((phase.scored / 80) * 100, 0, 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {phase.scored} scored · {phase.expected} expected
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          <Panel>
            <div className="flex flex-wrap items-center gap-2">
              <Kicker>{matchReport.kicker}</Kicker>
              <StatusBadge status="DEMO" />
            </div>
            <p className="mt-2 text-xs tracking-[0.14em] text-lime uppercase">{matchReport.status}</p>
            <h2 className="font-display mt-3 text-3xl tracking-tight">{matchReport.title}</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{matchReport.summary}</p>
            <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {matchReport.figures.map((figure) => (
                <div key={figure.label} className="rounded-xl bg-muted/50 px-3 py-2">
                  <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    {figure.label}
                  </dt>
                  <dd className="mt-1 font-medium tabular-nums">{figure.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel>
              <Kicker>What happened</Kicker>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {matchReport.whatHappened.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </Panel>
            <Panel>
              <Kicker>Why</Kicker>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {matchReport.why.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </Panel>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Panel>
              <Kicker>{matchReport.keyOver.label}</Kicker>
              <p className="font-display mt-2 text-3xl">{matchReport.keyOver.value}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {matchReport.keyOver.detail}
              </p>
            </Panel>
            <Panel>
              <Kicker>{matchReport.keyPerformance.label}</Kicker>
              <p className="font-display mt-2 text-3xl">{matchReport.keyPerformance.value}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {matchReport.keyPerformance.detail}
              </p>
            </Panel>
          </div>
          <Panel className="mt-4">
            <Kicker>Future implications</Kicker>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
              {matchReport.implications.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="predictions" className="mt-4">
          <p className="mb-3 text-sm text-muted-foreground">
            <KindBadge kind="model" className="mr-2" />
            Model projections on the DEMO board — not verified live odds.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {matchPredictions.map((item) => (
              <Panel key={item.id}>
                <Kicker>{item.label}</Kicker>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-3xl">{item.pick}</h3>
                  <span className="text-lime text-2xl tabular-nums">{item.chance}%</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.note}</p>
              </Panel>
            ))}
          </div>
          <Panel className="mt-4">
            <Kicker>Before / during style</Kicker>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Before the session: England slightly ahead on venue prior, Bumrah flagged as the swing
              factor. During: Root set, Stokes in the Kuldeep window, projected total ~338 if the
              burst fails to land.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  go("ask", { mode: "predictions", seedAsk: "Project the final score" });
                }}
              >
                Project final score
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  go("ask", { mode: "predictions", seedAsk: "Who likely scores next?" });
                }}
              >
                Who scores next?
              </Button>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="emotions" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <div className="flex items-center justify-between gap-3">
                <Kicker>{side === "england" ? "England fans" : "India fans"}</Kicker>
                <div className="flex gap-2">
                  {(["england", "india"] as const).map((item) => (
                    <Button
                      key={item}
                      type="button"
                      size="sm"
                      variant={side === item ? "default" : "secondary"}
                      onClick={() => setSide(item)}
                    >
                      {item === "england" ? "England" : "India"}
                    </Button>
                  ))}
                </div>
              </div>
              <ul className="mt-5 space-y-3">
                {moods
                  .filter((item) => item.pct > 0)
                  .map((item) => (
                    <li key={item.key}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>
                          {item.emoji} {item.label}
                        </span>
                        <span className="tabular-nums">{item.pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-lime" style={{ width: `${item.pct}%` }} />
                      </div>
                    </li>
                  ))}
              </ul>
            </Panel>
            <Panel>
              <Kicker>React to the latest sim ball</Kicker>
              <p className="mt-2 text-sm text-muted-foreground">
                {live.ballsFaced.at(-1)?.commentary ??
                  "Mood also attaches on the Demo Commentary tab as the sim advances."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {MOODS.map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    variant="secondary"
                    className="size-14 text-2xl"
                    aria-label={item.label}
                    onClick={() => {
                      react(side, item.key);
                      setNoted(`${item.label} added to ${side === "england" ? "England" : "India"}`);
                    }}
                  >
                    {item.emoji}
                  </Button>
                ))}
              </div>
              <p className="mt-4 min-h-5 text-sm text-lime" role="status">
                {noted ?? "No reaction from you yet."}
              </p>
              <Button type="button" variant="outline" className="mt-4" onClick={() => go("community")}>
                Open the match room
              </Button>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="tactical" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <Kicker>Field</Kicker>
              <div className="mt-3 flex flex-wrap gap-2">
                {fieldPlans.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    size="sm"
                    variant={plan.id === item.id ? "default" : "secondary"}
                    onClick={() => setPlanId(item.id)}
                  >
                    {item.title}
                  </Button>
                ))}
              </div>
              <svg viewBox="0 0 100 100" className="mx-auto mt-4 w-full max-w-sm" role="img" aria-label={plan.title}>
                <ellipse cx="50" cy="50" rx="46" ry="46" fill="oklch(0.32 0.06 145)" stroke="white" strokeOpacity="0.25" />
                <rect x="47.5" y="36" width="5" height="28" rx="0.6" fill="oklch(0.62 0.08 110)" />
                {plan.markers.map((marker) => (
                  <g key={marker.label}>
                    <circle cx={marker.x} cy={marker.y} r="1.8" fill="white" />
                    <text x={marker.x + 2.4} y={marker.y + 1} fontSize="3.2" fill="white">
                      {marker.label}
                    </text>
                  </g>
                ))}
              </svg>
            </Panel>
            <Panel>
              <Kicker>{plan.title}</Kicker>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{plan.note}</p>
              <div className="mt-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <p>
                  England’s plan for the session is eight quiet overs, then Stokes against the
                  spinner of his choice. The lower order’s job, if it comes, is 80 more runs.
                </p>
                <p>
                  India’s plan is the new-ball burst at Root and Kuldeep at the left-hander before
                  the surface goes slow.
                </p>
              </div>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="matchups" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {matchups.map((duel) => (
              <Panel key={duel.id}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-2xl">{duel.title}</h3>
                  <span className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                    {duel.activeInDemo ? "Active · DEMO" : "Historical file"}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Balls</dt>
                    <dd className="tabular-nums">{duel.balls}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Strike rate</dt>
                    <dd className="tabular-nums">{duel.sr}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Control</dt>
                    <dd className="tabular-nums">{duel.control}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-xs text-muted-foreground">{duel.dismissals}</p>
                <Meter label="Control" value={duel.control} />
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{duel.insight}</p>
              </Panel>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sim" className="mt-4">
          <Panel>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Kicker>Next eight balls</Kicker>
                  <KindBadge kind="hypothetical" />
                </div>
                <p className="font-display mt-2 text-5xl tabular-nums">
                  {simRuns}/{simWickets}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Hypothetical projection — does not rewrite the DEMO scorecard. England {eng}% ·
                  India {ind}%.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    if (finished) setStep(-1);
                    setRunning(true);
                  }}
                  disabled={running && !finished}
                >
                  {running && !finished ? "Running" : finished ? "Run again" : "Run the session"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setRunning(false);
                    setStep(-1);
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
            <div className="mt-5">
              <WinSplit eng={eng} ind={ind} />
            </div>
            <ol className="mt-5 space-y-2">
              {played.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  The session has not been rolled. Nothing here changes {matchMeta.score.runs} for{" "}
                  {matchMeta.score.wickets} until you run it.
                </li>
              ) : (
                played.map((event) => (
                  <li key={event.over} className="rounded-2xl bg-muted/50 px-4 py-3 text-sm">
                    <span className="font-mono text-xs text-lime">{event.over}</span>
                    <span className="mt-1 block">{event.text}</span>
                  </li>
                ))
              )}
              {running && !finished ? (
                <li className="text-sm text-muted-foreground">Ball in the air…</li>
              ) : null}
            </ol>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="mt-4 text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  What is this model using?
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Phase expectancy, wickets in hand, and the Bumrah workload cap. Illustrative
                hypothetical — win swing via clamp(5–92).
              </TooltipContent>
            </Tooltip>
          </Panel>
        </TabsContent>
      </Tabs>
        </>
      ) : null}
    </div>
  );
}
