/**
 * Pure helpers for the Live Scores board (tabs, CRR, row shaping).
 * Kept free of React so unit tests can cover filter honesty.
 */

import { oversToBalls, runsPerOver } from "@/lib/calc";
import type { FreshnessStatus, MatchLifecycle } from "@/lib/contracts";
import { teamAbbr } from "@/lib/team-abbr";

export type LiveBoardTab = "live" | "upcoming" | "recent" | "all";

export type BoardScore = { runs: number; wickets: number; overs: string };

export type BoardRowInput = {
  id: string;
  title: string;
  status: MatchLifecycle;
  freshness: FreshnessStatus;
  venue: string;
  format: string;
  series?: string;
  score?: BoardScore;
  homeName?: string;
  awayName?: string;
  homeShort?: string;
  awayShort?: string;
  /** Provider status / last ball line — shown as mini commentary when present */
  statusLine?: string;
  provenance?: { source: string; asOf: string; note?: string };
  isDemo: boolean;
};

/** Current run rate from score when overs > 0. */
export function computeCrr(score: BoardScore | undefined): number | null {
  if (!score?.overs) return null;
  const balls = oversToBalls(score.overs);
  if (balls <= 0) return null;
  return runsPerOver(score.runs, balls);
}

export function formatCrr(crr: number | null): string | null {
  if (crr === null || !Number.isFinite(crr)) return null;
  return crr.toFixed(2);
}

export function rowHomeShort(row: BoardRowInput): string {
  return row.homeShort || teamAbbr(row.homeName) || "HOME";
}

export function rowAwayShort(row: BoardRowInput): string {
  return row.awayShort || teamAbbr(row.awayName) || "AWAY";
}

export function matchesBoardTab(row: BoardRowInput, tab: LiveBoardTab): boolean {
  if (tab === "all") return true;
  if (tab === "live") {
    // DEMO is never a Live-tab match (optional demo stays under All / dedicated CTA)
    return row.status === "LIVE" && !row.isDemo && row.freshness === "LIVE";
  }
  if (tab === "upcoming") {
    return row.status === "UPCOMING" || row.freshness === "UPCOMING";
  }
  // recent = completed / historical (exclude pure upcoming)
  return (
    row.status === "COMPLETED" ||
    row.freshness === "HISTORICAL" ||
    (row.isDemo && row.status === "DEMO")
  );
}

export function defaultBoardTab(rows: BoardRowInput[]): LiveBoardTab {
  if (rows.some((r) => matchesBoardTab(r, "live"))) return "live";
  if (rows.some((r) => matchesBoardTab(r, "upcoming"))) return "upcoming";
  return "all";
}

export function tabCounts(rows: BoardRowInput[]): Record<LiveBoardTab, number> {
  return {
    live: rows.filter((r) => matchesBoardTab(r, "live")).length,
    upcoming: rows.filter((r) => matchesBoardTab(r, "upcoming")).length,
    recent: rows.filter((r) => matchesBoardTab(r, "recent")).length,
    all: rows.length,
  };
}
