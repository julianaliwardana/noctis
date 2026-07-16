import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import dbPlugin from "./plugins/db.plugin";
import redisPlugin from "./plugins/redis.plugin";
import authPlugin from "./plugins/auth.plugin";
import { authModule } from "./modules/auth/auth.module";
import { tasksModule } from "./modules/tasks/tasks.module";
import { habitsModule } from "./modules/habits/habits.module";
import { financeModule } from "./modules/finance/finance.module";
import { passwordsModule } from "./modules/passwords/passwords.module";
import { pomodoroModule } from "./modules/pomodoro/pomodoro.module";
import { notificationsRoutes } from "./modules/notifications/notifications.router";
import { userRoutes } from "./modules/user/user.router";
import { aiModule } from "./modules/ai/ai.module";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cors);
  await app.register(helmet);
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
