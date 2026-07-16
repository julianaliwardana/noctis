import type { FastifyPluginAsync } from "fastify";
import { createPasswordDto } from "./passwords.dto";
import * as passwordsService from "./passwords.service";

export const passwordsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/", async (request) => {
    return passwordsService.listPasswords(request.user.userId);
  });

  fastify.post("/", async (request, reply) => {
    const body = createPasswordDto.parse(request.body);
    const password = await passwordsService.savePassword(request.user.userId, body);
    return reply.code(201).send(password);
  });

  fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const deleted = await passwordsService.deletePassword(request.params.id, request.user.userId);
    if (!deleted) return reply.code(404).send({ error: "Password not found" });
    return reply.code(204).send();
  });
};
