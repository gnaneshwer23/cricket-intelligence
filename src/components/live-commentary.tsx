"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app-state";
import { useLiveMatch } from "@/hooks/use-live-match";
import { Kicker } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { MOODS } from "@/lib/format";
import {
  jumpLiveToLatest,
  pauseLive,
  resumeLive,
  setFollowLatest,
} from "@/lib/live-sim";

export function LiveCommentary() {
  const live = useLiveMatch();
  const { react } = useApp();
  const scroller = useRef<HTMLDivElement>(null);
  const [noted, setNoted] = useState<string | null>(null);
  const latest = live.ballsFaced[live.ballsFaced.length - 1];

  useEffect(() => {
    if (!live.followLatest) return;
    const node = scroller.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [live.ballsFaced.length, live.followLatest]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
      <section className="overflow-hidden rounded-[1.75rem] border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <Kicker>Demo commentary</Kicker>
            <p className="mt-1 text-xs text-muted-foreground">{live.label} · ball-by-ball (scripted)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {live.paused || live.status === "ended" ? (
              <Button type="button" size="sm" onClick={resumeLive}>
                {live.status === "ended" ? "Replay" : "Resume"}
              </Button>
            ) : (
              <Button type="button" size="sm" variant="secondary" onClick={pauseLive}>
                Pause
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setFollowLatest(true);
                jumpLiveToLatest();
              }}
            >
              Jump to latest
            </Button>
          </div>
        </div>

        {live.status === "loading" ? (
          <p className="p-5 text-sm text-muted-foreground">Commentary stream warming up…</p>
        ) : live.status === "error" ? (
          <p className="p-5 text-sm text-muted-foreground">{live.error}</p>
        ) : live.ballsFaced.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            Waiting for the first simulated ball after the break…
          </p>
        ) : (
          <div
            ref={scroller}
            className="max-h-[28rem] space-y-2 overflow-y-auto p-4"
            onScroll={(event) => {
              const node = event.currentTarget;
              const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
              if (!nearBottom && live.followLatest) setFollowLatest(false);
              if (nearBottom && !live.followLatest) setFollowLatest(true);
            }}
          >
            {live.ballsFaced.map((ball) => (
              <article
                key={ball.id}
                className={`rounded-2xl border px-4 py-3 transition ${
                  ball.id === latest?.id ? "border-lime/40 bg-lime/5" : "border-border/80 bg-muted/30"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-xs text-lime">{ball.over}</span>
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      ball.outcome === "W"
                        ? "text-destructive"
                        : ball.outcome === "4" || ball.outcome === "6"
                          ? "text-lime"
                          : "text-muted-foreground"
                    }`}
                  >
                    {ball.outcome === "·" ? "dot" : ball.outcome}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed">{ball.commentary}</p>
                {ball.aiLine ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{ball.aiLine}</p>
                ) : null}
                <p className="mt-2 text-[11px] tracking-wide text-muted-foreground uppercase">
                  {ball.bowler} to {ball.batter}
                </p>
              </article>
            ))}
          </div>
        )}

        {!live.followLatest && live.ballsFaced.length > 0 ? (
          <div className="border-t border-border p-3">
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => {
                setFollowLatest(true);
                const node = scroller.current;
                node?.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
              }}
            >
              Resume auto-scroll · latest ball
            </Button>
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.75rem] border border-border bg-card p-5">
        <Kicker>React to the latest ball</Kicker>
        <p className="mt-2 text-sm text-muted-foreground">
          {latest
            ? `${latest.over} · ${latest.commentary.slice(0, 72)}${latest.commentary.length > 72 ? "…" : ""}`
            : "Mood attaches to the newest ball when the sim advances."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {MOODS.map((item) => (
            <Button
              key={item.key}
              type="button"
              variant="secondary"
              className="size-12 text-xl"
              aria-label={item.label}
              disabled={!latest}
              onClick={() => {
                react("england", item.key);
                setNoted(`${item.label} on ${latest?.over ?? "—"}`);
              }}
            >
              {item.emoji}
            </Button>
          ))}
        </div>
        <p className="mt-4 min-h-5 text-sm text-lime" role="status">
          {noted ?? "No reaction yet."}
        </p>
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Classic tone mixed with AI one-liners. This is a scripted demo — not a rights-holding
          broadcast commentary feed.
        </p>
      </section>
    </div>
  );
}
