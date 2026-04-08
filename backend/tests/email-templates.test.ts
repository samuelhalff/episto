import { describe, it, expect } from "vitest";
import { renderTemplate } from "../src/workers/email.worker.js";

describe("Email template rendering", () => {
  // ---- Basic rendering ----

  it("renders payment-receipt with order data (en-CH)", () => {
    const result = renderTemplate("payment-receipt", "en-CH", {
      orderRef: "ORD-12345",
      amount: "4.90",
      deliveryType: "Standard",
    });

    expect(result.subject).toContain("ORD-12345");
    expect(result.text).toContain("CHF 4.90");
    expect(result.text).toContain("Standard");
    expect(result.html).toContain("<strong>ORD-12345</strong>");
  });

  it("renders dispatch-submitted with order ref (en-CH)", () => {
    const result = renderTemplate("dispatch-submitted", "en-CH", {
      orderRef: "ORD-99999",
    });

    expect(result.subject).toContain("submitted");
    expect(result.text).toContain("ORD-99999");
    expect(result.html).toContain("ORD-99999");
  });

  it("renders dispatch-accepted (en-CH)", () => {
    const result = renderTemplate("dispatch-accepted", "en-CH", {
      orderRef: "ORD-ABC",
      providerReference: "mock-epost-registered-1234",
      trackingNumber: "98.40.541881.00002354",
      statusUrl: "https://swissmail.ch/status/token-123",
    });

    expect(result.subject).toContain("accepted");
    expect(result.text).toContain("confirmed acceptance");
    expect(result.text).toContain("mock-epost-registered-1234");
    expect(result.text).toContain("98.40.541881.00002354");
    expect(result.text).toContain("https://swissmail.ch/status/token-123");
  });

  it("renders resume-link with URL", () => {
    const url = "https://swissmail.ch/resume/abc123";
    const result = renderTemplate("resume-link", "en-CH", {
      resumeUrl: url,
    });

    expect(result.text).toContain(url);
    expect(result.html).toContain(`href="${url}"`);
  });

  it("renders refund-confirmed (en-CH)", () => {
    const result = renderTemplate("refund-confirmed", "en-CH", {
      orderRef: "ORD-REF",
      amount: "8.90",
    });

    expect(result.subject).toContain("Refund");
    expect(result.text).toContain("CHF 8.90");
    expect(result.html).toContain("ORD-REF");
  });

  it("handles missing data gracefully (empty strings)", () => {
    const result = renderTemplate("payment-receipt", "en-CH", {});

    expect(result.subject).toContain("Payment Receipt");
    expect(result.text).toContain("CHF ");
    // Should not throw
  });

  it("throws for unknown template", () => {
    expect(() =>
      renderTemplate("nonexistent-template", "en-CH", {}),
    ).toThrow("Unknown email template: nonexistent-template");
  });

  // ---- Locale-specific rendering ----

  it("renders payment-receipt in German (de-CH)", () => {
    const result = renderTemplate("payment-receipt", "de-CH", {
      orderRef: "ORD-DE",
      amount: "4.90",
      deliveryType: "Standard",
    });

    expect(result.subject).toContain("Zahlungsbestätigung");
    expect(result.text).toContain("Vielen Dank");
    expect(result.text).toContain("Betrag");
  });

  it("renders payment-receipt in French (fr-CH)", () => {
    const result = renderTemplate("payment-receipt", "fr-CH", {
      orderRef: "ORD-FR",
      amount: "4.90",
    });

    expect(result.subject).toContain("Confirmation de paiement");
    expect(result.text).toContain("Merci");
  });

  it("renders payment-receipt in Italian (it-CH)", () => {
    const result = renderTemplate("payment-receipt", "it-CH", {
      orderRef: "ORD-IT",
      amount: "4.90",
    });

    expect(result.subject).toContain("Ricevuta di pagamento");
    expect(result.text).toContain("Grazie");
  });

  it("renders dispatch-submitted in German (de-CH)", () => {
    const result = renderTemplate("dispatch-submitted", "de-CH", {
      orderRef: "ORD-DE",
    });

    expect(result.subject).toContain("eingereicht");
    expect(result.text).toContain("Schweizerische Post");
  });

  it("renders resume-link in French (fr-CH)", () => {
    const url = "https://swissmail.ch/resume/xyz";
    const result = renderTemplate("resume-link", "fr-CH", {
      resumeUrl: url,
    });

    expect(result.subject).toContain("brouillon");
    expect(result.html).toContain(`href="${url}"`);
    expect(result.html).toContain("Continuer votre lettre");
  });

  it("renders refund-confirmed in Italian (it-CH)", () => {
    const result = renderTemplate("refund-confirmed", "it-CH", {
      orderRef: "ORD-IT",
      amount: "4.90",
    });

    expect(result.subject).toContain("Rimborso");
    expect(result.text).toContain("rimborso");
  });

  it("falls back to en-CH for unsupported locale", () => {
    const result = renderTemplate("payment-receipt", "ja-JP", {
      orderRef: "ORD-FALLBACK",
      amount: "4.90",
    });

    expect(result.subject).toContain("Payment Receipt");
    expect(result.text).toContain("Thank you");
  });

  it("covers all 5 expected templates", () => {
    const expectedTemplates = [
      "payment-receipt",
      "dispatch-submitted",
      "dispatch-accepted",
      "resume-link",
      "refund-confirmed",
    ];

    for (const name of expectedTemplates) {
      const result = renderTemplate(name, "en-CH", {
        orderRef: "ORD-TEST",
        amount: "4.90",
        resumeUrl: "https://example.com",
      });
      expect(result.subject).toBeTruthy();
      expect(result.text).toBeTruthy();
      expect(result.html).toBeTruthy();
    }
  });
});
