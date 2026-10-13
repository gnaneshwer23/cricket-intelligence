# Cricket data & AI providers

CricketOS is **provider-independent**. Credentials stay server-side via env vars. With no provider configured, the app runs in **truth mode**: product Home / Live / Copilot do not invent scores; optional **DEMO playground** (`#demo`) holds the Lord’s illustrative sim.

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

Truth mode (`demoMode`) skips external retrieve. Seeded archive rows stay in storage for API tests but do **not** populate customer-facing fixtures. Scripted Match Room sim is opt-in via DEMO playground — never LIVE, never the default homepage.

### Enable live / historical provider data

1. Sign up at [CricketData.org / CricAPI](https://cricketdata.org/) (or Sportmonks) and copy an API key — do not scrape Cricbuzz/Cricinfo. Signup needs your email / login (agent cannot complete OTP for you).
2. **Local:** copy `.env.example` → `.env.local`:
   - `CRICKETOS_DATA_PROVIDER=cricapi`
   - `CRICKETOS_DATA_API_KEY=<paste key>`
   Restart `next dev`.
3. **Vercel:** Project → Settings → Environment Variables → add the same two vars for Production + Preview → Redeploy.
4. Confirm `GET /api/health` shows `demoMode: false` and adapter `ok`. The Home / Match Room **Live Scores** board polls `/api/fixtures` + `/api/matches`; LIVE badges only when the provider reports an in-progress match. DEMO sim is never labelled LIVE.
5. CricAPI adapter merges `currentMatches` (in-progress) with `matches` (schedule) when keyed.
