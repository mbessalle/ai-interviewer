import "server-only";
import { flushTrace, traced } from "./record";

type Handler<C> = (req: any, context: C) => Promise<Response>;

/** The JSON body if there is one, else the text, else nothing. Reads a copy. */
async function body(message: Request | Response): Promise<unknown> {
  try {
    const text = await message.clone().text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return "[body could not be read]";
  }
}

/**
 * Wraps an API route so that its request body, its response and its status are recorded,
 * and everything the route did on the way is stored before the response leaves.
 */
export function tracedRoute<C = unknown>(
  name: string,
  handler: Handler<C>,
): Handler<C> {
  return async (req, context) => {
    const input = {
      method: req.method,
      path: new URL(req.url).pathname,
      body: await body(req),
    };
    let output: unknown;

    try {
      return await traced(
        "route",
        name,
        input,
        async () => {
          const response = await handler(req, context);
          output = { status: response.status, body: await body(response) };

          return response;
        },
        () => output,
      );
    } finally {
      await flushTrace();
    }
  };
}
