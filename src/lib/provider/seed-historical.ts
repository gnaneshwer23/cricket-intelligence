/**
 * Seeded historical + upcoming fixtures for offline / no-key mode.
 * Raw rows use the same CricAPI-shaped shape as the live adapter, then pass
 * through normaliseCricApiMatch — never fabricated LIVE freshness.
 *
 * Scores are well-known public completed results used as an archive for
 * Explorer / Copilot when no provider key is configured.
 */

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

/** CricAPI-shaped raw match rows (completed / upcoming only). */
export const SEED_CRICAPI_ROWS: Record<string, unknown>[] = [
  {
    id: "seed-headingley-2019",
    name: "England vs Australia, 3rd Test",
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
    status: "Match not started",
    venue: "Centurion",
    matchType: "test",
    dateTimeGMT: "2026-12-11T08:00:00.000Z",
    teams: ["Australia", "South Africa"],
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
  const idRaw = String(row.id);
  const teams = Array.isArray(row.teams) ? row.teams.map(String) : [];
  const homeName = teams[0] ?? base.teams.home.name;
  const awayName = teams[1] ?? base.teams.away.name;

  return {
    ...base,
    id: slugId("seed", idRaw),
    providerIds: { [SEED_PROVIDER]: idRaw, cricapi: idRaw },
    status: safeLifecycle,
    freshness: freshness === "LIVE" ? "HISTORICAL" : freshness,
    teams: teamFromNames(homeName, awayName, SEED_PROVIDER),
    provenance: {
      ...provenanceFor(
        SEED_PROVIDER,
        safeLifecycle === "COMPLETED" ? "historical" : safeLifecycle === "UPCOMING" ? "fact" : "historical",
        idRaw,
        "Seeded archive via normalisation path — not a live feed. Add CRICKETOS_DATA_API_KEY for provider data.",
      ),
      source: SEED_SOURCE,
      asOf:
        typeof row.dateTimeGMT === "string" ? row.dateTimeGMT : base.provenance.asOf,
    },
  };
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
