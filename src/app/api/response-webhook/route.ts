import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { Retell } from "retell-sdk";

const apiKey = process.env.RETELL_API_KEY || "";

export async function POST(req: NextRequest, res: NextResponse) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  // The signature covers the exact bytes Retell sent, so the body is read as text first.
  const rawBody = await req.text();
  const signature = req.headers.get("x-retell-signature") ?? "";

  if (!(await Retell.verify(rawBody, apiKey, signature))) {
    console.error("Invalid signature");

    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { event, call } = JSON.parse(rawBody) as { event: string; call: any };

  switch (event) {
    case "call_started":
      console.log("Call started event received", call.call_id);
      break;
    case "call_ended":
      console.log("Call ended event received", call.call_id);
      break;
    case "call_analyzed":
      // A server has no page to be relative to, so the address is built from this request.
      await axios.post(new URL("/api/get-call", req.url).toString(), {
        id: call.call_id,
      });
      console.log("Call analyzed event received", call.call_id);
      break;
    default:
      console.log("Received an unknown event:", event);
  }

  // Acknowledge the receipt of the event
  return NextResponse.json({ status: 204 });
}
