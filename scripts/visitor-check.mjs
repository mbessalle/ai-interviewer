// What a signed-out visitor gets from a deployed site: the README's live link is the first thing a recruiter clicks.
//
//   node scripts/visitor-check.mjs https://ai-interviewer-neon.vercel.app
//
// Each case follows redirects and checks the final status, and where the visitor lands. Exits 1 on any failure.
// Runs after every Vercel deployment (.github/workflows/visitor-check.yml).

const base = (process.argv[2] || process.env.SITE_URL || "").replace(/\/$/, "");
if (!base) {
  console.error("usage: node scripts/visitor-check.mjs <site url>");
  process.exit(2);
}

const cases = [
  // [path, expected final status, the final URL must contain this, why]
  ["/", 200, "/sign-in", "the live link must reach sign-in, not a 404"],
  [
    "/dashboard",
    200,
    "/sign-in",
    "a protected page sends a signed-out visitor to sign-in",
  ],
  [
    "/interviews/unknown",
    200,
    "/sign-in",
    "every protected page does the same",
  ],
  ["/sign-in", 200, "/sign-in", "the sign-in page itself loads"],
  [
    "/call/no-such-interview",
    404,
    "/call/",
    "an unknown interview link is a real 404",
  ],
];

let failed = 0;
for (const [path, status, lands, why] of cases) {
  let line;
  try {
    const res = await fetch(base + path, {
      redirect: "follow",
      headers: { "user-agent": "visitor-check" },
    });
    const ok = res.status === status && res.url.includes(lands);
    line = `${ok ? "ok  " : "FAIL"} ${path} -> ${res.status} ${res.url.replace(base, "")}`;
    if (!ok) {
      failed++;
      line += `   expected ${status} at ...${lands} (${why})`;
    }
  } catch (error) {
    failed++;
    line = `FAIL ${path} -> ${error.message}`;
  }
  console.log(line);
}

// A protected API route answers 401 to a signed-out caller, not a redirect to an HTML page.
const api = await fetch(base + "/api/generate-insights", {
  method: "POST",
  redirect: "manual",
});
const apiOk = api.status === 401;
console.log(
  `${apiOk ? "ok  " : "FAIL"} POST /api/generate-insights -> ${api.status}   (expected 401)`,
);
if (!apiOk) failed++;

console.log(
  failed
    ? `${failed} check(s) failed on ${base}`
    : `all checks passed on ${base}`,
);
process.exit(failed ? 1 : 0);
