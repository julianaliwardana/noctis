import type { FastifyPluginAsync } from "fastify";
import { youtubeRoutes } from "./youtube.router";

export const youtubeModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(youtubeRoutes);
};
