"use server";

import { OpenAI } from "openai";
import { getResponseByCallId } from "@/db/queries/responses";
import { getInterviewById } from "@/db/queries/interviews";
import { LLM_MODEL } from "@/lib/llm/client";
import { traced } from "@/lib/trace/record";
import { Question } from "@/types/interview";
import { Analytics } from "@/types/response";
import {
  getInterviewAnalyticsPrompt,
  SYSTEM_PROMPT,
} from "@/lib/prompts/analytics";

export const generateInterviewAnalytics = async (payload: {
  callId: string;
  interviewId: string;
  transcript: string;
}) => {
  const { callId, interviewId, transcript } = payload;

  try {
    const response = await getResponseByCallId(callId);
    const interview = await getInterviewById(interviewId);

    if (!response) {
      return { error: "call not found", status: 404 };
    }

    if (response.analytics) {
      return { analytics: response.analytics as Analytics, status: 200 };
    }

    const interviewTranscript = transcript || response.details?.transcript;
    const questions = interview?.questions || [];
    const mainInterviewQuestions = questions
      .map((q: Question, index: number) => `${index + 1}. ${q.question}`)
      .join("\n");

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 5,
      dangerouslyAllowBrowser: true,
    });

    const prompt = getInterviewAnalyticsPrompt(
      interviewTranscript,
      mainInterviewQuestions,
    );

    const request = {
      model: LLM_MODEL,
      messages: [
        { role: "system" as const, content: SYSTEM_PROMPT },
        { role: "user" as const, content: prompt },
      ],
    };
    const baseCompletion = await traced(
      "openai",
      "interview_analytics",
      { ...request, call_id: callId, interview_id: interviewId },
      () =>
        openai.chat.completions.create({
          ...request,
          response_format: { type: "json_object" },
        }),
      (reply) => ({
        model: reply.model,
        usage: reply.usage,
        content: reply.choices[0]?.message?.content ?? "",
      }),
    );

    const basePromptOutput = baseCompletion.choices[0] || {};
    const content = basePromptOutput.message?.content || "";
    const analyticsResponse = JSON.parse(content);

    analyticsResponse.mainInterviewQuestions = questions.map(
      (q: Question) => q.question,
    );

    return { analytics: analyticsResponse, status: 200 };
  } catch (error) {
    console.error("Error in OpenAI request:", error);

    return { error: "internal server error", status: 500 };
  }
};
