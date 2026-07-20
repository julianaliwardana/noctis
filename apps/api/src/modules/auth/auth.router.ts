import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { loginDto, registerDto } from "./auth.dto";
import { createUser, signAccessToken, signRefreshToken, verifyCredentials } from "./auth.service";

const AUTH_RATE_LIMIT = 10;
const AUTH_RATE_WINDOW_SECONDS = 60;

async function authRateLimit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const key = `ratelimit:auth:${request.ip}`;
  const count = await request.server.redis.incr(key);
  if (count === 1) {
    await request.server.redis.expire(key, AUTH_RATE_WINDOW_SECONDS);
  }
  if (count > AUTH_RATE_LIMIT) {
    await reply.code(429).send({ error: "Too many requests, try again later" });
  }
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/register", { preHandler: authRateLimit }, async (request, reply) => {
    const body = registerDto.parse(request.body);

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

  fastify.post("/login", { preHandler: authRateLimit }, async (request, reply) => {
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
