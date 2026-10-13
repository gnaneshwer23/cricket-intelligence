/**
 * Seeded historical + upcoming fixtures for offline / no-key mode.
 * Raw rows use the same CricAPI-shaped shape as the live adapter, then pass
 * through normaliseCricApiMatch — never fabricated LIVE freshness.
 *
 * Scores are well-known public completed results used as an archive for
 * Explorer / Copilot when no provider key is configured.
 */

import { deriveCoverage } from "@/lib/coverage";
import type { DomainMatch, DomainScorecard } from "@/lib/domain/models";
import {
  lifecycleToFreshness,
  mapLifecycle,
  normaliseCricApiMatch,
  provenanceFor,
  slugId,
  teamFromNames,
  toFixtureItem,
} from "@/lib/ingestion/normalise";
import { runQualityChecks } from "@/lib/ingestion/quality";
import type { DomainFixtureListItem } from "@/lib/domain/models";

export const SEED_PROVIDER = "seed";
export const SEED_SOURCE = "CricketOS seeded historical archive";

/**
 * CricAPI-shaped raw match rows (completed / upcoming only).
 * Well-known public results — result/scorecard depth only; empty batting rows.
 * Measured sample spans 1975–2024; not a full 1973–present archive claim.
 */
export const SEED_CRICAPI_ROWS: Record<string, unknown>[] = [
  {
    id: "seed-wc-final-1975",
    name: "West Indies vs Australia, Final",
    series: "Prudential World Cup 1975",
    status: "Match finished · West Indies won by 17 runs",
    venue: "Lord's, London",
    matchType: "odi",
    dateTimeGMT: "1975-06-21T10:00:00.000Z",
    teams: ["West Indies", "Australia"],
    score: [{ r: 291, w: 8, o: "60.0", inning: "West Indies" }],
  },
  {
    id: "seed-headingley-1981",
    name: "England vs Australia, 3rd Test",
    series: "The Ashes 1981",
    status: "Match finished · England won by 18 runs",
    venue: "Headingley, Leeds",
    matchType: "test",
    dateTimeGMT: "1981-07-16T10:00:00.000Z",
    teams: ["England", "Australia"],
    score: [{ r: 151, w: 10, o: "55.4", inning: "Australia 2nd" }],
  },
  {
    id: "seed-wc-final-1983",
    name: "India vs West Indies, Final",
    series: "Prudential World Cup 1983",
    status: "Match finished · India won by 43 runs",
    venue: "Lord's, London",
    matchType: "odi",
    dateTimeGMT: "1983-06-25T10:00:00.000Z",
    teams: ["India", "West Indies"],
    score: [{ r: 183, w: 10, o: "54.4", inning: "India" }],
  },
  {
    id: "seed-headingley-2019",
    name: "England vs Australia, 3rd Test",
    series: "The Ashes 2019",
    status: "Match finished · England won by 1 wicket",
    venue: "Headingley, Leeds",
    matchType: "test",
    dateTimeGMT: "2019-08-22T10:00:00.000Z",
    teams: ["England", "Australia"],
    score: [{ r: 362, w: 9, o: "125.4", inning: "England 2nd" }],
  },
  {
    id: "seed-wc-final-2019",
    name: "England vs New Zealand, Final",
    series: "ICC Cricket World Cup 2019",
    status: "Match finished · England won (Super Over)",
    venue: "Lord's, London",
    matchType: "odi",
    dateTimeGMT: "2019-07-14T09:30:00.000Z",
    teams: ["England", "New Zealand"],
    score: [{ r: 241, w: 10, o: "50.0", inning: "England" }],
  },
  {
    id: "seed-wtc-final-2023",
    name: "Australia vs India, WTC Final",
    series: "ICC World Test Championship Final 2023",
    status: "Match finished · Australia won by 209 runs",
    venue: "The Oval, London",
    matchType: "test",
    dateTimeGMT: "2023-06-07T10:00:00.000Z",
    teams: ["Australia", "India"],
    score: [{ r: 444, w: 10, o: "131.0", inning: "Australia 1st" }],
  },
  {
    id: "seed-ashes-edgbaston-2005",
    name: "England vs Australia, 2nd Test",
    series: "The Ashes 2005",
    status: "Match finished · England won by 2 runs",
    venue: "Edgbaston, Birmingham",
    matchType: "test",
    dateTimeGMT: "2005-08-04T10:00:00.000Z",
    teams: ["England", "Australia"],
    score: [{ r: 348, w: 10, o: "86.0", inning: "Australia 2nd" }],
  },
  {
    id: "seed-upcoming-aus-sa",
    name: "Australia vs South Africa, 1st Test",
    series: "Australia tour of South Africa 2026/27",
    status: "Match not started",
    venue: "Centurion",
    matchType: "test",
    dateTimeGMT: "2026-12-11T08:00:00.000Z",
    teams: ["Australia", "South Africa"],
    score: [],
  },
  {
    id: "seed-ipl-final-2024",
    name: "Kolkata Knight Riders vs Sunrisers Hyderabad, Final",
    series: "Indian Premier League 2024",
    status: "Match finished · KKR won by 8 wickets",
    venue: "MA Chidambaram Stadium, Chennai",
    matchType: "t20",
    dateTimeGMT: "2024-05-26T14:00:00.000Z",
    teams: ["Kolkata Knight Riders", "Sunrisers Hyderabad"],
    score: [{ r: 114, w: 2, o: "10.3", inning: "KKR" }],
  },
  {
    id: "seed-wi-eng-t20-2024",
    name: "West Indies vs England, 1st T20I",
    series: "England tour of West Indies 2024/25",
    status: "Match finished · West Indies won by 4 wickets",
    venue: "Kensington Oval, Bridgetown",
    matchType: "t20",
    dateTimeGMT: "2024-11-09T23:00:00.000Z",
    teams: ["West Indies", "England"],
    score: [{ r: 174, w: 6, o: "19.2", inning: "West Indies" }],
  },
  {
    id: "seed-women-wc-final-2022",
    name: "Australia Women vs England Women, Final",
    series: "ICC Women's Cricket World Cup 2022",
    status: "Match finished · Australia Women won by 71 runs",
    venue: "AMC Stadium, Christchurch",
    matchType: "odi",
    dateTimeGMT: "2022-04-03T02:00:00.000Z",
    teams: ["Australia Women", "England Women"],
    score: [{ r: 356, w: 5, o: "50.0", inning: "Australia Women" }],
  },
  {
    id: "seed-ind-aus-wtc-2023",
    name: "India vs Australia, Border-Gavaskar (archive)",
    series: "Border-Gavaskar Trophy 2022/23",
    status: "Match finished · Australia won by 9 wickets",
    venue: "Gabba, Brisbane",
    matchType: "test",
    dateTimeGMT: "2023-01-14T23:30:00.000Z",
    teams: ["India", "Australia"],
    score: [{ r: 289, w: 1, o: "50.0", inning: "Australia 2nd" }],
  },
  {
    id: "seed-upcoming-ipl-opener",
    name: "Mumbai Indians vs Chennai Super Kings, Match 1",
    series: "Indian Premier League 2026",
    status: "Match not started",
    venue: "Wankhede Stadium, Mumbai",
    matchType: "t20",
    dateTimeGMT: "2026-03-22T14:00:00.000Z",
    teams: ["Mumbai Indians", "Chennai Super Kings"],
    score: [],
  },
  {
    id: "seed-upcoming-ind-w-aus-w",
    name: "India Women vs Australia Women, 1st ODI",
    series: "Australia Women tour of India 2026",
    status: "Match not started",
    venue: "Wankhede Stadium, Mumbai",
    matchType: "odi",
    dateTimeGMT: "2026-09-15T04:00:00.000Z",
    teams: ["India Women", "Australia Women"],
    score: [],
  },
];

