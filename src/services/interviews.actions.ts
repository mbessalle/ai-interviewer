"use server";

import * as interviews from "@/db/queries/interviews";
import {
  isMember,
  requireInterviewOwner,
  requireOrganization,
  requireUser,
} from "@/lib/access";
import { tracedAction } from "@/lib/trace/record";

/**
 * The signed-in user's interviews, plus those of the organization the browser names if the
 * user really belongs to it. The user id always comes from the session.
 */
export async function getAllInterviews(
  _userId: string,
  organizationId: string,
) {
  return tracedAction(
    "interviews.getAllInterviews",
    { organization_id: organizationId },
    async () => {
      const who = requireUser();

      const organization = (await isMember(who, organizationId))
        ? organizationId
        : "";

      return interviews.getAllInterviews(who.userId, organization);
    },
  );
}

/** Open to candidates: the call page loads the interview by its link. */
export async function getInterviewById(id: string) {
  return tracedAction("interviews.getInterviewById", { link_or_id: id }, () =>
    interviews.getInterviewById(id),
  );
}

export async function updateInterview(payload: any, id: string) {
  return tracedAction(
    "interviews.updateInterview",
    { payload, interview_id: id },
    async () => {
      await requireInterviewOwner(id);
      // Ownership is not something an edit may change.
      const { user_id, organization_id, ...changes } = payload ?? {};

      return interviews.updateInterview(changes, id);
    },
  );
}

export async function deleteInterview(id: string) {
  return tracedAction(
    "interviews.deleteInterview",
    { interview_id: id },
    async () => {
      await requireInterviewOwner(id);

      return interviews.deleteInterview(id);
    },
  );
}

export async function deactivateInterviewsByOrgId(organizationId: string) {
  return tracedAction(
    "interviews.deactivateInterviewsByOrgId",
    { organization_id: organizationId },
    async () => {
      await requireOrganization(organizationId);

      return interviews.deactivateInterviewsByOrgId(organizationId);
    },
  );
}
