"use client";

import { useMemo, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useApp } from "@/components/app-state";
import { LiveScoreStrip } from "@/components/live-score-strip";
import { StatusBadge } from "@/components/status-badge";
import { Kicker, Panel, Spark, useGreeting } from "@/components/ui-bits";
import {
  getPlayer,
  personalBriefing,
  recommendations,
  smartAlerts,
  stories,
  teamLabel,
  teams,
  trending,
  upcoming,
} from "@/lib/data";

export function HomeScreen() {
  const {
    go,
    followedPlayers,
    followedTeams,
    preferences,
    setPreferences,
  } = useApp();
  const { greeting, dateLabel } = useGreeting();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const story = stories.find((item) => item.id === storyId) ?? null;

  const briefing = useMemo(() => {
    const items = personalBriefing(followedPlayers, followedTeams);
    if (!preferences.englandOnly) return items;
    return items.filter((item) => item.teamIds?.includes("england"));
  }, [followedPlayers, followedTeams, preferences.englandOnly]);

  const alerts = smartAlerts.filter((alert) => {
    if (!preferences.alerts) return false;
    if (preferences.englandOnly && alert.teamId !== "england") return false;
    return (
      (alert.playerId && followedPlayers.includes(alert.playerId)) ||
      (alert.teamId && followedTeams.includes(alert.teamId))
    );
  });

  const mine = followedPlayers
    .map((id) => getPlayer(id))
    .filter((player) => player !== undefined)
    .slice(0, 4);
  const myTeams = teams.filter((team) => followedTeams.includes(team.id));

  function submit(question: string, mode: "general" | "historical" | "career" | "predictions" = "general") {
    const text = question.trim();
    if (!text) {
      setError("Ask a question first.");
      return;
    }
    setError(null);
    // Route through seedAsk so AskScreen owns the thread after navigation —
    // avoids racing Home unmount with a direct ask() call.
    go("ask", { mode, seedAsk: text });
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* One composition: brand-first hero — no card soup, no competing stats */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,oklch(0.42_0.14_125/0.45),transparent_52%),radial-gradient(ellipse_at_95%_80%,oklch(0.35_0.08_210/0.32),transparent_48%),linear-gradient(165deg,oklch(0.18_0.03_240),oklch(0.13_0.02_240))]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-18deg, transparent, transparent 22px, oklch(1 0 0 / 0.9) 22px, oklch(1 0 0 / 0.9) 23px)",
          }}
          aria-hidden
        />
        <div className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-lime to-transparent sm:inset-x-12" />
        <div className="relative px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <div className="cos-hero-in max-w-2xl">
            <p className="font-display text-5xl tracking-tight text-lime sm:text-6xl md:text-7xl">
              CricketOS
            </p>
            <h1 className="font-display mt-5 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
              Follow the match. Understand the game.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              {greeting}. Intelligence briefing with grounded answers — demo data labelled honestly,
              not another scoreboard that pretends to be live.
            </p>
          </div>

          <form
            className="cos-hero-in-delay mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              submit(draft);
            }}
          >
            <label className="sr-only" htmlFor="home-ask">
              Ask Cricket Anything
            </label>
            <Input
              id="home-ask"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                if (error) setError(null);
              }}
              placeholder="Why is Bumrah difficult to face today?"
              aria-invalid={error ? true : undefined}
              className="h-12! flex-1 border-white/15 bg-black/30 px-4"
            />
            <Button type="submit" className="h-12 px-5" size="lg">
              <ArrowUp />
              Ask
            </Button>
          </form>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

          <div className="cos-hero-in-delay mt-4 flex flex-wrap gap-2">
            {recommendations.slice(0, 3).map((item) => (
              <button
                key={item.q}
                type="button"
                className="rounded-full border border-white/12 bg-black/20 px-3 py-1.5 text-left text-xs text-muted-foreground transition hover:border-lime/40 hover:text-foreground"
                onClick={() => submit(item.q, item.mode)}
              >
                {item.q}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Scoreboard composition — sports-app density, not a dashboard tile row */}
      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <Kicker className="text-cyan">DEMO scoreboard</Kicker>
            <p className="mt-1 text-sm text-muted-foreground">
              Scripted Lord&apos;s session · not a live broadcast
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => go("match")}>
            Open Match Room
          </Button>
        </div>
        <LiveScoreStrip compact onOpenMatch={() => go("match")} />
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[1.75rem] border border-border/80 bg-card/60 p-5">
          <Kicker>
            {dateLabel} · intelligence briefing
          </Kicker>
          <ul className="mt-4 space-y-3">
            {briefing.slice(0, 3).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full border-l-2 border-transparent pl-3 text-left transition hover:border-lime hover:text-lime"
                  onClick={() =>
                    go(item.screen, item.playerId ? { playerId: item.playerId } : undefined)
                  }
                >
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{item.detail}</span>
                </button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            className="mt-5 w-full border-white/12 sm:w-auto"
            onClick={() => go("feed")}
          >
            Open personal feed
          </Button>
        </div>

        <div className="grid gap-4">
          <button
            type="button"
            onClick={() => setShowUpcoming(true)}
            className="rounded-[1.75rem] border border-dashed border-border/80 p-5 text-left transition hover:border-cyan/40"
          >
            <div className="flex items-center gap-2">
              <StatusBadge status="UPCOMING" />
              <Kicker>Fixture</Kicker>
            </div>
            <p className="mt-2 font-medium">{upcoming.title}</p>
            <p className="text-sm text-muted-foreground">{upcoming.meta}</p>
          </button>
          <div className="rounded-[1.75rem] border border-border/80 bg-card/60 p-5">
            <div className="flex items-center justify-between gap-2">
              <Kicker>Smart alerts</Kicker>
              <button
                type="button"
                className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setPreferences({ englandOnly: !preferences.englandOnly })}
              >
                {preferences.englandOnly ? "England-only" : "All follows"}
              </button>
            </div>
            {alerts.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Follow players to seed alerts.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {alerts.slice(0, 2).map((alert) => (
                  <li key={alert.id} className="text-sm">
                    <span className="font-medium">{alert.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{alert.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <section className="mt-8">
        <Kicker>Trending asks</Kicker>
        <div className="mt-3 flex flex-wrap gap-2">
          {trending.map((item) => (
            <Button
              key={item.label}
              type="button"
              variant="outline"
              className="h-auto px-3 py-2"
              onClick={() => submit(item.q)}
            >
              <span className="text-lime">{item.label}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-muted-foreground">{item.q}</span>
            </Button>
          ))}
        </div>
      </section>

      <Panel className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Kicker>Your intelligence briefing</Kicker>
            <p className="mt-2 text-sm text-muted-foreground">
              Ranked for the teams and players you follow · DEMO facts where match-linked.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => go("feed")}>
            Personalise in Feed
          </Button>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {briefing.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full gap-3 py-3 text-left hover:text-lime"
                onClick={() =>
                  go(item.screen, item.playerId ? { playerId: item.playerId } : undefined)
                }
              >
                <span aria-hidden className="mt-0.5">
                  {item.icon}
                </span>
                <span>
                  <span className="block font-medium">{item.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{item.detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <section className="mt-8">
        <Kicker>Context, not journalism</Kicker>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {stories.map((storyItem) => (
            <button
              key={storyItem.id}
              type="button"
              onClick={() => setStoryId(storyItem.id)}
              className="flex min-h-44 flex-col rounded-3xl border border-border/80 bg-card/60 p-5 text-left transition hover:-translate-y-0.5 hover:border-lime/40"
            >
              <span className="text-sm text-muted-foreground">
                {storyItem.icon} {storyItem.kicker}
              </span>
              <span className="font-display mt-4 text-2xl leading-tight tracking-tight">
                {storyItem.title}
              </span>
              <span className="mt-auto pt-4 text-sm text-muted-foreground">{storyItem.lede}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <Kicker>Following · teams</Kicker>
          {myTeams.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Pick sides in onboarding or Feed.</p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {myTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => go("teams", { teamId: team.id })}
                  className="rounded-3xl border border-border/80 bg-card/60 p-4 text-left"
                >
                  <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                    {team.short}
                  </p>
                  <p className="mt-1 font-medium">{team.name}</p>
                </button>
              ))}
            </div>
          )}
        </section>
        <section>
          <Kicker>Following · players</Kicker>
          {mine.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Follow players for DNA updates.</p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {mine.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => go("players", { playerId: player.id })}
                  className="flex items-center gap-3 rounded-3xl border border-border/80 bg-card/60 p-4 text-left"
                >
                  <Spark values={player.form} label={`${player.name} recent returns`} />
                  <span>
                    <span className="block font-medium">{player.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {teamLabel(player.teamId)} · {player.traits[0]?.label}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={story !== null} onOpenChange={(open) => !open && setStoryId(null)}>
        <DialogContent className="story-dialog max-h-[85dvh] overflow-y-auto">
          {story ? (
            <>
              <DialogHeader>
                <DialogDescription>
                  {story.icon} {story.kicker}
                </DialogDescription>
                <DialogTitle className="font-display text-3xl leading-tight">{story.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                {story.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showUpcoming} onOpenChange={setShowUpcoming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{upcoming.title}</DialogTitle>
            <DialogDescription>{upcoming.meta}</DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-muted-foreground">{upcoming.note}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
