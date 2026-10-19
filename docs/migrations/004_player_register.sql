-- CricketOS 004 — Cricsheet people register (https://cricsheet.org/register/).
-- Alternate names power full-name search ("Virat Kohli" → V Kohli);
-- cross-source keys allow linking out to other references.

CREATE TABLE IF NOT EXISTS player_aliases (
  player_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  PRIMARY KEY (player_id, alias)
);

CREATE INDEX IF NOT EXISTS player_aliases_trgm_idx ON player_aliases USING gin (lower(alias) gin_trgm_ops);

CREATE TABLE IF NOT EXISTS player_register (
  player_id TEXT PRIMARY KEY,
  unique_name TEXT NOT NULL,
  cricinfo_id TEXT,
  cricbuzz_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
