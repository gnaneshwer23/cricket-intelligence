"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { LiveFixturesBoard } from "@/components/live-fixtures-board";
import { PageTitle, SourceChip } from "@/components/ui-bits";

type Series = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  matches: number;
  odi: number;
  t20: number;
  test: number;
};

function formatLabel(s: Series): string {
  const parts = [s.test ? `${s.test} Test` : "", s.odi ? `${s.odi} ODI` : "", s.t20 ? `${s.t20} T20` : ""].filter(Boolean);
  return parts.join(" · ") || `${s.matches} matches`;
}

function useSeries() {
  const [state, setState] = useState<{ status: "loading" | "ok" | "unavailable"; series: Series[] }>({
    status: "loading",
    series: [],
  });
  useEffect(() => {
    let cancelled = false;
    fetch("/api/provider/series")
      .then((r) => r.json())
      .then((d: { ok: boolean; series?: Series[] }) => {
        if (!cancelled) setState(d.ok ? { status: "ok", series: d.series ?? [] } : { status: "unavailable", series: [] });
      })
      .catch(() => !cancelled && setState({ status: "unavailable", series: [] }));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}

export function LiveScreen() {
  const series = useSeries();
  return (
    <div className="cos-panel-in">
      <PageTitle
        kicker="Match centre"
        title="Live"
        emphasis="scores"
        lede="Current, upcoming and recent matches from the live feed, with ball-by-ball history behind every result."
      />

      <LiveFixturesBoard initialTab="live" limit={24} />

      <section className="mt-12" aria-labelledby="series-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="series-heading" className="font-display text-2xl font-light tracking-tight text-navy">
            Current <span className="font-semibold">series</span>
          </h2>
          {series.status === "ok" ? <SourceChip>CricketData.org · refreshed daily</SourceChip> : null}
        </div>
        {series.status === "loading" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass h-24 animate-pulse rounded-[1.5rem]" />
            ))}
          </div>
        ) : series.status === "unavailable" || series.series.length === 0 ? (
          <p className="text-sm text-slate">Series list is unavailable right now.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {series.series.slice(0, 9).map((s) => (
              <li key={s.id} className="glass rounded-[1.5rem] p-4">
                <p className="line-clamp-2 font-medium text-navy">{s.name}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate">
                  <CalendarDays className="size-3.5" />
                  {s.startDate ?? "TBC"}
                  {s.endDate ? ` – ${s.endDate}` : ""}
                </p>
                <p className="mt-1 text-xs text-mist">{formatLabel(s)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
