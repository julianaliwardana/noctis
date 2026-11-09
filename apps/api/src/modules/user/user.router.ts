import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { emailField } from "../auth/auth.dto";
import { findUserByEmail, passwordMatches } from "../auth/auth.service";

const updateUserDto = z.object({
  email: emailField.optional(),
  name: z.string().min(1).max(100).optional(),
  dateOfBirth: z.coerce.date().optional(),
  /** Required only when `email` changes: the email is the login, so changing it is an account takeover step. */
  currentPassword: z.string().min(1).max(1024).optional(),
});

const userSelect = {
  id: true,
  email: true,
  name: true,
  dateOfBirth: true,
  createdAt: true,
  updatedAt: true,
} as const;

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

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

  fastify.patch("/me", async (request, reply) => {
    const { currentPassword, ...body } = updateUserDto.parse(request.body);

    const current = await fastify.db.user.findUnique({ where: { id: request.user.userId } });
    if (!current) return reply.code(404).send({ error: "User not found" });

    const emailChanging = body.email !== undefined && body.email !== current.email.toLowerCase();
    if (!emailChanging) {
      // Same address (possibly in different case): nothing to re-check, and no reason to rewrite it.
      delete body.email;
    } else {
      if (!currentPassword || !(await passwordMatches(current, currentPassword))) {
        return reply.code(403).send({ error: "Current password is required to change your email", code: "PASSWORD_REQUIRED" });
      }
      const taken = await findUserByEmail(body.email!);
      if (taken && taken.id !== current.id) {
        return reply.code(409).send({ error: "That email is already in use" });
      }
    }

    try {
      return await fastify.db.user.update({
        where: { id: current.id },
        data: body,
        select: userSelect,
      });
    } catch (error) {
      // Lost a race with another account taking the same address.
      if (isUniqueViolation(error)) return reply.code(409).send({ error: "That email is already in use" });
      throw error;
    }
  });
};
