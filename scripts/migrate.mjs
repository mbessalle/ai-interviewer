// Applies the SQL files in ./drizzle to the database. Safe to run on every deploy:
// migrations that were already applied are skipped.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Schema changes go over a direct connection when the host provides one next to the pooled URL.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!url) {
  console.log("migrate: DATABASE_URL is not set, nothing to do");
  process.exit(0);
}

const client = postgres(url, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("migrate: database is up to date");
} finally {
  await client.end();
}
