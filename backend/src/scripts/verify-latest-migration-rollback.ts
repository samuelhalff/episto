import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../../drizzle");
const journalPath = path.resolve(migrationsFolder, "meta/_journal.json");

interface MigrationJournalEntry {
  idx: number;
  tag: string;
  when: number;
}

function readLatestJournalEntry(): MigrationJournalEntry {
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: MigrationJournalEntry[];
  };
  const latestEntry = journal.entries.at(-1);

  if (!latestEntry) {
    throw new Error("No migration journal entries found.");
  }

  return latestEntry;
}

function readRollbackStatements(tag: string): string[] {
  const rollbackPath = path.resolve(migrationsFolder, `${tag}.down.sql`);

  if (!fs.existsSync(rollbackPath)) {
    throw new Error(`Missing rollback migration for ${tag}: ${rollbackPath}`);
  }

  return fs
    .readFileSync(rollbackPath, "utf8")
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function run(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const latestEntry = readLatestJournalEntry();
  const rollbackStatements = readRollbackStatements(latestEntry.tag);
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  try {
    await migrate(db, { migrationsFolder });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const statement of rollbackStatements) {
        await client.query(statement);
      }
      await client.query(
        "DELETE FROM drizzle.__drizzle_migrations WHERE created_at = $1",
        [latestEntry.when],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    await migrate(db, { migrationsFolder });

    const result = await pool.query(
      "SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = $1 LIMIT 1",
      [latestEntry.when],
    );

    if (result.rowCount !== 1) {
      throw new Error(`Migration ${latestEntry.tag} was not re-applied after rollback.`);
    }
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Latest migration rollback verification failed:", error);
  process.exit(1);
});
