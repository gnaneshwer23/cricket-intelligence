/**
 * Detect browser voice capabilities — used by Ask / Home.
 * Mic UI must stay hidden when recognition is unsupported (no decorative mic).
 */

export type VoiceCapability = {
  recognition: boolean;
  tts: boolean;
  reason?: string;
};

export function detectVoiceCapability(
  globalObj: {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
    speechSynthesis?: unknown;
    SpeechSynthesisUtterance?: unknown;
  } | null
    | undefined,
): VoiceCapability {
  if (!globalObj) {
    return {
      recognition: false,
      tts: false,
      reason: "No window — voice unavailable.",
    };
  }
  const recognition = Boolean(
    globalObj.SpeechRecognition || globalObj.webkitSpeechRecognition,
  );
  const tts = Boolean(globalObj.speechSynthesis && globalObj.SpeechSynthesisUtterance);
  if (!recognition && !tts) {
    return {
      recognition: false,
      tts: false,
      reason: "Speech recognition and TTS unsupported in this browser.",
    };
  }
  if (!recognition) {
    return {
      recognition: false,
      tts,
      reason: "Speech recognition unsupported — mic hidden; type instead.",
    };
  }
  return { recognition: true, tts };
}
