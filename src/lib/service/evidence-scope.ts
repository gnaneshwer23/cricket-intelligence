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
      ? "DEMO dataset · grounded rule engine · figures from bundled match file (not a live feed or LLM)."
      : `Provider ${flags.dataProvider} · deterministic calcs + retrieved facts · LLM explain ${flags.llmEnabled ? "configured (must not invent numbers)" : "off"}.`,
    llmEnabled: flags.llmEnabled,
  };
}
