import {
  ModelUnavailableError,
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

/**
 * A 400 means different things: an unknown model ("Unable to determine provider for model …"),
 * an upstream that refuses `tools`, or one that refuses `response_format`. Each needs a different
 * response, so read the body rather than treat every 400 the same.
 */
function classify400(body: string): "model" | "tools" | "other" {
  if (/determine provider|unknown model|model not found|not a valid model|combo entry/i.test(body)) return "model";
  if (/\btools?\b|tool_choice|function call/i.test(body)) return "tools";
  return "other";
}

/** What the gateway serves right now — combos included — cached so the picker doesn't hit it per open. */
let catalog: { at: number; ids: Set<string> | null } | null = null;
const CATALOG_TTL_MS = 5 * 60_000;

async function gatewayModelIds(baseUrl: string, apiKey: string): Promise<Set<string> | null> {
  if (catalog && Date.now() - catalog.at < CATALOG_TTL_MS) return catalog.ids;
  let ids: Set<string> | null = null;
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(5_000),
    });
    if (res.ok) {
      const body = (await res.json()) as { data?: { id?: string }[] };
      ids = new Set((body.data ?? []).map((entry) => entry.id ?? "").filter(Boolean));
    }
  } catch {
    // Unreachable gateway: show the allowlist as-is rather than an empty picker.
  }
  catalog = { at: Date.now(), ids };
  return ids;
}

/**
 * The allowlist minus ids the gateway doesn't serve — a placeholder or typo in OMNIROUTE_MODELS
 * would otherwise sit in the picker and fail on every message. If the gateway can't be asked,
 * or none match (a different id format), the allowlist is returned unfiltered.
 */
export async function availableOmniRouteModels(): Promise<ChatModel[]> {
  const allowed = omniRouteModels();
  const baseUrl = (process.env.OMNIROUTE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const ids = await gatewayModelIds(baseUrl, process.env.OMNIROUTE_API_KEY || "");
  if (!ids) return allowed;
  const served = allowed.filter((model) => ids.has(model.id));
  return served.length > 0 ? served : allowed;
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
    if (res.status === 400 || res.status === 404 || res.status === 422) {
      const body = await res.text();
      if (classify400(body) === "model") throw new ModelUnavailableError(model, body);
      throw new Error(`OmniRoute request failed: ${res.status} ${body}`);
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
      if (res.status === 400 || res.status === 422) {
        const body = await res.clone().text();
        if (classify400(body) !== "model") res = await post({ messages });
      }

      const data = await read(res);
      return stripThinking(data.choices?.[0]?.message?.content ?? "");
    },

    async chat(messages: ToolMessage[], tools: ToolSpec[]) {
      const res = await post({ messages, tools, tool_choice: "auto" });
      if (res.status === 400 || res.status === 422) {
        const body = await res.clone().text();
        // Only a refusal of `tools` earns the single-intent fallback; a bad model fails fast in read().
        if (classify400(body) === "tools") throw new ToolsUnsupportedError(body);
      }

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
