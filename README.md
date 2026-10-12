# CricketOS

**Follow the match. Understand the game. Explore what happens next.**

Interactive cricket intelligence — Match Room, Explorer charts, grounded Copilot, player DNA, and what-if labs.  
**DEMO mode by default:** the Lord’s England vs India board is a bundled illustrative dataset. It is **not** a live score, official record book, or betting product.

## Run

```bash
npm install
npm run dev -- --port 41731
```

Open [http://localhost:41731](http://localhost:41731).

```bash
npm run build    # production build
npm run test     # deterministic calc + innings tests (tsx)
npm run lint
```

## Environment

Copy `.env.example` → `.env.local`. Secrets stay **server-side only** (never `NEXT_PUBLIC_` for API keys).

| Variable | Default | Purpose |
|----------|---------|---------|
| `CRICKETOS_DATA_PROVIDER` | `demo` | `demo` \| `cricapi` \| `sportmonks` |
| `CRICKETOS_DATA_API_KEY` | — | Server-only data API key |
| `CRICKETOS_STORAGE_BACKEND` | `memory` | `memory` (ephemeral) \| `postgres` (needs `DATABASE_URL` + migrations) |
| `DATABASE_URL` | — | Managed Postgres URL when durable storage is ready |
| `CRICKETOS_INGESTION_TOKEN` | — | Required for `POST /api/ingestion/run` (disabled when unset) |
| `CRICKETOS_LLM_PROVIDER` | `off` | `off` \| `openai` \| `anthropic` |
| `CRICKETOS_LLM_API_KEY` | — | Server-only LLM key (explain layer only) |
| `CRICKETOS_LLM_MODEL` | — | Optional model id |

With no live credentials, the app stays in **DEMO** and labels match status accordingly. See `docs/PROVIDERS.md` and `docs/PROVIDER_EVALUATION.md`.

## Data layer (Stage 5)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Provider + storage summary (no secrets) |
| `GET /api/matches` | Historical search / filters |
| `GET /api/matches/:id` | Match + scorecard + honest missing fields |
| `GET /api/ingestion/status` | Operator ingestion summary |
| `POST /api/ingestion/run` | Token-gated ingest (refused without token) |

Freshness labels: **LIVE / STALE / UNAVAILABLE / DEMO / HISTORICAL / UPCOMING**.  
Default persistence is **in-memory** and labelled ephemeral — not production durable storage.

## Product surfaces

| Surface | Route (hash) | Status |
|---------|--------------|--------|
| Intelligence Briefing | `#home` | Shipped |
| Cricket Copilot | `#ask` | Grounded rule engine + deterministic calcs + evidence |
| Match Room | `#match` | DEMO board · Match Graph · provenance |
| Cricket Explorer | `#explorer` | Worm · Manhattan · Test phase rates (DEMO series) |
| Player Intelligence | `#players` | Filters + sample-size warnings |
| My Cricket | `#feed` | Personalisation |
| Labs (What-If) | `#labs` | Scenario builder + authored swings · Hypothetical |
| Team Intelligence | `#teams` | Secondary |
| Community | `#community` | Secondary / light |
| Fantasy | `#fantasy` | Experimental |

Press `/` to jump to Copilot.

## Cricket Explorer

Uses the authored England 1st-innings over series (totals match the DEMO scorecard / phase table / FOW):

| Chart | What it shows | Required fields |
|-------|---------------|-----------------|
| Scoring progression | Cumulative runs vs legal balls; wickets / boundaries | `overs[]` with runs, balls, events |
| Manhattan | Runs (and wicket markers) per over | Same over buckets |
| Run-rate / phases | Test over-range & session bands; model table | Format + overs; LO powerplay/death only when format is ODI/T20 |

Filters: match, innings, team, player (event highlight), phase. Clicking a linked point opens Match Graph. India batting compare is an honest empty state on this board.

## What-If Lab

- **Scenario builder** — runs required, balls remaining, wickets, optional current runs / assumed RPO. Immediate deterministic feedback (RRR, projection, alternatives).
- **Three scenarios** — Conservative / Baseline / Aggressive assumed RPO only. **Not** win probabilities or AI predictions.
- Cricket overs use ball remainder (`17.4` = 17 overs + 4 balls). Zero balls, completed chase, and invalid inputs never render NaN/Infinity.
- Match Graph / Explorer can open a **revised situation**; Observed vs Hypothetical stay labelled.

## Data honesty

- **DEMO** — bundled illustrative match / authored DNA
- **LIVE / STALE / UNAVAILABLE** — only when a configured provider health check warrants it
- **UPCOMING** — fixture with no ball in play
- **HISTORICAL** — completed / archive normalised matches
- **Model** — session win prior / projections
- **Hypothetical** — what-if & ball simulations

Copilot pipeline (current): classify intent → retrieve from demo file → **calculate** (phase lead, Explorer Manhattan/phases, RRR, SR, milestones) → explain with citations. No connected LLM unless configured; never invent numbers beyond the dataset. Honest “can’t answer” when the series is missing.

## Docs

- `docs/AUDIT.md` — audit + staged plan
- `docs/PROVIDERS.md` — provider env + pipeline
- `docs/PROVIDER_EVALUATION.md` — evidence-based provider comparison
- `docs/DATA_ARCHITECTURE.md` — adapter → storage → UI flow
- `docs/DATA_QUALITY.md` — invariants + synthetic fixtures
- `docs/migrations/001_cricketos.sql` — Postgres sketch (manual apply)

## Known limitations

- No verified live score feed — Match Room strip is a **scripted DEMO simulation**, labelled as such
- Provider adapters are implemented and **unit-tested with mocks**; live keyed calls need credentials + license confirmation
- Persistence defaults to **in-memory** until `DATABASE_URL` + migrations + a Postgres client are wired
- LLM explain path is stubbed behind env (not implemented end-to-end)
- Explorer over-series is England 1st innings DEMO only — multi-match search does not invent charts
- Fantasy / Community remain light secondary surfaces
- Similarity % and many DNA values are authored demo file, not trained model outputs
- Authored win-swing What-If cards are separate from the rate scenario builder

## Roadmap (priority)

1. Obtain licensed Sportmonks (or CricAPI) credentials and verify coverage
2. Wire Postgres client + apply migrations for durable storage
3. Optional LLM explain that may only restate calc + evidence
4. Second innings / multi-match Explorer series from normalised balls
5. Personalisation depth (alerts with real freshness)

## Keyboard

`/` — Cricket Copilot
