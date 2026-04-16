import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const proxySource = readFileSync(path.join(repoRoot, "frontend/src/proxy.ts"), "utf8");

describe("next proxy entrypoint", () => {
  it("centralizes locale routing and nonce-based CSP in proxy.ts", () => {
    expect(existsSync(path.join(repoRoot, "frontend/src/middleware.ts"))).toBe(false);
    expect(proxySource).toContain("buildContentSecurityPolicy");
    expect(proxySource).toContain("x-nonce");
    expect(proxySource).toContain("Content-Security-Policy");
    expect(proxySource).toContain("createMiddleware");
  });
});
