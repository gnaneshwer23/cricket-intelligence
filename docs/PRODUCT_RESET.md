# CricketOS Fundamental Product Reset

**Date:** 2026-10-13  
**Repo:** https://github.com/gnaneshwer23/cricket-intelligence  
**Deploy inspected:** https://cricket-intelligence-delta.vercel.app (`GET /api/health`)  
**Positioning:** CricketOS is the intelligence layer for cricket — what happened, why, evidence, what might happen next. **The match is the centre.**

## Assessment

The codebase has a solid Stage 5 architecture (adapters → validate → normalise → quality → storage → services → `/api/*` → UI) and honest **truth mode** when no licensed provider key is set. Product boards correctly refuse invented live scores.

The **customer journey is fragmented**. Navigation still centres “Live Scores / Briefing / Explorer” rather than Match Intelligence. Selecting a non-DEMO match shows a thin score panel and defers ball-by-ball intel to the Lord’s DEMO board. Match selection is local to `MatchScreen` (one-shot `sessionStorage`) and is **lost** when opening Copilot, Labs, Players, or Explorer. Copilot only learns DEMO playground via hash, not via a shared match focus.

Without a provider key (current deploy + local default): `/api/fixtures` returns **0** product rows; `/api/matches` returns **12** seeded archive + DEMO rows. The only full E2E intelligence path today is the quarantined **DEMO playground** (`#demo`).

## Architecture to preserve

| Layer | Keep |
|-------|------|
| Stack | Next.js 16 · React 19 · TypeScript · Tailwind 4 · hash SPA shell |
| Contracts | `MatchLifecycle`, `FreshnessStatus`, `Provenance`, evidence kinds |
| Providers | `demo` / `cricapi` / `sportmonks` adapters + factory |
| Pipeline | validate → normalise → quality → `CricketStorage` |
| Services | `data-service`, `match-service`, historical search/compare |
| Product engines | Match Graph, Explorer over-series, What-If calcs, Copilot rule engine |
| Integrity | Truth mode, `filterProductFixtures`, DEMO quarantine, no fake home facts |
| Player search | Catalog + search-first Players surface |

No wholesale rewrite. Incremental IA + context wiring + Match Intelligence progressive disclosure.

## Journey breaks (traced in code)

1. **Entry → Match** — Home “Live Scores” empty without key; DEMO is opt-in via CTA, not primary Match Intelligence framing.
2. **Select match** — Provider/DEMO pick works; historical seeds exist in `/api/matches` but are filtered off product fixture boards (intentional) with no dedicated Match Intelligence archive entry.
3. **Status / source / freshness** — Badges exist, but `deriveFreshness({ demoMode: true })` forced **DEMO** on *all* lifecycles (including COMPLETED), mislabelling historical seeds.
4. **Situation from facts** — DEMO has scorecard + phases; provider row shows score only; seed scorecards often have empty batting arrays (honest `missing` flags) — UI did not always surface limitations clearly.
5. **Select event / partnership / player** — Only on DEMO Match Graph / scorecard tabs.
6. **Evidence + limitations** — DEMO graph evidence works; non-DEMO path says “tabs stay on Lord’s DEMO” instead of progressive empty states.
7. **Contextual question / scenario** — Ask/Labs deep-links exist from DEMO graph, but **no shared match focus** across nav; return to match often drops selection.
8. **Return without losing context** — Broken: `selectedMatchId` is MatchScreen-local.

## Inventory (honest statuses)

| Surface / capability | Status |
|----------------------|--------|
| Hash SPA + onboarding + prefs | IMPLEMENTED AND VERIFIED (local) |
| Truth mode / empty home without key | IMPLEMENTED AND VERIFIED (local + deploy `/api/health`) |
| DEMO playground Match Graph / scorecard / sim | IMPLEMENTED AND VERIFIED (local code path; deploy UI not re-walked post-reset) |
| Provider adapters (cricapi / sportmonks) | IMPLEMENTED BUT NOT VERIFIED (unit mocks only; no keyed live call this session) |
| `/api/health`, `/api/matches`, `/api/fixtures` | IMPLEMENTED AND VERIFIED (local + deploy health; fixtures empty in truth mode) |
| Seeded historical archive | PARTIALLY IMPLEMENTED (summaries + thin scorecards; empty batting; quarantined from product fixtures) |
| Match Intelligence progressive workspace | PARTIALLY IMPLEMENTED → in reset |
| Shared match / innings / event / player context | PARTIALLY IMPLEMENTED → in reset |
| Copilot grounded refuse / DEMO answers | IMPLEMENTED AND VERIFIED (unit tests) |
| Copilot match-contextual prompts | PARTIALLY IMPLEMENTED → in reset |
| Explorer DEMO charts | IMPLEMENTED AND VERIFIED (local) |
| What-If scenario builder (rates, not win %) | IMPLEMENTED AND VERIFIED (calcs + tests) |
| Player search / catalog stubs | IMPLEMENTED AND VERIFIED (local) |
| Postgres durable storage | UNAVAILABLE OR BLOCKED (SQL sketch; memory default) |
| LLM explain layer | UNAVAILABLE OR BLOCKED (`CRICKETOS_LLM_PROVIDER=off`) |
| Fantasy / Community | MOCKED OR DEMONSTRATION ONLY |
| Live broadcast / licensed LIVE scores on deploy | UNAVAILABLE OR BLOCKED (no `CRICKETOS_DATA_API_KEY` on inspected health) |

## Data provenance audit

