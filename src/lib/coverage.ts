/**
 * Honest coverage metadata for historical / provider matches.
 * Never claim ball-by-ball or full innings when rows are empty.
 */

export type CoverageLevel = "result" | "scorecard" | "innings" | "ball_by_ball";

export type GenderFilter = "men" | "women" | "unknown";

export type CoverageMeta = {
  /** Deepest verified layer present for this match. */
  level: CoverageLevel;
  hasResult: boolean;
  hasScorecard: boolean;
  hasInningsRows: boolean;
  hasBallByBall: boolean;
  gender: GenderFilter;
  /** ISO year from startTime when known. */
  year?: number;
  note?: string;
};

export type CoverageInput = {
  status?: string;
  note?: string;
  score?: { runs?: number; wickets?: number; overs?: string } | null;
  startTimeIso?: string;
  title?: string;
  series?: string;
  homeName?: string;
  awayName?: string;
  battingRowCount?: number;
  bowlingRowCount?: number;
  ballCount?: number;
  isDemo?: boolean;
};

const WOMEN_RE = /\bwomen\b|\bwomen'?s\b/i;

export function inferGender(input: {
  title?: string;
  series?: string;
  homeName?: string;
  awayName?: string;
}): GenderFilter {
  const blob = [input.title, input.series, input.homeName, input.awayName]
    .filter(Boolean)
    .join(" ");
  if (WOMEN_RE.test(blob)) return "women";
  if (!blob.trim()) return "unknown";
  return "men";
}

export function yearFromIso(iso?: string): number | undefined {
  if (!iso) return undefined;
  const y = Number.parseInt(iso.slice(0, 4), 10);
  return Number.isFinite(y) && y >= 1800 && y <= 2100 ? y : undefined;
}

export function deriveCoverage(input: CoverageInput): CoverageMeta {
  const gender = inferGender(input);
  const year = yearFromIso(input.startTimeIso);
  const hasResult =
    Boolean(input.note?.trim()) ||
    input.status === "COMPLETED" ||
    input.status === "DEMO" ||
    Boolean(input.score);
  const hasScorecard = Boolean(input.score);
  const batting = input.battingRowCount ?? 0;
  const bowling = input.bowlingRowCount ?? 0;
  const hasInningsRows = batting > 0 || bowling > 0;
  const ballCount = input.ballCount ?? 0;
  const hasBallByBall = ballCount > 0 || Boolean(input.isDemo);

  let level: CoverageLevel = "result";
  if (hasBallByBall) level = "ball_by_ball";
  else if (hasInningsRows) level = "innings";
  else if (hasScorecard) level = "scorecard";
  else if (hasResult) level = "result";

  const notes: string[] = [];
  if (input.isDemo) {
    notes.push("DEMO playground — illustrative ball-by-ball, not a licensed feed.");
  } else if (hasScorecard && !hasInningsRows) {
    notes.push("Innings totals only — batting/bowling rows not verified in this store.");
  } else if (hasResult && !hasScorecard) {
    notes.push("Result summary only — no scorecard rows in store.");
  }
  if (!hasBallByBall && !input.isDemo) {
    notes.push("No ball-by-ball series for this match.");
  }

  return {
    level,
    hasResult,
    hasScorecard,
    hasInningsRows,
    hasBallByBall,
    gender,
    year,
    note: notes.join(" ") || undefined,
  };
}

export function coverageLabel(level: CoverageLevel): string {
  switch (level) {
    case "result":
      return "Result";
    case "scorecard":
      return "Scorecard";
    case "innings":
      return "Innings";
    case "ball_by_ball":
      return "Ball-by-ball";
  }
}

/** Measured archive window for this build — not a claim of full 1973–present. */
export const ARCHIVE_POLICY = {
  filterYearMin: 1973,
  filterYearMax: new Date().getFullYear() + 2,
  /** Honest measured seed span until a licensed provider expands coverage. */
  measuredSeedEarliest: 1975,
  measuredSeedLatest: 2024,
  claim:
    "Filters accept years from 1973. This build’s seeded archive is a measured sample (not a full 1973–present claim). Licensed provider keys expand coverage when available.",
} as const;
