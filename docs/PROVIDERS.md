# Cricket data & AI providers

CricketOS is **provider-independent**. Credentials stay server-side via env vars. With no provider configured, the app runs in **DEMO mode** on the bundled Lord’s illustrative dataset.

Full evaluation with evidence links: **`docs/PROVIDER_EVALUATION.md`**.

## Investigated

| Provider | Fit | Integration status |
|----------|-----|--------------------|
| **Sportmonks Cricket** | Fixtures, scoreboards, `balls` include, players | Adapter + mocks; primary recommendation when licensed |
| **CricketData.org / CricAPI** | Match lists, currentMatches, scorecard paths | Adapter + mocks; fallback / low-cost exploration |
| **ESPNcricinfo / Cricbuzz** | Rich editorial | **Do not scrape** |
| **ICC open data** | Limited | Not a full ball-by-ball feed |
| **OpenAI / Anthropic** | Explain layer only | Optional; must not invent numbers |

## Env vars (see `.env.example` + README)

| Variable | Purpose |
|----------|---------|
| `CRICKETOS_DATA_PROVIDER` | `demo` (default) \| `cricapi` \| `sportmonks` |
| `CRICKETOS_DATA_API_KEY` | Server-only API key (never `NEXT_PUBLIC_`) |
| `CRICKETOS_DATA_API_BASE_URL` | Optional base URL override |
| `CRICKETOS_STORAGE_BACKEND` | `memory` (default) \| `postgres` |
| `DATABASE_URL` | Postgres connection when using durable storage |
| `CRICKETOS_INGESTION_TOKEN` | Required for `POST /api/ingestion/run` |
| `CRICKETOS_STALE_AFTER_MS` | LIVE → STALE threshold |
| `CRICKETOS_PROVIDER_TIMEOUT_MS` | Provider HTTP timeout |
| `CRICKETOS_PROVIDER_MAX_RETRIES` | Retries on 429/5xx |
| `CRICKETOS_LLM_PROVIDER` | `off` (default) \| `openai` \| `anthropic` |
| `CRICKETOS_LLM_API_KEY` | Server-only LLM key |
| `CRICKETOS_LLM_MODEL` | Optional model id |

## Pipeline

`Provider → adapter → validate → normalise → quality → storage → domain → UI`

Copilot: `classify intent → retrieve facts → deterministic calculate → explain (LLM or rule) → cite evidence → validate numbers against calc outputs`

Demo mode skips external retrieve and uses the local contract dataset with explicit DEMO provenance. Scripted Match Room sim remains labelled DEMO — never LIVE without a verified provider health check.
