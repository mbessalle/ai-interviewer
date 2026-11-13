import { NextResponse } from "next/server";
import {
  SYSTEM_PROMPT,
  generateQuestionsPrompt,
} from "@/lib/prompts/generate-questions";
import { logger } from "@/lib/logger";
import { LlmShapeError, chatJson } from "@/lib/llm/chat";
import { LLM_MODEL, openaiClient } from "@/lib/llm/client";
import { GeneratedQuestionsSchema } from "@/lib/llm/schemas";

export const maxDuration = 60;

export async function POST(req: Request) {
  logger.info("generate-interview-questions request received");
  const body = await req.json();

  try {
    const { content } = await chatJson(openaiClient(), {
      model: LLM_MODEL,
      system: SYSTEM_PROMPT,
      user: generateQuestionsPrompt(body),
      purpose: "generate_questions",
      schema: GeneratedQuestionsSchema,
    });

    logger.info("Interview questions generated successfully");

    return NextResponse.json({ response: content }, { status: 200 });
  } catch (error) {
    if (error instanceof LlmShapeError) {
      logger.error(`Unexpected model reply: ${error.issues.join("; ")}`);

      return NextResponse.json(
        { error: "model returned an unexpected reply", details: error.issues },
        { status: 502 },
      );
    }
    logger.error("Error generating interview questions:", error as Error);

    return NextResponse.json(
      {
        error: "internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
