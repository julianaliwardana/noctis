import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider } from "./provider";

export function createClaudeProvider(): LLMProvider {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  return {
    async complete(system: string, user: string): Promise<string> {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: user }],
      });

      const block = message.content[0];
      return block?.type === "text" ? block.text : "";
    },
  };
}
