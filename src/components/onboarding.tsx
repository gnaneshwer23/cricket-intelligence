"use client";

import { useState } from "react";
import { useApp } from "@/components/app-state";
import { Kicker } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import {
  getPlayer,
  onboardingPlayers,
  onboardingTeams,
  teamLabel,
  teams,
} from "@/lib/data";

export function Onboarding() {
  const { onboarded, completeOnboarding, skipOnboarding, go } = useApp();
  const [step, setStep] = useState<1 | 2>(1);
  const [pickedTeams, setPickedTeams] = useState<string[]>(["england"]);
  const [pickedPlayers, setPickedPlayers] = useState<string[]>(["joe-root", "ben-stokes"]);

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
    completeOnboarding(pickedTeams, pickedPlayers);
    go("home");
    window.setTimeout(() => {
      go("ask", {
        mode: "general",
        seedAsk: "Tell me everything important about England this week.",
      });
    }, 80);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-border bg-card p-6 shadow-2xl sm:p-8">
        <Kicker>Welcome to CricketOS</Kicker>
        <h2 className="font-display mt-3 text-4xl tracking-tight">Ask Cricket Anything</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Fan → AI → Answers → Predictions → Community → Action. Pick who you follow so the
          briefing and feed feel like yours.
        </p>

        {step === 1 ? (
          <div className="mt-6">
            <Kicker>Favourite teams</Kicker>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {onboardingTeams.map((id) => {
                const team = teams.find((item) => item.id === id);
                const active = pickedTeams.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleTeam(id)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active ? "border-lime bg-lime/10 text-foreground" : "border-border bg-muted/40"
                    }`}
                  >
                    <span className="block text-xs tracking-[0.16em] text-muted-foreground uppercase">
                      {team?.short}
                    </span>
                    <span className="mt-1 block font-medium">{team?.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="button" onClick={() => setStep(2)} disabled={pickedTeams.length === 0}>
                Next · players
              </Button>
              <Button type="button" variant="ghost" onClick={skipOnboarding}>
                Skip for now
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <Kicker>Favourite players</Kicker>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {onboardingPlayers.map((id) => {
                const player = getPlayer(id);
                if (!player) return null;
                const active = pickedPlayers.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => togglePlayer(id)}
                    className={`rounded-2xl border px-3 py-3 text-left transition ${
                      active ? "border-lime bg-lime/10" : "border-border bg-muted/40"
                    }`}
                  >
                    <span className="block text-sm font-medium">{player.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {teamLabel(player.teamId)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button type="button" onClick={finish}>
                Land on my briefing
              </Button>
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="button" variant="ghost" onClick={skipOnboarding}>
                Skip
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              After this you will get a seeded ask: “Tell me everything important about England
              this week.”
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
