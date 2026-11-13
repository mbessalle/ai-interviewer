import { trace } from "@opentelemetry/api";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type ChatClient, LlmShapeError, chatJson } from "@/lib/llm/chat";
import {
  CommunicationAnalysisSchema,
  GeneratedQuestionsSchema,
  InsightsSchema,
} from "@/lib/llm/schemas";

const exporter = new InMemorySpanExporter();

beforeAll(() => {
  trace.setGlobalTracerProvider(
    new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    }),
  );
});
beforeEach(() => exporter.reset());

/** A stand-in for the OpenAI client that returns one prepared reply. */
function clientReturning(content: string | Error): ChatClient {
  return {
    chat: {
      completions: {
        create: async (request) => {
          if (content instanceof Error) {
            throw content;
          }

          return {
            model: request.model,
            usage: { prompt_tokens: 900, completion_tokens: 120 },
            choices: [{ message: { content } }],
          };
        },
      },
    },
  };
}

const questionsRequest = {
  model: "test-model",
  system: "system",
  user: "user",
  purpose: "generate_questions",
  schema: GeneratedQuestionsSchema,
};

describe("chatJson", () => {
  it("returns the validated reply and the raw text", async () => {
    const reply = JSON.stringify({
      questions: [{ question: " Tell me about a hard bug. " }],
      description: "A short technical interview.",
    });
    const result = await chatJson(clientReturning(reply), questionsRequest);

    expect(result.data.questions[0].question).toBe("Tell me about a hard bug.");
    expect(result.content).toBe(reply);
  });

  it("records the GenAI attributes on a span", async () => {
    await chatJson(
      clientReturning(
        JSON.stringify({ questions: [{ question: "q" }], description: "d" }),
      ),
      questionsRequest,
    );
    const [span] = exporter.getFinishedSpans();

    expect(span.name).toBe("chat test-model");
    expect(span.attributes).toMatchObject({
      "gen_ai.operation.name": "chat",
      "gen_ai.request.model": "test-model",
      "gen_ai.usage.input_tokens": 900,
      "gen_ai.usage.output_tokens": 120,
      "app.llm.purpose": "generate_questions",
      "app.llm.reply_valid": true,
    });
  });

  it.each([
    ["not JSON at all", "the reply is not valid JSON"],
    [JSON.stringify({ description: "d" }), "questions: Required"],
    [
      JSON.stringify({ questions: [], description: "d" }),
      "questions: the model returned no questions",
    ],
    [
      JSON.stringify({ questions: [{ question: "  " }], description: "d" }),
      "questions.0.question",
    ],
  ])("rejects a reply of the wrong shape: %s", async (reply, expected) => {
    const call = chatJson(clientReturning(reply), questionsRequest);

    await expect(call).rejects.toBeInstanceOf(LlmShapeError);
    await call.catch((error: LlmShapeError) => {
      expect(error.issues.join(" | ")).toContain(expected);
    });
    expect(
      exporter.getFinishedSpans()[0].attributes["app.llm.reply_valid"],
    ).toBe(false);
  });

  it("passes provider failures through and marks the span as failed", async () => {
    const call = chatJson(
      clientReturning(new Error("rate limited")),
      questionsRequest,
    );

    await expect(call).rejects.toThrow("rate limited");
    expect(exporter.getFinishedSpans()[0].status.code).toBe(2);
  });
});

describe("reply schemas", () => {
  it("accepts a complete communication analysis and enforces its ranges", () => {
    const analysis = {
      communicationScore: 7,
      overallFeedback: "Clear and structured.",
      supportingQuotes: [
        {
          quote: "I led the migration",
          analysis: "ownership",
          type: "strength",
        },
      ],
      strengths: ["clarity"],
      improvementAreas: ["brevity"],
    };

    expect(CommunicationAnalysisSchema.safeParse(analysis).success).toBe(true);
    expect(
      CommunicationAnalysisSchema.safeParse({
        ...analysis,
        communicationScore: 11,
      }).success,
    ).toBe(false);
    expect(
      CommunicationAnalysisSchema.safeParse({
        ...analysis,
        supportingQuotes: [{ quote: "q", analysis: "a", type: "neutral" }],
      }).success,
    ).toBe(false);
  });

  it("requires at least one insight", () => {
    expect(
      InsightsSchema.safeParse({ insights: ["One clear finding."] }).success,
    ).toBe(true);
    expect(InsightsSchema.safeParse({ insights: [] }).success).toBe(false);
  });
});
