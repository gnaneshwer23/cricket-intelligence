/**
 * Provider-independent configuration.
 * Credentials are read from process.env on the server only — never NEXT_PUBLIC_ for secrets.
 */

export type DataProviderId = "demo" | "cricapi" | "sportmonks";
export type LlmProviderId = "off" | "openai" | "anthropic";

export type CricketOsConfig = {
  dataProvider: DataProviderId;
  dataApiKeyConfigured: boolean;
  llmProvider: LlmProviderId;
  llmApiKeyConfigured: boolean;
  llmModel: string | null;
  /** True when no live data provider is usable — app must label DEMO. */
  demoMode: boolean;
};

function readProvider(): DataProviderId {
  const raw = (process.env.CRICKETOS_DATA_PROVIDER ?? "demo").toLowerCase();
  if (raw === "cricapi" || raw === "sportmonks") return raw;
  return "demo";
}

function readLlm(): LlmProviderId {
  const raw = (process.env.CRICKETOS_LLM_PROVIDER ?? "off").toLowerCase();
  if (raw === "openai" || raw === "anthropic") return raw;
  return "off";
}

/** Safe to call from server components / route handlers. */
export function getCricketOsConfig(): CricketOsConfig {
  const dataProvider = readProvider();
  const dataKey = Boolean(process.env.CRICKETOS_DATA_API_KEY?.trim());
  const llmProvider = readLlm();
  const llmKey = Boolean(process.env.CRICKETOS_LLM_API_KEY?.trim());
  const liveCapable =
    dataProvider !== "demo" && dataKey;

  return {
    dataProvider: liveCapable ? dataProvider : "demo",
    dataApiKeyConfigured: dataKey,
    llmProvider: llmKey ? llmProvider : "off",
    llmApiKeyConfigured: llmKey,
    llmModel: process.env.CRICKETOS_LLM_MODEL?.trim() || null,
    demoMode: !liveCapable,
  };
}

/** Client-safe snapshot — no secrets. */
export function getPublicRuntimeFlags() {
  const cfg = getCricketOsConfig();
  return {
    demoMode: cfg.demoMode,
    dataProvider: cfg.dataProvider,
    llmEnabled: cfg.llmProvider !== "off",
  };
}
