import { OpenAI } from "openai";

/** The chat model used for question generation, insights and analysis. */
export const LLM_MODEL = process.env.LLM_MODEL || "gpt-4o";

export function openaiClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 5,
    dangerouslyAllowBrowser: true,
  });
}
