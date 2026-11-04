import {
  RateLimitError,
  ToolsUnsupportedError,
  type ToolCall,
  type ToolCapableProvider,
  type ToolMessage,
  type ToolSpec,
} from "./provider";

interface ChatCompletionResponse {
  model?: string;
  choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[];
}

/**
 * OmniRoute is a self-hosted, OpenAI-compatible gateway — one key, many upstreams (GLM, DeepSeek,
 * OpenCode free models, combos). A model is whatever id or combo name the gateway lists under
 * GET /v1/models; there is no sane default, so an unset model is a config error, not a guess.
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

export interface ChatModel {
  id: string;
  label: string;
}

/** "glm-4.7-flash" → "Glm 4.7 Flash"; good enough when the allowlist gives no label. */
function labelFrom(id: string): string {
  const tail = id.split("/").pop() ?? id;
  return tail
    .replace(/:free$/i, "")
    .split(/[-_]/)
    .map((word) => (word === "" ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join(" ");
}

/**
 * Models the chat may pick from: OMNIROUTE_MODELS as "id=Label,id=Label" (first is the default),
 * else OMNIROUTE_MODEL alone. This list is the guard on where finance data can go — the client
 * only ever chooses from it, so keep it to providers you trust with that data.
 */
export function omniRouteModels(): ChatModel[] {
  const raw = process.env.OMNIROUTE_MODELS || process.env.OMNIROUTE_MODEL || "";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
    .map((entry) => {
      const [id = "", label] = entry.split("=").map((part) => part.trim());
      return { id, label: label || labelFrom(id) };
    })
    .filter((model) => model.id !== "");
}

export function createOmniRouteProvider(requestedModel?: string): ToolCapableProvider {
  // `||`, not `??` — an unset var in .env reads as "".
  const baseUrl = (process.env.OMNIROUTE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const apiKey = process.env.OMNIROUTE_API_KEY || "";
  const allowed = omniRouteModels();
  // Anything not on the allowlist — a stale choice, a hand-crafted request — gets the default.
  const model = allowed.find((entry) => entry.id === requestedModel)?.id ?? allowed[0]?.id ?? "";

  async function post(body: Record<string, unknown>): Promise<Response> {
    if (!model) throw new Error("No OmniRoute model configured — set OMNIROUTE_MODEL or OMNIROUTE_MODELS");

    return fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ model, temperature: 0.2, stream: false, ...body }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }

  async function read(res: Response): Promise<ChatCompletionResponse> {
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after"));
      throw new RateLimitError("omniroute", Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : 60);
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(`OmniRoute rejected the API key (${res.status}) — check OMNIROUTE_API_KEY`);
    }
    if (!res.ok) throw new Error(`OmniRoute request failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as ChatCompletionResponse;
  }

  return {
    async complete(system: string, user: string): Promise<string> {
      const messages = [
        { role: "system", content: system },
        { role: "user", content: user },
      ];

      // Every prompt here asks for a JSON object. Not every upstream behind the gateway accepts
      // response_format, so a 400/422 earns one retry without it — safeParseJSON copes with fences.
      let res = await post({ messages, response_format: { type: "json_object" } });
      if (res.status === 400 || res.status === 422) res = await post({ messages });

      const data = await read(res);
      return stripThinking(data.choices?.[0]?.message?.content ?? "");
    },

    async chat(messages: ToolMessage[], tools: ToolSpec[]) {
      const res = await post({ messages, tools, tool_choice: "auto" });
      if (res.status === 400 || res.status === 422) throw new ToolsUnsupportedError(await res.text());

      const data = await read(res);
      const message = data.choices?.[0]?.message;
      return {
        content: stripThinking(message?.content ?? ""),
        toolCalls: message?.tool_calls ?? [],
        model: data.model,
      };
    },
  };
}
