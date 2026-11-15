import { describe, expect, it } from "vitest";
import { callLanguage } from "@/lib/call-language";
import { INTERVIEWERS, RETELL_AGENT_GENERAL_PROMPT } from "@/lib/constants";

describe("callLanguage", () => {
  it("keeps the agent's own voice and pins English for an English interview", () => {
    expect(callLanguage("en", INTERVIEWERS.LISA.name)).toEqual({
      languageName: "English",
      agentOverride: { agent: { language: "en-US" } },
    });
  });

  it("treats a missing language as English", () => {
    expect(callLanguage(null, INTERVIEWERS.BOB.name).languageName).toBe(
      "English",
    );
    expect(callLanguage(undefined, undefined).agentOverride.agent).toEqual({
      language: "en-US",
    });
  });

  it("gives each interviewer a Spanish voice for a Spanish interview", () => {
    const lisa = callLanguage("es", INTERVIEWERS.LISA.name);
    const bob = callLanguage("es", INTERVIEWERS.BOB.name);

    expect(lisa.languageName).toBe("Spanish");
    expect(lisa.agentOverride.agent).toEqual({
      language: "es-419",
      voice_id: INTERVIEWERS.LISA.voiceIdSpanish,
    });
    expect(bob.agentOverride.agent.voice_id).toBe(
      INTERVIEWERS.BOB.voiceIdSpanish,
    );
    expect(bob.agentOverride.agent.voice_id).not.toBe(
      lisa.agentOverride.agent.voice_id,
    );
  });

  it("never reuses the English voice for Spanish", () => {
    for (const who of [INTERVIEWERS.LISA, INTERVIEWERS.BOB]) {
      expect(who.voiceIdSpanish).not.toBe(who.voiceId);
    }
  });

  it("has a prompt that takes the language from the call", () => {
    expect(RETELL_AGENT_GENERAL_PROMPT).toContain("{{language}}");
  });
});
