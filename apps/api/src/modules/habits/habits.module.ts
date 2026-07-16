import type { FastifyPluginAsync } from "fastify";
import { habitsRoutes } from "./habits.router";

export const habitsModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(habitsRoutes);
};
