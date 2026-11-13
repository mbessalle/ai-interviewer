"use server";

import * as clients from "@/db/queries/clients";
import { isMember, requireOrganization, requireUser } from "@/lib/access";

export async function updateOrganization(payload: any, id: string) {
  await requireOrganization(id);

  return clients.updateOrganization(payload, id);
}

/**
 * The signed-in user's own row. The id comes from the session, and the organization sent by
 * the browser is used only if the user really belongs to it.
 */
export async function getClientById(
  _id: string,
  email?: string | null,
  organizationId?: string | null,
) {
  const who = requireUser();

  const organization = (await isMember(who, organizationId))
    ? organizationId
    : who.orgId;

  return clients.getClientById(who.userId, email, organization);
}

export async function getOrganizationById(
  organizationId?: string,
  organizationName?: string,
) {
  if (!organizationId) {
    return null;
  }
  await requireOrganization(organizationId);

  return clients.getOrganizationById(organizationId, organizationName);
}
