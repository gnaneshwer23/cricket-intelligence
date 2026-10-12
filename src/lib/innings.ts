/**
 * Authored DEMO innings series for Cricket Explorer.
 * Totals match the Lord’s scorecard / phase table / FOW — not a live feed.
 */

import type { FormatKind, OverBucket, PhaseBand } from "@/lib/calc";
import {
  aggregatePhase,
  ballsToOvers,
  cumulativeFromOvers,
  manhattanFromOvers,
  phaseBandsForFormat,
  runsPerOver,
} from "@/lib/calc";
import { matchMeta, phases as phaseTable } from "@/lib/data";

export type InningsMeta = {
  id: string;
  matchId: string;
  matchTitle: string;
  competition: string;
  dateLabel: string;
  venue: string;
  format: FormatKind;
  innings: 1 | 2;
  battingTeam: "england" | "india";
  bowlingTeam: "england" | "india";
  battingTeamName: string;
  /** DEMO provenance */
  status: "DEMO";
};

export type ExplorerInnings = {
  meta: InningsMeta;
  overs: OverBucket[];
};

/** Runs per over (1-based overs 1–48 full, 49 = 2 balls). Sum 245; phases match data.ts. */
const ENG_1_RUNS = [
  6, 4, 3, 6, 3, 6, 7, 5, 4, 4, // 1–10 → 48
  4, 5, 6, 7, 2, 8, 4, 7, 6, 5, 1, // 11–21 → 55
  2, 6, 10, 12, 7, 6, 11, 5, 13, // 22–30 → 72
  3, 5, 6, 4, 3, 4, 5, 3, 4, 5, // 31–40 → 42
  2, 3, 4, 5, 2, 4, 0, 3, 5, // 41–49 → 28
] as const;

type Ev = OverBucket["events"][number];

function ev(ball: number, kind: Ev["kind"], label: string, graphEventId?: string): Ev {
  return { ball, kind, label, graphEventId };
}

/** Key events aligned to FOW + Match Graph nodes. */
const ENG_1_EVENTS: Record<number, Ev[]> = {
  5: [ev(3, "wicket", "Crawley c Jaiswal b Bumrah 18", "evt-bumrah-newball")],
  8: [ev(2, "four", "Duckett cover drive")],
  14: [ev(4, "four", "Duckett pulls Siraj")],
  15: [ev(1, "wicket", "Duckett lbw b Bumrah 41", "evt-bumrah-newball")],
  23: [
    ev(2, "four", "Root clip"),
    ev(4, "wicket", "Pope c Rahul b Jadeja 22"),
  ],
  27: [
    ev(2, "four", "Brook through cover"),
    ev(4, "four", "Root late cut"),
    ev(6, "four", "14 off Jadeja — turning point", "evt-over-27"),
  ],
  28: [ev(3, "six", "Brook loft over long-on")],
  30: [ev(5, "four", "Phase 22–30 closes hot", "evt-phase-22-30")],
  48: [ev(5, "wicket", "Brook c Pant b Kuldeep 64", "evt-brook-out")],
  49: [ev(2, "four", "Stokes statement loft")],
};

const ENG_1_WICKETS: Record<number, number> = {
  5: 1,
  15: 1,
  23: 1,
  48: 1,
};

const ENG_1_FOURS: Record<number, number> = {
  1: 1,
  4: 1,
  6: 1,
  8: 1,
  11: 1,
  14: 1,
  16: 1,
  18: 1,
  23: 1,
  24: 2,
  25: 1,
  27: 3,
  28: 0,
  29: 1,
  30: 2,
  33: 1,
  36: 1,
  44: 1,
  49: 1,
};

const ENG_1_SIXES: Record<number, number> = {
  28: 1,
};

function buildEnglandFirst(): ExplorerInnings {
  const overs: OverBucket[] = ENG_1_RUNS.map((runs, index) => {
    const overNumber = index + 1;
    const balls = overNumber === 49 ? 2 : 6;
    let startRuns = 0;
    for (let i = 0; i < index; i += 1) startRuns += ENG_1_RUNS[i];
    return {
      overNumber,
      balls,
      runs,
      wickets: ENG_1_WICKETS[overNumber] ?? 0,
      fours: ENG_1_FOURS[overNumber] ?? 0,
      sixes: ENG_1_SIXES[overNumber] ?? 0,
      startRuns,
      endRuns: startRuns + runs,
      events: ENG_1_EVENTS[overNumber] ?? [],
    };
  });

  return {
    meta: {
      id: "eng-1",
      matchId: matchMeta.id,
      matchTitle: matchMeta.title,
      competition: matchMeta.series,
      dateLabel: matchMeta.dayLabel,
      venue: matchMeta.venue,
      format: "test",
      innings: 1,
      battingTeam: "england",
      bowlingTeam: "india",
      battingTeamName: "England",
      status: "DEMO",
    },
    overs,
  };
}

