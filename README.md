# Cricket Intelligence

**Follow the match. Understand the game. Explore what happens next.**

> Product name: **Cricket Intelligence** (formerly CricketOS — internal identifiers such as `CRICKETOS_*` env vars are unchanged).

Multi-team cricket intelligence — India, Australia, West Indies, IPL, women’s cricket, and historical legends — with Match Room, Explorer charts, grounded Copilot, player DNA, and what-if labs.

**Truth mode by default:** without a licensed provider key, Home / Live Scores / Copilot do **not** invent match scores, win %, or AI briefings. Optional **DEMO playground** (`#demo`) is a quarantined, watermarked Lord’s sim — never the default homepage.

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
| `DATABASE_URL` | — | Postgres URL (Neon / Supabase / local); run `npm run db:migrate` |
| `CRON_SECRET` | — | Enables the nightly Cricsheet delta cron (`/api/ingestion/cricsheet`) |
| `CRICKETOS_INGESTION_TOKEN` | — | Required for `POST /api/ingestion/run` (disabled when unset) |
| `CRICKETOS_LLM_PROVIDER` | `off` | `off` \| `openai` \| `anthropic` |
| `CRICKETOS_LLM_API_KEY` | — | Server-only LLM key (explain layer only) |
| `CRICKETOS_LLM_MODEL` | — | Optional model id |

With no live credentials, the app stays in **truth mode** (`demoMode: true` on `/api/health`): product boards stay empty with setup steps. See `docs/PROVIDERS.md` and `docs/PROVIDER_EVALUATION.md`.

### Exact steps for true live details (CricAPI / CricketData.org)

Real fixtures / LIVE scores need a free API key. Every CricAPI call goes through a shared, quota-guarded cache (Postgres `provider_cache`), so the free tier's 100 hits/day cover all visitors and instances: about 48 `currentMatches` + 8 schedule calls a day, and no calls once 10 hits remain. Live scores are therefore up to ~30 min old and are labelled STALE with their "as of" time. Signup needs your email / OTP — **not automatable by the agent**.