| Path | Provenance | Notes |
|------|------------|-------|
| Home Live Scores | Provider fixtures only | Empty when `demoMode: true` |
| DEMO playground | Bundled `data.ts` / demo adapter | Always DEMO; never LIVE |
| Seed archive | `seed-historical.ts` → normalise | HISTORICAL / UPCOMING; not product “truth”; quarantine from Copilot evidence |
| Copilot figures | Rule engine + calcs + DEMO evidence ids | Refuses invented facts without provider/DEMO |
| Explorer worm/Manhattan | England 1st DEMO over series | Multi-match charts not invented |
| What-If | Deterministic rate maths | Labelled Hypothetical; not AI predictions |
| Persistence | In-memory default | Ephemeral; not production durable |
| Deploy health (2026-10-13) | `demoMode: true`, `storageBackend: memory`, `dataApiKeyConfigured: false` | Confirmed via HTTP |

## Defects found

1. **`deriveFreshness` over-DEMO** — `demoMode: true` returned DEMO for COMPLETED/UPCOMING/LIVE alike. Fix: preserve HISTORICAL/UPCOMING/DEMO; map unverified LIVE → UNAVAILABLE.
2. **Match context not shared** — selection lost across Ask / Labs / Players / Explorer.
3. **Non-DEMO match panel dead-end** — no progressive disclosure of what *is* supported vs missing.
4. **IA mismatch** — nav labels vs “intelligence layer / match centre” positioning.
5. **Seed scorecards** — innings totals without batting rows; UI must show limitations (not invent FOW).
6. **In-memory storage** — labelled ephemeral (keep honest).

## Proposed structure (IA)

**Primary:** Cricket Today (`#home`) · Match Intelligence (`#match` / `#live`) · Ask CricketOS (`#ask`) · Players & Teams (`#players`, teams via More)

**Secondary:** Labs (What-If), Explorer, Community, Fantasy, DEMO playground (`#demo`)

**Match Intelligence workspace (progressive):**  
Header (teams, competition, score, innings, status, source/freshness) → situation → timeline when events exist → evidence/stats when supported → contextual Copilot → What-If with assumptions → related player/team → continue/return.

## Backlog (priority)

1. Shared match focus + Match Intelligence progressive UI (this reset)
2. Honest freshness for historical/upcoming under truth mode
3. Historical archive entry *inside* Match Intelligence (labelled; not home facts)
4. Contextual Copilot / What-If from focus (no false capabilities)
5. Provider key on Vercel → verify LIVE/STALE path end-to-end
6. Wire Postgres client when `DATABASE_URL` exists
7. Multi-match Explorer series from normalised balls
8. Optional LLM explain that may only restate calc + evidence

## Motion + Historical Intelligence extension (2026-10-13)

See **`docs/DESIGN.md`** for IA, tokens, and motion rules.

| Addition | Status |
|----------|--------|
| Home hero “Every match has a story…” + suggested asks + archive CTA | IMPLEMENTED |
| Primary nav **Historical Archive** (`#archive`) with filters + coverage badges | IMPLEMENTED |
| `/api/matches` year/gender/coverage/pagination + honest archive claim | IMPLEMENTED |
| Coverage metadata (`result` / `scorecard` / `innings` / `ball_by_ball`) | IMPLEMENTED |
| Seed sample extended to 1975+ (measured — **not** full 1973–present) | IMPLEMENTED |
| Voice mic only when Web Speech exists; TTS stop/replay; type fallback | IMPLEMENTED |
| `prefers-reduced-motion` disables hero/match/filter/score/live animations | IMPLEMENTED |
| Licensed LIVE / full archive / durable Postgres / LLM | UNAVAILABLE OR BLOCKED |

## Visual redesign + product experience reset (2026-10-13)

| Change | Status |
|--------|--------|
| Soft off-white canvas · navy · cricket blue · near-black type · orange CTA | IMPLEMENTED |
| Pitch green semantic-only (not default CTA) | IMPLEMENTED |
| Hero copy + Ask CricketOS prominence; honest empty live | IMPLEMENTED |
| Shared matchFocus + Match/Ask return path | PRESERVED (prior reset) |
| Architecture / adapters / truth mode / contracts | PRESERVED — no rewrite |
| Production deploy `aa16108` on cricket-intelligence-delta | VERIFIED READY (`/api/health` truth mode + memory) |

## Acceptance criteria (reset)

- [x] `docs/PRODUCT_RESET.md` present with inventory statuses
- [x] Primary nav matches IA; secondary routes retained with paths back
- [x] DEMO playground E2E path wired: situation → timeline/graph → evidence → Ask/What-If → return with shared `matchFocus`
- [x] Truth mode: home does not invent scores; freshness preserves HISTORICAL/UPCOMING under demoMode
- [x] Seeds not used as Copilot live evidence (quarantine answer + filter)
- [x] Historical Archive filters + coverage provenance + honest 1973 claim
- [x] Motion language + reduced-motion; voice graceful fallback
- [x] `npm test` (89 pass) / `lint` / `typecheck` / `build` — verified 2026-10-13
- [x] Deploy production `52a7868` READY on cricket-intelligence-delta; `/api/health` truth mode; archive filters measured 1975+

## Risks / deferred

- No licensed key → cannot verify real LIVE fixtures this session
- Seed batting empty → historical depth limited until provider scorecards
- Fantasy/Community remain secondary demo surfaces
- Vercel redeploy may lag git push; verify via `/api/health` + UI walk
- Full redesign of MatchScreen tabs deferred beyond progressive shell + context

## Operating principles (unchanged)

Inspect before editing. Incremental. Honest status labels. Never fabricate data/tests/status. Don’t add major features while core journey fragmented. Don’t claim deploy verified unless inspected. Don’t imply unlicensed data is production-ready. Distinguish facts / deterministic calcs / simulations / AI explanations.
