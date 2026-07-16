import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { handleChat } from "@noctis/agent";

const chatDto = z.object({ message: z.string().min(1) });

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.post("/chat", async (request) => {
    const body = chatDto.parse(request.body);
    return handleChat(request.user.userId, body.message);
  });
};
