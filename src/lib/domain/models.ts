/**
 * Normalised domain models after provider → validate → normalise.
 * UI and calc layers consume these — never raw provider payloads.
 */

import type { CoverageLevel, CoverageMeta, GenderFilter } from "@/lib/coverage";
import type { DataKind, FreshnessStatus, MatchLifecycle, Provenance } from "@/lib/contracts";

export type CricketFormat = "test" | "odi" | "t20" | "other";
export type { CoverageLevel, CoverageMeta, GenderFilter };

export type DomainTeam = {
  id: string;
  providerIds: Record<string, string>;
  name: string;
  shortName: string;
};

export type DomainPlayer = {
  id: string;
  providerIds: Record<string, string>;
  name: string;
  teamId?: string;
  role?: string;
};

export type DomainScore = {
  runs: number;
  wickets: number;
  /** Cricket overs string e.g. "48.2" */
  overs: string;
  balls?: number;
};

export type DomainInningsSummary = {
  id: string;
  matchId: string;
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  score: DomainScore;
  declared?: boolean;
  followOn?: boolean;
  extras?: {
    total: number;
    byes?: number;
    legByes?: number;
    wides?: number;
    noBalls?: number;
    penalties?: number;
  };
};

export type DomainBall = {
  id: string;
  matchId: string;
  inningsId: string;
  overNumber: number;
  ballInOver: number;
  batsmanId?: string;
  bowlerId?: string;
  runsOffBat: number;
  extras: number;
  totalRuns: number;
  isWicket: boolean;
  isWide?: boolean;
  isNoBall?: boolean;
  isFour?: boolean;
  isSix?: boolean;
  dismissalText?: string;
  commentary?: string;
};

export type DomainBattingCardRow = {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dismissal?: string;
  notOut?: boolean;
};

export type DomainBowlingCardRow = {
  playerId: string;
  playerName: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
};

export type DomainScorecard = {
  matchId: string;
  innings: DomainInningsSummary[];
  batting: Record<string, DomainBattingCardRow[]>;
  bowling: Record<string, DomainBowlingCardRow[]>;
};

export type DomainMatch = {
  id: string;
  providerIds: Record<string, string>;
  status: MatchLifecycle;
  freshness: FreshnessStatus;
  title: string;
  venue: string;
  series?: string;
  format: CricketFormat;
  startTimeIso?: string;
  teams: { home: DomainTeam; away: DomainTeam };
  score?: DomainScore;
  note?: string;
  provenance: Provenance;
  updatedAt: string;
  /** Measured coverage depth — never invent deeper layers. */
  coverage?: CoverageMeta;
  /** Free-text result line when known (e.g. statusLine from provider/seed). */
  resultText?: string;
};

export type DomainFixtureListItem = Pick<
  DomainMatch,
  "id" | "title" | "status" | "freshness" | "venue" | "series" | "format" | "startTimeIso" | "provenance" | "updatedAt" | "note" | "score"
> & {
  homeName: string;
  awayName: string;
  homeShort: string;
  awayShort: string;
};

export type QualityIssue = {
  code: string;
  severity: "error" | "warn";
  message: string;
  path?: string;
};

export type QualityReport = {
  ok: boolean;
  issues: QualityIssue[];
  checkedAt: string;
};

export type IngestionRunStatus = "running" | "success" | "partial" | "failed";

export type IngestionRunRecord = {
  id: string;
  provider: string;
  operation: string;
  status: IngestionRunStatus;
  startedAt: string;
  finishedAt?: string;
  fetched: number;
  upserted: number;
  skipped: number;
  errors: string[];
  /** Never include secrets */
  notes?: string;
};

export type OperatorHealthSummary = {
  demoMode: boolean;
  dataProvider: string;
  dataApiKeyConfigured: boolean;
  llmEnabled: boolean;
  storageBackend: "memory" | "postgres";
  storageLabel: string;
  lastIngestion?: IngestionRunRecord | null;
  freshnessCounts: Partial<Record<FreshnessStatus, number>>;
  matchCount: number;
  playerCount: number;
  asOf: string;
};

export type HistoricalMatchFilter = {
  teamId?: string;
  /** Free-text team name / short match (home or away). */
  teamContains?: string;
  format?: CricketFormat;
  venueContains?: string;
  seriesContains?: string;
  /** Player name fragment — matched against scorecard batting/bowling when present. */
  playerContains?: string;
  /** Competition / series fragment (alias of seriesContains). */
  competitionContains?: string;
  /** Result text fragment (won by / draw / etc.). */
  resultContains?: string;
  gender?: GenderFilter;
  /** Inclusive calendar year bounds (from startTimeIso). */
  yearFrom?: number;
  yearTo?: number;
  coverageLevel?: CoverageLevel;
  /** Minimum coverage depth (result < scorecard < innings < ball_by_ball). */
  coverageAtLeast?: CoverageLevel;
  fromIso?: string;
  toIso?: string;
  freshness?: FreshnessStatus[];
  /** 0-based page for pagination. */
  page?: number;
  limit?: number;
};

export type HistoricalSearchResult = {
  matches: DomainMatch[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  /** Honest archive window for UI. */
  archiveClaim: string;
  measuredYearMin?: number;
  measuredYearMax?: number;
};

export type PlayerTrendPoint = {
  matchId: string;
  matchTitle: string;
  runs?: number;
  balls?: number;
  wickets?: number;
  asOf: string;
  kind: DataKind;
};

export type PlayerTrend = {
  playerId: string;
  playerName: string;
  sampleSize: number;
  points: PlayerTrendPoint[];
  warning?: string;
};
