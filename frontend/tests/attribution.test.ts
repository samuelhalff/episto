// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  captureAttribution,
  flushAttribution,
  getAttributionForCheckout,
  parseGaClientId,
  resetAttributionForTests,
} from "../src/lib/attribution";

const AD_LANDING =
  "?gclid=Cj0KCQjw-test&utm_source=google&utm_medium=cpc&utm_campaign=kuendigung";

function grantConsent(): void {
  window.localStorage.setItem("analytics_consent", "granted");
}

function setGaCookie(value: string): void {
  document.cookie = `_ga=${value}`;
}

function clearGaCookie(): void {
  document.cookie = "_ga=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

describe("acquisition attribution capture", () => {
  beforeEach(() => {
    resetAttributionForTests();
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearGaCookie();
  });

  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearGaCookie();
  });

  describe("parseGaClientId", () => {
    it("takes the last two fields of the GA1.1 cookie, not the whole value", () => {
      expect(parseGaClientId("_ga=GA1.1.1234567890.1699999999")).toBe(
        "1234567890.1699999999",
      );
    });

    it("reads the cookie out of a longer cookie string", () => {
      expect(parseGaClientId("foo=bar; _ga=GA1.2.55.66; _ga_ABC=GA1.1.9.9")).toBe(
        "55.66",
      );
    });

    it("returns null when the cookie is absent, which is the pre-consent state", () => {
      expect(parseGaClientId("foo=bar")).toBeNull();
    });

    it("returns null for a malformed value rather than guessing a client id", () => {
      expect(parseGaClientId("_ga=GA1.1")).toBeNull();
      expect(parseGaClientId("_ga=nonsense.value.here.now")).toBeNull();
    });
  });

  it("persists nothing and sends nothing before consent is granted", () => {
    captureAttribution(AD_LANDING);

    expect(window.sessionStorage.length).toBe(0);
    expect(getAttributionForCheckout()).toBeNull();
  });

  it("flushes the in-memory capture once the visitor accepts the banner later", () => {
    // The realistic ad journey: land on the gclid URL, read the banner, accept
    // a few seconds later by which point the URL is long gone.
    captureAttribution(AD_LANDING);
    grantConsent();
    flushAttribution();

    expect(getAttributionForCheckout()).toEqual({
      gclid: "Cj0KCQjw-test",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "kuendigung",
    });
  });

  it("carries the landing-page attribution through later navigations", () => {
    grantConsent();
    captureAttribution(AD_LANDING);
    captureAttribution("");
    captureAttribution("?utm_source=elsewhere");

    // First touch wins: the ad acquired this customer even though the checkout
    // page URL carries nothing.
    expect(getAttributionForCheckout()).toEqual(
      expect.objectContaining({ utmSource: "google", gclid: "Cj0KCQjw-test" }),
    );
  });

  it("attaches the GA4 client id when the cookie exists", () => {
    grantConsent();
    setGaCookie("GA1.1.1234567890.1699999999");
    captureAttribution(AD_LANDING);

    expect(getAttributionForCheckout()).toEqual(
      expect.objectContaining({ gaClientId: "1234567890.1699999999" }),
    );
  });

  it("omits the client id rather than fabricating one when no cookie is set", () => {
    grantConsent();
    captureAttribution(AD_LANDING);

    expect(getAttributionForCheckout()).not.toHaveProperty("gaClientId");
  });

  it("stops sending attribution if consent is withdrawn before checkout", () => {
    grantConsent();
    captureAttribution(AD_LANDING);
    window.localStorage.setItem("analytics_consent", "denied");

    expect(getAttributionForCheckout()).toBeNull();
  });

  it("returns null when the visitor arrived with no campaign parameters at all", () => {
    grantConsent();
    captureAttribution("?foo=bar");

    expect(getAttributionForCheckout()).toBeNull();
  });

  it("truncates an over-long parameter instead of shipping it to the database", () => {
    grantConsent();
    captureAttribution(`?utm_source=${"x".repeat(500)}`);

    const attribution = getAttributionForCheckout();
    expect(attribution?.utmSource).toHaveLength(200);
  });
});
