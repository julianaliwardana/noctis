import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import * as notificationsService from "./notifications.service";

const subscribeDto = z.object({
  subscription: z.string().min(1),
});

export const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.post("/subscribe", async (request, reply) => {
    const body = subscribeDto.parse(request.body);
    await notificationsService.saveSubscription(request.user.userId, body.subscription);
    return reply.code(201).send({ ok: true });
  });
};
