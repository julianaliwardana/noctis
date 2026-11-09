import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import jwt from "@fastify/jwt";
import { ACCESS_COOKIE } from "../modules/auth/auth.service";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    /** `ver` is the user's tokenVersion at issue time; see revokeAllSessions. */
    payload: { userId: string; type: "access" | "refresh"; ver: number };
    user: { userId: string; type?: "access" | "refresh"; ver?: number };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  // HS256 is only as strong as its key; `openssl rand -base64 32` gives 44 characters.
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }

  // No `Authorization` header any more — `jwtVerify` reads the httpOnly access cookie instead.
  await fastify.register(jwt, { secret, cookie: { cookieName: ACCESS_COOKIE, signed: false } });

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      // A refresh token must never open a normal route — it only buys a new access token.
      if (request.user.type !== "access") {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    },
  );
};

export default fp(authPlugin);
