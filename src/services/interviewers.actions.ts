"use server";

import * as interviewers from "@/db/queries/interviewers";
import { requireUser } from "@/lib/access";

export async function getAllInterviewers(_clientId: string = "") {
  requireUser();

  return interviewers.getAllInterviewers();
}

export async function createInterviewer(payload: any) {
  requireUser();

  return interviewers.createInterviewer(payload);
}

/** Open to candidates: the call page shows who is interviewing them. */
export async function getInterviewer(interviewerId: bigint | number) {
  return interviewers.getInterviewer(interviewerId);
}
