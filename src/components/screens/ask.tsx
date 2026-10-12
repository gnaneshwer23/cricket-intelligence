"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useApp } from "@/components/app-state";
import { Kicker, PageTitle, Panel } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askPrompts, players } from "@/lib/data";
import type { AskMode } from "@/lib/types";

const modes: { id: AskMode; label: string }[] = [
  { id: "general", label: "General" },
  { id: "predictions", label: "Predictions" },
  { id: "fantasy", label: "Fantasy" },
  { id: "historical", label: "Historical" },
  { id: "career", label: "Career" },
  { id: "twin", label: "Cricket Twin" },
];

export function AskScreen() {
  const {
    askMode,
    setAskMode,
    messages,
    asking,
    askError,
    ask,
    twinId,
    setTwinId,
    pendingSeed,
    clearPendingSeed,
    saveChat,
  } = useApp();
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const prompts = askPrompts[askMode] ?? askPrompts.general;
  const seeded = useRef(false);

  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, asking]);

  useEffect(() => {
    if (!pendingSeed || seeded.current || asking) return;
    seeded.current = true;
    const text = pendingSeed;
    clearPendingSeed();
    ask(text, "general");
  }, [pendingSeed, clearPendingSeed, ask, asking]);

  function submit(question: string) {
    const text = question.trim();
    if (!text) {
      ask("");
      return;
    }
    setDraft("");
    ask(text, askMode);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageTitle
        kicker="Ask Cricket"
        title="Ask Cricket Anything."
        lede="Conversational answers with figures, confidence, and follow-ups — match explainers, predictions, careers, and Cricket Twin."
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {modes.map((mode) => (
          <Button
            key={mode.id}
            type="button"
            variant={askMode === mode.id ? "default" : "secondary"}
            className="shrink-0"
            onClick={() => setAskMode(mode.id)}
          >
            {mode.label}
          </Button>
        ))}
      </div>

      {askMode === "twin" ? (
        <label className="mb-4 block text-sm">
          <span className="mb-2 block text-muted-foreground">Twin on the mic</span>
          <select
            value={twinId}
            onChange={(event) => setTwinId(event.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
          >
            {players.map((player) => (
              <option key={player.id} value={player.id} className="bg-popover text-popover-foreground">
                {player.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <Panel className="flex min-h-[28rem] flex-col">
        <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto pr-1" style={{ maxHeight: "32rem" }}>
          {messages.length === 0 && !asking ? (
            <div>
              <Kicker>Try one</Kicker>
              <div className="mt-4 grid gap-2">
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submit(prompt)}
                    className="rounded-2xl bg-muted/60 px-4 py-3 text-left text-sm hover:bg-muted"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => {
            if (message.role === "user") {
              return (
                <div
                  key={message.id}
                  className="ml-8 rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground"
                >
                  {message.text}
                </div>
              );
            }
            if (message.role === "error") {
              return (
                <p
                  key={message.id}
                  className="rounded-2xl border border-destructive/40 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  {message.text}
                </p>
              );
            }
            const messageIndex = messages.findIndex((item) => item.id === message.id);
            const prior = [...messages.slice(0, messageIndex)]
              .reverse()
              .find((item) => item.role === "user");
            const priorText = prior && prior.role === "user" ? prior.text : message.answer.headline;
            return (
              <article key={message.id} className="rounded-2xl bg-muted/50 px-4 py-4">
                {message.answer.speaker ? <Kicker>{message.answer.speaker}</Kicker> : null}
                <h2 className="font-display mt-1 text-2xl leading-tight">{message.answer.headline}</h2>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {message.answer.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {message.answer.figures?.length ? (
                  <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {message.answer.figures.map((figure) => (
                      <div key={figure.label} className="rounded-xl bg-background/60 px-3 py-2">
                        <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                          {figure.label}
                        </dt>
                        <dd className="mt-1 font-medium tabular-nums">{figure.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {message.answer.confidence ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Confidence {message.answer.confidence}%
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.answer.followups.map((follow) => (
                    <Button
                      key={follow}
                      type="button"
                      variant="outline"
                      className="h-auto px-2 py-1 text-left whitespace-normal"
                      onClick={() => submit(follow)}
                    >
                      {follow}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto px-2 py-1 text-xs"
                    onClick={() =>
                      saveChat({
                        id: crypto.randomUUID(),
                        question: priorText,
                        headline: message.answer.headline,
                        at: Date.now(),
                      })
                    }
                  >
                    Save to feed
                  </Button>
                </div>
              </article>
            );
          })}

          {asking ? (
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              Reading the file…
            </p>
          ) : null}
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit(draft);
          }}
        >
          <label className="sr-only" htmlFor="ask-input">
            Ask anything about cricket
          </label>
          <Input
            id="ask-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={askMode === "twin" ? "Ask this Twin…" : "Ask Cricket Anything…"}
            aria-invalid={askError ? true : undefined}
            className="h-12! px-4"
            disabled={asking}
          />
          <Button type="submit" className="h-12 px-4" disabled={asking}>
            <ArrowUp />
            <span className="sr-only">Send</span>
          </Button>
        </form>
        {askError ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {askError}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          Press / from anywhere else in the app to come back here.
        </p>
      </Panel>
    </div>
  );
}
