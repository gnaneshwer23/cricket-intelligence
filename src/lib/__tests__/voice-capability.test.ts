import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectVoiceCapability } from "../voice-capability.ts";

describe("voice capability fallbacks", () => {
  it("hides mic when window is missing", () => {
    const caps = detectVoiceCapability(null);
    assert.equal(caps.recognition, false);
    assert.equal(caps.tts, false);
    assert.match(caps.reason ?? "", /unavailable/i);
  });

  it("hides mic when SpeechRecognition is absent", () => {
    const caps = detectVoiceCapability({
      speechSynthesis: {},
      SpeechSynthesisUtterance: function Utterance() {},
    });
    assert.equal(caps.recognition, false);
    assert.equal(caps.tts, true);
    assert.match(caps.reason ?? "", /mic hidden/i);
  });

  it("enables recognition when webkitSpeechRecognition exists", () => {
    const caps = detectVoiceCapability({
      webkitSpeechRecognition: function Fake() {},
      speechSynthesis: {},
      SpeechSynthesisUtterance: function Utterance() {},
    });
    assert.equal(caps.recognition, true);
    assert.equal(caps.tts, true);
  });
});
