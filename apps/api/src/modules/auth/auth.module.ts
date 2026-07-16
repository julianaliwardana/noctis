import type { FastifyPluginAsync } from "fastify";
import { authRoutes } from "./auth.router";

export const authModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(authRoutes);
};
