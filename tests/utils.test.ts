import { describe, expect, it } from "vitest";
import {
  convertSecondstoMMSS,
  convertToAscii,
  isLightColor,
  testEmail,
} from "@/lib/utils";
import { generateQuestionsPrompt } from "@/lib/prompts/generate-questions";
import { getCommunicationAnalysisPrompt } from "@/lib/prompts/communication-analysis";

describe("utils", () => {
  it("formats a duration as minutes and seconds", () => {
    expect(convertSecondstoMMSS(0)).toBe("0m 00s");
    expect(convertSecondstoMMSS(65)).toBe("1m 05s");
    expect(convertSecondstoMMSS(3599)).toBe("59m 59s");
  });

  it("strips characters outside printable ASCII", () => {
    expect(convertToAscii("Moisés – ok")).toBe("Moiss  ok");
  });

  it("recognises an email address", () => {
    expect(testEmail("a@b.co")).toBe(true);
    expect(testEmail("not-an-email")).toBe(false);
  });

  it("decides whether a brand colour is light", () => {
    expect(isLightColor("#ffffff")).toBe(true);
    expect(isLightColor("#000000")).toBe(false);
    expect(isLightColor("#4f46e5")).toBe(false);
  });
});

describe("prompts", () => {
  const base = {
    name: "Backend engineer",
    objective: "Assess API design",
    number: 4,
    context: "Uses Postgres",
  };

  it("builds the question prompt in English by default and in Spanish on request", () => {
    const english = generateQuestionsPrompt(base);
    const spanish = generateQuestionsPrompt({ ...base, language: "es" });

    expect(english).toContain("Number of questions to be generated: 4");
    expect(english).toContain("Uses Postgres");
    expect(spanish).toContain("Número de preguntas a generar: 4");
    expect(spanish).toContain("Backend engineer");
  });

  it("asks for the same JSON fields in both languages", () => {
    for (const language of ["en", "es"]) {
      const prompt = getCommunicationAnalysisPrompt(
        "transcript text",
        language,
      );

      for (const field of [
        "communicationScore",
        "overallFeedback",
        "supportingQuotes",
        "strengths",
        "improvementAreas",
      ]) {
        expect(prompt).toContain(field);
      }
      expect(prompt).toContain("transcript text");
    }
  });
});
