import { beforeEach, describe, expect, it } from "vitest";
import * as clients from "@/db/queries/clients";
import * as feedback from "@/db/queries/feedback";
import * as interviewers from "@/db/queries/interviewers";
import * as interviews from "@/db/queries/interviews";
import * as responses from "@/db/queries/responses";
import { freshDatabase } from "./helpers/database";

const LISA = {
  agent_id: "agent_lisa",
  name: "Explorer Lisa",
  description: "Explores",
  image: "/interviewers/lisa.jpg",
  empathy: 7,
  exploration: 10,
  rapport: 7,
  speed: 5,
};

async function seedInterview(id = "int_1", organizationId = "org_1") {
  await clients.getClientById("user_1", "ana@example.com", organizationId);
  await interviews.createInterview({
    id,
    name: "Backend engineer",
    organization_id: organizationId,
    user_id: "user_1",
    readable_slug: `acme-${id}`,
    questions: [{ id: "q1", question: "Tell me about a system you built." }],
  });
}

beforeEach(async () => {
  await freshDatabase();
});

describe("organizations and users", () => {
  it("creates the organization on first sight and returns it afterwards", async () => {
    const created = await clients.getOrganizationById("org_1", "Acme");
    const again = await clients.getOrganizationById("org_1", "Acme");

    expect(created).toMatchObject({ id: "org_1", name: "Acme" });
    expect(again?.created_at).toBe(created?.created_at);
  });

  it("follows a rename", async () => {
    await clients.getOrganizationById("org_1", "Acme");

    expect(await clients.getOrganizationById("org_1", "Acme BV")).toMatchObject(
      { name: "Acme BV" },
    );
  });

  it("does not invent an organization when there is no id", async () => {
    expect(await clients.getOrganizationById(undefined, "Acme")).toBeNull();
  });

  it("creates the user together with an organization that does not exist yet", async () => {
    const user = await clients.getClientById(
      "user_1",
      "ana@example.com",
      "org_new",
    );

    expect(user).toMatchObject({ id: "user_1", organization_id: "org_new" });
    expect(await clients.getOrganizationById("org_new")).not.toBeNull();
  });

  it("moves the user when they switch organization", async () => {
    await clients.getClientById("user_1", "ana@example.com", "org_1");

    expect(
      await clients.getClientById("user_1", "ana@example.com", "org_2"),
    ).toMatchObject({ organization_id: "org_2" });
  });

  it("ignores keys that are not columns and never rewrites the id", async () => {
    await clients.getOrganizationById("org_1", "Acme");
    const [updated] = await clients.updateOrganization(
      { plan: "pro", id: "org_hijacked", is_admin: true },
      "org_1",
    );

    expect(updated).toMatchObject({ id: "org_1", plan: "pro" });
  });
});

describe("interviewers", () => {
  it("does not create the same interviewer twice", async () => {
    const first = await interviewers.createInterviewer(LISA);
    const second = await interviewers.createInterviewer(LISA);

    expect(first).toMatchObject({ name: "Explorer Lisa" });
    expect(second).toBeNull();
    expect(await interviewers.getAllInterviewers()).toHaveLength(1);
  });

  it("finds an interviewer by a numeric or bigint id", async () => {
    const created = await interviewers.createInterviewer(LISA);

    expect(
      await interviewers.getInterviewer(BigInt(created!.id)),
    ).toMatchObject({ agent_id: "agent_lisa" });
    expect(await interviewers.getInterviewer(9999)).toBeNull();
  });
});

