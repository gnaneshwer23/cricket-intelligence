"use client";

import { useState } from "react";
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
import { Kicker, Panel, Spark, useCountdown, useGreeting, WinSplit } from "@/components/ui-bits";
import {
  baseWin,
  briefing,
  getPlayer,
  recommendations,
  stories,
  teamLabel,
  teams,
  upcoming,
} from "@/lib/data";

export function HomeScreen() {
  const { go, ask, followedPlayers, followedTeams } = useApp();
  const { greeting, dateLabel } = useGreeting();
  const countdown = useCountdown();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const story = stories.find((item) => item.id === storyId) ?? null;
  const mine = followedPlayers.map((id) => getPlayer(id)).filter((player) => player !== undefined);
  const myTeams = teams.filter((team) => followedTeams.includes(team.id));

  function submit(question: string, mode: "general" | "historical" | "career" = "general") {
    const text = question.trim();
    if (!text) {
      setError("Ask a question first.");
      return;
    }
    setError(null);
    go("ask", { mode });
    ask(text, mode);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>{dateLabel}</Kicker>
          <h1 className="font-display mt-2 text-4xl font-medium tracking-tight sm:text-6xl">
            {greeting}, James
          </h1>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          Lord’s, day two. The session is the product. The score is only the start of it.
        </p>
      </header>

      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card">
        <div className="absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-lime to-transparent" />
        <div className="grid lg:grid-cols-5">
          <div className="p-6 sm:p-8 lg:col-span-3">
            <Kicker>Watch now · 3rd Test</Kicker>
            <h2 className="font-display mt-3 text-4xl tracking-tight sm:text-5xl">England vs India</h2>
            <p className="mt-2 text-sm text-muted-foreground">Lord’s · Day 2 · overnight score</p>
            <p className="font-display mt-6 text-7xl leading-none tracking-tight tabular-nums sm:text-8xl">
              245<span className="text-lime">/4</span>
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              48.2 overs · Root 89 not out · Stokes just in
            </p>
            <div className="mt-6 flex flex-wrap items-end gap-6">
              <div>
                <Kicker>Session starts in</Kicker>
                <p className="mt-1 font-mono text-3xl tabular-nums">{countdown}</p>
              </div>
              <Button className="h-11 px-4" onClick={() => go("match")}>
                Open mission control
              </Button>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-6 border-t border-border bg-black/20 p-6 sm:p-8 lg:col-span-2 lg:border-t-0 lg:border-l">
            <div>
              <Kicker>Win model</Kicker>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-eng text-sm">England</p>
                  <p className="font-display text-5xl tabular-nums">{baseWin.eng}%</p>
                </div>
                <div>
                  <p className="text-ind text-sm">India</p>
                  <p className="font-display text-5xl tabular-nums">{baseWin.ind}%</p>
                </div>
              </div>
            </div>
            <WinSplit eng={baseWin.eng} ind={baseWin.ind} />
            <p className="text-sm leading-relaxed text-muted-foreground">
              England are 21 runs ahead of the phase model. The hour that did it was overs 22–30.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <Kicker>Your AI briefing</Kicker>
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
        <div className="grid gap-3 lg:col-span-2">
          <button
            type="button"
            onClick={() => go("match")}
            className="rounded-3xl border border-border bg-card/90 p-5 text-left"
          >
            <Kicker>Live matches</Kicker>
            <p className="mt-3 font-medium">England vs India</p>
            <p className="text-sm text-muted-foreground">Session in {countdown} · 245/4</p>
          </button>
          <button
            type="button"
            onClick={() => setShowUpcoming(true)}
            className="rounded-3xl border border-dashed border-border p-5 text-left"
          >
            <Kicker>Upcoming</Kicker>
            <p className="mt-3 font-medium">{upcoming.title}</p>
            <p className="text-sm text-muted-foreground">{upcoming.meta}</p>
          </button>
        </div>
      </div>

      <section className="mt-8">
        <Kicker>Today’s stories</Kicker>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {stories.map((storyItem) => (
            <button
              key={storyItem.id}
              type="button"
              onClick={() => setStoryId(storyItem.id)}
              className="flex min-h-52 flex-col rounded-3xl border border-border bg-card/80 p-5 text-left transition hover:-translate-y-0.5 hover:border-lime/40"
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

      <Panel className="mt-8">
        <Kicker>Ask Cricket</Kicker>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            submit(draft);
          }}
        >
          <label className="sr-only" htmlFor="home-ask">
            Tell me anything
          </label>
          <Input
            id="home-ask"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError(null);
            }}
            placeholder="Tell me anything"
            aria-invalid={error ? true : undefined}
            className="h-12! flex-1 px-4"
          />
          <Button type="submit" className="h-12 px-5" size="lg">
            <ArrowUp />
            Ask
          </Button>
        </form>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {recommendations.map((item) => (
            <Button
              key={item.q}
              type="button"
              variant="secondary"
              className="h-auto px-3 py-2 text-left whitespace-normal"
              onClick={() => submit(item.q, item.mode)}
            >
              {item.q}
            </Button>
          ))}
        </div>
      </Panel>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <Kicker>My teams</Kicker>
          {myTeams.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No teams followed. Open Teams and follow a side.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {myTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => go("teams", { teamId: team.id })}
                  className="rounded-3xl border border-border bg-card/80 p-4 text-left"
                >
                  <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">{team.short}</p>
                  <p className="mt-1 font-medium">{team.name}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{team.styles[0]}</p>
                </button>
              ))}
            </div>
          )}
        </section>
        <section>
          <Kicker>My players</Kicker>
          {mine.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              You are not following anyone. Open a player and follow them.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {mine.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => go("players", { playerId: player.id })}
                  className="flex items-center gap-3 rounded-3xl border border-border bg-card/80 p-4 text-left"
                >
                  <Spark values={player.form} label={`${player.name} recent returns`} />
                  <span>
                    <span className="block font-medium">{player.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {teamLabel(player.teamId)} · {player.role}
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