1. Open [https://cricketdata.org/](https://cricketdata.org/) → **Sign Up / Login** → copy your API key.
2. **Local:** copy `.env.example` → `.env.local` and set:
   ```bash
   CRICKETOS_DATA_PROVIDER=cricapi
   CRICKETOS_DATA_API_KEY=paste_your_key_here
   ```
   Restart `npm run dev -- --port 41731`. Confirm `GET /api/health` shows `demoMode: false`.
3. **Vercel:** Project → Settings → Environment Variables → add the same two vars for **Production** + **Preview** → Redeploy.
4. Home **Live Scores** and `#live` then show **provider fixtures only** (series, venue, status, scores, timestamps). Briefings are derived from those rows (e.g. “3 matches live”, “Next: X vs Y at Z”) — never authored fiction. **DEMO sim is never labelled LIVE** and is only via **Try DEMO playground** (`#demo`).

Without a key: honest empty/setup state — **not** fake England–India 245/4, Root milestones, win models, or GOAT stories.

## Assistant (chat or speak)

The **Ask AI** button opens a chat panel on every screen. Type or tap the mic (Web Speech API); toggle the speaker to hear replies.

- `POST /api/assistant` — tool-grounded agent via **Vercel AI Gateway** (default `google/gemini-2.5-flash`, works on the gateway free tier; set `CRICKETOS_ASSISTANT_MODEL`, e.g. `anthropic/claude-haiku-5.5`, once paid credits are enabled).
- Tools wrap existing verified paths: player search + Cricsheet stats, matchups, live fixtures/match detail (cached CricAPI), archive search, T20 win probability, series.
- **Verifier:** every number in a draft answer must appear in this turn's tool results (or the question), allowing only rounding and probability→%; otherwise one corrective retry, then a refusal. Answers show the tools used and a "numbers verified" badge.
- Guards: first step must call a tool, 6-step cap, 700 output tokens, last 12 messages, 1,500-char questions, 12 requests/min per client. `CRICKETOS_ASSISTANT=off` disables it.
- Auth: on Vercel the project's OIDC token is used automatically; locally run `vercel env pull` (or set `AI_GATEWAY_API_KEY`). If the model is unreachable, the widget answers with the built-in rules engine, labelled "Offline answer".

## Data layer (Stage 5)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | Provider + storage summary (no secrets) |
| `GET /api/matches` | Historical search / filters (DEMO + seeded archive + provider) |
| `GET /api/matches/:id` | Match + scorecard + honest missing fields |
| `GET /api/fixtures` | Fixture list for Home / Match Room |
| `GET /api/ingestion/status` | Operator ingestion summary |
| `POST /api/ingestion/run` | Token-gated ingest (refused without token) |
| `GET /api/ingestion/cricsheet` | Cron-gated Cricsheet delta (Postgres only) |
| `GET /api/stats/players?q=` | Typo-tolerant player search (Postgres) |
| `GET /api/stats/players/:id` | Batting + bowling with SQL evidence; filters `format`, `phase`, `yearFrom`, `yearTo`, `competition`, `gender` |
| `GET /api/stats/matchup?batter=&bowler=` | Batter vs bowler by season, with sample-size warning |
| `GET /api/stats/winprob/:matchId` | T20 win-probability worm + turning points (model `t20-wp-v1`, see `docs/WIN_PROBABILITY.md`) |
| `GET /api/provider/series?search=` | Current / upcoming series (CricAPI, cached 24 h) |
| `GET /api/provider/series/:id` | Series header + fixtures (cached 6 h) |
| `GET /api/provider/matches/:id` | Match detail: innings scores, toss, series (cached 30 min) |
| `GET /api/provider/players/:id` | Player profile + career stats by format (cached 7 days) |

**Wire a live provider:** see [Exact steps for true live details](#exact-steps-for-true-live-details-cricapi--cricketdataorg) above. Seeds remain for API tests only — they do **not** populate the customer-facing home as truth.

Freshness labels: **LIVE / STALE / UNAVAILABLE / DEMO / HISTORICAL / UPCOMING**.  
Default persistence is **in-memory** and labelled ephemeral. For durable storage + real history:

```bash
export DATABASE_URL=postgres://localhost:5432/cricketos_dev
npm run db:migrate
npm run ingest:cricsheet -- --file ipl_json.zip   # or tests_json.zip, t20s_json.zip, all_json.zip
npm run ingest:register                            # aliases: "Virat Kohli" → V Kohli
npm run winprob:train && npm run winprob:backfill   # T20 win probability v1 (holdout 2025–26)
CRICKETOS_STORAGE_BACKEND=postgres npm run dev -- --port 41731
```

Historical ball-by-ball comes from [Cricsheet](https://cricsheet.org) (ODC-By 1.0 — attribution required). See `docs/DATA_ARCHITECTURE.md`.

## Product surfaces

| Surface | Route (hash) | Status |
|---------|--------------|--------|
| Cricket Today | `#home` | Truth-mode empty without key · provider briefing when keyed |
| Match Intelligence | `#match` / `#live` | Primary journey · shared match focus · progressive disclosure |
| Ask CricketOS | `#ask` | Grounded rule engine + deterministic calcs + evidence |
| Players & Teams | `#players` (+ `#teams`) | Search-first · sample-size warnings |
| DEMO playground | `#demo` | Quarantined Lord’s sim · Match Graph · watermarked |
| Cricket Explorer | `#explorer` | Secondary · DEMO charts only in playground |
| Labs (What-If) | `#labs` | Transparent rate assumptions · Hypothetical |
| My Cricket | `#feed` | Personalisation |
| Community | `#community` | Secondary / light |
| Fantasy | `#fantasy` | Experimental |

Press `/` to jump to Ask CricketOS. See `docs/PRODUCT_RESET.md` for the product reset plan and inventory.

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

- **Truth mode** — no provider key → empty product boards + setup CTA; Copilot refuses invented stats
- **DEMO playground** — optional `#demo` Lord’s sim only; always watermarked; never default home content
- **LIVE / STALE / UNAVAILABLE** — only when a configured provider health check warrants it
- **UPCOMING / HISTORICAL** — from licensed provider responses on product surfaces
- **Illustrative DNA** — catalog stubs hide DNA %; core profiles label “Illustrative model, not official stats”
- **Hypothetical** — what-if labs stay labelled

Copilot: retrieve from provider / normalised data → calculate → explain with citations, or say **“I don't have that in the dataset.”** No invented match scores.

## Docs

- `docs/AUDIT.md` — audit + staged plan
- `docs/PROVIDERS.md` — provider env + pipeline
- `docs/PROVIDER_EVALUATION.md` — evidence-based provider comparison
- `docs/DATA_ARCHITECTURE.md` — adapter → storage → UI flow
- `docs/DATA_QUALITY.md` — invariants + synthetic fixtures
- `docs/migrations/*.sql` — Postgres schema (`npm run db:migrate`)

## Known limitations

- No provider key on Vercel by default — product Live Scores stay empty until you paste a CricAPI key
- DEMO playground is a **scripted simulation**, labelled DEMO (never LIVE), opt-in only
- Provider adapters are implemented and **unit-tested with mocks**; live keyed calls need credentials + license confirmation
- Persistence defaults to **in-memory** unless `CRICKETOS_STORAGE_BACKEND=postgres` + `DATABASE_URL` are set
- Cricsheet data populates the archive/API layer; UI surfaces (Explorer charts, player pages) do not read it yet
- LLM explain path is stubbed behind env (not implemented end-to-end)
- Explorer over-series is England 1st innings DEMO only — multi-match search does not invent charts
- Fantasy / Community remain light secondary surfaces
- Similarity % and many DNA values are authored demo file, not trained model outputs
- Authored win-swing What-If cards are separate from the rate scenario builder

## Roadmap (priority)

1. Obtain licensed Sportmonks (or CricAPI) credentials and verify coverage
2. Provision Postgres on Vercel, backfill Cricsheet, wire Explorer / players to stored deliveries
3. Optional LLM explain that may only restate calc + evidence
4. Second innings / multi-match Explorer series from normalised balls
5. Personalisation depth (alerts with real freshness)

## Keyboard

`/` — Cricket Copilot
