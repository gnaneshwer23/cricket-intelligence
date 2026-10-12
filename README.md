# CricketOS

**Follow the match. Understand the game. Explore what happens next.**

Interactive cricket intelligence — Match Room, grounded Copilot, player DNA, and what-if labs.  
**DEMO mode by default:** the Lord’s England vs India board is a bundled illustrative dataset. It is **not** a live score, official record book, or betting product.

## Run

```bash
npm install
npm run dev -- --port 41731
```

Open [http://localhost:41731](http://localhost:41731).

```bash
npm run build    # production build
npm run test     # deterministic calc tests
npm run lint
```

## Environment

Copy `.env.example` → `.env.local`. Secrets stay **server-side only** (never `NEXT_PUBLIC_` for API keys).

| Variable | Default | Purpose |
|----------|---------|---------|
| `CRICKETOS_DATA_PROVIDER` | `demo` | `demo` \| `cricapi` \| `sportmonks` (live providers not wired yet) |
| `CRICKETOS_DATA_API_KEY` | — | Server-only data API key |
| `CRICKETOS_LLM_PROVIDER` | `off` | `off` \| `openai` \| `anthropic` |
| `CRICKETOS_LLM_API_KEY` | — | Server-only LLM key (explain layer only) |
| `CRICKETOS_LLM_MODEL` | — | Optional model id |

With no live credentials, the app stays in **DEMO** and labels match status accordingly. See `docs/PROVIDERS.md`.

## Product surfaces

| Surface | Route (hash) | Status |
|---------|--------------|--------|
| Intelligence Briefing | `#home` | Shipped |
| Cricket Copilot | `#ask` | Grounded rule engine + deterministic calcs + evidence |
| Match Room | `#match` | DEMO board · Match Graph · provenance |
| Player Intelligence | `#players` | Filters + sample-size warnings |
| My Cricket | `#feed` | Personalisation |
| Team Intelligence | `#teams` | Secondary |
| Community | `#community` | Secondary / light |
| Fantasy | `#fantasy` | Experimental |
| Labs (What-If) | `#labs` | Hypothetical · labelled |

Press `/` to jump to Copilot.

## Data honesty

- **DEMO** — bundled illustrative match / authored DNA
- **UPCOMING** — fixture with no ball in play
- **HISTORICAL** — career / archive file
- **Model** — session win prior / projections
- **Hypothetical** — what-if & ball simulations

Copilot pipeline (current): classify intent → retrieve from demo file → **calculate** (phase lead, SR, milestones, win swing) → explain with citations. No connected LLM unless configured; never invent numbers beyond the dataset.

## Docs

- `docs/AUDIT.md` — audit + staged plan
- `docs/PROVIDERS.md` — provider investigation (no scraping Cricbuzz/Cricinfo)

## Known limitations

- No verified live score feed yet — the Match Room strip is a **scripted DEMO simulation**, labelled as such
- LLM explain path is stubbed behind env (not implemented end-to-end)
- Explorer charts (worm/manhattan) not shipped — mark unavailable when asked
- Fantasy / Community remain light secondary surfaces
- Similarity % and many DNA values are authored demo file, not trained model outputs

## Roadmap (priority)

1. Wire a licensed data provider behind the existing contract layer
2. Optional LLM explain that may only restate calc + evidence
3. Ball-by-ball Explorer visuals when innings series exist
4. Broader calc test coverage + CI
5. Personalisation depth (alerts with real freshness)

## Keyboard

`/` — Cricket Copilot
