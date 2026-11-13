import { beforeEach, describe, expect, it, vi } from "vitest";
import * as clients from "@/db/queries/clients";
import * as interviewQueries from "@/db/queries/interviews";
import * as responseQueries from "@/db/queries/responses";
import { freshDatabase } from "./helpers/database";

/** Who Clerk says is calling (each test sets it) and which organizations people belong to. */
const session = vi.hoisted(() => ({
  userId: null as string | null,
  orgId: null as string | null,
}));
const MEMBERSHIPS: Record<string, string[]> = {
  owner: ["org_1"],
  colleague: ["org_1"],
  stranger: ["org_2"],
};
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => session,
  clerkClient: () => ({
    users: {
      getOrganizationMembershipList: async ({
        userId,
      }: {
        userId: string;
      }) => ({
        data: (MEMBERSHIPS[userId] ?? []).map((id) => ({
          organization: { id },
        })),
      }),
    },
  }),
}));

import * as clientActions from "@/services/clients.actions";
import * as interviewActions from "@/services/interviews.actions";
import * as interviewerActions from "@/services/interviewers.actions";
import * as responseActions from "@/services/responses.actions";

const signIn = (userId: string | null, orgId: string | null = null) =>
  Object.assign(session, { userId, orgId });

beforeEach(async () => {
  await freshDatabase();
  await clients.getClientById("owner", "owner@example.com", "org_1");
  await clients.getClientById("stranger", "s@example.com", "org_2");
  await interviewQueries.createInterview({
    id: "int_1",
    name: "Backend engineer",
    user_id: "owner",
    organization_id: "org_1",
  });
  await responseQueries.createResponse({
    interview_id: "int_1",
    call_id: "call_1",
    email: "cand@example.com",
  });
});

describe("a candidate, who is not signed in", () => {
  beforeEach(() => signIn(null));

  it("can open the interview and start a response", async () => {
    expect(await interviewActions.getInterviewById("int_1")).not.toBeNull();
    expect(
      typeof (await responseActions.createResponse({
        interview_id: "int_1",
        call_id: "call_2",
        email: "new@example.com",
      })),
    ).toBe("number");
  });

  it("can end their call but cannot set their own candidate status", async () => {
    await responseActions.saveResponse(
      { is_ended: true, tab_switch_count: 3, candidate_status: "SELECTED" },
      "call_1",
    );

    expect(await responseQueries.getResponseByCallId("call_1")).toMatchObject({
      is_ended: true,
      tab_switch_count: 3,
      candidate_status: null,
    });
  });

  it("cannot plant analysis results when starting a response", async () => {
    await responseActions.createResponse({
      interview_id: "int_1",
      call_id: "call_3",
      is_analysed: true,
      analytics: { overallScore: 100 },
    });

    expect(await responseQueries.getResponseByCallId("call_3")).toMatchObject({
      is_analysed: false,
      analytics: null,
    });
  });

  it.each([
    [
      "list interviews",
      () => interviewActions.getAllInterviews("owner", "org_1"),
    ],
    ["read responses", () => responseActions.getAllResponses("int_1")],
    ["read a response", () => responseActions.getResponseByCallId("call_1")],
    ["delete a response", () => responseActions.deleteResponse("call_1")],
    [
      "edit an interview",
      () => interviewActions.updateInterview({ name: "x" }, "int_1"),
    ],
    ["delete an interview", () => interviewActions.deleteInterview("int_1")],
    ["list interviewers", () => interviewerActions.getAllInterviewers()],
    [
      "change an organization",
      () => clientActions.updateOrganization({ plan: "pro" }, "org_1"),
    ],
  ])("cannot %s", async (_name, action) => {
    await expect(action()).rejects.toThrow();
  });
});

describe("a signed-in user from another organization", () => {
  beforeEach(() => signIn("stranger", "org_2"));

  it("does not get someone else's interviews by sending their ids", async () => {
    expect(await interviewActions.getAllInterviews("owner", "org_1")).toEqual(
      [],
    );
  });

  it.each([
    ["read its responses", () => responseActions.getAllResponses("int_1")],
    [
      "mark its response",
      () =>
        responseActions.saveResponse(
          { candidate_status: "SELECTED" },
          "call_1",
        ),
    ],
    ["delete its response", () => responseActions.deleteResponse("call_1")],
    ["edit it", () => interviewActions.updateInterview({ name: "x" }, "int_1")],
    ["delete it", () => interviewActions.deleteInterview("int_1")],
    [
      "change its organization",
      () => clientActions.updateOrganization({ plan: "pro" }, "org_1"),
    ],
  ])("cannot %s", async (_name, action) => {
    await expect(action()).rejects.toThrow();
    expect(await interviewQueries.getInterviewById("int_1")).toMatchObject({
      name: "Backend engineer",
    });
  });
});

describe("the owner", () => {
  beforeEach(() => signIn("owner", "org_1"));

  it("sees and edits the interview but cannot hand it to someone else", async () => {
    await interviewActions.updateInterview(
      { name: "Staff engineer", user_id: "stranger", organization_id: "org_2" },
      "int_1",
    );

    expect(await interviewQueries.getInterviewById("int_1")).toMatchObject({
      name: "Staff engineer",
      user_id: "owner",
      organization_id: "org_1",
    });
  });

  it("sets the candidate status", async () => {
    await responseActions.saveResponse(
      { candidate_status: "SELECTED" },
      "call_1",
    );

    expect(await responseQueries.getResponseByCallId("call_1")).toMatchObject({
      candidate_status: "SELECTED",
    });
  });

  it("gets their own user row whatever id the browser sends", async () => {
    expect(
      await clientActions.getClientById(
        "stranger",
        "owner@example.com",
        "org_2",
      ),
    ).toMatchObject({ id: "owner", organization_id: "org_1" });
  });

  it("a colleague in the same organization can manage the interview too", async () => {
    signIn("colleague", "org_1");

    expect(await responseActions.getAllResponses("int_1")).toEqual([]);
  });

  it("works when the session carries no active organization", async () => {
    signIn("owner", null);

    expect(
      (await interviewActions.getAllInterviews("owner", "org_1")).map(
        (interview) => interview.id,
      ),
    ).toEqual(["int_1"]);
    expect(
      await clientActions.getOrganizationById("org_1", "Acme"),
    ).toMatchObject({ id: "org_1" });
  });

  it("is refused an organization they do not belong to", async () => {
    await expect(
      clientActions.getOrganizationById("org_2", "Other"),
    ).rejects.toThrow();
  });
});
