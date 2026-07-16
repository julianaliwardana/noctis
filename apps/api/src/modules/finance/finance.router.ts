import type { FastifyPluginAsync } from "fastify";
import { createExpenseDto, summaryQueryDto } from "./finance.dto";
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
};
