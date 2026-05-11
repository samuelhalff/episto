import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("drizzle migrations", () => {
  it("keeps 0009 safe for a fresh database", () => {
    const migrationFileName = readdirSync(path.join(repoRoot, "backend/drizzle")).find(
      (fileName) =>
        fileName.startsWith("0009_") &&
        fileName.endsWith(".sql") &&
        !fileName.endsWith(".down.sql"),
    );
    expect(migrationFileName).toBeDefined();
    const migrationSource = readFileSync(
      path.join(repoRoot, "backend/drizzle", migrationFileName as string),
      "utf8",
    );

    expect(migrationSource).toContain('CREATE TABLE IF NOT EXISTS "product_events"');
    expect(migrationSource).toContain(
      'CREATE INDEX IF NOT EXISTS "product_events_event_name_time_idx"',
    );
    expect(migrationSource).toContain(
      'CREATE INDEX IF NOT EXISTS "product_events_session_idx"',
    );
  });
});
