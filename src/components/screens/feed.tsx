"use client";

import { useApp } from "@/components/app-state";
import { Kicker, PageTitle, Panel, Spark } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import {
  getPlayer,
  personalBriefing,
  smartAlerts,
  teamLabel,
  teams,
} from "@/lib/data";

export function FeedScreen() {
  const {
    go,
    followedPlayers,
    followedTeams,
    toggleFollow,
    toggleFollowTeam,
    recentChats,
    savedChats,
    saveChat,
    preferences,
    setPreferences,
  } = useApp();

  const mine = followedPlayers.map((id) => getPlayer(id)).filter((p) => p !== undefined);
  const myTeams = teams.filter((team) => followedTeams.includes(team.id));
  const alerts = smartAlerts.filter((alert) => {
    if (!preferences.alerts) return false;
    if (preferences.englandOnly && alert.teamId && alert.teamId !== "england") return false;
    if (alert.playerId && followedPlayers.includes(alert.playerId)) return true;
    if (alert.teamId && followedTeams.includes(alert.teamId)) return true;
    return !alert.playerId && !alert.teamId;
  });
  const briefing = personalBriefing(followedPlayers, followedTeams).filter((item) => {
    if (!preferences.englandOnly) return true;
    return Boolean(item.teamIds?.includes("england"));
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        kicker="Personal feed"
        title="Your cricket, continuously."
        lede="Favourites, saved asks, smart alerts, and predictions — a personalization slice without a full assistant stack."
      />

      <Panel className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Kicker>Assistant preferences</Kicker>
            <p className="mt-2 text-sm text-muted-foreground">
              Lite filters for the briefing and alerts.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={preferences.englandOnly ? "default" : "secondary"}
              onClick={() => setPreferences({ englandOnly: !preferences.englandOnly })}
            >
              {preferences.englandOnly ? "England-only on" : "England-only off"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={preferences.alerts ? "default" : "secondary"}
              onClick={() => setPreferences({ alerts: !preferences.alerts })}
            >
              {preferences.alerts ? "Alerts on" : "Alerts off"}
            </Button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <Kicker>Smart alerts</Kicker>
          {alerts.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No alerts for your follows right now — or alerts are paused.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {alerts.map((alert) => (
                <li key={alert.id} className="py-3">
                  <p className="font-medium">{alert.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.detail}</p>
                  <p className="mt-2 text-[11px] tracking-[0.14em] text-lime uppercase">
                    {alert.kind}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="lg:col-span-2">
          <Kicker>Predictions for you</Kicker>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <span className="text-muted-foreground">Top scorer · </span>
              Root 61%
            </li>
            <li>
              <span className="text-muted-foreground">Dangerous bowler · </span>
              Bumrah 72%
            </li>
            <li>
              <span className="text-muted-foreground">Next chunk of runs · </span>
              Stokes 54%
            </li>
          </ul>
          <Button
            type="button"
            className="mt-5"
            variant="secondary"
            onClick={() => {
              go("ask", { mode: "predictions", seedAsk: "Why is England winning?" });
            }}
          >
            Ask the model
          </Button>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <Kicker>Recent chats</Kicker>
          {recentChats.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Ask Cricket something and it will land here.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentChats.slice(0, 6).map((chat) => (
                <li key={chat.id} className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="text-left text-sm hover:text-lime"
                    onClick={() => {
                      go("ask", { mode: "general", seedAsk: chat.question });
                    }}
                  >
                    <span className="block font-medium">{chat.question}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{chat.headline}</span>
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => saveChat(chat)}
                  >
                    Save
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <Kicker>Saved chats</Kicker>
          {savedChats.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Pin answers you want to reopen.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {savedChats.map((chat) => (
                <li key={chat.id}>
                  <button
                    type="button"
                    className="text-left text-sm hover:text-lime"
                    onClick={() => {
                      go("ask", { mode: "general", seedAsk: chat.question });
                    }}
                  >
                    <span className="block font-medium">{chat.question}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{chat.headline}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <Kicker>Favourite teams</Kicker>
            <Button type="button" size="sm" variant="ghost" onClick={() => go("teams")}>
              Manage
            </Button>
          </div>
          {myTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground">Follow a side to seed this feed.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {myTeams.map((team) => (
                <div key={team.id} className="rounded-3xl border border-border bg-card/80 p-4">
                  <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                    {team.short}
                  </p>
                  <p className="mt-1 font-medium">{team.name}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    onClick={() => toggleFollowTeam(team.id)}
                  >
                    Unfollow
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <Kicker>Favourite players</Kicker>
            <Button type="button" size="sm" variant="ghost" onClick={() => go("players")}>
              Browse
            </Button>
          </div>
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">Follow players for DNA and milestones.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {mine.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 rounded-3xl border border-border bg-card/80 p-4"
                >
                  <Spark values={player.form} label={`${player.name} form`} />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="block truncate font-medium hover:text-lime"
                      onClick={() => go("players", { playerId: player.id })}
                    >
                      {player.name}
                    </button>
                    <p className="text-xs text-muted-foreground">{teamLabel(player.teamId)}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-1 h-7 px-0"
                      onClick={() => toggleFollow(player.id)}
                    >
                      Unfollow
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Panel className="mt-6">
        <Kicker>From your briefing</Kicker>
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
                <span aria-hidden>{item.icon}</span>
                <span>
                  <span className="block font-medium">{item.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{item.detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
