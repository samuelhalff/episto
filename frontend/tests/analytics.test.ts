import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { assertDefined } from "./assert-defined";
import {
  trackEvent,
  setFrontendAnalyticsSink,
  resetFrontendAnalyticsSink,
  type FrontendAnalyticsEvent,
  type FrontendAnalyticsSink,
} from "../src/lib/analytics";

describe("frontend analytics", () => {
  let mockSink: FrontendAnalyticsSink;
  let recordedEvents: FrontendAnalyticsEvent[];

  beforeEach(() => {
    recordedEvents = [];
    mockSink = {
      record: vi.fn((event: FrontendAnalyticsEvent) => {
        recordedEvents.push(event);
      }),
    };
    setFrontendAnalyticsSink(mockSink);
  });

  afterEach(() => {
    resetFrontendAnalyticsSink();
  });

  describe("trackEvent", () => {
    it("sends events to the configured sink", () => {
      trackEvent({
        event: "marketing_page_viewed",
        route: "/pricing",
        locale: "de-CH",
        source: "direct",
      });

      expect(mockSink.record).toHaveBeenCalledOnce();
      expect(recordedEvents[0]).toEqual({
        event: "marketing_page_viewed",
        route: "/pricing",
        locale: "de-CH",
        source: "direct",
      });
    });

    it("tracks draft entry events", () => {
      trackEvent({
        event: "draft_entry_started",
        locale: "fr-CH",
        source: "homepage-cta",
      });

      expect(assertDefined(recordedEvents[0]).event).toBe("draft_entry_started");
    });

    it("tracks file upload events", () => {
      trackEvent({
        event: "file_upload_started",
        draftId: "d-1",
        kind: "attachment",
        countExisting: 2,
      });

      expect(recordedEvents[0]).toEqual({
        event: "file_upload_started",
        draftId: "d-1",
        kind: "attachment",
        countExisting: 2,
      });
    });

    it("tracks review blocked events", () => {
      trackEvent({
        event: "review_blocked",
        draftId: "d-1",
        reason: "missing_sender",
      });

      expect(assertDefined(recordedEvents[0]).event).toBe("review_blocked");
    });

    it("tracks checkout_started with pricing", () => {
      trackEvent({
        event: "checkout_started",
        draftId: "d-1",
        deliveryType: "registered",
        priceCents: 890,
      });

      expect(recordedEvents[0]).toEqual({
        event: "checkout_started",
        draftId: "d-1",
        deliveryType: "registered",
        priceCents: 890,
      });
    });

    it("never throws even when sink throws", () => {
      setFrontendAnalyticsSink({
        record: () => {
          throw new Error("vendor failure");
        },
      });

      expect(() => {
        trackEvent({
          event: "marketing_page_viewed",
          route: "/",
          locale: "en-CH",
          source: "organic",
        });
      }).not.toThrow();
    });

    it("records multiple events in sequence", () => {
      trackEvent({ event: "marketing_page_viewed", route: "/", locale: "de-CH", source: "direct" });
      trackEvent({ event: "draft_entry_started", locale: "de-CH", source: "homepage-cta" });
      trackEvent({ event: "template_selected", templateSlug: "complaint", locale: "de-CH" });

      expect(recordedEvents).toHaveLength(3);
      expect(recordedEvents.map((e) => e.event)).toEqual([
        "marketing_page_viewed",
        "draft_entry_started",
        "template_selected",
      ]);
    });
  });

  describe("sink management", () => {
    it("resetFrontendAnalyticsSink restores the default sink", () => {
      resetFrontendAnalyticsSink();
      // Should not throw
      expect(() => {
        trackEvent({ event: "draft_entry_started", locale: "it-CH", source: "test" });
      }).not.toThrow();
    });
  });
});
