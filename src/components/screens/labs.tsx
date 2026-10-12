"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/app-state";
import { KindBadge } from "@/components/status-badge";
import { Kicker, PageTitle, Panel, WinSplit } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  analyseChase,
  ballsToOvers,
  DEFAULT_SCENARIO_PRESETS,
  formatMetric,
  oversToBalls,
  projectScenarios,
  type ScenarioPreset,
} from "@/lib/calc";
import { baseWin, draftPool, getTeam, histories, matchMeta, whatIfs } from "@/lib/data";
import type { Role } from "@/lib/types";

export function LabsScreen() {
  const { go, labsSeed, clearLabsSeed } = useApp();
  const [scenarioId, setScenarioId] = useState(whatIfs[0].id);
  const [xi, setXi] = useState<string[]>([]);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [year, setYear] = useState(2029);
  const [side, setSide] = useState("england");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [historyId, setHistoryId] = useState(histories[0].id);

  // Scenario builder state
  const [runsRequired, setRunsRequired] = useState(105);
  const [ballsRemaining, setBallsRemaining] = useState(120);
  const [wicketsInHand, setWicketsInHand] = useState(7);
  const [currentRuns, setCurrentRuns] = useState(matchMeta.score.runs);
  const [ballsFaced, setBallsFaced] = useState(290);
  const [assumedRpo, setAssumedRpo] = useState(4.5);
  const [observedNote, setObservedNote] = useState<string | null>(null);
  const [seedLabel, setSeedLabel] = useState<string | null>(null);
  const [presets, setPresets] = useState<ScenarioPreset[]>(DEFAULT_SCENARIO_PRESETS);

  const scenario = whatIfs.find((item) => item.id === scenarioId) ?? whatIfs[0];
  const history = histories.find((item) => item.id === historyId) ?? histories[0];
  const picks = xi.map((id) => draftPool.find((player) => player.id === id)).filter((player) => player !== undefined);

  const [appliedSeedLabel, setAppliedSeedLabel] = useState<string | null>(null);

  // Apply Match Graph / Explorer seed when it arrives (adjust state during render).
  if (labsSeed && labsSeed.label !== appliedSeedLabel) {
    setAppliedSeedLabel(labsSeed.label);
    setRunsRequired(labsSeed.runsRequired);
    setBallsRemaining(labsSeed.ballsRemaining);
    setWicketsInHand(labsSeed.wicketsInHand);
    if (labsSeed.currentRuns !== undefined) setCurrentRuns(labsSeed.currentRuns);
    if (labsSeed.ballsFaced !== undefined) setBallsFaced(labsSeed.ballsFaced);
    if (labsSeed.assumedRpo !== undefined) setAssumedRpo(labsSeed.assumedRpo);
    setObservedNote(labsSeed.observedNote ?? null);
    setSeedLabel(labsSeed.label);
    queueMicrotask(() => clearLabsSeed());
  }

  const chase = useMemo(
    () =>
      analyseChase({
        runsRequired,
        ballsRemaining,
        wicketsInHand,
        currentRuns,
        ballsFaced,
        assumedRpo,
      }),
    [runsRequired, ballsRemaining, wicketsInHand, currentRuns, ballsFaced, assumedRpo],
  );

  const projections = useMemo(
    () =>
      projectScenarios(
        {
          runsRequired,
          ballsRemaining,
          wicketsInHand,
          currentRuns,
          ballsFaced,
        },
        presets,
      ),
    [runsRequired, ballsRemaining, wicketsInHand, currentRuns, ballsFaced, presets],
  );

  const balance = useMemo(() => {
    const count = (role: Role) => picks.filter((player) => player.role === role).length;
    return {
      batters: count("Batter"),
      keepers: count("Keeper"),
      bowlers: count("Bowler"),
      allrounders: count("All-rounder"),
    };
  }, [picks]);

  const projection = useMemo(() => {
    const team = getTeam(side);
    if (!team) return null;
    const anchor = team.futures.reduce((best, item) =>
      Math.abs(item.year - year) < Math.abs(best.year - year) ? item : best,
    );
    return { team, anchor };
  }, [side, year]);

  function add(id: string) {
    setDraftError(null);
    if (xi.includes(id)) return;
    if (xi.length >= 11) {
      setDraftError("An XI is eleven. Remove someone first.");
      return;
    }
    setXi((current) => [...current, id]);
  }

  function generate() {
    setLoading(true);
    setReady(false);
    window.setTimeout(() => {
      setLoading(false);
      setReady(true);
    }, 700);
  }

  function setPresetRpo(id: ScenarioPreset["id"], value: number) {
    setPresets((current) =>
      current.map((p) => (p.id === id ? { ...p, assumedRpo: value } : p)),
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        kicker="Labs · experimental"
        title="The futures that didn’t happen, and the ones that might."
        lede="Hypothetical scenario maths on the DEMO board — required rates and projections, not win probabilities or AI predictions."
      />
      <Tabs defaultValue="what-if">
        <TabsList variant="line" className="h-auto! w-full justify-start overflow-x-auto">
          <TabsTrigger value="what-if">What if</TabsTrigger>
          <TabsTrigger value="draft">Draft builder</TabsTrigger>
          <TabsTrigger value="future">Future XI</TabsTrigger>
          <TabsTrigger value="history">Alternate history</TabsTrigger>
        </TabsList>

        <TabsContent value="what-if" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            <KindBadge kind="hypothetical" className="mr-2" />
            Deterministic chase / rate maths. Cricket overs use ball remainder (17.4 = 17 overs + 4
            balls). Never shows NaN/Infinity.
          </p>

          {seedLabel ? (
            <Panel className="border-gold/40 bg-gold/5">
              <Kicker>Opened from Match Graph / Explorer</Kicker>
              <p className="mt-2 font-medium">{seedLabel}</p>
              {observedNote ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="text-gold tracking-[0.12em] uppercase">Observed · </span>
                  {observedNote}
                </p>
              ) : null}
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="text-gold tracking-[0.12em] uppercase">Hypothetical · </span>
                Adjust the knobs below. Rates are not a win model.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => go("match")}>
                  Return to Match Graph
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => go("explorer", { explorerFocus: { chart: "manhattan", from: "Labs" } })}
                >
                  Open Explorer
                </Button>
              </div>
            </Panel>
          ) : null}

          <Panel>
            <Kicker>Scenario builder</Kicker>
            <p className="mt-1 text-sm text-muted-foreground">
              Immediate feedback from deterministic calcs — same modules Copilot uses.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumField
                label="Runs required"
                value={runsRequired}
                onChange={setRunsRequired}
                tip="Runs still needed. 0 or negative = chase complete."
              />
              <NumField
                label="Balls remaining"
                value={ballsRemaining}
                onChange={setBallsRemaining}
                tip="Legal balls left. 0 → required rate undefined."
              />
              <NumField
                label="Wickets in hand"
                value={wicketsInHand}
                onChange={setWicketsInHand}
                tip="Affects plain-language risk notes, not a win %."
              />
              <NumField
                label="Current runs (optional)"
                value={currentRuns}
                onChange={setCurrentRuns}
                tip="For projected end totals under an assumed RPO."
              />
              <NumField
                label="Balls faced (optional)"
                value={ballsFaced}
                onChange={setBallsFaced}
                tip="Context only — overs faced shown as cricket notation."
              />
              <NumField
                label="Assumed RPO"
                value={assumedRpo}
                onChange={setAssumedRpo}
                step={0.1}
                tip="Hypothetical scoring rate for projection."
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Overs remaining: {chase.oversRemaining} · Balls faced ≈ {ballsToOvers(Math.max(0, ballsFaced))}{" "}
              ({oversToBalls(ballsToOvers(Math.max(0, ballsFaced)))} balls check)
            </p>

            <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
              <Kicker>Result</Kicker>
              <p className="mt-2 text-base leading-relaxed">{chase.plainLanguage}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Fig label="RRR" value={formatMetric(chase.requiredRunRate)} tip="Required runs per over" />
                <Fig label="Per ball" value={formatMetric(chase.requiredRunPerBall, 2)} tip="Required runs per ball" />
                <Fig
                  label="Projected"
                  value={formatMetric(chase.projectedScore, 0)}
                  tip="Current runs + assumed RPO × overs left"
                />
                <Fig label="Status" value={chase.status} tip="ok / completed / zero-balls / invalid" />
              </dl>
              <ul className="mt-4 space-y-2">
                {chase.alternatives.map((alt) => (
                  <li key={alt.label} className="rounded-xl bg-background/60 px-3 py-2 text-sm">
                    <span className="font-medium">{alt.label}</span>
                    <span className="mt-0.5 block text-muted-foreground">{alt.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <div>
            <Kicker className="mb-2">Three scenarios · rates only</Kicker>
            <p className="mb-3 text-sm text-muted-foreground">
              Conservative / Baseline / Aggressive — editable assumed RPO. Not win probabilities.
            </p>
            <div className="grid gap-3 lg:grid-cols-3">
              {projections.map(({ preset, analysis, runsAdded, endTotal }) => (
                <Panel key={preset.id}>
                  <div className="flex items-center justify-between gap-2">
                    <Kicker>{preset.label}</Kicker>
                    <KindBadge kind="hypothetical" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{preset.note}</p>
                  <label className="mt-4 block text-sm" htmlFor={`rpo-${preset.id}`}>
                    Assumed RPO {formatMetric(preset.assumedRpo)}
                  </label>
                  <Slider
                    id={`rpo-${preset.id}`}
                    min={1}
                    max={12}
                    step={0.1}
                    value={[preset.assumedRpo]}
                    onValueChange={(v) => setPresetRpo(preset.id, v[0] ?? preset.assumedRpo)}
                    className="mt-2"
                    aria-label={`${preset.label} assumed RPO`}
                  />
                  <p className="font-display mt-4 text-3xl tabular-nums text-lime">
                    {formatMetric(endTotal, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Projected total · +{formatMetric(runsAdded)} runs if rate holds
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {analysis.plainLanguage} Math: {formatMetric(preset.assumedRpo)} ×{" "}
                    {analysis.oversRemaining} ov ≈ {formatMetric(runsAdded)} added to {currentRuns}.
                  </p>
                </Panel>
              ))}
            </div>
          </div>

          <Panel>
            <Kicker>Authored DEMO win swings (separate)</Kicker>
            <p className="mt-1 text-sm text-muted-foreground">
              Fixed scenario table on the session win prior — labelled model / hypothetical, not the
              rate builder above.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {whatIfs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScenarioId(item.id)}
                  className={`rounded-3xl border p-4 text-left ${
                    item.id === scenario.id ? "border-lime bg-card" : "border-border"
                  }`}
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border p-4">
                <Kicker>DEMO baseline</Kicker>
                <p className="font-display mt-3 text-5xl tabular-nums">{baseWin.ind}%</p>
                <p className="text-sm text-muted-foreground">India win chance · England {baseWin.eng}%</p>
                <div className="mt-4">
                  <WinSplit eng={baseWin.eng} ind={baseWin.ind} />
                </div>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <Kicker>Hypothetical outcome</Kicker>
                <p className="font-display mt-3 text-5xl tabular-nums text-lime">
                  {scenario.draw ? `${scenario.draw}%` : `${scenario.ind}%`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {scenario.draw ? "Draw" : "India win chance"} · {scenario.extra}
                </p>
                <div className="mt-4">
                  <WinSplit eng={scenario.eng} ind={scenario.ind} draw={scenario.draw || undefined} />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{scenario.note}</p>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Method: authored scenario table on DEMO prior — numbers are fixed file values, not
                  Monte Carlo draws.
                </p>
              </div>
            </div>
          </Panel>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                go("ask", {
                  seedAsk: `Required rate for ${runsRequired} off ${ballsRemaining} balls with ${wicketsInHand} wickets`,
                })
              }
            >
              Ask Copilot about this situation
            </Button>
            <Button type="button" variant="secondary" onClick={() => go("explorer")}>
              Explorer charts
            </Button>
            <Button type="button" variant="secondary" onClick={() => go("match")}>
              Match Room
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="draft" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <Kicker>Pool</Kicker>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {draftPool.map((player) => {
                  const picked = xi.includes(player.id);
                  return (
                    <li key={player.id}>
                      <button
                        type="button"
                        onClick={() => add(player.id)}
                        disabled={picked}
                        className="w-full rounded-2xl bg-muted/50 px-3 py-2 text-left text-sm disabled:opacity-40"
                      >
                        <span className="block font-medium">{player.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {player.side} · {player.role}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>
            <Panel>
              <Kicker>Your XI · {xi.length}/11</Kicker>
              {draftError ? <p className="mt-2 text-sm text-destructive">{draftError}</p> : null}
              <ol className="mt-3 space-y-2">
                {Array.from({ length: 11 }, (_, index) => picks[index]).map((player, index) => (
                  <li key={player?.id ?? `empty-${index}`}>
                    {player ? (
                      <button
                        type="button"
                        className="flex w-full justify-between rounded-2xl bg-muted/50 px-3 py-2 text-left text-sm"
                        onClick={() => setXi((current) => current.filter((id) => id !== player.id))}
                      >
                        <span>
                          {index + 1}. {player.name}
                        </span>
                        <span className="text-muted-foreground">Remove</span>
                      </button>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                        {index + 1}. Empty
                      </p>
                    )}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm text-muted-foreground">
                {balance.batters} batters · {balance.allrounders} all-rounders · {balance.keepers} keeper
                {balance.keepers === 1 ? "" : "s"} · {balance.bowlers} bowlers
              </p>
              {xi.length === 11 && balance.keepers === 0 ? (
                <p className="mt-2 text-sm text-gold">This side has no keeper.</p>
              ) : null}
              {xi.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Pick a keeper if you want it to look like a side.</p>
              ) : null}
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="future" className="mt-4">
          <Panel>
            <div className="flex flex-wrap gap-2">
              {["england", "india", "australia", "new-zealand"].map((id) => (
                <Button key={id} type="button" size="sm" variant={side === id ? "default" : "secondary"} onClick={() => { setSide(id); setReady(false); }}>
                  {getTeam(id)?.name}
                </Button>
              ))}
            </div>
            <label className="mt-5 block text-sm" htmlFor="year-slider">
              Year {year}
            </label>
            <Slider
              id="year-slider"
              min={2026}
              max={2034}
              step={1}
              value={[year]}
              onValueChange={(value) => {
                setYear(value[0] ?? year);
                setReady(false);
              }}
              className="mt-3"
              aria-label="Projection year"
            />
            <Button type="button" className="mt-5" onClick={generate} disabled={loading}>
              {loading ? "Generating" : "Generate XI"}
            </Button>
            {loading ? (
              <div className="mt-5 space-y-2" aria-hidden>
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="h-8 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : null}
            {!loading && !ready ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Choose a year and generate. The nearest anchored squad is what the model will show.
              </p>
            ) : null}
            {!loading && ready && projection ? (
              <div className="mt-5">
                <Kicker>
                  Anchored to {projection.anchor.year} · captain {projection.anchor.captain}
                </Kicker>
                <p className="mt-2 text-sm text-muted-foreground">{projection.anchor.note}</p>
                <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                  {projection.anchor.xi.map((name, index) => (
                    <li key={name} className="rounded-2xl bg-muted/50 px-3 py-2 text-sm">
                      {index + 1}. {name}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </Panel>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
            <div className="flex flex-col gap-2">
              {histories.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={item.id === history.id ? "default" : "secondary"}
                  className="h-auto justify-start px-3 py-3 text-left whitespace-normal"
                  onClick={() => setHistoryId(item.id)}
                >
                  {item.title}
                </Button>
              ))}
            </div>
            <Panel>
              <Kicker>{history.era}</Kicker>
              <h3 className="font-display mt-3 text-3xl">{history.title}</h3>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {history.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-2">
                {history.figures.map((figure) => (
                  <div key={figure.label} className="rounded-2xl bg-muted/50 p-3">
                    <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{figure.label}</dt>
                    <dd className="mt-1 font-medium">{figure.value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  tip,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  tip: string;
  step?: number;
}) {
  return (
    <label className="text-sm">
      <span className="text-muted-foreground" title={tip}>
        {label}
      </span>
      <Input
        type="number"
        step={step}
        className="mt-1"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        aria-label={label}
      />
    </label>
  );
}

function Fig({ label, value, tip }: { label: string; value: string; tip: string }) {
  return (
    <div className="rounded-xl bg-background/70 p-3" title={tip}>
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 font-medium tabular-nums">{value}</dd>
    </div>
  );
}
