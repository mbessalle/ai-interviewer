"use server";

import * as responses from "@/db/queries/responses";
import {
  caller,
  requireInterviewOwner,
  requireOrganization,
  requireResponseOwner,
} from "@/lib/access";
import { tracedAction } from "@/lib/trace/record";

/** Open to candidates: starting a call records who is taking it. */
export async function createResponse(payload: any) {
  return tracedAction("responses.createResponse", payload, async () => {
    const { interview_id, call_id, email, name } = payload ?? {};

    return responses.createResponse({ interview_id, call_id, email, name });
  });
}

/**
 * A candidate (not signed in) may only mark their call as ended and report tab switches.
 * Anything else, such as the candidate status, needs the interview's owner.
 */
export async function saveResponse(payload: any, callId: string) {
  return tracedAction(
    "responses.saveResponse",
    { payload, call_id: callId },
    async () => {
      if (!caller().userId) {
        const { is_ended, tab_switch_count } = payload ?? {};

        return responses.updateResponse({ is_ended, tab_switch_count }, callId);
      }
      await requireResponseOwner(callId);
      const { interview_id, call_id, ...changes } = payload ?? {};

      return responses.updateResponse(changes, callId);
    },
  );
}

export async function getAllResponses(interviewId: string) {
  return tracedAction(
    "responses.getAllResponses",
    { interview_id: interviewId },
    async () => {
      await requireInterviewOwner(interviewId);

      return responses.getAllResponses(interviewId);
    },
  );
}

export async function getResponseCountByOrganizationId(organizationId: string) {
  return tracedAction(
    "responses.getResponseCountByOrganizationId",
    { organization_id: organizationId },
    async () => {
      await requireOrganization(organizationId);

      return responses.getResponseCountByOrganizationId(organizationId);
    },
  );
}

/** Open to candidates, and answers yes or no only: other candidates' emails stay private. */
export async function emailHasResponded(interviewId: string, email: string) {
  return tracedAction(
    "responses.emailHasResponded",
    { interview_id: interviewId, email },
    () => responses.emailHasResponded(interviewId, email),
  );
}

export async function getResponseByCallId(callId: string) {
  return tracedAction(
    "responses.getResponseByCallId",
    { call_id: callId },
    () => requireResponseOwner(callId),
  );
}

export async function deleteResponse(callId: string) {
  return tracedAction(
    "responses.deleteResponse",
    { call_id: callId },
    async () => {
      await requireResponseOwner(callId);

      return responses.deleteResponse(callId);
    },
  );
}
