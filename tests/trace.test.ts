import { beforeEach, describe, expect, it } from "vitest";
import { asc } from "drizzle-orm";
import { traceEvent } from "@/db/schema";
import { MAX_TEXT, refs, safe } from "@/lib/trace/redact";
import { flushTrace, traced, traceEventNow } from "@/lib/trace/record";
import { tracedRoute } from "@/lib/trace/route";
import { freshDatabase } from "./helpers/database";
import { enableTracing } from "./helpers/tracing";

enableTracing();

let db: Awaited<ReturnType<typeof freshDatabase>>;

beforeEach(async () => {
  process.env.DATABASE_URL = "postgres://in-process";
  db = await freshDatabase();
});

const stored = () => db.select().from(traceEvent).orderBy(asc(traceEvent.id));

describe("what is safe to store", () => {
  it("removes credentials wherever they are nested", () => {
    expect(
      safe({
        access_token: "abc",
        nested: { Authorization: "Bearer x", apiKey: "k", name: "Ana" },
        list: [{ client_secret: "s", ok: 1 }],
        ice_servers: [{ urls: "turn:x", username: "u", credential: "c" }],
      }),
    ).toEqual({
      access_token: "[redacted]",
      nested: {
        Authorization: "[redacted]",
        apiKey: "[redacted]",
        name: "Ana",
      },
      list: [{ client_secret: "[redacted]", ok: 1 }],
      ice_servers: [
        { urls: "turn:x", username: "u", credential: "[redacted]" },
      ],
    });
  });

  it("keeps token counts, which are numbers and not credentials", () => {
    const usage = {
      prompt_tokens: 900,
      completion_tokens: 120,
      total_tokens: 1020,
      prompt_tokens_details: { cached_tokens: 0 },
    };

    expect(safe({ usage, refresh_token: "r", sessionToken: "s" })).toEqual({
      usage,
      refresh_token: "[redacted]",
      sessionToken: "[redacted]",
    });
  });

  it("cuts runaway text and says how long it was", () => {
    const cut = safe("x".repeat(MAX_TEXT + 50)) as string;

    expect(cut.length).toBeLessThan(MAX_TEXT + 60);
    expect(cut).toContain(`${MAX_TEXT + 50} characters in total`);
  });

  it("turns values JSON cannot hold into ones it can", () => {
    expect(safe({ n: BigInt(2), d: new Date(0), e: new Error("no") })).toEqual({
      n: 2,
      d: "1970-01-01T00:00:00.000Z",
      e: { error: "Error", message: "no" },
    });
  });

  it("finds the interview and the call a step belongs to", () => {
    expect(
      refs({ body: { interview_id: "int_1" } }, { call_id: "call_1" }),
    ).toEqual({
      interview_id: "int_1",
      call_id: "call_1",
    });
    expect(refs({ interviewId: "int_2", callId: "call_2" })).toEqual({
      interview_id: "int_2",
      call_id: "call_2",
    });
  });
});

describe("recording a step", () => {
  it("stores the input, the output, the duration and the ids", async () => {
    const result = await traced(
      "retell",
      "create-web-call",
      { interview_id: "int_1", agent_id: "a" },
      async () => ({
        call_id: "call_1",
        access_token: "secret",
      }),
    );
    await flushTrace();

    expect(result.access_token).toBe("secret");
    const [row] = await stored();
    expect(row).toMatchObject({
      kind: "retell",
      name: "create-web-call",
      status: "ok",
      interview_id: "int_1",
      call_id: "call_1",
      input: { interview_id: "int_1", agent_id: "a" },
      output: { call_id: "call_1", access_token: "[redacted]" },
    });
    expect(row.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("stores a failure and still lets it through", async () => {
    await expect(
      traced("openai", "generate_questions", { model: "m" }, async () => {
        throw new Error("rate limited");
      }),
    ).rejects.toThrow("rate limited");
    await flushTrace();

    expect((await stored())[0]).toMatchObject({
      status: "error",
      error: "rate limited",
    });
  });

  it("stores an event that has no duration", async () => {
    traceEventNow(
      "browser",
      "page_opened",
      { link: "acme-senior" },
      { interview_id: "int_1" },
    );
    await flushTrace();

    expect((await stored())[0]).toMatchObject({
      kind: "browser",
      name: "page_opened",
      interview_id: "int_1",
      input: { link: "acme-senior" },
    });
  });

  it("never lets a storage failure reach the caller", async () => {
    await db.execute("drop table trace_event");

    await expect(traced("action", "x", {}, async () => 1)).resolves.toBe(1);
    await expect(flushTrace()).resolves.toBeUndefined();
  });
});

describe("recording a route", () => {
  it("stores the request body, the response and the status, with the steps inside it", async () => {
    const route = tracedRoute("register-call", async (req: Request) => {
      const { interview_id } = await req.json();
      const call = await traced(
        "retell",
        "create-web-call",
        { interview_id },
        async () => ({ call_id: "call_9" }),
      );

      return Response.json({ call }, { status: 201 });
    });

    const response = await route(
      new Request("https://app.test/api/register-call", {
        method: "POST",
        body: JSON.stringify({ interview_id: "int_1" }),
      }),
      undefined,
    );

    // The caller still gets the untouched response.
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ call: { call_id: "call_9" } });

    const rows = await stored();
    const outer = rows.find((row) => row.kind === "route")!;
    const inner = rows.find((row) => row.kind === "retell")!;
    expect(outer).toMatchObject({
      name: "register-call",
      interview_id: "int_1",
      call_id: "call_9",
      input: {
        method: "POST",
        path: "/api/register-call",
        body: { interview_id: "int_1" },
      },
      output: { status: 201, body: { call: { call_id: "call_9" } } },
    });
    expect(inner.trace_id).toBe(outer.trace_id);
    expect(inner.parent_span_id).toBe(outer.span_id);
  });
});
