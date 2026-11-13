import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { useDatabase } from "@/db/client";
import * as schema from "@/db/schema";

/**
 * A fresh Postgres running inside the test process (PGlite), built from the same migration
 * files the real database gets. The queries under test run for real; nothing is mocked.
 */
export async function freshDatabase() {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  useDatabase(db);

  return db;
}
