import type { FastifyPluginAsync } from "fastify";
import { createSessionDto } from "./pomodoro.dto";
import * as pomodoroService from "./pomodoro.service";

export const pomodoroRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/", async (request) => {
    return pomodoroService.listSessions(request.user.userId);
  });

  fastify.post("/", async (request, reply) => {
    const body = createSessionDto.parse(request.body);
    const session = await pomodoroService.recordSession(request.user.userId, body);
    return reply.code(201).send(session);
  });
};
