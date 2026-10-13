/**
 * Product integrity helpers.
 * Numerical / factual cricket claims may only come from:
 *   (a) a configured licensed provider response, or
 *   (b) a clearly quarantined DEMO playground.
 * Seed fixtures exist for API tests — never as customer-facing "truth".
 */

import { matchMeta } from "@/lib/data";
import { SEED_PROVIDER } from "@/lib/provider/seed-historical";
import { getCricketOsConfig, getPublicRuntimeFlags } from "@/lib/provider/config";

export const DEMO_PLAYGROUND_ID = matchMeta.id;
export const DEMO_HASH = "demo";
export const DEMO_PLAYGROUND_STORAGE_KEY = "cricketos-demo-playground";

/** Server: true when no live provider key is usable. */
export function isDemoModeServer(): boolean {
  return getCricketOsConfig().demoMode;
}

/** Client-safe: same flag without secrets. */
export function isDemoModeClient(): boolean {
  return getPublicRuntimeFlags().demoMode;
}

export function isSeedMatchId(id: string): boolean {
  return id.startsWith("seed-") || id.includes(`-${SEED_PROVIDER}-`);
}

export function isDemoMatchId(id: string): boolean {
  return (
    id === DEMO_PLAYGROUND_ID ||
    id === "demo-eng-ind-lords-d2" ||
    id.startsWith("demo-")
  );
}

/** Rows that must not appear on the product Live Scores / Home boards. */
export function isNonProductArchiveId(id: string): boolean {
  return isSeedMatchId(id) || isDemoMatchId(id);
}

export type FixtureLike = {
  id: string;
  freshness?: string;
  status?: string;
  provenance?: { provider?: string; kind?: string; source?: string };
  providerIds?: Record<string, string>;
};

/** Keep only provider-backed (or otherwise non-seed/non-demo) rows for product UI. */
export function filterProductFixtures<T extends FixtureLike>(rows: T[]): T[] {
  return rows.filter((row) => {
    if (isNonProductArchiveId(row.id)) return false;
    if (row.freshness === "DEMO" || row.status === "DEMO") return false;
    if (row.provenance?.kind === "demo") return false;
    if (row.provenance?.provider === "demo" || row.provenance?.provider === SEED_PROVIDER) {
      return false;
    }
    if (row.providerIds?.[SEED_PROVIDER]) return false;
    return true;
  });
}

export const SETUP_HEADLINE = "Live and historical facts require a data provider";

export const SETUP_STEPS = [
  "Sign up at https://cricketdata.org/ and copy your API key (email login — not automatable here).",
  "Set CRICKETOS_DATA_PROVIDER=cricapi and CRICKETOS_DATA_API_KEY in .env.local (local) or Vercel → Settings → Environment Variables.",
  "Restart the app / redeploy. Confirm GET /api/health shows demoMode: false.",
] as const;

export function openDemoPlayground(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DEMO_PLAYGROUND_STORAGE_KEY, "1");
    sessionStorage.setItem("cricketos-match-pick", DEMO_PLAYGROUND_ID);
  } catch {
    /* ignore */
  }
  window.location.hash = DEMO_HASH;
}

export function isDemoPlaygroundHash(hash?: string): boolean {
  const raw = (hash ?? (typeof window !== "undefined" ? window.location.hash : "")).replace(
    /^#/,
    "",
  );
  const id = raw.split(/[/?]/)[0] ?? "";
  return id === DEMO_HASH || id === "demo-playground";
}
