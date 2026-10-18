/**
 * Cricsheet (https://cricsheet.org) JSON → CricketOS domain entities.
 *
 * Cricsheet data is licensed under ODC-By 1.0: commercial use is allowed,
 * attribution is required. Every entity carries provider "cricsheet".
 *
 * Conventions: `overNumber` is 0-based as in Cricsheet (0.1 = first ball);
 * `ballInOver` is the 1-based delivery sequence within the over, so wides and
 * no-balls get their own slot (an over can have more than six deliveries).
 */

import { deriveCoverage, type GenderFilter } from "@/lib/coverage";
import type { Provenance } from "@/lib/contracts";
import type {
  CricketFormat,
  DomainBall,
  DomainBattingCardRow,
  DomainBowlingCardRow,
  DomainInningsSummary,
  DomainMatch,
  DomainPlayer,
  DomainScorecard,
  QualityReport,
} from "@/lib/domain/models";
import { slugId, teamFromNames } from "@/lib/ingestion/normalise";
import { runQualityChecks } from "@/lib/ingestion/quality";
import type { MatchPlayerRow } from "@/lib/storage/types";

export const CRICSHEET_PROVIDER = "cricsheet";
export const CRICSHEET_SOURCE = "Cricsheet (cricsheet.org) · ODC-By 1.0";

// ── Raw Cricsheet shapes (subset we read) ──────────────────────────────────

type CsRuns = { batter: number; extras: number; total: number; non_boundary?: boolean };
type CsExtras = { wides?: number; noballs?: number; byes?: number; legbyes?: number; penalty?: number };
type CsWicket = { player_out: string; kind: string; fielders?: { name?: string; substitute?: boolean }[] };
type CsDelivery = {
  batter: string;
  bowler: string;
  non_striker: string;
  runs: CsRuns;
  extras?: CsExtras;
  wickets?: CsWicket[];
};
type CsOver = { over: number; deliveries: CsDelivery[] };
type CsInnings = {
  team: string;
  overs?: CsOver[];
  declared?: boolean;
  forfeited?: boolean;
  super_over?: boolean;
  penalty_runs?: { pre?: number; post?: number };
};
type CsOutcome = {
  winner?: string;
  by?: { runs?: number; wickets?: number; innings?: number };
  result?: string;
  eliminator?: string;
  method?: string;
};
export type CricsheetMatch = {
  meta?: { data_version?: string; created?: string; revision?: number };
  info: {
    balls_per_over?: number;
    city?: string;
    dates: string[];
    event?: { name?: string; match_number?: number; stage?: string; group?: string };
    gender?: string;
    match_type: string;
    outcome?: CsOutcome;
    players?: Record<string, string[]>;
    registry?: { people?: Record<string, string> };
    season?: string | number;
    team_type?: string;
    teams: string[];
    venue?: string;
  };
  innings?: CsInnings[];
};

