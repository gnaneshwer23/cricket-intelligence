# CricketOS Feature Research and Next-Generation Vision

**Date:** 2026-10-18
**Method:** App Store reviews (Cricbuzz IN, ESPNcricinfo UK), Trustpilot (Cricbuzz), a 2026 app-review aggregator (Unstar, using 1–3★ App Store / Play reviews), competitor announcements (ICC, JioStar, Premier League, CricViz, ESPNcricinfo), new AI cricket startups, and the CricBench paper.
**Limits:** Reddit blocks automated access, so r/Cricket sentiment is **not** included. Review samples are small and self-selected, so treat them as directional, not statistical.

---

## 1. What fans actually complain about

| Pain (frequency across sources) | Evidence | What it means for us |
|---|---|---|
| **Ads that hijack the live view** (every source) | Full-screen and video ads between refreshes, forced 5–10s ads, a scam-style ad (Trustpilot, Jun 2026). Cricinfo reviewers say "commentary refreshes and ads shift the text". | **A calm live view is a feature in itself.** It's the #1 reason people switch apps. |
| **Losing your place / refresh behaviour** | Cricbuzz reviewers say each update scrolls the screen. Cricinfo has auto-refresh and back-button problems. Users ask to control the refresh rate. | Stable reading position, user-set refresh interval, and "jump to latest" on demand. |
| **Latency** | "About 10 mins behind" (Cricbuzz Live Activity). Slow IPL refresh. Lag on big match days (Cricbuzz, Cricinfo, CREX). | Speed is table stakes, and our licensed feed sets the ceiling. Don't sell speed, but don't be slow either. |
| **Notification spam** | Promos mixed in with match alerts. Controls are too coarse. | Alerts on *meaningful* moments only (big win-probability swings, milestones), with per-team/competition control and never promos. |
| **Stats depth hidden or removed** | The Cricinfo redesign "hid Statsguru". "Removed player stats". Users want drill-downs (a player's century list), WTC breakdowns and **typo-tolerant** name search. | Deep stats behind one search box. This is the opening Statsguru left. |
| **Platform gaps** | Requests for lock-screen Live Activities, a working widget, Apple Watch, and filtering to favourite competitions. | Live Activities and widgets as first-class surfaces. |
| **Accessibility** | A 1★ review: article text ignores accessibility settings, and the user asks for a **"listen" option**. | Listen mode and screen-reader quality. Nobody does this well. |
| **Coverage gaps** | CREX is thin on women's, domestic and small leagues. Cricsheet itself says its women's coverage is less extensive. A 2025 Women's World Cup case study found coverage share fell 22%. | Women's and associate cricket as first-class citizens is a real, underserved niche. |

**What fans praise** (and so expect from us): fast ball-by-ball, depth of data, good scorecards, quality writing, and CREX's "clean, information-dense" match view with projected scores.

---

## 2. Competitive landscape (2026)

**AI companions are now table stakes at the top, and accuracy is the weak spot.**

| Player | AI move | Gap we can exploit |
|---|---|---|
| ICC × Google | Gemini named the "AI fan companion" for the Men's T20 World Cup 2026, with an Explore Cricket hub (DLS explainers, quizzes). | Engagement content, not verified stats. |
| JioStar × OpenAI | ChatGPT for multilingual IPL 2026 queries. 60%+ of users choose voice over text. Indian languages are ~90% of IPL watch time. | Shows the demand for voice and vernacular. No published accuracy. |
| Premier League × Microsoft | Copilot "Companion" over 30 seasons of stats (football's template). Launched with pre-written prompts first. | Even the best-funded launch started constrained. Accuracy is hard. |
| ESPNcricinfo | AskCricinfo (natural-language stats; launched T20-only and self-described as "work in progress"), Superstats (Forecaster, Luck Index, Smart Stats). | Closest competitor to Ask, but it's buried, with no visible query or evidence and no public accuracy. |
| CricViz | WinViz (AI/ML win probability with "what if"), xRuns/xWickets, NLG commentary. Mainly B2B. | Its consumer app is niche. The fan-facing transparency layer is missing. |
| CREX | 50M+ installs, 4.5★. Fast, clean, projected scores. | Users report bugs in its win-probability and projected-score widgets and rising ads. |
| New AI startups (CricMind.ai, CricketEdge.ai, AllCric "Ask AI", Cricket Connect) | Prediction-heavy, self-reported accuracy ("86% of T20 WC games"). | Hype with no verification. **Being the honest one is a position.** |

**The evidence that matters most:** **CricBench** (arXiv 2512.21877, rev. Apr 2026) gives 2,654 cricket text-to-SQL questions in English, Hindi, Punjabi and Telugu. Frontier models write *runnable* SQL more than 98% of the time but get the *right answer* under 29% of the time. The best was 28.7% on IPL, and every model scored **0% on hard ODI questions**. A ChatGPT user filed a bug after 5–6 wrong answers on who opened for RCB. General AI is bad at cricket facts, so **verified accuracy is the moat.**

---

## 3. Feature priorities

Scored on demand evidence × differentiation × feasibility on our stack (Cricsheet + licensed live feed + Postgres + models).

### Tier 1: the wedge (build next)
1. **Verified Ask ("Statsguru you can talk to").**
   - Every answer shows its SQL, its row count and a link to the deliveries behind it.
   - Typo-tolerant names ("Kholi" finds Kohli).
   - Deep drill-downs: century lists, phase splits, venue-by-era.
   - **Refuses when the sample is too thin.**
   - Hindi, Telugu and Punjabi from v1, matching CricBench's languages.
2. **Calm Live Match view.**
   - Stable scroll and a user-set refresh rate.
   - No ads in the commentary flow.
   - Filter to favourite competitions.
   - Lock-screen Live Activity and widget.
   - This fixes the #1 switching reason and costs little to build.
3. **Win probability with a "why it moved" card,** publicly calibrated.
   - A reliability chart and Brier score per format, plus a corrections log.
   - CREX users already value projected scores but distrust buggy widgets. Transparency wins that trust.
4. **Matchup and situation explorer:** batter vs bowler type, by phase, venue and era, with Bayesian shrinkage and visible sample sizes.

### Tier 2: differentiators
5. **Voice and vernacular:** ask by voice and get spoken, cited answers (JioStar's 60% voice share). **Listen mode** for articles and match summaries, which also answers the accessibility gap.
6. **"Catch me up":** a 60-second, personalised recap of what you missed since you last looked, built from win-probability swings. Same engine as smart alerts.
7. **Women's and associate cricket first-class:** WPL, women's T20Is and Hundred data is already in Cricsheet. Give it equal UI weight and equal alerts.
8. **Moment-only notifications:** big win-probability swings, milestones and close finishes, with a per-team threshold and **never promos**.

### Tier 3: later or platform
9. **Grassroots:** import club scorecards (ECB Play-Cricket in the UK is the natural first market) and run the same Ask and analytics on your own club. CricHeroes (35M users, 400k matches/month) proves the scale.
10. **B2B "verified cricket answers" API and an MCP server** for publishers, creators, and *other AI assistants* (see §4).
11. **Phone-video ball tracking:** open datasets exist but the tech is immature. Research bet only.

### Don't build
- **Real-money fantasy tips:** India's 2025 online gaming law forced Dream11 to suspend paid contests and end its BCCI sponsorship. The market collapsed and there's regulatory risk.
- **Streaming, news desk, betting odds:** rights-heavy, low moat, and attract the wrong regulators.
- **Unverified "86% accurate" prediction marketing:** it would undo the brand.

---

## 4. Next-generation vision: how CricketOS becomes *the* benchmark

The incumbents compete on speed and rights, and the AI entrants compete on hype. **CricketOS competes on being provably right.**

1. **Public trust scoreboard (a live page).**
   - Ask accuracy on CricBench plus our own held-out set, by language and format.
   - Win-probability calibration (Brier, reliability curve) updated after every match.
   - A corrections log.
   - Nobody in cricket publishes this. It's marketing and a moat at the same time.
2. **CricketOS Bench.** Run frontier LLMs (GPT, Claude, Gemini, Qwen) *and* our grounded agent on CricBench plus a harder in-house suite (multi-hop, live-situation, refusal tests). Publish the leaderboard each season. When "ChatGPT gets cricket wrong" trends, we're the reference people cite.
3. **The cricket truth layer for AI assistants.** Gemini (ICC), ChatGPT (JioStar) and Copilot already front the fan conversation, and they're wrong most of the time on cricket facts. Ship an **MCP server and API** that returns cited, verified answers. Every assistant becomes a distribution channel and a B2B revenue line. This is the long-term platform play.
4. **A personal match agent.** It follows your teams, watches every ball, alerts only when the win probability swings past *your* threshold, and writes your recap in your language and voice. It sounds like a commentator but cites like an analyst.
5. **Simulate, don't predict.** "Re-run this chase 10,000 times if Bumrah bowls the 19th": model-based what-ifs, always labelled hypothetical, with assumptions shown. This extends the existing What-If Lab honestly.

**North-star metric:** verified answers delivered per match-day active user.
**Guardrail metrics:**
- Ask exact-match accuracy of at least 90% on the eval set.
- 100% refusal on unanswerable questions.
- Win-probability Brier score beats the naive baseline.
- p95 live update lag under 30s.

---

## 5. Sequencing (fits the 12-week plan in the audit)

| Weeks | Ship | Proves |
|---|---|---|
| 1–3 | Cricsheet backfill (done for IPL locally), server-rendered player/match/venue pages, typo-tolerant search | Depth, plus SEO footprint |
| 3–6 | Win probability v1 + calibration page; matchup explorer | Models are real and honest |
| 5–8 | Verified Ask (EN + HI first) + eval harness on CricBench | **The wedge**, plus first benchmark numbers |
| 7–10 | Calm live view, Live Activities/widget, moment-only alerts (needs licensed feed) | Fixes the #1 switching reason |
| 10–12 | Voice/listen, Catch me up, public trust scoreboard v1 | The differentiators |
| Next | CricketOS Bench leaderboard, MCP/API, Play-Cricket grassroots | Platform |

---

## Sources

- Cricket app reviews 2026 (Unstar): https://unstar.app/blog/cricbuzz-espncricinfo-hotstar-fancode-crex-cricket-apps-ranked-2026
- Cricbuzz on Trustpilot: https://www.trustpilot.com/review/cricbuzz.com
- ESPNcricinfo App Store reviews: https://apps.apple.com/gb/app/espncricinfo-live-cricket/id417408017
- Cricbuzz App Store reviews: https://apps.apple.com/in/app/cricbuzz-live-cricket-scores/id360466413
- CREX listing: https://apps.apple.com/us/app/-/id1370408703
- ICC × Google, T20 World Cup 2026: https://www.icc-cricket.com/media-releases/icc-google-partner-for-the-first-ever-ai-powered-icc-men-s-t20-world-cup-fuelled-by-gemini-pixel
- JioStar × ChatGPT, IPL 2026: https://www.newsbytesapp.com/news/science/jiostar-adds-openai-chatgpt-for-live-multilingual-ipl-2026-queries/tldr
- JioHotstar voice share: https://letsdatascience.com/news/jiohotstar-highlights-ai-ctv-and-commerce-roadmap-7c46c5cf
- Regional languages ~90% of IPL watch time: https://www.exchange4media.com/media-tv-news/jiostars-ishan-chatterjee-reveals-regional-languages-account-for-90-of-ipl-watch-time-158721.html
- Premier League × Microsoft Companion: https://news.microsoft.com/source/2025/07/01/premier-league-and-microsoft-announce-five-year-strategic-partnership-to-personalize-the-fan-experience-with-ai-for-1-8-billion-people/
- AskCricinfo launch: https://africa.espn.com/cricket/story/_/id/32211926/introducing-askcricinfo-artificial-intelligence-based-stats-query-tool
- ESPNcricinfo Superstats: https://www.gktoday.in/espncricinfo-ties-up-with-iit-madras-to-launch-superstats-ai-tool-to-analyse-cricket-statistics/
- CricViz × SA20 (WinViz, NLG commentary): https://www.broadcastnow.co.uk/tech-innovation/cricviz-partners-with-sa20/5189308.article
- CricBench paper: https://arxiv.org/abs/2512.21877
- ChatGPT wrong cricket answers (OpenAI forum): https://community.openai.com/t/current-affairs-or-real-time-response/1380645
- CricMind.ai launch: https://www.tribuneindia.com/news/business/cricmind-ai-launches-indias-first-ai-powered-cricket-prediction-and-analytics-platform-at-the-start-of-ipl-2026/
- CricketEdge.ai: https://www.cricket-edge.com/
- AllCric: https://apps.apple.com/app/id1642271307
- Dream11 after the gaming law: https://www.sportbusiness.com/news/dream11s-bcci-deal-ends-more-agreements-in-doubt/
- CricHeroes scale: https://t2online.in/tech/interviews/interview-wwdc-and-beyond-here-s-how-apple-app-store-is-connecting-cricheroes-go-club-step-counter-and-finma-with-a-global-audience/1455455
- Cricsheet coverage note: https://www.cricsheet.org/coverage/
- Women's World Cup 2025 coverage: https://sportnz.org.nz/about/news-and-media/news-updates/new-case-study-on-women-s-cricket-world-cup-2025/
