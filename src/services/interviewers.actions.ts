"use server";

import * as interviewers from "@/db/queries/interviewers";
import { requireUser } from "@/lib/access";
import { tracedAction } from "@/lib/trace/record";

export async function getAllInterviewers(_clientId: string = "") {
  return tracedAction("interviewers.getAllInterviewers", null, async () => {
    requireUser();

    return interviewers.getAllInterviewers();
  });
}

export async function createInterviewer(payload: any) {
  return tracedAction("interviewers.createInterviewer", payload, async () => {
    requireUser();

    return interviewers.createInterviewer(payload);
  });
}

/** Open to candidates: the call page shows who is interviewing them. */
export async function getInterviewer(interviewerId: bigint | number) {
  return tracedAction(
    "interviewers.getInterviewer",
    { interviewer_id: interviewerId },
    () => interviewers.getInterviewer(interviewerId),
  );
}
