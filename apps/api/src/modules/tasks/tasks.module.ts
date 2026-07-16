import type { FastifyPluginAsync } from "fastify";
import { tasksRoutes } from "./tasks.router";

export const tasksModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(tasksRoutes);
};
