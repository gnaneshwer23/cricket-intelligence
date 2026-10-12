# CricketOS audit & build plan

**Date:** 2026-10-12  
**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind 4 · Radix/shadcn  
**Positioning target:** Follow the match · Understand the game · Explore what happens next.

## What works (retain)

| Area | Notes |
|------|--------|
| Hash SPA shell | `cricket-os.tsx` + `app-state.tsx` — screens, `/` → Ask, localStorage prefs |
| Onboarding | Teams/players → personal briefing seed |
| Ask Cricket | Rule engine (`engine.ts`) with structured answers, modes, Twin, save-to-feed |
| Match Centre | Scorecard, phases, report, predictions, mood, matchups, field plans, sim |
| Player Intelligence | DNA, traits, form spark, similarities, projection |
| Feed / Teams / Community / Fantasy / Labs | Secondary surfaces present |
| Design system | Dark navy/charcoal + electric lime, Fraunces display — keep |

## Limitations (original)

1. **Misleading LIVE framing** — Home “Live · 3rd Test”, matchup badges, alert `kind: "live"` imply a real feed. All board data is a fixed illustrative Lord’s demo.
2. **Hardcoded numbers everywhere** — score, win %, phases, DNA, projections live in `data.ts` / `engine.ts` with no provenance contract.
3. **“AI” is pattern-matched copy** — no classify→retrieve→calculate→explain pipeline; no optional LLM; confidence % is authored, not measured.
4. **No provider layer** — nothing env-gated; no demo-mode flag; secrets unused (good) but also no path to real data.
5. **No calculation tests** — SR, phase deltas, win swings are display-only.
6. **Incomplete IA vs product vision** — Match Graph, Explorer charts, grounded Copilot evidence, honest DEMO labels missing or thin.
7. **Secondary screens** — Fantasy/Community/Labs are illustrative; must stay labelled experimental / secondary.

## Prioritised plan

### Stage 1 (this session — must ship)
- [x] Audit + this plan
- [x] Match / answer **data contracts** + DEMO/HISTORICAL/UPCOMING/HYPOTHETICAL status
- [x] Strip misleading LIVE claims; honest DEMO badges
- [x] Provider-independent config + demo mode when no credentials
- [x] Nav/copy consistency (Intelligence Briefing, Match Room, Copilot)
- [x] Loading / empty / error honesty; README + env docs
- [x] App builds & runs on port **41731**

### Stage 2 (ship solid pieces)
- [x] Match Room timeline + Match Graph (event → player → consequence)
- [x] Phase analysis with clickable evidence links
- [x] Freshness / provenance strip on match surfaces

### Stage 3 (as quality allows)
- [x] Copilot: intent → retrieve → **deterministic calc** → explain + cite
- [x] Evidence blocks on answers; no invented figures beyond demo dataset
- [x] Player filters / sample-size warnings
- [x] Unit tests for calcs

### Stage 4 (shipped)
- [x] Cricket Explorer — worm, Manhattan, Test phase rates, filters, Match Graph links
- [x] What-If Lab scenario builder (RRR / projections / three rate scenarios) + hypothetical labels
- [x] Copilot intents for Explorer + required-rate questions (calc reuse + evidence)
- [x] Cross-links Match Room ↔ Explorer ↔ Copilot ↔ Labs
- [x] Expanded calc/innings tests; README / provider honesty
- [ ] Personalisation polish (deferred — Feed already functional)
- [x] Deployment notes (README)

## Do not claim

- Real-time official scores
- Connected LLM unless `CRICKETOS_LLM_*` configured (optional; fallback is grounded engine)
- Scraped Cricbuzz/Cricinfo data
- Win probabilities from the rate scenario builder (rates only unless an evaluated model exists)
