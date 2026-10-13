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
import { DataStatusStrip } from "@/components/data-status-strip";
import { LiveFixturesBoard, type BoardRow } from "@/components/live-fixtures-board";
import { TruthSetupPanel } from "@/components/truth-setup-panel";
import { FreshnessBadge, StatusBadge } from "@/components/status-badge";
import { Kicker, Panel, Spark, useGreeting } from "@/components/ui-bits";
import { useDataHealth, useFixtures } from "@/hooks/use-data-layer";
import type { FreshnessStatus, MatchLifecycle } from "@/lib/contracts";
import { getPlayer, teamLabel, teams } from "@/lib/data";
import { buildProviderBriefing } from "@/lib/provider-briefing";
import { openDemoPlayground } from "@/lib/truth-mode";

export function HomeScreen() {
  const { go, followedPlayers, followedTeams } = useApp();
  const { greeting } = useGreeting();
  const health = useDataHealth();
  const fixtures = useFixtures(15_000);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showFixture, setShowFixture] = useState(false);

  const providerReady =
    health.status === "ok" &&
    health.summary &&
    !health.summary.demoMode &&
    health.summary.dataApiKeyConfigured;

  const fixtureHighlight = fixtures.upcoming ?? fixtures.fixtures[0] ?? null;
  const fixtureFreshness = (fixtureHighlight?.freshness ?? "UNAVAILABLE") as FreshnessStatus;
  const fixtureStatus = (fixtureHighlight?.status ?? "UPCOMING") as MatchLifecycle;

  const briefing = useMemo(() => {
    if (!providerReady) return [];
    return buildProviderBriefing(fixtures.fixtures);
  }, [providerReady, fixtures.fixtures]);

  const mine = followedPlayers
    .map((id) => getPlayer(id))
    .filter((player) => player !== undefined)
    .slice(0, 4);
  const myTeams = teams.filter((team) => followedTeams.includes(team.id));

  function openMatchFromBoard(row: BoardRow) {
    try {
      sessionStorage.setItem("cricketos-match-pick", row.id);
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      window.location.hash = "live";
    } else {
      go("match");
    }
  }

  function openLiveHub() {
    if (typeof window !== "undefined") {
      window.location.hash = "live";
    } else {
      go("match");
    }
  }

  function submit(question: string, mode: "general" | "historical" | "career" | "predictions" = "general") {
    const text = question.trim();
    if (!text) {
      setError("Ask a question first.");
      return;
    }
    setError(null);
    go("ask", { mode, seedAsk: text });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <section className="cos-hero rounded-[2rem] border border-white/8">
        <div className="relative z-[1] px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
          <div className="cos-hero-in max-w-2xl">
            <p className="font-display text-[clamp(3rem,8vw,4.75rem)] font-semibold leading-none text-lime">
              CricketOS
            </p>
            <h1 className="font-display mt-7 text-[clamp(1.65rem,4vw,2.75rem)] font-medium leading-[1.15] text-balance">
              The intelligence layer for cricket.
            </h1>
            <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground sm:text-base">
              {greeting}. What happened, why, evidence, what might happen next — the match is the
              centre. Facts need a licensed provider; DEMO playground is opt-in only.
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
              placeholder="What fixtures are available?"
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

      <section className="mt-10" aria-labelledby="live-scores-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Kicker className="text-cyan">
              <span id="live-scores-heading">Cricket Today</span>
            </Kicker>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {providerReady
                ? "Provider fixtures only · tap a card for Match Intelligence"
                : "Requires CRICKETOS_DATA_API_KEY · no invented scores"}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cos-cta border-white/12"
            onClick={openLiveHub}
          >
            Match Intelligence
          </Button>
        </div>
        <div className="mb-3">
          <DataStatusStrip />
        </div>
        {providerReady ? (
          <LiveFixturesBoard compact limit={8} onSelect={openMatchFromBoard} />
        ) : (
          <TruthSetupPanel compact showDemoLink />
        )}
      </section>

      {!providerReady ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Optional:{" "}
          <button
            type="button"
            className="text-gold underline-offset-2 hover:underline"
            onClick={() => openDemoPlayground()}
          >
            Try DEMO playground
          </button>{" "}
          — scripted Lord&apos;s sim, always watermarked DEMO, never the default homepage.
        </p>
      ) : null}

      {providerReady ? (
        <>
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-12">
            <div>
              <Kicker>Provider briefing</Kicker>
              {briefing.length === 0 ? (
                <p className="mt-5 text-sm text-muted-foreground">
                  No fixture-derived briefing yet — waiting on provider rows.
                </p>
              ) : (
                <ul className="mt-5 space-y-0 divide-y divide-white/8">
                  {briefing.slice(0, 3).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="w-full py-4 text-left transition hover:text-lime"
                        onClick={() => go(item.screen)}
                      >
                        <span className="block text-base font-medium tracking-tight">
                          {item.title}
                        </span>
                        <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                          {item.detail}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-8 border-t border-white/10 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
              {fixtureHighlight ? (
                <button
                  type="button"
                  onClick={() => setShowFixture(true)}
                  className="text-left transition hover:text-lime"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={fixtureStatus} />
                    <FreshnessBadge freshness={fixtureFreshness} />
                    <Kicker>Fixture</Kicker>
                  </div>
                  <p className="font-display mt-3 text-xl tracking-tight">
                    {fixtureHighlight.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {fixtureHighlight.venue}
                    {fixtureHighlight.format ? ` · ${fixtureHighlight.format}` : ""}
                  </p>
                </button>
              ) : (
                <p className="text-sm text-muted-foreground">No provider fixtures yet.</p>
              )}
            </div>
          </div>

          <Panel className="mt-12 border-white/8 bg-card/40">
            <Kicker>Your intelligence briefing</Kicker>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Derived from provider fixtures only — series, venue, status, timestamps.
            </p>
            {briefing.length === 0 ? (
              <p className="mt-5 text-sm text-muted-foreground">
                I don&apos;t have fixture-derived items in the dataset yet.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-white/8">
                {briefing.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full gap-3 py-4 text-left transition hover:text-lime"
                      onClick={() => go(item.screen)}
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
            )}
          </Panel>
        </>
      ) : null}

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
            <p className="mt-3 text-sm text-muted-foreground">Follow players for profile updates.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/8">
              {mine.map((player) => (
                <li key={player.id}>
                  <button
                    type="button"
                    onClick={() => go("players", { playerId: player.id })}
                    className="flex w-full items-center gap-4 py-3.5 text-left transition hover:text-lime"
                  >
                    {player.catalogStub || !player.statsVerified ? (
                      <span className="flex size-10 items-center justify-center rounded-full border border-white/10 text-[10px] tracking-wide text-muted-foreground uppercase">
                        {player.role.slice(0, 3)}
                      </span>
                    ) : (
                      <Spark values={player.form} label={`${player.name} recent returns`} />
                    )}
                    <span className="min-w-0">
                      <span className="block font-medium tracking-tight">{player.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {teamLabel(player.teamId)} · {player.role}
                        {player.span ? ` · ${player.span}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Dialog open={showFixture} onOpenChange={setShowFixture}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {fixtureHighlight?.title ?? "Fixture"}
            </DialogTitle>
            <DialogDescription>
              {fixtureHighlight
                ? `${fixtureHighlight.venue} · ${fixtureHighlight.freshness}`
                : "No fixture"}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {fixtureHighlight?.provenance?.note ??
              "Provider fixture — scores and status only when the feed supplies them."}
          </p>
          {fixtures.fixtures.length > 0 ? (
            <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              {fixtures.fixtures.slice(0, 8).map((f) => (
                <li key={f.id} className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{f.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {f.freshness} · {f.venue}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
