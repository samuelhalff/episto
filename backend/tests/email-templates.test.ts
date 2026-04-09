import { describe, it, expect } from "vitest";
import { renderTemplate } from "../src/workers/email-templates.js";

describe("Email template rendering", () => {
  // ---- dispatch-confirmation ----

  it("renders dispatch-confirmation with order data (en-CH)", () => {
    const result = renderTemplate("dispatch-confirmation", "en-CH", {
      orderRef: "ORD-12345",
      deliveryType: "Standard",
      brandName: "Sendly",
      supportEmail: "contact@houle.ai",
      downloadUrl: "https://houle.ai/api/v1/orders/token-123/pdf",
      statementRetentionDays: 10,
      recipientName: "Jane Doe",
      amountCents: 965,
      appPublicUrl: "https://houle.ai",
      legalEntityName: "West Bay SA",
      legalEntityAddress: "Chemin du Pre-Roset 19, 1294 Genthod",
      legalEntityCountry: "Switzerland",
      legalEntityUidVat: "CHE-107.892.984",
    });

    expect(result.subject).toContain("ORD-12345");
    expect(result.subject).toContain("Order Confirmed");
    expect(result.text).toContain("prepared for dispatch");
    expect(result.text).toContain("Standard");
    expect(result.text).toContain("10 days");
    expect(result.text).toContain("contact@houle.ai");
    expect(result.text).toContain("https://houle.ai/api/v1/orders/token-123/pdf");
    expect(result.text).toContain("CHF 9.65");
    // HTML structure
    expect(result.html).toContain("ORD-12345");
    expect(result.html).toContain("contact@houle.ai");
    expect(result.html).toContain("Order confirmed");
    expect(result.html).toContain("What happens next");
    // Download button (primary CTA)
    expect(result.html).toContain("Download Confirmation");
    expect(result.html).toContain("https://houle.ai/api/v1/orders/token-123/pdf");
    // Legal footer
    expect(result.html).toContain("West Bay SA");
    expect(result.html).toContain("CHE-107.892.984");
    expect(result.html).toContain("Privacy Policy");
    expect(result.html).toContain("Terms of Service");
    expect(result.html).toContain("Imprint");
    // Policy links use app URL
    expect(result.html).toContain("https://houle.ai/en-CH/privacy");
    expect(result.html).toContain("https://houle.ai/en-CH/terms");
    // Must NOT contain payment receipt language
    expect(result.text).not.toContain("receipt");
    expect(result.text).not.toContain("Receipt");
    // Must NOT contain status page link
    expect(result.html).not.toContain("/status/");
  });

  it("renders dispatch-confirmation in German (de-CH)", () => {
    const result = renderTemplate("dispatch-confirmation", "de-CH", {
      orderRef: "ORD-DE",
      deliveryType: "Standard",
      appPublicUrl: "https://example.com",
    });

    expect(result.subject).toContain("Bestellung bestätigt");
    expect(result.text).toContain("Schweizerische Post");
    expect(result.html).toContain("Datenschutz");
  });

  it("renders dispatch-confirmation in French (fr-CH)", () => {
    const result = renderTemplate("dispatch-confirmation", "fr-CH", {
      orderRef: "ORD-FR",
      appPublicUrl: "https://example.com",
    });

    expect(result.subject).toContain("Commande confirmée");
    expect(result.text).toContain("La Poste Suisse");
    expect(result.html).toContain("Confidentialité");
  });

  it("renders dispatch-confirmation in Italian (it-CH)", () => {
    const result = renderTemplate("dispatch-confirmation", "it-CH", {
      orderRef: "ORD-IT",
      appPublicUrl: "https://example.com",
    });

    expect(result.subject).toContain("Ordine confermato");
    expect(result.text).toContain("Posta Svizzera");
  });

  it("falls back to en-CH for unsupported locale", () => {
    const result = renderTemplate("dispatch-confirmation", "ja-JP", {
      orderRef: "ORD-FALLBACK",
      appPublicUrl: "https://example.com",
    });

    expect(result.subject).toContain("Order Confirmed");
    expect(result.text).toContain("prepared for dispatch");
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

  it("renders dispatch-accepted with tracking (en-CH)", () => {
    const result = renderTemplate("dispatch-accepted", "en-CH", {
      orderRef: "ORD-ABC",
      providerReference: "EPR-T-R-0D2D6C40F706",
      trackingNumber: "98.40.541881.00002354",
      downloadUrl: "https://swissmail.ch/api/v1/orders/token-123/pdf",
      statementRetentionDays: 10,
      supportEmail: "support@test.com",
      appPublicUrl: "https://swissmail.ch",
      legalEntityName: "West Bay SA",
      legalEntityAddress: "Test Address",
      legalEntityCountry: "Switzerland",
      legalEntityUidVat: "CHE-107.892.984",
    });

    expect(result.subject).toContain("accepted");
    expect(result.text).toContain("confirmed acceptance");
    expect(result.text).toContain("EPR-T-R-0D2D6C40F706");
    expect(result.text).toContain("98.40.541881.00002354");
    // Swiss Post tracking URL
    expect(result.text).toContain("https://www.post.ch/swisspost-tracking");
    expect(result.text).toContain("98.40.541881.00002354");
    expect(result.html).toContain("https://www.post.ch/swisspost-tracking");
    expect(result.html).toContain("Track on Swiss Post");
    // Download link
    expect(result.text).toContain("Download Confirmation");
    expect(result.text).toContain("https://swissmail.ch/api/v1/orders/token-123/pdf");
    expect(result.html).toContain("Download Confirmation");
    expect(result.html).toContain("https://swissmail.ch/api/v1/orders/token-123/pdf");
    expect(result.text).toContain("10 days");
    // Must NOT contain status page link
    expect(result.html).not.toContain("/status/");
    // Legal footer
    expect(result.html).toContain("West Bay SA");
    expect(result.html).toContain("Privacy Policy");
  });

  it("renders dispatch-accepted without tracking", () => {
    const result = renderTemplate("dispatch-accepted", "en-CH", {
      orderRef: "ORD-NO-TRACK",
    });

    expect(result.text).not.toContain("swiss-post-tracking");
    expect(result.html).not.toContain("Track on Swiss Post");
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
      supportEmail: "support@test.com",
      appPublicUrl: "https://swissmail.ch",
      legalEntityName: "West Bay SA",
      legalEntityAddress: "Test Address",
      legalEntityCountry: "Switzerland",
      legalEntityUidVat: "CHE-107.892.984",
    });

    expect(result.subject).toContain("Refund");
    expect(result.text).toContain("CHF 8.90");
    expect(result.html).toContain("ORD-REF");
    expect(result.html).toContain("Refund confirmed");
    expect(result.html).toContain("West Bay SA");
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

  it("escapes HTML in user-provided values", () => {
    const result = renderTemplate("dispatch-confirmation", "en-CH", {
      orderRef: '<script>alert("xss")</script>',
      recipientName: 'John "Danger" <Doe>',
      appPublicUrl: "https://example.com",
    });

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).toContain("&lt;Doe&gt;");
  });

  it("encodes tracking number in Swiss Post URL", () => {
    const result = renderTemplate("dispatch-accepted", "en-CH", {
      orderRef: "ORD-ENC",
      trackingNumber: "98 40 5418 8100 0023 54",
    });

    expect(result.html).toContain("formattedParcelCodes=98%2040%205418%208100%200023%2054");
  });
});
