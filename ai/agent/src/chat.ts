import { safeParseJSON } from "@noctis/utils";
import { gatherContext } from "./context";
import { systemPrompt, chatPrompt } from "./prompts";
import { createProvider } from "./llm";
import * as tools from "./tools";
import type { ChatResult } from "./tools";

export type { ChatResult } from "./tools";

/**
 * Intents are addressed by name, never by id — see tools.resolveByName for why.
 * Anything the model gets wrong is caught by the guards below and falls back to a plain reply.
 */
type ChatIntent =
  | { intent: "REPLY"; message: string }
  | { intent: "CREATE_TASK"; title: string; dueAt?: string; notes?: string }
  | { intent: "COMPLETE_TASK"; title: string }
  | { intent: "DELETE_TASK"; title: string }
  | { intent: "CREATE_HABIT"; name: string; daysOfWeek?: number[]; color?: string }
  | { intent: "LOG_HABIT"; name: string }
  | { intent: "DELETE_HABIT"; name: string }
  | {
      intent: "ADD_TRANSACTION";
      title: string;
      amount: number;
      category: string;
      type?: "income" | "expense";
      date?: string;
    }
  | { intent: "DELETE_TRANSACTION"; title: string }
  | { intent: "CREATE_CATEGORY"; name: string; color?: string }
  | { intent: "DELETE_CATEGORY"; name: string }
  | { intent: "GET_SUMMARY"; period: "today" | "week" | "month" };

function isChatIntent(value: unknown): value is ChatIntent {
  return typeof value === "object" && value !== null && typeof (value as { intent?: unknown }).intent === "string";
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function handleChat(userId: string, message: string): Promise<ChatResult> {
  const context = await gatherContext(userId);
  const provider = createProvider();
  const raw = await provider.complete(systemPrompt(), chatPrompt(context, message));
  const parsed = safeParseJSON(raw);

  if (!isChatIntent(parsed)) return { message: raw };

  switch (parsed.intent) {
    case "CREATE_TASK":
      return str(parsed.title) === ""
        ? { message: "What should the task be called?" }
        : tools.createTask(userId, parsed);

    case "COMPLETE_TASK":
      return tools.completeTask(userId, str(parsed.title));

    case "DELETE_TASK":
      return tools.deleteTask(userId, str(parsed.title));

    case "CREATE_HABIT":
      return str(parsed.name) === ""
        ? { message: "What should the habit be called?" }
        : tools.createHabit(userId, parsed);

    case "LOG_HABIT":
      return tools.logHabit(userId, str(parsed.name));

    case "DELETE_HABIT":
      return tools.deleteHabit(userId, str(parsed.name));

    case "ADD_TRANSACTION":
      return str(parsed.title) === "" ? { message: "What was that for?" } : tools.addTransaction(userId, parsed);

    case "DELETE_TRANSACTION":
      return tools.deleteTransaction(userId, str(parsed.title));

    case "CREATE_CATEGORY":
      return tools.createCategory(userId, parsed);

    case "DELETE_CATEGORY":
      return tools.deleteCategory(userId, str(parsed.name));

    case "GET_SUMMARY":
      return tools.getSummary(
        userId,
        parsed.period === "today" || parsed.period === "week" ? parsed.period : "month",
      );

    case "REPLY":
    default:
      return { message: str((parsed as { message?: unknown }).message) || raw };
  }
}
