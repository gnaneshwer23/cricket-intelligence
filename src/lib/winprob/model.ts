/**
 * T20 win probability v1 — two logistic regressions, one per innings.
 *
 * Training (scripts/train-winprob.ts) and serving share these feature
 * functions, so the exported coefficients mean the same thing in both places.
 * Coefficients live in model-v1.json; no Python runtime is involved.
 */

export const T20_BALLS = 120;
/** IPL introduced the Impact Player rule in 2023, lifting scoring. */
export const IMPACT_PLAYER_FROM = 2023;

/** Innings-1 state after a delivery (team batting first). */
export type FirstInningsState = {
  innings: 1;
  runs: number;
  wickets: number;
  /** Legal balls bowled so far. */
  legalBalls: number;
  year: number;
};

/** Innings-2 state after a delivery (chasing team). */
export type ChaseState = {
  innings: 2;
  target: number;
  runs: number;
  wickets: number;
  legalBalls: number;
  year: number;
};

export type MatchState = FirstInningsState | ChaseState;

export type LogisticModel = {
  features: string[];
  coefficients: number[];
};

export type WinProbModel = {
  version: string;
  format: "t20";
  trainedOn: string;
  holdout: string;
  /** Mean completed first-innings total by season (scoring environment). */
  seasonPars: Record<string, number>;
  defaultPar: number;
  firstInnings: LogisticModel;
  chase: LogisticModel;
  metrics: Record<string, unknown>;
};

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/**
 * Scoring environment for a season: the previous season's mean completed
 * first-innings total — known before the season starts, so no leakage.
 */
export function parForYear(pars: Record<string, number>, year: number, fallback: number): number {
  const prev = pars[String(year - 1)];
  if (prev) return prev;
  const known = Object.keys(pars).map(Number).filter((y) => y < year).sort((a, b) => b - a);
  return known.length ? pars[String(known[0])]! : fallback;
}

export const FIRST_INNINGS_FEATURES = [
  "bias",
  "runs/par",
  "wickets/10",
  "ballsBowled/120",
  "runs/par × ballsLeft/120",
  "wickets/10 × ballsLeft/120",
  "(wickets/10)²",
  "par/180",
  "impactPlayerEra",
];

export function firstInningsFeatures(s: FirstInningsState, par: number): number[] {
  const r = s.runs / par;
  const w = s.wickets / 10;
  const b = clamp(s.legalBalls, 0, T20_BALLS) / T20_BALLS;
  const left = 1 - b;
  return [1, r, w, b, r * left, w * left, w * w, par / 180, s.year >= IMPACT_PLAYER_FROM ? 1 : 0];
}

export const CHASE_FEATURES = [
  "bias",
  "runsNeeded/par",
  "ballsLeft/120",
  "wicketsLeft/10",
  "requiredRate ÷ par rate (capped 3)",
  "ln((needed+1)/(ballsLeft+1))",
  "wicketsLeft/10 × ballsLeft/120",
  "target/par",
  "impactPlayerEra",
];

export function chaseFeatures(s: ChaseState, par: number): number[] {
  const needed = Math.max(s.target - s.runs, 0);
  const ballsLeft = clamp(T20_BALLS - s.legalBalls, 0, T20_BALLS);
  const wl = clamp(10 - s.wickets, 0, 10);
  const parRate = par / T20_BALLS;
  const rrrRatio = Math.min(needed / Math.max(ballsLeft, 1) / parRate, 3);
  return [
    1,
    needed / par,
    ballsLeft / T20_BALLS,
    wl / 10,
    rrrRatio,
    Math.log((needed + 1) / (ballsLeft + 1)),
    (wl / 10) * (ballsLeft / T20_BALLS),
    s.target / par,
    s.year >= IMPACT_PLAYER_FROM ? 1 : 0,
  ];
}

export function sigmoid(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

export function logistic(model: LogisticModel, x: number[]): number {
  let z = 0;
  for (let i = 0; i < x.length; i += 1) z += (model.coefficients[i] ?? 0) * x[i]!;
  return sigmoid(z);
}

/**
 * Settled chase states are decided by the rules, not the model:
 * target reached → 1; out of balls or wickets short of it → 0;
 * scores level at the end → 0.5 (tie / super over).
 */
export function terminalChaseProbability(s: ChaseState): number | null {
  const needed = s.target - s.runs;
  if (needed <= 0) return 1;
  const done = s.wickets >= 10 || s.legalBalls >= T20_BALLS;
  if (!done) return null;
  return needed === 1 ? 0.5 : 0;
}

/** P(team batting first wins). */
export function probabilityBattingFirstWins(model: WinProbModel, s: MatchState): number {
  const par = parForYear(model.seasonPars, s.year, model.defaultPar);
  if (s.innings === 1) return logistic(model.firstInnings, firstInningsFeatures(s, par));
  const settled = terminalChaseProbability(s);
  const pChase = settled ?? logistic(model.chase, chaseFeatures(s, par));
  return 1 - pChase;
}
