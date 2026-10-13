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
      ? "Truth mode · no licensed provider key. Copilot will not invent match scores or stats. Set CRICKETOS_DATA_PROVIDER=cricapi + CRICKETOS_DATA_API_KEY, or open the labelled DEMO playground for the scripted Lord’s sim."
      : `Provider ${flags.dataProvider} · deterministic calcs + retrieved facts · LLM explain ${flags.llmEnabled ? "configured (must not invent numbers)" : "off"}.`,
    llmEnabled: flags.llmEnabled,
  };
}
