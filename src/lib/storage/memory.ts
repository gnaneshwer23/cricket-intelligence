import type {
  DomainBall,
  DomainMatch,
  DomainPlayer,
  DomainScorecard,
  IngestionRunRecord,
} from "@/lib/domain/models";
import type { CricketStorage } from "@/lib/storage/types";

/**
 * In-memory store — process-local, lost on restart.
 * Clearly NOT production persistence.
 */
export class MemoryStorage implements CricketStorage {
  readonly kind = "memory" as const;
  readonly label =
    "In-memory (ephemeral) — pending durable Postgres when DATABASE_URL is configured";

  private matches = new Map<string, DomainMatch>();
  private scorecards = new Map<string, DomainScorecard>();
  private balls = new Map<string, DomainBall[]>();
  private players = new Map<string, DomainPlayer>();
  private runs: IngestionRunRecord[] = [];

  async upsertMatch(match: DomainMatch): Promise<void> {
    this.matches.set(match.id, match);
  }

  async getMatch(id: string): Promise<DomainMatch | null> {
    return this.matches.get(id) ?? null;
  }

  async listMatches(): Promise<DomainMatch[]> {
    return [...this.matches.values()];
  }

  async upsertScorecard(card: DomainScorecard): Promise<void> {
    this.scorecards.set(card.matchId, card);
  }

  async getScorecard(matchId: string): Promise<DomainScorecard | null> {
    return this.scorecards.get(matchId) ?? null;
  }

  async upsertBalls(matchId: string, balls: DomainBall[]): Promise<void> {
    // Idempotent by ball id
    const existing = this.balls.get(matchId) ?? [];
    const map = new Map(existing.map((b) => [b.id, b]));
    for (const ball of balls) map.set(ball.id, ball);
    this.balls.set(
      matchId,
      [...map.values()].sort(
        (a, b) => a.overNumber - b.overNumber || a.ballInOver - b.ballInOver,
      ),
    );
  }

  async getBalls(matchId: string): Promise<DomainBall[]> {
    return this.balls.get(matchId) ?? [];
  }

  async upsertPlayer(player: DomainPlayer): Promise<void> {
    this.players.set(player.id, player);
  }

  async getPlayer(id: string): Promise<DomainPlayer | null> {
    return this.players.get(id) ?? null;
  }

  async listPlayers(): Promise<DomainPlayer[]> {
    return [...this.players.values()];
  }

  async recordIngestionRun(run: IngestionRunRecord): Promise<void> {
    const idx = this.runs.findIndex((r) => r.id === run.id);
    if (idx >= 0) this.runs[idx] = run;
    else this.runs.unshift(run);
    if (this.runs.length > 100) this.runs.length = 100;
  }

  async latestIngestionRun(): Promise<IngestionRunRecord | null> {
    return this.runs[0] ?? null;
  }

  async listIngestionRuns(limit = 20): Promise<IngestionRunRecord[]> {
    return this.runs.slice(0, limit);
  }

  /** Test helper */
  clear(): void {
    this.matches.clear();
    this.scorecards.clear();
    this.balls.clear();
    this.players.clear();
    this.runs = [];
  }
}
