# Cricket data & AI providers

CricketOS is **provider-independent**. Credentials stay server-side via env vars. With no provider configured, the app runs in **DEMO mode** on the bundled Lord’s illustrative dataset.

## Investigated (not integrated this session)

| Provider | Fit | Notes |
|----------|-----|--------|
| **CricketData.org / CricAPI** | Match lists, scorecards | Commercial API; needs key; good for LIVE when verified |
| **Sportmonks Cricket** | Live + historical | Paid; structured fixtures |
| **ESPNcricinfo / Cricbuzz** | Rich editorial | **Do not scrape** — ToS / legal risk |
| **ICC open data** | Limited | Not a full ball-by-ball feed |
| **OpenAI / Anthropic** | Explain layer only | Optional; must not invent numbers — explain calc outputs |

## Env vars (see README)

| Variable | Purpose |
|----------|---------|
| `CRICKETOS_DATA_PROVIDER` | `demo` (default) \| future: `cricapi` \| `sportmonks` |
| `CRICKETOS_DATA_API_KEY` | Server-only API key (never `NEXT_PUBLIC_`) |
| `CRICKETOS_LLM_PROVIDER` | `off` (default) \| `openai` \| `anthropic` |
| `CRICKETOS_LLM_API_KEY` | Server-only LLM key |
| `CRICKETOS_LLM_MODEL` | Optional model id |

## Pipeline (target)

`classify intent → retrieve facts → deterministic calculate → explain (LLM or rule) → cite evidence → validate numbers against calc outputs`

Demo mode skips external retrieve and uses the local contract dataset with explicit DEMO provenance.
