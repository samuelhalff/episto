import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase, NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import pg from "pg";
import { env } from "../shared/config/index.js";
import * as schema from "./schema/index.js";

let _db: NodePgDatabase<typeof schema> | undefined;
let _pool: pg.Pool | undefined;

export function getDb(): NodePgDatabase<typeof schema> {
  if (_db) return _db;
  _pool = new pg.Pool({
    connectionString: env().DATABASE_URL,
    max: 20,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30_000,
  });
  // Log idle client errors to prevent unhandled rejections crashing the process
  _pool.on("error", (err) => {
    console.error("Unexpected database pool error:", err.message);
  });
  _db = drizzle(_pool, { schema });
  return _db;
}

/** Gracefully close the database connection pool. */
export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = undefined;
    _db = undefined;
  }
}

/**
 * Database handle — either the top-level connection or an in-progress
 * transaction. Functions that need to run inside an existing transaction
 * should accept `Db` (not `NodePgDatabase`) so callers can pass a `tx`.
 */
export type Db =
  | NodePgDatabase<typeof schema>
  | PgTransaction<
      NodePgQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >;
export { schema };