export type CricsheetBundle = {
  match: DomainMatch;
  scorecard: DomainScorecard;
  balls: DomainBall[];
  players: DomainPlayer[];
  appearances: MatchPlayerRow[];
  quality: QualityReport;
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Dismissals that count against the batting side's wickets. */
const NOT_A_WICKET = new Set(["retired hurt", "retired not out"]);
/** Dismissals credited to the bowler. */
const BOWLER_WICKETS = new Set([
  "bowled",
  "caught",
  "caught and bowled",
  "lbw",
  "stumped",
  "hit wicket",
]);

export function mapCricsheetFormat(matchType: string): CricketFormat {
  switch (matchType) {
    case "Test":
      return "test";
    case "ODI":
      return "odi";
    case "T20":
    case "IT20":
      return "t20";
    default:
      // ODM (one-day non-international) / MDM (multi-day non-Test) stay out of
      // Test/ODI aggregates; the raw type is kept in provenance.
      return "other";
  }
}

function mapGender(raw?: string): GenderFilter {
  if (raw === "female") return "women";
  if (raw === "male") return "men";
  return "unknown";
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function cricsheetResultText(outcome?: CsOutcome): string | undefined {
  if (!outcome) return undefined;
  const method = outcome.method ? ` (${outcome.method})` : "";
  if (outcome.winner) {
    const by = outcome.by ?? {};
    if (by.innings && by.runs != null) {
      return `${outcome.winner} won by an innings and ${plural(by.runs, "run")}${method}`;
    }
    if (by.runs != null) return `${outcome.winner} won by ${plural(by.runs, "run")}${method}`;
    if (by.wickets != null) return `${outcome.winner} won by ${plural(by.wickets, "wicket")}${method}`;
    return `${outcome.winner} won${method}`;
  }
  switch (outcome.result) {
    case "draw":
      return "Match drawn";
    case "tie":
      return outcome.eliminator
        ? `Match tied (${outcome.eliminator} won the eliminator)`
        : "Match tied";
    case "no result":
      return "No result";
    default:
      return outcome.result;
  }
}

function oversString(legalBalls: number, ballsPerOver: number): string {
  return `${Math.floor(legalBalls / ballsPerOver)}.${legalBalls % ballsPerOver}`;
}

function dismissalText(w: CsWicket, bowler: string): string {
  const fielder = w.fielders?.find((f) => f.name)?.name;
  switch (w.kind) {
    case "bowled":
      return `b ${bowler}`;
    case "caught":
      return fielder ? `c ${fielder} b ${bowler}` : `c ? b ${bowler}`;
    case "caught and bowled":
      return `c & b ${bowler}`;
    case "lbw":
      return `lbw b ${bowler}`;
    case "stumped":
      return fielder ? `st ${fielder} b ${bowler}` : `st b ${bowler}`;
    case "hit wicket":
      return `hit wicket b ${bowler}`;
    case "run out":
      return fielder ? `run out (${fielder})` : "run out";
    default:
      return w.kind;
  }
}

// ── Parser ─────────────────────────────────────────────────────────────────

/**
 * Parse one Cricsheet match. `cricsheetId` is the file stem (e.g. "1359475").
 * Throws on structurally invalid input; data-quality issues go in `quality`.
 */
export function parseCricsheetMatch(raw: unknown, cricsheetId: string): CricsheetBundle {
  const cs = raw as CricsheetMatch;
  if (!cs?.info || !Array.isArray(cs.info.teams) || cs.info.teams.length < 2) {
    throw new Error(`cricsheet ${cricsheetId}: missing info.teams`);
  }
  if (!Array.isArray(cs.info.dates) || !cs.info.dates.length) {
    throw new Error(`cricsheet ${cricsheetId}: missing info.dates`);
  }

  const info = cs.info;
  const matchId = `cs-${cricsheetId}`;
  const ballsPerOver = info.balls_per_over ?? 6;
  const registry = info.registry?.people ?? {};
  const playerId = (name: string) =>
    registry[name] ? `cs-${registry[name]}` : slugId("player", name);
  const [homeName, awayName] = [info.teams[0]!, info.teams[1]!];
  const gender = mapGender(info.gender);
  const nowIso = new Date().toISOString();

  // ── Players + squads
  const players = new Map<string, DomainPlayer>();
  const appearances: MatchPlayerRow[] = [];
  for (const [team, names] of Object.entries(info.players ?? {})) {
    for (const name of names) {
      const id = playerId(name);
      appearances.push({ playerId: id, playerName: name, teamName: team });
      players.set(id, {
        id,
        providerIds: registry[name] ? { [CRICSHEET_PROVIDER]: registry[name] } : {},
        name,
      });
    }
  }

  // ── Innings, balls, scorecard
  const innings: DomainInningsSummary[] = [];
  const batting: Record<string, DomainBattingCardRow[]> = {};
  const bowling: Record<string, DomainBowlingCardRow[]> = {};
  const balls: DomainBall[] = [];
  const ballChecks: { balls: DomainBall[]; runs: number; wickets: number }[] = [];

  (cs.innings ?? []).forEach((inn, idx) => {
    const inningsNumber = idx + 1;
    const inningsId = `${matchId}-inn-${inningsNumber}`;
    const bowlingTeam = inn.team === homeName ? awayName : homeName;

    const bat = new Map<string, DomainBattingCardRow>();
    const bowl = new Map<
      string,
      { row: DomainBowlingCardRow; legal: number; overRuns: Map<number, { runs: number; legal: number }> }
    >();
    const touchBatter = (name: string) => {
      if (!players.has(playerId(name))) {
        players.set(playerId(name), { id: playerId(name), providerIds: {}, name });
      }
      if (!bat.has(name)) {
        bat.set(name, {
          playerId: playerId(name),
          playerName: name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          notOut: true,
        });
      }
      return bat.get(name)!;
    };
    const touchBowler = (name: string) => {
      if (!bowl.has(name)) {
        bowl.set(name, {
          row: { playerId: playerId(name), playerName: name, overs: "0.0", maidens: 0, runs: 0, wickets: 0 },
          legal: 0,
          overRuns: new Map(),
        });
      }
      return bowl.get(name)!;
    };

    let runs = 0;
    let wickets = 0;
    let legalBalls = 0;
    const extras = { total: 0, byes: 0, legByes: 0, wides: 0, noBalls: 0, penalties: 0 };
    const innBalls: DomainBall[] = [];

    for (const over of inn.overs ?? []) {
      over.deliveries.forEach((d, dIdx) => {
        const e = d.extras ?? {};
        const isWide = Boolean(e.wides);
        const isNoBall = Boolean(e.noballs);
        const legal = !isWide && !isNoBall;

        const striker = touchBatter(d.batter);
        touchBatter(d.non_striker);
        const bowler = touchBowler(d.bowler);

        striker.runs += d.runs.batter;
        if (!isWide) striker.balls += 1;
        if (!d.runs.non_boundary) {
          if (d.runs.batter === 4) striker.fours += 1;
          if (d.runs.batter === 6) striker.sixes += 1;
        }

        // Byes, leg-byes and penalties are not charged to the bowler.
        const conceded = d.runs.batter + (e.wides ?? 0) + (e.noballs ?? 0);
        bowler.row.runs += conceded;
        const ov = bowler.overRuns.get(over.over) ?? { runs: 0, legal: 0 };
        ov.runs += conceded;
        if (legal) {
          bowler.legal += 1;
          ov.legal += 1;
          legalBalls += 1;
        }
        bowler.overRuns.set(over.over, ov);

        extras.byes += e.byes ?? 0;
        extras.legByes += e.legbyes ?? 0;
        extras.wides += e.wides ?? 0;
        extras.noBalls += e.noballs ?? 0;
        extras.penalties += e.penalty ?? 0;
        extras.total += d.runs.extras;
        runs += d.runs.total;

        let deliveryWickets = 0;
        for (const w of d.wickets ?? []) {
          const out = touchBatter(w.player_out);
          out.dismissal = dismissalText(w, d.bowler);
          out.notOut = NOT_A_WICKET.has(w.kind);
          if (!NOT_A_WICKET.has(w.kind)) {
            wickets += 1;
            deliveryWickets += 1;
          }
          if (BOWLER_WICKETS.has(w.kind)) bowler.row.wickets += 1;
        }

        const first = d.wickets?.[0];
        innBalls.push({
          id: `${inningsId}-o${over.over}-d${dIdx + 1}`,
          matchId,
          inningsId,
          inningsNumber,
          battingTeam: inn.team,
          overNumber: over.over,
          ballInOver: dIdx + 1,
          batsmanId: playerId(d.batter),
          bowlerId: playerId(d.bowler),
          nonStrikerId: playerId(d.non_striker),
          runsOffBat: d.runs.batter,
          extras: d.runs.extras,
          totalRuns: d.runs.total,
          isWicket: deliveryWickets > 0,
          isWide,
          isNoBall,
          isFour: d.runs.batter === 4 && !d.runs.non_boundary,
          isSix: d.runs.batter === 6 && !d.runs.non_boundary,
          wicketKind: first?.kind,
          playerOutId: first ? playerId(first.player_out) : undefined,
          dismissalText: first ? `${first.player_out} ${dismissalText(first, d.bowler)}` : undefined,
        });
      });
    }

    balls.push(...innBalls);
    ballChecks.push({ balls: innBalls, runs, wickets });

    // Super overs keep their deliveries but stay out of the scorecard and match score.
    if (inn.super_over) return;

    const penaltyRuns = (inn.penalty_runs?.pre ?? 0) + (inn.penalty_runs?.post ?? 0);
    extras.penalties += penaltyRuns;
    extras.total += penaltyRuns;

    for (const b of bowl.values()) {
      b.row.overs = oversString(b.legal, ballsPerOver);
      b.row.maidens = [...b.overRuns.values()].filter(
        (o) => o.legal === ballsPerOver && o.runs === 0,
      ).length;
    }

    innings.push({
      id: inningsId,
      matchId,
      inningsNumber,
      battingTeamId: slugId("team", inn.team),
      bowlingTeamId: slugId("team", bowlingTeam),
      score: {
        runs: runs + penaltyRuns,
        wickets,
        overs: oversString(legalBalls, ballsPerOver),
        balls: legalBalls,
      },
      declared: inn.declared || undefined,
      extras,
    });
    batting[inningsId] = [...bat.values()];
    bowling[inningsId] = [...bowl.values()].map((b) => b.row);
  });

  // ── Match
  const resultText = cricsheetResultText(info.outcome);
  const startTimeIso = `${info.dates[0]}T00:00:00.000Z`;
  const eventName = info.event?.name;
  const season = info.season != null ? String(info.season) : undefined;
  const series = eventName
    ? season && !eventName.includes(season)
      ? `${eventName} ${season}`
      : eventName
    : undefined;
  const fixtureLabel = info.event?.match_number
    ? `Match ${info.event.match_number}`
    : info.event?.stage;
  const title =
    `${homeName} vs ${awayName}` +
    (fixtureLabel ? `, ${fixtureLabel}` : "") +
    (gender === "women" ? " (Women)" : "");
  const venue =
    info.venue && info.city && !info.venue.includes(info.city)
      ? `${info.venue}, ${info.city}`
      : (info.venue ?? info.city ?? "Unknown venue");
  const lastInnings = innings[innings.length - 1];

  const scorecard: DomainScorecard = { matchId, innings, batting, bowling };
  const battingRowCount = Object.values(batting).reduce((n, r) => n + r.length, 0);
  const bowlingRowCount = Object.values(bowling).reduce((n, r) => n + r.length, 0);

  const provenance: Provenance = {
    kind: "historical",
    source: CRICSHEET_SOURCE,
    asOf: cs.meta?.created ? `${cs.meta.created}T00:00:00.000Z` : nowIso,
    provider: CRICSHEET_PROVIDER,
    providerEntityId: cricsheetId,
    note: `Ball-by-ball from Cricsheet (${info.match_type}${info.team_type ? `, ${info.team_type}` : ""}). Attribution: cricsheet.org.`,
  };

  const match: DomainMatch = {
    id: matchId,
    providerIds: { [CRICSHEET_PROVIDER]: cricsheetId },
    status: "COMPLETED",
    freshness: "HISTORICAL",
    title,
    venue,
    series,
    format: mapCricsheetFormat(info.match_type),
    startTimeIso,
    teams: teamFromNames(homeName, awayName, CRICSHEET_PROVIDER),
    score: lastInnings?.score,
    note: resultText,
    resultText,
    provenance,
    updatedAt: nowIso,
    coverage: {
      ...deriveCoverage({
        status: "COMPLETED",
        note: resultText,
        score: lastInnings?.score,
        startTimeIso,
        title,
        series,
        homeName,
        awayName,
        battingRowCount,
        bowlingRowCount,
        ballCount: balls.length,
      }),
      gender,
    },
  };

  // ── Quality: card reconciles to innings totals; balls reconcile per innings.
  const reports = [
    runQualityChecks({ match, scorecard }),
    ...ballChecks.map((c) =>
      runQualityChecks({ balls: c.balls, expectedBallRuns: c.runs, expectedBallWickets: c.wickets }),
    ),
  ];
  const issues = reports.flatMap((r) => r.issues);
  const quality: QualityReport = {
    ok: !issues.some((i) => i.severity === "error"),
    issues,
    checkedAt: nowIso,
  };

  return { match, scorecard, balls, players: [...players.values()], appearances, quality };
}
