import type {
  DomainBall,
  DomainMatch,
  DomainPlayer,
  DomainScorecard,
  IngestionRunRecord,
} from "@/lib/domain/models";
import { MemoryStorage } from "@/lib/storage/memory";
import type { CricketStorage } from "@/lib/storage/types";

/**
 * Postgres-backed storage — scaffolding only.
 * When DATABASE_URL is missing or migrations are not applied, callers must
 * use MemoryStorage. This class throws on use if not implemented against a live DB.
 *
 * Migrations live in `docs/migrations/001_cricketos.sql` (apply manually when credentials allow).
 */
export class PostgresStorageUnavailable implements CricketStorage {
  readonly kind = "postgres" as const;
  readonly label =
    "Postgres requested but unavailable — use memory until DATABASE_URL + migrations are applied";

  private fail(): never {
    throw new Error(
      "Postgres storage not connected. Apply docs/migrations/001_cricketos.sql with DATABASE_URL, or set CRICKETOS_STORAGE_BACKEND=memory.",
    );
  }

  async upsertMatch(): Promise<void> {
    this.fail();
  }
  async getMatch(): Promise<DomainMatch | null> {
    this.fail();
  }
  async listMatches(): Promise<DomainMatch[]> {
    this.fail();
  }
  async upsertScorecard(): Promise<void> {
    this.fail();
  }
  async getScorecard(): Promise<DomainScorecard | null> {
    this.fail();
  }
  async upsertBalls(): Promise<void> {
    this.fail();
  }
  async getBalls(): Promise<DomainBall[]> {
    this.fail();
  }
  async upsertPlayer(): Promise<void> {
    this.fail();
  }
  async getPlayer(): Promise<DomainPlayer | null> {
    this.fail();
  }
  async listPlayers(): Promise<DomainPlayer[]> {
    this.fail();
  }
  async recordIngestionRun(): Promise<void> {
    this.fail();
  }
  async latestIngestionRun(): Promise<IngestionRunRecord | null> {
    this.fail();
  }
  async listIngestionRuns(): Promise<IngestionRunRecord[]> {
    this.fail();
  }
}

/** Prefer memory when postgres is not ready — never silently pretend memory is postgres. */
export function createStorage(backend: "memory" | "postgres", databaseUrl: string | null): CricketStorage {
  if (backend === "postgres" && databaseUrl) {
    // No pg client wired without credentials / dependency install in this session.
    // Return unavailable wrapper so callers fall back explicitly.
    console.warn(
      "[storage] DATABASE_URL present but Postgres client not wired — using memory with pending-durable label",
    );
    const mem = new MemoryStorage();
    return {
      kind: "memory",
      label:
        "In-memory fallback (DATABASE_URL set but Postgres client/migrations pending — NOT production durable)",
      upsertMatch: (m) => mem.upsertMatch(m),
      getMatch: (id) => mem.getMatch(id),
      listMatches: () => mem.listMatches(),
      upsertScorecard: (c) => mem.upsertScorecard(c),
      getScorecard: (id) => mem.getScorecard(id),
      upsertBalls: (id, b) => mem.upsertBalls(id, b),
      getBalls: (id) => mem.getBalls(id),
      upsertPlayer: (p) => mem.upsertPlayer(p),
      getPlayer: (id) => mem.getPlayer(id),
      listPlayers: () => mem.listPlayers(),
      recordIngestionRun: (r) => mem.recordIngestionRun(r),
      latestIngestionRun: () => mem.latestIngestionRun(),
      listIngestionRuns: (n) => mem.listIngestionRuns(n),
    };
  }
  return new MemoryStorage();
}
