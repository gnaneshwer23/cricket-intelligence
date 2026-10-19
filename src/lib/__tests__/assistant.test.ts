import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { UIMessage } from "ai";
import { allowRequest, assistantModel, MAX_MESSAGES, trimConversation } from "../assistant/guard.ts";
import { expandCompetition } from "../assistant/tools.ts";
import { verifyNumbers } from "../assistant/verify.ts";

const tool = {
  batter: "V Kohli",
  bowler: "JJ Bumrah",
  balls: 108,
  runs: 159,
  dismissals: 5,
  strikeRate: 147.22,
  average: 31.8,
  matches: 18,
  pBattingFirstAtStart: 0.4329,
  asOf: "2026-10-19T12:07:48.341Z",
};

describe("assistant number verifier", () => {
  it("accepts numbers copied, rounded or converted to percentages", () => {
    const ok = verifyNumbers(
      "Kohli scored 159 off 108 balls vs Bumrah (SR 147.22, ~147), out 5 times in 18 matches; 43% at the start. As of 12:07 UTC.",
      { question: "Kohli vs Bumrah", toolOutputs: [tool] },
    );
    assert.deepEqual(ok, { ok: true });
  });

  it("flags invented figures (the real failure we saw: 58 off 44, out 3 times)", () => {
    const bad = verifyNumbers("Kohli has scored 58 runs off 44 balls; Bumrah dismissed him 3 times.", {
      question: "Kohli vs Bumrah head-to-head",
      toolOutputs: [{ players: [{ id: "cs-ba607b88", name: "V Kohli", matches: 282 }] }],
    });
    assert.equal(bad.ok, false);
    assert.deepEqual(!bad.ok && bad.unverified, ["58", "44", "3"]);
  });

  it("allows numbers the user supplied", () => {
    assert.deepEqual(verifyNumbers("In IPL 2016 he made 973.", { question: "IPL 2016 runs?", toolOutputs: [{ runs: 973 }] }), {
      ok: true,
    });
  });
});

describe("assistant guards", () => {
  const msg = (role: "user" | "assistant", text: string, id: string): UIMessage => ({
    id,
    role,
    parts: [{ type: "text", text }],
  });

  it("keeps only the recent conversation and rejects oversized questions", () => {
    const many = Array.from({ length: 20 }, (_, i) => msg(i % 2 ? "assistant" : "user", `q${i}`, `m${i}`));
    const t = trimConversation(many);
    assert.ok(t.ok && t.messages.length === MAX_MESSAGES);
    assert.equal(trimConversation([msg("user", "x".repeat(2000), "a")]).ok, false);
    assert.equal(trimConversation([]).ok, false);
  });

  it("rate-limits a client within a minute", () => {
    const now = 1_000_000;
    let allowed = 0;
    for (let i = 0; i < 20; i += 1) if (allowRequest("test-client", now + i)) allowed += 1;
    assert.equal(allowed, 12);
    assert.equal(allowRequest("test-client", now + 61_000), true, "window slides");
  });

  it("defaults to a free-tier gateway model unless overridden", () => {
    const prev = process.env.CRICKETOS_ASSISTANT_MODEL;
    delete process.env.CRICKETOS_ASSISTANT_MODEL;
    assert.equal(assistantModel(), "google/gemini-2.5-flash");
    process.env.CRICKETOS_ASSISTANT_MODEL = "anthropic/claude-haiku-5.5";
    assert.equal(assistantModel(), "anthropic/claude-haiku-5.5");
    if (prev === undefined) delete process.env.CRICKETOS_ASSISTANT_MODEL;
    else process.env.CRICKETOS_ASSISTANT_MODEL = prev;
  });

  it("expands competition short names", () => {
    assert.equal(expandCompetition("IPL"), "Indian Premier League");
    assert.equal(expandCompetition("Big Bash"), "Big Bash");
    assert.equal(expandCompetition(""), undefined);
  });
});
