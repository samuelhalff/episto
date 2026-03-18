import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../shared/config/index.js";
import * as schema from "./schema.js";

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (_db) return _db;
  const pool = new pg.Pool({
    connectionString: env().DATABASE_URL,
    max: 20,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30_000,
  });
  _db = drizzle(pool, { schema });
  return _db;
}

export type Db = ReturnType<typeof getDb>;
export { schema };
