import "server-only";
import { auth } from "@clerk/nextjs/server";
import { getInterviewById } from "@/db/queries/interviews";
import { getResponseByCallId } from "@/db/queries/responses";

/**
 * Who is calling a server action. Server actions are reachable by anyone who can reach the
 * site, so each one states who may call it; nothing here trusts ids sent by the browser.
 */
export type Caller = { userId: string | null; orgId: string | null };

export class AccessError extends Error {}

export function caller(): Caller {
  const { userId, orgId } = auth();

  return { userId: userId ?? null, orgId: orgId ?? null };
}

export function requireUser(): Caller & { userId: string } {
  const who = caller();
  if (!who.userId) {
    throw new AccessError("Sign in to do this");
  }

  return who as Caller & { userId: string };
}

/** The signed-in user must be acting for this organization. */
export function requireOrganization(organizationId: string) {
  const who = requireUser();
  if (!organizationId || who.orgId !== organizationId) {
    throw new AccessError("This organization is not yours");
  }

  return who;
}

export function ownsInterview(
  who: Caller,
  row: { user_id: string | null; organization_id: string | null } | null,
) {
  if (!row || !who.userId) {
    return false;
  }

  return (
    row.user_id === who.userId ||
    (who.orgId !== null && row.organization_id === who.orgId)
  );
}

/** The interview must belong to the signed-in user or their organization. */
export async function requireInterviewOwner(interviewId: string) {
  const who = requireUser();
  if (!ownsInterview(who, await getInterviewById(interviewId))) {
    throw new AccessError("This interview is not yours");
  }

  return who;
}

/** The response must belong to an interview the signed-in user owns. */
export async function requireResponseOwner(callId: string) {
  const row = await getResponseByCallId(callId);
  if (!row?.interview_id) {
    throw new AccessError("Response not found");
  }
  await requireInterviewOwner(row.interview_id);

  return row;
}
