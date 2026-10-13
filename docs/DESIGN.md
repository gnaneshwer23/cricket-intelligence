# CricketOS Design Notes

**Date:** 2026-10-13  
**Companion:** `docs/PRODUCT_RESET.md`

## Information architecture

| Priority | Surface | Hash | Job |
|----------|---------|------|-----|
| Primary | Cricket Today | `#home` | Hero ask + honest today board + archive entry |
| Primary | Match Intelligence | `#match` / `#live` / `#demo` | Match is the centre — progressive workspace |
| Primary | Historical Archive | `#archive` | Discover normalised matches with filters + coverage |
| Primary | Ask CricketOS | `#ask` | Conversational interface over evidence |
| Primary | Players & Teams | `#players` | Search-first profiles |
| Secondary | Explorer (charts) | `#explorer` | DEMO over-series charts |
| Secondary | Labs / Feed / Teams / Community / Fantasy | respective hashes | Later surfaces |

**Match focus** (`matchFocus` in app-state + sessionStorage) survives nav. Seeds are browseable HISTORICAL; DEMO is opt-in; neither is LIVE without a provider key.

## Tokens

Inspire from Granger-adjacent navy / blue-grey / warm accent while keeping CricketOS lime recognisable.

| Token | Role | Notes |
|-------|------|-------|
| `--cos-navy` `#03314C` | Deep brand plane | Hero / sidebar atmosphere |
| `--cos-deep` `#084E6E` | Elevated panels | Scoreboard wash |
| `--cos-blue` `#236686` | Secondary accent | Links, cyan companion |
| `--cos-slate` `#768794` | Muted text companion | Labels |
| `--cos-mist` `#B1B7C0` | Soft foreground | Supporting lines |
| `--cos-warm` `#D83C16` | Urgent / LIVE cue | Never decorative alone |
| `--color-lime` | Primary CTA / brand spark | Existing CricketOS lime |

Contrast: body text on navy ≥ WCAG AA; muted uses mist/slate on dark navy, not low-contrast grey-on-grey.

## Motion rules

1. **First-load hero** — brand + headline stagger (`cos-hero-in` / delay / stagger).
2. **Primary content** — section stagger (`cos-stagger` children), not perpetual loops.
3. **Match select → detail** — short fade/slide (`cos-match-enter`); no layout thrash.
4. **Score tick** — `cos-score-tick` only when provider/DEMO score value actually changes.
5. **Charts / filters** — soft opacity/transform on filter apply.
6. **Panels** — expand/collapse height+opacity; Ask focus ring transition.
7. **Match Graph** — restrained edge highlight on select; no fake live pulse.
8. **`prefers-reduced-motion: reduce`** — all named animations disabled; no infinite pulses.

**Forbidden:** perpetual fake LIVE pulse on demo/home without a real LIVE provider row.

## Gaps (honest)

| Gap | Status |
|-----|--------|
| Licensed LIVE fixtures | Blocked without `CRICKETOS_DATA_API_KEY` |
| Full 1973–present archive | Not claimed — seed sample + provider when keyed |
| Ball-by-ball for seeds | Missing; coverage level = result/scorecard |
| Voice mic | Available only when Web Speech API exists; else hidden |
| Durable Postgres | Memory default until `DATABASE_URL` |
| LLM explain | Off by default |
