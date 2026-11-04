import { safeParseJSON } from "@noctis/utils";
import type { UserContext } from "./context";
import type { ToolMessage, ToolSpec } from "./llm";
import type { ToolCapableProvider } from "./llm/provider";
import { toolSystemPrompt, type PriorTurn } from "./prompts";
import type { ChatAction, ChatResult } from "./tools";

/**
 * Enough for "add a task and log lunch" plus a correction round; small enough that a confused
 * free model can't spin through the daily quota on one message.
 */
export const MAX_ROUNDS = 4;

const name = { type: "string", description: "Name exactly as listed in the context" };

function tool(fn: string, description: string, properties: Record<string, unknown>, required: string[]): ToolSpec {
  return { type: "function", function: { name: fn, description, parameters: { type: "object", properties, required } } };
}

/** One tool per intent — names are the intent in snake_case, so dispatch reuses runIntent's guards. */
export const TOOL_SPECS: ToolSpec[] = [
  tool(
    "create_task",
    "Create a task",
    {
      title: { type: "string" },
      dueAt: { type: "string", description: "ISO 8601 date-time" },
      notes: { type: "string" },
    },
    ["title"],
  ),
  tool("complete_task", "Mark a pending task as done", { title: name }, ["title"]),
  tool("delete_task", "Delete a task (the user confirms in the app)", { title: name }, ["title"]),
  tool(
    "create_habit",
    "Start tracking a habit",
    {
      name: { type: "string" },
      daysOfWeek: { type: "array", items: { type: "integer", minimum: 0, maximum: 6 }, description: "0 = Sunday" },
      color: { type: "string", description: "#rrggbb" },
    },
    ["name"],
  ),
  tool("log_habit", "Log a habit as done today", { name }, ["name"]),
  tool("delete_habit", "Stop tracking a habit (the user confirms in the app)", { name }, ["name"]),
  tool(
    "add_transaction",
    "Record income or an expense. Amount in IDR as a plain number: '45k' or '45rb' = 45000",
    {
      title: { type: "string" },
      amount: { type: "number", exclusiveMinimum: 0 },
      category: { type: "string", description: "One of the user's categories if it fits" },
      type: { type: "string", enum: ["income", "expense"] },
      date: { type: "string", description: "ISO 8601 date" },
    },
    ["title", "amount", "category"],
  ),
  tool("delete_transaction", "Delete a transaction (the user confirms in the app)", { title: name }, ["title"]),
  tool("create_category", "Create a finance category", { name: { type: "string" }, color: { type: "string" } }, ["name"]),
  tool("delete_category", "Delete a finance category (the user confirms in the app)", { name }, ["name"]),
  tool(
    "get_summary",
    "Income, spend and net for a period",
    { period: { type: "string", enum: ["today", "week", "month"] } },
    ["period"],
  ),
];

const TOOL_NAMES = new Set(TOOL_SPECS.map((spec) => spec.function.name));

export type IntentRunner = (userId: string, intent: { intent: string } & Record<string, unknown>) => Promise<ChatResult>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function runToolLoop(
  provider: Required<Pick<ToolCapableProvider, "chat">>,
  runIntent: IntentRunner,
  userId: string,
  context: UserContext,
  message: string,
  history: PriorTurn[] = [],
): Promise<ChatResult> {
  const messages: ToolMessage[] = [
    { role: "system", content: toolSystemPrompt(context) },
    ...history.slice(-10).map(
      (turn): ToolMessage => ({ role: turn.role === "user" ? "user" : "assistant", content: turn.content }),
    ),
    { role: "user", content: message },
  ];
  const actions: ChatAction[] = [];
  const outcomes: string[] = [];
  let model: string | undefined;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const turn = await provider.chat(messages, TOOL_SPECS);
    model = turn.model ?? model;

    if (turn.toolCalls.length === 0) {
      return { message: turn.content || outcomes.join(" ") || "Done.", actions, model };
    }

    messages.push({ role: "assistant", content: turn.content || null, tool_calls: turn.toolCalls });

    for (const call of turn.toolCalls) {
      const args = safeParseJSON(call.function.arguments || "{}");

      // Answered as a tool result, so the next round is the model's retry with the error in view.
      if (!TOOL_NAMES.has(call.function.name) || !isRecord(args)) {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: TOOL_NAMES.has(call.function.name)
            ? "Error: arguments were not a valid JSON object. Call the tool again with valid JSON."
            : `Error: there is no tool named "${call.function.name}".`,
        });
        continue;
      }

      const result = await runIntent(userId, { ...args, intent: call.function.name.toUpperCase() });
      if (result.action) actions.push(result.action);

      // A delete waits for the user's tap, so the turn ends here with the question as the reply.
      if (result.pendingDelete) {
        return {
          message: [...outcomes, result.message].join(" "),
          actions,
          pendingDelete: result.pendingDelete,
          model,
        };
      }

      outcomes.push(result.message);
      messages.push({ role: "tool", tool_call_id: call.id, content: result.message });
    }
  }

  // Out of rounds: report what actually happened rather than leave the user with nothing.
  return { message: outcomes.join(" ") || "I couldn't work that out — try rephrasing it.", actions, model };
}
