-- CricketOS Stage 5 — apply only when DATABASE_URL credentials are available.
-- Not applied automatically in CI. In-memory storage is the default without this.

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  provider_ids JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL,
  freshness TEXT NOT NULL,
  title TEXT NOT NULL,
  venue TEXT NOT NULL,
  series TEXT,
  format TEXT NOT NULL,
  start_time TIMESTAMPTZ,
  teams JSONB NOT NULL,
  score JSONB,
  note TEXT,
  provenance JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS matches_freshness_idx ON matches (freshness);
CREATE INDEX IF NOT EXISTS matches_format_idx ON matches (format);
CREATE INDEX IF NOT EXISTS matches_start_time_idx ON matches (start_time);

CREATE TABLE IF NOT EXISTS scorecards (
  match_id TEXT PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS balls (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  innings_id TEXT NOT NULL,
  over_number INT NOT NULL,
  ball_in_over INT NOT NULL,
  payload JSONB NOT NULL,
  UNIQUE (match_id, innings_id, over_number, ball_in_over)
);

CREATE INDEX IF NOT EXISTS balls_match_idx ON balls (match_id);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  provider_ids JSONB NOT NULL DEFAULT '{}',
  name TEXT NOT NULL,
  team_id TEXT,
  role TEXT,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS players_name_idx ON players (name);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  fetched INT NOT NULL DEFAULT 0,
  upserted INT NOT NULL DEFAULT 0,
  skipped INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]',
  notes TEXT
);

CREATE INDEX IF NOT EXISTS ingestion_runs_started_idx ON ingestion_runs (started_at DESC);
