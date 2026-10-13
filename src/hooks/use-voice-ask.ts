"use client";

/**
 * Web Speech voice for Ask — mic only when SpeechRecognition exists.
 * Decorative mic is forbidden: unsupported browsers get no mic button.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { detectVoiceCapability } from "@/lib/voice-capability";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function initialCaps() {
  if (typeof window === "undefined") {
    return { recognition: false, tts: false };
  }
  return detectVoiceCapability(
    window as Window & {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    },
  );
}

export type VoiceAskState = {
  supported: boolean;
  ttsSupported: boolean;
  listening: boolean;
  speaking: boolean;
  permission: "unknown" | "granted" | "denied" | "unsupported";
  error: string | null;
  transcript: string;
  interim: string;
};

export function useVoiceAsk(opts?: { onTranscript?: (text: string) => void }) {
  const onTranscriptRef = useRef(opts?.onTranscript);
  const caps = initialCaps();
  const [state, setState] = useState<VoiceAskState>(() => ({
    supported: caps.recognition,
    ttsSupported: caps.tts,
    listening: false,
    speaking: false,
    permission: caps.recognition ? "unknown" : "unsupported",
    error: null,
    transcript: "",
    interim: "",
  }));
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    onTranscriptRef.current = opts?.onTranscript;
  }, [opts?.onTranscript]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setState((s) => ({ ...s, listening: false }));
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setState((s) => ({
        ...s,
        supported: false,
        permission: "unsupported",
        error: "Speech recognition is not supported in this browser.",
      }));
      return;
    }
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    const recognition = new Ctor();
    recognition.lang = "en-GB";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i]?.[0]?.transcript ?? "";
        if (event.results[i]?.isFinal) finalText += piece;
        else interim += piece;
      }
      setState((s) => {
        const transcript = finalText
          ? `${s.transcript} ${finalText}`.trim()
          : s.transcript;
        const live = `${transcript} ${interim}`.trim();
        if (live) onTranscriptRef.current?.(live);
        return {
          ...s,
          transcript,
          interim,
          error: null,
          permission: "granted",
        };
      });
    };
    recognition.onerror = (event) => {
      const code = event.error ?? "error";
      const denied = code === "not-allowed" || code === "service-not-allowed";
      setState((s) => ({
        ...s,
        listening: false,
        permission: denied ? "denied" : s.permission,
        error: denied
          ? "Microphone permission denied. You can still type your question."
          : `Voice error: ${code}. You can still type.`,
      }));
    };
    recognition.onend = () => {
      setState((s) => ({ ...s, listening: false, interim: "" }));
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setState((s) => ({
        ...s,
        listening: true,
        error: null,
        interim: "",
      }));
    } catch {
      setState((s) => ({
        ...s,
        listening: false,
        error: "Could not start the microphone. You can still type.",
      }));
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setState((s) => ({ ...s, transcript: "", interim: "", error: null }));
  }, []);

  const setTranscript = useCallback((text: string) => {
    setState((s) => ({ ...s, transcript: text, interim: "" }));
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utterRef.current = null;
    setState((s) => ({ ...s, speaking: false }));
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setState((s) => ({
        ...s,
        ttsSupported: false,
        error: "Text-to-speech is not supported in this browser.",
      }));
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-GB";
    utter.rate = 1;
    utter.onend = () => setState((s) => ({ ...s, speaking: false }));
    utter.onerror = () =>
      setState((s) => ({
        ...s,
        speaking: false,
        error: "Speech playback failed. The written answer is still available.",
      }));
    utterRef.current = utter;
    setState((s) => ({ ...s, speaking: true, error: null }));
    window.speechSynthesis.speak(utter);
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    clearTranscript,
    setTranscript,
    speak,
    stopSpeaking,
  };
}
