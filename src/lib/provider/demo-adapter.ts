/**
 * Demo adapter — bundled Lord’s dataset only.
 * Never reports LIVE freshness.
 */

import { matchMeta } from "@/lib/data";
import type {
  DomainBall,
  DomainFixtureListItem,
  DomainMatch,
  DomainPlayer,
  DomainScorecard,
} from "@/lib/domain/models";
import { emptyScorecard, toFixtureItem } from "@/lib/ingestion/normalise";
import { explorerInnings } from "@/lib/innings";
import { players } from "@/lib/data";
import type {
  AdapterHealth,
  AdapterResult,
  CricketDataAdapter,
  ListFixturesParams,
  ListPlayersParams,
} from "@/lib/provider/types";

function demoMatch(): DomainMatch {
  return {
    id: matchMeta.id,
    providerIds: { demo: matchMeta.id },
    status: "DEMO",
    freshness: "DEMO",
    title: matchMeta.title,
    venue: matchMeta.venue,
    series: matchMeta.series,
    format: "test",
    teams: {
      home: {
        id: "team-england",
        providerIds: { demo: "england" },
        name: "England",
        shortName: "ENG",
      },
      away: {
        id: "team-india",
        providerIds: { demo: "india" },
        name: "India",
        shortName: "IND",
      },
    },
    score: {
      runs: matchMeta.score.runs,
      wickets: matchMeta.score.wickets,
      overs: matchMeta.score.overs,
    },
    note: matchMeta.dayLabel,
    provenance: { ...matchMeta.provenance, provider: "demo", providerEntityId: matchMeta.id },
    updatedAt: new Date().toISOString(),
  };
}

function demoScorecard(): DomainScorecard {
  const match = demoMatch();
  const inningsId = "eng-1";
  return {
    matchId: match.id,
    innings: [
      {
        id: inningsId,
        matchId: match.id,
        inningsNumber: 1,
        battingTeamId: "team-england",
        bowlingTeamId: "team-india",
        score: {
          runs: matchMeta.score.runs,
          wickets: matchMeta.score.wickets,
          overs: matchMeta.score.overs,
        },
        // Batting rows below sum to 245; extras 0 so score reconciles (no fabricated extras).
        extras: { total: 0 },
      },
    ],
    batting: {
      [inningsId]: [
        {
          playerId: "zak-crawley",
          playerName: "Zak Crawley",
          runs: 18,
          balls: 24,
          fours: 2,
          sixes: 0,
          dismissal: "c Jaiswal b Bumrah",
        },
        {
          playerId: "ben-duckett",
          playerName: "Ben Duckett",
          runs: 41,
          balls: 55,
          fours: 5,
          sixes: 0,
          dismissal: "lbw b Bumrah",
        },
        {
          playerId: "ollie-pope",
          playerName: "Ollie Pope",
          runs: 22,
          balls: 31,
          fours: 2,
          sixes: 0,
          dismissal: "c Rahul b Jadeja",
        },
        {
          playerId: "joe-root",
          playerName: "Joe Root",
          runs: 89,
          balls: 112,
          fours: 8,
          sixes: 0,
          notOut: true,
        },
        {
          playerId: "harry-brook",
          playerName: "Harry Brook",
          runs: 64,
          balls: 78,
          fours: 7,
          sixes: 1,
          dismissal: "c Pant b Kuldeep",
        },
        {
          playerId: "ben-stokes",
          playerName: "Ben Stokes",
          runs: 11,
          balls: 10,
          fours: 1,
          sixes: 0,
          notOut: true,
        },
      ],
    },
    bowling: {
      [inningsId]: [
        {
          playerId: "jasprit-bumrah",
          playerName: "Jasprit Bumrah",
          overs: "14.0",
          maidens: 3,
          runs: 42,
          wickets: 2,
        },
        {
          playerId: "ravindra-jadeja",
          playerName: "Ravindra Jadeja",
          overs: "12.0",
          maidens: 1,
          runs: 48,
          wickets: 1,
        },
        {
          playerId: "kuldeep-yadav",
          playerName: "Kuldeep Yadav",
          overs: "10.0",
          maidens: 0,
          runs: 51,
          wickets: 1,
        },
      ],
    },
  };
}

/** Approximate balls from Explorer over buckets — labelled DEMO. */
function demoBalls(): DomainBall[] {
  const series = explorerInnings[0];
  if (!series) return [];
  const balls: DomainBall[] = [];
  let idx = 0;
  for (const over of series.overs) {
    const legal = over.balls;
    const base = Math.floor(over.runs / Math.max(1, legal));
    let allocated = 0;
    for (let b = 1; b <= legal; b++) {
      idx += 1;
      const isLast = b === legal;
      const runs = isLast ? over.runs - allocated : base;
      allocated += isLast ? 0 : base;
      const wicketEvent = over.events.find((e) => e.kind === "wicket" && e.ball === b);
      balls.push({
        id: `demo-ball-${idx}`,
        matchId: matchMeta.id,
        inningsId: series.meta.id,
        overNumber: over.overNumber,
        ballInOver: b,
        runsOffBat: runs,
        extras: 0,
        totalRuns: runs,
        isWicket: Boolean(wicketEvent) || (isLast && over.wickets > 0 && b === legal && over.wickets > 0),
        isFour: over.events.some((e) => e.kind === "four" && e.ball === b),
        isSix: over.events.some((e) => e.kind === "six" && e.ball === b),
        dismissalText: wicketEvent?.label,
      });
    }
  }
  return balls;
}

export class DemoAdapter implements CricketDataAdapter {
  readonly id = "demo" as const;

  async health(): Promise<AdapterHealth> {
    return {
      provider: "demo",
      ok: true,
      message: "DEMO dataset loaded — not a live feed",
      checkedAt: new Date().toISOString(),
    };
  }

  async listFixtures(params?: ListFixturesParams): Promise<AdapterResult<DomainFixtureListItem[]>> {
    const limit = params?.limit ?? 1;
    return { ok: true, data: [toFixtureItem(demoMatch())].slice(0, limit) };
  }

  async getMatch(id: string): Promise<AdapterResult<DomainMatch>> {
    const m = demoMatch();
    if (id !== m.id && id !== "demo") {
      return { ok: false, error: `Demo adapter only serves ${m.id}` };
    }
    return { ok: true, data: m };
  }

  async getScorecard(matchId: string): Promise<AdapterResult<DomainScorecard>> {
    if (matchId !== matchMeta.id && matchId !== "demo") {
      return { ok: true, data: emptyScorecard(matchId) };
    }
    return { ok: true, data: demoScorecard() };
  }

  async getBallByBall(matchId: string): Promise<AdapterResult<DomainBall[]>> {
    if (matchId !== matchMeta.id && matchId !== "demo") {
      return { ok: true, data: [] };
    }
    return { ok: true, data: demoBalls() };
  }

  async listPlayers(params?: ListPlayersParams): Promise<AdapterResult<DomainPlayer[]>> {
    const q = params?.search?.toLowerCase().trim();
    let list = players.slice(0, params?.limit ?? 50).map((p) => ({
      id: p.id,
      providerIds: { demo: p.id },
      name: p.name,
      teamId: p.teamId,
      role: p.role,
    }));
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    return { ok: true, data: list };
  }

  async listHistorical(params?: ListFixturesParams): Promise<AdapterResult<DomainFixtureListItem[]>> {
    return this.listFixtures(params);
  }
}

export function getDemoMatch(): DomainMatch {
  return demoMatch();
}

export function getDemoScorecard(): DomainScorecard {
  return demoScorecard();
}
