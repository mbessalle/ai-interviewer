import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { createInterview, readableSlugTaken } from "@/db/queries/interviews";
import { logger } from "@/lib/logger";
import { readableSlug, uniqueSlug } from "@/lib/slug";

// Use current request host instead of hardcoded URL
const getBaseUrl = (req: Request) => {
  const host = req.headers.get("host");
  const protocol = req.headers.get("x-forwarded-proto") || "https";

  return `${protocol}://${host}`;
};

export async function POST(req: Request, res: Response) {
  try {
    const url_id = nanoid();
    const base_url = getBaseUrl(req);
    const url = `${base_url}/call/${url_id}`;
    const body = await req.json();

    logger.info("create-interview request received");

    const payload = body.interviewData;

    // Two interviews may share a name, but never a link.
    const base = body.organizationName
      ? readableSlug(body.organizationName, payload.name)
      : "";
    const slug = base ? await uniqueSlug(base, readableSlugTaken) : null;

    const newInterview = await createInterview({
      ...payload,
      url: url,
      id: url_id,
      readable_slug: slug,
    });

    logger.info("Interview created successfully");

    return NextResponse.json(
      { response: "Interview created successfully" },
      { status: 200 },
    );
  } catch (err) {
    logger.error("Error creating interview");

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
