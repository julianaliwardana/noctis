import type { FastifyPluginAsync } from "fastify";
import { ModelUnavailableError, RateLimitError } from "@noctis/agent";
import { chatDto, renameConversationDto } from "./ai.dto";
import * as aiService from "./ai.service";

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.post("/chat", async (request, reply) => {
    const body = chatDto.parse(request.body);

    try {
      const result = await aiService.sendMessage(request.user.userId, body);
      if (!result) return reply.code(404).send({ error: "Conversation not found" });
      return result;
    } catch (error) {
      // Free-tier quota is a normal condition here, so it answers with the wait rather than a 500.
      if (error instanceof RateLimitError) {
        return reply
          .code(429)
          .header("retry-after", error.retryAfterSeconds)
          .send({
            error:
              error.scope === "day"
                ? `${error.provider} has used up its free quota for today.`
                : `${error.provider} is rate limited. Try again in ${error.retryAfterSeconds}s.`,
            provider: error.provider,
            retryAfter: error.retryAfterSeconds,
            scope: error.scope,
          });
      }
      // A bad id in OMNIROUTE_MODELS is config, not an outage — say which model, so it can be swapped.
      if (error instanceof ModelUnavailableError) {
        request.log.warn({ model: error.model }, "model not available on gateway");
        return reply.code(422).send({
          error: `Model "${error.model}" isn't available on the gateway.`,
          code: "model_unavailable",
          model: error.model,
        });
      }
      throw error;
    }
  });

  fastify.get("/models", async () => aiService.listModels());

  fastify.get("/conversations", async (request) => {
    return aiService.listConversations(request.user.userId);
  });

  fastify.get<{ Params: { id: string } }>("/conversations/:id", async (request, reply) => {
    const conversation = await aiService.getConversation(request.params.id, request.user.userId);
    if (!conversation) return reply.code(404).send({ error: "Conversation not found" });
    return conversation;
  });

  fastify.patch<{ Params: { id: string } }>("/conversations/:id", async (request, reply) => {
    const { title } = renameConversationDto.parse(request.body);
    const conversation = await aiService.renameConversation(request.params.id, request.user.userId, title);
    if (!conversation) return reply.code(404).send({ error: "Conversation not found" });
    return conversation;
  });

  fastify.delete<{ Params: { id: string } }>("/conversations/:id", async (request, reply) => {
    const deleted = await aiService.deleteConversation(request.params.id, request.user.userId);
    if (!deleted) return reply.code(404).send({ error: "Conversation not found" });
    return reply.code(204).send();
  });
};
