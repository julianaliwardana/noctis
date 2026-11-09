import type { FastifyPluginAsync } from "fastify";
import { loginDto, registerDto } from "./auth.dto";
import {
  CREDENTIAL_LIMIT,
  REFRESH_LIMIT,
  clearLoginFailures,
  ipRateLimit,
  loginLockedOut,
  recordLoginFailure,
} from "./auth.rateLimit";
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  createUser,
  findUserByEmail,
  revokeAllSessions,
  setAccessCookie,
  startSession,
  verifyCredentials,
  verifyRefreshToken,
} from "./auth.service";

/**
 * Off unless explicitly enabled. Noctis is a single-person app on a public URL: an open sign-up
 * form lets anyone create an account and spend the AI quota. Enable it in dev, or briefly in
 * production to create the first account.
 */
function registrationOpen(): boolean {
  return process.env.ALLOW_REGISTRATION?.trim().toLowerCase() === "true";
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const credentialLimit = ipRateLimit(CREDENTIAL_LIMIT);
  const refreshLimit = ipRateLimit(REFRESH_LIMIT);

  /** Lets the register page say "closed" up front instead of after the user fills the form in. */
  fastify.get("/registration", async () => ({ open: registrationOpen() }));

  fastify.post("/register", { preHandler: credentialLimit }, async (request, reply) => {
    if (!registrationOpen()) {
      return reply.code(403).send({ error: "Registration is closed" });
    }

    const body = registerDto.parse(request.body);

    const existing = await findUserByEmail(body.email);
    if (existing) {
      return reply.code(409).send({ error: "Email already registered" });
    }

    const user = await createUser(body.email, body.password);
    startSession(fastify, reply, user);
    return reply.code(201).send({ id: user.id, email: user.email });
  });

  fastify.post("/login", { preHandler: credentialLimit }, async (request, reply) => {
    const body = loginDto.parse(request.body);
    if (await loginLockedOut(request, reply, body.email)) return reply;

    const user = await verifyCredentials(body.email, body.password);
    if (!user) {
      await recordLoginFailure(request, body.email);
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    await clearLoginFailures(request, body.email);
    startSession(fastify, reply, user);
    return reply.send({ id: user.id, email: user.email });
  });

  /**
   * Deliberately not behind `authenticate` — that requires a live access token, which is exactly
   * what the caller no longer has. The refresh cookie is verified here instead, and cleared when it
   * turns out to be dead so the browser stops presenting a session the server won't honour.
   *
   * `ver` must match the user's current tokenVersion: bumping it (logout-everywhere) is what
   * revokes refresh tokens that would otherwise stay valid for their full 30 days.
   */
  fastify.post("/refresh", { preHandler: refreshLimit }, async (request, reply) => {
    const claims = verifyRefreshToken(fastify, request.cookies[REFRESH_COOKIE] ?? "");
    const user = claims ? await fastify.db.user.findUnique({ where: { id: claims.userId } }) : null;

    if (!user || !claims || user.tokenVersion !== claims.ver) {
      clearAuthCookies(reply);
      return reply.code(401).send({ error: "Session expired" });
    }

    setAccessCookie(fastify, reply, user);
    return reply.code(204).send();
  });

  /** Ends this browser's session. httpOnly cookies can't be dropped by the client that owns them. */
  fastify.post("/logout", async (_request, reply) => {
    clearAuthCookies(reply);
    return reply.code(204).send();
  });

  /** Ends every session on every device, including any refresh token that was copied elsewhere. */
  fastify.post("/logout-all", { preHandler: fastify.authenticate }, async (request, reply) => {
    await revokeAllSessions(request.user.userId);
    clearAuthCookies(reply);
    return reply.code(204).send();
  });
};
