import type { FastifyPluginAsync } from "fastify";
import { financeRoutes } from "./finance.router";

export const financeModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(financeRoutes);
};
