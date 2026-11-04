import { safeParseJSON } from "@noctis/utils";
import { gatherContext } from "./context";
import { systemPrompt, chatPrompt, type PriorTurn } from "./prompts";
import { createProvider, ToolsUnsupportedError } from "./llm";
import { runToolLoop } from "./toolLoop";
import * as tools from "./tools";
import type { ChatResult } from "./tools";

export type { ChatAction, ChatResult } from "./tools";

/**
 * Intents are addressed by name, never by id — see tools.resolveByName for why.
 * Anything the model gets wrong is caught by runIntent's guards and falls back to a plain reply.
 */
type RawIntent = { intent: string } & Record<string, unknown>;

function isChatIntent(value: unknown): value is RawIntent {
  return typeof value === "object" && value !== null && typeof (value as { intent?: unknown }).intent === "string";
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export interface ChatOptions {
  history?: PriorTurn[];
  /** A model id from the server's allowlist (chatModels); anything else falls back to the default. */
  model?: string;
}

/**
 * Tool-capable providers (OmniRoute) run the multi-step tool loop; the rest — and any upstream
 * that refuses the `tools` field — answer with one JSON intent, as before.
 */
export async function handleChat(userId: string, message: string, options: ChatOptions = {}): Promise<ChatResult> {
  const context = await gatherContext(userId);
  const provider = createProvider(options.model);

  if (provider.chat) {
    try {
      return await runToolLoop({ chat: provider.chat }, runIntent, userId, context, message, options.history);
    } catch (error) {
      if (!(error instanceof ToolsUnsupportedError)) throw error;
    }
  }

  const raw = await provider.complete(systemPrompt(), chatPrompt(context, message, options.history));
  const parsed = safeParseJSON(raw);
  if (!isChatIntent(parsed)) return { message: raw, actions: [] };

  const result = await runIntent(userId, parsed);
  return { ...result, message: result.message || raw, actions: result.action ? [result.action] : [] };
}

function num(value: unknown): number {
  return typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
}

function optStr(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/**
 * Every action, from either path, goes through these guards before it touches the database.
 * Arguments are untyped model output, so each is coerced here rather than trusted downstream.
 */
async function runIntent(userId: string, parsed: RawIntent): Promise<ChatResult> {
  switch (parsed.intent) {
    case "CREATE_TASK":
      return str(parsed.title) === ""
        ? { message: "What should the task be called?" }
        : tools.createTask(userId, { title: str(parsed.title), dueAt: optStr(parsed.dueAt), notes: optStr(parsed.notes) });

    case "COMPLETE_TASK":
      return tools.completeTask(userId, str(parsed.title));

    case "DELETE_TASK":
      return tools.deleteTask(userId, str(parsed.title));

    case "CREATE_HABIT":
      return str(parsed.name) === ""
        ? { message: "What should the habit be called?" }
        : tools.createHabit(userId, {
            name: str(parsed.name),
            daysOfWeek: Array.isArray(parsed.daysOfWeek) ? parsed.daysOfWeek.map(num) : undefined,
            color: optStr(parsed.color),
          });

    case "LOG_HABIT":
      return tools.logHabit(userId, str(parsed.name));

    case "DELETE_HABIT":
      return tools.deleteHabit(userId, str(parsed.name));

    case "ADD_TRANSACTION":
      return str(parsed.title) === ""
        ? { message: "What was that for?" }
        : tools.addTransaction(userId, {
            title: str(parsed.title),
            amount: num(parsed.amount),
            category: str(parsed.category) || "Other",
            type: parsed.type === "income" ? "income" : "expense",
            date: optStr(parsed.date),
          });

    case "DELETE_TRANSACTION":
      return tools.deleteTransaction(userId, str(parsed.title));

    case "CREATE_CATEGORY":
      return tools.createCategory(userId, { name: str(parsed.name), color: optStr(parsed.color) });

    case "DELETE_CATEGORY":
      return tools.deleteCategory(userId, str(parsed.name));

    case "GET_SUMMARY":
      return tools.getSummary(
        userId,
        parsed.period === "today" || parsed.period === "week" ? parsed.period : "month",
      );

    case "REPLY":
    default:
      return { message: str(parsed.message) };
  }
}
