import { logger } from "@/lib/logger";
import { generateInterviewAnalytics } from "@/services/analytics.service";
import { getResponseByCallId, updateResponse } from "@/db/queries/responses";
import { traced } from "@/lib/trace/record";
import { tracedRoute } from "@/lib/trace/route";
import { NextResponse } from "next/server";
import Retell from "retell-sdk";

const retell = new Retell({
  apiKey: process.env.RETELL_API_KEY || "",
});

export const POST = tracedRoute("get-call", handle);

async function handle(req: Request) {
  logger.info("get-call request received");
  const body = await req.json();

  const callDetails = await getResponseByCallId(body.id);
  if (!callDetails) {
    return NextResponse.json({ error: "call not found" }, { status: 404 });
  }
  let callResponse = callDetails.details;
  if (callDetails.is_analysed) {
    return NextResponse.json(
      {
        callResponse,
        analytics: callDetails.analytics,
      },
      { status: 200 },
    );
  }
  const callOutput = await traced(
    "retell",
    "get-call",
    { call_id: body.id },
    () => retell.call.retrieve(body.id),
  );
  const interviewId = callDetails?.interview_id;
  callResponse = callOutput;
  const duration = Math.round(
    callResponse.end_timestamp / 1000 - callResponse.start_timestamp / 1000,
  );

  const payload = {
    callId: body.id,
    interviewId: interviewId,
    transcript: callResponse.transcript,
  };
  const result = await generateInterviewAnalytics(payload);

  const analytics = result.analytics;

  await updateResponse(
    {
      details: callResponse,
      is_analysed: true,
      duration: duration,
      analytics: analytics,
    },
    body.id,
  );

  logger.info("Call analysed successfully");

  return NextResponse.json(
    {
      callResponse,
      analytics,
    },
    { status: 200 },
  );
}
