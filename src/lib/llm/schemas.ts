import { z } from "zod";

/**
 * The shape each prompt asks the model to return. A reply that does not fit is rejected
 * before it reaches the database or the browser.
 */

export const GeneratedQuestionsSchema = z.object({
  questions: z
    .array(z.object({ question: z.string().trim().min(1) }))
    .min(1, "the model returned no questions"),
  description: z.string().trim().min(1),
});

export const InsightsSchema = z.object({
  insights: z.array(z.string().trim().min(1)).min(1),
});

export const CommunicationAnalysisSchema = z.object({
  communicationScore: z.number().min(0).max(10),
  overallFeedback: z.string().trim().min(1),
  supportingQuotes: z.array(
    z.object({
      quote: z.string(),
      analysis: z.string(),
      type: z.enum(["strength", "improvement_area"]),
    }),
  ),
  strengths: z.array(z.string()),
  improvementAreas: z.array(z.string()),
});

export type GeneratedQuestions = z.infer<typeof GeneratedQuestionsSchema>;
export type Insights = z.infer<typeof InsightsSchema>;
export type CommunicationAnalysis = z.infer<typeof CommunicationAnalysisSchema>;
