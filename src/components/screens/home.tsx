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
      {/* One composition: brand-first full-bleed hero — no card soup */}
      <section className="cos-hero rounded-[2rem] border border-white/8">
        <div className="relative z-[1] px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
          <div className="cos-hero-in max-w-2xl">
            <p className="font-display text-[clamp(3rem,8vw,4.75rem)] font-semibold leading-none text-lime">
              CricketOS
            </p>
            <h1 className="font-display mt-7 text-[clamp(1.65rem,4vw,2.75rem)] font-medium leading-[1.15] text-balance">
              Follow the match. Understand the game.
            </h1>
            <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground sm:text-base">
              {greeting}. Intelligence briefing with grounded answers — demo data labelled
              honestly, not another scoreboard that pretends to be live.
            </p>
          </div>

          <form
            className="cos-hero-in-delay mt-10 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch"
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
              className="h-12! flex-1 border-white/12 bg-black/25 px-4 text-base"
            />
            <Button type="submit" className="cos-cta h-12 px-7 text-base" size="lg">
              <ArrowUp />
              Ask
            </Button>
          </form>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </div>
      </section>

      {/* Scoreboard — sports retail clarity, DEMO labelled */}
      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Kicker className="text-cyan">DEMO scoreboard</Kicker>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Scripted Lord&apos;s session · not a live broadcast
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cos-cta border-white/12"
            onClick={() => go("match")}
          >
            Open Match Room
          </Button>
        </div>
        <LiveScoreStrip compact onOpenMatch={() => go("match")} />
      </section>

      {/* Trending / quick asks — below first composition */}
      <section className="mt-8">
        <Kicker>Quick asks</Kicker>
        <div className="mt-3 flex flex-wrap gap-2">
          {recommendations.slice(0, 3).map((item) => (
            <button
              key={item.q}
              type="button"
              className="border-b border-white/15 pb-1 text-left text-sm text-muted-foreground transition hover:border-lime/50 hover:text-foreground"
              onClick={() => submit(item.q, item.mode)}
            >
              {item.q}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-12">
        <div>
          <Kicker>
            {dateLabel} · intelligence briefing
          </Kicker>
          <ul className="mt-5 space-y-0 divide-y divide-white/8">
            {briefing.slice(0, 3).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full py-4 text-left transition hover:text-lime"
                  onClick={() =>
                    go(item.screen, item.playerId ? { playerId: item.playerId } : undefined)
                  }
                >
                  <span className="block text-base font-medium tracking-tight">{item.title}</span>
                  <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                    {item.detail}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            className="cos-cta mt-4 border-white/12"
            onClick={() => go("feed")}
          >
            Open personal feed
          </Button>
        </div>

        <div className="flex flex-col gap-8 border-t border-white/10 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
          <button
            type="button"
            onClick={() => setShowUpcoming(true)}
            className="text-left transition hover:text-lime"
          >
            <div className="flex items-center gap-2">
              <StatusBadge status="UPCOMING" />
              <Kicker>Fixture</Kicker>
            </div>
            <p className="font-display mt-3 text-xl tracking-tight">{upcoming.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{upcoming.meta}</p>
          </button>
          <div>
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
              <ul className="mt-3 space-y-3">
                {alerts.slice(0, 2).map((alert) => (
                  <li key={alert.id} className="text-sm">
                    <span className="font-medium">{alert.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {alert.detail}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <section className="mt-12">
        <Kicker>Trending asks</Kicker>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {trending.map((item) => (
            <button
              key={item.label}
              type="button"
              className="text-left text-sm transition hover:text-lime"
              onClick={() => submit(item.q)}
            >
              <span className="text-lime">{item.label}</span>
              <span className="mx-2 text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">{item.q}</span>
            </button>
          ))}
        </div>
      </section>

      <Panel className="mt-12 border-white/8 bg-card/40">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Kicker>Your intelligence briefing</Kicker>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Ranked for the teams and players you follow · DEMO facts where match-linked.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => go("feed")}>
            Personalise in Feed
          </Button>
        </div>
        <ul className="mt-5 divide-y divide-white/8">
          {briefing.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full gap-3 py-4 text-left transition hover:text-lime"
                onClick={() =>
                  go(item.screen, item.playerId ? { playerId: item.playerId } : undefined)
                }
              >
                <span aria-hidden className="mt-0.5 text-muted-foreground">
                  {item.icon}
                </span>
                <span>
                  <span className="block font-medium tracking-tight">{item.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      {/* Product-grid rhythm → sports briefing tiles (hairline, not card soup) */}
      <section className="mt-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Kicker>Context, not journalism</Kicker>
            <p className="mt-2 text-sm text-muted-foreground">
              Atmosphere briefs with space to breathe.
            </p>
          </div>
        </div>
        <div className="cos-brief-grid">
          {stories.map((storyItem) => (
            <button
              key={storyItem.id}
              type="button"
              onClick={() => setStoryId(storyItem.id)}
              className="cos-brief-tile"
            >
              <span className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                {storyItem.icon} {storyItem.kicker}
              </span>
              <span className="font-display mt-4 text-2xl leading-tight">{storyItem.title}</span>
              <span className="mt-auto pt-6 text-sm leading-relaxed text-muted-foreground">
                {storyItem.lede}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-14 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <section>
          <Kicker>Following · teams</Kicker>
          {myTeams.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Pick sides in onboarding or Feed.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/8">
              {myTeams.map((team) => (
                <li key={team.id}>
                  <button
                    type="button"
                    onClick={() => go("teams", { teamId: team.id })}
                    className="flex w-full items-baseline justify-between gap-3 py-3.5 text-left transition hover:text-lime"
                  >
                    <span className="font-medium tracking-tight">{team.name}</span>
                    <span className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                      {team.short}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <Kicker>Following · players</Kicker>
          {mine.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Follow players for DNA updates.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/8">
              {mine.map((player) => (
                <li key={player.id}>
                  <button
                    type="button"
                    onClick={() => go("players", { playerId: player.id })}
                    className="flex w-full items-center gap-4 py-3.5 text-left transition hover:text-lime"
                  >
                    <Spark values={player.form} label={`${player.name} recent returns`} />
                    <span className="min-w-0">
                      <span className="block font-medium tracking-tight">{player.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {teamLabel(player.teamId)} · {player.traits[0]?.label}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
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
