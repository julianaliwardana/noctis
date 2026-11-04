import { RateLimitError, type LLMProvider } from "./provider";

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[];
}

/**
 * OmniRoute is a self-hosted, OpenAI-compatible gateway — one key, many upstreams (GLM, DeepSeek,
 * OpenCode free models, combos). OMNIROUTE_MODEL is whatever id or combo name the gateway lists
 * under GET /v1/models; there is no sane default, so an unset model is a config error, not a guess.
 * The base URL defaults to the public gateway — the same URL from a laptop in dev and from the
 * containers in prod.
 */
const DEFAULT_BASE_URL = "https://omniroute.julianwardana.dev/v1";

/** Free upstreams behind a gateway can hang; a held-open request is worse than a fast failure. */
const TIMEOUT_MS = 60_000;

/** Reasoning models (DeepSeek-R1, GLM thinking) inline their chain of thought before the answer. */
export function stripThinking(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export function createOmniRouteProvider(): LLMProvider {
  // `||`, not `??` — an unset var in .env reads as "".
  const baseUrl = (process.env.OMNIROUTE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = process.env.OMNIROUTE_MODEL || "";
  const apiKey = process.env.OMNIROUTE_API_KEY || "";

  async function call(system: string, user: string, jsonMode: boolean): Promise<Response> {
    return fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        stream: false,
        // Every prompt here asks for a JSON object. Not every upstream behind the gateway accepts
        // response_format, so a 400/422 earns one retry without it — safeParseJSON copes with fences.
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }

  return {
    async complete(system: string, user: string): Promise<string> {
      if (!model) throw new Error("OMNIROUTE_MODEL is not set — pick a model or combo from GET /v1/models");

      let res = await call(system, user, true);
      if (res.status === 400 || res.status === 422) res = await call(system, user, false);

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after"));
        throw new RateLimitError("omniroute", Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : 60);
      }

      if (!res.ok) throw new Error(`OmniRoute request failed: ${res.status} ${await res.text()}`);

      const data = (await res.json()) as ChatCompletionResponse;
      return stripThinking(data.choices?.[0]?.message?.content ?? "");
    },
  };
}
