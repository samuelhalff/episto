import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as appSchema from "../../src/db/schema/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../../drizzle");
const journalPath = path.join(migrationsDir, "meta", "_journal.json");

interface JournalEntry {
  tag: string;
}

export const integrationDatabaseUrl =
  process.env.SWISS_MAIL_TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? null;

function getTempSchemaName(): string {
  return `itest_${randomUUID().replace(/-/g, "_")}`;
}

function rewriteMigrationSql(sql: string, schemaName: string): string {
  return sql
    .replaceAll('"public".', `"${schemaName}".`)
    .replace(
      /WHERE typname = ('[^']+')/g,
      "WHERE typname = $1 AND typnamespace = current_schema()::regnamespace",
    );
}

/**
 * Parallel test files each create their own schema against one database, and
 * `CREATE EXTENSION IF NOT EXISTS` is not race-safe: two first-time callers can
 * both pass the existence check and one fails on the catalog's unique index.
 * Losing that race means the extension now exists, which is all we need.
 */
async function ensurePgcrypto(client: pg.Client): Promise<void> {
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  } catch (error) {
    if ((error as { code?: string }).code !== "23505") throw error;
  }
}

async function applyMigrations(client: pg.Client, schemaName: string): Promise<void> {
  await ensurePgcrypto(client);

  const journal = JSON.parse(await readFile(journalPath, "utf8")) as {
    entries: JournalEntry[];
  };
  const migrationFiles = journal.entries.map((entry) => `${entry.tag}.sql`);

  for (const migrationFile of migrationFiles) {
    const rawSql = await readFile(path.join(migrationsDir, migrationFile), "utf8");
    const statements = rewriteMigrationSql(rawSql, schemaName)
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await client.query(statement);
    }
  }
}

export async function createIntegrationDb() {
  if (!integrationDatabaseUrl) {
    throw new Error("No integration database URL configured");
  }

  const client = new pg.Client({ connectionString: integrationDatabaseUrl });
  const schemaName = getTempSchemaName();

  await client.connect();

  try {
    await client.query(`CREATE SCHEMA "${schemaName}"`);
    await client.query(`SET search_path TO "${schemaName}"`);
    await applyMigrations(client, schemaName);

    const db = drizzle(client, { schema: appSchema });

    return {
      db,
      schemaName,
      async cleanup() {
        await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
        await client.end();
      },
    };
  } catch (error) {
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`).catch(() => {});
    await client.end().catch(() => {});
    throw error;
  }
}
