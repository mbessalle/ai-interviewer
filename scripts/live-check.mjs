// End-to-end check against a deployed site, using the same public path a candidate uses.
//
// For every interview in the database it opens the link the dashboard shows, starts a call
// through the site, then asks Retell and the trace what that call really got, and compares
// it with what the recruiter chose (interviewer and language).
//
//   node scripts/live-check.mjs                       against the live site
//   BASE_URL=https://preview.example node scripts/live-check.mjs
//
// Needs DATABASE_URL and RETELL_API_KEY. A call that is started and never joined costs
// nothing; Retell marks it "user not joined". Exits 1 if anything is wrong.
import postgres from "postgres";

const BASE_URL = (
  process.env.BASE_URL ?? "https://ai-interviewer-neon.vercel.app"
).replace(/\/$/, "");
const SPOKEN = { en: "English", es: "Spanish" };
const SPEECH = { en: "en-US", es: "es-419" };

for (const name of ["DATABASE_URL", "RETELL_API_KEY"]) {
  if (!process.env[name]) {
    console.error(`${name} is not set`);
    process.exit(2);
  }
}

const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
  onnotice: () => {},
});
const failures = [];
let checks = 0;

function check(what, ok, detail = "") {
  checks += 1;
  if (!ok) {
    failures.push(`${what}${detail ? `: ${detail}` : ""}`);
  }
  console.log(
    `  ${ok ? "ok  " : "FAIL"} ${what}${ok || !detail ? "" : ` (${detail})`}`,
  );
}

async function retell(path) {
  const response = await fetch(`https://api.retellai.com${path}`, {
    headers: { Authorization: `Bearer ${process.env.RETELL_API_KEY}` },
  });

  return response.json();
}

/** The trace is written as the response leaves, so give it a moment before giving up. */
async function traceOf(callId) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const rows = await sql`
      select kind, name, status, input, output from trace_event where call_id = ${callId} order by at, id`;
    if (rows.some((row) => row.kind === "route")) {
      return rows;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return [];
}

try {
  const interviews = await sql`
    select i.id, i.name, i.language, i.readable_slug, i.is_active,
           v.name as interviewer, v.agent_id
    from interview i left join interviewer v on v.id = i.interviewer_id
    order by i.created_at`;

  console.log(`${BASE_URL}: ${interviews.length} interviews`);

  const links = interviews.map((row) => row.readable_slug).filter(Boolean);
  check(
    "every link name belongs to one interview",
    new Set(links).size === links.length,
  );

  for (const interview of interviews) {
    const link = interview.readable_slug ?? interview.id;
    const language = interview.language ?? "en";
    console.log(
      `\n${interview.name} | ${interview.interviewer} | ${language} | /call/${link}`,
    );

    const page = await fetch(`${BASE_URL}/call/${link}`);
    check("the page loads", page.status === 200, `status ${page.status}`);

    const started = await fetch(`${BASE_URL}/api/register-call`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        // The link, exactly as it appears in the address the candidate opens.
        interview_id: link,
        dynamic_data: {
          name: "Live check",
          mins: "1",
          objective: "check",
          questions: "none",
        },
      }),
    });
    const callId = (await started.json().catch(() => ({})))
      ?.registerCallResponse?.call_id;
    check(
      "the site starts a call",
      started.status === 200 && Boolean(callId),
      `status ${started.status}`,
    );
    if (!callId) {
      continue;
    }

    const call = await retell(`/v2/get-call/${callId}`);
    check(
      "Retell: the call is with the chosen interviewer",
      call.agent_id === interview.agent_id,
      `chose ${interview.interviewer} (${interview.agent_id}), got ${call.agent_name} (${call.agent_id})`,
    );
    check(
      "Retell: the agent is told the chosen language",
      call.retell_llm_dynamic_variables?.language === SPOKEN[language],
      `chose ${SPOKEN[language]}, got ${call.retell_llm_dynamic_variables?.language}`,
    );

    const steps = await traceOf(callId);
    const route = steps.find(
      (row) => row.kind === "route" && row.name === "register-call",
    );
    const sent = steps.find(
      (row) => row.kind === "retell" && row.name === "create-web-call",
    );
    check(
      "trace: the request and the response of the route are recorded",
      route?.output?.status === 200,
    );
    check("trace: the request sent to Retell is recorded", Boolean(sent));
    check(
      "trace: the link resolved to this interview",
      sent?.input?.interview_id === interview.id,
      `expected ${interview.id}, got ${sent?.input?.interview_id}`,
    );
    const override = sent?.input?.agent_override?.agent ?? {};
    check(
      "trace: speech recognition is set to the chosen language",
      override.language === SPEECH[language],
      `expected ${SPEECH[language]}, got ${override.language}`,
    );
    check(
      language === "es"
        ? "trace: a Spanish voice replaces the English one"
        : "trace: the agent keeps its own voice",
      language === "es"
        ? Boolean(override.voice_id)
        : override.voice_id === undefined,
      `voice ${override.voice_id}`,
    );
    check(
      "trace: no credential was stored",
      !JSON.stringify(steps).includes(process.env.RETELL_API_KEY) &&
        route?.output?.body?.registerCallResponse?.access_token ===
          "[redacted]",
    );
  }
} finally {
  await sql.end();
}

console.log(`\n${checks - failures.length} of ${checks} checks passed`);
if (failures.length > 0) {
  console.log(failures.map((line) => `FAILED: ${line}`).join("\n"));
  process.exit(1);
}
