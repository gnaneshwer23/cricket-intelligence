"use client";

import { useMemo, useState } from "react";
import { Kicker, PageTitle, Panel, WinSplit } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { baseWin, draftPool, getTeam, histories, whatIfs } from "@/lib/data";
import type { Role } from "@/lib/types";

export function LabsScreen() {
  const [scenarioId, setScenarioId] = useState(whatIfs[0].id);
  const [xi, setXi] = useState<string[]>([]);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [year, setYear] = useState(2029);
  const [side, setSide] = useState("england");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [historyId, setHistoryId] = useState(histories[0].id);
  const scenario = whatIfs.find((item) => item.id === scenarioId) ?? whatIfs[0];
  const history = histories.find((item) => item.id === historyId) ?? histories[0];
  const picks = xi.map((id) => draftPool.find((player) => player.id === id)).filter((player) => player !== undefined);

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

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        kicker="Labs"
        title="The futures that didn’t happen, and the ones that might."
        lede="Change today’s XI, draft your own, generate a side years from now, or drop a player into another decade."
      />
      <Tabs defaultValue="what-if">
        <TabsList variant="line" className="h-auto! w-full justify-start overflow-x-auto">
          <TabsTrigger value="what-if">What if</TabsTrigger>
          <TabsTrigger value="draft">Draft builder</TabsTrigger>
          <TabsTrigger value="future">Future XI</TabsTrigger>
          <TabsTrigger value="history">Alternate history</TabsTrigger>
        </TabsList>

        <TabsContent value="what-if" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2">
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
            <Panel>
              <Kicker>Current</Kicker>
              <p className="font-display mt-3 text-5xl tabular-nums">{baseWin.ind}%</p>
              <p className="text-sm text-muted-foreground">India win chance · England {baseWin.eng}%</p>
              <div className="mt-4">
                <WinSplit eng={baseWin.eng} ind={baseWin.ind} />
              </div>
            </Panel>
            <Panel>
              <Kicker>Without the assumption</Kicker>
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
            </Panel>
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
