-- CricketOS 002 — search pushdown + typed deliveries for analytics.
-- Applied by `npm run db:migrate` (tracked in schema_migrations).

-- Searchable match columns (previously only in payload JSON)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_name TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_name TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS coverage_level TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_text TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS provider TEXT;

CREATE INDEX IF NOT EXISTS matches_gender_idx ON matches (gender);
CREATE INDEX IF NOT EXISTS matches_coverage_idx ON matches (coverage_level);
CREATE INDEX IF NOT EXISTS matches_provider_idx ON matches (provider);

-- Who played in which match (squad lists) — powers player filters without
-- scanning every scorecard.
CREATE TABLE IF NOT EXISTS match_players (
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  team_name TEXT,
  PRIMARY KEY (match_id, player_id)
);

CREATE INDEX IF NOT EXISTS match_players_player_idx ON match_players (player_id);
CREATE INDEX IF NOT EXISTS match_players_name_idx ON match_players (lower(player_name));

-- Typed delivery columns so models / text-to-SQL do not parse JSON.
ALTER TABLE balls ADD COLUMN IF NOT EXISTS innings_number INT;
ALTER TABLE balls ADD COLUMN IF NOT EXISTS batting_team TEXT;
ALTER TABLE balls ADD COLUMN IF NOT EXISTS batter_id TEXT;
ALTER TABLE balls ADD COLUMN IF NOT EXISTS bowler_id TEXT;
ALTER TABLE balls ADD COLUMN IF NOT EXISTS non_striker_id TEXT;
ALTER TABLE balls ADD COLUMN IF NOT EXISTS runs_batter INT;
ALTER TABLE balls ADD COLUMN IF NOT EXISTS runs_extras INT;
ALTER TABLE balls ADD COLUMN IF NOT EXISTS runs_total INT;
ALTER TABLE balls ADD COLUMN IF NOT EXISTS is_wide BOOLEAN;
ALTER TABLE balls ADD COLUMN IF NOT EXISTS is_no_ball BOOLEAN;
ALTER TABLE balls ADD COLUMN IF NOT EXISTS is_wicket BOOLEAN;
ALTER TABLE balls ADD COLUMN IF NOT EXISTS wicket_kind TEXT;
ALTER TABLE balls ADD COLUMN IF NOT EXISTS player_out_id TEXT;

CREATE INDEX IF NOT EXISTS balls_batter_idx ON balls (batter_id);
CREATE INDEX IF NOT EXISTS balls_bowler_idx ON balls (bowler_id);
