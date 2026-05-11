import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { assertDefined } from "./assert-defined";

// Mock logging before import
vi.mock("../src/shared/logging/index.js", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import {
  recordEvent,
  setAnalyticsSink,
  resetAnalyticsSink,
  ANALYTICS_EVENTS,
  type AnalyticsEvent,
  type AnalyticsSink,
} from "../src/modules/analytics/index.js";

describe("analytics module", () => {
  let mockSink: AnalyticsSink;
  let recordedEvents: AnalyticsEvent[];

  beforeEach(() => {
    recordedEvents = [];
    mockSink = {
      record: vi.fn((event: AnalyticsEvent) => {
        recordedEvents.push(event);
      }),
    };
    setAnalyticsSink(mockSink);
  });

  afterEach(() => {
    resetAnalyticsSink();
  });

  // -----------------------------------------------------------------------
  // Event constant coverage
  // -----------------------------------------------------------------------

  describe("ANALYTICS_EVENTS constants", () => {
    it("defines all 34 event names from the taxonomy", () => {
      const keys = Object.keys(ANALYTICS_EVENTS);
      expect(keys).toHaveLength(34);
    });

    it("includes marketing events", () => {
      expect(ANALYTICS_EVENTS.MARKETING_PAGE_VIEWED).toBe("marketing_page_viewed");
      expect(ANALYTICS_EVENTS.DRAFT_ENTRY_STARTED).toBe("draft_entry_started");
      expect(ANALYTICS_EVENTS.TEMPLATE_SELECTED).toBe("template_selected");
    });

    it("includes session & draft flow events", () => {
      expect(ANALYTICS_EVENTS.SESSION_CREATED).toBe("session_created");
      expect(ANALYTICS_EVENTS.RESUME_BANNER_SHOWN).toBe("resume_banner_shown");
      expect(ANALYTICS_EVENTS.RESUME_LINK_OPENED).toBe("resume_link_opened");
      expect(ANALYTICS_EVENTS.DRAFT_CREATED).toBe("draft_created");
      expect(ANALYTICS_EVENTS.DRAFT_FIRST_RESPONSE_COMPLETED).toBe(
        "draft_first_response_completed",
      );
      expect(ANALYTICS_EVENTS.DRAFT_FIRST_FULL_DRAFT_READY).toBe(
        "draft_first_full_draft_ready",
      );
      expect(ANALYTICS_EVENTS.DRAFT_CONFLICT_SEEN).toBe("draft_conflict_seen");
    });

    it("includes file & review events", () => {
      expect(ANALYTICS_EVENTS.FILE_UPLOAD_STARTED).toBe("file_upload_started");
      expect(ANALYTICS_EVENTS.FILE_UPLOAD_FAILED).toBe("file_upload_failed");
      expect(ANALYTICS_EVENTS.REVIEW_REACHED).toBe("review_reached");
      expect(ANALYTICS_EVENTS.REVIEW_BLOCKED).toBe("review_blocked");
    });

    it("includes checkout & payment events", () => {
      expect(ANALYTICS_EVENTS.CHECKOUT_STARTED).toBe("checkout_started");
      expect(ANALYTICS_EVENTS.PAYMENT_INTENT_CREATED).toBe("payment_intent_created");
      expect(ANALYTICS_EVENTS.PAYMENT_FAILED).toBe("payment_failed");
      expect(ANALYTICS_EVENTS.PAYMENT_CAPTURED).toBe("payment_captured");
    });

    it("includes dispatch & post-payment events", () => {
      expect(ANALYTICS_EVENTS.DISPATCH_SUBMITTED).toBe("dispatch_submitted");
      expect(ANALYTICS_EVENTS.DISPATCH_ACCEPTED).toBe("dispatch_accepted");
      expect(ANALYTICS_EVENTS.DISPATCH_AMBIGUOUS).toBe("dispatch_ambiguous");
      expect(ANALYTICS_EVENTS.ORDER_STATUS_VIEWED).toBe("order_status_viewed");
      expect(ANALYTICS_EVENTS.REFUND_CONFIRMED).toBe("refund_confirmed");
    });
  });

  // -----------------------------------------------------------------------
  // recordEvent behaviour
  // -----------------------------------------------------------------------

  describe("recordEvent", () => {
    it("sends events to the configured sink", () => {
      recordEvent({
        event: "session_created",
        sessionId: "sess-123",
        locale: "de-CH",
      });

      expect(mockSink.record).toHaveBeenCalledOnce();
      expect(recordedEvents).toHaveLength(1);
      expect(recordedEvents[0]).toEqual({
        event: "session_created",
        sessionId: "sess-123",
        locale: "de-CH",
      });
    });

    it("records multiple events in sequence", () => {
      recordEvent({ event: "draft_created", sessionId: "sess-1", draftId: "draft-1" });
      recordEvent({
        event: "review_reached",
        draftId: "draft-1",
        pageCountEstimate: 2,
        attachmentCount: 1,
      });
      recordEvent({
        event: "checkout_started",
        draftId: "draft-1",
        deliveryType: "standard",
        priceCents: 490,
      });

      expect(recordedEvents).toHaveLength(3);
      expect(assertDefined(recordedEvents[0]).event).toBe("draft_created");
      expect(assertDefined(recordedEvents[1]).event).toBe("review_reached");
      expect(assertDefined(recordedEvents[2]).event).toBe("checkout_started");
    });

    it("never throws even when the sink throws", () => {
      setAnalyticsSink({
        record: () => {
          throw new Error("sink failure");
        },
      });

      // Should not throw
      expect(() => {
        recordEvent({ event: "session_created", sessionId: "sess-x", locale: "fr-CH" });
      }).not.toThrow();
    });

    it("records payment_captured with correct fields", () => {
      recordEvent({
        event: "payment_captured",
        draftId: "draft-42",
        paymentAttemptId: "pay-99",
        amountCents: 890,
      });

      expect(recordedEvents[0]).toEqual({
        event: "payment_captured",
        draftId: "draft-42",
        paymentAttemptId: "pay-99",
        amountCents: 890,
      });
    });

    it("records dispatch events with correct fields", () => {
      recordEvent({
        event: "dispatch_submitted",
        draftId: "d-1",
        dispatchAttemptId: "disp-1",
        deliveryType: "registered",
      });
      recordEvent({
        event: "dispatch_ambiguous",
        draftId: "d-1",
        dispatchAttemptId: "disp-1",
        reasonCategory: "timeout",
      });

      expect(assertDefined(recordedEvents[0]).event).toBe("dispatch_submitted");
      expect(assertDefined(recordedEvents[1]).event).toBe("dispatch_ambiguous");
    });
  });

  // -----------------------------------------------------------------------
  // Sink management
  // -----------------------------------------------------------------------

  describe("sink management", () => {
    it("resetAnalyticsSink restores the default log sink", () => {
      resetAnalyticsSink();
      // Should not throw — uses the default log sink
      expect(() => {
        recordEvent({ event: "session_created", sessionId: "s-1", locale: "it-CH" });
      }).not.toThrow();
    });

    it("setAnalyticsSink replaces the active sink", () => {
      const customEvents: AnalyticsEvent[] = [];
      setAnalyticsSink({ record: (e) => customEvents.push(e) });

      recordEvent({ event: "draft_created", sessionId: "s-1", draftId: "d-1" });
      expect(customEvents).toHaveLength(1);
    });
  });
});
