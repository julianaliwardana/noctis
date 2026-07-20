import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const updateUserDto = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  dateOfBirth: z.coerce.date().optional(),
});

const userSelect = {
  id: true,
  email: true,
  name: true,
  dateOfBirth: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/me", async (request, reply) => {
    const user = await fastify.db.user.findUnique({
      where: { id: request.user.userId },
      select: userSelect,
    });

    if (!user) return reply.code(404).send({ error: "User not found" });
    return user;
  });

  fastify.patch("/me", async (request) => {
    const body = updateUserDto.parse(request.body);
    return fastify.db.user.update({
      where: { id: request.user.userId },
      data: body,
      select: userSelect,
    });
  });
};
