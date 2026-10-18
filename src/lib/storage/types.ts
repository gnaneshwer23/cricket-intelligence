import type { FreshnessStatus } from "@/lib/contracts";
import type {
  DomainBall,
  DomainMatch,
  DomainPlayer,
  DomainScorecard,
  HistoricalMatchFilter,
  IngestionRunRecord,
} from "@/lib/domain/models";

/**
 * Persistence interface.
 * `memory` is for local/dev/CI — NOT production durable storage.
 * `postgres` is durable (DATABASE_URL + `npm run db:migrate`).
 */
export type StorageBackendKind = "memory" | "postgres";

export type StorageStats = {
  matchCount: number;
  playerCount: number;
  freshnessCounts: Partial<Record<FreshnessStatus, number>>;
};

export type StorageMatchSearch = {
  matches: DomainMatch[];
  total: number;
  yearMin?: number;
  yearMax?: number;
};

export type MatchPlayerRow = {
  playerId: string;
  playerName: string;
  teamName?: string;
};

export interface CricketStorage {
  readonly kind: StorageBackendKind;
  /** Human-readable honesty label for operators */
  readonly label: string;

  upsertMatch(match: DomainMatch): Promise<void>;
  getMatch(id: string): Promise<DomainMatch | null>;
  /** Full scan — memory/dev only. Durable backends should use searchMatches. */
  listMatches(): Promise<DomainMatch[]>;

  upsertScorecard(card: DomainScorecard): Promise<void>;
  getScorecard(matchId: string): Promise<DomainScorecard | null>;

  upsertBalls(matchId: string, balls: DomainBall[]): Promise<void>;
  getBalls(matchId: string): Promise<DomainBall[]>;

  upsertPlayer(player: DomainPlayer): Promise<void>;
  getPlayer(id: string): Promise<DomainPlayer | null>;
  listPlayers(): Promise<DomainPlayer[]>;

  recordIngestionRun(run: IngestionRunRecord): Promise<void>;
  latestIngestionRun(): Promise<IngestionRunRecord | null>;
  listIngestionRuns(limit?: number): Promise<IngestionRunRecord[]>;

  /** Cheap counts for health — must not load every row. */
  stats(): Promise<StorageStats>;

  /**
   * Filtered + paginated search pushed down to the backend.
   * When absent, services filter `listMatches()` in process (memory backend).
   */
  searchMatches?(filter: HistoricalMatchFilter): Promise<StorageMatchSearch>;
  /** Batch player upsert (ingest hot path). */
  upsertPlayers?(players: DomainPlayer[]): Promise<void>;
  /** Squad / appearance rows for player filters. */
  upsertMatchPlayers?(matchId: string, rows: MatchPlayerRow[]): Promise<void>;
  /** Match ids a player appeared in (from squads or scorecard rows). */
  matchIdsForPlayer?(playerId: string): Promise<string[]>;
  close?(): Promise<void>;
}
