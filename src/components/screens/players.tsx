"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { openAssistant, useApp } from "@/components/app-state";
import { EmptyState, PageTitle, SourceChip, StatRing } from "@/components/ui-bits";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getPlayer } from "@/lib/data";

type Hit = { id: string; name: string; matches: number };

type Batting = {
  innings: number;
  runs: number;
  ballsFaced: number;
  outs: number;
  notOuts: number;
  average: number | null;
  strikeRate: number | null;
  fours: number;
  sixes: number;
  dotPct: number | null;
  fifties: number | null;
  hundreds: number | null;
  highest: { runs: number; notOut: boolean } | null;
};

type Bowling = {
  innings: number;
  overs: string;
  runsConceded: number;
  wickets: number;
  economy: number | null;
  average: number | null;
  strikeRate: number | null;
  dotPct: number | null;
  best: { wickets: number; runs: number } | null;
};

type Profile = {
  player: { id: string; name: string };
  batting: { data: Batting; sample: { warning?: string } };
  bowling: { data: Bowling; sample: { warning?: string } };
};

const FEATURED = ["Virat Kohli", "Jasprit Bumrah", "MS Dhoni", "Rashid Khan", "AB de Villiers", "Smriti Mandhana"];
const SEASONS = Array.from({ length: 2026 - 2008 + 1 }, (_, i) => 2026 - i);
const PHASES = [
  { id: "", label: "All overs" },
  { id: "powerplay", label: "Powerplay" },
  { id: "middle", label: "Middle" },
  { id: "death", label: "Death" },
] as const;

const fmt = (v: number | null | undefined, digits = 2) => (v == null ? "—" : Number(v).toFixed(digits).replace(/\.00$/, ""));

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/65 px-4 py-3">
      <p className="text-[10.5px] tracking-[0.16em] text-slate uppercase">{label}</p>
      <p className="font-display mt-1 text-2xl font-semibold tabular-nums text-navy">{value}</p>
      {sub ? <p className="text-[11px] text-mist">{sub}</p> : null}
    </div>
  );
}

