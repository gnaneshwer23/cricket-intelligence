/**
 * Numeric grounding check for assistant answers (the "verifier" step).
 *
 * Every number in a draft answer must be traceable to this turn's tool
 * outputs or to the user's question. Allowed transformations are the ones a
 * careful writer makes: rounding (152.03 → 152 or 152.0) and probability →
 * percentage (0.4329 → 43%). Anything else is treated as invented.
 */

const NUM_RE = /\d+(?:\.\d+)?/g;

function numbersIn(text: string): number[] {
  return (text.match(NUM_RE) ?? []).map(Number).filter((n) => Number.isFinite(n));
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

/** Numbers derivable from a source value by rounding or percentage scaling. */
function variants(m: number): number[] {
  const out = [m, Math.round(m), Math.round(m * 10) / 10, Math.floor(m)];
  if (m > 0 && m <= 1) {
    const pct = m * 100;
    out.push(Math.round(pct), Math.round(pct * 10) / 10);
  }
  return out;
}

export type VerifyResult = { ok: true } | { ok: false; unverified: string[] };

export function verifyNumbers(answer: string, sources: { question: string; toolOutputs: unknown[] }): VerifyResult {
  // The source line may carry an "as of" time copied from tool output; check it too.
  const allowed = new Set<number>();
  const corpus = `${sources.question} ${JSON.stringify(sources.toolOutputs)}`;
  for (const m of numbersIn(corpus)) for (const v of variants(m)) allowed.add(v);

  const unverified: string[] = [];
  for (const token of answer.match(NUM_RE) ?? []) {
    const n = Number(token);
    let found = allowed.has(n);
    if (!found) for (const a of allowed) if (close(a, n)) { found = true; break; }
    if (!found) unverified.push(token);
  }
  return unverified.length ? { ok: false, unverified: [...new Set(unverified)] } : { ok: true };
}

export const UNVERIFIED_FALLBACK =
  "I couldn't verify those figures against the data, so I won't guess. Try asking about a specific player, match, series or the live scores.";
