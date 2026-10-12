# Data quality (Stage 5)

## Invariants

| Check | Rule |
|-------|------|
| Provenance | Every match has `provenance.source` + `asOf` |
| DEMO honesty | `status=DEMO` ⇒ `freshness=DEMO`; never `LIVE` + `DEMO` freshness |
| Score non-negative | runs/wickets ≥ 0; overs parseable via cricket ball arithmetic |
| Scorecard runs | Σ batting runs + extras.total = innings.score.runs |
| Scorecard wickets | dismissals (non not-out) should align with wickets (warn on mismatch) |
| Ball parts | `runsOffBat + extras = totalRuns` per ball |
| Ball totals | When a complete series is asserted, Σ ball.totalRuns = innings runs |
| No fabrication | Missing second innings / wagon wheels / over series → empty state |

## Test data

Synthetic fixtures live in `src/lib/__tests__/fixtures/synthetic-match.ts` and are labelled `SYNTHETIC_TEST_DATA` in provenance. They are **not** live or official records.

## Suite

```bash
npm test
```

Includes: `quality.test.ts`, `adapters.test.ts` (mocked HTTP), `ingestion.test.ts`, `historical.test.ts`, `contracts.test.ts`, plus existing calc/innings tests.

## Operator signals

- `/api/ingestion/status` — run counts, storage label, freshness histogram (no secrets)
- Quality failures skip upsert of bad matches (errors recorded on the ingestion run)
