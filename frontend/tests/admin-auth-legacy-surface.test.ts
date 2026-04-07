import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const adminSourceRoot = path.join(repoRoot, "frontend/src/app/[locale]/admin");

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return collectSourceFiles(fullPath);
    }

    return fullPath.endsWith(".ts") || fullPath.endsWith(".tsx") ? [fullPath] : [];
  });
}

describe("admin auth legacy surface", () => {
  it("removes the leftover authHeader and session-sentinel compatibility layer from admin source", () => {
    const combinedSource = collectSourceFiles(adminSourceRoot)
      .map((filePath) => readFileSync(filePath, "utf8"))
      .join("\n");

    expect(combinedSource).not.toContain("authHeader");
    expect(combinedSource).not.toContain("ADMIN_SESSION_AUTH");
    expect(combinedSource).not.toContain("shouldPersistAdminAuthHeader");
  });
});
