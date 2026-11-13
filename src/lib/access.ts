import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
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

const MEMBERSHIP_TTL_MS = 60_000;
const memberships = new Map<string, { at: number; orgs: Set<string> }>();

/** The organizations a user belongs to, asked from Clerk and remembered for a minute. */
async function organizationsOf(userId: string): Promise<Set<string>> {
  const known = memberships.get(userId);
  if (known && Date.now() - known.at < MEMBERSHIP_TTL_MS) {
    return known.orgs;
  }
  const { data } = await clerkClient().users.getOrganizationMembershipList({
    userId,
    limit: 100,
  });
  const orgs = new Set(data.map((membership) => membership.organization.id));
  memberships.set(userId, { at: Date.now(), orgs });

  return orgs;
}

/**
 * Whether the caller belongs to the organization. The organization that is active in the
 * session answers without a network call; otherwise Clerk is asked for the user's
 * memberships, because the browser's selected organization is not always in the session.
 */
export async function isMember(who: Caller, organizationId?: string | null) {
  if (!who.userId || !organizationId) {
    return false;
  }
  if (who.orgId === organizationId) {
    return true;
  }

  return (await organizationsOf(who.userId)).has(organizationId);
}

/** The signed-in user must belong to this organization. */
export async function requireOrganization(organizationId: string) {
  const who = requireUser();
  if (!(await isMember(who, organizationId))) {
    throw new AccessError("This organization is not yours");
  }

  return who;
}

export async function ownsInterview(
  who: Caller,
  row: { user_id: string | null; organization_id: string | null } | null,
) {
  if (!row || !who.userId) {
    return false;
  }

  return (
    row.user_id === who.userId || (await isMember(who, row.organization_id))
  );
}

/** The interview must belong to the signed-in user or one of their organizations. */
export async function requireInterviewOwner(interviewId: string) {
  const who = requireUser();
  if (!(await ownsInterview(who, await getInterviewById(interviewId)))) {
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
