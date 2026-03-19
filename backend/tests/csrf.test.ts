import { describe, it, expect } from "vitest";

/**
 * CSRF header validation tests.
 *
 * The CSRF middleware in app.ts requires X-Requested-With: XMLHttpRequest on
 * all mutating requests (POST, PUT, PATCH, DELETE) except webhook endpoints.
 * These tests verify the middleware logic inline since the actual Fastify app
 * requires database connections to boot.
 */

const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"] as const;

function simulateCsrfCheck(
  method: string,
  url: string,
  xRequestedWith?: string,
): { blocked: boolean } {
  if (
    (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") &&
    !url.includes("/webhooks/")
  ) {
    if (xRequestedWith !== "XMLHttpRequest") {
      return { blocked: true };
    }
  }
  return { blocked: false };
}

describe("CSRF header validation", () => {
  describe("mutating requests without X-Requested-With", () => {
    for (const method of MUTATING_METHODS) {
      it(`blocks ${method} requests missing the header`, () => {
        const result = simulateCsrfCheck(method, "/api/v1/drafts");
        expect(result.blocked).toBe(true);
      });

      it(`blocks ${method} requests with wrong header value`, () => {
        const result = simulateCsrfCheck(method, "/api/v1/drafts", "fetch");
        expect(result.blocked).toBe(true);
      });
    }
  });

  describe("mutating requests with valid X-Requested-With", () => {
    for (const method of MUTATING_METHODS) {
      it(`allows ${method} requests with XMLHttpRequest header`, () => {
        const result = simulateCsrfCheck(method, "/api/v1/drafts", "XMLHttpRequest");
        expect(result.blocked).toBe(false);
      });
    }
  });

  describe("safe methods", () => {
    for (const method of SAFE_METHODS) {
      it(`allows ${method} requests without the header`, () => {
        const result = simulateCsrfCheck(method, "/api/v1/drafts");
        expect(result.blocked).toBe(false);
      });
    }
  });

  describe("webhook exemption", () => {
    it("allows POST to webhook endpoints without the header", () => {
      const result = simulateCsrfCheck("POST", "/api/v1/webhooks/stripe");
      expect(result.blocked).toBe(false);
    });

    it("allows POST to webhook endpoints with the header", () => {
      const result = simulateCsrfCheck("POST", "/api/v1/webhooks/stripe", "XMLHttpRequest");
      expect(result.blocked).toBe(false);
    });
  });
});
