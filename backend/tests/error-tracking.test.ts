import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logging before import
vi.mock("../src/shared/logging/index.js", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import {
  captureError,
  captureMessage,
  setErrorTrackingSink,
  resetErrorTrackingSink,
  type ErrorTrackingSink,
  type ErrorContext,
} from "../src/modules/error-tracking/index.js";

describe("error-tracking module", () => {
  let mockSink: ErrorTrackingSink;
  let capturedErrors: Array<{ error: Error; context?: ErrorContext }>;
  let capturedMessages: Array<{ message: string; level: string; context?: ErrorContext }>;

  beforeEach(() => {
    capturedErrors = [];
    capturedMessages = [];
    mockSink = {
      captureError: vi.fn((error: Error, context?: ErrorContext) => {
        capturedErrors.push({ error, context });
      }),
      captureMessage: vi.fn((message: string, level: string, context?: ErrorContext) => {
        capturedMessages.push({ message, level, context });
      }),
    };
    setErrorTrackingSink(mockSink);
  });

  // Reset after all tests
  beforeEach(() => {
    return () => {
      resetErrorTrackingSink();
    };
  });

  describe("captureError", () => {
    it("captures an error with context", () => {
      const error = new Error("Test error");
      captureError(error, {
        errorFamily: "validation_error",
        requestId: "req-123",
        route: "/api/v1/drafts",
        method: "POST",
        statusCode: 400,
      });

      expect(mockSink.captureError).toHaveBeenCalledOnce();
      expect(capturedErrors).toHaveLength(1);
      expect(capturedErrors[0].error.message).toBe("Test error");
      expect(capturedErrors[0].context?.errorFamily).toBe("validation_error");
      expect(capturedErrors[0].context?.requestId).toBe("req-123");
    });

    it("captures an error without context", () => {
      const error = new Error("No context error");
      captureError(error);

      expect(mockSink.captureError).toHaveBeenCalledOnce();
      expect(capturedErrors[0].error.message).toBe("No context error");
      expect(capturedErrors[0].context).toBeUndefined();
    });

    it("never throws when sink fails", () => {
      setErrorTrackingSink({
        captureError: () => {
          throw new Error("Sink failure");
        },
        captureMessage: vi.fn(),
      });

      expect(() => captureError(new Error("test"))).not.toThrow();
    });
  });

  describe("captureMessage", () => {
    it("captures a warning message", () => {
      captureMessage("something unusual", "warning", {
        route: "/api/v1/payments",
      });

      expect(mockSink.captureMessage).toHaveBeenCalledOnce();
      expect(capturedMessages[0].message).toBe("something unusual");
      expect(capturedMessages[0].level).toBe("warning");
      expect(capturedMessages[0].context?.route).toBe("/api/v1/payments");
    });

    it("captures an error message", () => {
      captureMessage("dispatch failed", "error");

      expect(mockSink.captureMessage).toHaveBeenCalledOnce();
      expect(capturedMessages[0].level).toBe("error");
    });

    it("defaults to error level", () => {
      captureMessage("something broke");

      expect(capturedMessages[0].level).toBe("error");
    });

    it("never throws when sink fails", () => {
      setErrorTrackingSink({
        captureError: vi.fn(),
        captureMessage: () => {
          throw new Error("Sink failure");
        },
      });

      expect(() => captureMessage("test")).not.toThrow();
    });
  });

  describe("sink replacement", () => {
    it("uses the replaced sink", () => {
      const customSink: ErrorTrackingSink = {
        captureError: vi.fn(),
        captureMessage: vi.fn(),
      };

      setErrorTrackingSink(customSink);
      captureError(new Error("routed to custom"));

      expect(customSink.captureError).toHaveBeenCalledOnce();
      expect(mockSink.captureError).not.toHaveBeenCalled();
    });

    it("reverts to default sink on reset", () => {
      resetErrorTrackingSink();
      // Default sink is the log sink — just verify it doesn't throw
      expect(() => captureError(new Error("log sink test"))).not.toThrow();
    });
  });
});
