/**
 * Train T20 win probability v1 on stored IPL deliveries.
 *
 *   DATABASE_URL=postgres://localhost:5432/cricketos_dev npm run winprob:train
 *   … -- --holdout-from 2025 --competition "Indian Premier League"
 *
 * Writes src/lib/winprob/model-v1.json (coefficients + holdout metrics) and
 * prints the calibration tables used in docs/WIN_PROBABILITY.md.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { Pool } from "pg";
import { isModelable, loadTrajectories, type MatchTrajectory } from "@/lib/winprob/data";
import {
  parForYear,
  T20_BALLS,
  CHASE_FEATURES,
  chaseFeatures,
  FIRST_INNINGS_FEATURES,
  firstInningsFeatures,
  logistic,
  terminalChaseProbability,
  type ChaseState,
  type FirstInningsState,
  type LogisticModel,
  type WinProbModel,
} from "@/lib/winprob/model";
import { brier, ece, fitLogistic, logLoss, reliability, type ReliabilityBin } from "@/lib/winprob/train";

type Sample = { x: number[]; xSimple: number[]; y: number; year: number };

/** Linear baseline features (no interactions, no era). */
const simpleFirst = (s: FirstInningsState) => [1, s.runs / 100, s.wickets / 10, s.legalBalls / 120];
const simpleChase = (s: ChaseState) => [1, (s.target - s.runs) / 100, (120 - s.legalBalls) / 120, (10 - s.wickets) / 10];

const DEFAULT_PAR = 160;
const MODEL_VERSION = "t20-wp-v1";

/** Mean completed (20 overs or all out) first-innings total per season. */
function seasonPars(ts: MatchTrajectory[]): Record<string, number> {
  const acc = new Map<number, { sum: number; n: number }>();
  for (const t of ts) {
    const last = [...t.balls].reverse().find((b) => b.state.innings === 1);
    if (!last || last.state.innings !== 1) continue;
    if (last.state.legalBalls < T20_BALLS && last.state.wickets < 10) continue;
    const a = acc.get(t.year) ?? { sum: 0, n: 0 };
    a.sum += last.state.runs;
    a.n += 1;
    acc.set(t.year, a);
  }
  return Object.fromEntries(
    [...acc.entries()].sort((a, b) => a[0] - b[0]).map(([y, a]) => [String(y), Number((a.sum / a.n).toFixed(1))]),
  );
}

function samples(ts: MatchTrajectory[], pars: Record<string, number>) {
  const first: Sample[] = [];
  const chase: Sample[] = [];
  const chaseStart: { x: number[]; y: number }[] = [];
  for (const t of ts) {
    const par = parForYear(pars, t.year, DEFAULT_PAR);
    const firstWon = t.winner === t.battingFirst ? 1 : 0;
    const start1: FirstInningsState = { innings: 1, runs: 0, wickets: 0, legalBalls: 0, year: t.year };
    first.push({ x: firstInningsFeatures(start1, par), xSimple: simpleFirst(start1), y: firstWon, year: t.year });
    const start2: ChaseState = { innings: 2, target: t.target!, runs: 0, wickets: 0, legalBalls: 0, year: t.year };
    chase.push({ x: chaseFeatures(start2, par), xSimple: simpleChase(start2), y: 1 - firstWon, year: t.year });
    chaseStart.push({ x: chaseFeatures(start2, par), y: 1 - firstWon });
    for (const b of t.balls) {
      if (b.state.innings === 1) {
        first.push({ x: firstInningsFeatures(b.state, par), xSimple: simpleFirst(b.state), y: firstWon, year: t.year });
      } else if (terminalChaseProbability(b.state) === null) {
        chase.push({ x: chaseFeatures(b.state, par), xSimple: simpleChase(b.state), y: 1 - firstWon, year: t.year });
      }
    }
  }
  return { first, chase, chaseStart };
}

type Eval = { n: number; brier: number; logLoss: number; ece: number; bins?: ReliabilityBin[] };
function evaluate(p: number[], y: number[], withBins = false): Eval {
  const bins = reliability(p, y);
  const r = (v: number) => Number(v.toFixed(4));
  return { n: p.length, brier: r(brier(p, y)), logLoss: r(logLoss(p, y)), ece: r(ece(bins)), ...(withBins ? { bins } : {}) };
}

