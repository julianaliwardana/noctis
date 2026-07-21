import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import * as youtubeService from "./youtube.service";

const searchQuery = z.object({ q: z.string().min(1) });

export const youtubeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/search", async (request) => {
    const { q } = searchQuery.parse(request.query);
    return youtubeService.searchYouTube(q);
  });
};
