import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import * as notificationsService from "./notifications.service";

const subscriptionDto = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

const subscribeDto = z.object({ subscription: subscriptionDto });
const unsubscribeDto = z.object({ endpoint: z.string().url() });

export const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  /** What the browser needs to subscribe, plus how many devices already get pushes. */
  fastify.get("/push", async (request) => ({
    publicKey: notificationsService.publicKey(),
    devices: await notificationsService.countDevices(request.user.userId),
  }));

  fastify.post("/subscribe", async (request, reply) => {
    const body = subscribeDto.parse(request.body);
    await notificationsService.saveSubscription(request.user.userId, body.subscription);
    return reply.code(201).send({ ok: true });
  });

  fastify.post("/unsubscribe", async (request, reply) => {
    const body = unsubscribeDto.parse(request.body);
    await notificationsService.removeSubscription(request.user.userId, body.endpoint);
    return reply.code(204).send();
  });

  fastify.post("/test", async (request) => ({
    delivered: await notificationsService.sendTest(request.user.userId),
  }));
};
