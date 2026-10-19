"use client";

/**
 * Cricket Intelligence assistant — chat or speak from any screen.
 * Answers stream from /api/assistant (tool-grounded model). If the model is
 * unreachable, the built-in rules engine answers instead, clearly labelled.
 */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Loader2, Mic, MicOff, Send, Square, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { answerQuestion } from "@/lib/engine";
import { useVoiceAsk } from "@/hooks/use-voice-ask";
import { ASK_EVENT } from "@/components/app-state";

const SUGGESTIONS = [
  "What's live right now?",
  "How did Virat Kohli bat in IPL 2016?",
  "Kohli vs Bumrah head-to-head",
  "How did the IPL 2023 final swing?",
];

const TOOL_LABELS: Record<string, string> = {
  findPlayer: "Finding player",
  playerStats: "Ball-by-ball stats",
  matchup: "Head-to-head",
  liveFixtures: "Live fixtures",
  matchDetail: "Match detail",
  searchArchive: "Match archive",
  winProbability: "Win probability",
  seriesList: "Series list",
};

/** Rules-engine answer shown under the Nth user message when the model failed. */
type FallbackAnswer = { userIndex: number; text: string };

function messageText(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

type Grounding = { tools: string[]; verified: boolean; retried: boolean };

function groundingOf(m: UIMessage): Grounding | null {
  for (const p of m.parts) {
    if (p.type === "data-grounding" && "data" in p) return p.data as Grounding;
  }
  return null;
}

function GroundingChips({ g }: { g: Grounding }) {
  return (
    <div className="flex flex-wrap gap-1">
      {g.tools.map((t) => (
        <span
          key={t}
          className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] tracking-wide text-muted-foreground"
        >
          {TOOL_LABELS[t] ?? t}
        </span>
      ))}
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] tracking-wide ${
          g.verified ? "border-pitch/30 bg-pitch/5 text-pitch" : "border-warm/30 text-warm"
        }`}
        title={g.verified ? "Every number was checked against the data" : "Numbers could not be verified, so none are shown"}
      >
        {g.verified ? "✓ numbers verified" : "! not verified"}
      </span>
    </div>
  );
}

export function AssistantWidget() {
  // Old #ask links open the panel directly (this component mounts client-side only).
  const [open, setOpen] = useState(() => typeof window !== "undefined" && window.location.hash === "#ask");
  const [input, setInput] = useState("");
  const [voiceReplies, setVoiceReplies] = useState(false);
  const [fallbacks, setFallbacks] = useState<FallbackAnswer[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const spokenRef = useRef<string | null>(null);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/assistant" }), []);
  const pendingRef = useRef<{ text: string; userIndex: number } | null>(null);
  const { messages, sendMessage, status, error, stop, clearError } = useChat({
    transport,
    // Model unreachable: answer the same question with the built-in rules engine.
    onError: () => {
      const pending = pendingRef.current;
      if (!pending) return;
      const a = answerQuestion(pending.text, "general", "virat-kohli", {});
      setFallbacks((prev) => [...prev, { userIndex: pending.userIndex, text: [a.headline, ...a.paragraphs].join(" ") }]);
      pendingRef.current = null;
    },
  });

  const voice = useVoiceAsk({ onTranscript: (t) => setInput(t) });
  const wasListening = useRef(false);

  const busy = status === "submitted" || status === "streaming";

  const send = (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    clearError();
    voice.stopSpeaking();
    pendingRef.current = { text: q, userIndex: messages.filter((m) => m.role === "user").length };
    void sendMessage({ text: q });
    setInput("");
    voice.clearTranscript();
  };

  // Open (and optionally ask) when any screen calls openAssistant().
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    const onAsk = (e: Event) => {
      setOpen(true);
      const q = (e as CustomEvent<{ question?: string }>).detail?.question;
      if (q) sendRef.current(q);
    };
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, []);

  // Voice-first: when the mic stops with a transcript, send it.
  useEffect(() => {
    if (wasListening.current && !voice.listening && voice.transcript.trim()) {
      send(voice.transcript);
    }
    wasListening.current = voice.listening;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.listening]);

  // Read finished replies aloud when voice replies are on.
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  useEffect(() => {
    if (!voiceReplies || status !== "ready" || !lastAssistant) return;
    if (spokenRef.current === lastAssistant.id) return;
    const text = messageText(lastAssistant).replace(/\n?Source:.*$/i, "");
    if (text) {
      spokenRef.current = lastAssistant.id;
      voice.speak(text);
    }
  }, [voiceReplies, status, lastAssistant, voice]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, fallbacks, status]);

  return (
    <>
      {open ? (
        <section
          role="dialog"
          aria-label="Cricket Intelligence assistant"
          className="cos-panel-in glass-strong fixed right-3 bottom-24 z-40 flex h-[min(38rem,calc(100dvh-8rem))] w-[min(26rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.75rem] md:right-6 md:bottom-6"
        >
          <header className="flex items-start justify-between gap-3 border-b border-white/60 px-4 py-3">
            <div>
              <p className="font-display text-lg text-navy"><span className="font-light">Ask</span> <span className="font-semibold">AI</span></p>
              <p className="text-[11px] text-muted-foreground">
                Chat or speak · answers grounded in ball-by-ball data and the live feed
              </p>
            </div>
            <div className="flex items-center gap-1">
              {voice.ttsSupported ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-pressed={voiceReplies}
                  aria-label={voiceReplies ? "Turn off spoken replies" : "Read replies aloud"}
                  onClick={() => {
                    if (voiceReplies) voice.stopSpeaking();
                    setVoiceReplies((v) => !v);
                  }}
                >
                  {voiceReplies ? <Volume2 /> : <VolumeX />}
                </Button>
              ) : null}
              <Button type="button" size="icon" variant="ghost" aria-label="Close assistant" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </div>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ask about live scores, players, head-to-heads or how a match swung. Tap the mic to speak.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-left text-xs text-navy transition hover:bg-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((m, idx) => {
              const userIndex = messages.slice(0, idx).filter((x) => x.role === "user").length;
              const fallback = m.role === "user" ? fallbacks.find((f) => f.userIndex === userIndex) : undefined;
              if (m.role === "user") {
                return (
                  <div key={m.id} className="flex flex-col items-end gap-2">
                    <p className="max-w-[85%] rounded-2xl rounded-br-md bg-navy px-3 py-2 text-sm text-white">
                      {messageText(m)}
                    </p>
                    {fallback ? (
                      <div className="max-w-[90%] self-start rounded-2xl rounded-bl-md border border-border bg-muted/40 px-3 py-2 text-sm">
                        <p className="mb-1 text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                          Offline answer · rules engine
                        </p>
                        {fallback.text}
                      </div>
                    ) : null}
                  </div>
                );
              }
              return (
                <div key={m.id} className="max-w-[92%] space-y-2">
                  {groundingOf(m) ? <GroundingChips g={groundingOf(m)!} /> : null}
                  {messageText(m) ? (
                    <p className="rounded-2xl rounded-bl-md border border-white/80 bg-white/85 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap text-ink">
                      {messageText(m)}
                    </p>
                  ) : null}
                </div>
              );
            })}

            {busy ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Checking the data…
              </p>
            ) : null}
            {error ? (
              <p className="text-xs text-warm">
                The AI assistant is unavailable right now
                {error.message && error.message.length < 120 ? ` (${error.message})` : ""}. Showing the rules-engine answer.
              </p>
            ) : null}
            {voice.error ? <p className="text-xs text-warm">{voice.error}</p> : null}
          </div>

          <form
            className="flex items-center gap-2 border-t border-white/60 px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            {voice.supported ? (
              <Button
                type="button"
                size="icon"
                variant={voice.listening ? "default" : "outline"}
                className={voice.listening ? "bg-warm hover:bg-warm/90" : ""}
                aria-pressed={voice.listening}
                aria-label={voice.listening ? "Stop listening" : "Speak your question"}
                onClick={() => (voice.listening ? voice.stopListening() : voice.startListening())}
              >
                {voice.listening ? <MicOff /> : <Mic />}
              </Button>
            ) : null}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={voice.listening ? "Listening…" : "Ask about any match or player"}
              aria-label="Your question"
              maxLength={1500}
              className="h-10 min-w-0 flex-1 rounded-full border border-white/80 bg-white/80 px-4 text-sm outline-none focus:border-cobalt/50"
            />
            {busy ? (
              <Button type="button" size="icon" variant="outline" aria-label="Stop" onClick={() => stop()}>
                <Square />
              </Button>
            ) : (
              <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim()}>
                <Send />
              </Button>
            )}
          </form>
        </section>
      ) : null}
    </>
  );
}
