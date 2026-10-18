# Data architecture (Stage 5)

## Flow

```
Provider API
  → CricketDataAdapter (demo | cricapi | sportmonks)
  → validate (schema checks)
  → normalise (stable CricketOS IDs, domain models, provenance)
  → quality checks (invariants)
  → CricketStorage upsert (idempotent)
  → domain services (match / historical)
  → Route Handlers + UI
```

No duplicate parallel architecture — UI surfaces keep using existing calc/Match Graph/Explorer modules; new code feeds **normalised** entities behind `/api/*` and shared services.

## Packages

| Path | Role |
|------|------|
| `src/lib/provider/` | Config, HTTP helper, adapters, factory |
| `src/lib/ingestion/` | Validate, normalise, quality, runner |
| `src/lib/storage/` | `CricketStorage` interface; memory (dev/CI) + `PostgresStorage` (durable, search pushdown) |
| `src/lib/domain/models.ts` | Normalised entities |
| `src/lib/service/` | Match + historical + evidence scope |
| `src/app/api/` | Health, matches, ingestion status/run |

## Adapter operations

All adapters implement: `health`, `listFixtures`, `getMatch`, `getScorecard`, `getBallByBall`, `listPlayers`, `listHistorical`.

Unsupported operations return `ok: false` with an explicit error — they do not invent scorecards or balls.

## Freshness

`LIVE` | `STALE` | `UNAVAILABLE` | `DEMO` | `HISTORICAL` | `UPCOMING`  
Demo mode never promotes the board to LIVE.

## Persistence

- Default: **in-memory** (`MemoryStorage`), labelled ephemeral — dev/CI only.
- Durable: `CRICKETOS_STORAGE_BACKEND=postgres` + `DATABASE_URL` → `PostgresStorage` (`pg` pool, parameterised SQL).
- Schema: `docs/migrations/*.sql`, applied once each by `npm run db:migrate` (tracked in `schema_migrations`).
- Archive search, health counts and player trends are pushed down to SQL (`searchMatches`, `stats`, `matchIdsForPlayer`) — no full-table scans per request.
- `balls` carries typed delivery columns (batter, bowler, runs, extras, wicket kind) for models and text-to-SQL; `match_players` holds squads for player filters.

## Cricsheet (historical ball-by-ball)

- Source: [cricsheet.org](https://cricsheet.org/downloads/) JSON, **ODC-By 1.0** — commercial use allowed, attribution required in the product.
- Parser: `src/lib/ingestion/cricsheet.ts` → match, reconciled scorecard, typed deliveries, squads, quality report. Ids: `cs-<cricsheet id>`, players `cs-<registry id>`.
- Backfill (CLI): `npm run ingest:cricsheet -- --file ipl_json.zip` (or `--zip ./data/all_json.zip`, `--limit`, `--force`, `--memory` dry run). Idempotent; existing matches are skipped unless `--force`.
- Nightly delta: Vercel Cron → `GET /api/ingestion/cricsheet` (`Authorization: Bearer $CRON_SECRET`) pulls `recently_added_7_json.zip`; refuses memory storage.
- Quality issues are recorded on the ingestion run for review, never silently dropped. Verified locally: full IPL archive (1,243 matches, 295,732 deliveries) with 0 quality flags; spot checks match published records.

## Security

- API keys only via server env (`CRICKETOS_DATA_API_KEY`) — never `NEXT_PUBLIC_`.
- Ingestion `POST /api/ingestion/run` requires `CRICKETOS_INGESTION_TOKEN`; refused when unset.
- Provider logs redact `apikey` / `api_token` query params.
- Timeouts + bounded retries on 429/5xx.

## UI integration

- Prefer `getDataService()` for reads — bootstraps seeded HISTORICAL fixtures via the same `normaliseCricApiMatch` path, then optionally syncs a configured provider.
- Home / Match Room / Explorer / Ask show `DataStatusStrip` (`/api/health`).
- Fixtures list: `GET /api/fixtures` (seeded upcoming + archive; provider when keyed).
- Explorer historical panel uses `/api/matches` + compare; charts remain DEMO over-series only.
- Live score strip stays **scripted DEMO sim** (`live-sim.ts`) — never LIVE without provider health.
- Copilot historical mode retrieves normalised `/api/matches` rows + deterministic calcs + `copilotEvidenceScope`.

## Credentials path

1. Set `CRICKETOS_DATA_PROVIDER=cricapi` (or `sportmonks`) and `CRICKETOS_DATA_API_KEY` in `.env.local` / Vercel project env.
2. Restart / redeploy.
3. `/api/health` shows `demoMode: false` and adapter health; freshness may become LIVE only when the provider reports an in-progress match.
4. Without a key, UI stays DEMO + seeded HISTORICAL (honest labels).
