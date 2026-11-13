import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { columnsOnly } from "../columns";
import { interviewer } from "../schema";
import type { Interviewer } from "@/types/interviewer";

export async function getAllInterviewers(): Promise<Interviewer[]> {
  const rows = await getDb()
    .select()
    .from(interviewer)
    .orderBy(asc(interviewer.id));

  return rows as unknown as Interviewer[];
}

/** Creates an interviewer unless one with the same name and agent already exists. */
export async function createInterviewer(payload: any) {
  const values = columnsOnly(interviewer, payload, ["id", "created_at"]);
  const db = getDb();
  const [existing] = await db
    .select({ id: interviewer.id })
    .from(interviewer)
    .where(
      and(
        eq(interviewer.name, values.name),
        eq(interviewer.agent_id, values.agent_id),
      ),
    );
  if (existing) {
    return null;
  }
  const [created] = await db
    .insert(interviewer)
    .values(values as typeof interviewer.$inferInsert)
    .returning();

  return created ?? null;
}

export async function getInterviewer(
  interviewerId: bigint | number | string,
): Promise<Interviewer | null> {
  const [row] = await getDb()
    .select()
    .from(interviewer)
    .where(eq(interviewer.id, Number(interviewerId)));

  return (row as unknown as Interviewer) ?? null;
}
