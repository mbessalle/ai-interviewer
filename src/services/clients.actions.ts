"use server";

import * as clients from "@/db/queries/clients";
import { requireOrganization, requireUser } from "@/lib/access";

export async function updateOrganization(payload: any, id: string) {
  requireOrganization(id);

  return clients.updateOrganization(payload, id);
}

/** The signed-in user's own row; the id comes from the session, not from the browser. */
export async function getClientById(
  _id: string,
  email?: string | null,
  _organizationId?: string | null,
) {
  const who = requireUser();

  return clients.getClientById(who.userId, email, who.orgId);
}

export async function getOrganizationById(
  organizationId?: string,
  organizationName?: string,
) {
  if (!organizationId) {
    return null;
  }
  requireOrganization(organizationId);

  return clients.getOrganizationById(organizationId, organizationName);
}
