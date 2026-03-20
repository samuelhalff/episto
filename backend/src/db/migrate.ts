/**
 * Database migration runner.
 *
 * Called as a pre-start step in production:
 *   node dist/db/migrate.js
 *
 * Uses drizzle-orm's migrate() which applies pending SQL files from ./drizzle/
 * and tracks applied migrations in the __drizzle_migrations table.
 * Migrations are idempotent — safe to run on every startup.
 */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new pg.Pool({ connectionString });

  try {
    const db = drizzle(pool);

    // Resolve the drizzle migrations folder relative to this file.
    // In the compiled dist tree: dist/db/migrate.js → ../../drizzle
    const migrationsFolder = path.resolve(__dirname, "../../drizzle");

    console.log(`Running migrations from: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    console.log("Migrations complete.");
  } finally {
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
