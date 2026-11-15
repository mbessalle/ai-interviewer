// Prints what the app recorded: every step's input and output, in time order.
//
//   node scripts/trace.mjs --last 30m             everything in the last 30 minutes
//   node scripts/trace.mjs --call call_abc         everything about one call
//   node scripts/trace.mjs --interview <id>        everything about one interview
//   node scripts/trace.mjs --trace <trace id>      one request
//
// Options: --kind route,retell   only these kinds     --errors   only failed steps
//          --full                do not shorten values --json     machine-readable rows
//          --no-db               leave SQL statements out
//          --prune 30d           delete steps older than this, then exit
//
// Needs DATABASE_URL (the same one the app uses).
import postgres from "postgres";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const at = args.indexOf(`--${name}`);

  return at >= 0 ? args[at + 1] : undefined;
};

/** "30m", "2h", "7d" as a Postgres interval. */
function interval(text) {
  const match = /^(\d+)([mhd])$/.exec(text ?? "");
  if (!match) {
    throw new Error(`Expected a duration like 30m, 2h or 7d, got "${text}"`);
  }

  return `${match[1]} ${{ m: "minutes", h: "hours", d: "days" }[match[2]]}`;
}

function short(data, full) {
  if (data === null || data === undefined) {
    return "";
  }
  const text = JSON.stringify(data);

  return full || text.length <= 600
    ? text
    : `${text.slice(0, 600)}… (+${text.length - 600})`;
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(2);
}
const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });

try {
  if (value("prune")) {
    const gone =
      await sql`delete from trace_event where at < now() - ${interval(value("prune"))}::interval`;
    console.log(`deleted ${gone.count} steps older than ${value("prune")}`);
  } else {
    const kinds = value("kind")?.split(",");
    const filters = [
      value("call") && sql`call_id = ${value("call")}`,
      // An interview's steps, plus every step of the calls made for it (some steps only
      // know the call, or know the interview by its link name).
      value("interview") &&
        sql`(interview_id = ${value("interview")} or call_id in (
          select call_id from trace_event
          where interview_id = ${value("interview")} and call_id is not null))`,
      value("trace") && sql`trace_id = ${value("trace")}`,
      value("last") && sql`at > now() - ${interval(value("last"))}::interval`,
      kinds && sql`kind in ${sql(kinds)}`,
      flag("no-db") && sql`kind <> 'db'`,
      flag("errors") && sql`status = 'error'`,
    ].filter(Boolean);
    if (filters.length === 0) {
      filters.push(sql`at > now() - interval '15 minutes'`);
    }
    const where = filters.reduce((all, one) => sql`${all} and ${one}`);

    const rows = await sql`
      select id, at, trace_id, kind, name, status, duration_ms, interview_id, call_id, input, output, error
      from trace_event where ${where} order by at, id limit 2000`;

    if (flag("json")) {
      console.log(JSON.stringify(rows, null, 1));
    } else {
      for (const row of rows) {
        const took = row.duration_ms === null ? "" : ` ${row.duration_ms}ms`;
        const ids = [
          row.interview_id && `interview=${row.interview_id}`,
          row.call_id && `call=${row.call_id}`,
        ]
          .filter(Boolean)
          .join(" ");
        console.log(
          `${row.at.toISOString()} ${row.status === "error" ? "ERROR " : ""}[${row.kind}] ${row.name}${took} ${ids}`,
        );
        if (row.input !== null)
          console.log(`    in : ${short(row.input, flag("full"))}`);
        if (row.output !== null)
          console.log(`    out: ${short(row.output, flag("full"))}`);
        if (row.error) console.log(`    err: ${row.error}`);
      }
      console.log(`${rows.length} steps`);
    }
  }
} finally {
  await sql.end();
}
