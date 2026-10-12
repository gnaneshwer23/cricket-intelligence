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
      <div className="cos-scoreboard rounded-[1.75rem] border border-border p-5">
        <Kicker className="text-cyan">DEMO · simulated innings</Kicker>
        <p className="mt-3 text-sm text-muted-foreground">Warming up the demo stream…</p>
        <div className="mt-4 h-2 animate-pulse rounded-full bg-white/10" />
      </div>
    );
  }

  if (live.status === "error") {
    return (
      <div className="rounded-[1.75rem] border border-destructive/40 bg-card p-5">
        <Kicker>DEMO · interrupted</Kicker>
        <p className="mt-3 text-sm text-muted-foreground">{live.error ?? "Demo feed paused."}</p>
        <Button type="button" className="mt-4" size="sm" onClick={retryLive}>
          Resume demo
        </Button>
      </div>
    );
  }

  const statusLabel =
    live.status === "ended" ? "Demo complete" : live.paused ? "Paused" : "Sim live";

  return (
    <div className="cos-scoreboard rounded-[1.75rem] border border-white/10">
      <div className={`relative z-[1] ${compact ? "p-4 sm:p-5" : "p-5 sm:p-7"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] tracking-[0.14em] text-gold uppercase">
              <span className="cos-live-dot size-1.5 rounded-full bg-gold" aria-hidden />
              {statusLabel}
            </span>
            <Kicker className="text-cyan/90">{live.label}</Kicker>
          </div>
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            {live.session} · {live.venue}
          </p>
        </div>

        {!compact ? (
          <p className="font-display mt-3 text-2xl tracking-tight text-balance sm:text-3xl">
            {live.title}
          </p>
        ) : (
          <p className="mt-2 text-sm font-medium text-balance">{live.title}</p>
        )}

        {/* Sports-app scoreboard: teams flank the hero score */}
        <div
          className={`mt-5 grid items-end gap-3 ${
            compact
              ? "grid-cols-[1fr_auto_1fr]"
              : "grid-cols-1 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
          }`}
        >
          <div className={compact ? "min-w-0" : "sm:text-left"}>
            <p className="text-eng text-xs tracking-[0.2em] uppercase">England</p>
            <p className="font-display mt-1 text-2xl tabular-nums tracking-tight sm:text-3xl">
              {live.engWin}
              <span className="text-base text-muted-foreground">%</span>
            </p>
          </div>

          <div className="text-center">
            <p
              key={`${live.runs}-${live.wickets}-${live.cursor}`}
              className={`cos-score-tick font-display tabular-nums tracking-tight ${
                compact ? "text-5xl sm:text-6xl" : "text-6xl sm:text-7xl md:text-8xl"
              }`}
            >
              {live.runs}
              <span className="text-lime">/{live.wickets}</span>
            </p>
            <p className="mt-1 font-mono text-xs tracking-wide text-cyan sm:text-sm">
              {live.overs} ov · +{live.vsModel} vs model
            </p>
          </div>

          <div className={compact ? "min-w-0 text-right" : "sm:text-right"}>
            <p className="text-ind text-xs tracking-[0.2em] uppercase">India</p>
            <p className="font-display mt-1 text-2xl tabular-nums tracking-tight sm:text-3xl">
              {live.indWin}
              <span className="text-base text-muted-foreground">%</span>
            </p>
          </div>
        </div>

        <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-white/10">
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
          className={`mt-4 grid gap-2 text-sm ${compact ? "" : "sm:grid-cols-2"}`}
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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {live.lastBalls.map((ball, index) => (
            <span
              key={`${ball}-${index}-${live.cursor}`}
              className={`grid size-7 place-items-center rounded-md border text-[11px] tabular-nums sm:size-8 sm:rounded-full sm:text-xs ${
                ball === "W"
                  ? "border-destructive/50 text-destructive"
                  : ball === "4" || ball === "6"
                    ? "border-lime/50 bg-lime/10 text-lime"
                    : "border-white/15 bg-black/20"
              }`}
            >
              {ball}
            </span>
          ))}
          <span className="self-center text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            Recent
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {live.paused || live.status === "ended" ? (
            <Button type="button" size="sm" onClick={resumeLive}>
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
        <div className="relative z-[1] grid border-t border-white/10 sm:grid-cols-3">
          {[
            ["Momentum", live.engWin >= 50 ? "England" : "India"],
            ["Fall of wickets", live.fow[live.fow.length - 1] ?? "—"],
            ["Demo note", "Not a broadcast feed"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border-b border-white/10 px-5 py-3.5 sm:border-r sm:border-b-0 last:border-r-0"
            >
              <Kicker>{label}</Kicker>
              <p className="mt-1.5 text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
