import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import dotenv from "dotenv";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const REPO_ROOT_FRONTEND_ENV_KEYS = new Set(["API_URL", "NEXT_DIST_DIR"]);

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

// Security headers — values locked in docs/07-operations/security-and-privacy.md §Security headers
// CSP includes Stripe domains as required by docs (script-src, frame-src, connect-src).
export function buildContentSecurityPolicy(isDevelopment: boolean): string {
  const scriptSrc = [
    "script-src 'self' 'unsafe-inline'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    "https://js.stripe.com",
  ].join(" ");

  return [
    "default-src 'self'",
    scriptSrc,
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "connect-src 'self' https://api.stripe.com https://api.swissmail.ch ws: wss:",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

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
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(process.env.NODE_ENV !== "production"),
  },
];

function createConfig(): NextConfig {
  const distDir = process.env.NEXT_DIST_DIR || ".next";

  return {
    reactStrictMode: true,
    output: "standalone",
    distDir,
    allowedDevOrigins: ["ark-fid.ddns.net"],
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

export default withNextIntl(createConfig());
