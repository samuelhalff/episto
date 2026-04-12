import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const dockerComposeSource = readFileSync(
  path.join(repoRoot, "docker-compose.yml"),
  "utf8",
);

const dockerComposeProdSource = readFileSync(
  path.join(repoRoot, "docker-compose.prod.yml"),
  "utf8",
);

const renderProdProxySource = readFileSync(
  path.join(repoRoot, "nginx/render-prod-proxy.sh"),
  "utf8",
);

afterEach(() => {
  vi.resetModules();
  delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  delete process.env.NEXT_PUBLIC_API_URL;
});

function getServiceBlock(source: string, service: string): string {
  const match = source.match(
    new RegExp(`\\n  ${service}:([\\s\\S]*?)(?=\\n  [a-z0-9-]+:|\\nvolumes:|$)`),
  );

  expect(match, `Missing ${service} service block`).not.toBeNull();

  return match?.[1] ?? "";
}

describe("deployment topology", () => {
  it("keeps the dev stack recoverable behind the local port 5000 proxy", () => {
    const proxyBlock = getServiceBlock(dockerComposeSource, "proxy");
    const frontendBlock = getServiceBlock(dockerComposeSource, "frontend");
    const backendBlock = getServiceBlock(dockerComposeSource, "backend");
    const postgresBlock = getServiceBlock(dockerComposeSource, "postgres");
    const redisBlock = getServiceBlock(dockerComposeSource, "redis");
    const minioBlock = getServiceBlock(dockerComposeSource, "minio");

    expect(proxyBlock).toContain('- "5000:5000"');
    expect(proxyBlock).toContain(
      "./nginx/dev-proxy.conf:/etc/nginx/conf.d/default.conf:ro",
    );
    expect(frontendBlock).toContain("restart: unless-stopped");
    expect(backendBlock).toContain("restart: unless-stopped");
    expect(backendBlock).toContain("npm run db:migrate:dev -w backend");
    expect(backendBlock).toContain("/api/readiness");
    expect(postgresBlock).toContain("restart: unless-stopped");
    expect(redisBlock).toContain("restart: unless-stopped");
    expect(minioBlock).toContain("restart: unless-stopped");
  });

  it("keeps the dev backend and worker startable when local env files lag new required keys", () => {
    const backendBlock = getServiceBlock(dockerComposeSource, "backend");
    const workerBlock = getServiceBlock(dockerComposeSource, "worker");

    expect(backendBlock).toContain(
      "ORDER_ACCESS_TOKEN_SECRET: ${ORDER_ACCESS_TOKEN_SECRET:-dev-order-access-secret-at-least-32-chars}",
    );
    expect(backendBlock).toContain(
      "AZURE_SPEECH_REGION: ${AZURE_SPEECH_REGION:-switzerlandnorth}",
    );
    expect(backendBlock).toContain(
      "AZURE_SPEECH_API_KEY: ${AZURE_SPEECH_API_KEY:-dev-speech-key}",
    );
    expect(workerBlock).toContain(
      "ORDER_ACCESS_TOKEN_SECRET: ${ORDER_ACCESS_TOKEN_SECRET:-dev-order-access-secret-at-least-32-chars}",
    );
    expect(workerBlock).toContain(
      "AZURE_SPEECH_REGION: ${AZURE_SPEECH_REGION:-switzerlandnorth}",
    );
    expect(workerBlock).toContain(
      "AZURE_SPEECH_API_KEY: ${AZURE_SPEECH_API_KEY:-dev-speech-key}",
    );
  });

  it("keeps the production compose file env-driven with the required local 5000 handoff", () => {
    const proxyBlock = getServiceBlock(dockerComposeProdSource, "proxy");
    const frontendBlock = getServiceBlock(dockerComposeProdSource, "frontend");
    const backendBlock = getServiceBlock(dockerComposeProdSource, "backend");
    const workerBlock = getServiceBlock(dockerComposeProdSource, "worker");
    const postgresBlock = getServiceBlock(dockerComposeProdSource, "postgres");
    const redisBlock = getServiceBlock(dockerComposeProdSource, "redis");
    const minioBlock = getServiceBlock(dockerComposeProdSource, "minio");
    const zefixProxyBlock = getServiceBlock(dockerComposeProdSource, "zefix-proxy");

    expect(proxyBlock).toContain('- "80:80"');
    expect(proxyBlock).toContain('- "443:443"');
    expect(proxyBlock).toContain('- "5000:5000"');
    expect(proxyBlock).toContain(
      "./nginx/render-prod-proxy.sh:/etc/nginx/render-prod-proxy.sh:ro",
    );
    expect(proxyBlock).toContain(
      "NEXT_PUBLIC_SITE_URL: ${NEXT_PUBLIC_SITE_URL:?NEXT_PUBLIC_SITE_URL is required}",
    );
    expect(proxyBlock).toContain(
      "PUBLIC_FRONTEND_SERVER_NAMES: ${PUBLIC_FRONTEND_SERVER_NAMES:-}",
    );
    expect(proxyBlock).toContain("PUBLIC_TLS_CERT_NAME: ${PUBLIC_TLS_CERT_NAME:-}");
    expect(frontendBlock).toContain(
      "NEXT_PUBLIC_SITE_URL: ${NEXT_PUBLIC_SITE_URL:?NEXT_PUBLIC_SITE_URL is required}",
    );
    expect(frontendBlock).toContain(
      "NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:?NEXT_PUBLIC_API_URL is required}",
    );
    expect(frontendBlock).toContain("NEXT_PUBLIC_APP_ENV: production");
    expect(frontendBlock).not.toContain('- "3000:3000"');
    expect(dockerComposeProdSource).toContain(
      "docker compose --env-file /etc/swissmail/production.env -f docker-compose.prod.yml up -d --build",
    );
    expect(dockerComposeProdSource).toContain(
      "path: ${SWISSMAIL_ENV_FILE:-/etc/swissmail/production.env}",
    );
    expect(backendBlock).toContain(
      "CORS_ORIGIN: ${CORS_ORIGIN:?CORS_ORIGIN is required}",
    );
    expect(backendBlock).toContain('TRUST_PROXY: "true"');
    expect(backendBlock).toContain("ZEFIX_PROXY_BASE_URL: http://zefix-proxy:8081");
    expect(backendBlock).toContain("zefix-proxy:");
    expect(backendBlock).toContain("/api/readiness");
    expect(backendBlock).not.toContain('- "4000:4000"');
    expect(workerBlock).toContain("ZEFIX_PROXY_BASE_URL: http://zefix-proxy:8081");
    expect(zefixProxyBlock).toContain("context: ./services/zefix-proxy");
    expect(zefixProxyBlock).toContain('  - "8081"');
    expect(postgresBlock).toContain("restart: unless-stopped");
    expect(redisBlock).toContain("restart: unless-stopped");
    expect(minioBlock).toContain("restart: unless-stopped");
    expect(zefixProxyBlock).toContain("restart: unless-stopped");

    // Infrastructure credentials must come from env vars, not be hardcoded
    expect(postgresBlock).toContain(
      "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}",
    );
    expect(postgresBlock).not.toContain("POSTGRES_PASSWORD: swissmail");
    expect(minioBlock).toContain(
      "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}",
    );
    expect(minioBlock).not.toContain("MINIO_ROOT_PASSWORD: minioadmin");
    expect(backendBlock).not.toContain("swissmail:swissmail@postgres");
    expect(backendBlock).not.toContain("S3_SECRET_KEY: minioadmin");

    // Network isolation: infra on internal, proxy-facing services on proxy
    expect(dockerComposeProdSource).toContain("networks:");
    expect(dockerComposeProdSource).toContain("internal:");
    expect(dockerComposeProdSource).toContain("proxy:");
  });

  it("renders a plain-http 5000 handoff listener that preserves upstream forwarded headers", () => {
    expect(renderProdProxySource).toContain("listen 5000;");
    expect(renderProdProxySource).toContain(
      "map \\$http_x_forwarded_proto \\$forwarded_proto {",
    );
    expect(renderProdProxySource).toContain(
      "map \\$http_x_forwarded_host \\$forwarded_host {",
    );
    expect(renderProdProxySource).toContain(
      "map \\$http_x_forwarded_port \\$forwarded_port {",
    );
    expect(renderProdProxySource).toContain(
      "proxy_set_header X-Forwarded-Host  \\$forwarded_host;",
    );
    expect(renderProdProxySource).toContain(
      "proxy_set_header X-Forwarded-Port  \\$forwarded_port;",
    );
    expect(renderProdProxySource).toContain(
      "proxy_set_header X-Forwarded-Proto \\$forwarded_proto;",
    );
  });

  it("does not hardcode a production API origin in the frontend CSP", async () => {
    process.env.NEXT_PUBLIC_API_URL = "/api";

    const { buildContentSecurityPolicy } = await import("../next.config");

    expect(buildContentSecurityPolicy(false)).toContain(
      "connect-src 'self' https://api.stripe.com ws: wss:",
    );
    expect(buildContentSecurityPolicy(false)).not.toContain("https://api.swissmail.ch");
  });

  it("adds the configured absolute API origin to the frontend CSP", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.app.example.com";

    const { buildContentSecurityPolicy } = await import("../next.config");

    expect(buildContentSecurityPolicy(false)).toContain("https://api.app.example.com");
  });

  it("keeps same-host /api proxying even when a dedicated API host is configured", () => {
    expect(renderProdProxySource).toContain("location /api/ {");
    expect(renderProdProxySource).toContain(
      'if [ -n "$API_HOST" ] && [ "$API_HOST" != "$CANONICAL_HOST" ]; then',
    );
    expect(renderProdProxySource).not.toContain(
      'if [ -z "$API_HOST" ] || [ "$API_HOST" = "$CANONICAL_HOST" ]; then',
    );
  });

  it("adds the Sentry ingest origin to connect-src when a public DSN is configured", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://public@example.ingest.sentry.io/123";

    const { buildContentSecurityPolicy } = await import("../next.config");

    expect(buildContentSecurityPolicy(false)).toContain(
      "https://example.ingest.sentry.io",
    );
  });
});
