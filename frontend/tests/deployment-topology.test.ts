import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const dockerComposeSource = readFileSync(
  path.join(repoRoot, "docker-compose.yml"),
  "utf8",
);

const dockerComposeProdSource = readFileSync(
  path.join(repoRoot, "docker-compose.prod.yml"),
  "utf8",
);

const nextConfigSource = readFileSync(
  path.join(repoRoot, "frontend/next.config.ts"),
  "utf8",
);

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
    expect(proxyBlock).toContain("./nginx/ark-fid-proxy.conf:/etc/nginx/conf.d/default.conf:ro");
    expect(frontendBlock).toContain("restart: unless-stopped");
    expect(backendBlock).toContain("restart: unless-stopped");
    expect(postgresBlock).toContain("restart: unless-stopped");
    expect(redisBlock).toContain("restart: unless-stopped");
    expect(minioBlock).toContain("restart: unless-stopped");
  });

  it("keeps the production compose file on public nginx 80/443", () => {
    const proxyBlock = getServiceBlock(dockerComposeProdSource, "proxy");
    const frontendBlock = getServiceBlock(dockerComposeProdSource, "frontend");
    const backendBlock = getServiceBlock(dockerComposeProdSource, "backend");
    const postgresBlock = getServiceBlock(dockerComposeProdSource, "postgres");
    const redisBlock = getServiceBlock(dockerComposeProdSource, "redis");
    const minioBlock = getServiceBlock(dockerComposeProdSource, "minio");

    expect(proxyBlock).toContain('- "80:80"');
    expect(proxyBlock).toContain('- "443:443"');
    expect(proxyBlock).not.toContain('- "5000:5000"');
    expect(proxyBlock).toContain("./nginx/swissmail-proxy.conf:/etc/nginx/conf.d/default.conf:ro");
    expect(frontendBlock).toContain("NEXT_PUBLIC_SITE_URL: https://swissmail.ch");
    expect(frontendBlock).toContain("NEXT_PUBLIC_API_URL: https://api.swissmail.ch");
    expect(frontendBlock).toContain("NEXT_PUBLIC_APP_ENV: production");
    expect(frontendBlock).not.toContain('- "3000:3000"');
    expect(backendBlock).toContain("CORS_ORIGIN: https://swissmail.ch,https://www.swissmail.ch");
    expect(backendBlock).not.toContain('- "4000:4000"');
    expect(postgresBlock).toContain("restart: unless-stopped");
    expect(redisBlock).toContain("restart: unless-stopped");
    expect(minioBlock).toContain("restart: unless-stopped");
  });

  it("allows the production API origin through the frontend CSP", () => {
    expect(nextConfigSource).toContain(
      "connect-src 'self' https://api.stripe.com https://api.swissmail.ch ws: wss:",
    );
  });
});
