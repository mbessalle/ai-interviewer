"use server";

import * as feedback from "@/db/queries/feedback";
import { tracedAction } from "@/lib/trace/record";
import { FeedbackData } from "@/types/response";

/** Open to candidates: they are not signed in. */
export async function submitFeedback(feedbackData: FeedbackData) {
  return tracedAction("feedback.submitFeedback", feedbackData, async () => {
    const { interview_id, satisfaction, feedback: text, email } = feedbackData;

    return feedback.submitFeedback({
      interview_id,
      satisfaction,
      feedback: text,
      email,
    });
  });
}
