# CricketOS

**ChatGPT for Cricket** — an AI copilot for fans.

Positioning: Fan → AI → Answers → Predictions → Community → Action.  
Hero: **Ask Cricket Anything.**

Not a score app, news feed, or fantasy platform. The score is the start of the screen, not the whole of it. Copy and numbers are an illustrative model for this demo — not an official scorecard, record book, or betting product.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port printed by Next.js).

## MVP screens

1. **Home** — brand-first daily AI briefing, live match, trending asks, recommended questions, smart alerts
2. **Ask Cricket** — conversational query engine with structured answers, confidence, figures, follow-ups, Cricket Twin
3. **Match Centre** — above-expected, momentum, key matchup, turning point, predictions, fan mood, AI session report
4. **Player Intelligence** — career DNA, living traits (Aggressive / Technical / …), forecast, similarities, Twin
5. **My Feed** — favourites, saved/recent chats, alerts, predictions, England-only preference

First visit runs a short onboarding (favourite teams + players), persisted in `localStorage`, then seeds Ask with a personal England briefing.

## Also available (de-emphasised)

Teams, Community, Fantasy, and Labs stay reachable under **Later** / **More**. They are not the primary journey.

## Keyboard

Press `/` to jump to Ask Cricket.
