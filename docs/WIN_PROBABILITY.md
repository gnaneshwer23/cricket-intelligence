# Win Probability v1 (T20)

**Model:** `t20-wp-v1` · trained 2026-10-18 · coefficients in `src/lib/winprob/model-v1.json`
**API:** `GET /api/stats/winprob/:matchId` returns the per-ball worm, turning points, caveats and SQL evidence. `pBattingFirst` is P(team batting first wins).
**Reproduce:**

```bash
npm run winprob:train
npm run winprob:backfill
```

Both need `DATABASE_URL` pointing at Postgres with Cricsheet IPL ingested.

## What it is

There are two logistic regressions, evaluated in TypeScript, with no Python at runtime:

| Innings | Predicts | Features |
|---|---|---|
| 1st | P(batting first wins) | runs/par, wickets, balls bowled, runs × balls left, wickets × balls left, wickets², par/180, Impact Player era flag |
| 2nd (chase) | P(chasing team wins) | runs needed/par, balls left, wickets left, required rate ÷ par rate (capped at 3), ln((needed+1)/(balls left+1)), wickets left × balls left, target/par, Impact Player era flag |

- **Season par** is the *previous* season's mean completed first-innings total (for example, 2025 uses 2024's 190.1). It's known before each season starts, so there's no leakage. 2008 uses a default of 160.
- **Settled chases** are decided by rule, not by the model: target reached = 1; out of balls or wickets short of the target = 0; scores level at the end = 0.5.
- **Fitting** uses damped Newton (IRLS) with L2 of 1e-3; the intercept is not penalised. Code is in `src/lib/winprob/train.ts`. Training and serving share the feature code in `model.ts`.
- **Recency weighting** half-lives of none, 8, 4 and 2 years were compared on the **2024 season only**. "None" was chosen (Brier differences under 0.001), so the holdout was never used for tuning.

## Data

- **Source:** Cricsheet IPL ball-by-ball, 1,243 matches and 295,557 deliveries (super overs excluded).
- **Excluded:** 60 matches with a D/L revised target, a tie, no result, reduced overs (first innings short of 20 overs without being bowled out) or no chase.
- **Train:** 2008–2024, 1,045 matches. **Holdout:** 2025–2026, 138 matches, evaluated once.
- **Samples:** every post-delivery state plus each innings start. Settled chase states are not used for training.

## Holdout results (2025–2026)

### First innings: P(batting first wins), 17,391 states

| Model | Brier ↓ | Log loss ↓ | ECE ↓ |
|---|---|---|---|
| Constant (train base rate 0.463) | 0.2457 | 0.6846 | 0.039 |
| Linear baseline (runs, wickets, balls) | 0.2273 | 0.6473 | 0.117 |
| **v1** | **0.2203** | **0.6308** | **0.085** |

| Predicted | n | Mean predicted | Observed |
|---|---|---|---|
| 0.0–0.1 | 26 | 0.087 | 0.000 |
| 0.1–0.2 | 301 | 0.151 | 0.096 |
| 0.2–0.3 | 904 | 0.261 | 0.070 |
| 0.3–0.4 | 2,083 | 0.356 | 0.143 |
| 0.4–0.5 | 4,716 | 0.458 | 0.342 |
| 0.5–0.6 | 5,109 | 0.547 | 0.540 |
| 0.6–0.7 | 2,978 | 0.645 | 0.573 |
| 0.7–0.8 | 1,122 | 0.736 | 0.702 |
| 0.8–0.9 | 152 | 0.827 | 0.770 |

### Chase: P(chasing team wins), 15,914 states

| Model | Brier ↓ | Log loss ↓ | ECE ↓ |
|---|---|---|---|
| Constant (train base rate 0.520) | 0.2480 | 0.6892 | 0.039 |
| Linear baseline (needed, balls left, wickets left) | 0.1526 | 0.4687 | 0.128 |
| **v1** | **0.1186** | **0.3798** | **0.081** |

| Predicted | n | Mean predicted | Observed |
|---|---|---|---|
| 0.0–0.1 | 1,938 | 0.037 | 0.002 |
| 0.1–0.2 | 1,439 | 0.150 | 0.104 |
| 0.2–0.3 | 1,376 | 0.249 | 0.169 |
| 0.3–0.4 | 1,402 | 0.352 | 0.315 |
| 0.4–0.5 | 1,557 | 0.449 | 0.495 |
| 0.5–0.6 | 1,427 | 0.550 | 0.699 |
| 0.6–0.7 | 1,315 | 0.651 | 0.841 |
| 0.7–0.8 | 1,430 | 0.752 | 0.922 |
| 0.8–0.9 | 1,671 | 0.850 | 0.958 |
| 0.9–1.0 | 2,359 | 0.955 | 0.967 |

### Start of chase: one prediction per match (n = 138)

Brier 0.192 against 0.247 for the constant. The favourite won 71.7% of the time.

## Honest reading

- **v1 beats both baselines on every metric in both innings.** It isn't well calibrated in 2025–26, though.
- **Chasers are under-predicted.** From a predicted 0.5 upward, chasing teams won 15–20 points more often than the model says (0.55 predicted → 0.70 observed, 0.75 → 0.92). The cause is in the data:
  - Chase win rate was 54.9% in 2008–22, **48.3% in 2023–24** and **57.9% in the 2025–26 holdout**.
  - The first two Impact Player seasons favoured batting first; 2025–26 swung back to chasing.
  - A model trained through 2024 can't see that reversal. Recency weighting, validated on 2024, didn't help.
- **The first innings over-rates the side batting first** in the 0.2–0.5 band (for example, 0.36 predicted → 0.14 observed). It's the same shift seen from the other side.
- **Effective sample is small.** The holdout is 138 matches; per-ball states within a match are highly correlated, so bin-level gaps carry real uncertainty.
- **The innings break is discontinuous.** The two models are fitted separately, so P can jump between the last first-innings ball and the chase start. One example: KKR at 222/3 after 18.1 overs read 0.73, then 0.87 at the start of chasing 223. Turning points ignore this jump.

## Caveats the API attaches

- D/L revised targets set `reliable: false`, because the chase uses the unrevised target and Cricsheet's revised target isn't stored yet.
- Reduced-overs matches set `reliable: false`, because the model assumes 20 overs.
- Ties are decided by a super over, which the model doesn't cover.
- Non-IPL T20s are treated as indicative only, because the model was trained on IPL.
- Every response carries the 2025–26 chase under-prediction note.

## v2 backlog

1. Recalibrate on the most recent complete season (Platt or isotonic) once 2026 can be validated against 2027.
2. A single model across both innings (projected first-innings total feeding the chase), to remove the innings-break jump.
3. Store Cricsheet revised targets and scheduled overs so D/L and reduced-overs matches can be modelled.
4. Venue and toss features, and team-strength priors.
5. Train on all men's T20 (T20Is, BBL, PSL, CPL, SA20) with a competition term.
6. Publish the reliability chart on the public trust page and refresh it after every season.
