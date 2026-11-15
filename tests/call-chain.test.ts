import { beforeEach, describe, expect, it, vi } from "vitest";
import * as clients from "@/db/queries/clients";
import * as interviewers from "@/db/queries/interviewers";
import * as interviews from "@/db/queries/interviews";
import { INTERVIEWERS } from "@/lib/constants";
import { readableSlug, uniqueSlug } from "@/lib/slug";
import { freshDatabase } from "./helpers/database";

/**
 * The chain a recruiter and a candidate go through, with a real database and the two real
 * route handlers: create an interview (interviewer + language), open its link, start the
 * call. Only the voice provider is replaced, by a recorder of what it was asked to do.
 */
const retell = vi.hoisted(() => ({ createWebCall: vi.fn() }));

vi.mock("retell-sdk", () => ({
  default: class {
    call = { createWebCall: retell.createWebCall };
  },
}));

import { POST as createInterview } from "@/app/api/create-interview/route";
import { POST as registerCall } from "@/app/api/register-call/route";

const AGENT = { lisa: "agent_lisa", bob: "agent_bob" };

function post(path: string, body: unknown) {
  return new Request(`https://app.test${path}`, {
    method: "POST",
    headers: { host: "app.test", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function recruiterCreates(
  name: string,
  interviewerId: number,
  language: string,
) {
  const response = await createInterview(
    post("/api/create-interview", {
      organizationName: "Acme",
      interviewData: {
        name,
        language,
        // The dashboard sends ids as strings.
        interviewer_id: String(interviewerId),
        user_id: "user_1",
        organization_id: "org_1",
        objective: "test",
        time_duration: "5",
        questions: [
          { id: "q1", question: "Tell me about a system you built." },
        ],
      },
    }),
    undefined as any,
  );
  expect(response.status).toBe(200);
}

/** What the candidate page does with the link: load the interview, then start the call. */
async function candidateOpens(link: string) {
  const interview = await interviews.getInterviewById(link);
  expect(interview).not.toBeNull();

  retell.createWebCall.mockClear();
  const response = await registerCall(
    post("/api/register-call", {
      interview_id: interview!.id,
      interviewer_id: interview!.interviewer_id,
      dynamic_data: { name: "Ana", mins: "5", objective: "x", questions: "q" },
    }),
    undefined as any,
  );
  expect(response.status).toBe(200);
  expect(retell.createWebCall).toHaveBeenCalledTimes(1);

  return { interview: interview!, call: retell.createWebCall.mock.calls[0][0] };
}

let lisaId: number;
let bobId: number;

beforeEach(async () => {
  await freshDatabase();
  await clients.getClientById("user_1", "ana@example.com", "org_1");
  const base = {
    description: "d",
    image: "/i.jpg",
    empathy: 7,
    exploration: 7,
    rapport: 7,
    speed: 5,
  };
  lisaId = (await interviewers.createInterviewer({
    ...base,
    name: INTERVIEWERS.LISA.name,
    agent_id: AGENT.lisa,
  }))!.id;
  bobId = (await interviewers.createInterviewer({
    ...base,
    name: INTERVIEWERS.BOB.name,
    agent_id: AGENT.bob,
  }))!.id;
  retell.createWebCall.mockReset();
  retell.createWebCall.mockResolvedValue({
    call_id: "call_1",
    access_token: "t",
  });
});

describe("from the dashboard choice to the call", () => {
  const cases = [
    {
      who: "lisa",
      language: "en",
      speaks: "English",
      speech: "en-US",
      voice: undefined,
    },
    {
      who: "bob",
      language: "en",
      speaks: "English",
      speech: "en-US",
      voice: undefined,
    },
    {
      who: "lisa",
      language: "es",
      speaks: "Spanish",
      speech: "es-419",
      voice: INTERVIEWERS.LISA.voiceIdSpanish,
    },
    {
      who: "bob",
      language: "es",
      speaks: "Spanish",
      speech: "es-419",
      voice: INTERVIEWERS.BOB.voiceIdSpanish,
    },
  ] as const;

  it.each(cases)(
    "$who + $language starts a call with that interviewer in that language",
    async ({ who, language, speaks, speech, voice }) => {
      await recruiterCreates(
        `Role ${who} ${language}`,
        who === "lisa" ? lisaId : bobId,
        language,
      );
      const [created] = await interviews.getAllInterviews("user_1", "org_1");

      const { call } = await candidateOpens(created.readable_slug!);

      expect(call.agent_id).toBe(AGENT[who]);
      expect(call.retell_llm_dynamic_variables.language).toBe(speaks);
      expect(call.agent_override.agent.language).toBe(speech);
      expect(call.agent_override.agent.voice_id).toBe(voice);
    },
  );

  it("gives two interviews with the same name their own links", async () => {
    // The case that went wrong live: an older Spanish interview with Lisa, then a new
    // English one with Bob under the same name. The new link opened the old interview.
    await recruiterCreates("senior", lisaId, "es");
    await recruiterCreates("senior", bobId, "en");

    const all = await interviews.getAllInterviews("user_1", "org_1");
    const spanish = all.find((row) => row.language === "es")!;
    const english = all.find((row) => row.language === "en")!;

    expect(spanish.readable_slug).toBe("acme-senior");
    expect(english.readable_slug).toBe("acme-senior-2");

    const viaEnglishLink = await candidateOpens(english.readable_slug!);
    expect(viaEnglishLink.interview.id).toBe(english.id);
    expect(viaEnglishLink.call.agent_id).toBe(AGENT.bob);
    expect(viaEnglishLink.call.retell_llm_dynamic_variables.language).toBe(
      "English",
    );

    const viaSpanishLink = await candidateOpens(spanish.readable_slug!);
    expect(viaSpanishLink.interview.id).toBe(spanish.id);
    expect(viaSpanishLink.call.agent_id).toBe(AGENT.lisa);
    expect(viaSpanishLink.call.retell_llm_dynamic_variables.language).toBe(
      "Spanish",
    );
  });

  it("refuses a second interview with a link name that is taken", async () => {
    await interviews.createInterview({
      id: "a",
      name: "x",
      readable_slug: "acme-x",
    });

    await expect(
      interviews.createInterview({
        id: "b",
        name: "x",
        readable_slug: "acme-x",
      }),
    ).rejects.toThrow();
  });
});

describe("link names", () => {
  it("are lower-case, dash-separated and free of accents and symbols", () => {
    expect(readableSlug("Acme Corp", "Senior AI Engineer")).toBe(
      "acme-corp-senior-ai-engineer",
    );
    expect(readableSlug("Acme", "Ingeniería / IA (Sr.)")).toBe(
      "acme-ingenieria-ia-sr",
    );
    expect(readableSlug(null, "x")).toBe("x");
  });

  it("number a name that is already in use", async () => {
    const taken = new Set(["acme-senior", "acme-senior-2"]);

    expect(await uniqueSlug("acme-junior", async (s) => taken.has(s))).toBe(
      "acme-junior",
    );
    expect(await uniqueSlug("acme-senior", async (s) => taken.has(s))).toBe(
      "acme-senior-3",
    );
  });
});
