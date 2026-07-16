import type { FastifyPluginAsync } from "fastify";
import { loginDto, registerDto } from "./auth.dto";
import { createUser, signAccessToken, signRefreshToken, verifyCredentials } from "./auth.service";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/register", async (request, reply) => {
    const body = registerDto.parse(request.body);
    console.log("🚀 ~ authRoutes ~ body:", body)

    const existing = await fastify.db.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.code(409).send({ error: "Email already registered" });
    }

    const user = await createUser(body.email, body.password);
    return reply.code(201).send({
      accessToken: signAccessToken(fastify, user.id),
      refreshToken: signRefreshToken(fastify, user.id),
    });
  });

  fastify.post("/login", async (request, reply) => {
    const body = loginDto.parse(request.body);
    const user = await verifyCredentials(body.email, body.password);

    if (!user) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    return reply.send({
      accessToken: signAccessToken(fastify, user.id),
      refreshToken: signRefreshToken(fastify, user.id),
    });
  });

  fastify.post("/refresh", { preHandler: fastify.authenticate }, async (request) => {
    return { accessToken: signAccessToken(fastify, request.user.userId) };
  });
};
