import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import { ZodError } from "zod";
import dbPlugin from "./plugins/db.plugin";
import redisPlugin from "./plugins/redis.plugin";
import authPlugin from "./plugins/auth.plugin";
import csrfPlugin from "./plugins/csrf.plugin";
import { authModule } from "./modules/auth/auth.module";
import { tasksModule } from "./modules/tasks/tasks.module";
import { habitsModule } from "./modules/habits/habits.module";
import { financeModule } from "./modules/finance/finance.module";
import { passwordsModule } from "./modules/passwords/passwords.module";
import { pomodoroModule } from "./modules/pomodoro/pomodoro.module";
import { notificationsRoutes } from "./modules/notifications/notifications.router";
import { userRoutes } from "./modules/user/user.router";
import { aiModule } from "./modules/ai/ai.module";
import { youtubeModule } from "./modules/youtube/youtube.module";
import { mcpModule } from "./modules/mcp/mcp.module";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  // Comma-separated allowlist; without it every origin was reflected back.
  const origins = (process.env.WEB_ORIGIN ?? "http://localhost:3000").split(",").map((origin) => origin.trim());
  // The web app reaches the API same-origin through its /api rewrite, so CORS is only a fallback for
  // direct calls to the API host; the session cookies are host-only and never go there.
  await app.register(cors, { origin: origins, credentials: true });
  await app.register(helmet);
  await app.register(cookie);
  await app.register(csrfPlugin, { allowedOrigins: origins });

  // Routes validate with `zod.parse`, which throws. Unhandled, that surfaced as a 500 carrying the
  // whole issue list; it's the client's mistake, so say 400 and keep the details short.
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "Invalid request",
        issues: error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
      });
    }
    // Everything else keeps Fastify's default handling (status codes, logging).
    return reply.send(error);
  });
  await app.register(dbPlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);

  await app.register(authModule, { prefix: "/auth" });
  await app.register(tasksModule, { prefix: "/tasks" });
  await app.register(habitsModule, { prefix: "/habits" });
  await app.register(financeModule, { prefix: "/finance" });
  await app.register(passwordsModule, { prefix: "/passwords" });
  await app.register(pomodoroModule, { prefix: "/pomodoro" });
  await app.register(notificationsRoutes, { prefix: "/notifications" });
  await app.register(userRoutes, { prefix: "/user" });
  await app.register(aiModule, { prefix: "/ai" });
  await app.register(youtubeModule, { prefix: "/youtube" });
  await app.register(mcpModule, { prefix: "/mcp" });

  return app;
}

async function start(): Promise<void> {
  const app = await buildApp();
  const port = Number(process.env.PORT ?? 3001);

  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
