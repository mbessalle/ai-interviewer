import { logger } from "@/lib/logger";
import { getInterviewer } from "@/db/queries/interviewers";
import { getInterviewById } from "@/db/queries/interviews";
import { callLanguage } from "@/lib/call-language";
import { traced } from "@/lib/trace/record";
import { tracedRoute } from "@/lib/trace/route";
import { NextResponse } from "next/server";
import Retell from "retell-sdk";

const retellClient = new Retell({
  apiKey: process.env.RETELL_API_KEY || "",
});

export const POST = tracedRoute("register-call", handle);

async function handle(req: Request) {
  logger.info("register-call request received");

  const body = await req.json();

  // The interview decides the language; the caller's word is not taken for it.
  const interview = body.interview_id
    ? await getInterviewById(body.interview_id)
    : null;
  const interviewerId = interview?.interviewer_id ?? body.interviewer_id;
  const interviewer = await getInterviewer(interviewerId);
  if (!interviewer?.agent_id) {
    return NextResponse.json(
      { error: "interviewer not found" },
      { status: 404 },
    );
  }

  const { languageName, agentOverride } = callLanguage(
    interview?.language,
    interviewer.name,
  );

  const request = {
    agent_id: interviewer.agent_id,
    agent_override: agentOverride,
    retell_llm_dynamic_variables: {
      ...body.dynamic_data,
      language: languageName,
    },
  };
  const registerCallResponse = await traced(
    "retell",
    "create-web-call",
    {
      ...request,
      // Not sent to Retell: kept so the trace shows which interview the call is for.
      interview_id: interview?.id ?? null,
      interviewer: interviewer.name,
    },
    () => retellClient.call.createWebCall(request),
  );

  logger.info("Call registered successfully");

  return NextResponse.json(
    {
      registerCallResponse,
    },
    { status: 200 },
  );
}
