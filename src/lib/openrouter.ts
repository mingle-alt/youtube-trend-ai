import { AiModel } from "@/types/ai";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

const ALLOWED_MODELS: AiModel[] = [
  "openai/gpt-4o-mini",
  "~openai/gpt-latest",
  "~anthropic/claude-sonnet-latest",
];

interface JsonSchema {
  name: string;
  schema: Record<string, unknown>;
}

interface OpenRouterChoice {
  message?: {
    content?: string;
  };
}

interface OpenRouterResponseBody {
  choices?: OpenRouterChoice[];
  error?: {
    message?: string;
  };
}

export function normalizeAiModel(model: unknown): AiModel {
  return ALLOWED_MODELS.includes(model as AiModel)
    ? (model as AiModel)
    : "openai/gpt-4o-mini";
}

function getOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENROUTER_API_KEY 환경변수가 필요합니다.");
  }
  return key;
}

function extractOutputText(data: OpenRouterResponseBody): string {
  return data.choices?.[0]?.message?.content ?? "";
}

export async function createJsonResponse<T>({
  model,
  instructions,
  input,
  jsonSchema,
}: {
  model: AiModel;
  instructions: string;
  input: string;
  jsonSchema: JsonSchema;
}): Promise<T> {
  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenRouterKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://youtube-trend-ai.vercel.app",
      "X-OpenRouter-Title": "YouTube Trend AI",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: input },
      ],
      provider: {
        require_parameters: true,
      },
      response_format: {
        type: "json_schema",
        json_schema: {
          name: jsonSchema.name,
          strict: true,
          schema: jsonSchema.schema,
        },
      },
      temperature: 0.2,
      max_tokens: 1800,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as OpenRouterResponseBody;
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenRouter API 오류 (${res.status})`);
  }

  const outputText = extractOutputText(data);
  if (!outputText) {
    throw new Error("OpenRouter 응답이 비어 있습니다.");
  }

  try {
    return JSON.parse(outputText) as T;
  } catch {
    throw new Error("OpenRouter JSON 응답을 해석하지 못했습니다.");
  }
}
