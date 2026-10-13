"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/app-state";
import { LiveCommentary } from "@/components/live-commentary";
import { LiveFixturesBoard, type BoardRow } from "@/components/live-fixtures-board";
import { LiveScoreStrip } from "@/components/live-score-strip";
import { DataStatusStrip } from "@/components/data-status-strip";
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
import { useLiveMatch } from "@/hooks/use-live-match";
import { analysePhases, applyWinSwing, strikeRate } from "@/lib/calc";
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

const graphKindLabel: Record<MatchGraphNode["kind"], string> = {
  event: "Event",
  player: "Player",
  consequence: "Consequence",
  scenario: "Scenario",
};

export function MatchScreen() {
  const { mood, react, go, graphNodeId, clearGraphNodeId } = useApp();
  const live = useLiveMatch();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const pick = sessionStorage.getItem("cricketos-match-pick");
      if (pick) sessionStorage.removeItem("cricketos-match-pick");
      return pick;
    } catch {
      return null;
    }
  });
  const [selectedRow, setSelectedRow] = useState<BoardRow | null>(null);
  const [planId, setPlanId] = useState(fieldPlans[0].id);
  const [side, setSide] = useState<"england" | "india">("england");
  const [noted, setNoted] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const [running, setRunning] = useState(false);
  const [graphId, setGraphId] = useState(matchGraphNodes[0].id);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const [tab, setTab] = useState("commentary");
  const [appliedGraphNode, setAppliedGraphNode] = useState<string | null>(null);

  const showDemoIntel =
    selectedMatchId === matchMeta.id ||
    selectedMatchId === "demo-eng-ind-lords-d2" ||
    (selectedRow?.isDemo ?? false);

  function pickMatch(row: BoardRow) {
    setSelectedMatchId(row.id);
    setSelectedRow(row);
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

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <Kicker className="text-cyan">Live Scores · Match Centre</Kicker>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {showDemoIntel
              ? `${matchMeta.title} (DEMO)`
              : selectedRow?.title ?? "Live Scores"}
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Scan Live · Upcoming · Recent, then open a card. Lord&apos;s is one DEMO option — never
            labelled LIVE. Real LIVE needs a keyed CricAPI / Sportmonks provider.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="cos-cta border-white/12"
            onClick={() => go("explorer", { explorerFocus: { chart: "worm", from: "Match Room" } })}
          >
            Open Explorer charts
          </Button>
          <Button
            type="button"
            size="sm"
            className="cos-cta"
            onClick={() => go("ask", { seedAsk: "Summarise today's cricket in 30 seconds" })}
          >
            Ask Copilot
          </Button>
        </div>
      </header>

      <LiveFixturesBoard
        selectedId={selectedMatchId}
        onSelect={pickMatch}
        limit={14}
        initialTab="all"
      />
      <div className="mt-3">
        <DataStatusStrip />
      </div>

      {!selectedMatchId ? (
        <Panel className="mt-6 border-white/8 bg-card/40">
          <Kicker>Select a fixture</Kicker>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose any row above. DEMO Lord&apos;s unlocks the scripted sim, graph, and intelligence
            tabs. Other rows show archived / upcoming / provider scores with provenance.
          </p>
          <Button
            type="button"
            size="sm"
            className="cos-cta mt-4"
            onClick={() =>
              pickMatch({
                id: matchMeta.id,
                title: `${matchMeta.title} (DEMO)`,
                status: "DEMO",
                freshness: "DEMO",
                venue: matchMeta.venue,
                format: "test",
                series: matchMeta.series,
                score: matchMeta.score,
                isDemo: true,
                provenance: {
                  source: matchMeta.provenance.source,
                  asOf: matchMeta.provenance.asOf,
                  note: matchMeta.provenance.note,
                },
              })
            }
          >
            Open Lord&apos;s DEMO
          </Button>
        </Panel>
      ) : null}

      {selectedMatchId && !showDemoIntel && selectedRow ? (
        <Panel className="mt-6 border-white/8 bg-card/40">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={selectedRow.status} />
            <FreshnessBadge freshness={selectedRow.freshness} />
          </div>
          <h2 className="font-display mt-3 text-2xl tracking-tight">{selectedRow.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedRow.venue} · {selectedRow.format}
            {selectedRow.series ? ` · ${selectedRow.series}` : ""}
          </p>
          {selectedRow.score ? (
            <p className="font-display mt-4 text-5xl font-semibold tabular-nums">
              {selectedRow.score.runs}
              <span className="text-lime">/{selectedRow.score.wickets}</span>
              {selectedRow.score.overs ? (
                <span className="ml-3 font-mono text-base text-cyan">
                  {selectedRow.score.overs} ov
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              {selectedRow.status === "UPCOMING"
                ? "No ball in play yet — fixture prior only."
                : "Scorecard detail not in this archive row."}
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
          <p className="mt-4 text-xs text-muted-foreground">
            Full ball-by-ball intelligence tabs stay on the Lord&apos;s DEMO board. Provider LIVE
            rows update when `/api/fixtures` refreshes.
          </p>
        </Panel>
      ) : null}

      {showDemoIntel ? (
        <>
          <div className="mt-6">
            <Kicker className="text-gold">DEMO sim · scripted session</Kicker>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              Not a broadcast feed — labelled DEMO, never LIVE.
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
          <TabsTrigger value="commentary">Demo Commentary</TabsTrigger>
          <TabsTrigger value="graph">Match Graph</TabsTrigger>
          <TabsTrigger value="intel">Intelligence</TabsTrigger>
          <TabsTrigger value="report">Session Report</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
          <TabsTrigger value="emotions">Mood</TabsTrigger>
          <TabsTrigger value="matchups">Matchups</TabsTrigger>
          <TabsTrigger value="tactical">Tactical</TabsTrigger>
          <TabsTrigger value="sim">Simulations</TabsTrigger>
        </TabsList>

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
