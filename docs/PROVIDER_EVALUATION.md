# Provider evaluation (Stage 5)

**Evaluated:** 2026-10-12  
**Method:** Official documentation and published pricing pages only. No live credentialed calls were made in this session.  
**Scraping:** ESPNcricinfo / Cricbuzz are **out of scope** (ToS / legal risk).

Legend: **Verified** = stated on linked official page; **Assumption** = inferred for CricketOS architecture and must be confirmed before go-live.

---

## 1. CricketData.org (CricAPI)

| Topic | Finding | Evidence |
|-------|---------|----------|
| Base URL | `https://api.cricapi.com/v1` | [OpenAPI matches](https://raw.githubusercontent.com/api-evangelist/cricapi/refs/heads/main/openapi/cricapi-matches-api-openapi.yml) |
| Auth | Query `apikey` (GUID) | Same OpenAPI `securitySchemes.apiKeyQuery` |
| Matches list | `GET /matches?apikey=&offset=` | OpenAPI `/matches` |
| Current / live list | `GET /currentMatches` — docs recommend polling at most 2–3×/day unless live scoring needed | OpenAPI `/currentMatches` description |
| Scorecard | `GET /match_scorecard?apikey=&id=` (Fantasy scorecard path) | [Python samples](https://cricketdata.org/python-code-samples/); [Fantasy OpenAPI](https://raw.githubusercontent.com/api-evangelist/cricapi/refs/heads/main/openapi/cricapi-fantasy-api-openapi.yml) |
| Ball-by-ball | Marketed on site; Fantasy OpenAPI describes ball-by-ball when `fantasyEnabled` | [Home](https://cricketdata.org/); Fantasy OpenAPI `fantasyEnabled` field |
| Players | `GET /players` with search (sample code) | [Python samples](https://cricketdata.org/python-code-samples/) |
| Historical | OpenAPI info text: historical match data “back to 2000” | OpenAPI `info.description` — treat coverage depth as **assumption** until keyed verification |
| Pagination | `offset`; default page size 25; `info.totalRows` | OpenAPI `offset` parameter |
| Rate / quota | Response `info.hitsToday` / `hitsLimit`; daily quota model | OpenAPI `ApiInfo`; [FAQ](https://cricketdata.org/some-frequently-asked-questions-about-the-cricket-data-api-and-cricapi/) |
| Pricing (published) | Free: 100 hits/day; paid tiers change volume (e.g. S $5.99/mo 2000 hits/day …). Fantasy APIs paid / credit penalty on free | [Pricing](https://cricketdata.org/pricing/); [Blog fantasy note](https://cricketdata.org/blog/) |
| Latency honesty | Site states free data is “a few minutes behind real-time” (legal norms) | [Pricing](https://cricketdata.org/pricing/) |

**Licensing questions (unanswered without commercial agreement):**
- Redistribution / caching TTL allowed for our product?
- Display attribution requirements?
- Fantasy vs basic scorecard license for Match Room?
- Commercial app use on Lifetime Free plan?

---

## 2. Sportmonks Cricket API

| Topic | Finding | Evidence |
|-------|---------|----------|
| Base URL | `https://cricket.sportmonks.com/api/v2.0/` | [Getting started](https://docs.sportmonks.com/v2/cricket-api/getting-started/getting-started) |
| Auth | `api_token` query (MySportmonks token) | Same getting-started page |
| Fixtures | `GET /fixtures`, `GET /fixtures/{ID}` | [All fixtures](https://docs.sportmonks.com/v2/cricket-api/our-api/fixtures/get-all-fixtures); [By ID](https://docs.sportmonks.com/v2/cricket-api/our-api/fixtures/get-fixture-by-id) |
| Livescores | Livescores endpoints listed | [All endpoints](https://docs.sportmonks.com/v2/cricket-api/getting-started/all-endpoints) |
| Scoreboards | Includes: `scoreboards`, `batting`, `bowling`, `runs` | [Scoreboards](https://docs.sportmonks.com/v2/cricket-api/relationships/scoreboards) |
| Ball-by-ball | Include `balls` on fixture/livescores | Same scoreboards page |
| Players / teams | Dedicated Players, Teams, Player career stats endpoints | [All endpoints](https://docs.sportmonks.com/v2/cricket-api/getting-started/all-endpoints) |
| Rate limit | Default **2000 calls per endpoint per hour**; HTTP 429 when exceeded | [Rate limit](https://docs.sportmonks.com/v2/cricket-api/api-rate-limit) |
| Pricing (published) | Major €29 / World €75 / Enterprise €125 per month (ex-VAT); 14-day trial; same fields & 2000 calls/hour; plan differs by league count | [Sportmonks Cricket API](https://www.sportmonks.com/cricket-api/) |

**Licensing questions:**
- Cache / store historical fixtures for analytics?
- Attribution on consumer UI?
- Trial vs production token restrictions?
- League entitlement for Test cricket needed by CricketOS?

---

## 3. Others (not primary)

| Provider | Notes | Evidence / stance |
|----------|-------|-------------------|
| ESPNcricinfo / Cricbuzz | Rich editorial; **do not scrape** | Product rule / ToS risk |
| ICC open data | Limited; not a full ball-by-ball feed | Prior audit — not re-verified as full feed this session |
| OpenAI / Anthropic | Optional **explain** layer only; must not invent numbers | Existing `CRICKETOS_LLM_*` contract |

---

## Recommendation

| Role | Choice | Why |
|------|--------|-----|
| **Primary (when licensed)** | **Sportmonks Cricket** | Documented fixture includes for scoreboards + `balls` in one request; structured entities; published hourly rate limits suitable for controlled ingestion |
| **Fallback / low-cost exploration** | **CricketData.org (CricAPI)** | Free tier for smoke tests; match lists + current matches; scorecard/ball paths gated by Fantasy/`fantasyEnabled` — confirm license before Match Room LIVE |

**CricketOS default without credentials remains `demo`.** Adapters are implemented against mocked responses; no live scores are claimed until a key is configured and health checks pass.

### Assumptions to verify with a real key

1. Sportmonks Test match ball coverage for target series (**assumption** until keyed).
2. CricAPI `match_scorecard` sufficiency for non-fantasy Match Room (**assumption** — Fantasy path documented).
3. Exact commercial redistribution terms for both vendors (**not verified**).
