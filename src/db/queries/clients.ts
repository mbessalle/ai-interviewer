import { eq } from "drizzle-orm";
import { getDb } from "../client";
import { columnsOnly } from "../columns";
import { organization, user } from "../schema";
import type { User } from "@/types/user";

export async function updateOrganization(payload: any, id: string) {
  const values = columnsOnly(organization, payload, ["id", "created_at"]);
  if (Object.keys(values).length === 0) {
    return [];
  }

  return getDb()
    .update(organization)
    .set(values)
    .where(eq(organization.id, id))
    .returning();
}

/** Returns the organization, creating it on first sight and keeping its name in step. */
export async function getOrganizationById(
  organizationId?: string | null,
  organizationName?: string | null,
) {
  if (!organizationId) {
    return null;
  }
  const db = getDb();
  const [existing] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, organizationId));

  if (!existing) {
    const [created] = await db
      .insert(organization)
      .values({ id: organizationId, name: organizationName ?? null })
      .onConflictDoNothing()
      .returning();
    if (created) {
      return created;
    }
    // Another request created it in the meantime.
    const [row] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId));

    return row ?? null;
  }

  if (organizationName && existing.name !== organizationName) {
    const [renamed] = await db
      .update(organization)
      .set({ name: organizationName })
      .where(eq(organization.id, organizationId))
      .returning();

    return renamed ?? existing;
  }

  return existing;
}

/** Returns the user row, creating it on first sign-in and following organization changes. */
export async function getClientById(
  id: string,
  email?: string | null,
  organizationId?: string | null,
): Promise<User | null> {
  const db = getDb();
  if (organizationId) {
    // The user row references the organization, so it has to exist first.
    await getOrganizationById(organizationId);
  }
  const [existing] = await db.select().from(user).where(eq(user.id, id));

  if (!existing) {
    const [created] = await db
      .insert(user)
      .values({
        id,
        email: email ?? null,
        organization_id: organizationId ?? null,
      })
      .onConflictDoNothing()
      .returning();

    return (created as unknown as User) ?? null;
  }

  if ((existing.organization_id ?? null) !== (organizationId ?? null)) {
    const [moved] = await db
      .update(user)
      .set({ organization_id: organizationId ?? null })
      .where(eq(user.id, id))
      .returning();

    return (moved ?? existing) as unknown as User;
  }

  return existing as unknown as User;
}