/**
 * Normalise a seed row via the same path as CricAPI, then retag provenance
 * so UI never confuses archive seeds with a live provider.
 */
export function normaliseSeedMatch(row: Record<string, unknown>): DomainMatch {
  const base = normaliseCricApiMatch(row);
  const lifecycle = mapLifecycle(typeof row.status === "string" ? row.status : undefined);
  // Hard guard: seed path never emits LIVE
  const safeLifecycle = lifecycle === "LIVE" ? "COMPLETED" : lifecycle;
  const freshness = lifecycleToFreshness(safeLifecycle);
  // Rows already use seed-* ids — avoid seed-seed-* doubling from slugId("seed", ...).
  const idRaw = String(row.id).replace(/^seed-/, "");
  const teams = Array.isArray(row.teams) ? row.teams.map(String) : [];
  const homeName = teams[0] ?? base.teams.home.name;
  const awayName = teams[1] ?? base.teams.away.name;

  const note = typeof row.status === "string" ? row.status : base.note;
  const withMeta: DomainMatch = {
    ...base,
    id: slugId("seed", idRaw),
    providerIds: { [SEED_PROVIDER]: idRaw, cricapi: idRaw },
    status: safeLifecycle,
    freshness: freshness === "LIVE" ? "HISTORICAL" : freshness,
    teams: teamFromNames(homeName, awayName, SEED_PROVIDER),
    note,
    resultText: note,
    provenance: {
      ...provenanceFor(
        SEED_PROVIDER,
        safeLifecycle === "COMPLETED" ? "historical" : safeLifecycle === "UPCOMING" ? "fact" : "historical",
        idRaw,
        "Seeded archive via normalisation path — not a live feed. Add CRICKETOS_DATA_API_KEY for provider data. Measured sample — not full 1973–present.",
      ),
      source: SEED_SOURCE,
      asOf:
        typeof row.dateTimeGMT === "string" ? row.dateTimeGMT : base.provenance.asOf,
    },
  };
  withMeta.coverage = deriveCoverage({
    status: withMeta.status,
    note: withMeta.note,
    score: withMeta.score,
    startTimeIso: withMeta.startTimeIso,
    title: withMeta.title,
    series: withMeta.series,
    homeName: withMeta.teams.home.name,
    awayName: withMeta.teams.away.name,
    battingRowCount: 0,
    bowlingRowCount: 0,
    ballCount: 0,
    isDemo: false,
  });
  return withMeta;
}

