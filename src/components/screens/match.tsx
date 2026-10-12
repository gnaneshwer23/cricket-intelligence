"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/app-state";
import { Kicker, Meter, PageTitle, Panel, useCountdown, WinSplit } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  batting,
  bowling,
  fieldPlans,
  fow,
  lastOver,
  matchPredictions,
  matchReport,
  matchups,
  phases,
  simScript,
} from "@/lib/data";
import { clamp, MOODS, moodBreakdown } from "@/lib/format";

export function MatchScreen() {
  const countdown = useCountdown();
  const { mood, react, go } = useApp();
  const [planId, setPlanId] = useState(fieldPlans[0].id);
  const [side, setSide] = useState<"england" | "india">("england");
  const [noted, setNoted] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const [running, setRunning] = useState(false);
  const plan = fieldPlans.find((item) => item.id === planId) ?? fieldPlans[0];
  const played = simScript.slice(0, step + 1);
  const simRuns = 245 + played.reduce((sum, event) => sum + event.runs, 0);
  const simWickets = 4 + played.reduce((sum, event) => sum + event.wickets, 0);
  const swing = played.reduce((sum, event) => sum + event.swing, 0);
  const eng = clamp(58 + swing, 5, 92);
  const ind = 100 - eng;
  const moods = moodBreakdown(mood[side]);

  const finished = step >= simScript.length - 1;
  useEffect(() => {
    if (!running || finished) return;
    const id = window.setTimeout(() => setStep((current) => current + 1), 800);
    return () => window.clearTimeout(id);
  }, [running, finished, step]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        kicker="Match Centre · explanations"
        title="England vs India"
        lede="Above expectation, momentum, key matchup, turning point, predictions, and an AI session report — the score is only the start."
      />

      <section className="overflow-hidden rounded-[2rem] border border-border bg-card">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <Kicker>Day 2 · Lord’s · session in {countdown}</Kicker>
            <p className="font-display mt-3 text-6xl leading-none tabular-nums sm:text-7xl">
              245<span className="text-lime">/4</span>
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              48.2 overs · Root 89* (120) · Stokes 3* (6) · partnership just starting
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {lastOver.map((ball, index) => (
                <span
                  key={`${ball}-${index}`}
                  className="grid size-8 place-items-center rounded-full border border-border text-xs tabular-nums"
                >
                  {ball}
                </span>
              ))}
              <span className="self-center text-xs text-muted-foreground">Last over before the break</span>
            </div>
          </div>
          <div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-eng text-xs tracking-[0.16em] uppercase">England</p>
                <p className="font-display text-4xl tabular-nums">58%</p>
              </div>
              <div>
                <p className="text-ind text-xs tracking-[0.16em] uppercase">India</p>
                <p className="font-display text-4xl tabular-nums">42%</p>
              </div>
            </div>
            <WinSplit eng={58} ind={42} />
          </div>
        </div>
        <div className="grid border-t border-border sm:grid-cols-3">
          {[
            ["Momentum", "England"],
            ["Turning point", "Over 27"],
            ["Above expectation", "+21 runs"],
          ].map(([label, value]) => (
            <div key={label} className="border-b border-border px-5 py-4 sm:border-b-0 sm:border-r last:border-r-0">
              <Kicker>{label}</Kicker>
              <p className="mt-2 text-xl font-medium">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <Tabs defaultValue="intel" className="mt-6">
        <TabsList variant="line" className="h-auto! w-full justify-start overflow-x-auto">
          <TabsTrigger value="intel">Intelligence</TabsTrigger>
          <TabsTrigger value="report">AI Report</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
          <TabsTrigger value="emotions">Mood</TabsTrigger>
          <TabsTrigger value="matchups">Matchups</TabsTrigger>
          <TabsTrigger value="tactical">Tactical</TabsTrigger>
          <TabsTrigger value="sim">Simulations</TabsTrigger>
        </TabsList>

        <TabsContent value="scorecard" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-5">
            <Panel className="overflow-x-auto lg:col-span-3">
              <Kicker>England, 1st innings</Kicker>
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
                      <td className="py-2 tabular-nums">{row.runs}{row.out ? "" : "*"}</td>
                      <td className="py-2 tabular-nums">{row.balls}</td>
                      <td className="py-2 tabular-nums">{row.fours}</td>
                      <td className="py-2 tabular-nums">{row.sixes}</td>
                      <td className="py-2 tabular-nums">{((row.runs / row.balls) * 100).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm text-muted-foreground">Extras 8 (b 5, lb 3, w 4) · Total 245/4 (48.2)</p>
              <p className="mt-2 text-xs text-muted-foreground">Fall: {fow.join(" · ")}</p>
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
              <Kicker>AI summary</Kicker>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>England are 21 runs ahead of expectation. The decisive phase was overs 22–30.</p>
                <p>
                  Root neutralised spin. Brook scored quickly enough to force a change of plan, then
                  edged Kuldeep. India’s older-ball bowling never pulled the phase back.
                </p>
                <p>
                  Key matchup now: Stokes vs Kuldeep. Turning point already played: over 27. The next
                  shift is a wicket in Bumrah’s first four overs — not a quiet hour.
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
                Ask: why is England winning?
              </Button>
            </Panel>
            <Panel className="lg:col-span-2">
              <Kicker>Phase against the model</Kicker>
              <ul className="mt-4 space-y-4">
                {phases.map((phase) => {
                  const delta = phase.scored - phase.expected;
                  return (
                    <li key={phase.label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{phase.label}</span>
                        <span className={delta > 0 ? "text-lime" : "text-muted-foreground"}>
                          {delta > 0 ? `+${delta}` : delta}
                        </span>
                      </div>
                      <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="bg-lime" style={{ width: `${(phase.scored / 80) * 100}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {phase.scored} scored · {phase.expected} expected
                      </p>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          <Panel>
            <Kicker>{matchReport.kicker}</Kicker>
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
              <Kicker>React to the last ball</Kicker>
              <p className="mt-2 text-sm text-muted-foreground">
                Stokes defended the last ball of the break. The room moves when you do.
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
                <p>England’s plan for the session is eight quiet overs, then Stokes against the spinner of his choice. The lower order’s job, if it comes, is 80 more runs.</p>
                <p>India’s plan is the new-ball burst at Root and Kuldeep at the left-hander before the surface goes slow.</p>
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
                    {duel.live ? "Live" : "File"}
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
                <Kicker>Next eight balls</Kicker>
                <p className="font-display mt-2 text-5xl tabular-nums">
                  {simRuns}/{simWickets}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  A projection, not a change to the scorecard. England {eng}% · India {ind}%.
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
                <li className="text-sm text-muted-foreground">The session has not been rolled. Nothing here changes 245 for 4 until you run it.</li>
              ) : (
                played.map((event) => (
                  <li key={event.over} className="rounded-2xl bg-muted/50 px-4 py-3 text-sm">
                    <span className="font-mono text-xs text-lime">{event.over}</span>
                    <span className="mt-1 block">{event.text}</span>
                  </li>
                ))
              )}
              {running && !finished ? <li className="text-sm text-muted-foreground">Ball in the air…</li> : null}
            </ol>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="mt-4 text-xs text-muted-foreground underline-offset-4 hover:underline">
                  What is this model using?
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Phase expectancy, wickets in hand, and the Bumrah workload cap. It is illustrative.
              </TooltipContent>
            </Tooltip>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
