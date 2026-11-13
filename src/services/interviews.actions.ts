"use server";

import * as interviews from "@/db/queries/interviews";
import {
  isMember,
  requireInterviewOwner,
  requireOrganization,
  requireUser,
} from "@/lib/access";

/**
 * The signed-in user's interviews, plus those of the organization the browser names if the
 * user really belongs to it. The user id always comes from the session.
 */
export async function getAllInterviews(
  _userId: string,
  organizationId: string,
) {
  const who = requireUser();

  const organization = (await isMember(who, organizationId))
    ? organizationId
    : "";

  return interviews.getAllInterviews(who.userId, organization);
}

/** Open to candidates: the call page loads the interview by its link. */
export async function getInterviewById(id: string) {
  return interviews.getInterviewById(id);
}

export async function updateInterview(payload: any, id: string) {
  await requireInterviewOwner(id);
  // Ownership is not something an edit may change.
  const { user_id, organization_id, ...changes } = payload ?? {};

  return interviews.updateInterview(changes, id);
}

export async function deleteInterview(id: string) {
  await requireInterviewOwner(id);

  return interviews.deleteInterview(id);
}

export async function deactivateInterviewsByOrgId(organizationId: string) {
  await requireOrganization(organizationId);

  return interviews.deactivateInterviewsByOrgId(organizationId);
}
