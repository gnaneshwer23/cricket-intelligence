/**
 * Shared adapter operations — provider-independent contract.
 * Provider → adapter → validate → normalise → quality → storage → domain → UI
 */

import type {
  DomainBall,
  DomainFixtureListItem,
  DomainMatch,
  DomainPlayer,
  DomainScorecard,
} from "@/lib/domain/models";
import type { DataProviderId } from "@/lib/provider/config";

export type AdapterHealth = {
  provider: DataProviderId;
  ok: boolean;
  /** Never claim LIVE unless ok + credentials + successful probe */
  message: string;
  checkedAt: string;
};

export type ListFixturesParams = {
  offset?: number;
  limit?: number;
  /** Provider-specific series/league filter when supported */
  seriesId?: string;
};

export type ListPlayersParams = {
  search?: string;
  offset?: number;
  limit?: number;
};

export type AdapterResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  /** Raw payload retained for tests only — never send to client */
  raw?: unknown;
};

/**
 * All adapters implement this surface. Unsupported ops return ok:false with a clear error.
 */
export interface CricketDataAdapter {
  readonly id: DataProviderId;

  health(): Promise<AdapterHealth>;

  listFixtures(params?: ListFixturesParams): Promise<AdapterResult<DomainFixtureListItem[]>>;

  getMatch(id: string): Promise<AdapterResult<DomainMatch>>;

  getScorecard(matchId: string): Promise<AdapterResult<DomainScorecard>>;

  /** Ball-by-ball when the provider supports it for this match. */
  getBallByBall(matchId: string): Promise<AdapterResult<DomainBall[]>>;

  listPlayers(params?: ListPlayersParams): Promise<AdapterResult<DomainPlayer[]>>;

  /** Historical fixture search — may alias listFixtures with filters. */
  listHistorical(params?: ListFixturesParams): Promise<AdapterResult<DomainFixtureListItem[]>>;
}
