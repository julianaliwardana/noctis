import type { FastifyPluginAsync } from "fastify";
import { passwordsRoutes } from "./passwords.router";

export const passwordsModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(passwordsRoutes);
};
