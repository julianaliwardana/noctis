import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { loginDto, registerDto } from "./auth.dto";
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  createUser,
  setAccessCookie,
  setRefreshCookie,
  verifyCredentials,
  verifyRefreshToken,
} from "./auth.service";

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
    setAccessCookie(fastify, reply, user.id);
    setRefreshCookie(fastify, reply, user.id);
    return reply.code(201).send({ id: user.id, email: user.email });
  });

  fastify.post("/login", { preHandler: authRateLimit }, async (request, reply) => {
    const body = loginDto.parse(request.body);
    const user = await verifyCredentials(body.email, body.password);

    if (!user) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    setAccessCookie(fastify, reply, user.id);
    setRefreshCookie(fastify, reply, user.id);
    return reply.send({ id: user.id, email: user.email });
  });

  /**
   * Deliberately not behind `authenticate` — that requires a live access token, which is exactly
   * what the caller no longer has. The refresh cookie is verified here instead, and cleared when it
   * turns out to be dead so the browser stops presenting a session the server won't honour.
   */
  fastify.post("/refresh", { preHandler: authRateLimit }, async (request, reply) => {
    const userId = verifyRefreshToken(fastify, request.cookies[REFRESH_COOKIE] ?? "");
    const user = userId ? await fastify.db.user.findUnique({ where: { id: userId } }) : null;

    if (!user) {
      clearAuthCookies(reply);
      return reply.code(401).send({ error: "Session expired" });
    }

    setAccessCookie(fastify, reply, user.id);
    return reply.code(204).send();
  });

  /** The only way out: httpOnly cookies can't be dropped by the client that owns them. */
  fastify.post("/logout", async (_request, reply) => {
    clearAuthCookies(reply);
    return reply.code(204).send();
  });
};
