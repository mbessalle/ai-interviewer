/**
 * Reports something that happened in the browser to the trace. Never throws and never
 * waits: a failed report must not get in the way of the interview.
 */
export type ClientEvent =
  | "page_opened"
  | "start_clicked"
  | "call_registered"
  | "call_started"
  | "call_ended"
  | "call_error"
  | "repeat_email_blocked";

export function clientEvent(
  event: ClientEvent,
  fields: {
    interview_id?: string | null;
    call_id?: string | null;
    data?: Record<string, unknown>;
  } = {},
) {
  try {
    void fetch("/api/client-event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, ...fields }),
      // Lets the report finish even if the candidate closes the tab right after.
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting is best effort.
  }
}
