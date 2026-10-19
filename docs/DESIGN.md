# CricketOS Design Notes

**Date:** 2026-10-13 (visual redesign pass)  
**Companion:** `docs/PRODUCT_RESET.md`  
**Visual inspiration (not a pixel copy):** Granger Health landing — soft canvas, bold type, restrained accent.

## Audit snapshot (what works / gaps)

| Area | Works | Gap / plan |
|------|-------|------------|
| Hash SPA + `matchFocus` | Persist across Match / Ask / Archive / Players | Keep; polish strip for light canvas |
| Truth mode + adapters | Honest empty fixtures without key | Do not invent LIVE |
| Archive filters + coverage | `/api/matches` pagination + seed sample | Never claim full 1973–present |
| DEMO Match Graph E2E | Situation → evidence → Ask / What-If | Primary full-depth path without key |
| Design tokens | Navy family present | **Reset:** soft off-white canvas; orange CTA; pitch green semantic-only |
| Motion | Named entrances + reduced-motion | Keep; no decorative delay loops |
| Voice | Web Speech gated | Hide mic when unsupported |
| Durable Postgres | Memory default | Label ephemeral only |

## Information architecture

| Priority | Surface | Hash | Job |
|----------|---------|------|-----|
| Primary | Cricket Today | `#home` | Brand hero + Ask + honest today / archive entry |
| Primary | Match Intelligence | `#match` / `#live` / `#demo` | Match centre — progressive workspace |
| Primary | Historical Archive | `#archive` | Verified filters + coverage |
| Primary | Ask CricketOS | `#ask` | Evidence-grounded Q&A |
| Primary | Players & Teams | `#players` | Search-first profiles |
| Secondary | Explorer / Labs / Feed / … | respective hashes | Later surfaces |

**Promise:** Understand every match. Explore the evidence. Ask cricket anything.

## Tokens (visual redesign)

Soft off-white product canvas — distinct CricketOS identity (not Granger clone).

| Token | Value | Role |
|-------|-------|------|
| `--cos-canvas` | `#FBFAF7` | Warm white page plane ("daylight at the ground") |
| `--cos-sky` | `#CFE3F4` | Soft sky glow (canvas top-right, hero) |
| `--cos-turf` | `#D8EDD9` | Faint turf glow (canvas bottom-left, hero pitch strip) |
| `--sidebar` | white 82% (frosted) | Light rail with navy type; orange pill for the active item |
| `--cos-navy` | `#03314C` | Deep brand / nav / hero wash |
| `--cos-deep` | `#084E6E` | Elevated navy panels |
| `--cos-blue` | `#236686` | Cricket blue links / secondary |
| `--cos-ink` | `#12171C` | Bold near-black type |
| `--cos-slate` | `#5C6B76` | Muted labels |
| `--cos-mist` | `#9AA3AD` | Soft supporting lines |
| `--cos-action` | `#E85D04` | Restrained **orange** primary CTA |
| `--cos-pitch` / `--color-lime` | pitch green | **Semantic only** (LIVE / pitch cues) — not default CTA |
| `--cos-warm` | `#D83C16` | Urgent LIVE / error companion |

Contrast: body ink on canvas ≥ WCAG AA; navy type on off-white; orange CTAs with white label text.

## Motion rules

1. **First-load hero** — brand + headline stagger (`cos-hero-in` / delay / stagger).
2. **Primary content** — section stagger (`cos-stagger`), not perpetual loops.
3. **Match select → detail** — `cos-match-enter`; no layout thrash.
4. **Score tick** — only when score value actually changes.
5. **Filters / panels** — soft opacity/transform on apply.
6. **Ask focus** — orange-tinted focus ring.
7. **`prefers-reduced-motion: reduce`** — all named animations disabled; no infinite pulses.

**Forbidden:** perpetual fake LIVE pulse without a real LIVE provider row; decorative mic when Web Speech missing.

## Home composition (Cricket Today)

Hero budget: **CricketOS** (brand) · one headline · one support line · Ask CTA group · no stats strip / schedule clutter.  
Headline: *Every match has a story. Find the evidence.*  
Support: *Explore cricket history, understand match situations and investigate the numbers behind every result.*  
Featured match only when provider/fixture data supports it. Historical section + entries to Match / Players / Teams. Honest empty when no live.
