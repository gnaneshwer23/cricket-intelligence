import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  isStepCount,
  type ModelMessage,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { allowRequest, assistantEnabled, assistantModel, trimConversation } from "@/lib/assistant/guard";
import { ASSISTANT_INSTRUCTIONS, assistantTools } from "@/lib/assistant/tools";
import { UNVERIFIED_FALLBACK, verifyNumbers } from "@/lib/assistant/verify";

export const maxDuration = 60;

type Draft = { text: string; toolNames: string[]; toolOutputs: unknown[]; messages: ModelMessage[] };

/** One agent pass: the first step must call a tool, then up to 5 more steps. */
async function draft(messages: ModelMessage[]): Promise<Draft> {
  const result = await generateText({
    model: assistantModel(),
    instructions: ASSISTANT_INSTRUCTIONS,
    messages,
    tools: assistantTools(),
    stopWhen: isStepCount(6),
    maxOutputTokens: 700,
    prepareStep: ({ stepNumber }) => (stepNumber === 0 ? { toolChoice: "required" } : {}),
  });
  const toolNames: string[] = [];
  const toolOutputs: unknown[] = [];
  for (const step of result.steps) {
    for (const r of step.toolResults) {
      toolNames.push(r.toolName);
      toolOutputs.push(r.output);
    }
  }
  return { text: result.text.trim(), toolNames, toolOutputs, messages: [...messages, ...result.response.messages] };
}

/**
 * Grounded chat (orchestrator → tools → verifier): the model answers from
 * tool results; every number in the answer is checked against those results
 * before anything is shown. One corrective retry, then a safe refusal.
 */
export async function POST(req: Request) {
  if (!assistantEnabled()) {
    return NextResponse.json({ ok: false, error: "assistant disabled" }, { status: 503 });
  }
  const client = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowRequest(client)) {
    return NextResponse.json({ ok: false, error: "Too many questions — try again in a minute." }, { status: 429 });
  }

  let body: { messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }
  const trimmed = trimConversation(body.messages ?? []);
  if (!trimmed.ok) return NextResponse.json({ ok: false, error: trimmed.error }, { status: 400 });

  const lastUser = [...trimmed.messages].reverse().find((m) => m.role === "user");
  const question = lastUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ") ?? "";
  const modelMessages = await convertToModelMessages(trimmed.messages);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "data-progress", data: { stage: "checking" }, transient: true });

      let attempt = await draft(modelMessages);
      let check = verifyNumbers(attempt.text, { question, toolOutputs: attempt.toolOutputs });
      let retried = false;

      if (!check.ok) {
        retried = true;
        const feedback: ModelMessage = {
          role: "user",
          content:
            `Verifier: these numbers are not in any tool result from this turn: ${check.unverified.join(", ")}. ` +
            "Call the tool that provides them (e.g. matchup, playerStats, liveFixtures) or remove them. Answer the original question again.",
        };
        const second = await draft([...attempt.messages, feedback]);
        const outputs = [...attempt.toolOutputs, ...second.toolOutputs];
        check = verifyNumbers(second.text, { question, toolOutputs: outputs });
        attempt = { ...second, toolNames: [...attempt.toolNames, ...second.toolNames], toolOutputs: outputs };
      }

      const text = check.ok && attempt.text ? attempt.text : UNVERIFIED_FALLBACK;
      writer.write({
        type: "data-grounding",
        data: { tools: [...new Set(attempt.toolNames)], verified: check.ok, retried },
      });
      writer.write({ type: "text-start", id: "answer" });
      writer.write({ type: "text-delta", id: "answer", delta: text });
      writer.write({ type: "text-end", id: "answer" });
    },
    onError: (error) => {
      console.error("[assistant]", error);
      return "The assistant could not reach the AI model.";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
