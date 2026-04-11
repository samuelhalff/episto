import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const paymentWebhookRoutesSource = readFileSync(
  path.join(repoRoot, "backend/src/modules/payments/payment-webhook.routes.ts"),
  "utf8",
);
const eslintConfigSource = readFileSync(path.join(repoRoot, "eslint.config.js"), "utf8");
const backendTsconfigSource = readFileSync(path.join(repoRoot, "backend/tsconfig.json"), "utf8");

describe("type safety hardening", () => {
  it("stores Stripe webhook raw bodies without any casts", () => {
    expect(paymentWebhookRoutesSource).toContain("request.rawBodyBuffer");
    expect(paymentWebhookRoutesSource).not.toContain("as any");
  });

  it("ships a Fastify request augmentation for rawBodyBuffer", () => {
    const typePath = path.join(repoRoot, "backend/src/types/fastify.d.ts");
    expect(existsSync(typePath)).toBe(true);

    const typeSource = readFileSync(typePath, "utf8");
    expect(typeSource).toContain("declare module \"fastify\"");
    expect(typeSource).toContain("rawBodyBuffer?: Buffer");
    expect(backendTsconfigSource).toContain("src/**/*.d.ts");
  });

  it("enforces strict lint rules for any, non-null assertions, and ts comments", () => {
    expect(eslintConfigSource).toContain('"@typescript-eslint/no-explicit-any": "error"');
    expect(eslintConfigSource).toContain('"@typescript-eslint/no-non-null-assertion": "error"');
    expect(eslintConfigSource).toContain('"@typescript-eslint/ban-ts-comment"');
    expect(eslintConfigSource).toContain('"ts-expect-error": true');
    expect(eslintConfigSource).toContain('"ts-ignore": true');
  });
});
