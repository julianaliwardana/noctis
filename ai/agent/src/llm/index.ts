import { isProviderName, type ProviderName, type ToolCapableProvider } from "./provider";
import { createOllamaProvider } from "./ollama.provider";
import { createGroqProvider } from "./groq.provider";
import { createClaudeProvider } from "./claude.provider";
import { createGeminiProvider } from "./gemini.provider";
import { availableOmniRouteModels, createOmniRouteProvider, type ChatModel } from "./omniroute.provider";

function configuredProvider(): ProviderName {
  return isProviderName(process.env.AI_PROVIDER) ? process.env.AI_PROVIDER : "ollama";
}

/**
 * The server picks the provider, never the client — chat context carries finance data, and which
 * upstream may see it is a deployment decision (AI_PROVIDER). A client may only name a model from
 * the server's own allowlist (see chatModels); anything else falls back to the default.
 */
export function createProvider(model?: string): ToolCapableProvider {
  switch (configuredProvider()) {
    case "omniroute":
      return createOmniRouteProvider(model);
    case "gemini":
      return createGeminiProvider();
    case "groq":
      return createGroqProvider();
    case "claude":
      return createClaudeProvider();
    case "ollama":
      return createOllamaProvider();
  }
}

/** What the chat's model picker may offer: allowlisted and served by the gateway. */
export async function chatModels(): Promise<ChatModel[]> {
  return configuredProvider() === "omniroute" ? availableOmniRouteModels() : [];
}

export { ModelUnavailableError, PROVIDERS, RateLimitError, ToolsUnsupportedError, isProviderName } from "./provider";
export type { LLMProvider, ProviderName, ToolCall, ToolMessage, ToolSpec, ToolTurn } from "./provider";
export type { ChatModel } from "./omniroute.provider";
