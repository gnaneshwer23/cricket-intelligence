"use client";

import { useState } from "react";
import { useApp } from "@/components/app-state";
import { Kicker, PageTitle, Panel } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { debateSeed, polls as seedPolls, roomSeed } from "@/lib/data";
import { MOODS, moodBreakdown, toPercents } from "@/lib/format";

type RoomMessage = (typeof roomSeed)[number];

export function CommunityScreen() {
  const { mood, react } = useApp();
  const [thread, setThread] = useState<RoomMessage[]>(roomSeed);
  const [draft, setDraft] = useState("");
  const [postError, setPostError] = useState<string | null>(null);
  const [pollState, setPollState] = useState(seedPolls);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [debate, setDebate] = useState(debateSeed);
  const [debateVote, setDebateVote] = useState<string | null>(null);
  const [side, setSide] = useState<"england" | "india">("england");
  const [noted, setNoted] = useState<string | null>(null);
  const moods = moodBreakdown(mood[side]);

  function post() {
    const text = draft.trim();
    if (!text) {
      setPostError("Write something before you post.");
      return;
    }
    setPostError(null);
    setThread((current) => [
      ...current,
      { id: crypto.randomUUID(), author: "James", side: "You", emoji: "📊", text, time: "now" },
    ]);
    setDraft("");
  }

  function vote(pollId: string, optionId: string) {
    if (votes[pollId]) return;
    setVotes((current) => ({ ...current, [pollId]: optionId }));
    setPollState((current) =>
      current.map((poll) =>
        poll.id !== pollId
          ? poll
          : {
              ...poll,
              options: poll.options.map((option) =>
                option.id === optionId ? { ...option, votes: option.votes + 1 } : option,
              ),
            },
      ),
    );
  }

  function argue(sideId: string) {
    if (debateVote) return;
    setDebateVote(sideId);
    setDebate((current) => ({
      ...current,
      sides: current.sides.map((item) =>
        item.id === sideId ? { ...item, votes: item.votes + 1 } : item,
      ),
    }));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        kicker="Community"
        title="The ground, in one room."
        lede="Match rooms, the mood of each set of fans, a poll that moves, and a debate with two actual sides."
      />
      <Tabs defaultValue="rooms">
        <TabsList variant="line" className="h-auto! w-full justify-start overflow-x-auto">
          <TabsTrigger value="rooms">Match rooms</TabsTrigger>
          <TabsTrigger value="reactions">Fan reactions</TabsTrigger>
          <TabsTrigger value="polls">Polls</TabsTrigger>
          <TabsTrigger value="debates">Debates</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
            <Panel className="h-fit">
              <Kicker>Rooms</Kicker>
              <p className="mt-3 rounded-2xl bg-primary px-3 py-3 text-sm text-primary-foreground">
                Lord’s · Day 2
                <span className="mt-1 block text-xs opacity-80">Demo thread</span>
              </p>
              <p className="mt-2 rounded-2xl bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
                Centurion preview
                <span className="mt-1 block text-xs">Opens Thursday. Nothing to react to yet.</span>
              </p>
            </Panel>
            <Panel>
              <Kicker>Lord’s day 2</Kicker>
              <ul className="mt-4 space-y-3">
                {thread.map((message) => (
                  <li key={message.id} className="rounded-2xl bg-muted/50 px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      {message.emoji} {message.author} · {message.side} · {message.time}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">{message.text}</p>
                  </li>
                ))}
              </ul>
              <form
                className="mt-4 space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  post();
                }}
              >
                <label className="sr-only" htmlFor="room-post">
                  Post to the match room
                </label>
                <Textarea
                  id="room-post"
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    if (postError) setPostError(null);
                  }}
                  placeholder="Say what the last hour actually meant"
                  aria-invalid={postError ? true : undefined}
                />
                {postError ? <p className="text-sm text-destructive">{postError}</p> : null}
                <Button type="submit">Post</Button>
              </form>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="reactions" className="mt-4">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Kicker>{side === "england" ? "England fans" : "India fans"}</Kicker>
              <div className="flex gap-2">
                {(["england", "india"] as const).map((item) => (
                  <Button key={item} type="button" size="sm" variant={side === item ? "default" : "secondary"} onClick={() => setSide(item)}>
                    {item === "england" ? "England" : "India"}
                  </Button>
                ))}
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {moods
                .filter((item) => item.pct > 0)
                .map((item) => (
                  <li key={item.key} className="flex items-center gap-3 text-sm">
                    <span className="w-28">
                      {item.emoji} {item.pct}%
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full bg-lime" style={{ width: `${item.pct}%` }} />
                    </span>
                  </li>
                ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              {MOODS.map((item) => (
                <Button
                  key={item.key}
                  type="button"
                  variant="secondary"
                  className="size-12 text-xl"
                  aria-label={item.label}
                  onClick={() => {
                    react(side, item.key);
                    setNoted(`${item.label} recorded`);
                  }}
                >
                  {item.emoji}
                </Button>
              ))}
            </div>
            <p className="mt-3 text-sm text-lime" role="status">
              {noted ?? "React to the last ball. The percentages are shared with the match screen."}
            </p>
          </Panel>
        </TabsContent>

        <TabsContent value="polls" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {pollState.map((poll) => {
              const percents = toPercents(poll.options.map((option) => option.votes));
              const chosen = votes[poll.id];
              return (
                <Panel key={poll.id}>
                  <h3 className="font-medium">{poll.question}</h3>
                  <ul className="mt-4 space-y-2">
                    {poll.options.map((option, index) => (
                      <li key={option.id}>
                        <button
                          type="button"
                          disabled={Boolean(chosen)}
                          onClick={() => vote(poll.id, option.id)}
                          className={`w-full rounded-2xl px-3 py-3 text-left text-sm ${
                            chosen === option.id ? "bg-primary text-primary-foreground" : "bg-muted/60"
                          }`}
                        >
                          <span className="flex justify-between gap-3">
                            <span>{option.label}</span>
                            <span className="tabular-nums">{percents[index]}%</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {chosen ? "Your vote is in." : "One vote. It moves the bar."}
                  </p>
                </Panel>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="debates" className="mt-4">
          <Panel>
            <Kicker>Debate</Kicker>
            <h3 className="font-display mt-3 text-3xl">{debate.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{debate.prompt}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {debate.sides.map((item) => {
                const total = debate.sides.reduce((sum, sideItem) => sum + sideItem.votes, 0) || 1;
                const pct = Math.round((item.votes / total) * 100);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={Boolean(debateVote)}
                    onClick={() => argue(item.id)}
                    className={`rounded-3xl border p-5 text-left ${
                      debateVote === item.id ? "border-lime bg-lime/10" : "border-border"
                    }`}
                  >
                    <p className="font-medium">{item.label}</p>
                    <p className="font-display mt-4 text-4xl tabular-nums">{pct}%</p>
                    <p className="text-xs text-muted-foreground">{item.votes} voices</p>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {debateVote ? "You’ve taken a side. The other one is still allowed to be right." : "Pick a side."}
            </p>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
