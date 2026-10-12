import type {
  DomainBall,
  DomainMatch,
  DomainPlayer,
  DomainScorecard,
  IngestionRunRecord,
} from "@/lib/domain/models";

/**
 * Persistence interface.
 * `memory` is for local/dev/CI — NOT production durable storage.
 * `postgres` adapter is scaffolding until DATABASE_URL + migrations are available.
 */
export type StorageBackendKind = "memory" | "postgres";

export interface CricketStorage {
  readonly kind: StorageBackendKind;
  /** Human-readable honesty label for operators */
  readonly label: string;

  upsertMatch(match: DomainMatch): Promise<void>;
  getMatch(id: string): Promise<DomainMatch | null>;
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
}
