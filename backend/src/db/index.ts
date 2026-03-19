import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../shared/config/index.js";
import * as schema from "./schema.js";

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;
let _pool: pg.Pool | undefined;

export function getDb() {
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

export type Db = ReturnType<typeof getDb>;
export { schema };
