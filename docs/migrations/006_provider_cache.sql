-- CricketOS 006 — shared provider response cache (quota-limited feeds such as CricAPI free: 100 hits/day).
-- Keys never contain API keys. One row per endpoint+params.

CREATE TABLE IF NOT EXISTS provider_cache (
  key TEXT PRIMARY KEY,
  body JSONB,
  ok BOOLEAN NOT NULL,
  status INT NOT NULL DEFAULT 0,
  error TEXT,
  fetched_at TIMESTAMPTZ NOT NULL,
  /** Set while one instance refreshes, so others serve the cached copy instead of stampeding the API. */
  refreshing_until TIMESTAMPTZ
);
