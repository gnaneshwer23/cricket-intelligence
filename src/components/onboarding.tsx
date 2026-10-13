"use client";

import { useState } from "react";
import { useApp } from "@/components/app-state";
import { PlayerSearchPicker } from "@/components/player-search-picker";
import { Kicker } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getPlayer, players } from "@/lib/data";
import {
  ONBOARDING_DEFAULT_PLAYERS,
  ONBOARDING_DEFAULT_TEAMS,
} from "@/lib/curated-slate";
import {
  catalogTeams,
  featuredPlayerIds,
  seedAskFromChoices,
  type CatalogTeam,
} from "@/lib/onboarding-catalog";
import type { Role } from "@/lib/types";

const STEPS = ["Welcome", "Nations", "IPL", "Players", "Ready"] as const;

export function Onboarding() {
  const { onboarded, completeOnboarding, skipOnboarding, go } = useApp();
  const [step, setStep] = useState(0);
  const [pickedTeams, setPickedTeams] = useState<string[]>([...ONBOARDING_DEFAULT_TEAMS]);
  const [pickedPlayers, setPickedPlayers] = useState<string[]>([...ONBOARDING_DEFAULT_PLAYERS]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "All">("All");

  const nations = catalogTeams.filter((team) => team.group === "international");
  const ipl = catalogTeams.filter((team) => team.group === "ipl");

  if (onboarded) return null;

  function toggleTeam(id: string) {
    setPickedTeams((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function togglePlayer(id: string) {
    setPickedPlayers((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function finish() {
    const seed = seedAskFromChoices(pickedTeams, pickedPlayers);
    completeOnboarding(pickedTeams, pickedPlayers, seed);
    go("home");
    window.setTimeout(() => {
      go("ask", { mode: "general", seedAsk: seed });
    }, 80);
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl">
        <div className="border-b border-border bg-[radial-gradient(ellipse_at_top_left,oklch(0.32_0.07_145/0.45),transparent_55%),linear-gradient(160deg,oklch(0.17_0.02_145),oklch(0.13_0.01_120))] px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <Kicker>
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </Kicker>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={skipOnboarding}
            >
              Skip
            </button>
          </div>
          <Progress value={progress} className="mt-3 h-1.5" />
          <p className="font-display mt-4 text-4xl tracking-tight text-navy sm:text-5xl">CricketOS</p>
          <h2 id="onboarding-title" className="font-display mt-2 text-2xl tracking-tight sm:text-3xl">
            {step === 0 && "Pick your cricket world"}
            {step === 1 && "Which nations do you follow?"}
            {step === 2 && "Follow an IPL side?"}
            {step === 3 && "Who are your players?"}
            {step === 4 && "Your briefing is ready"}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            {step === 0 &&
              "Follow · understand · explore what next. Choose sides and stars so briefing and Ask feel like yours. Match data starts in DEMO mode."}
            {step === 1 && "Multi-select. England through Bangladesh — build the map you care about."}
            {step === 2 && "Optional. Franchise follows sit beside your nations without bloating Ask."}
            {step === 3 &&
              "Search across cricket history. Type a name — we will not dump the whole catalog."}
            {step === 4 && "We will seed Ask from your top side and land you on a personal briefing."}
          </p>
        </div>

        <div className="max-h-[min(52dvh,28rem)] overflow-y-auto px-5 py-5 sm:px-8">
          {step === 0 ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["9+", "Test nations"],
                  ["10", "IPL franchises"],
                  [String(players.length), "Player profiles"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-border bg-muted/40 px-4 py-3">
                    <p className="font-display text-3xl text-navy">{value}</p>
                    <p className="mt-1 text-xs tracking-[0.14em] text-muted-foreground uppercase">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Fan → AI → Answers → Predictions. Primary product stays Ask Cricket — this just tunes
                the room to your sides.
              </p>
            </div>
          ) : null}

          {step === 1 ? (
            <TeamGrid teams={nations} picked={pickedTeams} onToggle={toggleTeam} />
          ) : null}

          {step === 2 ? (
            <div>
              <p className="mb-3 text-sm text-muted-foreground">
                Skip if you only follow internationals. Or pick one or more franchises.
              </p>
              <TeamGrid teams={ipl} picked={pickedTeams} onToggle={toggleTeam} />
            </div>
          ) : null}

          {step === 3 ? (
            <PlayerSearchPicker
              catalog={players}
              query={query}
              onQueryChange={setQuery}
              roleFilter={roleFilter}
              onRoleFilterChange={setRoleFilter}
              showRoleFilters
              selectedIds={pickedPlayers}
              onToggleSelect={togglePlayer}
              showSelectedChips
              boostIds={featuredPlayerIds}
              resolveName={(id) => getPlayer(id)?.name}
              emptyPrompt="Follow stars from any era. Try a surname — results appear after two characters."
              placeholder="Search Bradman, Kohli, Ambrose…"
              inputId="onboarding-player-search"
            />
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <div>
                <Kicker>Teams</Kicker>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pickedTeams.length === 0 ? (
                    <span className="text-sm text-muted-foreground">None — we will default England.</span>
                  ) : (
                    pickedTeams.map((id) => {
                      const team = catalogTeams.find((item) => item.id === id);
                      return (
                        <span
                          key={id}
                          className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs"
                        >
                          {team?.short ?? id} · {team?.name ?? id}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <Kicker>Players</Kicker>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pickedPlayers.length === 0 ? (
                    <span className="text-sm text-muted-foreground">None — we will default Root.</span>
                  ) : (
                    pickedPlayers.map((id) => (
                      <span
                        key={id}
                        className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs"
                      >
                        {getPlayer(id)?.name ?? id}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <p className="rounded-2xl border border-lime/20 bg-lime/5 px-4 py-3 text-sm text-muted-foreground">
                Seeded ask: “{seedAskFromChoices(pickedTeams, pickedPlayers)}”
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 sm:px-8">
          <div className="flex flex-wrap gap-2">
            {step > 0 ? (
              <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={skipOnboarding}>
              Skip for now
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={() => setStep((s) => s + 1)}>
                {step === 2 ? "Next · players" : step === 0 ? "Choose nations" : "Continue"}
              </Button>
            ) : (
              <Button type="button" onClick={finish}>
                Land on my briefing
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamGrid({
  teams,
  picked,
  onToggle,
}: {
  teams: CatalogTeam[];
  picked: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {teams.map((team) => {
        const active = picked.includes(team.id);
        return (
          <button
            key={team.id}
            type="button"
            onClick={() => onToggle(team.id)}
            className={`rounded-2xl border px-3 py-3 text-left transition sm:px-4 ${
              active ? "border-lime bg-lime/10" : "border-border bg-muted/35 hover:border-lime/30"
            }`}
          >
            <span className="block text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              {team.short}
            </span>
            <span className="mt-1 block text-sm font-medium">{team.name}</span>
            <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
              {team.blurb}
            </span>
          </button>
        );
      })}
    </div>
  );
}
