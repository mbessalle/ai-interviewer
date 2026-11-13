import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import {
  createInterviewer,
  getAllInterviewers,
} from "@/db/queries/interviewers";
import { NextResponse, NextRequest } from "next/server";
import Retell from "retell-sdk";
import { INTERVIEWERS, RETELL_AGENT_GENERAL_PROMPT } from "@/lib/constants";

const retellClient = new Retell({
  apiKey: process.env.RETELL_API_KEY || "",
});

// Creates paid voice agents, so it must never run while the site is being built.
export const dynamic = "force-dynamic";

export async function GET(res: NextRequest) {
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

    const newModel = await retellClient.llm.create({
      // Retell no longer offers gpt-4o; this matches the model the existing agents use.
      model: "gpt-5.1",
      general_prompt: RETELL_AGENT_GENERAL_PROMPT,
      general_tools: [
        {
          type: "end_call",
          name: "end_call_1",
          description:
            "End the call only when ALL the predefined questions have been asked and answered. Use this to conclude the interview professionally.",
        },
      ],
    });

    // Create Lisa
    const newFirstAgent = await retellClient.agent.create({
      response_engine: { llm_id: newModel.llm_id, type: "retell-llm" },
      voice_id: "11labs-Chloe",
      agent_name: "Lisa",
    });

    const newInterviewer = await createInterviewer({
      agent_id: newFirstAgent.agent_id,
      ...INTERVIEWERS.LISA,
    });

    // Create Bob
    const newSecondAgent = await retellClient.agent.create({
      response_engine: { llm_id: newModel.llm_id, type: "retell-llm" },
      voice_id: "11labs-Brian",
      agent_name: "Bob",
    });

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
