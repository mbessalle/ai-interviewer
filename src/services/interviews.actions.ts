"use server";

import * as interviews from "@/db/queries/interviews";
import {
  requireInterviewOwner,
  requireOrganization,
  requireUser,
} from "@/lib/access";

/** The signed-in user's interviews; ids come from the session, not from the browser. */
export async function getAllInterviews(
  _userId: string,
  _organizationId: string,
) {
  const who = requireUser();

  return interviews.getAllInterviews(who.userId, who.orgId ?? "");
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
  requireOrganization(organizationId);

  return interviews.deactivateInterviewsByOrgId(organizationId);
}
