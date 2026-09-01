import type { FastifyPluginAsync } from "fastify";
import { vaultItemDto, vaultKeyDto } from "./passwords.dto";
import * as passwordsService from "./passwords.service";

export const passwordsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  // 404 here is not an error — it is how the client learns the vault has never been set up.
  fastify.get("/key", async (request, reply) => {
    const key = await passwordsService.getVaultKey(request.user.userId);
    if (!key) return reply.code(404).send({ error: "Vault not set up" });
    return key;
  });

  fastify.post("/key", async (request, reply) => {
    const body = vaultKeyDto.parse(request.body);
    const key = await passwordsService.createVaultKey(request.user.userId, body);
    if (!key) return reply.code(409).send({ error: "Vault already exists" });
    return reply.code(201).send(key);
  });

  fastify.put("/key", async (request, reply) => {
    const body = vaultKeyDto.parse(request.body);
    const key = await passwordsService.rotateVaultKey(request.user.userId, body);
    if (!key) return reply.code(404).send({ error: "Vault not set up" });
    return key;
  });

  fastify.get("/", async (request) => {
    return passwordsService.listItems(request.user.userId);
  });

  fastify.post("/", async (request, reply) => {
    const body = vaultItemDto.parse(request.body);
    const item = await passwordsService.createItem(request.user.userId, body);
    return reply.code(201).send(item);
  });

  fastify.patch<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const body = vaultItemDto.parse(request.body);
    const item = await passwordsService.updateItem(request.params.id, request.user.userId, body);
    if (!item) return reply.code(404).send({ error: "Vault item not found" });
    return item;
  });

  fastify.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const deleted = await passwordsService.deleteItem(request.params.id, request.user.userId);
    if (!deleted) return reply.code(404).send({ error: "Vault item not found" });
    return reply.code(204).send();
  });
};
