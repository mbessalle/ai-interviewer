import { getDb } from "../client";
import { columnsOnly } from "../columns";
import { feedback } from "../schema";

export async function submitFeedback(feedbackData: any) {
  const values = columnsOnly(feedback, feedbackData, ["id", "created_at"]);

  return getDb().insert(feedback).values(values).returning();
}
