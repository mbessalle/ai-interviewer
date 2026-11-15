import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import {
  createInterviewer,
  getAllInterviewers,
} from "@/db/queries/interviewers";
import { NextResponse, NextRequest } from "next/server";
import Retell from "retell-sdk";
import { INTERVIEWERS, RETELL_AGENT_GENERAL_PROMPT } from "@/lib/constants";
import { traced } from "@/lib/trace/record";
import { tracedRoute } from "@/lib/trace/route";

const retellClient = new Retell({
  apiKey: process.env.RETELL_API_KEY || "",
});

// Creates paid voice agents, so it must never run while the site is being built.
export const dynamic = "force-dynamic";

export const GET = tracedRoute("create-interviewer", handle);

async function handle(_req: NextRequest) {
  logger.info("create-interviewer request received");

  if (!auth().userId) {
    return NextResponse.json({ error: "sign in first" }, { status: 401 });
  }

  try {
    // The two default interviewers are created once; asking again returns them.
    const existing = await getAllInterviewers();
    if (existing.length > 0) {
      return NextResponse.json({ interviewers: existing }, { status: 200 });
    }

    const modelRequest = {
      // The same model the live agents use.
      model: "gpt-6.1-sol" as const,
      general_prompt: RETELL_AGENT_GENERAL_PROMPT,
      general_tools: [
        {
          type: "end_call" as const,
          name: "end_call_1",
          description:
            "End the call only when ALL the predefined questions have been asked and answered. Use this to conclude the interview professionally.",
        },
      ],
    };
    const newModel = await traced("retell", "create-llm", modelRequest, () =>
      retellClient.llm.create(modelRequest),
    );

    const agentRequest = (agent_name: string, voice_id: string) => ({
      response_engine: {
        llm_id: newModel.llm_id,
        type: "retell-llm" as const,
      },
      voice_id,
      agent_name,
    });
    const createAgent = (agent_name: string, voice_id: string) => {
      const request = agentRequest(agent_name, voice_id);

      return traced("retell", "create-agent", request, () =>
        retellClient.agent.create(request),
      );
    };

    // Create Lisa
    const newFirstAgent = await createAgent("Lisa", "11labs-Chloe");

    const newInterviewer = await createInterviewer({
      agent_id: newFirstAgent.agent_id,
      ...INTERVIEWERS.LISA,
    });

    // Create Bob
    const newSecondAgent = await createAgent("Bob", "11labs-Brian");

    const newSecondInterviewer = await createInterviewer({
      agent_id: newSecondAgent.agent_id,
      ...INTERVIEWERS.BOB,
    });

    logger.info("");

    return NextResponse.json(
      {
        newInterviewer,
        newSecondInterviewer,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Error creating interviewers:");

    return NextResponse.json(
      { error: "Failed to create interviewers" },
      { status: 500 },
    );
  }
}
