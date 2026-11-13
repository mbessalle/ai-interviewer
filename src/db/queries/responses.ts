import { and, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../client";
import { columnsOnly } from "../columns";
import { interview, response } from "../schema";
import type { Response } from "@/types/response";

const PROTECTED = ["id", "created_at"];

/** Creates a response and returns its id. */
export async function createResponse(payload: any) {
  const [created] = await getDb()
    .insert(response)
    .values(columnsOnly(response, payload, PROTECTED))
    .returning({ id: response.id });

  return created?.id;
}

export async function updateResponse(payload: any, callId: string) {
  const values = columnsOnly(response, payload, PROTECTED);
  if (Object.keys(values).length === 0) {
    return [];
  }

  return getDb()
    .update(response)
    .set(values)
    .where(eq(response.call_id, callId))
    .returning();
}

/**
 * Finished responses of an interview, newest first. A response whose call details were
 * fetched but carry no call analysis is left out: the call never really took place.
 */
export async function getAllResponses(
  interviewId: string,
): Promise<Response[]> {
  const rows = await getDb()
    .select()
    .from(response)
    .where(
      and(
        eq(response.interview_id, interviewId),
        eq(response.is_ended, true),
        sql`(${response.details} is null or ${response.details} -> 'call_analysis' is not null)`,
      ),
    )
    .orderBy(desc(response.created_at));

  return rows as unknown as Response[];
}

/** How many responses the interviews of an organization have received. */
export async function getResponseCountByOrganizationId(
  organizationId: string,
): Promise<number> {
  const [row] = await getDb()
    .select({ total: count(response.id) })
    .from(response)
    .innerJoin(interview, eq(response.interview_id, interview.id))
    .where(eq(interview.organization_id, organizationId));

  return row?.total ?? 0;
}

/** Whether this email address has already answered the interview. */
export async function emailHasResponded(interviewId: string, email: string) {
  const [row] = await getDb()
    .select({ id: response.id })
    .from(response)
    .where(
      and(eq(response.interview_id, interviewId), eq(response.email, email)),
    )
    .limit(1);

  return Boolean(row);
}

export async function getResponseByCallId(
  callId: string,
): Promise<Response | null> {
  const [row] = await getDb()
    .select()
    .from(response)
    .where(eq(response.call_id, callId));

  return (row as unknown as Response) ?? null;
}

export async function deleteResponse(callId: string) {
  return getDb()
    .delete(response)
    .where(eq(response.call_id, callId))
    .returning();
}
