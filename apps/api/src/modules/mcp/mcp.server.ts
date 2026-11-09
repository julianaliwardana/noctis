import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as financeRepository from "../finance/finance.repository";
import * as financeService from "../finance/finance.service";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function json(value: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function fail(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

/**
 * One server per request (the transport is stateless), already bound to the Noctis account the
 * token belongs to — no tool takes a user id, so the model can't act as anyone else.
 */
export function buildMcpServer(userId: string): McpServer {
  const server = new McpServer({ name: "noctis", version: "1.0.0" });

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
      title: "Search past transactions",
      description:
        "Recent transactions, newest first, optionally filtered by a case-insensitive title substring. Use it to see how a merchant or person was categorized before, and stay consistent with that.",
      inputSchema: {
        query: z.string().trim().min(1).optional().describe("Substring of the title, e.g. 'INDOMARET'"),
        limit: z.number().int().min(1).max(50).default(20),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query, limit }) => {
      const expenses = await financeRepository.searchByTitle(userId, query, limit);
      return json(
        expenses.map(({ title, amount, category, type, date, source }) => ({
          title,
          amount,
          category,
          type,
          date: date.toISOString(),
          source,
        })),
      );
    },
  );

  server.registerTool(
    "add_transaction",
    {
      title: "Add transaction",
      description:
        "Logs one transaction. Idempotent on externalId: calling it again for the same email returns status 'duplicate' instead of creating a second entry. The category must already exist (see list_categories / create_category).",
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
          .describe("Transaction time from the email, ISO 8601 with offset, e.g. 2026-11-09T10:36:24+07:00"),
        externalId: z.string().min(1).describe("Gmail message id of the source email"),
        source: z.string().trim().min(1).max(40).default("bca-email"),
      },
      annotations: { idempotentHint: true },
    },
    async ({ title, amount, category, type, date, externalId, source }) => {
      const existing = await financeRepository.findByExternalId(userId, externalId);
      if (existing) return json({ status: "duplicate", id: existing.id, category: existing.category });

      const categories = await financeService.listCategories(userId);
      const match = categories.find((entry) => entry.name.toLowerCase() === category.toLowerCase());
      if (!match) {
        return fail(
          `Unknown category "${category}". Pick one of: ${categories.map((entry) => entry.name).join(", ")} — or call create_category first.`,
        );
      }

      try {
        const expense = await financeRepository.createImported(userId, {
          title,
          amount,
          category: match.name,
          type,
          date: new Date(date),
          source,
          externalId,
        });
        return json({ status: "created", id: expense.id, title: expense.title, category: expense.category });
      } catch (error) {
        // Two runs racing on the same email: the unique index decides, the loser reports a duplicate.
        if (isUniqueViolation(error)) return json({ status: "duplicate" });
        throw error;
      }
    },
  );

  return server;
}