describe("interviews", () => {
  it("finds an interview by id or by readable slug", async () => {
    await seedInterview();

    expect(await interviews.getInterviewById("int_1")).toMatchObject({
      name: "Backend engineer",
    });
    expect(await interviews.getInterviewById("acme-int_1")).toMatchObject({
      id: "int_1",
    });
    expect(await interviews.getInterviewById("missing")).toBeNull();
  });

  it("returns timestamps as ISO strings and JSON columns as objects", async () => {
    await seedInterview();
    const interview = await interviews.getInterviewById("int_1");

    expect(String(interview?.created_at)).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
    expect(interview?.questions[0].question).toContain("system you built");
  });

  it("lists interviews of the organization and of the user, not of others", async () => {
    await seedInterview("int_1", "org_1");
    await clients.getClientById("user_2", "bo@example.com", "org_2");
    await interviews.createInterview({
      id: "int_other",
      organization_id: "org_2",
      user_id: "user_2",
    });

    const mine = await interviews.getAllInterviews("user_1", "org_1");

    expect(mine.map((i) => i.id)).toEqual(["int_1"]);
  });

  it("deactivates only the active interviews of one organization", async () => {
    await seedInterview("int_1", "org_1");
    await seedInterview("int_2", "org_2");
    await interviews.deactivateInterviewsByOrgId("org_1");

    expect((await interviews.getInterviewById("int_1"))?.is_active).toBe(false);
    expect((await interviews.getInterviewById("int_2"))?.is_active).toBe(true);
  });

  it("deletes an interview together with its responses and feedback", async () => {
    await seedInterview();
    await responses.createResponse({ interview_id: "int_1", call_id: "c1" });
    await feedback.submitFeedback({ interview_id: "int_1", satisfaction: 2 });

    await interviews.deleteInterview("int_1");

    expect(await interviews.getInterviewById("int_1")).toBeNull();
    expect(await responses.getResponseByCallId("c1")).toBeNull();
  });
});

describe("responses", () => {
  beforeEach(async () => {
    await seedInterview();
  });

  it("creates a response and returns its id", async () => {
    const id = await responses.createResponse({
      interview_id: "int_1",
      call_id: "c1",
      email: "cand@example.com",
    });

    expect(typeof id).toBe("number");
    expect(await responses.getResponseByCallId("c1")).toMatchObject({
      email: "cand@example.com",
      is_ended: false,
    });
  });

  it("lists only finished responses whose call really took place", async () => {
    const make = (call_id: string, more: object) =>
      responses
        .createResponse({ interview_id: "int_1", call_id })
        .then(() => responses.updateResponse(more, call_id));
    await make("running", { is_ended: false });
    await make("ended_not_fetched", { is_ended: true });
    await make("ended_analysed", {
      is_ended: true,
      details: { call_analysis: { call_summary: "Went well" } },
    });
    await make("ended_no_call", {
      is_ended: true,
      details: { transcript: "" },
    });

    const listed = await responses.getAllResponses("int_1");

    expect(listed.map((r) => r.call_id).sort()).toEqual([
      "ended_analysed",
      "ended_not_fetched",
    ]);
  });

  it("counts the responses of one organization", async () => {
    await seedInterview("int_2", "org_2");
    await responses.createResponse({ interview_id: "int_1", call_id: "a" });
    await responses.createResponse({ interview_id: "int_1", call_id: "b" });
    await responses.createResponse({ interview_id: "int_2", call_id: "c" });

    expect(await responses.getResponseCountByOrganizationId("org_1")).toBe(2);
    expect(await responses.getResponseCountByOrganizationId("org_none")).toBe(
      0,
    );
  });

  it("answers whether an email already responded without listing emails", async () => {
    await responses.createResponse({
      interview_id: "int_1",
      call_id: "c1",
      email: "cand@example.com",
    });

    expect(await responses.emailHasResponded("int_1", "cand@example.com")).toBe(
      true,
    );
    expect(await responses.emailHasResponded("int_1", "new@example.com")).toBe(
      false,
    );
  });

  it("an update with nothing valid in it changes nothing", async () => {
    await responses.createResponse({ interview_id: "int_1", call_id: "c1" });

    expect(await responses.updateResponse({ nonsense: 1 }, "c1")).toEqual([]);
  });
});
