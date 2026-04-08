import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const frontendPackageJson = JSON.parse(
  readFileSync(path.join(repoRoot, "frontend/package.json"), "utf8"),
) as {
  scripts?: Record<string, string>;
};

const nextConfigSource = readFileSync(
  path.join(repoRoot, "frontend/next.config.ts"),
  "utf8",
);

const dockerComposeSource = readFileSync(
  path.join(repoRoot, "docker-compose.yml"),
  "utf8",
);

describe("frontend dev hot reload configuration", () => {
  it("uses Turbopack for dev mode", () => {
    expect(frontendPackageJson.scripts?.dev).toContain("--turbopack");
    expect(frontendPackageJson.scripts?.build).toBe("next build");
    expect(frontendPackageJson.scripts?.start).toBe("next start");
  });

  it("does not carry legacy webpack config", () => {
    expect(nextConfigSource).not.toContain("config.resolve.extensionAlias");
    expect(nextConfigSource).not.toContain("config.watchOptions");
    expect(nextConfigSource).not.toContain("WATCHPACK_POLLING_INTERVAL");
    expect(nextConfigSource).not.toContain("webpack(config");
  });

  it("keeps essential Next.js config", () => {
    expect(nextConfigSource).toContain("serverComponentsHmrCache: false");
    expect(nextConfigSource).toContain("reactStrictMode: true");
    expect(nextConfigSource).toContain('output: "standalone"');
  });

  it("only forwards frontend-safe repo root env keys into Next", () => {
    expect(nextConfigSource).toContain(
      'const REPO_ROOT_FRONTEND_ENV_KEYS = new Set(["API_URL", "NEXT_DIST_DIR"]);',
    );
    expect(nextConfigSource).toContain(
      'return key.startsWith("NEXT_PUBLIC_") || REPO_ROOT_FRONTEND_ENV_KEYS.has(key);',
    );
    expect(nextConfigSource).toContain(
      "if (isRepoRootEnv && !isAllowedRootEnvKey(key)) continue;",
    );
  });

  it("Docker compose has no webpack-specific polling vars", () => {
    expect(dockerComposeSource).not.toContain("WATCHPACK_POLLING");
    expect(dockerComposeSource).not.toContain("CHOKIDAR_USEPOLLING");
  });

  it("keeps Docker container setup for frontend dev", () => {
    expect(dockerComposeSource).toContain("working_dir: /app/frontend");
    expect(dockerComposeSource).toContain("- frontend_node_modules:/app/node_modules");
    expect(dockerComposeSource).toContain("- frontend_next_cache:/app/frontend/.next");
    expect(dockerComposeSource).toContain("NEXT_DIST_DIR: .next");
    expect(dockerComposeSource).toContain("npm ci --include=dev --no-fund --no-audit");
    expect(dockerComposeSource).toContain(
      "lock_hash=$$(sha256sum /app/package-lock.json",
    );
    expect(dockerComposeSource).toContain(
      "cache_hash=$$(cat /app/node_modules/.package-lock.sha256",
    );
    expect(dockerComposeSource).toContain("[ ! -d /app/node_modules/next ]");
    expect(dockerComposeSource).toContain("/app/node_modules/.package-lock.sha256");
    expect(dockerComposeSource).toContain("find .next");
  });
});
