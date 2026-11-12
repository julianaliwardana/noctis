import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as financeRepository from "../finance/finance.repository";
import * as financeService from "../finance/finance.service";
import { dayKey, dayRange, jakartaDay, monthRange, parseMonthKey } from "../finance/finance.insights";
import type { DateRange } from "../finance/finance.insights";
import type { Expense } from "@noctis/db";
import type Redis from "ioredis";
import { collectHealth } from "../health/health.service";
import * as tasksRepository from "../tasks/tasks.repository";
import { registerDevTools } from "./mcp.devtools";
import { registerPrompts } from "./mcp.prompts";
import { registerResources } from "./mcp.resources";
import { fail, json, taskView } from "./mcp.views";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const DAY = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("A Jakarta calendar day, YYYY-MM-DD");
const MONTH = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .describe("A Jakarta calendar month, YYYY-MM. Defaults to the current month.");

function transactionView(expense: Expense) {
  return {
    id: expense.id,
    title: expense.title,
    amount: expense.amount,
    category: expense.category,
    type: expense.type,
    date: expense.date.toISOString(),
    source: expense.source,
    paymentMethod: expense.paymentMethod,
    needsReview: expense.needsReview,
  };
}

/** `from`/`to` (both included) when given, otherwise the current Jakarta month. */
function resolveRange(from: string | undefined, to: string | undefined): DateRange | string {
  if (!from && !to) {
    const today = jakartaDay(new Date());
    return monthRange(today.year, today.month);
  }
  if (!from || !to) return "Give both `from` and `to`, or neither for the current month.";
  return dayRange(from, to) ?? `Invalid range ${from}..${to}: both must be real dates and \`to\` must not be before \`from\`.`;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

/**
 * One server per request (the transport is stateless), already bound to the Noctis account the
 * token belongs to — no tool takes a user id, so the model can't act as anyone else.
 */
export interface McpDependencies {
  redis: Redis;
}

export function buildMcpServer(userId: string, deps: McpDependencies): McpServer {
  const server = new McpServer({ name: "noctis", version: "1.4.0" });

  server.registerTool(
    "list_categories",
    {
      title: "List finance categories",
      description:
        "Returns the user's transaction categories. Call this before add_transaction: a transaction's category must be one of these names.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const categories = await financeService.listCategories(userId);
      return json(categories.map(({ name, color }) => ({ name, color })));
    },
  );

  server.registerTool(
    "create_category",
    {
      title: "Create finance category",
      description:
        "Creates a new category. Only use it when no existing category reasonably fits — check list_categories first and never create a near-duplicate (e.g. 'Groceries' when 'Food' exists, or a different language/casing of an existing name). Use short English Title Case names.",
      inputSchema: {
        name: z.string().trim().min(1).max(40).describe("Short English Title Case name, e.g. 'Laundry'"),
        color: z.string().regex(HEX_COLOR).optional().describe("Optional hex color like #2a78d6"),
      },
    },
    async ({ name, color }) => {
      const result = await financeService.createCategory(userId, { name, color });
      if (result === "duplicate") return json({ status: "exists", name });
      return json({ status: "created", name: result.name, color: result.color });
    },
  );

  server.registerTool(
    "find_imported",
    {
      title: "Check which emails are already imported",
      description:
        "Given source ids (Gmail message ids), returns which already exist as transactions. Use it to skip emails imported on an earlier run.",
      inputSchema: {
        externalIds: z.array(z.string().min(1)).min(1).max(100),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ externalIds }) => {
      const found = await financeRepository.findByExternalIds(userId, externalIds);
      const imported = new Set(found.map((expense) => expense.externalId));
      return json({
        imported: externalIds.filter((id) => imported.has(id)),
        notImported: externalIds.filter((id) => !imported.has(id)),
      });
    },
  );

  server.registerTool(
    "search_transactions",
    {
      title: "Search transactions",
      description:
        "Transactions, newest first. Filter by title substring, category, date range, minimum amount or the needs-review flag; page with `cursor`. Use it to see how a merchant or person was categorized before (search the person's name alone, without the remark) and stay consistent with that. For totals use get_spending_summary instead of adding rows up.",
      inputSchema: {
        query: z.string().trim().min(1).optional().describe("Case-insensitive substring of the title, e.g. 'indomaret' or a person's name"),
        category: z.string().trim().min(1).optional().describe("Exact category name, case-insensitive"),
        from: DAY.optional(),
        to: DAY.optional().describe("Last day to include, YYYY-MM-DD. Give it together with `from`."),
        minAmount: z.number().positive().optional().describe("Only rows of at least this many IDR"),
        needsReview: z.boolean().optional().describe("true: only rows whose category is still a guess"),
        limit: z.number().int().min(1).max(100).default(20),
        cursor: z.string().min(1).optional().describe("`nextCursor` from the previous page"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query, category, from, to, minAmount, needsReview, limit, cursor }) => {
      const range = from || to ? resolveRange(from, to) : undefined;
      if (typeof range === "string") return fail(range);

      // One extra row tells us whether another page exists without a second query.
      const rows = await financeRepository.search(
        userId,
        { query, category, start: range?.start, end: range?.end, minAmount, needsReview, cursor },
        limit + 1,
      );
      const page = rows.slice(0, limit);
      return json({
        transactions: page.map(transactionView),
        nextCursor: rows.length > limit ? (page[page.length - 1] as Expense).id : null,
      });
    },
  );

  server.registerTool(
    "add_transaction",
    {
      title: "Add transaction",
      description:
        "Logs one transaction. Idempotent on externalId: calling it again for the same source returns status 'duplicate' instead of creating a second entry. The category must already exist (see list_categories / create_category). A transfer filed under 'Other' to someone never paid before is flagged needsReview automatically. The result's `budgetAlert` is 80 or 100 when this transaction pushed its category past that share of its monthly budget (the user has already been notified).",
      inputSchema: {
        title: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .describe("Merchant or recipient, readable, e.g. 'Indomaret' or 'Transfer to Marzelline — laundry'"),
        amount: z.number().positive().describe("Amount in IDR as a plain number, fees included, e.g. 26000"),
        category: z.string().trim().min(1).describe("An existing category name"),
        type: z.enum(["expense", "income"]).default("expense"),
        date: z
          .string()
          .datetime({ offset: true })
          .describe("Transaction time from the source, ISO 8601 with offset, e.g. 2026-11-09T10:36:24+07:00"),
        externalId: z
          .string()
          .min(1)
          .describe("Stable id in the source system: the Gmail message id for an email, or 'receipt-<date>-<amount>-<merchant>' for a photo"),
        source: z.string().trim().min(1).max(40).default("bca-email"),
        paymentMethod: z
          .string()
          .trim()
          .min(1)
          .max(20)
          .optional()
          .describe("How it was paid when not straight from the bank account: 'gopay', 'cash', ..."),
        needsReview: z
          .boolean()
          .optional()
          .describe("true when the category is a guess the user should confirm (e.g. an unnamed app-store charge). Omit to let the server decide."),
      },
      annotations: { idempotentHint: true },
    },
    async ({ title, amount, category, type, date, externalId, source, paymentMethod, needsReview }) => {
      const existing = await financeRepository.findByExternalId(userId, externalId);
      if (existing) return json({ status: "duplicate", id: existing.id, category: existing.category });

      const categories = await financeService.listCategories(userId);
      const match = categories.find((entry) => entry.name.toLowerCase() === category.toLowerCase());
      if (!match) {
        return fail(
          `Unknown category "${category}". Pick one of: ${categories.map((entry) => entry.name).join(", ")} — or call create_category first.`,
        );
      }

      const flagged =
        needsReview ?? (type === "expense" && (await financeService.isUnreviewedTransfer(userId, title, match.name)));

      try {
        const expense = await financeRepository.createImported(userId, {
          title,
          amount,
          category: match.name,
          type,
          date: new Date(date),
          source,
          externalId,
          paymentMethod,
          needsReview: flagged,
        });
        const budgetAlert = await financeService.checkBudgetAlert(userId, expense.category, expense.date);
        return json({
          status: "created",
          id: expense.id,
          title: expense.title,
          category: expense.category,
          needsReview: expense.needsReview,
          budgetAlert,
        });
      } catch (error) {
        // Two runs racing on the same email: the unique index decides, the loser reports a duplicate.
        if (isUniqueViolation(error)) return json({ status: "duplicate" });
        throw error;
      }
    },
  );

  server.registerTool(
    "update_transaction",
    {
      title: "Update transaction",
      description:
        "Changes a transaction's category and/or title (ids come from search_transactions). Setting a category clears needsReview; pass needsReview: false alone to confirm the current category as-is. Only call this when the user asked for the change in this conversation — in an unattended run, report the suggestion instead.",
      inputSchema: {
        id: z.string().min(1),
        category: z.string().trim().min(1).optional().describe("An existing category name"),
        title: z.string().trim().min(1).max(120).optional(),
        needsReview: z.boolean().optional(),
      },
      annotations: { idempotentHint: true },
    },
    async ({ id, category, title, needsReview }) => {
      if (category === undefined && title === undefined && needsReview === undefined) return fail("Nothing to update.");

      const result = await financeService.updateTransaction(userId, id, { category, title, needsReview });
      if (result === "not-found") return fail(`No transaction with id "${id}".`);
      if ("unknownCategory" in result) {
        return fail(`Unknown category "${category}". Pick one of: ${result.unknownCategory.join(", ")} — or call create_category first.`);
      }
      return json({ status: "updated", transaction: transactionView(result.expense), budgetAlert: result.budgetAlert });
    },
  );

  server.registerTool(
    "get_spending_summary",
    {
      title: "Spending summary",
      description:
        "Totals for a date range (default: the current month), grouped by category, merchant or day. `spent` is expenses minus refunds; e-wallet top-ups are reported separately as `walletTopUps` and are not spend. Compare two periods by calling it twice.",
      inputSchema: {
        from: DAY.optional(),
        to: DAY.optional().describe("Last day to include, YYYY-MM-DD. Give it together with `from`."),
        groupBy: z.enum(["category", "merchant", "day"]).default("category"),
        top: z.number().int().min(1).max(100).default(25).describe("How many groups to return, biggest first (days are never cut)"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ from, to, groupBy, top }) => {
      const range = resolveRange(from, to);
      if (typeof range === "string") return fail(range);

      const summary = await financeService.spendingSummary(userId, range, groupBy);
      const groups = groupBy === "day" ? summary.groups : summary.groups.slice(0, top);
      return json({
        from: dayKey(range.start),
        // `end` is exclusive: one millisecond earlier is the last included day.
        to: dayKey(new Date(range.end.getTime() - 1)),
        ...summary,
        groups,
        groupsOmitted: summary.groups.length - groups.length,
      });
    },
  );

  server.registerTool(
    "get_month_overview",
    {
      title: "Pay cycle / month overview",
      description:
        "One call for 'can I afford X?': income, spend so far, what is left, days left and every category budget with its usage — for the current period. With a payday set, the period is a pay cycle running from the last logged salary until the next one (`period.start`, `period.expectedNext`; `period.salaryDue` means payday passed with no salary logged). Without, it is the calendar month. `monthlyIncome` is the salary logged this cycle, or the configured income. `remaining` is null until an income is known. Pass `month` for a past calendar month instead.",
      inputSchema: { month: MONTH.optional().describe("A calendar month, YYYY-MM. Omit for the current period.") },
      annotations: { readOnlyHint: true },
    },
    async ({ month }) => {
      const parsed = month ? parseMonthKey(month) : undefined;
      if (parsed === null) return fail(`Invalid month "${month}".`);
      return json(await financeService.getMonthOverview(userId, parsed?.year, parsed?.month));
    },
  );

  server.registerTool(
    "set_monthly_income",
    {
      title: "Set income and payday",
      description:
        "Stores the user's usual take-home pay per month in IDR (the fallback before a salary is logged) and/or the day of the month salary is expected. Setting a payday switches budgets and the overview to pay cycles that run from salary to salary. Only set figures the user gave you.",
      inputSchema: {
        monthlyIncome: z.number().positive().nullable().optional().describe("IDR per month, or null to clear it"),
        payday: z.number().int().min(1).max(31).nullable().optional().describe("Expected salary day, or null for calendar months"),
      },
      annotations: { idempotentHint: true },
    },
    async ({ monthlyIncome, payday }) => {
      if (monthlyIncome === undefined && payday === undefined) return fail("Give monthlyIncome, payday, or both.");
      const saved = await financeService.setIncomeSettings(userId, {
        ...(monthlyIncome !== undefined ? { monthlyIncome } : {}),
        ...(payday !== undefined ? { payday } : {}),
      });
      return json({ status: "saved", ...saved });
    },
  );

  server.registerTool(
    "log_salary",
    {
      title: "Log salary",
      description:
        "Records that salary arrived (income in the Salary category). With a payday set, a salary near its expected date starts a new pay cycle, so budgets and 'left of income' reset from that day. Only call it when the user says their salary came in. One per day: logging the same day again returns 'duplicate'.",
      inputSchema: {
        amount: z.number().positive().describe("IDR received"),
        date: z
          .string()
          .datetime({ offset: true })
          .optional()
          .describe("When it arrived, ISO 8601 with offset. Defaults to now."),
      },
      annotations: { idempotentHint: true },
    },
    async ({ amount, date }) => {
      const when = date ? new Date(date) : new Date();
      if (when.getTime() > Date.now() + 24 * 60 * 60 * 1000) return fail("That date is in the future.");
      const { status, expense } = await financeService.logSalary(userId, amount, when);
      const overview = await financeService.getMonthOverview(userId);
      return json({ status, transaction: transactionView(expense), period: overview.period });
    },
  );

  server.registerTool(
    "list_budgets",
    {
      title: "List budgets",
      description:
        "Every category budget with the current period's spend (pay cycle when a payday is set, else this month), what is left, percent used and state (ok / warning from 80% / over). Noctis itself notifies the user at 80% and 100%, so there is no need to alert again.",
      inputSchema: { month: MONTH.optional().describe("A calendar month, YYYY-MM. Omit for the current period.") },
      annotations: { readOnlyHint: true },
    },
    async ({ month }) => {
      const parsed = month ? parseMonthKey(month) : undefined;
      if (parsed === null) return fail(`Invalid month "${month}".`);
      return json(await financeService.listBudgets(userId, parsed?.year, parsed?.month));
    },
  );

  server.registerTool(
    "set_budget",
    {
      title: "Set budget",
      description: "Sets or removes the monthly spending limit of one category. Only set a limit the user gave you.",
      inputSchema: {
        category: z.string().trim().min(1).describe("An existing category name"),
        monthlyLimit: z.number().positive().nullable().describe("IDR per month, or null to remove the budget"),
      },
      annotations: { idempotentHint: true },
    },
    async ({ category, monthlyLimit }) => {
      const result = await financeService.setBudget(userId, category, monthlyLimit);
      if (result === "unknown-category") return fail(`Unknown category "${category}". See list_categories.`);
      if (result === "wallet-category") {
        return fail(`"${category}" holds e-wallet top-ups, which are not counted as spend, so a budget on it would never move.`);
      }
      return json({ status: result.monthlyLimit === null ? "removed" : "saved", ...result });
    },
  );

  server.registerTool(
    "list_recurring",
    {
      title: "Find recurring charges",
      description:
        "Scans the last few months for charges that repeat. `recurring`: same title and amount in two or more months at a monthly rhythm. `candidates`: charges in the Subscriptions category not yet seen twice. `duplicateMonths` marks a month where the same charge appears more than once. Compare with list_subscriptions to spot ones the user hasn't registered.",
      inputSchema: {
        months: z.number().int().min(1).max(12).default(3).describe("How many months back to scan, the current one included"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ months }) => json(await financeService.recurringReport(userId, months)),
  );

  server.registerTool(
    "list_subscriptions",
    {
      title: "List subscriptions",
      description:
        "The user's registered subscriptions with this cycle's status: paid (with the charge, and priceChanged when the amount differs), upcoming, due, or missing (overdue with no matching charge). `dueSoon` totals what is still to be charged within 7 days or overdue, per payment method — e.g. how much the e-wallet needs.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => json(await financeService.listSubscriptions(userId)),
  );

  server.registerTool(
    "upsert_subscription",
    {
      title: "Add or update subscription",
      description:
        "Registers a subscription, or updates the one with the same name. A charge counts for it when the transaction title contains `matchTitle` (default: the name), so log the charge with a title that includes it. Only register subscriptions the user confirmed.",
      inputSchema: {
        name: z.string().trim().min(1).max(60).describe("e.g. 'YouTube Premium'"),
        expectedAmount: z.number().positive().describe("IDR per charge, tax included"),
        billingDay: z.number().int().min(1).max(31).describe("Day of the month it bills"),
        matchTitle: z.string().trim().min(1).max(60).nullable().optional().describe("Title substring that identifies its charges"),
        paymentMethod: z.string().trim().min(1).max(20).nullable().optional().describe("e.g. 'gopay'"),
        note: z.string().trim().max(200).nullable().optional(),
        active: z.boolean().optional().describe("false once cancelled"),
      },
      annotations: { idempotentHint: true },
    },
    async (input) => {
      const subscription = await financeService.upsertSubscription(userId, input);
      return json({
        status: "saved",
        name: subscription.name,
        expectedAmount: subscription.expectedAmount,
        billingDay: subscription.billingDay,
        matchTitle: subscription.matchTitle,
        paymentMethod: subscription.paymentMethod,
        active: subscription.active,
      });
    },
  );

  server.registerTool(
    "server_health",
    {
      title: "Server health",
      description:
        "Health of the server Noctis runs on (\"maverick\") as seen from the Noctis API: disk, memory, load, database, Redis, the agent's heartbeat, and how fresh the bank-email import is. Each check is ok / warn / critical with a one-line detail; `level` is the worst of them. If this tool cannot be reached at all, the API itself is down.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => json(await collectHealth(userId, deps.redis)),
  );

  server.registerTool(
    "add_task",
    {
      title: "Add task",
      description:
        "Adds a task to the user's Noctis task list. If an unfinished task with the same title already exists, nothing is added and status is 'exists' — so a repeated check can call it every run without piling up duplicates. Keep titles short and specific, e.g. 'Maverick: disk 91% full'.",
      inputSchema: {
        title: z.string().trim().min(1).max(120),
        notes: z.string().trim().max(2000).optional(),
        dueAt: z.string().datetime({ offset: true }).optional().describe("ISO 8601 with offset"),
      },
      annotations: { idempotentHint: true },
    },
    async ({ title, notes, dueAt }) => {
      const open = await tasksRepository.findOpenByTitle(userId, title);
      if (open) return json({ status: "exists", task: taskView(open) });
      const task = await tasksRepository.create(userId, { title, notes, dueAt: dueAt ? new Date(dueAt) : undefined });
      return json({ status: "created", task: taskView(task) });
    },
  );

  registerDevTools(server, userId);
  registerResources(server, userId);
  registerPrompts(server);

  return server;
}

