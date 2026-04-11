import { describe, it, expect } from "vitest";
import { assertDefined } from "./assert-defined";
import {
  AppError,
  statusForFamily,
  validationError,
  notFoundError,
  providerOutageError,
} from "../src/shared/errors/index.js";
import type { ErrorFamily } from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// AppError construction
// ---------------------------------------------------------------------------

describe("AppError", () => {
  it("constructs with all required properties", () => {
    const err = new AppError({
      family: "validation_error",
      statusCode: 400,
      code: "TEST_ERR",
      message: "internal msg",
      userMessage: "user msg",
    });

    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AppError");
    expect(err.family).toBe("validation_error");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("TEST_ERR");
    expect(err.message).toBe("internal msg");
    expect(err.userMessage).toBe("user msg");
    expect(err.userAction).toBeNull();
    expect(err.fields).toBeUndefined();
  });

  it("stores optional userAction", () => {
    const err = new AppError({
      family: "payment_failure",
      statusCode: 402,
      code: "PAY_FAIL",
      message: "card declined",
      userMessage: "Payment failed.",
      userAction: "Try a different card.",
    });
    expect(err.userAction).toBe("Try a different card.");
  });

  it("stores optional fields", () => {
    const err = new AppError({
      family: "validation_error",
      statusCode: 400,
      code: "VAL",
      message: "bad",
      userMessage: "bad",
      fields: [{ field: "email", message: "required" }],
    });
    expect(err.fields).toHaveLength(1);
    expect(assertDefined(err.fields?.[0]).field).toBe("email");
  });

  it("stores cause via Error options", () => {
    const cause = new Error("root cause");
    const err = new AppError({
      family: "provider_outage",
      statusCode: 503,
      code: "OUT",
      message: "down",
      userMessage: "down",
      cause,
    });
    expect(err.cause).toBe(cause);
  });
});

// ---------------------------------------------------------------------------
// toResponse()
// ---------------------------------------------------------------------------

describe("AppError.toResponse()", () => {
  it("returns proper error response shape", () => {
    const err = new AppError({
      family: "dispatch_rejection",
      statusCode: 422,
      code: "DISPATCH_REJECT",
      message: "rejected by provider",
      userMessage: "The letter was rejected.",
      userAction: "Fix the address.",
    });

    const resp = err.toResponse();
    expect(resp.error.code).toBe("DISPATCH_REJECT");
    expect(resp.error.family).toBe("dispatch_rejection");
    expect(resp.error.message).toBe("rejected by provider");
    expect(resp.error.userMessage).toBe("The letter was rejected.");
    expect(resp.error.userAction).toBe("Fix the address.");
    expect(resp.error.requestId).toBeUndefined();
    expect(resp.error.fields).toBeUndefined();
  });

  it("includes requestId when provided", () => {
    const err = new AppError({
      family: "validation_error",
      statusCode: 400,
      code: "V",
      message: "m",
      userMessage: "u",
    });
    const resp = err.toResponse("req-123");
    expect(resp.error.requestId).toBe("req-123");
  });

  it("includes fields when present", () => {
    const err = new AppError({
      family: "validation_error",
      statusCode: 400,
      code: "V",
      message: "m",
      userMessage: "u",
      fields: [
        { field: "name", message: "required" },
        { field: "email", message: "invalid" },
      ],
    });
    const resp = err.toResponse();
    expect(resp.error.fields).toHaveLength(2);
  });

  it("omits fields when empty array", () => {
    const err = new AppError({
      family: "validation_error",
      statusCode: 400,
      code: "V",
      message: "m",
      userMessage: "u",
      fields: [],
    });
    const resp = err.toResponse();
    expect(resp.error.fields).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// statusForFamily()
// ---------------------------------------------------------------------------

describe("statusForFamily()", () => {
  const expectedMappings: [ErrorFamily, number][] = [
    ["validation_error", 400],
    ["policy_refusal", 403],
    ["payment_failure", 402],
    ["dispatch_rejection", 422],
    ["dispatch_ambiguity", 502],
    ["provider_outage", 503],
    ["tracking_unavailable", 503],
    ["file_upload_failure", 422],
    ["rendering_failure", 500],
    ["retention_cleanup_failure", 500],
  ];

  it.each(expectedMappings)("maps %s → %i", (family, status) => {
    expect(statusForFamily(family)).toBe(status);
  });

  it("returns 500 for unknown family", () => {
    expect(statusForFamily("totally_unknown" as ErrorFamily)).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Convenience factories
// ---------------------------------------------------------------------------

describe("validationError()", () => {
  it("creates an AppError with validation family", () => {
    const err = validationError("Bad input");
    expect(err).toBeInstanceOf(AppError);
    expect(err.family).toBe("validation_error");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.userAction).toBe("Please correct the highlighted fields and try again.");
  });

  it("includes fields when provided", () => {
    const err = validationError("Bad input", [{ field: "name", message: "required" }]);
    expect(err.fields).toHaveLength(1);
  });

  it("has no fields when not provided", () => {
    const err = validationError("Bad input");
    expect(err.fields).toBeUndefined();
  });
});

describe("notFoundError()", () => {
  it("creates a 404 error for a resource", () => {
    const err = notFoundError("Draft");
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Draft not found");
    expect(err.userMessage).toContain("Draft");
  });
});

describe("providerOutageError()", () => {
  it("creates a 503 error for provider outage", () => {
    const err = providerOutageError("Swiss Post");
    expect(err).toBeInstanceOf(AppError);
    expect(err.family).toBe("provider_outage");
    expect(err.statusCode).toBe(503);
    expect(err.code).toBe("PROVIDER_OUTAGE");
    expect(err.message).toContain("Swiss Post");
    expect(err.userAction).toBe("Wait a moment and retry.");
  });

  it("stores the cause", () => {
    const cause = new Error("timeout");
    const err = providerOutageError("Stripe", cause);
    expect(err.cause).toBe(cause);
  });
});
