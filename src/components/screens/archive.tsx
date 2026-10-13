"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/app-state";
import { DataStatusStrip } from "@/components/data-status-strip";
import { FreshnessBadge, StatusBadge } from "@/components/status-badge";
import { Kicker, PageTitle, Panel } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ARCHIVE_POLICY,
  coverageLabel,
  type CoverageLevel,
  type GenderFilter,
} from "@/lib/coverage";
import type { MatchLifecycle, FreshnessStatus } from "@/lib/contracts";
import type { CricketFormat } from "@/lib/domain/models";
import type { MatchFocus } from "@/lib/types";
import { isDemoMatchId, isSeedMatchId } from "@/lib/truth-mode";
import {
  useHistoricalArchive,
  type ArchiveFilters,
  type ArchiveMatchRow,
} from "@/hooks/use-historical-archive";

const FORMATS: { id: "" | CricketFormat; label: string }[] = [
  { id: "", label: "Any format" },
  { id: "test", label: "Test" },
  { id: "odi", label: "ODI" },
  { id: "t20", label: "T20" },
];

const GENDERS: { id: "" | GenderFilter; label: string }[] = [
  { id: "", label: "Men’s & women’s" },
  { id: "men", label: "Men’s" },
  { id: "women", label: "Women’s" },
];

const COVERAGE: { id: "" | CoverageLevel; label: string }[] = [
  { id: "", label: "Any coverage" },
  { id: "result", label: "Result" },
  { id: "scorecard", label: "Scorecard" },
  { id: "innings", label: "Innings rows" },
  { id: "ball_by_ball", label: "Ball-by-ball" },
];

function rowToFocus(row: ArchiveMatchRow): MatchFocus {
  return {
    id: row.id,
    title: row.title,
    status: String(row.status),
    freshness: String(row.freshness),
    venue: row.venue,
    format: row.format,
    series: row.series,
    score: row.score,
    homeName: row.homeName ?? row.teams?.home,
    awayName: row.awayName ?? row.teams?.away,
    isDemo: isDemoMatchId(row.id),
    isSeed: isSeedMatchId(row.id),
    provenance: row.provenance
      ? {
          source: row.provenance.source,
          asOf: row.provenance.asOf,
          note: row.provenance.note,
        }
      : undefined,
  };
}

