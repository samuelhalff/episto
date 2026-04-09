import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  getApiErrorCode,
  getApiErrorUserMessage,
  isApiErrorWithStatus,
} from "../src/lib/api";

describe("API error helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("extracts the user-facing message from the canonical error envelope", () => {
    const error = new ApiError(503, {
      error: {
        code: "DISPATCH_ADAPTER_NOT_CONFIGURED",
        userMessage: "Live postal pricing is unavailable in this environment.",
      },
    });

    expect(getApiErrorUserMessage(error)).toBe(
      "Live postal pricing is unavailable in this environment.",
    );
    expect(getApiErrorCode(error)).toBe("DISPATCH_ADAPTER_NOT_CONFIGURED");
  });

  it("allows product-specific fallback copy for selected API error codes", () => {
    const error = new ApiError(503, {
      error: {
        code: "PROVIDER_OUTAGE",
        userMessage: "An external service is temporarily unavailable. Please try again shortly.",
      },
    });

    const getMessageWithOverrides = getApiErrorUserMessage as (
      error: unknown,
      options?: { byCode?: Record<string, string> },
    ) => string | null;

    expect(
      getMessageWithOverrides(error, {
        byCode: {
          PROVIDER_OUTAGE:
            "Address search is temporarily unavailable. You can still enter the address manually below.",
        },
      }),
    ).toBe(
      "Address search is temporarily unavailable. You can still enter the address manually below.",
    );
  });

  it("matches ApiError values by status", () => {
    const error = new ApiError(404, { error: { userMessage: "Missing" } });

    expect(isApiErrorWithStatus(error, 404)).toBe(true);
    expect(isApiErrorWithStatus(error, 503)).toBe(false);
    expect(isApiErrorWithStatus(new Error("boom"), 404)).toBe(false);
  });

  it("captures optional request metadata and request ids without breaking existing callers", () => {
    const error = new ApiError(
      500,
      {
        error: {
          code: "INTERNAL_ERROR",
          requestId: "req-123",
          userMessage: "Something went wrong. Please try again.",
        },
      },
      { path: "/v1/drafts/draft-1/messages", method: "POST" },
    );

    expect(error.getCode()).toBe("INTERNAL_ERROR");
    expect(error.getRequestId()).toBe("req-123");
    expect(error.path).toBe("/v1/drafts/draft-1/messages");
    expect(error.method).toBe("POST");
  });

  it("normalizes a bare backend origin to the /api base for shared frontend URLs", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
    vi.resetModules();

    const { getApiUrl } = await import("../src/lib/api");

    expect(getApiUrl("/v1/pricing")).toBe("http://localhost:4000/api/v1/pricing");
  });

  it("keeps browser requests on the same-origin /api proxy even when a public API origin is configured", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.swissmail.ch";
    vi.stubGlobal("window", { location: { origin: "https://swissmail.ch" } });
    vi.resetModules();

    const { getApiUrl } = await import("../src/lib/api");

    expect(getApiUrl("/v1/pricing")).toBe("/api/v1/pricing");
  });
});
