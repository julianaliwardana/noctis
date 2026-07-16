import type { NudgeDecision, NudgeSlot } from "@noctis/types";
import { safeParseJSON } from "@noctis/utils";
import { gatherContext } from "./context";
import { systemPrompt, nudgePrompt } from "./prompts";
import { createProvider } from "./llm";
import { deliverNudge } from "./delivery";

const ANTI_SPAM_WINDOW_MS = 120 * 60 * 1000;

function isNudgeDecision(value: unknown): value is NudgeDecision {
  if (typeof value !== "object" || value === null) return false;
  const decision = value as Record<string, unknown>;
  return (
    typeof decision.shouldNudge === "boolean" &&
    typeof decision.title === "string" &&
    typeof decision.message === "string" &&
    typeof decision.type === "string"
  );
}

export async function analyzeUser(userId: string, slot: NudgeSlot): Promise<void> {
  const context = await gatherContext(userId);

  if (context.lastNudgeAt && Date.now() - context.lastNudgeAt.getTime() < ANTI_SPAM_WINDOW_MS) {
    return;
  }

  const provider = createProvider();
  const raw = await provider.complete(systemPrompt(), nudgePrompt(context, slot));
  const parsed = safeParseJSON(raw);

  if (!isNudgeDecision(parsed) || !parsed.shouldNudge) return;

  await deliverNudge(userId, parsed);
}
