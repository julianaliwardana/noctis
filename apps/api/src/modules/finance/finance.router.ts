import type { FastifyPluginAsync } from "fastify";
import { createCategoryDto, createExpenseDto, summaryQueryDto, updateCategoryDto } from "./finance.dto";
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
