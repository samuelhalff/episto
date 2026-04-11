import { describe, it, expect } from "vitest";
import { renderTemplate } from "../src/workers/email-templates.js";

describe("Email template rendering", () => {
  // ---- dispatch-submitted ----

  it("renders dispatch-submitted with a status link and shared footer data", () => {
    const result = renderTemplate("dispatch-submitted", "en-CH", {
      orderRef: "EP-12345",
      statusUrl: "https://swissmail.ch/status/token-123",
      downloadUrl: "https://swissmail.ch/api/v1/orders/token-123/pdf",
      supportEmail: "support@test.com",
      appPublicUrl: "https://swissmail.ch",
      legalEntityName: "West Bay SA",
      legalEntityAddress: "Test Address",
      legalEntityCountry: "Switzerland",
      legalEntityUidVat: "CHE-107.892.984",
    });

    expect(result.text).toContain("EP-12345");
    expect(result.text).toContain("https://swissmail.ch/status/token-123");
    expect(result.html).toContain("https://swissmail.ch/status/token-123");
    expect(result.html).toContain("West Bay SA");
  });

  it("throws for removed dispatch-confirmation template", () => {
    expect(() => renderTemplate("dispatch-confirmation", "en-CH", {})).toThrow(
      "Unknown email template: dispatch-confirmation",
    );
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

  it("throws for unknown template", () => {
    expect(() => renderTemplate("nonexistent-template", "en-CH", {})).toThrow(
      "Unknown email template: nonexistent-template",
    );
  });

  it("throws for removed payment-receipt template", () => {
    expect(() => renderTemplate("payment-receipt", "en-CH", {})).toThrow(
      "Unknown email template: payment-receipt",
    );
  });

  it("covers all 4 expected templates", () => {
    const expectedTemplates = [
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
    const result = renderTemplate("dispatch-submitted", "en-CH", {
      orderRef: '<script>alert("xss")</script>',
      appPublicUrl: "https://example.com",
    });

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
  });

  it("encodes tracking number in Swiss Post URL", () => {
    const result = renderTemplate("dispatch-accepted", "en-CH", {
      orderRef: "ORD-ENC",
      trackingNumber: "98 40 5418 8100 0023 54",
    });

    expect(result.html).toContain(
      "formattedParcelCodes=98%2040%205418%208100%200023%2054",
    );
  });
});
