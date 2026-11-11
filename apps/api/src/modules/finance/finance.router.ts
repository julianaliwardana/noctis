import type { FastifyPluginAsync } from "fastify";
import {
  createCategoryDto,
  createExpenseDto,
  setBudgetDto,
  logSalaryDto,
  setIncomeDto,
  summaryQueryDto,
  updateCategoryDto,
  updateExpenseDto,
} from "./finance.dto";
import * as financeService from "./finance.service";

export const financeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/", async (request) => {
    return financeService.listExpenses(request.user.userId);
  });

  fastify.post("/", async (request, reply) => {
    const body = createExpenseDto.parse(request.body);
    const expense = await financeService.addExpense(request.user.userId, body);
    return reply.code(201).send(expense);
  });

  fastify.get("/summary", async (request) => {
    const query = summaryQueryDto.parse(request.query);
    return financeService.getMonthlySummary(request.user.userId, query);
  });

  /** Spend so far, income, what is left and every budget — the numbers behind the summary tiles. */
  fastify.get("/overview", async (request) => {
    return financeService.getMonthOverview(request.user.userId);
  });

  fastify.put("/income", async (request) => {
    const body = setIncomeDto.parse(request.body);
    return financeService.setIncomeSettings(request.user.userId, {
      ...(body.monthlyIncome !== undefined ? { monthlyIncome: body.monthlyIncome } : {}),
      ...(body.payday !== undefined ? { payday: body.payday } : {}),
    });
  });

  fastify.post("/salary", async (request, reply) => {
    const body = logSalaryDto.parse(request.body);
    const date = body.date ?? new Date();
    if (date.getTime() > Date.now() + 24 * 60 * 60 * 1000) return reply.code(400).send({ error: "That date is in the future" });
    const { status, expense } = await financeService.logSalary(request.user.userId, body.amount, date);
    return reply.code(status === "created" ? 201 : 200).send(expense);
  });

  fastify.put("/budgets", async (request, reply) => {
    const body = setBudgetDto.parse(request.body);
    const result = await financeService.setBudget(request.user.userId, body.category, body.monthlyLimit);
    if (result === "unknown-category") return reply.code(404).send({ error: "Category not found" });
    if (result === "wallet-category") {
      return reply.code(409).send({ error: "Top-ups are not counted as spend, so they can't have a budget" });
    }
    return result;
  });

  fastify.get("/subscriptions", async (request) => {
    return financeService.listSubscriptions(request.user.userId);
  });

  fastify.patch<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const body = updateExpenseDto.parse(request.body);
    const result = await financeService.updateTransaction(request.user.userId, request.params.id, body);
    if (result === "not-found") return reply.code(404).send({ error: "Expense not found" });
    if ("unknownCategory" in result) return reply.code(404).send({ error: "Category not found" });
    return result.expense;
  });

  fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const deleted = await financeService.deleteExpense(request.params.id, request.user.userId);
    if (!deleted) return reply.code(404).send({ error: "Expense not found" });
    return reply.code(204).send();
  });

  fastify.get("/categories", async (request) => {
    return financeService.listCategories(request.user.userId);
  });

  fastify.post("/categories", async (request, reply) => {
    const body = createCategoryDto.parse(request.body);
    const category = await financeService.createCategory(request.user.userId, body);
    if (category === "duplicate") return reply.code(409).send({ error: "Category already exists" });
    return reply.code(201).send(category);
  });

  fastify.patch<{ Params: { id: string } }>("/categories/:id", async (request, reply) => {
    const body = updateCategoryDto.parse(request.body);
    const category = await financeService.updateCategory(request.params.id, request.user.userId, body);
    if (category === "duplicate") return reply.code(409).send({ error: "Category already exists" });
    if (!category) return reply.code(404).send({ error: "Category not found" });
    return category;
  });

  fastify.delete<{ Params: { id: string } }>("/categories/:id", async (request, reply) => {
    const deleted = await financeService.deleteCategory(request.params.id, request.user.userId);
    if (deleted === "last") return reply.code(409).send({ error: "Keep at least one category" });
    if (!deleted) return reply.code(404).send({ error: "Category not found" });
    return reply.code(204).send();
  });
};
