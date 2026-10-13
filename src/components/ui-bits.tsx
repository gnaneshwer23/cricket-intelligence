"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "cn";
import { Progress } from "@/components/ui/progress";

function subscribeNothing() {
  return () => {};
}

function greetingNow() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function dateNow() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.5rem] border border-border bg-card/80 p-5 sm:p-7",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  detail,
  actionLabel,
  onAction,
  tone = "neutral",
}: {
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "neutral" | "warn" | "error";
}) {
  const toneClass =
    tone === "warn"
      ? "text-gold"
      : tone === "error"
        ? "text-destructive"
        : "text-navy";
  return (
    <div
      className="rounded-[1.25rem] border border-dashed border-border bg-card/60 px-5 py-8 text-center"
      role="status"
    >
      <p className={cn("font-display text-lg font-semibold tracking-tight", toneClass)}>
        {title}
      </p>
      {detail ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {detail}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          className="mt-4 text-sm font-medium text-action underline-offset-2 hover:underline"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function Kicker({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[10px] font-medium tracking-[0.2em] text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function PageTitle({
  kicker,
  title,
  lede,
}: {
  kicker: string;
  title: string;
  lede?: string;
}) {
  return (
    <header className="mb-8 max-w-3xl">
      <Kicker>{kicker}</Kicker>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-navy text-balance sm:text-4xl">
        {title}
      </h1>
      {lede ? (
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">{lede}</p>
      ) : null}
    </header>
  );
}

export function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      <Progress value={value} aria-label={label} className="h-1.5" />
    </div>
  );
}

export function WinSplit({
  eng,
  ind,
  draw,
}: {
  eng: number;
  ind: number;
  draw?: number;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
        <span className="text-eng">England {eng}%</span>
        {draw ? <span className="text-gold">Draw {draw}%</span> : null}
        <span className="text-ind">India {ind}%</span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-navy/10" aria-hidden>
        <div className="bg-eng" style={{ width: `${eng}%` }} />
        {draw ? <div className="bg-gold" style={{ width: `${draw}%` }} /> : null}
        <div className="bg-ind" style={{ width: `${ind}%` }} />
      </div>
    </div>
  );
}

export function Spark({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const width = 112;
  const height = 36;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - 4 - ((value - min) / (max - min || 1)) * (height - 8);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-28 text-blue" role="img" aria-label={label}>
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  );
}

function formatRemaining(target: number, now: number) {
  const seconds = Math.max(0, Math.round((target - now) / 1000));
  if (seconds === 0) return "Now";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remain = seconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
}

let sessionTarget = 0;

export function useCountdown() {
  const [label, setLabel] = useState("1:42:00");
  useEffect(() => {
    if (sessionTarget === 0) sessionTarget = Date.now() + (60 + 42) * 60 * 1000;
    const id = window.setInterval(() => {
      setLabel(formatRemaining(sessionTarget, Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  return label;
}

export function useGreeting() {
  const greeting = useSyncExternalStore(subscribeNothing, greetingNow, () => "Hello");
  const dateLabel = useSyncExternalStore(subscribeNothing, dateNow, () => "Match day");
  return { greeting, dateLabel };
}
