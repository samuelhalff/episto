import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
  readFileSync(path.join(repoRoot, "package.json"), "utf8"),
) as {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const workflowSource = readFileSync(
  path.join(repoRoot, ".github/workflows/ci.yml"),
  "utf8",
);
const vitestConfigSource = readFileSync(path.join(repoRoot, "vitest.config.ts"), "utf8");
const preCommitPath = path.join(repoRoot, ".husky/pre-commit");
const preCommitSource = existsSync(preCommitPath)
  ? readFileSync(preCommitPath, "utf8")
  : "";

describe("coverage and CI guardrails", () => {
  it("enables frontend coverage thresholds in vitest", () => {
    expect(vitestConfigSource).toContain(
      'include: ["shared/src/**", "backend/src/**", "frontend/src/**"]',
    );
    expect(vitestConfigSource).toContain("lines: 70");
    expect(vitestConfigSource).toContain("functions: 70");
    expect(vitestConfigSource).toContain("branches: 65");
    expect(vitestConfigSource).toContain("statements: 70");
  });

  it("adds coverage, file-size, and migration rollback jobs to CI", () => {
    expect(workflowSource).toContain("coverage:");
    expect(workflowSource).toContain("npm test -- --coverage");
    expect(workflowSource).toContain("uses: actions/upload-artifact@v4");
    expect(workflowSource).toContain("file-size-guard:");
    expect(workflowSource).toContain("npm run check:file-sizes");
    expect(workflowSource).toContain("migration-rollback:");
  });

  it("wires husky and lint-staged through the pre-commit hook", () => {
    expect(packageJson.scripts?.prepare).toBe("husky");
    expect(packageJson.scripts?.["check:file-sizes"]).toBeDefined();
    expect(packageJson.devDependencies?.husky).toBeDefined();
    expect(packageJson.devDependencies?.["lint-staged"]).toBeDefined();
    expect(packageJson.devDependencies?.["@vitest/coverage-v8"]).toBeDefined();
    expect(preCommitSource).toContain("npm run check:file-sizes -- --staged");
    expect(preCommitSource).toContain("npx lint-staged");
  });
});
