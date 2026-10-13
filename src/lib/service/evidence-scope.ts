/**
 * Client-safe evidence/provenance helpers for Copilot.
 * Does not import storage or HTTP adapters.
 */

import { getPublicRuntimeFlags } from "@/lib/provider/config";

/** Evidence scope helper for Copilot — never claims LLM when stubbed. */
export function copilotEvidenceScope(): {
  method: "deterministic-calc" | "rule-engine";
  provenanceNote: string;
  llmEnabled: boolean;
} {
  const flags = getPublicRuntimeFlags();
  return {
    method: "deterministic-calc",
    provenanceNote: flags.demoMode
      ? "DEMO dataset + seeded HISTORICAL archive · grounded rule engine · not a live feed or LLM. Set CRICKETOS_DATA_PROVIDER + CRICKETOS_DATA_API_KEY for provider data."
      : `Provider ${flags.dataProvider} · deterministic calcs + retrieved facts · LLM explain ${flags.llmEnabled ? "configured (must not invent numbers)" : "off"}.`,
    llmEnabled: flags.llmEnabled,
  };
}