function useSearch(q: string) {
  const [hits, setHits] = useState<Hit[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "unavailable">("idle");
  useEffect(() => {
    if (q.trim().length < 2) return;
    let cancelled = false;
    fetch(`/api/stats/players?q=${encodeURIComponent(q.trim())}&limit=8`)
      .then((r) => r.json())
      .then((d: { ok: boolean; data?: Hit[] }) => {
        if (cancelled) return;
        setHits(d.ok ? (d.data ?? []) : []);
        setStatus(d.ok ? "ok" : "unavailable");
      })
      .catch(() => !cancelled && setStatus("unavailable"));
    return () => {
      cancelled = true;
    };
  }, [q]);
  return { hits: q.trim().length < 2 ? [] : hits, status: q.trim().length < 2 ? "idle" : status };
}

export function PlayersScreen() {
  const { playerId: rosterId } = useApp();
  // Profiles opened from follows carry a roster name; search for it.
  const [query, setQuery] = useState(() => getPlayer(rosterId)?.name ?? "");
  const debounced = useDebouncedValue(query, 250);
  const search = useSearch(debounced);

  const [selected, setSelected] = useState<Hit | null>(null);
  const [season, setSeason] = useState<string>("");
  const [competition, setCompetition] = useState<string>("");
  const [phase, setPhase] = useState<string>("");
  const [profile, setProfile] = useState<{ status: "idle" | "loading" | "ok" | "error"; data?: Profile }>({
    status: "idle",
  });

  // Auto-select the top hit when arriving from a follow.
  const autoPick = !selected && search.hits.length > 0 && getPlayer(rosterId)?.name === query ? search.hits[0] : null;
  const active = selected ?? autoPick;

  const params = useMemo(() => {
    const p = new URLSearchParams({ format: "t20" });
    if (season) {
      p.set("yearFrom", season);
      p.set("yearTo", season);
    }
    if (competition) p.set("competition", competition);
    if (phase) p.set("phase", phase);
    return p.toString();
  }, [season, competition, phase]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    fetch(`/api/stats/players/${encodeURIComponent(active.id)}?${params}`)
      .then((r) => r.json())
      .then((d: Profile & { ok: boolean }) => !cancelled && setProfile(d.ok ? { status: "ok", data: d } : { status: "error" }))
      .catch(() => !cancelled && setProfile({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [active, params]);

  const p = profile.status === "ok" && profile.data?.player.id === active?.id ? profile.data : null;
  const bat = p?.batting.data;
  const bowl = p?.bowling.data;

  return (
    <div className="cos-panel-in">
      <PageTitle
        kicker="Players"
        title="Every"
        emphasis="delivery, counted"
        lede="Search any T20 player and see verified numbers from ball-by-ball data — by season, competition and phase of the innings."
      />

      <div className="glass flex items-center gap-3 rounded-full px-5 py-2">
        <Search className="size-4 text-slate" aria-hidden />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          placeholder="Search players — typos are fine (try “kholi”)"
          aria-label="Search players"
          className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-navy outline-none placeholder:text-mist"
        />
      </div>

      {!active ? (
        <div className="mt-4">
          {search.status === "idle" ? (
            <div className="flex flex-wrap gap-2">
              {FEATURED.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setQuery(name)}
                  className="rounded-full border border-white/80 bg-white/65 px-4 py-2 text-sm text-navy transition hover:bg-white"
                >
                  {name}
                </button>
              ))}
            </div>
          ) : search.status === "unavailable" ? (
            <EmptyState title="Player search is unavailable" detail="The stats database isn't connected on this deployment." />
          ) : search.hits.length === 0 && search.status === "ok" ? (
            <EmptyState title="No players found" detail="Try a surname, or check the spelling." />
          ) : (
            <ul className="glass divide-y divide-white/60 overflow-hidden rounded-[1.5rem]">
              {search.hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(h)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-white/60"
                  >
                    <span className="font-medium text-navy">{h.name}</span>
                    <span className="text-xs text-slate tabular-nums">{h.matches} matches</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <section className="mt-6 space-y-4" aria-live="polite">
          <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] p-6">
            <div>
              <p className="text-[11px] tracking-[0.18em] text-slate uppercase">Player profile</p>
              <h2 className="font-display mt-1 text-3xl font-semibold tracking-tight text-navy">{active.name}</h2>
              <p className="mt-1 text-sm text-slate">{active.matches} matches in the archive</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openAssistant(`What makes ${active.name} special? Use the numbers.`)}
                className="flex items-center gap-1.5 rounded-full bg-cobalt px-4 py-2 text-sm text-white transition hover:bg-cobalt/90"
              >
                <Sparkles className="size-4" /> Ask AI about {active.name.split(" ").slice(-1)[0]}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setQuery("");
                }}
                className="rounded-full bg-white/70 px-4 py-2 text-sm text-navy transition hover:bg-white"
              >
                New search
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              aria-label="Season"
              className="glass rounded-full px-4 py-2 text-sm text-navy outline-none"
            >
              <option value="">All seasons</option>
              {SEASONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
              aria-label="Competition"
              className="glass rounded-full px-4 py-2 text-sm text-navy outline-none"
            >
              <option value="">All T20 competitions</option>
              <option value="Indian Premier League">IPL</option>
            </select>
            <div role="tablist" aria-label="Phase" className="glass inline-flex gap-1 rounded-full p-1">
              {PHASES.map((ph) => (
                <button
                  key={ph.id}
                  type="button"
                  role="tab"
                  aria-selected={phase === ph.id}
                  onClick={() => setPhase(ph.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs transition ${
                    phase === ph.id ? "bg-navy text-white" : "text-slate hover:text-navy"
                  }`}
                >
                  {ph.label}
                </button>
              ))}
            </div>
          </div>

          {profile.status === "error" ? (
            <EmptyState title="Couldn't load this profile" detail="Try a different filter or search again." />
          ) : !p ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="glass h-64 animate-pulse rounded-[1.75rem]" />
              <div className="glass h-64 animate-pulse rounded-[1.75rem]" />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="glass rounded-[1.75rem] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl text-navy">
                      <span className="font-light">Batting</span>
                    </h3>
                    <p className="mt-1 text-sm text-slate">
                      {bat?.innings ? `${bat.innings} innings` : "No batting innings in this filter"}
                    </p>
                  </div>
                  {bat?.innings && bat.strikeRate != null ? (
                    <StatRing value={Math.min(bat.strikeRate, 200)} max={200} size={84} label={`Strike rate ${bat.strikeRate}`}>
                      <div className="leading-none">
                        <p className="font-display text-lg font-semibold tabular-nums text-navy">{fmt(bat.strikeRate, 1)}</p>
                        <p className="mt-0.5 text-[9px] tracking-wider text-slate uppercase">SR</p>
                      </div>
                    </StatRing>
                  ) : null}
                </div>
                {bat?.innings ? (
                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Tile label="Runs" value={bat.runs.toLocaleString("en-GB")} sub={`${bat.ballsFaced} balls`} />
                    <Tile label="Average" value={fmt(bat.average)} sub={`${bat.notOuts} not out`} />
                    <Tile
                      label="Best"
                      value={bat.highest ? `${bat.highest.runs}${bat.highest.notOut ? "*" : ""}` : "—"}
                      sub={bat.hundreds != null ? `${bat.hundreds}×100 · ${bat.fifties}×50` : undefined}
                    />
                    <Tile label="Fours" value={String(bat.fours)} />
                    <Tile label="Sixes" value={String(bat.sixes)} />
                    <Tile label="Dot balls" value={bat.dotPct != null ? `${fmt(bat.dotPct, 1)}%` : "—"} />
                  </div>
                ) : null}
                {p.batting.sample.warning ? <p className="mt-3 text-xs text-amber-700">{p.batting.sample.warning}</p> : null}
              </article>

              <article className="glass rounded-[1.75rem] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl font-light text-navy">Bowling</h3>
                    <p className="mt-1 text-sm text-slate">
                      {bowl?.innings ? `${bowl.innings} innings · ${bowl.overs} overs` : "Did not bowl in this filter"}
                    </p>
                  </div>
                  {bowl?.innings && bowl.economy != null ? (
                    <StatRing value={Math.max(0, 12 - bowl.economy)} max={8} size={84} label={`Economy ${bowl.economy}`}>
                      <div className="leading-none">
                        <p className="font-display text-lg font-semibold tabular-nums text-navy">{fmt(bowl.economy)}</p>
                        <p className="mt-0.5 text-[9px] tracking-wider text-slate uppercase">Econ</p>
                      </div>
                    </StatRing>
                  ) : null}
                </div>
                {bowl?.innings ? (
                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Tile label="Wickets" value={String(bowl.wickets)} sub={`${bowl.runsConceded} runs`} />
                    <Tile label="Average" value={fmt(bowl.average)} />
                    <Tile label="Strike rate" value={fmt(bowl.strikeRate, 1)} sub="balls per wicket" />
                    <Tile label="Best" value={bowl.best ? `${bowl.best.wickets}/${bowl.best.runs}` : "—"} />
                    <Tile label="Dot balls" value={bowl.dotPct != null ? `${fmt(bowl.dotPct, 1)}%` : "—"} />
                  </div>
                ) : null}
                {p.bowling.sample.warning ? <p className="mt-3 text-xs text-amber-700">{p.bowling.sample.warning}</p> : null}
              </article>
            </div>
          )}
          <SourceChip>Cricsheet ball-by-ball · verified against published records</SourceChip>
        </section>
      )}
    </div>
  );
}
