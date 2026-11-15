/**
 * Turns any value into something safe to store in a trace: plain JSON, with secrets removed
 * and very long text cut. Pure, so it is tested on its own.
 */

/**
 * Keys whose values are credentials. They are replaced, never stored. "token" counts only
 * in the singular: `access_token` is a credential, `prompt_tokens` is a number worth keeping.
 */
const SECRET_KEY =
  /token(?!s)|secret|password|credential|authorization|api[-_]?key|cookie|signature/i;

/** Longest text kept per field. Transcripts fit; a runaway payload does not fill the table. */
export const MAX_TEXT = 20_000;
const MAX_ITEMS = 200;
const MAX_DEPTH = 8;

export function safe(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) {
    return value ?? null;
  }
  if (typeof value === "string") {
    return value.length > MAX_TEXT
      ? `${value.slice(0, MAX_TEXT)}… [cut, ${value.length} characters in total]`
      : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Error) {
    return { error: value.name, message: value.message };
  }
  if (typeof value === "function" || typeof value === "symbol") {
    return `[${typeof value}]`;
  }
  if (depth >= MAX_DEPTH) {
    return "[nested too deep]";
  }
  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ITEMS)
      .map((item) => safe(item, depth + 1));
    if (value.length > MAX_ITEMS) {
      items.push(`[${value.length - MAX_ITEMS} more items]`);
    }

    return items;
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SECRET_KEY.test(key) ? "[redacted]" : safe(item, depth + 1);
  }

  return result;
}

export type Refs = { interview_id: string | null; call_id: string | null };

const INTERVIEW_KEYS = ["interview_id", "interviewId"];
const CALL_KEYS = ["call_id", "callId"];

/**
 * Finds which interview and which call a step belongs to, by looking for the usual id keys
 * in what went in and what came out. This is what ties separate requests into one chain.
 */
export function refs(...values: unknown[]): Refs {
  const found: Refs = { interview_id: null, call_id: null };

  const visit = (value: unknown, depth: number) => {
    if (!value || typeof value !== "object" || depth > 3) {
      return;
    }
    if (Array.isArray(value)) {
      value.slice(0, 5).forEach((item) => visit(item, depth + 1));

      return;
    }
    for (const [key, item] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (typeof item === "string" && item) {
        if (!found.interview_id && INTERVIEW_KEYS.includes(key)) {
          found.interview_id = item;
        }
        if (!found.call_id && CALL_KEYS.includes(key)) {
          found.call_id = item;
        }
      } else {
        visit(item, depth + 1);
      }
    }
  };
  values.forEach((value) => visit(value, 0));

  return found;
}
