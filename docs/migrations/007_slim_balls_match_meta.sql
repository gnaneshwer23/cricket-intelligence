-- Cricket Intelligence 007 — slim ball storage + match metadata.
--
-- balls.payload duplicated every typed column as JSON (~2/3 of the heap). The
-- three fields only it held (isFour, isSix, dismissalText) become columns and
-- the JSON goes. Rebuilt with CREATE TABLE AS rather than UPDATE + DROP COLUMN:
-- an UPDATE writes a second copy of every row (payload included) before
-- anything is freed, which would push the 512 MB Neon free tier over its cap.
-- The old heap is released when this transaction commits.

CREATE TABLE balls_slim AS
SELECT id, match_id, innings_id, over_number, ball_in_over,
       innings_number, batting_team, batter_id, bowler_id, non_striker_id,
       runs_batter, runs_extras, runs_total, is_wide, is_no_ball, is_wicket,
       wicket_kind, player_out_id, bowler_runs, is_super_over,
       COALESCE((payload->>'isFour')::boolean, FALSE) AS is_four,
       COALESCE((payload->>'isSix')::boolean, FALSE) AS is_six,
       payload->>'dismissalText' AS dismissal_text
  FROM balls
 ORDER BY match_id, innings_number, innings_id, over_number, ball_in_over;

DROP TABLE balls;
ALTER TABLE balls_slim RENAME TO balls;

ALTER TABLE balls
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN match_id SET NOT NULL,
  ALTER COLUMN innings_id SET NOT NULL,
  ALTER COLUMN over_number SET NOT NULL,
  ALTER COLUMN ball_in_over SET NOT NULL,
  ALTER COLUMN is_super_over SET NOT NULL,
  ALTER COLUMN is_super_over SET DEFAULT FALSE,
  ALTER COLUMN is_four SET NOT NULL,
  ALTER COLUMN is_four SET DEFAULT FALSE,
  ALTER COLUMN is_six SET NOT NULL,
  ALTER COLUMN is_six SET DEFAULT FALSE,
  ADD CONSTRAINT balls_pkey PRIMARY KEY (id),
  ADD CONSTRAINT balls_match_id_innings_id_over_number_ball_in_over_key
    UNIQUE (match_id, innings_id, over_number, ball_in_over),
  ADD CONSTRAINT balls_match_id_fkey
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

CREATE INDEX balls_match_idx ON balls (match_id);
CREATE INDEX balls_batter_idx ON balls (batter_id);
CREATE INDEX balls_bowler_idx ON balls (bowler_id);
CREATE INDEX balls_batter_bowler_idx ON balls (batter_id, bowler_id);
CREATE INDEX balls_player_out_idx ON balls (player_out_id);

-- Match metadata from Cricsheet info (toss, player of the match, scheduled overs).
-- Existing rows are filled by scripts/backfill-match-meta.ts without re-ingest.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS toss_winner TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS toss_decision TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player_of_match TEXT[];
ALTER TABLE matches ADD COLUMN IF NOT EXISTS scheduled_overs INT;
