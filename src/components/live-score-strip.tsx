"use client";

import { useLiveMatch } from "@/hooks/use-live-match";
import { Kicker } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { jumpLiveToLatest, pauseLive, resumeLive, retryLive } from "@/lib/live-sim";

type Props = {
  compact?: boolean;
  onOpenMatch?: () => void;
};

export function LiveScoreStrip({ compact = false, onOpenMatch }: Props) {
  const live = useLiveMatch();

  if (live.status === "loading") {
    return (
      <div className="cos-scoreboard rounded-[1.75rem] border border-border p-6 sm:p-8">
        <Kicker className="text-cyan">DEMO · simulated innings</Kicker>
        <p className="mt-3 text-sm text-muted-foreground">Warming up the demo stream…</p>
        <div className="mt-5 h-1.5 animate-pulse rounded-full bg-white/10" />
      </div>
    );
  }

  if (live.status === "error") {
    return (
      <div className="rounded-[1.75rem] border border-destructive/40 bg-card p-6">
        <Kicker>DEMO · interrupted</Kicker>
        <p className="mt-3 text-sm text-muted-foreground">{live.error ?? "Demo feed paused."}</p>
        <Button type="button" className="cos-cta mt-4" size="sm" onClick={retryLive}>
          Resume demo
        </Button>
      </div>
    );
  }

  const statusLabel =
    live.status === "ended" ? "Demo complete" : live.paused ? "Paused" : "Sim live";

  return (
    <div className="cos-scoreboard rounded-[1.75rem] border border-border">
      <div className={`relative z-[1] ${compact ? "p-5 sm:p-7" : "p-6 sm:p-9"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.16em] text-gold uppercase">
              <span className="cos-live-dot size-1.5 rounded-full bg-gold" aria-hidden />
              {statusLabel}
            </span>
            <span className="text-white/20" aria-hidden>
              ·
            </span>
            <Kicker className="text-cyan/90">{live.label}</Kicker>
          </div>
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            {live.session} · {live.venue}
          </p>
        </div>

        {!compact ? (
          <p className="font-display mt-5 text-2xl font-medium tracking-tight text-balance sm:text-3xl">
            {live.title}
          </p>
        ) : (
          <p className="mt-3 text-sm font-medium tracking-tight text-balance text-muted-foreground">
            {live.title}
          </p>
        )}

        {/* Hero score — retail product-number clarity, teams as flanking meta */}
        <div
          className={`mt-7 grid items-end gap-4 ${
            compact
              ? "grid-cols-[1fr_auto_1fr]"
              : "grid-cols-1 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
          }`}
        >
          <div className={compact ? "min-w-0" : "sm:text-left"}>
            <p className="text-eng text-[10px] tracking-[0.22em] uppercase">England</p>
            <p className="font-display mt-1.5 text-2xl font-semibold tabular-nums sm:text-3xl">
              {live.engWin}
              <span className="ml-0.5 text-sm font-normal text-muted-foreground">%</span>
            </p>
          </div>

          <div className="text-center">
            <p
              key={`${live.runs}-${live.wickets}-${live.cursor}`}
              className={`cos-score-tick font-display font-semibold tabular-nums leading-none ${
                compact
                  ? "text-[3.5rem] sm:text-[4.25rem]"
                  : "text-[4.25rem] sm:text-[5.5rem] md:text-[6.5rem]"
              }`}
            >
              {live.runs}
              <span className="text-lime">/{live.wickets}</span>
            </p>
            <p className="mt-2 font-mono text-[11px] tracking-wide text-cyan sm:text-xs">
              {live.overs} ov · +{live.vsModel} vs model
            </p>
          </div>

          <div className={compact ? "min-w-0 text-right" : "sm:text-right"}>
            <p className="text-ind text-[10px] tracking-[0.22em] uppercase">India</p>
            <p className="font-display mt-1.5 text-2xl font-semibold tabular-nums sm:text-3xl">
              {live.indWin}
              <span className="ml-0.5 text-sm font-normal text-muted-foreground">%</span>
            </p>
          </div>
        </div>

        <div className="mt-6 flex h-1 overflow-hidden rounded-full bg-white/8">
          <div
            className="bg-eng transition-all duration-500"
            style={{ width: `${live.engWin}%` }}
          />
          <div
            className="bg-ind transition-all duration-500"
            style={{ width: `${live.indWin}%` }}
          />
        </div>

        <div
          className={`mt-5 grid gap-2 text-sm leading-relaxed ${compact ? "" : "sm:grid-cols-2"}`}
        >
          <p className="text-muted-foreground">
            <span className="text-foreground">
              {live.striker.name} {live.striker.runs}*
            </span>{" "}
            ({live.striker.balls}) · {live.nonStriker.name} {live.nonStriker.runs}* (
            {live.nonStriker.balls})
          </p>
          <p className={`text-muted-foreground ${compact ? "" : "sm:text-right"}`}>
            Pship {live.partnership.runs} ({live.partnership.balls}) · {live.bowler}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {live.lastBalls.map((ball, index) => (
            <span
              key={`${ball}-${index}-${live.cursor}`}
              className={`grid size-8 place-items-center rounded-md border text-xs tabular-nums ${
                ball === "W"
                  ? "border-destructive/45 text-destructive"
                  : ball === "4" || ball === "6"
                    ? "border-lime/40 bg-lime/8 text-lime"
                    : "border-border bg-navy/10"
              }`}
            >
              {ball}
            </span>
          ))}
          <span className="self-center text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            Recent
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {live.paused || live.status === "ended" ? (
            <Button type="button" size="sm" className="cos-cta" onClick={resumeLive}>
              {live.status === "ended" ? "Replay demo" : "Resume"}
            </Button>
          ) : (
            <Button type="button" size="sm" variant="secondary" onClick={pauseLive}>
              Pause
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={jumpLiveToLatest}>
            Jump to latest
          </Button>
          {onOpenMatch ? (
            <Button type="button" size="sm" variant="ghost" onClick={onOpenMatch}>
              Match Centre
            </Button>
          ) : null}
        </div>
      </div>

      {!compact ? (
        <div className="relative z-[1] grid border-t border-border sm:grid-cols-3">
          {[
            ["Momentum", live.engWin >= 50 ? "England" : "India"],
            ["Fall of wickets", live.fow[live.fow.length - 1] ?? "—"],
            ["Demo note", "Not a broadcast feed"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border-b border-border px-6 py-4 sm:border-r sm:border-b-0 last:border-r-0"
            >
              <Kicker>{label}</Kicker>
              <p className="mt-1.5 text-sm font-medium tracking-tight">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
