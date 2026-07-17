import type { FastifyPluginAsync } from "fastify";
import { createHabitDto, logHabitDto, updateHabitDto } from "./habits.dto";
import * as habitsService from "./habits.service";

export const habitsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/", async (request) => {
    return habitsService.listHabits(request.user.userId);
  });

  fastify.post("/", async (request, reply) => {
    const body = createHabitDto.parse(request.body);
    const habit = await habitsService.createHabit(request.user.userId, body);
    return reply.code(201).send(habit);
  });

  fastify.post<{ Params: { id: string } }>("/:id/log", async (request, reply) => {
    const { note } = logHabitDto.parse(request.body ?? {});
    const habit = await habitsService.logHabit(request.params.id, request.user.userId, note);
    if (!habit) return reply.code(404).send({ error: "Habit not found" });
    return habit;
  });

  fastify.get<{ Params: { id: string } }>("/:id/logs", async (request, reply) => {
    const logs = await habitsService.getLogs(request.params.id, request.user.userId);
    if (!logs) return reply.code(404).send({ error: "Habit not found" });
    return logs;
  });

  fastify.patch<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { color } = updateHabitDto.parse(request.body);
    const habit = await habitsService.updateHabitColor(request.params.id, request.user.userId, color);
    if (!habit) return reply.code(404).send({ error: "Habit not found" });
    return habit;
  });

  fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const deleted = await habitsService.deleteHabit(request.params.id, request.user.userId);
    if (!deleted) return reply.code(404).send({ error: "Habit not found" });
    return reply.code(204).send();
  });
};
