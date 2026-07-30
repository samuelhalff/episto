import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, it, expect } from "vitest";
import { renderTemplate } from "../src/workers/email-templates.js";

describe("Email template rendering", () => {
  // ---- dispatch-submitted ----

  it("renders dispatch-submitted without an app status link or status-update promise", () => {
    const result = renderTemplate("dispatch-submitted", "en-CH", {
      orderRef: "EP-12345",
      statusUrl: "https://episto.ch/status/token-123",
      deliveryType: "registered",
      senderName: "Alice Sender",
      recipientName: "Bob Recipient",
      downloadUrl: "https://episto.ch/api/v1/orders/token-123/pdf",
      statementRetentionDays: 10,
      supportEmail: "support@test.com",
      appPublicUrl: "https://episto.ch",
      legalEntityName: "West Bay SA",
      legalEntityAddress: "Test Address",
      legalEntityCountry: "Switzerland",
      legalEntityUidVat: "CHE-107.892.984",
    });

    expect(result.text).toContain("EP-12345");
    expect(result.text).toContain("Registered mail");
    expect(result.text).toContain("Alice Sender");
    expect(result.text).toContain("Bob Recipient");
    expect(result.text).toContain("Download letter (PDF)");
    expect(result.text).toContain("https://episto.ch/api/v1/orders/token-123/pdf");
    expect(result.text).not.toContain("https://episto.ch/status/token-123");
    expect(result.text).not.toContain("View order status");
    expect(result.text).not.toContain(
      "You will receive another notification if there are updates.",
    );
    expect(result.html).not.toContain("https://episto.ch/status/token-123");
    expect(result.html).not.toContain("View order status");
    expect(result.html).not.toContain(
      "You will receive another notification if there are updates.",
    );
    expect(result.html).toContain("Registered mail");
    expect(result.html).toContain("Alice Sender");
    expect(result.html).toContain("Bob Recipient");
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

  it("renders dispatch-accepted with Swiss Post tracking only for registered mail (en-CH)", () => {
    const result = renderTemplate("dispatch-accepted", "en-CH", {
      orderRef: "ORD-ABC",
      statusUrl: "https://episto.ch/status/token-123",
      deliveryType: "registered",
      senderName: "Alice Sender",
      recipientName: "Bob Recipient",
      providerReference: "EPR-T-R-0D2D6C40F706",
      trackingNumber: "98.40.541881.00002354",
      downloadUrl: "https://episto.ch/api/v1/orders/token-123/pdf",
      statementRetentionDays: 10,
      supportEmail: "support@test.com",
      appPublicUrl: "https://episto.ch",
      legalEntityName: "West Bay SA",
      legalEntityAddress: "Test Address",
      legalEntityCountry: "Switzerland",
      legalEntityUidVat: "CHE-107.892.984",
    });

    expect(result.subject).toContain("accepted");
    expect(result.text).toContain("confirmed acceptance");
    expect(result.text).toContain("EPR-T-R-0D2D6C40F706");
    expect(result.text).toContain("98.40.541881.00002354");
    expect(result.text).toContain("Registered mail");
    expect(result.text).toContain("Alice Sender");
    expect(result.text).toContain("Bob Recipient");
    expect(result.text).not.toContain("https://episto.ch/status/token-123");
    expect(result.text).not.toContain("View order status");
    // Swiss Post tracking URL
    expect(result.text).toContain("https://www.post.ch/swisspost-tracking");
    expect(result.text).toContain("98.40.541881.00002354");
    expect(result.html).not.toContain("https://episto.ch/status/token-123");
    expect(result.html).not.toContain("View order status");
    expect(result.html).toContain("https://www.post.ch/swisspost-tracking");
    expect(result.html).toContain("Track on Swiss Post");
    // Download link
    expect(result.text).toContain("Download letter (PDF)");
    expect(result.text).toContain("https://episto.ch/api/v1/orders/token-123/pdf");
    expect(result.html).toContain("Download letter (PDF)");
    expect(result.html).toContain("https://episto.ch/api/v1/orders/token-123/pdf");
    expect(result.text).toContain(
      "Your letter PDF is available for download for 10 days.",
    );
    // Legal footer
    expect(result.html).toContain("West Bay SA");
    expect(result.html).toContain("Privacy Policy");
  });

  it("renders dispatch-accepted without app status or tracking CTAs for standard mail", () => {
    const result = renderTemplate("dispatch-accepted", "en-CH", {
      statusUrl: "https://episto.ch/status/token-standard",
      orderRef: "ORD-NO-TRACK",
      deliveryType: "standard",
      trackingNumber: "98.40.541881.00002354",
    });

    expect(result.text).toContain("Standard mail");
    expect(result.text).not.toContain("https://episto.ch/status/token-standard");
    expect(result.text).not.toContain("View order status");
    expect(result.text).not.toContain("swiss-post-tracking");
    expect(result.html).not.toContain("https://episto.ch/status/token-standard");
    expect(result.html).not.toContain("Track on Swiss Post");
  });

  it("renders accented French registered-mail labels in dispatch-accepted emails", () => {
    const result = renderTemplate("dispatch-accepted", "fr-CH", {
      orderRef: "ORD-FR",
      deliveryType: "registered",
      senderName: "Alice Sender",
      trackingNumber: "98.40.541881.00002354",
    });

    expect(result.text).toContain("Mode d'envoi: Courrier recommandé");
    expect(result.text).toContain("Expéditeur: Alice Sender");
    expect(result.html).toContain("Courrier recommandé");
    expect(result.html).toContain("Expéditeur");
  });

  it("renders the exact lowercase Episto logo and wordmark regardless of display-name config", () => {
    const result = renderTemplate("dispatch-submitted", "en-CH", {
      orderRef: "ORD-BRAND",
      brandName: "Episto",
    });

    expect(result.html).toContain('viewBox="0 0 56 56"');
    expect(result.html).toContain('class="episto-email-wordmark"');
    expect(result.html).toContain('class="episto-email-wordmark"');
    expect(result.html).toContain(">episto</td>");
    expect(result.html).not.toContain(">Episto</td>");
    expect(result.html).not.toContain('line-height:32px;">E</span>');
  });

  // ---- resume-link ----

  it("renders resume-link with URL", () => {
    const url = "https://episto.ch/resume/abc123";
    const result = renderTemplate("resume-link", "en-CH", {
      resumeUrl: url,
    });

    expect(result.text).toContain(url);
    expect(result.html).toContain(`href="${url}"`);
  });

  it("renders resume-link in French (fr-CH)", () => {
    const url = "https://episto.ch/resume/xyz";
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
      appPublicUrl: "https://episto.ch",
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

  it("renders the payment-receipt template", () => {
    const result = renderTemplate("payment-receipt", "en-CH", {
      orderRef: "ORD-TEST",
      totalCents: 490,
      downloadUrl: "https://example.com/api/v1/orders/tok/pdf",
      appPublicUrl: "https://example.com",
    });
    expect(result.subject).toBeTruthy();
    expect(result.text).toContain("CHF 4.90");
    expect(result.html).toContain("https://example.com/api/v1/orders/tok/pdf");
  });

  /**
   * The list used to be written out by hand here, which is how
   * `dispatch-failed` stayed broken: it was enqueued by two live code paths
   * and had no renderer, so `renderTemplate` threw at the exact moment a
   * customer's letter had failed to go out — and the hand-written list, not
   * knowing about it, stayed green. The names now come from the enqueue sites
   * themselves, so adding a template key without a renderer fails here.
   */
  it("renders every template the backend actually enqueues", () => {
    const backendSrc = path.resolve(import.meta.dirname, "../src");
    const enqueued = new Set<string>();

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".ts")) continue;
        const source = readFileSync(full, "utf8");
        for (const match of source.matchAll(/\btemplate:\s*"([a-z0-9-]+)"/g)) {
          enqueued.add(match[1]);
        }
      }
    };
    walk(backendSrc);

    // A scan that silently matched nothing would pass for the wrong reason.
    expect(enqueued.size).toBeGreaterThanOrEqual(4);
    expect(enqueued).toContain("dispatch-failed");

    for (const name of enqueued) {
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

  // ---- dispatch-under-review ----

  /**
   * The four things this email must never imply — rejection, refund, delivery,
   * provider acceptance — are the whole reason it exists as a separate
   * template. A well-meaning edit that reassures the reader with "we will
   * refund you" turns an honest status note into a promise we cannot keep.
   */
  it("renders dispatch-under-review without claiming rejection, refund, delivery or acceptance", () => {
    const result = renderTemplate("dispatch-under-review", "en-CH", {
      orderRef: "EP-98765",
      supportEmail: "support@test.com",
      appPublicUrl: "https://episto.ch",
      brandName: "episto",
      legalEntityName: "West Bay SA",
      legalEntityAddress: "Test Address",
      legalEntityCountry: "Switzerland",
      legalEntityUidVat: "CHE-107.892.984",
    });

    expect(result.text).toContain("EP-98765");
    expect(result.text).toContain("No action is needed");
    expect(result.html).toContain("EP-98765");
    expect(result.html).toContain("West Bay SA");
    expect(result.html).toContain("support@test.com");

    for (const forbidden of [
      "refund",
      "refunded",
      "rejected",
      "could not be sent",
      "delivered",
      "accepted",
      "on its way",
    ]) {
      expect(result.text.toLowerCase()).not.toContain(forbidden);
      expect(result.html.toLowerCase()).not.toContain(forbidden);
    }
  });

  it("renders dispatch-under-review in every supported locale", () => {
    for (const locale of ["de-CH", "fr-CH", "it-CH", "en-CH"]) {
      const result = renderTemplate("dispatch-under-review", locale, {
        orderRef: "EP-LOCALE",
        supportEmail: "support@test.com",
      });
      expect(result.subject).toBeTruthy();
      expect(result.text).toContain("EP-LOCALE");
      expect(result.html).toContain("EP-LOCALE");
    }

    // Not the English fallback: an unlocalised template is a silent regression.
    expect(renderTemplate("dispatch-under-review", "de-CH", {}).subject).toContain(
      "prüfen",
    );
    expect(renderTemplate("dispatch-under-review", "fr-CH", {}).subject).toContain(
      "vérifions",
    );
    expect(renderTemplate("dispatch-under-review", "it-CH", {}).subject).toContain(
      "verificando",
    );
  });

  it("encodes tracking number in Swiss Post URL", () => {
    const result = renderTemplate("dispatch-accepted", "en-CH", {
      orderRef: "ORD-ENC",
      deliveryType: "registered",
      trackingNumber: "98 40 5418 8100 0023 54",
    });

    expect(result.html).toContain(
      "formattedParcelCodes=98%2040%205418%208100%200023%2054",
    );
  });
});