export function ArchiveScreen() {
  const { go, setMatchFocus } = useApp();
  const [yearFrom, setYearFrom] = useState(String(ARCHIVE_POLICY.filterYearMin));
  const [yearTo, setYearTo] = useState(String(ARCHIVE_POLICY.filterYearMax));
  const [format, setFormat] = useState<"" | CricketFormat>("");
  const [gender, setGender] = useState<"" | GenderFilter>("");
  const [team, setTeam] = useState("");
  const [player, setPlayer] = useState("");
  const [competition, setCompetition] = useState("");
  const [venue, setVenue] = useState("");
  const [result, setResult] = useState("");
  const [coverage, setCoverage] = useState<"" | CoverageLevel>("");
  const [page, setPage] = useState(0);

  const filters: ArchiveFilters = useMemo(
    () => ({
      yearFrom: Number.parseInt(yearFrom, 10) || undefined,
      yearTo: Number.parseInt(yearTo, 10) || undefined,
      format,
      gender,
      team,
      player,
      competition,
      venue,
      result,
      coverage,
      page,
      limit: 10,
    }),
    [yearFrom, yearTo, format, gender, team, player, competition, venue, result, coverage, page],
  );

  const archive = useHistoricalArchive(filters);

  function openMatch(row: ArchiveMatchRow) {
    const focus = rowToFocus(row);
    setMatchFocus(focus);
    go("match", { matchFocus: focus });
  }

  function askAbout(row: ArchiveMatchRow) {
    const focus = rowToFocus(row);
    setMatchFocus(focus);
    go("ask", {
      mode: "historical",
      matchFocus: focus,
      seedAsk: `What do we know about ${row.title}?`,
    });
  }

  return (
    <div className="mx-auto max-w-5xl cos-stagger">
      <PageTitle
        kicker="Historical Archive"
        title="Find the evidence."
        lede="Filter normalised matches by year, format, side, venue, and coverage depth. Sources and limitations stay visible — we do not invent scorecards or ball-by-ball."
      />

      <div className="mb-4">
        <DataStatusStrip />
      </div>

      <Panel className="border-white/8 bg-card/40 cos-panel-in">
        <Kicker className="text-cyan">Coverage honesty</Kicker>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {archive.archive?.claim ?? ARCHIVE_POLICY.claim}
        </p>
        {archive.archive ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Measured in this response: {archive.archive.measuredYearMin}–
            {archive.archive.measuredYearMax}
            {" · "}
            Filters accept {archive.archive.filterYearMin}–{archive.archive.filterYearMax}
          </p>
        ) : null}
      </Panel>

      <form
        className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(0);
        }}
      >
        <label className="text-xs text-muted-foreground">
          Year from
          <Input
            className="mt-1"
            inputMode="numeric"
            value={yearFrom}
            onChange={(e) => {
              setYearFrom(e.target.value);
              setPage(0);
            }}
            min={ARCHIVE_POLICY.filterYearMin}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Year to
          <Input
            className="mt-1"
            inputMode="numeric"
            value={yearTo}
            onChange={(e) => {
              setYearTo(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Format
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={format}
            onChange={(e) => {
              setFormat(e.target.value as "" | CricketFormat);
              setPage(0);
            }}
          >
            {FORMATS.map((f) => (
              <option key={f.id || "any"} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Gender
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={gender}
            onChange={(e) => {
              setGender(e.target.value as "" | GenderFilter);
              setPage(0);
            }}
          >
            {GENDERS.map((g) => (
              <option key={g.id || "any"} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          Team
          <Input
            className="mt-1"
            value={team}
            onChange={(e) => {
              setTeam(e.target.value);
              setPage(0);
            }}
            placeholder="England, India…"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Player (scorecard rows only)
          <Input
            className="mt-1"
            value={player}
            onChange={(e) => {
              setPlayer(e.target.value);
              setPage(0);
            }}
            placeholder="Needs innings rows"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Competition
          <Input
            className="mt-1"
            value={competition}
            onChange={(e) => {
              setCompetition(e.target.value);
              setPage(0);
            }}
            placeholder="Ashes, World Cup…"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Venue
          <Input
            className="mt-1"
            value={venue}
            onChange={(e) => {
              setVenue(e.target.value);
              setPage(0);
            }}
            placeholder="Lord's, Headingley…"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Result contains
          <Input
            className="mt-1"
            value={result}
            onChange={(e) => {
              setResult(e.target.value);
              setPage(0);
            }}
            placeholder="won by, draw…"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Coverage level
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={coverage}
            onChange={(e) => {
              setCoverage(e.target.value as "" | CoverageLevel);
              setPage(0);
            }}
          >
            {COVERAGE.map((c) => (
              <option key={c.id || "any"} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </form>

      {archive.archive?.blockers?.length ? (
        <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
          {archive.archive.blockers.map((b) => (
            <li key={b}>· {b}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <Kicker>
            Results
            {archive.status === "ok" ? ` · ${archive.total}` : ""}
          </Kicker>
          <p className="text-xs text-muted-foreground">
            Page {archive.page + 1}
            {archive.pageSize ? ` · ${archive.pageSize} per page` : ""}
          </p>
        </div>

        {archive.status === "loading" ? (
          <p className="text-sm text-muted-foreground">Loading archive…</p>
        ) : null}
        {archive.status === "unavailable" ? (
          <p className="text-sm text-gold" role="alert">
            {archive.error ?? "Archive UNAVAILABLE"}
          </p>
        ) : null}
        {archive.status === "ok" && archive.matches.length === 0 ? (
          <Panel className="border-white/8">
            <p className="text-sm text-muted-foreground">
              No matches for these filters. That is an empty state — not missing invented data.
              Try widening year range or clearing player filter (seed scorecards often lack
              batting rows).
            </p>
          </Panel>
        ) : null}

        <ul className="divide-y divide-white/8">
          {archive.matches.map((row, index) => (
            <li
              key={row.id}
              className="cos-filter-fade py-4"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={row.status as MatchLifecycle} />
                    <FreshnessBadge freshness={row.freshness as FreshnessStatus} />
                    {row.coverage ? (
                      <span className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] tracking-wide text-mist uppercase">
                        {coverageLabel(row.coverage.level)}
                        {row.coverage.gender === "women" ? " · women’s" : ""}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="font-display mt-2 text-left text-xl tracking-tight transition hover:text-lime"
                    onClick={() => openMatch(row)}
                  >
                    {row.title}
                  </button>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {row.series ? `${row.series} · ` : ""}
                    {row.venue}
                    {row.coverage?.year ? ` · ${row.coverage.year}` : ""}
                    {row.format ? ` · ${row.format.toUpperCase()}` : ""}
                  </p>
                  {row.resultText || row.statusLine ? (
                    <p className="mt-1 text-sm text-foreground/90">
                      {row.resultText ?? row.statusLine}
                    </p>
                  ) : null}
                  {row.score ? (
                    <p className="mt-1 font-mono text-sm text-cyan tabular-nums">
                      {row.score.runs}/{row.score.wickets} ({row.score.overs})
                    </p>
                  ) : null}
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    Source: {row.provenance?.source ?? "unknown"}
                    {row.coverage?.note ? ` · ${row.coverage.note}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <Button type="button" size="sm" className="cos-cta" onClick={() => openMatch(row)}>
                    Open match
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => askAbout(row)}>
                    Ask
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={page <= 0 || archive.status === "loading"}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!archive.hasMore || archive.status === "loading"}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => go("ask", { mode: "historical" })}>
            Ask historical
          </Button>
        </div>
      </div>
    </div>
  );
}