/**
 * Minimal scorecards for completed seeds — innings totals only.
 * Empty batting/bowling avoids inventing player rows; Explorer charts stay DEMO-only.
 */
export function seedScorecardFor(match: DomainMatch): DomainScorecard | null {
  if (match.status !== "COMPLETED" || !match.score) return null;
  const inningsId = `${match.id}-inn-1`;
  return {
    matchId: match.id,
    innings: [
      {
        id: inningsId,
        matchId: match.id,
        inningsNumber: 1,
        battingTeamId: match.teams.home.id,
        bowlingTeamId: match.teams.away.id,
        score: {
          runs: match.score.runs,
          wickets: match.score.wickets,
          overs: match.score.overs,
        },
        extras: { total: 0 },
      },
    ],
    batting: { [inningsId]: [] },
    bowling: { [inningsId]: [] },
  };
}

export type SeedBundle = {
  matches: DomainMatch[];
  scorecards: DomainScorecard[];
  fixtures: DomainFixtureListItem[];
};

/** Build + quality-check the full seed set. Skips rows that fail invariants. */
export function buildSeedBundle(): SeedBundle {
  const matches: DomainMatch[] = [];
  const scorecards: DomainScorecard[] = [];

  for (const row of SEED_CRICAPI_ROWS) {
    const match = normaliseSeedMatch(row);
    if (match.freshness === "LIVE" || match.status === "LIVE") {
      // Absolute honesty guard
      continue;
    }
    const quality = runQualityChecks({ match });
    if (!quality.ok) continue;
    matches.push(match);
    const card = seedScorecardFor(match);
    if (card) {
      const cq = runQualityChecks({ scorecard: card });
      if (cq.ok) scorecards.push(card);
    }
  }

  return {
    matches,
    scorecards,
    fixtures: matches.map(toFixtureItem),
  };
}

export function listSeedFixtures(): DomainFixtureListItem[] {
  return buildSeedBundle().fixtures;
}
