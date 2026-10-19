/**
 * Logistic regression (Newton / IRLS with L2) and calibration metrics.
 * Pure functions — used by the training script and unit tests.
 */

import { sigmoid } from "@/lib/winprob/model";

/** Solve A x = b by Gaussian elimination with partial pivoting. */
export function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let c = 0; c < n; c += 1) {
    let pivot = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(M[r]![c]!) > Math.abs(M[pivot]![c]!)) pivot = r;
    [M[c], M[pivot]] = [M[pivot]!, M[c]!];
    const d = M[c]![c]!;
    if (Math.abs(d) < 1e-12) throw new Error("singular matrix");
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = M[r]![c]! / d;
      for (let k = c; k <= n; k += 1) M[r]![k]! -= f * M[c]![k]!;
    }
  }
  return M.map((row, i) => row[n]! / row[i]!);
}

export type FitResult = { coefficients: number[]; iterations: number; converged: boolean; loss: number };

function penalisedLoss(X: number[][], y: number[], w: number[], l2: number, sw: number[], wsum: number): number {
  let s = 0;
  for (let i = 0; i < X.length; i += 1) {
    let z = 0;
    for (let j = 0; j < w.length; j += 1) z += w[j]! * X[i]![j]!;
    // log(1 + e^z) − y·z, computed stably
    s += sw[i]! * ((z > 0 ? z + Math.log1p(Math.exp(-z)) : Math.log1p(Math.exp(z))) - y[i]! * z);
  }
  let pen = 0;
  for (let j = 1; j < w.length; j += 1) pen += w[j]! * w[j]!;
  return s / wsum + (l2 / 2) * pen;
}

/**
 * Fit P(y=1|x) = σ(w·x) by damped Newton (step halving on the penalised
 * log loss). The bias column (index 0) is not penalised. Optional per-row
 * sample weights (e.g. recency).
 */
export function fitLogistic(
  X: number[][],
  y: number[],
  opts: { l2?: number; maxIter?: number; tol?: number; weights?: number[] } = {},
): FitResult {
  const l2 = opts.l2 ?? 1e-3;
  const sw = opts.weights ?? new Array<number>(X.length).fill(1);
  const wsum = sw.reduce((a, b) => a + b, 0);
  const maxIter = opts.maxIter ?? 100;
  const tol = opts.tol ?? 1e-10;
  const k = X[0]?.length ?? 0;
  const n = X.length;
  let w = new Array<number>(k).fill(0);
  let loss = penalisedLoss(X, y, w, l2, sw, wsum);
  for (let it = 1; it <= maxIter; it += 1) {
    const grad = new Array<number>(k).fill(0);
    const H = Array.from({ length: k }, () => new Array<number>(k).fill(0));
    for (let i = 0; i < n; i += 1) {
      const x = X[i]!;
      let z = 0;
      for (let j = 0; j < k; j += 1) z += w[j]! * x[j]!;
      const p = sigmoid(z);
      const g = sw[i]! * (p - y[i]!);
      const h = sw[i]! * p * (1 - p);
      for (let a = 0; a < k; a += 1) {
        grad[a] = grad[a]! + g * x[a]!;
        for (let b = a; b < k; b += 1) H[a]![b] = H[a]![b]! + h * x[a]! * x[b]!;
      }
    }
    // Mirror the upper triangle before scaling, so every cell is divided once.
    for (let a = 0; a < k; a += 1) for (let b = 0; b < a; b += 1) H[a]![b] = H[b]![a]!;
    for (let a = 0; a < k; a += 1) {
      for (let b = 0; b < k; b += 1) H[a]![b] = H[a]![b]! / wsum;
      grad[a] = grad[a]! / wsum;
      if (a > 0) {
        grad[a] = grad[a]! + l2 * w[a]!;
        H[a]![a] = H[a]![a]! + l2;
      }
    }
    const step = solve(H, grad);
    let t = 1;
    let next = w.map((v, j) => v - step[j]!);
    let nextLoss = penalisedLoss(X, y, next, l2, sw, wsum);
    while (nextLoss > loss && t > 1e-6) {
      t /= 2;
      next = w.map((v, j) => v - t * step[j]!);
      nextLoss = penalisedLoss(X, y, next, l2, sw, wsum);
    }
    if (nextLoss > loss) return { coefficients: w, iterations: it, converged: true, loss };
    const improvement = loss - nextLoss;
    w = next;
    loss = nextLoss;
    if (improvement < tol) return { coefficients: w, iterations: it, converged: true, loss };
  }
  return { coefficients: w, iterations: maxIter, converged: false, loss };
}

export function brier(p: number[], y: number[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i += 1) s += (p[i]! - y[i]!) ** 2;
  return s / Math.max(p.length, 1);
}

export function logLoss(p: number[], y: number[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i += 1) {
    const q = Math.min(Math.max(p[i]!, 1e-12), 1 - 1e-12);
    s -= y[i]! * Math.log(q) + (1 - y[i]!) * Math.log(1 - q);
  }
  return s / Math.max(p.length, 1);
}

export type ReliabilityBin = { from: number; to: number; n: number; meanPredicted: number | null; observed: number | null };

/** Equal-width bins over [0, 1]. */
export function reliability(p: number[], y: number[], bins = 10): ReliabilityBin[] {
  const out: ReliabilityBin[] = Array.from({ length: bins }, (_, i) => ({
    from: i / bins,
    to: (i + 1) / bins,
    n: 0,
    meanPredicted: 0,
    observed: 0,
  }));
  for (let i = 0; i < p.length; i += 1) {
    const b = out[Math.min(Math.floor(p[i]! * bins), bins - 1)]!;
    b.n += 1;
    b.meanPredicted! += p[i]!;
    b.observed! += y[i]!;
  }
  for (const b of out) {
    if (b.n) {
      b.meanPredicted = Number((b.meanPredicted! / b.n).toFixed(3));
      b.observed = Number((b.observed! / b.n).toFixed(3));
    } else {
      b.meanPredicted = null;
      b.observed = null;
    }
  }
  return out;
}

/** Expected calibration error: n-weighted |predicted − observed|. */
export function ece(bins: ReliabilityBin[]): number {
  const total = bins.reduce((s, b) => s + b.n, 0);
  let e = 0;
  for (const b of bins) if (b.n) e += (b.n / total) * Math.abs(b.meanPredicted! - b.observed!);
  return e;
}
