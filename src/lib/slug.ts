/** Lower-case words joined by dashes, safe to put in a URL. */
function slugPart(text: string | null | undefined): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The readable part of an interview link: the organization's name, then the interview's. */
export function readableSlug(
  organizationName: string | null | undefined,
  interviewName: string | null | undefined,
): string {
  return [slugPart(organizationName), slugPart(interviewName)]
    .filter(Boolean)
    .join("-");
}

/**
 * A link name nobody else has. Two interviews with the same name would otherwise share one
 * link, and the link would open whichever was created first.
 */
export async function uniqueSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await isTaken(base))) {
    return base;
  }
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }
  throw new Error(`No free link name for "${base}"`);
}
