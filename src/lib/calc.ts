/** Deterministic cricket calculations — no invented numbers. */

export type PhaseRow = { label: string; scored: number; expected: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export type PhaseAnalysis = {
  label: string;
  scored: number;
  expected: number;
  delta: number;
  ahead: boolean;
};

/** Runs ahead/behind phase expectation. */
export function phaseDelta(scored: number, expected: number): number {
  return scored - expected;
}

export function analysePhases(phases: PhaseRow[]): PhaseAnalysis[] {
  return phases.map((phase) => {
    const delta = phaseDelta(phase.scored, phase.expected);
    return {
      ...phase,
      delta,
      ahead: delta > 0,
    };
  });
}

/** Cumulative runs vs model across phases. */
export function cumulativePhaseLead(phases: PhaseRow[]): number {
  return phases.reduce((sum, phase) => sum + phaseDelta(phase.scored, phase.expected), 0);
}

/** Batting strike rate to 1 decimal. */
export function strikeRate(runs: number, balls: number): number {
  if (balls <= 0) return 0;
  return Math.round((runs / balls) * 1000) / 10;
}

/** Milestone runs remaining (never negative). */
export function runsToMilestone(current: number, target: number): number {
  return Math.max(0, target - current);
}

/**
 * Apply a win-model swing from a simulation event.
 * Returns clamped England / India percentages that sum to 100 (no draw).
 */
export function applyWinSwing(
  baseEng: number,
  swing: number,
  opts?: { min?: number; max?: number },
): { eng: number; ind: number } {
  const min = opts?.min ?? 5;
  const max = opts?.max ?? 92;
  const eng = clamp(baseEng + swing, min, max);
  return { eng, ind: 100 - eng };
}

/** Percent speed above career mean, 1 decimal. */
export function speedUpliftPct(currentKph: number, careerMeanKph: number): number {
  if (careerMeanKph <= 0) return 0;
  return Math.round(((currentKph - careerMeanKph) / careerMeanKph) * 1000) / 10;
}

/** Simple sample-size warning for comparison claims. */
export function sampleSizeWarning(n: number, threshold = 10): string | null {
  if (n >= threshold) return null;
  return `Small sample (n=${n}). Treat the comparison as directional, not definitive.`;
}
