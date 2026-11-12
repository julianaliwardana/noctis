import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/** A prompt is only text: it tells the model which tools to call; the logic stays in the tools. */
function userMessage(text: string) {
  return { messages: [{ role: "user" as const, content: { type: "text" as const, text } }] };
}

/**
 * One-step recipes. In Claude Code they appear in the / menu, e.g. /mcp__noctis__weekly_review.
 * MCP prompt arguments are always strings, so amounts arrive as text ("1.2jt") for the model to read.
 */
export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "weekly_review",
    {
      title: "Weekly money review",
      description: "This week's spending against last week, budgets, the pay cycle so far and what needs a category.",
    },
    () =>
      userMessage(
        [
          "Give me my weekly money review from Noctis. Dates are Jakarta days; this week is Monday to today, last week the seven days before.",
          "1. get_spending_summary for this week and for last week (groupBy category), and this week by merchant (top 10).",
          "2. get_month_overview with no month (the current pay cycle).",
          "3. search_transactions with needsReview: true.",
          "4. list_subscriptions.",
          "Then, short: total this week vs last (rupiah and %), top three categories with last week beside them, anything unusual, budgets at 80% or more, the pay cycle so far with the per-day allowance, transactions that need a category with a suggestion each, and what GoPay needs this week. Suggest changes; don't make them.",
        ].join("\n"),
      ),
  );

  server.registerPrompt(
    "plan_my_day",
    {
      title: "Plan my day",
      description: "Open tasks and today's focus so far, turned into a plan for the rest of the day.",
    },
    () =>
      userMessage(
        [
          "Help me plan the rest of today with Noctis.",
          "1. list_tasks with status open.",
          "2. Read the resource noctis://focus/today if you can; otherwise skip it.",
          "Then: what is overdue or due today, the three tasks I should do next and why, and how much focus I've logged today. Keep it to a short list. Don't change any task.",
        ].join("\n"),
      ),
  );

  server.registerPrompt(
    "can_i_afford",
    {
      title: "Can I afford it?",
      description: "Checks a purchase against this pay cycle's money and budgets.",
      argsSchema: {
        item: z.string().describe("What you want to buy"),
        price: z.string().describe("Its price in rupiah, any format: 1.250.000, 1.25jt, 1250k"),
      },
    },
    ({ item, price }) =>
      userMessage(
        [
          `Can I afford "${item}" for ${price}?`,
          "Call get_month_overview with no month. Read the price as rupiah (jt = million, k = thousand).",
          "Answer with: what is left of my income this pay cycle before and after the purchase, the per-day allowance after it until the expected payday, and which budget category it would fall under and how full that budget would be. If income isn't set, say so. Give a plain yes, tight, or no, with the numbers. Don't log anything.",
        ].join("\n"),
      ),
  );
}
