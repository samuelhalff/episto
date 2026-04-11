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
});

describe("Permissions Policy", () => {
  it("allows same-origin microphone access while keeping other sensitive APIs disabled", () => {
    expect(buildPermissionsPolicy()).toBe("camera=(), microphone=(self), geolocation=()");
  });
});
