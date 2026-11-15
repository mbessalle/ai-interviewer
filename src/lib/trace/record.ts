import "server-only";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { getDb } from "@/db/client";
import { traceEvent } from "@/db/schema";
import { refs, safe, type Refs } from "./redact";

/**
 * Records what went into and came out of every step of the app.
 *
 * Each step is an OpenTelemetry span (so it shows in any OTLP backend) and also one row in
 * the `trace_event` table, with its full input and output. The table is what makes a chain
 * checkable after the fact: `node scripts/trace.mjs --call <id>` prints everything that
 * happened for one call, in order.
 */
export type Kind =
  | "route" // an API route: request body in, response out
  | "action" // a server action called by the browser
  | "retell" // a request to the voice provider
  | "openai" // a request to the model
  | "db" // a SQL statement
  | "browser"; // something that happened on the candidate's or recruiter's page

type Row = typeof traceEvent.$inferInsert;

const tracer = trace.getTracer("ai-interviewer.io");
let buffer: Row[] = [];

/** On Vercel, lets a write finish after the response has been sent. */
function keepAlive(work: Promise<unknown>) {
  const context = (globalThis as any)[Symbol.for("@vercel/request-context")];
  context?.get?.()?.waitUntil?.(work);
}

function add(row: Row) {
  buffer.push(row);
  keepAlive(flushTrace());
}

/**
 * Runs one step and records it. `describe` picks what to store as the output when the raw
 * result is not what a reader needs (for example a Response object).
 */
export async function traced<T>(
  kind: Kind,
  name: string,
  input: unknown,
  run: () => Promise<T>,
  describe: (result: T) => unknown = (result) => result,
): Promise<T> {
  const parent = trace.getActiveSpan()?.spanContext().spanId ?? null;
  const startedAt = new Date();

  return tracer.startActiveSpan(`${kind} ${name}`, async (span) => {
    const { traceId, spanId } = span.spanContext();
    const row: Row = {
      at: startedAt.toISOString(),
      trace_id: traceId,
      span_id: spanId,
      parent_span_id: parent,
      kind,
      name,
      status: "ok",
      input: safe(input),
    };
    let found: Refs = refs(input);

    try {
      const result = await run();
      const output = describe(result);
      row.output = safe(output);
      found = refs(input, output);

      return result;
    } catch (error) {
      row.status = "error";
      row.error = error instanceof Error ? error.message : String(error);
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      row.duration_ms = Date.now() - startedAt.getTime();
      row.interview_id = found.interview_id;
      row.call_id = found.call_id;
      span.setAttributes({
        "app.io.kind": kind,
        ...(found.interview_id && { "app.interview_id": found.interview_id }),
        ...(found.call_id && { "app.call_id": found.call_id }),
      });
      span.end();
      add(row);
    }
  });
}

/**
 * Like `traced`, for a step that already has its own OpenTelemetry span (the model call):
 * the row is stored under that span instead of opening a second one for the same work.
 */
export async function tracedInSpan<T>(
  kind: Kind,
  name: string,
  input: unknown,
  run: () => Promise<T>,
  describe: (result: T) => unknown = (result) => result,
): Promise<T> {
  const active = trace.getActiveSpan()?.spanContext();
  const startedAt = new Date();
  const row: Row = {
    at: startedAt.toISOString(),
    trace_id: active?.traceId ?? null,
    span_id: active?.spanId ?? null,
    parent_span_id: null,
    kind,
    name,
    status: "ok",
    input: safe(input),
  };
  let found: Refs = refs(input);

  try {
    const result = await run();
    const output = describe(result);
    row.output = safe(output);
    found = refs(input, output);

    return result;
  } catch (error) {
    row.status = "error";
    row.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    row.duration_ms = Date.now() - startedAt.getTime();
    row.interview_id = found.interview_id;
    row.call_id = found.call_id;
    add(row);
  }
}

/** Records something that has no duration, such as a SQL statement or a browser event. */
export function traceEventNow(
  kind: Kind,
  name: string,
  input: unknown,
  extra: Partial<Refs> = {},
) {
  const active = trace.getActiveSpan()?.spanContext();
  const found = refs(input);

  add({
    at: new Date().toISOString(),
    trace_id: active?.traceId ?? null,
    span_id: null,
    parent_span_id: active?.spanId ?? null,
    kind,
    name,
    status: "ok",
    input: safe(input),
    interview_id: extra.interview_id ?? found.interview_id,
    call_id: extra.call_id ?? found.call_id,
  });
}

/**
 * Writes the recorded steps. Called at the end of every route and action. A failure here is
 * logged and swallowed: tracing must never break the request it is describing.
 */
export async function flushTrace() {
  if (buffer.length === 0 || !process.env.DATABASE_URL) {
    return;
  }
  const rows = buffer;
  buffer = [];
  try {
    await getDb().insert(traceEvent).values(rows);
  } catch (error) {
    console.error("trace: could not store", rows.length, "steps:", error);
  }
}

/** Runs a server action as a recorded step and stores the trace before it returns. */
export async function tracedAction<T>(
  name: string,
  input: unknown,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await traced("action", name, input, run);
  } finally {
    await flushTrace();
  }
}
