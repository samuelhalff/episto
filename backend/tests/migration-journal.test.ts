import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(backendRoot, "drizzle");
const journalPath = path.join(migrationsDir, "meta", "_journal.json");

interface JournalEntry {
  tag: string;
}

const LEGACY_ORPHANED_MIGRATIONS = ["0000_damp_nitro"] as const;

describe("drizzle migration journal", () => {
  it("tracks every forward SQL migration file", () => {
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
      entries: JournalEntry[];
    };
    const journalTags = new Set(journal.entries.map((entry) => entry.tag));
    const migrationTags = readdirSync(migrationsDir)
      .filter((entry) => entry.endsWith(".sql") && !entry.endsWith(".down.sql"))
      .map((entry) => entry.replace(/\.sql$/, ""))
      .sort();
    const unjournaledTags = migrationTags.filter((tag) => !journalTags.has(tag));
    const expectedJournalTags = migrationTags.filter(
      (tag) =>
        !LEGACY_ORPHANED_MIGRATIONS.includes(
          tag as (typeof LEGACY_ORPHANED_MIGRATIONS)[number],
        ),
    );

    expect(unjournaledTags).toEqual(Array.from(LEGACY_ORPHANED_MIGRATIONS));
    expect(Array.from(journalTags).sort()).toEqual(expectedJournalTags);
  });

  it("keeps a rollback file for the latest journaled migration", () => {
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
      entries: JournalEntry[];
    };
    const latestTag = journal.entries.at(-1)?.tag;

    expect(latestTag).toBeDefined();
    expect(existsSync(path.join(migrationsDir, `${latestTag}.down.sql`))).toBe(true);
  });
});
