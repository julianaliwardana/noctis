import Groq from "groq-sdk";
import { RateLimitError, type LLMProvider } from "./provider";

export function createGroqProvider(): LLMProvider {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  return {
    async complete(system: string, user: string): Promise<string> {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          // Every prompt here asks for a JSON object; smaller models wrap it in fences without this.
          response_format: { type: "json_object" },
        });

        return completion.choices[0]?.message.content ?? "";
      } catch (error) {
        if (error instanceof Groq.APIError && error.status === 429) {
          const retryAfter = Number(error.headers?.["retry-after"]);
          throw new RateLimitError("groq", Number.isFinite(retryAfter) ? Math.ceil(retryAfter) : 60);
        }
        throw error;
      }
    },
  };
}
