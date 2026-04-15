import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, buildPermissionsPolicy } from "../next.config";

describe("Content Security Policy", () => {
  it("allows unsafe-eval only in development", () => {
    expect(buildContentSecurityPolicy(true)).toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy(false)).not.toContain("'unsafe-eval'");
  });

  it("keeps Stripe script loading enabled in production", () => {
    expect(buildContentSecurityPolicy(false)).toContain("https://js.stripe.com");
  });

  it("embeds the per-request nonce and drops unsafe-inline from script-src", () => {
    const csp = buildContentSecurityPolicy(false, "abc123");
    const scriptSrc = csp
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("script-src"));

    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("falls back to unsafe-inline when no nonce is supplied", () => {
    const csp = buildContentSecurityPolicy(false);
    const scriptSrc = csp
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("script-src"));

    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'nonce-");
  });
});

describe("Permissions Policy", () => {
  it("allows same-origin microphone access while keeping other sensitive APIs disabled", () => {
    expect(buildPermissionsPolicy()).toBe("camera=(), microphone=(self), geolocation=()");
  });
});
