"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/app-state";
import { KindBadge } from "@/components/status-badge";
import { Kicker, Meter, PageTitle, Panel, Spark } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { sampleSizeWarning } from "@/lib/calc";
import { dnaLabels, getPlayer, players, teamLabel } from "@/lib/data";
import { answerQuestion } from "@/lib/engine";
import {
  PLAYER_SEARCH_DEBOUNCE_MS,
  PLAYER_SEARCH_EXAMPLES,
  PLAYER_SEARCH_MIN_CHARS,
  searchPlayerList,
} from "@/lib/player-search";
import type { Answer, Role } from "@/lib/types";

const roleFilters: Array<Role | "All"> = ["All", "Batter", "Bowler", "All-rounder", "Keeper"];

export function PlayersScreen() {
  const { playerId, setPlayerId, followedPlayers, toggleFollow, go } = useApp();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "All">("All");
  const [nodeId, setNodeId] = useState("self");
  const [twinDraft, setTwinDraft] = useState("");
  const [twinError, setTwinError] = useState<string | null>(null);
  const [twinLog, setTwinLog] = useState<Record<string, { q: string; a: Answer }[]>>({});
  const [thinking, setThinking] = useState(false);

  const debouncedQuery = useDebouncedValue(query, PLAYER_SEARCH_DEBOUNCE_MS);
  const searching = debouncedQuery.trim().length >= PLAYER_SEARCH_MIN_CHARS;

  const filtered = useMemo(() => {
    if (!searching) return [];
    return searchPlayerList(players, debouncedQuery, {
      role: roleFilter,
      boostIds: followedPlayers,
      limit: 30,
    });
  }, [debouncedQuery, searching, roleFilter, followedPlayers]);

  const followedProfiles = useMemo(
    () =>
      followedPlayers
        .map((id) => getPlayer(id))
        .filter((player): player is NonNullable<typeof player> => Boolean(player)),
    [followedPlayers],
  );

  const resolvedId = playerId || followedPlayers[0] || "";
  const player = resolvedId ? getPlayer(resolvedId) : undefined;
  const followed = player ? followedPlayers.includes(player.id) : false;
  const log = player ? (twinLog[player.id] ?? []) : [];

  const nodes = player
    ? [
        { id: "self", title: player.name, body: player.blurb },
        {
          id: "similar",
          title: "Most similar players",
          body: player.similar
            .map((item) => `${getPlayer(item.id)?.name ?? item.id} · ${item.score}%. ${item.note}`)
            .join(" "),
        },
        {
          id: "top",
          title: getPlayer(player.similar[0]?.id ?? "")?.name ?? "Nearest twin",
          body: player.similar[0]?.note ?? player.blurb,
          openId: player.similar[0]?.id,
        },
        { id: "away", title: "Greatest away innings", body: player.away },
        { id: "chases", title: "Best chases", body: player.chases },
        { id: "opponents", title: "Historic opponents", body: player.opponents },
      ]
    : [];
  const activeNode = nodes.find((node) => node.id === nodeId) ?? nodes[0];

  function askTwin(question: string) {
    const text = question.trim();
    if (!player) {
      setTwinError("Pick a player first.");
      return;
    }
    if (!text) {
      setTwinError("Ask the Twin something first.");
      return;
    }
    const activePlayerId = player.id;
    setTwinError(null);
    setTwinDraft("");
    setThinking(true);
    window.setTimeout(() => {
      const answer = answerQuestion(text, "twin", activePlayerId);
      setTwinLog((current) => ({
        ...current,
        [activePlayerId]: [...(current[activePlayerId] ?? []), { q: text, a: answer }],
      }));
      setThinking(false);
    }, 600);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        kicker="Player Intelligence"
        title="Career DNA, living traits."
        lede="Forecast and similarities from the DEMO file. Similarity scores are authored — small samples are flagged."
      />
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <div>
          <label className="sr-only" htmlFor="player-search">
            Search players
          </label>
          <Input
            id="player-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Bradman, Kohli…"
            className="h-10"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {roleFilters.map((role) => (
              <Button
                key={role}
                type="button"
                size="sm"
                variant={roleFilter === role ? "default" : "ghost"}
                className="h-7 px-2 text-[11px]"
                onClick={() => setRoleFilter(role)}
              >
                {role}
              </Button>
            ))}
          </div>
          <ScrollArea className="mt-3 h-auto lg:h-[calc(100dvh-12rem)]">
            {followedProfiles.length > 0 ? (
              <div className="mb-4">
                <p className="px-1 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                  Following
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {followedProfiles.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setPlayerId(item.id);
                        setNodeId("self");
                      }}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        item.id === player?.id
                          ? "border-lime bg-lime/15 text-foreground"
                          : "border-border bg-muted/40 text-muted-foreground hover:border-lime/30"
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {!searching ? (
              <div className="px-1 py-2">
                <p className="text-sm text-muted-foreground">
                  Search cricket history — results appear after two characters. No full roster dump.
                </p>
                <p className="mt-3 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                  Try
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PLAYER_SEARCH_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs hover:border-action/50 hover:text-action"
                      onClick={() => setQuery(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-1 py-6 text-sm text-muted-foreground" role="status">
                No matches for “{debouncedQuery.trim()}”. Try another spelling or surname.
              </p>
            ) : (
              <ul className="flex gap-2 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">
                {filtered.map((item) => (
                  <li key={item.id} className="shrink-0 lg:shrink">
                    <button
                      type="button"
                      onClick={() => {
                        setPlayerId(item.id);
                        setNodeId("self");
                      }}
                      className={`w-full rounded-2xl px-3 py-2 text-left text-sm ${
                        item.id === player?.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      <span className="block font-medium">{item.name}</span>
                      <span
                        className={`block text-xs ${
                          item.id === player?.id ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        {teamLabel(item.teamId)} · {item.span}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>

        <div>
          {!player ? (
            <Panel className="border-border bg-card/40">
              <Kicker>Search first</Kicker>
              <h2 className="font-display mt-3 text-3xl tracking-tight sm:text-4xl">
                Find any player
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Cricket Intelligence is multi-team — Kohli, Babar, Mandhana, Warner, legends. Search the
                catalog or pick someone you follow. We do not open on Joe Root by default.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {PLAYER_SEARCH_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm hover:border-action/50 hover:text-action"
                    onClick={() => setQuery(example)}
                  >
                    {example}
                  </button>
                ))}
              </div>
              {followedProfiles[0] ? (
                <Button
                  type="button"
                  className="cos-cta mt-6"
                  onClick={() => {
                    setPlayerId(followedProfiles[0].id);
                    setNodeId("self");
                  }}
                >
                  Open {followedProfiles[0].name}
                </Button>
              ) : null}
            </Panel>
          ) : (
            <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Kicker>
                {teamLabel(player.teamId)} · {player.role} · {player.span}
              </Kicker>
              <h2 className="font-display mt-2 text-4xl sm:text-5xl">{player.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {player.style} · age {player.age}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!player.catalogStub ? (
                <Spark values={player.form} label={player.formLabel} />
              ) : null}
              <Button
                type="button"
                variant={followed ? "secondary" : "default"}
                onClick={() => toggleFollow(player.id)}
              >
                {followed ? "Following" : "Follow"}
              </Button>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {player.catalogStub
              ? `${player.blurb} Catalog profile — name, era, and role only until verified stats are wired.`
              : player.formNote}
          </p>

          {player.catalogStub ? (
            <Panel className="mt-6 border-border bg-card/40">
              <Kicker>Verified stats unavailable</Kicker>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                This catalog stub has no licensed provider stats. DNA percentages, form sparklines,
                and forecast chances are hidden so they cannot be mistaken for official figures.
              </p>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gold">
                  Show illustrative model (not official stats)
                </summary>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {dnaLabels.map((item) => (
                    <Meter key={item.key} label={item.label} value={player.dna[item.key]} />
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Illustrative model, not official stats.
                </p>
              </details>
            </Panel>
          ) : null}

          <Tabs defaultValue={player.catalogStub ? "report" : "dna"} className="mt-6">
            <TabsList variant="line" className="h-auto! w-full justify-start overflow-x-auto">
              {!player.catalogStub ? <TabsTrigger value="dna">DNA</TabsTrigger> : null}
              {!player.catalogStub ? <TabsTrigger value="traits">Traits</TabsTrigger> : null}
              {!player.catalogStub ? <TabsTrigger value="projection">Forecast</TabsTrigger> : null}
              {!player.catalogStub ? <TabsTrigger value="similar">Similar</TabsTrigger> : null}
              <TabsTrigger value="report">Profile</TabsTrigger>
              {!player.catalogStub ? <TabsTrigger value="milestones">Milestones</TabsTrigger> : null}
              {!player.catalogStub ? <TabsTrigger value="twin">Cricket Twin</TabsTrigger> : null}
              {!player.catalogStub ? <TabsTrigger value="universe">Universe</TabsTrigger> : null}
            </TabsList>

            {!player.catalogStub ? (
            <TabsContent value="dna" className="mt-4">
              <Panel>
                <Kicker>Career DNA</Kicker>
                <p className="mt-2 text-sm leading-relaxed text-gold">
                  Illustrative model, not official stats.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Authored DNA for product exploration — not a licensed statistical feed.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {dnaLabels.map((item) => (
                    <Meter key={item.key} label={item.label} value={player.dna[item.key]} />
                  ))}
                </div>
              </Panel>
            </TabsContent>
            ) : null}

            {!player.catalogStub ? (
            <>
            <TabsContent value="traits" className="mt-4">
              <Panel>
                <Kicker>Living personality traits</Kicker>
                <p className="mt-2 text-sm text-gold">Illustrative model, not official stats.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Updated as the profile narrative moves — not a licensed feed.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {player.traits
                    .slice()
                    .sort((a, b) => b.level - a.level)
                    .map((trait) => (
                      <div key={trait.label} className="rounded-2xl bg-muted/50 p-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="font-display text-2xl">{trait.label}</h3>
                          <span className="text-lime text-xl tabular-nums">{trait.level}</span>
                        </div>
                        <div className="mt-3">
                          <Progress value={trait.level} aria-label={trait.label} className="h-1.5" />
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">{trait.note}</p>
                      </div>
                    ))}
                </div>
              </Panel>
            </TabsContent>

            <TabsContent value="projection" className="mt-4">
              <Panel>
                <Kicker>Career forecast</Kicker>
                <p className="mt-2 text-sm text-gold">Illustrative model, not official stats.</p>
                <h3 className="font-display mt-3 text-3xl">{player.projection.headline}</h3>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    [player.projection.headline, player.projection.elite],
                    ["Captaincy path", player.projection.captain],
                    ["World XI", player.projection.worldXI],
                    [player.projection.landmark, player.projection.landmarkChance],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{label}</span>
                        <span className="tabular-nums">{value}%</span>
                      </div>
                      <Progress value={Number(value)} aria-label={String(label)} className="h-2" />
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-muted/50 p-4">
                    <Kicker>Retirement</Kicker>
                    <p className="font-display mt-2 text-3xl">{player.projection.retire}</p>
                  </div>
                  <div className="rounded-2xl bg-muted/50 p-4">
                    <Kicker>Expected peak age</Kicker>
                    <p className="font-display mt-2 text-3xl">{player.projection.peakAge}</p>
                  </div>
                </div>
              </Panel>
            </TabsContent>

            <TabsContent value="similar" className="mt-4">
              <p className="mb-3 text-sm text-muted-foreground">
                <KindBadge kind="demo" className="mr-2" />
                Authored similarity graph
                {sampleSizeWarning(player.similar.length, 5)
                  ? ` · ${sampleSizeWarning(player.similar.length, 5)}`
                  : null}
              </p>
              <div className="grid gap-3">
                {player.similar.map((item) => {
                  const other = getPlayer(item.id);
                  if (!other) return null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setPlayerId(other.id);
                        setNodeId("self");
                      }}
                      className="rounded-3xl border border-border bg-card/90 p-5 text-left"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-display text-2xl">{other.name}</h3>
                        <span className="text-lime text-lg tabular-nums">{item.score}%</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>
                    </button>
                  );
                })}
              </div>
            </TabsContent>
            </>
            ) : null}

            <TabsContent value="report" className="mt-4">
              {player.catalogStub ? (
                <Panel>
                  <Kicker>
                    {teamLabel(player.teamId)} · {player.role} · {player.span}
                  </Kicker>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{player.blurb}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Name, era, and role only — no verified official stats in the dataset.
                  </p>
                </Panel>
              ) : (
                <>
                  <p className="mb-3 text-sm text-gold">Illustrative profile notes — not official stats.</p>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Panel>
                      <Kicker>Strengths</Kicker>
                      <ul className="mt-3 space-y-2 text-sm">
                        {player.report.strengths.map((item) => (
                          <li key={item}>· {item}</li>
                        ))}
                      </ul>
                    </Panel>
                    <Panel>
                      <Kicker>Weaknesses</Kicker>
                      <ul className="mt-3 space-y-2 text-sm">
                        {player.report.weaknesses.map((item) => (
                          <li key={item}>· {item}</li>
                        ))}
                      </ul>
                    </Panel>
                  </div>
                  <Panel className="mt-4">
                    <Kicker>Projected development</Kicker>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {player.report.development}
                    </p>
                  </Panel>
                </>
              )}
            </TabsContent>

            {!player.catalogStub ? (
            <>
            <TabsContent value="milestones" className="mt-4">
              <Panel>
                <div className="space-y-5">
                  {player.milestones.map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{item.label}</span>
                        <span className="tabular-nums">
                          {item.current.toLocaleString("en-GB")} / {item.target.toLocaleString("en-GB")}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(100, (item.current / item.target) * 100)}
                        aria-label={item.label}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </Panel>
            </TabsContent>

            <TabsContent value="twin" className="mt-4">
              <Panel>
                <Kicker>Cricket Twin™ · {player.name}</Kicker>
                <p className="mt-2 text-sm text-muted-foreground">
                  {player.twinYears} years in the file. The Twin answers as an analyst of this player, not as the player.
                </p>
                <div className="mt-4 space-y-3">
                  {log.length === 0 ? (
                    <div className="grid gap-2">
                      {[
                        `Explain how ${player.name} plays once set.`,
                        `What is the hole in ${player.name.split(" ").slice(-1)[0]}'s game?`,
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          className="rounded-2xl bg-muted/60 px-4 py-3 text-left text-sm"
                          onClick={() => askTwin(prompt)}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    log.map((entry) => (
                      <div key={entry.q} className="space-y-2">
                        <p className="ml-8 rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground">{entry.q}</p>
                        <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm leading-relaxed">
                          <p className="font-medium">{entry.a.headline}</p>
                          {entry.a.paragraphs.map((paragraph) => (
                            <p key={paragraph} className="mt-2 text-muted-foreground">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                  {thinking ? <p className="text-sm text-muted-foreground">Reading {player.twinYears} years…</p> : null}
                </div>
                <form
                  className="mt-4 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    askTwin(twinDraft);
                  }}
                >
                  <label className="sr-only" htmlFor="twin-ask">
                    Ask the Twin
                  </label>
                  <Input
                    id="twin-ask"
                    value={twinDraft}
                    onChange={(event) => setTwinDraft(event.target.value)}
                    placeholder={`Ask about ${player.name}`}
                    aria-invalid={twinError ? true : undefined}
                    className="h-11! px-3"
                  />
                  <Button type="submit" disabled={thinking}>
                    Ask
                  </Button>
                </form>
                {twinError ? <p className="mt-2 text-sm text-destructive">{twinError}</p> : null}
              </Panel>
            </TabsContent>

            <TabsContent value="universe" className="mt-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel>
                  <Kicker>Cricket universe</Kicker>
                  <ol className="relative mt-5 space-y-3 border-l border-lime/50 pl-5">
                    {nodes.map((node) => (
                      <li key={node.id}>
                        <button
                          type="button"
                          onClick={() => setNodeId(node.id)}
                          className={`-ml-5 w-full rounded-2xl px-3 py-2 text-left ${
                            activeNode.id === node.id ? "bg-muted" : ""
                          }`}
                        >
                          <span className="mr-2 inline-block size-2 rounded-full bg-lime" aria-hidden />
                          {node.title}
                        </button>
                      </li>
                    ))}
                  </ol>
                </Panel>
                <Panel>
                  <Kicker>Connected</Kicker>
                  <h3 className="font-display mt-3 text-3xl">{activeNode.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{activeNode.body}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {activeNode.openId ? (
                      <Button
                        type="button"
                        onClick={() => {
                          setPlayerId(activeNode.openId!);
                          setNodeId("self");
                        }}
                      >
                        Open {activeNode.title}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        go("ask", {
                          mode: "general",
                          seedAsk: `Who is most similar to ${player.name}?`,
                        });
                      }}
                    >
                      Ask this as a question
                    </Button>
                  </div>
                </Panel>
              </div>
            </TabsContent>
            </>
            ) : null}
          </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
