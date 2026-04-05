import { describe, expect, it } from "vitest";

import {
  ApiError,
  getApiErrorCode,
  getApiErrorUserMessage,
  isApiErrorWithStatus,
} from "../src/lib/api";

describe("API error helpers", () => {
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
});
