import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerQuestion } from "../engine.ts";
import {
  filterProductFixtures,
  isDemoMatchId,
  isNonProductArchiveId,
  SETUP_HEADLINE,
} from "../truth-mode.ts";
import { buildProviderBriefing } from "../provider-briefing.ts";

describe("truth-mode filters", () => {
  it("keeps DEMO and seed ids out of product fixtures", () => {
    const rows = [
      { id: "demo-eng-ind-lords-d2", freshness: "DEMO", status: "DEMO" },
      { id: "seed-headingley-2019", freshness: "HISTORICAL", status: "COMPLETED" },
      {
        id: "cricapi-123",
        freshness: "LIVE",
        status: "LIVE",
        provenance: { provider: "cricapi" },
      },
    ];
    const product = filterProductFixtures(rows);
    assert.equal(product.length, 1);
    assert.equal(product[0].id, "cricapi-123");
    assert.ok(isDemoMatchId("demo-eng-ind-lords-d2"));
    assert.ok(isNonProductArchiveId("seed-wc-final-2019"));
  });

  it("exposes setup headline", () => {
    assert.match(SETUP_HEADLINE, /data provider/i);
  });
});

describe("provider briefing", () => {
  it("derives bullets from fixtures only", () => {
    const items = buildProviderBriefing([
      {
        id: "a",
        title: "India vs Australia",
        status: "LIVE",
        freshness: "LIVE",
        venue: "Gabba",
        format: "test",
        homeName: "India",
        awayName: "Australia",
        score: { runs: 120, wickets: 2, overs: "30.0" },
      },
      {
        id: "b",
        title: "MI vs CSK",
        status: "UPCOMING",
        freshness: "UPCOMING",
        venue: "Wankhede",
        format: "t20",
        series: "IPL",
        homeName: "Mumbai Indians",
        awayName: "Chennai Super Kings",
      },
    ]);
    assert.ok(items.some((i) => /1 match live/i.test(i.title)));
    assert.ok(items.some((i) => /Next:/i.test(i.title)));
  });
});

describe("copilot truth mode", () => {
  it("refuses invented live facts without provider or DEMO playground", () => {
    const answer = answerQuestion("Summarise today's cricket in 30 seconds", "general", "virat-kohli", {
      providerReady: false,
      demoPlayground: false,
    });
    assert.match(answer.headline, /don.?t have that/i);
  });

  it("answers DEMO playground questions as labelled DEMO", () => {
    const answer = answerQuestion("Tell me about the DEMO playground", "general", "virat-kohli", {
      providerReady: false,
      demoPlayground: false,
    });
    assert.match(answer.headline, /DEMO playground/i);
    assert.ok(answer.figures?.some((f) => f.label === "DEMO score"));
  });

  it("uses provider fixtures when ready", () => {
    const answer = answerQuestion("What fixtures are available?", "general", "virat-kohli", {
      providerReady: true,
      historicalMatches: [
        {
          id: "cricapi-1",
          title: "India vs England",
          freshness: "LIVE",
          venue: "Lord's",
          format: "test",
          score: { runs: 88, wickets: 1, overs: "20.0" },
          teams: { home: "India", away: "England" },
        },
      ],
    });
    assert.match(answer.headline, /live/i);
    assert.ok(answer.paragraphs.some((p) => /India vs England/i.test(p)));
  });

  it("answers DEMO match-focus situation questions with evidence", () => {
    const answer = answerQuestion("What is the situation in this DEMO match?", "predictions", "joe-root", {
      providerReady: false,
      demoPlayground: true,
      matchFocus: {
        id: "demo-eng-ind-lords-d2",
        title: "England vs India (DEMO)",
        status: "DEMO",
        freshness: "DEMO",
        venue: "Lord's",
        score: { runs: 245, wickets: 4, overs: "48.2" },
        isDemo: true,
        isSeed: false,
        provenance: { source: "Bundled CricketOS demo dataset" },
      },
    });
    assert.match(answer.headline, /DEMO situation/i);
    assert.ok(answer.evidence && answer.evidence.length > 0);
  });

  it("quarantines seed match-focus from Copilot evidence", () => {
    const answer = answerQuestion("What is the situation in this match?", "general", "virat-kohli", {
      providerReady: false,
      demoPlayground: false,
      matchFocus: {
        id: "seed-headingley-2019",
        title: "England vs Australia, 3rd Test",
        status: "COMPLETED",
        freshness: "HISTORICAL",
        venue: "Headingley",
        isDemo: false,
        isSeed: true,
      },
    });
    assert.match(answer.headline, /not Copilot evidence/i);
  });
});
