import { NextResponse } from "next/server";
import { z } from "zod";
import { flushTrace, traceEventNow } from "@/lib/trace/record";

/**
 * Receives what happened in the browser (which interview a link opened, when the call
 * started, ended or failed), so the trace of a call covers the candidate's side too.
 *
 * Open to everyone, like the call page itself, so it accepts only known event names and
 * small payloads.
 */
const EVENTS = [
  "page_opened",
  "start_clicked",
  "call_registered",
  "call_started",
  "call_ended",
  "call_error",
  "repeat_email_blocked",
] as const;

const Event = z.object({
  event: z.enum(EVENTS),
  interview_id: z.string().max(100).nullish(),
  call_id: z.string().max(100).nullish(),
  data: z.record(z.string(), z.unknown()).optional(),
});

const MAX_BYTES = 4_000;

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BYTES) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "not JSON" }, { status: 400 });
  }
  const parsed = Event.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "unknown event" }, { status: 400 });
  }

  const { event, interview_id, call_id, data } = parsed.data;
  traceEventNow("browser", event, data ?? {}, {
    interview_id: interview_id ?? null,
    call_id: call_id ?? null,
  });
  await flushTrace();

  return NextResponse.json({ ok: true }, { status: 200 });
}
