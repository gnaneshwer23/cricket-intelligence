import { Pool, type PoolClient, type PoolConfig } from "pg";
import { deriveCoverage, inferGender, type CoverageLevel } from "@/lib/coverage";
import type { FreshnessStatus } from "@/lib/contracts";
import type {
  DomainBall,
  DomainMatch,
  DomainPlayer,
  DomainScorecard,
  HistoricalMatchFilter,
  IngestionRunRecord,
} from "@/lib/domain/models";
import { MemoryStorage } from "@/lib/storage/memory";
import type {
  CricketStorage,
  MatchPlayerRow,
  StorageMatchSearch,
  StorageStats,
} from "@/lib/storage/types";

/**
 * Durable Postgres storage. Schema: `docs/migrations/*.sql`, applied by
 * `npm run db:migrate`. All SQL is parameterised.
 */

const COVERAGE_ORDER: CoverageLevel[] = ["result", "scorecard", "innings", "ball_by_ball"];

/** Rows per multi-row INSERT for deliveries (14 params each, well under the 65535 cap). */
const BALL_BATCH = 1000;

export function escapeLike(raw: string): string {
  return raw.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function coverageAtLeast(min: CoverageLevel): CoverageLevel[] {
  return COVERAGE_ORDER.slice(COVERAGE_ORDER.indexOf(min));
}

/** Coverage + gender derivable from the match row alone (scorecard/balls bump it later). */
function matchSearchMeta(match: DomainMatch) {
  const coverage =
    match.coverage ??
    deriveCoverage({
      status: match.status,
      note: match.note ?? match.resultText,
      score: match.score,
      startTimeIso: match.startTimeIso,
      title: match.title,
      series: match.series,
      homeName: match.teams.home.name,
      awayName: match.teams.away.name,
      isDemo: match.freshness === "DEMO" || match.status === "DEMO",
    });
  return {
    coverageLevel: coverage.level,
    gender:
      match.coverage?.gender ??
      inferGender({
        title: match.title,
        series: match.series,
        homeName: match.teams.home.name,
        awayName: match.teams.away.name,
      }),
  };
}

type WhereBuilder = { clauses: string[]; params: unknown[] };

function addParam(w: WhereBuilder, value: unknown): string {
  w.params.push(value);
  return `$${w.params.length}`;
}

export function buildMatchWhere(filter: HistoricalMatchFilter): WhereBuilder {
  const w: WhereBuilder = { clauses: [], params: [] };

  const team = (filter.teamContains ?? filter.teamId ?? "").trim();
  if (team) {
    const p = addParam(w, `%${escapeLike(team)}%`);
    w.clauses.push(
      `(home_name ILIKE ${p} OR away_name ILIKE ${p}` +
        ` OR teams->'home'->>'id' ILIKE ${p} OR teams->'away'->>'id' ILIKE ${p}` +
        ` OR teams->'home'->>'shortName' ILIKE ${p} OR teams->'away'->>'shortName' ILIKE ${p})`,
    );
  }
  if (filter.format) w.clauses.push(`format = ${addParam(w, filter.format)}`);
  if (filter.venueContains?.trim()) {
    w.clauses.push(`venue ILIKE ${addParam(w, `%${escapeLike(filter.venueContains.trim())}%`)}`);
  }
  const series = (filter.competitionContains ?? filter.seriesContains ?? "").trim();
  if (series) w.clauses.push(`series ILIKE ${addParam(w, `%${escapeLike(series)}%`)}`);
  if (filter.titleContains?.trim()) {
    w.clauses.push(`title ILIKE ${addParam(w, `%${escapeLike(filter.titleContains.trim())}%`)}`);
  }
  if (filter.resultContains?.trim()) {
    const p = addParam(w, `%${escapeLike(filter.resultContains.trim())}%`);
    w.clauses.push(`(COALESCE(note, '') ILIKE ${p} OR COALESCE(result_text, '') ILIKE ${p})`);
  }
  if (filter.gender && filter.gender !== "unknown") {
    w.clauses.push(`gender = ${addParam(w, filter.gender)}`);
  }
  if (filter.yearFrom != null) {
    w.clauses.push(`EXTRACT(YEAR FROM start_time) >= ${addParam(w, filter.yearFrom)}`);
  }
  if (filter.yearTo != null) {
    w.clauses.push(`EXTRACT(YEAR FROM start_time) <= ${addParam(w, filter.yearTo)}`);
  }
  if (filter.fromIso) w.clauses.push(`start_time >= ${addParam(w, filter.fromIso)}`);
  if (filter.toIso) w.clauses.push(`start_time <= ${addParam(w, filter.toIso)}`);
  if (filter.freshness?.length) {
    w.clauses.push(`freshness = ANY(${addParam(w, filter.freshness)}::text[])`);
  }
  if (filter.coverageLevel) {
    w.clauses.push(`coverage_level = ${addParam(w, filter.coverageLevel)}`);
  }
  if (filter.coverageAtLeast) {
    w.clauses.push(
      `coverage_level = ANY(${addParam(w, coverageAtLeast(filter.coverageAtLeast))}::text[])`,
    );
  }
  if (filter.playerContains?.trim()) {
    const p = addParam(w, `%${escapeLike(filter.playerContains.trim())}%`);
    w.clauses.push(
      `EXISTS (SELECT 1 FROM match_players mp WHERE mp.match_id = matches.id AND mp.player_name ILIKE ${p})`,
    );
  }
  return w;
}

function iso(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : undefined;
}

export class PostgresStorage implements CricketStorage {
  readonly kind = "postgres" as const;
  readonly label = "Postgres (durable)";

  /** Exposed for the read-only stats engine. */
  constructor(readonly pool: Pool) {}

  private async tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const out = await fn(client);
      await client.query("COMMIT");
      return out;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async upsertMatch(match: DomainMatch): Promise<void> {
    const meta = matchSearchMeta(match);
    await this.pool.query(
      `INSERT INTO matches (id, provider_ids, status, freshness, title, venue, series, format,
         start_time, teams, score, note, provenance, updated_at, payload,
         home_name, away_name, gender, coverage_level, result_text, provider,
         toss_winner, toss_decision, player_of_match, scheduled_overs)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
         $22,$23,$24,$25)
       ON CONFLICT (id) DO UPDATE SET
         provider_ids = EXCLUDED.provider_ids, status = EXCLUDED.status,
         freshness = EXCLUDED.freshness, title = EXCLUDED.title, venue = EXCLUDED.venue,
         series = EXCLUDED.series, format = EXCLUDED.format, start_time = EXCLUDED.start_time,
         teams = EXCLUDED.teams, score = EXCLUDED.score, note = EXCLUDED.note,
         provenance = EXCLUDED.provenance, updated_at = EXCLUDED.updated_at,
         payload = EXCLUDED.payload, home_name = EXCLUDED.home_name,
         away_name = EXCLUDED.away_name, gender = EXCLUDED.gender,
         -- never downgrade coverage measured from scorecard / balls
         coverage_level = CASE
           WHEN array_position(ARRAY['result','scorecard','innings','ball_by_ball'], matches.coverage_level)
              > array_position(ARRAY['result','scorecard','innings','ball_by_ball'], EXCLUDED.coverage_level)
           THEN matches.coverage_level ELSE EXCLUDED.coverage_level END,
         result_text = EXCLUDED.result_text, provider = EXCLUDED.provider,
         toss_winner = EXCLUDED.toss_winner, toss_decision = EXCLUDED.toss_decision,
         player_of_match = EXCLUDED.player_of_match, scheduled_overs = EXCLUDED.scheduled_overs`,
      [
        match.id,
        JSON.stringify(match.providerIds ?? {}),
        match.status,
        match.freshness,
        match.title,
        match.venue,
        match.series ?? null,
        match.format,
        match.startTimeIso ?? null,
        JSON.stringify(match.teams),
        match.score ? JSON.stringify(match.score) : null,
        match.note ?? null,
        JSON.stringify(match.provenance),
        match.updatedAt,
        JSON.stringify(match),
        match.teams.home.name,
        match.teams.away.name,
        meta.gender,
        meta.coverageLevel,
        match.resultText ?? match.note ?? null,
        match.provenance.provider ?? null,
        match.toss?.winner ?? null,
        match.toss?.decision ?? null,
        match.playerOfMatch ?? null,
        match.scheduledOvers ?? null,
      ],
    );
  }

  async getMatch(id: string): Promise<DomainMatch | null> {
    const res = await this.pool.query<{ payload: DomainMatch }>(
      "SELECT payload FROM matches WHERE id = $1",
      [id],
    );
    return res.rows[0]?.payload ?? null;
  }

  async listMatches(): Promise<DomainMatch[]> {
    const res = await this.pool.query<{ payload: DomainMatch }>(
      "SELECT payload FROM matches ORDER BY start_time DESC NULLS LAST",
    );
    return res.rows.map((r) => r.payload);
  }

  async searchMatches(filter: HistoricalMatchFilter): Promise<StorageMatchSearch> {
    const w = buildMatchWhere(filter);
    const where = w.clauses.length ? `WHERE ${w.clauses.join(" AND ")}` : "";
    const pageSize = Math.min(Math.max(filter.limit ?? 20, 1), 100);
    const page = Math.max(filter.page ?? 0, 0);

    const agg = await this.pool.query<{ total: string; ymin: number | null; ymax: number | null }>(
      `SELECT COUNT(*) AS total,
              MIN(EXTRACT(YEAR FROM start_time))::int AS ymin,
              MAX(EXTRACT(YEAR FROM start_time))::int AS ymax
         FROM matches ${where}`,
      w.params,
    );
    const rows = await this.pool.query<{ payload: DomainMatch }>(
      `SELECT payload FROM matches ${where}
        ORDER BY start_time DESC NULLS LAST, id
        LIMIT $${w.params.length + 1} OFFSET $${w.params.length + 2}`,
      [...w.params, pageSize, page * pageSize],
    );
    const a = agg.rows[0];
    return {
      matches: rows.rows.map((r) => r.payload),
      total: Number(a?.total ?? 0),
      yearMin: a?.ymin ?? undefined,
      yearMax: a?.ymax ?? undefined,
    };
  }

  async upsertScorecard(card: DomainScorecard): Promise<void> {
    const appearances = new Map<string, MatchPlayerRow>();
    for (const rows of Object.values(card.batting)) {
      for (const r of rows ?? []) appearances.set(r.playerId, { playerId: r.playerId, playerName: r.playerName });
    }
    for (const rows of Object.values(card.bowling)) {
      for (const r of rows ?? []) appearances.set(r.playerId, { playerId: r.playerId, playerName: r.playerName });
    }
    await this.tx(async (client) => {
      await client.query(
        `INSERT INTO scorecards (match_id, payload, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (match_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [card.matchId, JSON.stringify(card)],
      );
      if (appearances.size) {
        await client.query(
          `UPDATE matches SET coverage_level = 'innings'
            WHERE id = $1 AND coverage_level IN ('result', 'scorecard')`,
          [card.matchId],
        );
        await insertMatchPlayers(client, card.matchId, [...appearances.values()]);
      }
    });
  }

  async getScorecard(matchId: string): Promise<DomainScorecard | null> {
    const res = await this.pool.query<{ payload: DomainScorecard }>(
      "SELECT payload FROM scorecards WHERE match_id = $1",
      [matchId],
    );
    return res.rows[0]?.payload ?? null;
  }

  async upsertBalls(matchId: string, balls: DomainBall[]): Promise<void> {
    if (!balls.length) return;
    await this.tx(async (client) => {
      for (let i = 0; i < balls.length; i += BALL_BATCH) {
        await insertBallBatch(client, matchId, balls.slice(i, i + BALL_BATCH));
      }
      await client.query(
        "UPDATE matches SET coverage_level = 'ball_by_ball' WHERE id = $1",
        [matchId],
      );
    });
  }

  async getBalls(matchId: string): Promise<DomainBall[]> {
    const res = await this.pool.query<BallRow>(
      `SELECT id, match_id, innings_id, over_number, ball_in_over, innings_number,
              batting_team, batter_id, bowler_id, non_striker_id, runs_batter,
              runs_extras, runs_total, is_wide, is_no_ball, is_wicket, wicket_kind,
              player_out_id, bowler_runs, is_super_over, is_four, is_six, dismissal_text
         FROM balls WHERE match_id = $1
        ORDER BY innings_number NULLS FIRST, innings_id, over_number, ball_in_over`,
      [matchId],
    );
    return res.rows.map(ballFromRow);
  }

  async upsertPlayer(player: DomainPlayer): Promise<void> {
    await this.pool.query(
      `INSERT INTO players (id, provider_ids, name, team_id, role, payload, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (id) DO UPDATE SET provider_ids = EXCLUDED.provider_ids, name = EXCLUDED.name,
         team_id = COALESCE(EXCLUDED.team_id, players.team_id),
         role = COALESCE(EXCLUDED.role, players.role),
         payload = EXCLUDED.payload, updated_at = NOW()`,
      [
        player.id,
        JSON.stringify(player.providerIds ?? {}),
        player.name,
        player.teamId ?? null,
        player.role ?? null,
        JSON.stringify(player),
      ],
    );
  }

  async upsertPlayers(players: DomainPlayer[]): Promise<void> {
    const unique = [...new Map(players.map((p) => [p.id, p])).values()];
    if (!unique.length) return;
    await this.pool.query(
      `INSERT INTO players (id, provider_ids, name, team_id, role, payload, updated_at)
       SELECT id, provider_ids, name, team_id, role, payload, NOW()
         FROM UNNEST($1::text[], $2::jsonb[], $3::text[], $4::text[], $5::text[], $6::jsonb[])
           AS t(id, provider_ids, name, team_id, role, payload)
       ON CONFLICT (id) DO UPDATE SET provider_ids = players.provider_ids || EXCLUDED.provider_ids,
         name = EXCLUDED.name,
         team_id = COALESCE(EXCLUDED.team_id, players.team_id),
         role = COALESCE(EXCLUDED.role, players.role),
         payload = EXCLUDED.payload, updated_at = NOW()`,
      [
        unique.map((p) => p.id),
        unique.map((p) => JSON.stringify(p.providerIds ?? {})),
        unique.map((p) => p.name),
        unique.map((p) => p.teamId ?? null),
        unique.map((p) => p.role ?? null),
        unique.map((p) => JSON.stringify(p)),
      ],
    );
  }

  async getPlayer(id: string): Promise<DomainPlayer | null> {
    const res = await this.pool.query<{ payload: DomainPlayer }>(
      "SELECT payload FROM players WHERE id = $1",
      [id],
    );
    return res.rows[0]?.payload ?? null;
  }

  async listPlayers(): Promise<DomainPlayer[]> {
    const res = await this.pool.query<{ payload: DomainPlayer }>(
      "SELECT payload FROM players ORDER BY name",
    );
    return res.rows.map((r) => r.payload);
  }

  async upsertMatchPlayers(matchId: string, rows: MatchPlayerRow[]): Promise<void> {
    if (!rows.length) return;
    const client = await this.pool.connect();
    try {
      await insertMatchPlayers(client, matchId, rows);
    } finally {
      client.release();
    }
  }

  async matchIdsForPlayer(playerId: string): Promise<string[]> {
    const res = await this.pool.query<{ match_id: string }>(
      `SELECT mp.match_id FROM match_players mp JOIN matches m ON m.id = mp.match_id
        WHERE mp.player_id = $1 ORDER BY m.start_time NULLS LAST`,
      [playerId],
    );
    return res.rows.map((r) => r.match_id);
  }

  async recordIngestionRun(run: IngestionRunRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO ingestion_runs (id, provider, operation, status, started_at, finished_at,
         fetched, upserted, skipped, errors, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, finished_at = EXCLUDED.finished_at,
         fetched = EXCLUDED.fetched, upserted = EXCLUDED.upserted, skipped = EXCLUDED.skipped,
         errors = EXCLUDED.errors, notes = EXCLUDED.notes`,
      [
        run.id,
        run.provider,
        run.operation,
        run.status,
        run.startedAt,
        run.finishedAt ?? null,
        run.fetched,
        run.upserted,
        run.skipped,
        JSON.stringify(run.errors.slice(0, 200)),
        run.notes ?? null,
      ],
    );
  }

  async latestIngestionRun(): Promise<IngestionRunRecord | null> {
    return (await this.listIngestionRuns(1))[0] ?? null;
  }

  async listIngestionRuns(limit = 20): Promise<IngestionRunRecord[]> {
    const res = await this.pool.query<{
      id: string;
      provider: string;
      operation: string;
      status: IngestionRunRecord["status"];
      started_at: Date;
      finished_at: Date | null;
      fetched: number;
      upserted: number;
      skipped: number;
      errors: string[];
      notes: string | null;
    }>(
      `SELECT id, provider, operation, status, started_at, finished_at, fetched, upserted,
              skipped, errors, notes
         FROM ingestion_runs ORDER BY started_at DESC LIMIT $1`,
      [limit],
    );
    return res.rows.map((r) => ({
      id: r.id,
      provider: r.provider,
      operation: r.operation,
      status: r.status,
      startedAt: iso(r.started_at) ?? "",
      finishedAt: iso(r.finished_at),
      fetched: r.fetched,
      upserted: r.upserted,
      skipped: r.skipped,
      errors: r.errors ?? [],
      notes: r.notes ?? undefined,
    }));
  }

  async stats(): Promise<StorageStats> {
    const fres = await this.pool.query<{ freshness: FreshnessStatus; n: string }>(
      "SELECT freshness, COUNT(*) AS n FROM matches GROUP BY freshness",
    );
    const pres = await this.pool.query<{ n: string }>("SELECT COUNT(*) AS n FROM players");
    const freshnessCounts: StorageStats["freshnessCounts"] = {};
    let matchCount = 0;
    for (const row of fres.rows) {
      const n = Number(row.n);
      freshnessCounts[row.freshness] = n;
      matchCount += n;
    }
    return { matchCount, playerCount: Number(pres.rows[0]?.n ?? 0), freshnessCounts };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

async function insertMatchPlayers(
  client: PoolClient,
  matchId: string,
  rows: MatchPlayerRow[],
): Promise<void> {
  await client.query(
    `INSERT INTO match_players (match_id, player_id, player_name, team_name)
     SELECT $1::text, * FROM UNNEST($2::text[], $3::text[], $4::text[])
     ON CONFLICT (match_id, player_id) DO UPDATE SET
       player_name = EXCLUDED.player_name,
       team_name = COALESCE(EXCLUDED.team_name, match_players.team_name)`,
    [
      matchId,
      rows.map((r) => r.playerId),
      rows.map((r) => r.playerName),
      rows.map((r) => r.teamName ?? null),
    ],
  );
}

async function insertBallBatch(client: PoolClient, matchId: string, balls: DomainBall[]) {
  await client.query(
    `INSERT INTO balls (id, match_id, innings_id, over_number, ball_in_over,
       innings_number, batting_team, batter_id, bowler_id, non_striker_id,
       runs_batter, runs_extras, runs_total, is_wide, is_no_ball, is_wicket,
       wicket_kind, player_out_id, bowler_runs, is_super_over,
       is_four, is_six, dismissal_text)
     SELECT * FROM UNNEST(
       $1::text[], $2::text[], $3::text[], $4::int[], $5::int[],
       $6::int[], $7::text[], $8::text[], $9::text[], $10::text[],
       $11::int[], $12::int[], $13::int[], $14::bool[], $15::bool[], $16::bool[],
       $17::text[], $18::text[], $19::int[], $20::bool[],
       $21::bool[], $22::bool[], $23::text[])
     ON CONFLICT (id) DO UPDATE SET
       innings_number = EXCLUDED.innings_number, batting_team = EXCLUDED.batting_team,
       batter_id = EXCLUDED.batter_id, bowler_id = EXCLUDED.bowler_id,
       non_striker_id = EXCLUDED.non_striker_id, runs_batter = EXCLUDED.runs_batter,
       runs_extras = EXCLUDED.runs_extras, runs_total = EXCLUDED.runs_total,
       is_wide = EXCLUDED.is_wide, is_no_ball = EXCLUDED.is_no_ball,
       is_wicket = EXCLUDED.is_wicket, wicket_kind = EXCLUDED.wicket_kind,
       player_out_id = EXCLUDED.player_out_id, bowler_runs = EXCLUDED.bowler_runs,
       is_super_over = EXCLUDED.is_super_over, is_four = EXCLUDED.is_four,
       is_six = EXCLUDED.is_six, dismissal_text = EXCLUDED.dismissal_text`,
    [
      balls.map((b) => b.id),
      balls.map(() => matchId),
      balls.map((b) => b.inningsId),
      balls.map((b) => b.overNumber),
      balls.map((b) => b.ballInOver),
      balls.map((b) => b.inningsNumber ?? null),
      balls.map((b) => b.battingTeam ?? null),
      balls.map((b) => b.batsmanId ?? null),
      balls.map((b) => b.bowlerId ?? null),
      balls.map((b) => b.nonStrikerId ?? null),
      balls.map((b) => b.runsOffBat),
      balls.map((b) => b.extras),
      balls.map((b) => b.totalRuns),
      balls.map((b) => Boolean(b.isWide)),
      balls.map((b) => Boolean(b.isNoBall)),
      balls.map((b) => b.isWicket),
      balls.map((b) => b.wicketKind ?? null),
      balls.map((b) => b.playerOutId ?? null),
      balls.map((b) => b.bowlerRuns ?? null),
      balls.map((b) => Boolean(b.isSuperOver)),
      balls.map((b) => Boolean(b.isFour)),
      balls.map((b) => Boolean(b.isSix)),
      balls.map((b) => b.dismissalText ?? null),
    ],
  );
}

type BallRow = {
  id: string;
  match_id: string;
  innings_id: string;
  over_number: number;
  ball_in_over: number;
  innings_number: number | null;
  batting_team: string | null;
  batter_id: string | null;
  bowler_id: string | null;
  non_striker_id: string | null;
  runs_batter: number | null;
  runs_extras: number | null;
  runs_total: number | null;
  is_wide: boolean | null;
  is_no_ball: boolean | null;
  is_wicket: boolean | null;
  wicket_kind: string | null;
  player_out_id: string | null;
  bowler_runs: number | null;
  is_super_over: boolean;
  is_four: boolean;
  is_six: boolean;
  dismissal_text: string | null;
};

/** Typed ball columns → DomainBall; nullable columns become absent keys. */
export function ballFromRow(r: BallRow): DomainBall {
  const ball: DomainBall = {
    id: r.id,
    matchId: r.match_id,
    inningsId: r.innings_id,
    overNumber: r.over_number,
    ballInOver: r.ball_in_over,
    runsOffBat: r.runs_batter ?? 0,
    extras: r.runs_extras ?? 0,
    totalRuns: r.runs_total ?? 0,
    isWicket: Boolean(r.is_wicket),
    isWide: Boolean(r.is_wide),
    isNoBall: Boolean(r.is_no_ball),
    isFour: r.is_four,
    isSix: r.is_six,
  };
  if (r.innings_number != null) ball.inningsNumber = r.innings_number;
  if (r.batting_team != null) ball.battingTeam = r.batting_team;
  if (r.batter_id != null) ball.batsmanId = r.batter_id;
  if (r.bowler_id != null) ball.bowlerId = r.bowler_id;
  if (r.non_striker_id != null) ball.nonStrikerId = r.non_striker_id;
  if (r.wicket_kind != null) ball.wicketKind = r.wicket_kind;
  if (r.player_out_id != null) ball.playerOutId = r.player_out_id;
  if (r.bowler_runs != null) ball.bowlerRuns = r.bowler_runs;
  if (r.is_super_over) ball.isSuperOver = true;
  if (r.dismissal_text != null) ball.dismissalText = r.dismissal_text;
  return ball;
}

let sharedPool: Pool | null = null;

export function createPool(databaseUrl: string, overrides?: PoolConfig): Pool {
  return new Pool({
    connectionString: databaseUrl,
    max: Number.parseInt(process.env.CRICKETOS_PG_POOL_MAX ?? "5", 10) || 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ...overrides,
  });
}

/** Postgres when configured; memory otherwise. Never labels memory as durable. */
export function createStorage(backend: "memory" | "postgres", databaseUrl: string | null): CricketStorage {
  if (backend === "postgres" && databaseUrl) {
    sharedPool ??= createPool(databaseUrl);
    return new PostgresStorage(sharedPool);
  }
  return new MemoryStorage();
}
