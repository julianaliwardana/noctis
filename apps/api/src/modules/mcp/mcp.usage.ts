import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AgentRun } from "@noctis/db";
import { z } from "zod";
import { dayKey, dayRange, jakartaDay, monthRange } from "../finance/finance.insights";
import * as usageRepository from "../usage/usage.repository";
import { fail, json } from "./mcp.views";

const TOKENS = z.number().int().min(0).max(10_000_000);

function runView(run: AgentRun) {
  return {
    id: run.id,
    task: run.task,
    model: run.model,
    status: run.status,
    contextTokens: run.contextTokens,
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    summary: run.summary,
    at: run.createdAt.toISOString(),
  };
}

interface Totals {
  runs: number;
  inputTokens: number;
  outputTokens: number;
  /** The biggest context any run reached — context is a peak, not something to add up. */
  maxContextTokens: number;
}

function emptyTotals(): Totals {
  return { runs: 0, inputTokens: 0, outputTokens: 0, maxContextTokens: 0 };
}

function add(totals: Totals, run: AgentRun): void {
  totals.runs += 1;
  totals.inputTokens += run.inputTokens ?? 0;
  totals.outputTokens += run.outputTokens ?? 0;
  totals.maxContextTokens = Math.max(totals.maxContextTokens, run.contextTokens ?? 0);
}

/** Token reports from Claude's scheduled tasks: Claude's own estimates, not exact counts. */
export function registerUsageTools(server: McpServer, userId: string, client?: string): void {
  server.registerTool(
    "report_run",
    {
      title: "Report a scheduled-task run",
      description:
        "Call once as the LAST step of every scheduled task run (BCA import, weekly money review, subscription hunter, maverick health check, ...), after all other work, even when the run found nothing or failed. Give your best estimate of the tokens this run used: `contextTokens` = how full your context window is now, `inputTokens` = total tokens read across all turns (prompt, tool results, emails), `outputTokens` = tokens you wrote (tool calls included). `summary` is one line on what the run did.",
      inputSchema: {
        task: z.string().trim().min(1).max(60).describe("The scheduled task's name, e.g. 'BCA import'"),
        model: z.string().trim().min(1).max(60).optional().describe("Model that ran, e.g. 'claude-sonnet-5-5'"),
        status: z.enum(["ok", "partial", "failed"]).default("ok"),
        contextTokens: TOKENS.optional(),
        inputTokens: TOKENS.optional(),
        outputTokens: TOKENS.optional(),
        summary: z.string().trim().max(300).optional().describe("One line, e.g. 'Imported 6 transactions, 1 skipped'"),
      },
    },
    async ({ task, model, status, contextTokens, inputTokens, outputTokens, summary }) => {
      const run = await usageRepository.create(userId, {
        task,
        model,
        status,
        contextTokens,
        inputTokens,
        outputTokens,
        summary,
        client,
      });
      return json({ status: "recorded", run: runView(run) });
    },
  );

  server.registerTool(
    "get_run_usage",
    {
      title: "Scheduled-task token report",
      description:
        "Token report for Claude's scheduled-task runs over a date range (default: the current Jakarta month): totals, a row per task and per day, and the latest runs. Token counts are Claude's own estimates.",
      inputSchema: {
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("First Jakarta day, YYYY-MM-DD"),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Last day to include. Give it together with `from`."),
        task: z.string().trim().min(1).optional().describe("Only this task, case-insensitive exact name"),
        recent: z.number().int().min(0).max(50).default(10).describe("How many latest runs to list"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ from, to, task, recent }) => {
      let range;
      if (!from && !to) {
        const today = jakartaDay(new Date());
        range = monthRange(today.year, today.month);
      } else if (from && to) {
        range = dayRange(from, to);
        if (!range) return fail(`Invalid range ${from}..${to}.`);
      } else {
        return fail("Give both `from` and `to`, or neither for the current month.");
      }

      const runs = await usageRepository.findInRange(userId, range.start, range.end, task);
      const total = emptyTotals();
      const byTask = new Map<string, Totals>();
      const byDay = new Map<string, Totals>();
      for (const run of runs) {
        add(total, run);
        const taskTotals = byTask.get(run.task) ?? emptyTotals();
        add(taskTotals, run);
        byTask.set(run.task, taskTotals);
        const day = dayKey(run.createdAt);
        const dayTotals = byDay.get(day) ?? emptyTotals();
        add(dayTotals, run);
        byDay.set(day, dayTotals);
      }

      return json({
        from: dayKey(range.start),
        to: dayKey(new Date(range.end.getTime() - 1)),
        total,
        byTask: [...byTask.entries()]
          .map(([name, totals]) => ({ task: name, ...totals }))
          .sort((a, b) => b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens)),
        byDay: [...byDay.entries()].map(([day, totals]) => ({ day, ...totals })).sort((a, b) => a.day.localeCompare(b.day)),
        failedRuns: runs.filter((run) => run.status !== "ok").length,
        recentRuns: runs.slice(0, recent).map(runView),
      });
    },
  );
}
