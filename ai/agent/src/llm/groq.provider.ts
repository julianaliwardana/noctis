import Groq from "groq-sdk";
import type { LLMProvider } from "./provider";

export function createGroqProvider(): LLMProvider {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  return {
    async complete(system: string, user: string): Promise<string> {
      const completion = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });

      return completion.choices[0]?.message.content ?? "";
    },
  };
}
