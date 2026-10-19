/**
 * Abuse guards for the public assistant endpoint (best-effort, per instance).
 */
import type { UIMessage } from "ai";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

/** Sliding-window limit per client key; true when the request may proceed. */
export function allowRequest(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5_000) hits.clear();
  return true;
}

export const MAX_MESSAGES = 12;
export const MAX_TEXT_CHARS = 1_500;

/** Keep the recent conversation only and reject oversized user text. */
export function trimConversation(messages: UIMessage[]): { ok: true; messages: UIMessage[] } | { ok: false; error: string } {
  if (!Array.isArray(messages) || messages.length === 0) return { ok: false, error: "no messages" };
  const recent = messages.slice(-MAX_MESSAGES);
  for (const m of recent) {
    if (m.role !== "user") continue;
    const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    if (text.length > MAX_TEXT_CHARS) return { ok: false, error: `message too long (max ${MAX_TEXT_CHARS} characters)` };
  }
  return { ok: true, messages: recent };
}

export function assistantModel(): string {
  return process.env.CRICKETOS_ASSISTANT_MODEL?.trim() || "google/gemini-2.5-flash";
}

export function assistantEnabled(): boolean {
  return (process.env.CRICKETOS_ASSISTANT ?? "on").toLowerCase() !== "off";
}
