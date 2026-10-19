"use client";

import { useState } from "react";
import { ArrowRight, Check, Plus } from "lucide-react";
import { openAssistant, useApp } from "@/components/app-state";
import { PlayerSearchPicker } from "@/components/player-search-picker";
import { Kicker, PageTitle } from "@/components/ui-bits";
import { getPlayer, players, teamLabel, teams } from "@/lib/data";

export function FeedScreen() {
  const { go, followedPlayers, toggleFollow, followedTeams, toggleFollowTeam } = useApp();
  const [followQuery, setFollowQuery] = useState("");
  const mine = followedPlayers.map((id) => getPlayer(id)).filter((p) => p !== undefined);

  const quickAsks = [
    ...mine.slice(0, 3).map((p) => `How has ${p.name} performed in the IPL?`),
    ...teams
      .filter((t) => followedTeams.includes(t.id))
      .slice(0, 2)
      .map((t) => `What's next for ${t.name}?`),
  ];

  return (
    <div className="cos-panel-in">
      <PageTitle
        kicker="My Cricket"
        title="Your"
        emphasis="cricket"
        lede="Follow teams and players. Their matches and questions come first across the app."
      />

      {quickAsks.length ? (
        <section className="mb-8">
          <Kicker>Ask about your follows</Kicker>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickAsks.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => openAssistant(q)}
                className="flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-sm text-white transition hover:bg-navy/90"
              >
                {q} <ArrowRight className="size-3.5" />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass rounded-[1.75rem] p-6">
          <h2 className="font-display text-xl text-navy">
            <span className="font-light">Teams</span>
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {teams.map((team) => {
              const on = followedTeams.includes(team.id);
              return (
                <button
                  key={team.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleFollowTeam(team.id)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition ${
                    on ? "bg-navy text-white" : "border border-white/80 bg-white/65 text-navy hover:bg-white"
                  }`}
                >
                  {on ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                  {team.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="glass rounded-[1.75rem] p-6">
          <h2 className="font-display text-xl font-light text-navy">Players</h2>
          {mine.length ? (
            <ul className="mt-4 divide-y divide-white/60">
              {mine.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <button
                    type="button"
                    onClick={() => go("players", { playerId: p.id })}
                    className="min-w-0 text-left"
                  >
                    <span className="block truncate font-medium text-navy">{p.name}</span>
                    <span className="block text-xs text-slate">{teamLabel(p.teamId)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFollow(p.id)}
                    className="rounded-full bg-white/70 px-3 py-1.5 text-xs text-slate transition hover:bg-white hover:text-navy"
                  >
                    Unfollow
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate">No players followed yet.</p>
          )}
          <div className="mt-4">
            <PlayerSearchPicker
              catalog={players}
              query={followQuery}
              onQueryChange={setFollowQuery}
              selectedIds={followedPlayers}
              onSelect={(player) => {
                if (!followedPlayers.includes(player.id)) toggleFollow(player.id);
                setFollowQuery("");
              }}
              showSelectedChips={false}
              emptyPrompt="Type two letters to find a player to follow."
              placeholder="Follow a player…"
              inputId="feed-follow-search"
              limit={8}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
