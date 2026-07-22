import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import * as youtubeService from "./youtube.service";

const searchQuery = z.object({
  q: z.string().min(1),
  source: z.enum(["video", "music"]).optional(),
});

export const youtubeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/search", async (request) => {
    const { q, source } = searchQuery.parse(request.query);
    return youtubeService.searchYouTube(q, source);
  });
};
