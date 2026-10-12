/** Deterministic cricket calculations — no invented numbers. */

export type PhaseRow = { label: string; scored: number; expected: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Finite number for display — never NaN/Infinity. */
export function safeNumber(n: number, fallback = 0): number {
  return Number.isFinite(n) ? n : fallback;
}

/** Round to `digits` decimal places; returns fallback if not finite. */
export function round1(n: number, digits = 1): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/**
 * Cricket overs ↔ balls.
 * 17.4 means 17 completed overs + 4 legal balls (not 17.4 decimal overs).
 */
export function oversToBalls(overs: number | string): number {
  if (typeof overs === "string") {
    const trimmed = overs.trim();
    if (!trimmed) return 0;
    const [wholePart, ballPart] = trimmed.split(".");
    const whole = Number.parseInt(wholePart ?? "0", 10);
    const balls = ballPart === undefined || ballPart === "" ? 0 : Number.parseInt(ballPart, 10);
    if (!Number.isFinite(whole) || whole < 0) return 0;
    if (!Number.isFinite(balls) || balls < 0 || balls > 5) return Math.max(0, whole) * 6;
    return whole * 6 + balls;
  }
  if (!Number.isFinite(overs) || overs < 0) return 0;
  const whole = Math.floor(overs + 1e-9);
  const tenths = Math.round((overs - whole) * 10);
  if (tenths < 0 || tenths > 5) return whole * 6;
  return whole * 6 + tenths;
}

/** Convert legal balls to cricket overs string (e.g. 106 → "17.4"). */
export function ballsToOvers(balls: number): string {
  if (!Number.isFinite(balls) || balls <= 0) return "0.0";
  const whole = Math.floor(balls / 6);
  const rem = balls % 6;
  return `${whole}.${rem}`;
}

/** Cricket overs as a number for arithmetic display (17.4 not 17.666…). */
export function ballsToOversNumber(balls: number): number {
  if (!Number.isFinite(balls) || balls <= 0) return 0;
  const whole = Math.floor(balls / 6);
  const rem = balls % 6;
  return whole + rem / 10;
}

/** Runs per over from runs and legal balls faced. */
export function runsPerOver(runs: number, balls: number): number {
  if (!Number.isFinite(runs) || !Number.isFinite(balls) || balls <= 0) return 0;
  return round1((runs * 6) / balls);
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

/* ── Scoring progression / Manhattan helpers ── */

export type DeliveryPoint = {
  /** Absolute legal ball index (1-based cumulative). */
  ballIndex: number;
  overs: string;
  runsOffBat: number;
  cumulativeRuns: number;
  wickets: number;
  isBoundary: boolean;
  isWicket: boolean;
  eventLabel?: string;
  graphEventId?: string;
  batter?: string;
  bowler?: string;
};

export type OverBucket = {
  overNumber: number;
  balls: number;
  runs: number;
  wickets: number;
  fours: number;
  sixes: number;
  startRuns: number;
  endRuns: number;
  events: { ball: number; kind: "wicket" | "four" | "six" | "other"; label: string; graphEventId?: string }[];
};

/** Build cumulative scoring points from ordered over buckets. */
export function cumulativeFromOvers(overs: OverBucket[]): DeliveryPoint[] {
  const points: DeliveryPoint[] = [];
  let runs = 0;
  let wickets = 0;
  let ballIndex = 0;

  for (const over of overs) {
    const legalBalls = Math.max(0, Math.min(6, over.balls));
    const perBall = distributeRunsAcrossBalls(over.runs, legalBalls, over.events);
    const eventWicketBalls = new Set(
      over.events.filter((e) => e.kind === "wicket").map((e) => e.ball),
    );
    // If wickets declared without ball-level events, mark the last ball.
    const declaredExtra = Math.max(0, over.wickets - eventWicketBalls.size);

    for (let i = 0; i < legalBalls; i += 1) {
      ballIndex += 1;
      const ballInOver = i + 1;
      const ballRuns = perBall[i] ?? 0;
      runs += ballRuns;
      const event = over.events.find((e) => e.ball === ballInOver);
      let wicketHere = event?.kind === "wicket";
      if (!wicketHere && declaredExtra > 0 && i === legalBalls - 1) {
        wicketHere = true;
      }
      if (wicketHere) wickets += 1;
      const isBoundary = ballRuns >= 4 || event?.kind === "four" || event?.kind === "six";
      points.push({
        ballIndex,
        overs: `${over.overNumber - 1}.${ballInOver}`,
        runsOffBat: ballRuns,
        cumulativeRuns: runs,
        wickets,
        isBoundary,
        isWicket: wicketHere,
        eventLabel: event?.label,
        graphEventId: event?.graphEventId,
        batter: undefined,
        bowler: undefined,
      });
    }
  }
  return points;
}

/** Spread over runs across balls; sum is always exactly `totalRuns`. */
function distributeRunsAcrossBalls(
  totalRuns: number,
  balls: number,
  events: OverBucket["events"],
): number[] {
  const out = Array.from({ length: balls }, () => 0);
  if (balls <= 0) return out;
  let remaining = Math.max(0, totalRuns);

  for (const event of events) {
    const idx = event.ball - 1;
    if (idx < 0 || idx >= balls || remaining <= 0) continue;
    if (event.kind === "six") {
      const take = Math.min(6, remaining);
      out[idx] = take;
      remaining -= take;
    } else if (event.kind === "four") {
      const take = Math.min(4, remaining);
      out[idx] = take;
      remaining -= take;
    }
  }

  for (let i = 0; i < balls && remaining > 0; i += 1) {
    if (out[i] > 0) continue;
    const take = Math.min(3, remaining);
    out[i] = take;
    remaining -= take;
  }
  if (remaining > 0) {
    out[balls - 1] += remaining;
  }

  // Final guard: force exact total if rounding/events drifted.
  const sum = out.reduce((s, n) => s + n, 0);
  const drift = totalRuns - sum;
  if (drift !== 0 && balls > 0) {
    out[balls - 1] = Math.max(0, out[balls - 1] + drift);
  }
  return out;
}

/** Aggregate over buckets (Manhattan). */
export function manhattanFromOvers(overs: OverBucket[]): OverBucket[] {
  return overs.map((over) => ({ ...over, events: [...over.events] }));
}

export type FormatKind = "test" | "odi" | "t20" | "unknown";

export type PhaseBand = {
  id: string;
  label: string;
  /** Inclusive 1-based over numbers (completed-over index). */
  fromOver: number;
  toOver: number;
  kind: "test-session" | "test-range" | "lo-powerplay" | "lo-middle" | "lo-death" | "custom";
};

/** Standard phase bands — LO categories only when format is limited-overs. */
export function phaseBandsForFormat(format: FormatKind, maxOver: number): PhaseBand[] {
  const clampBand = (bands: PhaseBand[]) =>
    bands.filter((b) => b.fromOver <= maxOver && b.fromOver <= b.toOver);

  if (format === "t20") {
    return clampBand([
      { id: "pp", label: "Powerplay (1–6)", fromOver: 1, toOver: Math.min(6, maxOver), kind: "lo-powerplay" },
      { id: "middle", label: "Middle (7–15)", fromOver: 7, toOver: Math.min(15, maxOver), kind: "lo-middle" },
      { id: "death", label: "Death (16–20)", fromOver: 16, toOver: Math.min(20, maxOver), kind: "lo-death" },
    ]);
  }
  if (format === "odi") {
    return clampBand([
      { id: "pp", label: "Powerplay (1–10)", fromOver: 1, toOver: Math.min(10, maxOver), kind: "lo-powerplay" },
      { id: "middle", label: "Middle (11–40)", fromOver: 11, toOver: Math.min(40, maxOver), kind: "lo-middle" },
      { id: "death", label: "Death (41–50)", fromOver: 41, toOver: Math.min(50, maxOver), kind: "lo-death" },
    ]);
  }
  // Test / unknown: session-style over ranges — never LO labels.
  return clampBand([
    { id: "newball", label: "New ball (1–14)", fromOver: 1, toOver: Math.min(14, maxOver), kind: "test-range" },
    { id: "mid1", label: "Overs 15–30", fromOver: 15, toOver: Math.min(30, maxOver), kind: "test-range" },
    { id: "mid2", label: "Overs 31–48", fromOver: 31, toOver: Math.min(48, maxOver), kind: "test-range" },
    { id: "session-am", label: "Morning block (1–30)", fromOver: 1, toOver: Math.min(30, maxOver), kind: "test-session" },
  ]);
}

export type PhaseAggregate = {
  band: PhaseBand;
  runs: number;
  balls: number;
  overs: string;
  rpo: number;
  wickets: number;
  fours: number;
  sixes: number;
  boundaries: number;
};

export function aggregatePhase(overs: OverBucket[], band: PhaseBand): PhaseAggregate {
  const slice = overs.filter((o) => o.overNumber >= band.fromOver && o.overNumber <= band.toOver);
  const runs = slice.reduce((s, o) => s + o.runs, 0);
  const balls = slice.reduce((s, o) => s + o.balls, 0);
  const wickets = slice.reduce((s, o) => s + o.wickets, 0);
  const fours = slice.reduce((s, o) => s + o.fours, 0);
  const sixes = slice.reduce((s, o) => s + o.sixes, 0);
  return {
    band,
    runs,
    balls,
    overs: ballsToOvers(balls),
    rpo: runsPerOver(runs, balls),
    wickets,
    fours,
    sixes,
    boundaries: fours + sixes,
  };
}

export function comparePhaseAggregates(a: PhaseAggregate, b: PhaseAggregate) {
  return {
    runDelta: a.runs - b.runs,
    rpoDelta: round1(a.rpo - b.rpo),
    wicketDelta: a.wickets - b.wickets,
    boundaryDelta: a.boundaries - b.boundaries,
  };
}

/* ── What-If / chase mathematics ── */

export type ChaseSituation = {
  /** Runs still needed (can be 0 or negative = already chased). */
  runsRequired: number;
  ballsRemaining: number;
  wicketsInHand: number;
  /** Optional: runs already scored / balls faced for projections. */
  currentRuns?: number;
  ballsFaced?: number;
  assumedRpo?: number;
};

export type ChaseAnalysis = {
  valid: boolean;
  status:
    | "ok"
    | "completed"
    | "zero-balls"
    | "invalid"
    | "negative-required";
  runsRequired: number;
  ballsRemaining: number;
  oversRemaining: string;
  /** Required runs per over; null when undefined. */
  requiredRunRate: number | null;
  /** Required runs per ball; null when undefined. */
  requiredRunPerBall: number | null;
  projectedScore: number | null;
  runsPerOverAtAssumption: number | null;
  plainLanguage: string;
  /** Alternative rates / wicket notes — not win probabilities. */
  alternatives: { label: string; detail: string }[];
};

export function analyseChase(input: ChaseSituation): ChaseAnalysis {
  const runsRequired = Number(input.runsRequired);
  const ballsRemaining = Number(input.ballsRemaining);
  const wicketsInHand = Number(input.wicketsInHand);
  const assumedRpo = input.assumedRpo;
  const currentRuns = input.currentRuns ?? 0;

  if (
    !Number.isFinite(runsRequired) ||
    !Number.isFinite(ballsRemaining) ||
    !Number.isFinite(wicketsInHand) ||
    ballsRemaining < 0 ||
    wicketsInHand < 0
  ) {
    return {
      valid: false,
      status: "invalid",
      runsRequired: safeNumber(runsRequired),
      ballsRemaining: safeNumber(ballsRemaining),
      oversRemaining: "—",
      requiredRunRate: null,
      requiredRunPerBall: null,
      projectedScore: null,
      runsPerOverAtAssumption: null,
      plainLanguage: "Enter non-negative finite numbers for runs, balls, and wickets.",
      alternatives: [],
    };
  }

  if (runsRequired <= 0) {
    return {
      valid: true,
      status: runsRequired < 0 ? "negative-required" : "completed",
      runsRequired,
      ballsRemaining,
      oversRemaining: ballsToOvers(ballsRemaining),
      requiredRunRate: 0,
      requiredRunPerBall: 0,
      projectedScore: currentRuns,
      runsPerOverAtAssumption:
        assumedRpo !== undefined && Number.isFinite(assumedRpo) ? round1(assumedRpo) : null,
      plainLanguage:
        runsRequired < 0
          ? "Target already passed — required rate is 0."
          : "Chase complete — no runs required.",
      alternatives: [
        {
          label: "Observed",
          detail: "Situation is finished; hypothetical rates below are for comparison only.",
        },
      ],
    };
  }

  if (ballsRemaining === 0) {
    return {
      valid: true,
      status: "zero-balls",
      runsRequired,
      ballsRemaining: 0,
      oversRemaining: "0.0",
      requiredRunRate: null,
      requiredRunPerBall: null,
      projectedScore: currentRuns,
      runsPerOverAtAssumption: null,
      plainLanguage: `${runsRequired} still needed with 0 balls left — chase unsuccessful on numbers alone.`,
      alternatives: [
        {
          label: "No overs left",
          detail: "Required rate is undefined when balls remaining is zero.",
        },
      ],
    };
  }

  const rrr = round1((runsRequired * 6) / ballsRemaining);
  const rpb = round1(runsRequired / ballsRemaining, 2);
  const oversRemaining = ballsToOvers(ballsRemaining);
  const proj =
    assumedRpo !== undefined && Number.isFinite(assumedRpo)
      ? Math.round(currentRuns + assumedRpo * (ballsRemaining / 6))
      : null;

  const alternatives: ChaseAnalysis["alternatives"] = [
    {
      label: "Hold current ask",
      detail: `Need ${rrr} runs/over (${rpb} per ball) across ${oversRemaining} overs.`,
    },
    {
      label: "One more wicket",
      detail:
        wicketsInHand <= 1
          ? "Only one wicket in hand — a dismissal ends the chase on these numbers."
          : `With ${wicketsInHand - 1} wickets left, the same RRR (${rrr}) still applies; depth of batting is the risk, not a different rate.`,
    },
    {
      label: "+1 RPO buffer",
      detail: `Scoring at ${round1(rrr + 1)} / over would clear the ask with margin if wickets allow.`,
    },
  ];

  if (proj !== null) {
    alternatives.push({
      label: "Assumed RPO projection",
      detail: `At ${round1(assumedRpo!)} / over from here → projected total ${proj} (hypothetical).`,
    });
  }

  return {
    valid: true,
    status: "ok",
    runsRequired,
    ballsRemaining,
    oversRemaining,
    requiredRunRate: rrr,
    requiredRunPerBall: rpb,
    projectedScore: proj,
    runsPerOverAtAssumption:
      assumedRpo !== undefined && Number.isFinite(assumedRpo) ? round1(assumedRpo) : null,
    plainLanguage: `Need ${runsRequired} off ${ballsRemaining} balls (${oversRemaining} ov) → RRR ${rrr}.`,
    alternatives,
  };
}

export type ScenarioPreset = {
  id: "conservative" | "baseline" | "aggressive";
  label: string;
  /** Assumed scoring rate (runs per over). */
  assumedRpo: number;
  note: string;
};

export const DEFAULT_SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "conservative",
    label: "Conservative",
    assumedRpo: 3.5,
    note: "Test-match accumulation — leave and single.",
  },
  {
    id: "baseline",
    label: "Baseline",
    assumedRpo: 4.5,
    note: "Session par on this DEMO board.",
  },
  {
    id: "aggressive",
    label: "Aggressive",
    assumedRpo: 6.0,
    note: "Force the rate — higher dismissal risk (not modelled as win %).",
  },
];

export type ScenarioProjection = {
  preset: ScenarioPreset;
  analysis: ChaseAnalysis;
  /** Runs added under assumed RPO over remaining balls. */
  runsAdded: number | null;
  endTotal: number | null;
};

/** Three side-by-side projections — rates only, never win probabilities. */
export function projectScenarios(
  situation: ChaseSituation,
  presets: ScenarioPreset[] = DEFAULT_SCENARIO_PRESETS,
): ScenarioProjection[] {
  return presets.map((preset) => {
    const analysis = analyseChase({ ...situation, assumedRpo: preset.assumedRpo });
    const balls = situation.ballsRemaining;
    const runsAdded =
      Number.isFinite(balls) && balls > 0
        ? round1(preset.assumedRpo * (balls / 6))
        : null;
    const current = situation.currentRuns ?? 0;
    const endTotal = runsAdded !== null ? Math.round(current + runsAdded) : null;
    return { preset, analysis, runsAdded, endTotal };
  });
}

/** Format a metric for UI — never shows NaN/Infinity. */
export function formatMetric(n: number | null | undefined, digits = 1, empty = "—"): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return empty;
  return digits === 0 ? String(Math.round(n)) : String(round1(n, digits));
}
