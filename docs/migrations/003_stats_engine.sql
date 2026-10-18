-- CricketOS 003 — verified stats engine.
-- Runs charged to the bowler per delivery (excludes byes, leg-byes, penalties)
-- and fuzzy player search. Re-ingest Cricsheet with --force to backfill bowler_runs.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

ALTER TABLE balls ADD COLUMN IF NOT EXISTS bowler_runs INT;
ALTER TABLE balls ADD COLUMN IF NOT EXISTS is_super_over BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS balls_batter_bowler_idx ON balls (batter_id, bowler_id);
CREATE INDEX IF NOT EXISTS balls_player_out_idx ON balls (player_out_id);
CREATE INDEX IF NOT EXISTS players_name_trgm_idx ON players USING gin (lower(name) gin_trgm_ops);
