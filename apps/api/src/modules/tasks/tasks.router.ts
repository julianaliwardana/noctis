import type { FastifyPluginAsync } from "fastify";
import { createTaskDto, updateTaskDto } from "./tasks.dto";
import * as tasksService from "./tasks.service";

export const tasksRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/", async (request) => {
    return tasksService.listTasks(request.user.userId);
  });

  fastify.post("/", async (request, reply) => {
    const body = createTaskDto.parse(request.body);
    const task = await tasksService.createTask(request.user.userId, body);
    return reply.code(201).send(task);
  });

  fastify.patch<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const body = updateTaskDto.parse(request.body);
    const task = await tasksService.updateTask(request.params.id, request.user.userId, body);
    if (!task) return reply.code(404).send({ error: "Task not found" });
    return task;
  });

  fastify.post<{ Params: { id: string } }>("/:id/complete", async (request, reply) => {
    const task = await tasksService.completeTask(request.params.id, request.user.userId);
    if (!task) return reply.code(404).send({ error: "Task not found" });
    return task;
  });

  fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const deleted = await tasksService.deleteTask(request.params.id, request.user.userId);
    if (!deleted) return reply.code(404).send({ error: "Task not found" });
    return reply.code(204).send();
  });
};
