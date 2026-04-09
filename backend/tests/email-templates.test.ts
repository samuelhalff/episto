import { describe, it, expect } from "vitest";
import { renderTemplate } from "../src/workers/email.worker.js";

describe("Email template rendering", () => {
  // ---- dispatch-confirmation ----

  it("renders dispatch-confirmation with order data (en-CH)", () => {
    const result = renderTemplate("dispatch-confirmation", "en-CH", {
      orderRef: "ORD-12345",
      deliveryType: "Standard",
      brandName: "Sendly",
      supportEmail: "contact@houle.ai",
      statusUrl: "https://houle.ai/en-CH/status/token-123",
      statementRetentionDays: 10,
      recipientName: "Jane Doe",
    });

    expect(result.subject).toContain("ORD-12345");
    expect(result.subject).toContain("Order Confirmed");
    expect(result.text).toContain("Your order has been received");
    expect(result.text).toContain("Standard");
    expect(result.text).toContain("10 days");
    expect(result.text).toContain("contact@houle.ai");
    expect(result.text).toContain("https://houle.ai/en-CH/status/token-123");
    expect(result.html).toContain("<strong>ORD-12345</strong>");
    expect(result.html).toContain("contact@houle.ai");
    expect(result.html).toContain("View your dispatch statement");
    // Must NOT contain payment receipt language
    expect(result.text).not.toContain("receipt");
    expect(result.text).not.toContain("Receipt");
    expect(result.text).not.toContain("Amount");
    expect(result.text).not.toContain("CHF");
  });

  it("renders dispatch-confirmation in German (de-CH)", () => {
    const result = renderTemplate("dispatch-confirmation", "de-CH", {
      orderRef: "ORD-DE",
      deliveryType: "Standard",
    });

    expect(result.subject).toContain("Bestellung bestätigt");
    expect(result.text).toContain("Bestellung wurde entgegengenommen");
  });

  it("renders dispatch-confirmation in French (fr-CH)", () => {
    const result = renderTemplate("dispatch-confirmation", "fr-CH", {
      orderRef: "ORD-FR",
    });

    expect(result.subject).toContain("Commande confirmée");
    expect(result.text).toContain("commande a été reçue");
  });

  it("renders dispatch-confirmation in Italian (it-CH)", () => {
    const result = renderTemplate("dispatch-confirmation", "it-CH", {
      orderRef: "ORD-IT",
    });

    expect(result.subject).toContain("Ordine confermato");
    expect(result.text).toContain("ordine è stato ricevuto");
  });

  it("falls back to en-CH for unsupported locale", () => {
    const result = renderTemplate("dispatch-confirmation", "ja-JP", {
      orderRef: "ORD-FALLBACK",
    });

    expect(result.subject).toContain("Order Confirmed");
    expect(result.text).toContain("Your order has been received");
  });

  // ---- dispatch-submitted ----

  it("renders dispatch-submitted with order ref (en-CH)", () => {
    const result = renderTemplate("dispatch-submitted", "en-CH", {
      orderRef: "ORD-99999",
    });

    expect(result.subject).toContain("submitted");
    expect(result.text).toContain("ORD-99999");
    expect(result.html).toContain("ORD-99999");
  });

  it("renders dispatch-submitted in German (de-CH)", () => {
    const result = renderTemplate("dispatch-submitted", "de-CH", {
      orderRef: "ORD-DE",
    });

    expect(result.subject).toContain("eingereicht");
    expect(result.text).toContain("Schweizerische Post");
  });

  // ---- dispatch-accepted ----

  it("renders dispatch-accepted (en-CH)", () => {
    const result = renderTemplate("dispatch-accepted", "en-CH", {
      orderRef: "ORD-ABC",
      providerReference: "EPR-T-R-0D2D6C40F706",
      trackingNumber: "98.40.541881.00002354",
      statusUrl: "https://swissmail.ch/status/token-123",
    });

    expect(result.subject).toContain("accepted");
    expect(result.text).toContain("confirmed acceptance");
    expect(result.text).toContain("EPR-T-R-0D2D6C40F706");
    expect(result.text).toContain("98.40.541881.00002354");
    expect(result.text).toContain("https://swissmail.ch/status/token-123");
  });

  // ---- resume-link ----

  it("renders resume-link with URL", () => {
    const url = "https://swissmail.ch/resume/abc123";
    const result = renderTemplate("resume-link", "en-CH", {
      resumeUrl: url,
    });

    expect(result.text).toContain(url);
    expect(result.html).toContain(`href="${url}"`);
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

  // ---- refund-confirmed ----

  it("renders refund-confirmed (en-CH)", () => {
    const result = renderTemplate("refund-confirmed", "en-CH", {
      orderRef: "ORD-REF",
      amount: "8.90",
    });

    expect(result.subject).toContain("Refund");
    expect(result.text).toContain("CHF 8.90");
    expect(result.html).toContain("ORD-REF");
  });

  it("renders refund-confirmed in Italian (it-CH)", () => {
    const result = renderTemplate("refund-confirmed", "it-CH", {
      orderRef: "ORD-IT",
      amount: "4.90",
    });

    expect(result.subject).toContain("Rimborso");
    expect(result.text).toContain("rimborso");
  });

  // ---- General ----

  it("handles missing data gracefully (empty strings)", () => {
    const result = renderTemplate("dispatch-confirmation", "en-CH", {});

    expect(result.subject).toContain("Order Confirmed");
    // Should not throw
  });

  it("throws for unknown template", () => {
    expect(() =>
      renderTemplate("nonexistent-template", "en-CH", {}),
    ).toThrow("Unknown email template: nonexistent-template");
  });

  it("throws for removed payment-receipt template", () => {
    expect(() =>
      renderTemplate("payment-receipt", "en-CH", {}),
    ).toThrow("Unknown email template: payment-receipt");
  });

  it("covers all 5 expected templates", () => {
    const expectedTemplates = [
      "dispatch-confirmation",
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
