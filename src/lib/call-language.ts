import { INTERVIEWERS } from "@/lib/constants";

type VoiceModel = "eleven_multilingual_v2" | "eleven_flash_v2_5" | "eleven_v4";

type CallLanguage = {
  /** Passed to the agent's prompt as {{language}}. */
  languageName: string;
  /** Settings that replace the stored agent's for this one call. */
  agentOverride: {
    agent: {
      language: "en-US" | "es-419";
      voice_id?: string;
      voice_model?: VoiceModel;
    };
  };
};

/**
 * Chooses the spoken language and the voice for one call.
 *
 * Each interviewer is a single Retell agent with an English voice. A Spanish
 * interview keeps the same agent and swaps in a native Spanish voice for that
 * call only, so the candidate never hears Spanish read with an English accent.
 * A voice that does not work on the agent's voice model brings its own.
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

  const who =
    interviewerName === INTERVIEWERS.BOB.name
      ? INTERVIEWERS.BOB
      : INTERVIEWERS.LISA;
  const model = who.voiceModelSpanish as VoiceModel | undefined;

  return {
    languageName: "Spanish",
    agentOverride: {
      agent: {
        language: "es-419",
        voice_id: who.voiceIdSpanish,
        ...(model && { voice_model: model }),
      },
    },
  };
}
