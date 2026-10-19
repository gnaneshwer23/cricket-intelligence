"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Mic, MicOff, Sparkles } from "lucide-react";
import { openAssistant, useApp } from "@/components/app-state";
import { LiveFixturesBoard } from "@/components/live-fixtures-board";
import { Kicker, SourceChip, useGreeting } from "@/components/ui-bits";
import { useDataHealth, useMatchList } from "@/hooks/use-data-layer";
import { useVoiceAsk } from "@/hooks/use-voice-ask";
import { getPlayer, teamLabel, teams } from "@/lib/data";

const SUGGESTED = [
  "What's live right now?",
  "Kohli vs Bumrah head-to-head",
  "How did the IPL 2023 final swing?",
  "Best death-overs economy in IPL history: Bumrah or Rashid?",
];

const CAPABILITIES = [
  {
    title: "Live, honestly labelled",
    body: "Scores from the live feed with the time they were fetched — never padded or guessed.",
  },
  {
    title: "Ball-by-ball history",
    body: "Every IPL match since 2008, delivery by delivery: splits, matchups and records you can trust.",
  },
  {
    title: "Win-probability stories",
    body: "See how a match swung, ball by ball, from a model that publishes its own accuracy.",
  },
];

export function HomeScreen() {
  const { go, followedPlayers, followedTeams } = useApp();
  const { greeting, dateLabel } = useGreeting();
  const health = useDataHealth();
  const archive = useMatchList(6);
  const [draft, setDraft] = useState("");
  const voice = useVoiceAsk({ onTranscript: (t) => setDraft(t) });

  const mine = followedPlayers
    .map((id) => getPlayer(id))
    .filter((p) => p !== undefined)
    .slice(0, 6);
  const myTeams = teams.filter((t) => followedTeams.includes(t.id));

  const recent = useMemo(
    () =>
      archive.matches
        .filter((m) => (m.freshness === "HISTORICAL" || m.status === "COMPLETED") && !m.id.startsWith("demo"))
        .slice(0, 4),
    [archive.matches],
  );

  const matchCount = health.summary?.matchCount ?? 0;
  const playerCount = health.summary?.playerCount ?? 0;

  function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    openAssistant(q);
    setDraft("");
  }

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="hero-field rounded-[2.25rem] px-6 py-10 sm:px-12 sm:py-14">
        <div className="cos-hero-in relative max-w-3xl">
          <p className="text-[11px] tracking-[0.22em] text-white/75 uppercase">
            {greeting} · {dateLabel}
          </p>
          <h1 className="font-display mt-4 text-5xl leading-[1.02] tracking-tight sm:text-7xl">
            <span className="font-light">Cricket</span>
            <br />
            <span className="font-semibold">Intelligence</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
            Live scores, ball-by-ball history and an AI analyst that shows its working — for fans who want to
            understand the game, not just follow it.
          </p>

          <form
            className="cos-hero-in-delay mt-8 flex max-w-2xl items-center gap-2 rounded-full bg-white/95 p-1.5 pl-5 shadow-[0_20px_50px_-25px_rgba(11,27,63,.6)]"
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft);
            }}
          >
            <Sparkles className="size-4 shrink-0 text-cobalt" aria-hidden />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={voice.listening ? "Listening…" : "Ask anything — a player, a match, a record"}
              aria-label="Ask Cricket Intelligence"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-navy outline-none placeholder:text-mist"
            />
            {voice.supported ? (
              <button
                type="button"
                onClick={() => (voice.listening ? voice.stopListening() : voice.startListening())}
                aria-label={voice.listening ? "Stop listening" : "Speak your question"}
                aria-pressed={voice.listening}
                className={`grid size-10 shrink-0 place-items-center rounded-full transition ${
                  voice.listening ? "bg-live text-white" : "bg-cobalt/10 text-cobalt hover:bg-cobalt/15"
                }`}
              >
                {voice.listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
            ) : null}
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition hover:bg-navy/90"
            >
              Ask <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="cos-hero-in-stagger mt-5 flex flex-wrap gap-2">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                className="rounded-full border border-white/35 bg-white/15 px-3.5 py-1.5 text-xs text-white backdrop-blur transition hover:bg-white/25"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Data scale */}
        <dl className="relative mt-12 grid max-w-2xl grid-cols-3 gap-3">
          {[
            { k: "Matches", v: matchCount ? matchCount.toLocaleString("en-GB") : "—" },
            { k: "Players", v: playerCount ? playerCount.toLocaleString("en-GB") : "—" },
            { k: "Since", v: "2008" },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl border border-white/25 bg-white/12 px-4 py-3 backdrop-blur">
              <dt className="text-[10.5px] tracking-[0.18em] text-white/70 uppercase">{s.k}</dt>
              <dd className="font-display mt-1 text-2xl font-semibold tabular-nums">{s.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Live */}
      <section aria-labelledby="live-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="live-heading" className="font-display text-3xl font-light tracking-tight text-navy">
            Today&rsquo;s <span className="font-semibold">matches</span>
          </h2>
          <button
            type="button"
            onClick={() => go("match")}
            className="flex items-center gap-1 rounded-full bg-white/70 px-4 py-2 text-sm text-navy backdrop-blur transition hover:bg-white"
          >
            All scores <ArrowUpRight className="size-4" />
          </button>
        </div>
        <LiveFixturesBoard compact limit={4} />
      </section>

      {/* Why it's different */}
      <section className="grid gap-3 md:grid-cols-3" aria-label="What Cricket Intelligence does">
        {CAPABILITIES.map((c) => (
          <article key={c.title} className="glass rounded-[1.75rem] p-6">
            <p className="font-display text-lg font-semibold tracking-tight text-navy">{c.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate">{c.body}</p>
          </article>
        ))}
      </section>

      {/* From the archive */}
      <section aria-labelledby="archive-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="archive-heading" className="font-display text-3xl font-light tracking-tight text-navy">
            From the <span className="font-semibold">archive</span>
          </h2>
          <SourceChip>Cricsheet · ball-by-ball</SourceChip>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate">Loading recent results…</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {recent.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => ask(`How did ${m.title} swing?`)}
                  className="glass flex w-full flex-col gap-2 rounded-[1.5rem] p-5 text-left transition hover:-translate-y-0.5"
                >
                  <p className="text-[10.5px] tracking-[0.14em] text-slate uppercase">{m.series ?? m.format}</p>
                  <p className="font-medium text-navy">{m.title}</p>
                  {m.statusLine ? <p className="text-sm text-slate">{m.statusLine}</p> : null}
                  <p className="mt-1 flex items-center gap-1 text-xs text-cobalt">
                    Ask how it swung <ArrowRight className="size-3.5" />
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => go("archive")}
          className="mt-4 flex items-center gap-1 text-sm text-navy underline-offset-4 hover:underline"
        >
          Browse the full archive <ArrowRight className="size-4" />
        </button>
      </section>

      {/* Following */}
      {myTeams.length || mine.length ? (
        <section className="glass rounded-[1.75rem] p-6 sm:p-8">
          <Kicker>Following</Kicker>
          <div className="mt-4 flex flex-wrap gap-2">
            {myTeams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => go("teams", { teamId: t.id })}
                className="rounded-full bg-navy px-4 py-2 text-sm text-white transition hover:bg-navy/90"
              >
                {t.name}
              </button>
            ))}
            {mine.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => go("players", { playerId: p.id })}
                className="rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm text-navy transition hover:bg-white"
              >
                {p.name}
                <span className="ml-1.5 text-xs text-slate">{teamLabel(p.teamId)}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
