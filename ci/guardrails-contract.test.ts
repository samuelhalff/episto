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
const huskyInstallPath = path.join(repoRoot, ".husky/install.mjs");
const huskyInstallSource = existsSync(huskyInstallPath)
  ? readFileSync(huskyInstallPath, "utf8")
  : "";
const backendDockerfileSource = readFileSync(
  path.join(repoRoot, "backend/Dockerfile"),
  "utf8",
);
const frontendDockerfileSource = readFileSync(
  path.join(repoRoot, "frontend/Dockerfile"),
  "utf8",
);

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

  it("keeps frontend coverage exclusions narrow enough to measure product code", () => {
    expect(vitestConfigSource).not.toContain('"frontend/src/app/**"');
    expect(vitestConfigSource).not.toContain('"frontend/src/components/**"');
    expect(vitestConfigSource).not.toContain('"frontend/src/hooks/use-api.ts"');
    expect(vitestConfigSource).not.toContain('"frontend/src/hooks/use-checkout.ts"');
    expect(vitestConfigSource).not.toContain('"frontend/src/hooks/use-draft.ts"');
    expect(vitestConfigSource).not.toContain('"frontend/src/hooks/use-session.ts"');
    expect(vitestConfigSource).not.toContain('"frontend/src/hooks/use-pricing.ts"');
    expect(vitestConfigSource).not.toContain('"frontend/src/lib/api.ts"');
    expect(vitestConfigSource).not.toContain('"frontend/src/lib/letter-content.ts"');
    expect(vitestConfigSource).toContain('"frontend/src/i18n/**"');
    expect(vitestConfigSource).toContain('"frontend/src/proxy.ts"');
  });

  it("adds coverage, file-size, and migration rollback jobs to CI", () => {
    expect(workflowSource).toContain("coverage:");
    expect(workflowSource).toContain("npm test -- --coverage");
    expect(workflowSource).toContain("uses: actions/upload-artifact@v4");
    expect(workflowSource).toContain("file-size-guard:");
    expect(workflowSource).toContain("npm run check:file-sizes");
    expect(workflowSource).toContain("migration-rollback:");
  });

  it("wires husky and lint-staged through the pre-commit hook without breaking prod installs", () => {
    expect(packageJson.scripts?.prepare).toBe("node .husky/install.mjs");
    expect(packageJson.scripts?.["check:file-sizes"]).toBeDefined();
    expect(packageJson.devDependencies?.husky).toBeDefined();
    expect(packageJson.devDependencies?.["lint-staged"]).toBeDefined();
    expect(packageJson.devDependencies?.["@vitest/coverage-v8"]).toBeDefined();
    expect(huskyInstallSource).toContain('await import("husky")');
    expect(huskyInstallSource).toContain("process.exit(0)");
    expect(backendDockerfileSource).toContain(
      "COPY .husky/install.mjs ./.husky/install.mjs",
    );
    expect(frontendDockerfileSource).toContain(
      "COPY .husky/install.mjs ./.husky/install.mjs",
    );
    expect(preCommitSource).toContain("npm run check:file-sizes -- --staged");
    expect(preCommitSource).toContain("npx lint-staged");
  });
});
