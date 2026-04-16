import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";
import dotenv from "dotenv";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const REPO_ROOT_FRONTEND_ENV_KEYS = new Set([
  "API_URL",
  "NEXT_DIST_DIR",
  "APP_PUBLIC_URL",
  "DEV_ALLOWED_ORIGINS",
]);
const DEFAULT_ALLOWED_DEV_ORIGINS = [
  "localhost",
  "127.0.0.1",
  "frontend",
  "proxy",
] as const;

function isAllowedRootEnvKey(key: string): boolean {
  return key.startsWith("NEXT_PUBLIC_") || REPO_ROOT_FRONTEND_ENV_KEYS.has(key);
}

function loadLocalEnvFiles() {
  const cwd = process.cwd();
  const repoRoot = path.resolve(cwd, "..");
  const originalKeys = new Set(Object.keys(process.env));
  const candidates = [
    path.resolve(cwd, "../.env"),
    path.resolve(cwd, "../.env.local"),
    path.resolve(cwd, ".env"),
    path.resolve(cwd, ".env.local"),
  ];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;

    const isRepoRootEnv = path.dirname(file) === repoRoot;
    const parsed = dotenv.parse(fs.readFileSync(file));
    for (const [key, value] of Object.entries(parsed)) {
      if (originalKeys.has(key)) continue;
      if (isRepoRootEnv && !isAllowedRootEnvKey(key)) continue;
      process.env[key] = value;
    }
  }
}

loadLocalEnvFiles();

export function parseOriginHost(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function normalizeAllowedDevOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return parseOriginHost(trimmed) ?? trimmed;
}

export function collectAllowedDevOrigins(): string[] {
  const hosts = new Set<string>(DEFAULT_ALLOWED_DEV_ORIGINS);
  const envHosts = [
    parseOriginHost(process.env.NEXT_PUBLIC_SITE_URL),
    parseOriginHost(process.env.APP_PUBLIC_URL),
    ...(process.env.DEV_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map(normalizeAllowedDevOrigin)
      .filter(Boolean),
  ];

  for (const host of envHosts) {
    if (host) {
      hosts.add(host);
    }
  }

  return [...hosts];
}

// Security headers — values locked in docs/07-operations/security-and-privacy.md §Security headers
// The CSP is set per-request by `src/proxy.ts` so a fresh nonce can be
// attached to `script-src` on every HTML response. The builder lives in
// `src/lib/csp.ts` and is re-exported here for legacy test imports.
export { buildContentSecurityPolicy, buildPermissionsPolicy } from "./src/lib/csp";
import { buildPermissionsPolicy } from "./src/lib/csp";

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "0" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: buildPermissionsPolicy(),
  },
  // Content-Security-Policy intentionally omitted here — proxy sets it
  // per-request with a fresh nonce. Next.js merges middleware-set headers
  // with static ones; keeping it out here avoids a stale, nonce-less CSP
  // shadowing the dynamic one in edge cases.
];

function createConfig(): NextConfig {
  const distDir = process.env.NEXT_DIST_DIR || ".next";

  return {
    reactStrictMode: true,
    output: "standalone",
    distDir,
    allowedDevOrigins: collectAllowedDevOrigins(),
    experimental: {
      serverComponentsHmrCache: false,
    },
    async headers() {
      return [
        {
          // Apply security headers to all routes.
          source: "/(.*)",
          headers: securityHeaders,
        },
      ];
    },
    async rewrites() {
      const apiUrl = process.env.API_URL || "http://localhost:4000";
      return [
        {
          source: "/api/:path*",
          destination: `${apiUrl}/api/:path*`,
        },
      ];
    },
  };
}

export default withSentryConfig(withNextIntl(createConfig()), {
  silent: !process.env.CI,
});
