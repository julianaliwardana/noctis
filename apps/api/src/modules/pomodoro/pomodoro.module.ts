import type { FastifyPluginAsync } from "fastify";
import { pomodoroRoutes } from "./pomodoro.router";

export const pomodoroModule: FastifyPluginAsync = async (fastify) => {
  await fastify.register(pomodoroRoutes);
};
