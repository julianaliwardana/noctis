import type { FastifyPluginAsync } from "fastify";
import { aiRoutes } from "./ai.router";

export const aiModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(aiRoutes);
};
