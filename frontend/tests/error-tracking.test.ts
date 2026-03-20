import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  captureError,
  captureMessage,
  setFrontendErrorTrackingSink,
  resetFrontendErrorTrackingSink,
  type FrontendErrorTrackingSink,
  type FrontendErrorContext,
} from "../src/lib/error-tracking.js";

describe("frontend error-tracking module", () => {
  let mockSink: FrontendErrorTrackingSink;
  let capturedErrors: Array<{ error: Error; context?: FrontendErrorContext }>;
  let capturedMessages: Array<{ message: string; level: string; context?: FrontendErrorContext }>;

  beforeEach(() => {
    capturedErrors = [];
    capturedMessages = [];
    mockSink = {
      captureError: vi.fn((error: Error, context?: FrontendErrorContext) => {
        capturedErrors.push({ error, context });
      }),
      captureMessage: vi.fn((message: string, level: string, context?: FrontendErrorContext) => {
        capturedMessages.push({ message, level, context });
      }),
    };
    setFrontendErrorTrackingSink(mockSink);
  });

  beforeEach(() => {
    return () => {
      resetFrontendErrorTrackingSink();
    };
  });

  describe("captureError", () => {
    it("captures an error with context", () => {
      const error = new Error("Component crashed");
      captureError(error, {
        component: "ConversationPanel",
        route: "/en-CH/draft/abc",
        errorFamily: "rendering_failure",
      });

      expect(mockSink.captureError).toHaveBeenCalledOnce();
      expect(capturedErrors).toHaveLength(1);
      expect(capturedErrors[0].error.message).toBe("Component crashed");
      expect(capturedErrors[0].context?.component).toBe("ConversationPanel");
    });

    it("captures an error without context", () => {
      captureError(new Error("no context"));
      expect(capturedErrors).toHaveLength(1);
      expect(capturedErrors[0].context).toBeUndefined();
    });

    it("never throws when sink fails", () => {
      setFrontendErrorTrackingSink({
        captureError: () => {
          throw new Error("Sink failure");
        },
        captureMessage: vi.fn(),
      });
      expect(() => captureError(new Error("test"))).not.toThrow();
    });
  });

  describe("captureMessage", () => {
    it("captures a warning", () => {
      captureMessage("Slow API response", "warning", { route: "/draft/new" });

      expect(capturedMessages).toHaveLength(1);
      expect(capturedMessages[0].level).toBe("warning");
    });

    it("defaults to error level", () => {
      captureMessage("something broke");
      expect(capturedMessages[0].level).toBe("error");
    });

    it("never throws when sink fails", () => {
      setFrontendErrorTrackingSink({
        captureError: vi.fn(),
        captureMessage: () => {
          throw new Error("Sink failure");
        },
      });
      expect(() => captureMessage("test")).not.toThrow();
    });
  });

  describe("sink replacement", () => {
    it("uses custom sink", () => {
      const custom: FrontendErrorTrackingSink = {
        captureError: vi.fn(),
        captureMessage: vi.fn(),
      };
      setFrontendErrorTrackingSink(custom);
      captureError(new Error("custom sink"));

      expect(custom.captureError).toHaveBeenCalledOnce();
      expect(mockSink.captureError).not.toHaveBeenCalled();
    });

    it("reverts on reset", () => {
      resetFrontendErrorTrackingSink();
      expect(() => captureError(new Error("default sink"))).not.toThrow();
    });
  });
});
