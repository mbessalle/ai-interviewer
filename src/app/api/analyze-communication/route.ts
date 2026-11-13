import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  SYSTEM_PROMPT,
  getCommunicationAnalysisPrompt,
} from "@/lib/prompts/communication-analysis";
import { LlmShapeError, chatJson } from "@/lib/llm/chat";
import { LLM_MODEL, openaiClient } from "@/lib/llm/client";
import { CommunicationAnalysisSchema } from "@/lib/llm/schemas";

export async function POST(req: Request) {
  logger.info("analyze-communication request received");

  try {
    const body = await req.json();
    const { transcript } = body;

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 },
      );
    }

    const { data } = await chatJson(openaiClient(), {
      model: LLM_MODEL,
      system: SYSTEM_PROMPT,
      user: getCommunicationAnalysisPrompt(transcript),
      purpose: "analyze_communication",
      schema: CommunicationAnalysisSchema,
    });

    logger.info("Communication analysis completed successfully");

    return NextResponse.json({ analysis: data }, { status: 200 });
  } catch (error) {
    if (error instanceof LlmShapeError) {
      logger.error(`Unexpected model reply: ${error.issues.join("; ")}`);

      return NextResponse.json(
        { error: "model returned an unexpected reply", details: error.issues },
        { status: 502 },
      );
    }
    logger.error("Error analyzing communication skills");

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
