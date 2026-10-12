/**
 * Synthetic TEST DATA only — not a live or official scorecard.
 * Labelled for data-quality invariant tests.
 */

import type { DomainBall, DomainMatch, DomainScorecard } from "../../domain/models.ts";

export const SYNTHETIC_LABEL = "SYNTHETIC_TEST_DATA";

export function syntheticMatch(): DomainMatch {
  return {
    id: "test-synth-t20-001",
    providerIds: { test: "synth-001" },
    status: "COMPLETED",
    freshness: "HISTORICAL",
    title: "Synth United vs Test XI",
    venue: "Test Oval",
    series: "Synthetic QA Cup",
    format: "t20",
    startTimeIso: "2020-01-01T10:00:00.000Z",
    teams: {
      home: {
        id: "team-synth-united",
        providerIds: { test: "su" },
        name: "Synth United",
        shortName: "SU",
      },
      away: {
        id: "team-test-xi",
        providerIds: { test: "tx" },
        name: "Test XI",
        shortName: "TX",
      },
    },
    score: { runs: 120, wickets: 3, overs: "15.0", balls: 90 },
    provenance: {
      kind: "historical",
      source: SYNTHETIC_LABEL,
      asOf: "2020-01-01T12:00:00.000Z",
      note: "Synthetic test fixture — not real cricket data",
      provider: "test",
      providerEntityId: "synth-001",
    },
    updatedAt: "2020-01-01T12:00:00.000Z",
  };
}

/** Batting 100 + extras 20 = 120; 3 dismissals. */
export function syntheticScorecard(): DomainScorecard {
  const matchId = "test-synth-t20-001";
  const inningsId = "test-inn-1";
  return {
    matchId,
    innings: [
      {
        id: inningsId,
        matchId,
        inningsNumber: 1,
        battingTeamId: "team-synth-united",
        bowlingTeamId: "team-test-xi",
        score: { runs: 120, wickets: 3, overs: "15.0" },
        extras: { total: 20, wides: 10, noBalls: 4, byes: 4, legByes: 2 },
      },
    ],
    batting: {
      [inningsId]: [
        {
          playerId: "p-opener",
          playerName: "A Opener",
          runs: 40,
          balls: 30,
          fours: 4,
          sixes: 1,
          dismissal: "b Bowler",
        },
        {
          playerId: "p-two",
          playerName: "B Two",
          runs: 25,
          balls: 20,
          fours: 2,
          sixes: 0,
          dismissal: "c Keeper b Spinner",
        },
        {
          playerId: "p-three",
          playerName: "C Three",
          runs: 15,
          balls: 18,
          fours: 1,
          sixes: 0,
          dismissal: "lbw b Pace",
        },
        {
          playerId: "p-four",
          playerName: "D Four",
          runs: 20,
          balls: 22,
          fours: 2,
          sixes: 0,
          notOut: true,
        },
      ],
    },
    bowling: {
      [inningsId]: [
        {
          playerId: "p-bowler",
          playerName: "X Bowler",
          overs: "4.0",
          maidens: 0,
          runs: 28,
          wickets: 1,
        },
      ],
    },
  };
}

/** 6 balls × 20 runs each = 120; 3 wickets. */
export function syntheticBalls(): DomainBall[] {
  const matchId = "test-synth-t20-001";
  const inningsId = "test-inn-1";
  const balls: DomainBall[] = [];
  for (let i = 0; i < 6; i++) {
    balls.push({
      id: `test-ball-${i + 1}`,
      matchId,
      inningsId,
      overNumber: Math.floor(i / 6),
      ballInOver: (i % 6) + 1,
      runsOffBat: 18,
      extras: 2,
      totalRuns: 20,
      isWicket: i < 3,
      isWide: false,
      isNoBall: false,
    });
  }
  return balls;
}

/** Intentionally broken scorecard for negative tests. */
export function brokenScorecard(): DomainScorecard {
  const card = syntheticScorecard();
  card.innings[0]!.score.runs = 999;
  return card;
}