function table(name: string, rows: Record<string, Eval>) {
  console.log(`\n### ${name}\n\n| Model | n | Brier | Log loss | ECE |\n|---|---|---|---|---|`);
  for (const [k, e] of Object.entries(rows)) console.log(`| ${k} | ${e.n} | ${e.brier} | ${e.logLoss} | ${e.ece} |`);
}

function binsTable(name: string, bins: ReliabilityBin[]) {
  console.log(`\n#### Reliability — ${name}\n\n| Predicted | n | Mean predicted | Observed |\n|---|---|---|---|`);
  for (const b of bins) {
    if (!b.n) continue;
    console.log(`| ${b.from.toFixed(1)}–${b.to.toFixed(1)} | ${b.n} | ${b.meanPredicted} | ${b.observed} |`);
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      "holdout-from": { type: "string", default: "2025" },
      competition: { type: "string", default: "Indian Premier League" },
    },
  });
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not set.");
  const holdoutFrom = Number.parseInt(values["holdout-from"]!, 10);
  const pool = new Pool({ connectionString: url, max: 1 });

  const { trajectories, rowCount } = await loadTrajectories(pool, { competition: values.competition });
  await pool.end();
  const usable = trajectories.filter(isModelable);
  const excluded = trajectories.length - usable.length;
  const train = usable.filter((t) => t.year < holdoutFrom);
  const test = usable.filter((t) => t.year >= holdoutFrom);
  const years = (ts: MatchTrajectory[]) => `${Math.min(...ts.map((t) => t.year))}–${Math.max(...ts.map((t) => t.year))}`;
  console.log(
    `deliveries=${rowCount} matches=${trajectories.length} usable=${usable.length} excluded=${excluded} ` +
      `train=${train.length} (${years(train)}) holdout=${test.length} (${years(test)})`,
  );

  // Pars come from every season's results; each season only ever uses the previous one.
  const pars = seasonPars(usable);
  console.log(`season pars: ${JSON.stringify(pars)}`);
  const tr = samples(train, pars);
  const te = samples(test, pars);
  /** Recency weight: a season `halfLife` years older counts half as much. */
  const weightsFor = (s: Sample[], refYear: number, halfLife: number) =>
    s.map((r) => (Number.isFinite(halfLife) ? 0.5 ** ((refYear - r.year) / halfLife) : 1));
  const fit = (s: Sample[], simple: boolean, weights?: number[]) => {
    const res = fitLogistic(s.map((r) => (simple ? r.xSimple : r.x)), s.map((r) => r.y), { weights });
    if (!res.converged) throw new Error("logistic fit did not converge");
    return res.coefficients;
  };

  // Choose the recency half-life on the last training season only (never the holdout).
  const valYear = holdoutFrom - 1;
  const inner = samples(train.filter((t) => t.year < valYear), pars);
  const val = samples(train.filter((t) => t.year === valYear), pars);
  const candidates = [Number.POSITIVE_INFINITY, 8, 4, 2];
  const selection = candidates.map((hl) => {
    const f = { features: [], coefficients: fit(inner.first, false, weightsFor(inner.first, valYear - 1, hl)) };
    const c = { features: [], coefficients: fit(inner.chase, false, weightsFor(inner.chase, valYear - 1, hl)) };
    const b1 = brier(val.first.map((r) => logistic(f, r.x)), val.first.map((r) => r.y));
    const b2 = brier(val.chase.map((r) => logistic(c, r.x)), val.chase.map((r) => r.y));
    return { halfLife: Number.isFinite(hl) ? hl : "none", firstBrier: Number(b1.toFixed(4)), chaseBrier: Number(b2.toFixed(4)), total: b1 + b2, hl };
  });
  const chosen = selection.reduce((a, b) => (b.total < a.total ? b : a));
  console.log(`\nhalf-life selection on ${valYear}: ${JSON.stringify(selection.map((r) => ({ halfLife: r.halfLife, firstBrier: r.firstBrier, chaseBrier: r.chaseBrier })))} → ${chosen.halfLife}`);

  const refYear = holdoutFrom - 1;
  const firstModel: LogisticModel = {
    features: FIRST_INNINGS_FEATURES,
    coefficients: fit(tr.first, false, weightsFor(tr.first, refYear, chosen.hl)),
  };
  const chaseModel: LogisticModel = {
    features: CHASE_FEATURES,
    coefficients: fit(tr.chase, false, weightsFor(tr.chase, refYear, chosen.hl)),
  };
  const firstSimple: LogisticModel = { features: [], coefficients: fit(tr.first, true) };
  const chaseSimple: LogisticModel = { features: [], coefficients: fit(tr.chase, true) };

  const mean = (s: Sample[]) => s.reduce((a, r) => a + r.y, 0) / s.length;
  const base1 = mean(tr.first);
  const base2 = mean(tr.chase);
  const ys = (s: Sample[]) => s.map((r) => r.y);

  const firstEval = {
    "Constant (train base rate)": evaluate(te.first.map(() => base1), ys(te.first)),
    "Linear baseline": evaluate(te.first.map((r) => logistic(firstSimple, r.xSimple)), ys(te.first)),
    "v1 model": evaluate(te.first.map((r) => logistic(firstModel, r.x)), ys(te.first), true),
  };
  const chaseEval = {
    "Constant (train base rate)": evaluate(te.chase.map(() => base2), ys(te.chase)),
    "Linear baseline": evaluate(te.chase.map((r) => logistic(chaseSimple, r.xSimple)), ys(te.chase)),
    "v1 model": evaluate(te.chase.map((r) => logistic(chaseModel, r.x)), ys(te.chase), true),
  };
  const startP = te.chaseStart.map((r) => logistic(chaseModel, r.x));
  const startY = te.chaseStart.map((r) => r.y);
  const startAcc = startP.filter((p, i) => (p >= 0.5 ? 1 : 0) === startY[i]).length / startP.length;
  const chaseStartEval = {
    ...evaluate(startP, startY),
    accuracy: Number(startAcc.toFixed(4)),
    constantBrier: Number(brier(startP.map(() => base2), startY).toFixed(4)),
  };

  table("First innings (P batting first wins), holdout", firstEval);
  binsTable("first innings v1", firstEval["v1 model"].bins!);
  table("Chase (P chasing team wins), holdout", chaseEval);
  binsTable("chase v1", chaseEval["v1 model"].bins!);
  console.log(`\n### Start-of-chase (one prediction per match)\n\n${JSON.stringify(chaseStartEval)}`);
  console.log(`\nTrain base rates: batting-first wins ${base1.toFixed(3)}, chase wins ${base2.toFixed(3)}`);
  console.log(`\nFirst-innings coefficients: ${JSON.stringify(firstModel.coefficients.map((c) => Number(c.toFixed(4))))}`);
  console.log(`Chase coefficients: ${JSON.stringify(chaseModel.coefficients.map((c) => Number(c.toFixed(4))))}`);

  const model: WinProbModel = {
    version: MODEL_VERSION,
    format: "t20",
    trainedOn: `${values.competition} ${years(train)} (${train.length} matches)`,
    holdout: `${values.competition} ${years(test)} (${test.length} matches)`,
    seasonPars: pars,
    defaultPar: DEFAULT_PAR,
    firstInnings: firstModel,
    chase: chaseModel,
    metrics: {
      recencyHalfLifeYears: chosen.halfLife,
      halfLifeSelection: selection.map((r) => ({ halfLife: r.halfLife, firstBrier: r.firstBrier, chaseBrier: r.chaseBrier })),
      excludedMatches: excluded,
      exclusionRule: "revised target (D/L), tie, no result, reduced overs, or no chase",
      trainBaseRates: { battingFirstWins: Number(base1.toFixed(4)), chaseWins: Number(base2.toFixed(4)) },
      holdoutFirstInnings: firstEval,
      holdoutChase: chaseEval,
      holdoutChaseStart: chaseStartEval,
    },
  };
  const out = path.join(process.cwd(), "src", "lib", "winprob", "model-v1.json");
  await writeFile(out, `${JSON.stringify(model, null, 2)}\n`);
  console.log(`\nwrote ${path.relative(process.cwd(), out)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
