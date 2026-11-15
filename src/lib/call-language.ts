import { INTERVIEWERS } from "@/lib/constants";

type CallLanguage = {
  /** Passed to the agent's prompt as {{language}}. */
  languageName: string;
  /** Settings that replace the stored agent's for this one call. */
  agentOverride: {
    agent: { language: "en-US" | "es-419"; voice_id?: string };
  };
};

/**
 * Chooses the spoken language and the voice for one call.
 *
 * Each interviewer is a single Retell agent with an English voice. A Spanish
 * interview keeps the same agent and swaps in a native Spanish voice for that
 * call only, so the candidate never hears Spanish read with an English accent.
 */
export function callLanguage(
  interviewLanguage: string | null | undefined,
  interviewerName: string | null | undefined,
): CallLanguage {
  if (interviewLanguage !== "es") {
    return {
      languageName: "English",
      agentOverride: { agent: { language: "en-US" } },
    };
  }

  const isBob = interviewerName === INTERVIEWERS.BOB.name;
  const voice = isBob
    ? INTERVIEWERS.BOB.voiceIdSpanish
    : INTERVIEWERS.LISA.voiceIdSpanish;

  return {
    languageName: "Spanish",
    agentOverride: { agent: { language: "es-419", voice_id: voice } },
  };
}