export const explorerInnings: ExplorerInnings[] = [buildEnglandFirst()];

export function getInnings(id: string): ExplorerInnings | undefined {
  return explorerInnings.find((item) => item.meta.id === id);
}

export function listInningsForMatch(matchId: string): ExplorerInnings[] {
  return explorerInnings.filter((item) => item.meta.matchId === matchId);
}

export type ExplorerFilters = {
  matchId: string;
  inningsId: string;
  team: "england" | "india" | "all";
  player: string | "all";
  phaseId: string | "all";
};

export type ExplorerViewModel = {
  innings: ExplorerInnings | null;
  compare: ExplorerInnings | null;
  worm: ReturnType<typeof cumulativeFromOvers>;
  manhattan: OverBucket[];
  bands: PhaseBand[];
  phaseRows: ReturnType<typeof aggregatePhase>[];
  phaseTable: typeof phaseTable;
  totals: {
    runs: number;
    wickets: number;
    balls: number;
    overs: string;
    rpo: number;
    fours: number;
    sixes: number;
  };
  emptyReason: string | null;
};

export function buildExplorerView(filters: ExplorerFilters): ExplorerViewModel {
  const innings = getInnings(filters.inningsId) ?? null;
  if (!innings) {
    return {
      innings: null,
      compare: null,
      worm: [],
      manhattan: [],
      bands: [],
      phaseRows: [],
      phaseTable,
      totals: { runs: 0, wickets: 0, balls: 0, overs: "0.0", rpo: 0, fours: 0, sixes: 0 },
      emptyReason: "No innings series for this filter. DEMO board currently has England 1st innings only.",
    };
  }

  if (filters.team !== "all" && filters.team !== innings.meta.battingTeam) {
    return {
      innings,
      compare: null,
      worm: [],
      manhattan: [],
      bands: phaseBandsForFormat(innings.meta.format, innings.overs.length),
      phaseRows: [],
      phaseTable,
      totals: { runs: 0, wickets: 0, balls: 0, overs: "0.0", rpo: 0, fours: 0, sixes: 0 },
      emptyReason: `No ${filters.team} batting series in this DEMO match yet.`,
    };
  }

  let overs = innings.overs;
  if (filters.phaseId !== "all") {
    const bands = phaseBandsForFormat(innings.meta.format, innings.overs.length);
    const band = bands.find((b) => b.id === filters.phaseId);
    if (band) {
      overs = overs.filter((o) => o.overNumber >= band.fromOver && o.overNumber <= band.toOver);
    }
  }
  // Player filter is applied in the Explorer UI for event highlighting; charts keep the scoring series.

  const worm = cumulativeFromOvers(overs);
  const manhattan = manhattanFromOvers(overs);
  const bands = phaseBandsForFormat(innings.meta.format, innings.overs.length);
  const phaseRows = bands.map((band) => aggregatePhase(innings.overs, band));
  const runs = overs.reduce((s, o) => s + o.runs, 0);
  const wickets = overs.reduce((s, o) => s + o.wickets, 0);
  const balls = overs.reduce((s, o) => s + o.balls, 0);
  const fours = overs.reduce((s, o) => s + o.fours, 0);
  const sixes = overs.reduce((s, o) => s + o.sixes, 0);

  // Second innings compare — none on this DEMO board.
  const siblings = listInningsForMatch(filters.matchId).filter((i) => i.meta.id !== innings.meta.id);
  const compare = siblings[0] ?? null;

  return {
    innings,
    compare,
    worm,
    manhattan,
    bands,
    phaseRows,
    phaseTable,
    totals: {
      runs,
      wickets,
      balls,
      overs: ballsToOvers(balls),
      rpo: runsPerOver(runs, balls),
      fours,
      sixes,
    },
    emptyReason: overs.length === 0 ? "No deliveries in this phase filter." : null,
  };
}

/** Map an over / worm point to a Match Graph event id when available. */
export function graphEventForOver(innings: ExplorerInnings, overNumber: number): string | undefined {
  const over = innings.overs.find((o) => o.overNumber === overNumber);
  return over?.events.find((e) => e.graphEventId)?.graphEventId;
}

export function graphEventForOversLabel(
  innings: ExplorerInnings,
  oversLabel: string,
): string | undefined {
  const point = cumulativeFromOvers(innings.overs).find((p) => p.overs === oversLabel);
  return point?.graphEventId;
}

/** Players that appear in event labels (filter chips). */
export const explorerPlayers = [
  { id: "crawley", label: "Crawley" },
  { id: "duckett", label: "Duckett" },
  { id: "pope", label: "Pope" },
  { id: "root", label: "Root" },
  { id: "brook", label: "Brook" },
  { id: "stokes", label: "Stokes" },
  { id: "bumrah", label: "Bumrah" },
  { id: "jadeja", label: "Jadeja" },
  { id: "kuldeep", label: "Kuldeep" },
] as const;
