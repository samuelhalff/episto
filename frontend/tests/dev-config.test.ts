import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

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
  it("keeps the stable Next.js scripts instead of Turbopack overrides", () => {
    expect(frontendPackageJson.scripts?.dev).toBe("next dev");
    expect(frontendPackageJson.scripts?.build).toBe("next build");
    expect(frontendPackageJson.scripts?.start).toBe("next start");
  });

  it("preserves webpack extension aliases for TypeScript ESM source imports", () => {
    expect(nextConfigSource).toContain("serverComponentsHmrCache: false");
    expect(nextConfigSource).toContain("config.resolve.extensionAlias");
    expect(nextConfigSource).toContain('".js": [".js", ".ts", ".tsx"]');
    expect(nextConfigSource).toContain('".jsx": [".jsx", ".tsx"]');
    expect(nextConfigSource).toContain("config.watchOptions");
    expect(nextConfigSource).toContain("aggregateTimeout: 300");
    expect(nextConfigSource).toContain("WATCHPACK_POLLING_INTERVAL");
  });

  it("keeps Docker polling, container-managed dependencies, and the isolated .next cache for bind-mounted edits", () => {
    expect(dockerComposeSource).toContain("working_dir: /app/frontend");
    expect(dockerComposeSource).toContain("- frontend_node_modules:/app/node_modules");
    expect(dockerComposeSource).toContain(
      "- frontend_next_cache:/app/frontend/.next",
    );
    expect(dockerComposeSource).toContain('WATCHPACK_POLLING: "true"');
    expect(dockerComposeSource).toContain('WATCHPACK_POLLING_INTERVAL: "1000"');
    expect(dockerComposeSource).toContain('CHOKIDAR_USEPOLLING: "true"');
    expect(dockerComposeSource).toContain(
      "npm ci --include=dev --no-fund --no-audit",
    );
    expect(dockerComposeSource).toContain("[ -d /app/node_modules/next ]");
    expect(dockerComposeSource).toContain("find .next");
    expect(dockerComposeSource).not.toContain("/app/frontend/.next-turbo");
  });
});
