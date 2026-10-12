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
| `src/lib/storage/` | `CricketStorage` interface; memory (+ postgres scaffolding) |
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

- Default: **in-memory** (`MemoryStorage`), labelled ephemeral.
- `CRICKETOS_STORAGE_BACKEND=postgres` + `DATABASE_URL` intended for managed Postgres (e.g. Supabase).
- SQL sketch: `docs/migrations/001_cricketos.sql`.
- **Blocker:** no durable client wired without verified credentials; app must not pretend memory is production.

## Security

- API keys only via server env (`CRICKETOS_DATA_API_KEY`) — never `NEXT_PUBLIC_`.
- Ingestion `POST /api/ingestion/run` requires `CRICKETOS_INGESTION_TOKEN`; refused when unset.
- Provider logs redact `apikey` / `api_token` query params.
- Timeouts + bounded retries on 429/5xx.

## UI integration

- Match Room / Explorer show `DataStatusStrip` (`/api/health`).
- Explorer historical panel uses `/api/matches` + compare; charts remain DEMO over-series only.
- Live score strip stays **scripted DEMO sim** (`live-sim.ts`).
- Copilot uses deterministic calcs + `copilotEvidenceScope` (no LLM claim when stubbed).
