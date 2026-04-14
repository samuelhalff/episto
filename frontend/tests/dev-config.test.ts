import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

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
const originalAppPublicUrl = process.env.APP_PUBLIC_URL;
const originalDevAllowedOrigins = process.env.DEV_ALLOWED_ORIGINS;
const originalNextPublicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

async function importNextConfigModule() {
  vi.resetModules();
  return import("../next.config");
}

afterEach(() => {
  if (originalAppPublicUrl === undefined) {
    delete process.env.APP_PUBLIC_URL;
  } else {
    process.env.APP_PUBLIC_URL = originalAppPublicUrl;
  }

  if (originalDevAllowedOrigins === undefined) {
    delete process.env.DEV_ALLOWED_ORIGINS;
  } else {
    process.env.DEV_ALLOWED_ORIGINS = originalDevAllowedOrigins;
  }

  if (originalNextPublicSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalNextPublicSiteUrl;
  }
});

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
    expect(nextConfigSource).toContain("const REPO_ROOT_FRONTEND_ENV_KEYS = new Set([");
    expect(nextConfigSource).toContain("const DEFAULT_ALLOWED_DEV_ORIGINS = [");
    expect(nextConfigSource).toContain('"localhost"');
    expect(nextConfigSource).toContain('"127.0.0.1"');
    expect(nextConfigSource).toContain('"frontend"');
    expect(nextConfigSource).toContain('"proxy"');
    expect(nextConfigSource).toContain("function collectAllowedDevOrigins()");
    expect(nextConfigSource).toContain("process.env.NEXT_PUBLIC_SITE_URL");
    expect(nextConfigSource).toContain("process.env.APP_PUBLIC_URL");
    expect(nextConfigSource).toContain("process.env.DEV_ALLOWED_ORIGINS");
    expect(nextConfigSource).toContain("allowedDevOrigins: collectAllowedDevOrigins(),");
  });

  it("normalizes allowed dev origins from app urls and explicit env entries", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:5000";
    process.env.APP_PUBLIC_URL = "https://ark-fid.ddns.net";
    process.env.DEV_ALLOWED_ORIGINS =
      "https://preview.example.test,staging.example.test,*.preview.internal";

    const { collectAllowedDevOrigins, parseOriginHost } = await importNextConfigModule();
    const allowedOrigins = collectAllowedDevOrigins();

    expect(parseOriginHost("https://ark-fid.ddns.net/de-CH")).toBe("ark-fid.ddns.net");
    expect(parseOriginHost("not-a-url")).toBeNull();
    expect(allowedOrigins).toEqual(
      expect.arrayContaining([
        "localhost",
        "127.0.0.1",
        "frontend",
        "proxy",
        "ark-fid.ddns.net",
        "preview.example.test",
        "staging.example.test",
        "*.preview.internal",
      ]),
    );
  });

  it("only forwards frontend-safe repo root env keys into Next", () => {
    expect(nextConfigSource).toContain('  "API_URL",');
    expect(nextConfigSource).toContain('  "NEXT_DIST_DIR",');
    expect(nextConfigSource).toContain('  "APP_PUBLIC_URL",');
    expect(nextConfigSource).toContain('  "DEV_ALLOWED_ORIGINS",');
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
    expect(dockerComposeSource).toContain("find /app/frontend/.next");
  });

  it("keeps frontend dev bootstrapping inside the frontend workspace after dependency refresh", () => {
    expect(dockerComposeSource).toContain('sh -ec "');
    expect(dockerComposeSource).toContain("find /app/frontend/.next");
    expect(dockerComposeSource).toMatch(/cd \/app\/frontend[\s\S]*npm run dev/);
    expect(dockerComposeSource).not.toContain("npm run dev -w frontend");
  });
});
