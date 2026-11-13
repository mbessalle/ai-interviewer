import { and, desc, eq, or } from "drizzle-orm";
import { getDb } from "../client";
import { columnsOnly } from "../columns";
import { feedback, interview, response } from "../schema";
import type { Interview } from "@/types/interview";

export async function getAllInterviews(
  userId: string,
  organizationId: string,
): Promise<Interview[]> {
  const owner = organizationId
    ? or(
        eq(interview.organization_id, organizationId),
        eq(interview.user_id, userId),
      )
    : eq(interview.user_id, userId);

  const rows = await getDb()
    .select()
    .from(interview)
    .where(owner)
    .orderBy(desc(interview.created_at));

  return rows as unknown as Interview[];
}

/** Looks an interview up by its id or by its readable slug. */
export async function getInterviewById(id: string): Promise<Interview | null> {
  const [row] = await getDb()
    .select()
    .from(interview)
    .where(or(eq(interview.id, id), eq(interview.readable_slug, id)));

  return (row as unknown as Interview) ?? null;
}

export async function updateInterview(payload: any, id: string) {
  const values = columnsOnly(interview, payload, ["id", "created_at"]);
  if (Object.keys(values).length === 0) {
    return [];
  }

  return getDb()
    .update(interview)
    .set(values)
    .where(eq(interview.id, id))
    .returning();
}

/** Deletes an interview with its responses and feedback, all or nothing. */
export async function deleteInterview(id: string) {
  return getDb().transaction(async (tx) => {
    await tx.delete(response).where(eq(response.interview_id, id));
    await tx.delete(feedback).where(eq(feedback.interview_id, id));

    return tx.delete(interview).where(eq(interview.id, id)).returning();
  });
}

export async function createInterview(payload: any) {
  const values = columnsOnly(interview, payload, ["created_at"]);

  return getDb()
    .insert(interview)
    .values(values as typeof interview.$inferInsert)
    .returning();
}

export async function deactivateInterviewsByOrgId(organizationId: string) {
  await getDb()
    .update(interview)
    .set({ is_active: false })
    .where(
      and(
        eq(interview.organization_id, organizationId),
        eq(interview.is_active, true),
      ),
    );
}
