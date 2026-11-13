import "server-only";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/** Any Drizzle Postgres database with this schema: postgres.js in the app, PGlite in tests. */
export type Database = PgDatabase<any, typeof schema>;

let database: Database | undefined;

/**
 * The connection is opened on first use, so importing this module (for example during
 * `next build`) needs no database.
 */
export function getDb(): Database {
  if (!database) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    // `prepare: false` keeps the client compatible with pooled connections (PgBouncer),
    // which is what serverless hosts hand out.
    database = drizzle(postgres(url, { prepare: false, max: 5 }), { schema });
  }

  return database;
}

/** Tests swap in an in-process database. */
export function useDatabase(db: Database | undefined) {
  database = db;
}
