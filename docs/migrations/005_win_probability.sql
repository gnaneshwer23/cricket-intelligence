-- CricketOS 005 — stored per-ball win probability (one row per point per model version).

CREATE TABLE IF NOT EXISTS win_probability (
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  model_version TEXT NOT NULL,
  seq INT NOT NULL,
  ball_id TEXT,
  innings_number INT NOT NULL,
  overs_label TEXT NOT NULL,
  batting_team TEXT NOT NULL,
  runs INT NOT NULL,
  wickets INT NOT NULL,
  event TEXT,
  p_batting_first DOUBLE PRECISION NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, model_version, seq)
);
