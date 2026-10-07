/**
 * LLM providers — OpenAI-compatible + Anthropic
 *
 * AGENTOS_LLM_PROVIDER=openai|anthropic|openrouter|custom
 * AGENTOS_LLM_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  usage?: { promptTokens?: number; completionTokens?: number };
}

export interface LLMProvider {
  name: string;
  complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
}

function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export function resolveProviderConfig(): {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
} {
  const provider = (
    env("AGENTOS_LLM_PROVIDER") ||
    (env("ANTHROPIC_API_KEY") ? "anthropic" : "") ||
    (env("OPENAI_API_KEY") ? "openai" : "") ||
    (env("OPENROUTER_API_KEY") ? "openrouter" : "") ||
    "none"
  ).toLowerCase();

  let apiKey = env("AGENTOS_LLM_API_KEY");
  let baseUrl = env("AGENTOS_LLM_BASE_URL");
  let model = env("AGENTOS_LLM_MODEL");

  if (provider === "anthropic") {
    apiKey = apiKey || env("ANTHROPIC_API_KEY");
    baseUrl = baseUrl || "https://api.anthropic.com";
    model = model || "claude-sonnet-4-20250514";
  } else if (provider === "openai") {
    apiKey = apiKey || env("OPENAI_API_KEY");
    baseUrl = baseUrl || "https://api.openai.com/v1";
    model = model || "gpt-4o-mini";
  } else if (provider === "openrouter") {
    apiKey = apiKey || env("OPENROUTER_API_KEY");
    baseUrl = baseUrl || "https://openrouter.ai/api/v1";
    model = model || "openai/gpt-4o-mini";
  } else if (provider === "custom") {
    apiKey = apiKey || env("OPENAI_API_KEY");
    baseUrl = baseUrl || "http://localhost:11434/v1";
    model = model || "llama3.2";
  }

  return { provider, apiKey, baseUrl, model };
}

export class OpenAICompatibleProvider implements LLMProvider {
  name: string;
  constructor(
    private apiKey: string,
    private baseUrl: string,
    private defaultModel: string,
    name = "openai"
  ) {
    this.name = name;
  }

  async complete(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const model = options.model || this.defaultModel;
    const url = `${this.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 2048,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`LLM ${this.name} error ${res.status}: ${body.slice(0, 400)}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };
    return {
      content: data.choices?.[0]?.message?.content ?? "",
      model: data.model || model,
      provider: this.name,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      },
    };
  }
}

export class AnthropicProvider implements LLMProvider {
  name = "anthropic";
  constructor(
    private apiKey: string,
    private baseUrl: string,
    private defaultModel: string
  ) {}

  async complete(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const model = options.model || this.defaultModel;
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
    const rest = messages.filter((m) => m.role !== "system");
    const url = `${this.baseUrl.replace(/\/$/, "")}/v1/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.2,
        system: system || undefined,
        messages: rest.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`LLM anthropic error ${res.status}: ${body.slice(0, 400)}`);
    }
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
      model?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const content =
      data.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("") ?? "";
    return {
      content,
      model: data.model || model,
      provider: this.name,
      usage: {
        promptTokens: data.usage?.input_tokens,
        completionTokens: data.usage?.output_tokens,
      },
    };
  }
}

export function createLLMProvider(): LLMProvider | null {
  const cfg = resolveProviderConfig();
  if (cfg.provider === "none" || !cfg.apiKey) return null;
  if (cfg.provider === "anthropic") {
    return new AnthropicProvider(cfg.apiKey, cfg.baseUrl, cfg.model);
  }
  return new OpenAICompatibleProvider(cfg.apiKey, cfg.baseUrl, cfg.model, cfg.provider);
}

export async function llmComplete(
  prompt: string,
  system?: string,
  options?: LLMOptions
): Promise<LLMResponse | null> {
  const provider = createLLMProvider();
  if (!provider) return null;
  const messages: LLMMessage[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  return provider.complete(messages, options);
}
