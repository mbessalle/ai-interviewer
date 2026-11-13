import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { ZodType } from "zod";

/** The part of the OpenAI client this module uses, so tests can pass a plain object. */
export interface ChatClient {
  chat: {
    completions: {
      create(request: {
        model: string;
        messages: { role: "system" | "user"; content: string }[];
        response_format: { type: "json_object" };
      }): Promise<{
        model?: string;
        usage?: { prompt_tokens: number; completion_tokens: number } | null;
        choices: { message?: { content?: string | null } | null }[];
      }>;
    };
  };
}

/** The model answered, but not with the JSON shape the prompt asked for. */
export class LlmShapeError extends Error {
  constructor(
    public readonly purpose: string,
    public readonly issues: string[],
  ) {
    super(`The model reply for "${purpose}" did not match the expected shape`);
    this.name = "LlmShapeError";
  }
}

export interface ChatJsonRequest<T> {
  model: string;
  system: string;
  user: string;
  /** What the call is for, e.g. "generate_questions". Recorded on the trace span. */
  purpose: string;
  schema: ZodType<T>;
}

export interface ChatJsonResult<T> {
  /** The validated reply. */
  data: T;
  /** The raw JSON text, for callers that pass it through unchanged. */
  content: string;
}

/**
 * One JSON-mode chat completion: traced with the OpenTelemetry GenAI attributes
 * (model, token usage) and validated against a zod schema.
 */
export async function chatJson<T>(
  client: ChatClient,
  request: ChatJsonRequest<T>,
): Promise<ChatJsonResult<T>> {
  const tracer = trace.getTracer("ai-interviewer.llm");

  return tracer.startActiveSpan(`chat ${request.model}`, async (span) => {
    span.setAttributes({
      "gen_ai.operation.name": "chat",
      "gen_ai.provider.name": "openai",
      "gen_ai.request.model": request.model,
      "app.llm.purpose": request.purpose,
    });

    try {
      const completion = await client.chat.completions.create({
        model: request.model,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        response_format: { type: "json_object" },
      });

      if (completion.usage) {
        span.setAttributes({
          "gen_ai.usage.input_tokens": completion.usage.prompt_tokens,
          "gen_ai.usage.output_tokens": completion.usage.completion_tokens,
        });
      }
      span.setAttribute(
        "gen_ai.response.model",
        completion.model ?? request.model,
      );

      const content = completion.choices[0]?.message?.content ?? "";
      const data = parseReply(content, request);
      span.setAttribute("app.llm.reply_valid", true);

      return { data, content };
    } catch (error) {
      span.setAttribute("app.llm.reply_valid", false);
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}

function parseReply<T>(content: string, request: ChatJsonRequest<T>): T {
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new LlmShapeError(request.purpose, ["the reply is not valid JSON"]);
  }

  const parsed = request.schema.safeParse(json);
  if (!parsed.success) {
    throw new LlmShapeError(
      request.purpose,
      parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      ),
    );
  }

  return parsed.data;
}
