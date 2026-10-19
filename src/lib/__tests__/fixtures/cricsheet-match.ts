/**
 * SYNTHETIC TEST DATA — Cricsheet-shaped match, not a real fixture.
 * Covers wides, no-balls, leg-byes, byes, all-run fours, caught, run out,
 * bowled, retired hurt, a maiden, penalty runs, a super over and D/L text.
 */

const d = (
  batter: string,
  bowler: string,
  nonStriker: string,
  batterRuns: number,
  extras: Record<string, number> = {},
  more: Record<string, unknown> = {},
) => {
  const extraRuns = Object.values(extras).reduce((s, n) => s + n, 0);
  return {
    batter,
    bowler,
    non_striker: nonStriker,
    runs: { batter: batterRuns, extras: extraRuns, total: batterRuns + extraRuns },
    ...(extraRuns ? { extras } : {}),
    ...more,
  };
};

export const SYNTHETIC_CRICSHEET_ID = "9900001";

export const syntheticCricsheetMatch = {
  meta: { data_version: "1.1.0", created: "2026-01-02", revision: 1 },
  info: {
    balls_per_over: 6,
    city: "Testville",
    dates: ["2026-01-01"],
    event: { name: "Synthetic League", match_number: 7 },
    gender: "female",
    match_type: "T20",
    outcome: { winner: "Team A", by: { runs: 14 }, method: "D/L" },
    players: {
      "Team A": ["A1", "A2", "A3"],
      "Team B": ["B1", "B2", "Y1", "Y3", "Y4"],
    },
    registry: { people: { A1: "aaaa0001" } },
    season: "2026",
    team_type: "club",
    teams: ["Team A", "Team B"],
    venue: "Synthetic Oval",
  },
  innings: [
    {
      team: "Team A",
      penalty_runs: { post: 5 },
      overs: [
        {
          over: 0,
          deliveries: [
            d("A1", "B1", "A2", 1),
            d("A2", "B1", "A1", 0, { wides: 1 }),
            d("A2", "B1", "A1", 4),
            d("A2", "B1", "A1", 0, {}, {
              wickets: [{ player_out: "A2", kind: "caught", fielders: [{ name: "Y1" }] }],
            }),
            d("A3", "B1", "A1", 0, { legbyes: 1 }),
            d("A1", "B1", "A3", 6, { noballs: 1 }),
            d("A1", "B1", "A3", 0),
            d("A1", "B1", "A3", 0),
          ],
        },
        {
          over: 1,
          deliveries: [
            d("A1", "B2", "A3", 0),
            d("A1", "B2", "A3", 0),
            d("A1", "B2", "A3", 0),
            d("A1", "B2", "A3", 0),
            d("A1", "B2", "A3", 0),
            d("A1", "B2", "A3", 0, {}, {
              wickets: [{ player_out: "A3", kind: "run out", fielders: [{ name: "Y3" }] }],
            }),
          ],
        },
      ],
    },
    {
      team: "Team B",
      overs: [
        {
          over: 0,
          deliveries: [
            { ...d("Y1", "A1", "Y3", 4), runs: { batter: 4, extras: 0, total: 4, non_boundary: true } },
            d("Y1", "A1", "Y3", 0, { byes: 1 }),
            d("Y3", "A1", "Y1", 0, {}, { wickets: [{ player_out: "Y3", kind: "bowled" }] }),
            d("Y4", "A1", "Y1", 0, {}, { wickets: [{ player_out: "Y4", kind: "retired hurt" }] }),
          ],
        },
      ],
    },
    {
      team: "Team A",
      super_over: true,
      overs: [{ over: 0, deliveries: [d("A1", "B1", "A3", 6)] }],
    },
  ],
};
