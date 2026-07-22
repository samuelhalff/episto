// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetFrontendAnalyticsSink, trackEvent } from "../src/lib/analytics";

describe("analytics → Google Analytics forwarding (default sink)", () => {
  const gtag = vi.fn();

  beforeEach(() => {
    resetFrontendAnalyticsSink();
    window.localStorage.clear();
    window.gtag = gtag;
    gtag.mockClear();
  });

  afterEach(() => {
    window.localStorage.clear();
    delete window.gtag;
  });

  it("forwards events to gtag once analytics consent is granted", () => {
    window.localStorage.setItem("analytics_consent", "granted");

    trackEvent({ event: "letter_dispatched", draftId: "d-1" });

    expect(gtag).toHaveBeenCalledWith("event", "letter_dispatched", {
      draftId: "d-1",
    });
  });

  it("does not forward to gtag when consent is denied", () => {
    window.localStorage.setItem("analytics_consent", "denied");

    trackEvent({
      event: "checkout_started",
      draftId: "d-1",
      deliveryType: "standard",
      priceCents: 590,
    });

    expect(gtag).not.toHaveBeenCalled();
  });

  it("does not forward before a consent decision is made", () => {
    trackEvent({ event: "draft_entry_started", locale: "de-CH", source: "test" });

    expect(gtag).not.toHaveBeenCalled();
  });
});
