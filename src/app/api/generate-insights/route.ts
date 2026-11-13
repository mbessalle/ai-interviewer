import { NextResponse } from "next/server";
import { ResponseService } from "@/services/responses.service";
import { InterviewService } from "@/services/interviews.service";
import {
  SYSTEM_PROMPT,
  createUserPrompt,
} from "@/lib/prompts/generate-insights";
import { logger } from "@/lib/logger";
import { LlmShapeError, chatJson } from "@/lib/llm/chat";
import { LLM_MODEL, openaiClient } from "@/lib/llm/client";
import { InsightsSchema } from "@/lib/llm/schemas";

export async function POST(req: Request) {
  logger.info("generate-insights request received");
  const body = await req.json();

  const responses = await ResponseService.getAllResponses(body.interviewId);
  const interview = await InterviewService.getInterviewById(body.interviewId);

  let callSummaries = "";
  if (responses) {
    responses.forEach((response) => {
      callSummaries += response.details?.call_analysis?.call_summary;
    });
  }

  try {
    const { data, content } = await chatJson(openaiClient(), {
      model: LLM_MODEL,
      system: SYSTEM_PROMPT,
      user: createUserPrompt(
        callSummaries,
        interview.name,
        interview.objective,
        interview.description,
      ),
      purpose: "generate_insights",
      schema: InsightsSchema,
    });

    // Only a validated reply is stored.
    await InterviewService.updateInterview(
      { insights: data.insights },
      body.interviewId,
    );

    logger.info("Insights generated successfully");

    return NextResponse.json({ response: content }, { status: 200 });
  } catch (error) {
    if (error instanceof LlmShapeError) {
      logger.error(`Unexpected model reply: ${error.issues.join("; ")}`);

      return NextResponse.json(
        { error: "model returned an unexpected reply", details: error.issues },
        { status: 502 },
      );
    }
    logger.error("Error generating insights");

    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 },
    );
  }
}
