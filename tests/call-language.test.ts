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
    // Lisa's Spanish voice is silent on the agent's own voice model, so it brings one.
    expect(lisa.agentOverride.agent).toEqual({
      language: "es-419",
      voice_id: INTERVIEWERS.LISA.voiceIdSpanish,
      voice_model: INTERVIEWERS.LISA.voiceModelSpanish,
    });
    expect(bob.agentOverride.agent).toEqual({
      language: "es-419",
      voice_id: INTERVIEWERS.BOB.voiceIdSpanish,
    });
    expect(bob.agentOverride.agent.voice_id).not.toBe(
      lisa.agentOverride.agent.voice_id,
    );
  });

  it("never reuses the English voice for Spanish", () => {
    for (const who of [INTERVIEWERS.LISA, INTERVIEWERS.BOB]) {
      expect(who.voiceIdSpanish).not.toBe(who.voiceId);
    }
  });

  it("has a prompt that asks about a gap only when needed, and only about the gap", () => {
    for (const rule of [
      "Ask ONLY if the gap leaves out something you need",
      "Ask about the missing piece only",
      "Do NOT repeat the question",
      "never state the cause as a fact",
      "Ask once per answer",
      "Never pretend to have understood",
    ]) {
      expect(RETELL_AGENT_GENERAL_PROMPT).toContain(rule);
    }
  });

  it("has a prompt that takes the language from the call", () => {
    expect(RETELL_AGENT_GENERAL_PROMPT).toContain("{{language}}");
  });
});
