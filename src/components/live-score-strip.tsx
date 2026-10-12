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
      <div className="rounded-[1.75rem] border border-border bg-card/80 p-5">
        <Kicker>DEMO · simulated innings</Kicker>
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

  const score = (
    <p className={`font-display tabular-nums tracking-tight ${compact ? "text-4xl" : "text-6xl sm:text-7xl"}`}>
      {live.runs}
      <span className="text-lime">/{live.wickets}</span>
    </p>
  );

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card">
      <div className={`grid gap-5 ${compact ? "p-5" : "p-6 sm:p-8"} lg:grid-cols-[1.45fr_1fr] lg:items-end`}>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] tracking-[0.14em] text-gold uppercase">
              <span className="size-1.5 animate-pulse rounded-full bg-gold" aria-hidden />
              {live.status === "ended" ? "Demo complete" : live.paused ? "Paused" : "Sim live"}
            </span>
            <Kicker>{live.label}</Kicker>
          </div>
          {!compact ? (
            <p className="font-display mt-3 text-3xl tracking-tight sm:text-4xl">{live.title}</p>
          ) : (
            <p className="mt-2 font-medium">{live.title}</p>
          )}
          <p className="mt-1 text-xs tracking-[0.12em] text-muted-foreground uppercase">
            {live.session} · {live.venue}
          </p>
          <div className="mt-4">{score}</div>
          <p className="mt-3 text-sm text-muted-foreground">
            {live.overs} ov · {live.striker.name} {live.striker.runs}* ({live.striker.balls}) ·{" "}
            {live.nonStriker.name} {live.nonStriker.runs}* ({live.nonStriker.balls})
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Partnership {live.partnership.runs} ({live.partnership.balls}) · {live.bowler} bowling · +
            {live.vsModel} vs model
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {live.lastBalls.map((ball, index) => (
              <span
                key={`${ball}-${index}-${live.cursor}`}
                className={`grid size-8 place-items-center rounded-full border text-xs tabular-nums ${
                  ball === "W"
                    ? "border-destructive/50 text-destructive"
                    : ball === "4" || ball === "6"
                      ? "border-lime/50 text-lime"
                      : "border-border"
                }`}
              >
                {ball}
              </span>
            ))}
            <span className="self-center text-xs text-muted-foreground">Recent balls</span>
          </div>
        </div>
        <div>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-eng text-xs tracking-[0.16em] uppercase">England</p>
              <p className="font-display text-3xl tabular-nums sm:text-4xl">{live.engWin}%</p>
            </div>
            <div>
              <p className="text-ind text-xs tracking-[0.16em] uppercase">India</p>
              <p className="font-display text-3xl tabular-nums sm:text-4xl">{live.indWin}%</p>
            </div>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
            <div className="bg-eng transition-all duration-500" style={{ width: `${live.engWin}%` }} />
            <div className="bg-ind transition-all duration-500" style={{ width: `${live.indWin}%` }} />
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
      </div>
      {!compact ? (
        <div className="grid border-t border-border sm:grid-cols-3">
          {[
            ["Momentum", live.engWin >= 50 ? "England" : "India"],
            ["Fall of wickets", live.fow[live.fow.length - 1] ?? "—"],
            ["Demo note", "Not a broadcast feed"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border-b border-border px-5 py-4 sm:border-r sm:border-b-0 last:border-r-0"
            >
              <Kicker>{label}</Kicker>
              <p className="mt-2 text-sm font-medium sm:text-base">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
