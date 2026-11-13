import { getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

/**
 * Keeps only the keys of `payload` that are columns of `table` (minus any in `except`).
 * Callers pass objects built in the browser, so unknown keys are dropped instead of
 * reaching the SQL, and protected columns cannot be overwritten.
 */
export function columnsOnly<T extends PgTable>(
  table: T,
  payload: Record<string, unknown> | null | undefined,
  except: string[] = [],
): Record<string, any> {
  const columns = getTableColumns(table);
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload ?? {})) {
    if (key in columns && !except.includes(key) && value !== undefined) {
      kept[key] = typeof value === "bigint" ? Number(value) : value;
    }
  }

  return kept;
}
