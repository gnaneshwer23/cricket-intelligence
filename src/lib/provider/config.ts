/**
 * Provider-independent configuration.
 * Credentials are read from process.env on the server only — never NEXT_PUBLIC_ for secrets.
 */

export type DataProviderId = "demo" | "cricapi" | "sportmonks";
export type LlmProviderId = "off" | "openai" | "anthropic";
export type StorageBackendId = "memory" | "postgres";

export type CricketOsConfig = {
  dataProvider: DataProviderId;
  dataApiKeyConfigured: boolean;
  /** Optional override base URL for adapters (tests / proxies). Never logged with secrets. */
  dataApiBaseUrl: string | null;
  llmProvider: LlmProviderId;
  llmApiKeyConfigured: boolean;
  llmModel: string | null;
  /** True when no live data provider is usable — app must label DEMO. */
  demoMode: boolean;
  storageBackend: StorageBackendId;
  /** Max age before LIVE becomes STALE (ms). */
  staleAfterMs: number;
  /** HTTP timeout for provider calls (ms). */
  providerTimeoutMs: number;
  /** Max retries on 429/5xx. */
  providerMaxRetries: number;
  /**
   * Server-only token required to trigger ingestion POST.
   * When unset, ingestion trigger routes refuse (no public unbounded ingest).
   */
  ingestionTokenConfigured: boolean;
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

function readStorage(): StorageBackendId {
  const raw = (process.env.CRICKETOS_STORAGE_BACKEND ?? "memory").toLowerCase();
  if (raw === "postgres") return "postgres";
  return "memory";
}

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Safe to call from server components / route handlers. */
export function getCricketOsConfig(): CricketOsConfig {
  const dataProvider = readProvider();
  const dataKey = Boolean(process.env.CRICKETOS_DATA_API_KEY?.trim());
  const llmProvider = readLlm();
  const llmKey = Boolean(process.env.CRICKETOS_LLM_API_KEY?.trim());
  const liveCapable = dataProvider !== "demo" && dataKey;
  const storageBackend = readStorage();
  // Postgres only when DATABASE_URL present — otherwise fall back to memory honestly.
  const postgresReady =
    storageBackend === "postgres" && Boolean(process.env.DATABASE_URL?.trim());

  return {
    dataProvider: liveCapable ? dataProvider : "demo",
    dataApiKeyConfigured: dataKey,
    dataApiBaseUrl: process.env.CRICKETOS_DATA_API_BASE_URL?.trim() || null,
    llmProvider: llmKey ? llmProvider : "off",
    llmApiKeyConfigured: llmKey,
    llmModel: process.env.CRICKETOS_LLM_MODEL?.trim() || null,
    demoMode: !liveCapable,
    storageBackend: postgresReady ? "postgres" : "memory",
    staleAfterMs: readInt("CRICKETOS_STALE_AFTER_MS", 120_000),
    providerTimeoutMs: readInt("CRICKETOS_PROVIDER_TIMEOUT_MS", 12_000),
    providerMaxRetries: readInt("CRICKETOS_PROVIDER_MAX_RETRIES", 2),
    ingestionTokenConfigured: Boolean(process.env.CRICKETOS_INGESTION_TOKEN?.trim()),
  };
}

/** Client-safe snapshot — no secrets. */
export function getPublicRuntimeFlags() {
  const cfg = getCricketOsConfig();
  return {
    demoMode: cfg.demoMode,
    dataProvider: cfg.dataProvider,
    llmEnabled: cfg.llmProvider !== "off",
    storageBackend: cfg.storageBackend,
  };
}

/** Server-only — returns key or null. Never expose to client bundles. */
export function getDataApiKey(): string | null {
  return process.env.CRICKETOS_DATA_API_KEY?.trim() || null;
}

export function getIngestionToken(): string | null {
  return process.env.CRICKETOS_INGESTION_TOKEN?.trim() || null;
}

export function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL?.trim() || null;
}
