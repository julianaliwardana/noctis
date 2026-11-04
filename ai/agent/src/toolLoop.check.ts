/**
 * Offline check for the tool loop — a scripted model and stubbed actions, no gateway or database.
 * Run from ai/agent: pnpm exec tsx src/toolLoop.check.ts
 */
import assert from "node:assert/strict";
import type { UserContext } from "./context";
import type { ToolCall, ToolMessage, ToolTurn } from "./llm";
import { MAX_ROUNDS, runToolLoop, type IntentRunner } from "./toolLoop";

const context: UserContext = {
  pendingTasks: [],
  habitStreaks: [],
  categories: ["Food"],
  recentTransactions: [],
  monthSpend: 0,
  lastNudgeAt: null,
};

function call(id: string, name: string, args: unknown): ToolCall {
  return { id, type: "function", function: { name, arguments: typeof args === "string" ? args : JSON.stringify(args) } };
}

/** Plays back turns in order and records what the loop sent each round. */
function scripted(turns: ToolTurn[]) {
  const seen: ToolMessage[][] = [];
  return {
    seen,
    chat: async (messages: ToolMessage[]) => {
      seen.push(structuredClone(messages));
      return turns[Math.min(seen.length - 1, turns.length - 1)]!;
    },
  };
}

const ran: Record<string, unknown>[] = [];
const runIntent: IntentRunner = async (_userId, intent) => {
  ran.push(intent);
  switch (intent.intent) {
    case "CREATE_TASK":
      return { message: `Added "${intent.title}".`, action: { type: "CREATE_TASK", summary: `Created task: ${intent.title}` } };
    case "ADD_TRANSACTION":
      return { message: "Logged 45k.", action: { type: "ADD_TRANSACTION", summary: "Added expense: Lunch" } };
    case "DELETE_TASK":
      return { message: `Delete the task "${intent.title}"?`, pendingDelete: { kind: "task", id: "t1", label: String(intent.title) } };
    default:
      return { message: "?" };
  }
};

// 1. Two actions in one message, then the model's own wrap-up.
{
  ran.length = 0;
  const model = scripted([
    {
      content: "",
      toolCalls: [
        call("a", "create_task", { title: "Call bank" }),
        call("b", "add_transaction", { title: "Lunch", amount: 45000, category: "Food" }),
      ],
      model: "glm-4.7-flash",
    },
    { content: "Done — task added and lunch logged.", toolCalls: [] },
  ]);
  const result = await runToolLoop(model, runIntent, "u1", context, "add task call bank and log 45k lunch");
  assert.equal(result.message, "Done — task added and lunch logged.");
  assert.deepEqual(result.actions?.map((a) => a.type), ["CREATE_TASK", "ADD_TRANSACTION"]);
  assert.equal(result.model, "glm-4.7-flash");
  // Round 2 must carry both tool results, paired to their call ids.
  const tools = model.seen[1]!.filter((m) => m.role === "tool");
  assert.deepEqual(tools.map((m) => (m as { tool_call_id: string }).tool_call_id), ["a", "b"]);
}

// 2. Broken arguments come back as an error the model can fix next round.
{
  ran.length = 0;
  const model = scripted([
    { content: "", toolCalls: [call("x", "create_task", "{title: Call bank")] },
    { content: "", toolCalls: [call("y", "create_task", { title: "Call bank" })] },
    { content: "Added.", toolCalls: [] },
  ]);
  const result = await runToolLoop(model, runIntent, "u1", context, "add task call bank");
  assert.equal(ran.length, 1, "the malformed call must not reach the database");
  const error = model.seen[1]!.find((m) => m.role === "tool")!;
  assert.match((error as { content: string }).content, /not a valid JSON object/);
  assert.equal(result.actions?.length, 1);
}

// 3. A delete stops the loop and becomes the question; earlier work is still reported.
{
  ran.length = 0;
  const model = scripted([
    {
      content: "",
      toolCalls: [
        call("a", "create_task", { title: "Call bank" }),
        call("b", "delete_task", { title: "Old task" }),
        call("c", "create_task", { title: "Never runs" }),
      ],
    },
  ]);
  const result = await runToolLoop(model, runIntent, "u1", context, "swap old task for call bank");
  assert.equal(model.seen.length, 1);
  assert.deepEqual(result.pendingDelete, { kind: "task", id: "t1", label: "Old task" });
  assert.equal(result.message, 'Added "Call bank". Delete the task "Old task"?');
  assert.equal(ran.length, 2, "calls after the delete must not run");
}

// 4. A model that never stops calling tools is cut off after MAX_ROUNDS.
{
  ran.length = 0;
  const model = scripted([{ content: "", toolCalls: [call("a", "create_task", { title: "Loop" })] }]);
  const result = await runToolLoop(model, runIntent, "u1", context, "loop");
  assert.equal(model.seen.length, MAX_ROUNDS);
  assert.equal(result.actions?.length, MAX_ROUNDS);
  assert.match(result.message, /Added "Loop"/);
}

// 5. Unknown tools are refused, and arguments can't override which intent runs.
{
  ran.length = 0;
  const model = scripted([
    { content: "", toolCalls: [call("a", "drop_database", {}), call("b", "create_task", { title: "T", intent: "DELETE_TASK" })] },
    { content: "ok", toolCalls: [] },
  ]);
  await runToolLoop(model, runIntent, "u1", context, "x");
  assert.equal(ran.length, 1);
  assert.equal(ran[0]!.intent, "CREATE_TASK");
  assert.match(JSON.stringify(model.seen[1]), /no tool named \\"drop_database\\"/);
}

console.log("tool loop: ok");
