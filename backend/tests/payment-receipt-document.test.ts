import { describe, expect, it } from "vitest";

describe("payment receipt document template", () => {
  it("renders a branded receipt document with issuer details, line items, and statement retention guidance", async () => {
    const { renderPaymentReceiptDocumentHtml } = await import(
      "../src/modules/rendering/payment-receipt-document.js"
    );

    const html = renderPaymentReceiptDocumentHtml({
      brandName: "Sendly",
      locale: "en-CH",
      orderRef: "SM-4FD8704A",
      issuedAt: new Date("2026-04-09T12:47:20.000Z"),
      customerEmail: "samuelhalff@gmail.com",
      senderName: "Samuel Halff",
      recipientName: "Muller Immobilien AG",
      deliveryType: "registered",
      amountCents: 965,
      currency: "CHF",
      lineItems: [
        { label: "ePost provider quote", amountCents: 625 },
        { label: "Sendly service", amountCents: 340 },
      ],
      supportEmail: "contact@houle.ai",
      statementRetentionDays: 10,
      statusUrl: "https://houle.ai/en-CH/status/token-123",
      legalEntity: {
        name: "West Bay SA",
        addressLines: ["Chemin du Pré-Roset 19", "1294 Genthod", "Switzerland"],
        uidVat: "CHE-107.892.984",
      },
      stripeReferences: {
        paymentIntentId: "pi_test_123",
        chargeId: "ch_test_456",
        receiptUrl: "https://pay.stripe.com/receipts/test",
      },
    });

    expect(html).toContain("Sendly");
    expect(html).toContain("West Bay SA");
    expect(html).toContain("Chemin du Pré-Roset 19");
    expect(html).toContain("CHE-107.892.984");
    expect(html).toContain("SM-4FD8704A");
    expect(html).toContain("Samuel Halff");
    expect(html).toContain("Muller Immobilien AG");
    expect(html).toContain("ePost provider quote");
    expect(html).toContain("Sendly service");
    expect(html).toContain("CHF 9.65");
    expect(html).toContain("10 days");
    expect(html).toContain("contact@houle.ai");
    expect(html).toContain("https://houle.ai/en-CH/status/token-123");
    expect(html).toContain("Receipt number");
    expect(html).not.toContain("pi_test_123");
    expect(html).not.toContain("ch_test_456");
  });

  it("adds pagination-safe layout rules so sections and table rows do not split awkwardly across pages", async () => {
    const { renderPaymentReceiptDocumentHtml } = await import(
      "../src/modules/rendering/payment-receipt-document.js"
    );

    const html = renderPaymentReceiptDocumentHtml({
      brandName: "Sendly",
      locale: "en-CH",
      orderRef: "SM-4FD8704A",
      issuedAt: new Date("2026-04-09T12:47:20.000Z"),
      customerEmail: "samuelhalff@gmail.com",
      senderName: "Samuel Halff",
      recipientName: "Muller Immobilien AG",
      deliveryType: "registered",
      amountCents: 965,
      currency: "CHF",
      lineItems: Array.from({ length: 12 }, (_, index) => ({
        label: `Line item ${index + 1}`,
        amountCents: 80 + index,
      })),
      supportEmail: "contact@houle.ai",
      statementRetentionDays: 10,
      statusUrl: "https://houle.ai/en-CH/status/token-123",
      legalEntity: {
        name: "West Bay SA",
        addressLines: ["Chemin du Pré-Roset 19", "1294 Genthod", "Switzerland"],
        uidVat: "CHE-107.892.984",
      },
      stripeReferences: {
        paymentIntentId: "pi_test_123",
        chargeId: "ch_test_456",
        receiptUrl: "https://pay.stripe.com/receipts/test",
      },
    });

    expect(html).not.toContain("min-height: 100vh");
    expect(html).toContain("page-break-inside: avoid");
    expect(html).toContain("break-inside: avoid");
    expect(html).toContain("tr {");
  });

  it("distributes long receipt content across explicit A4 sheets instead of one flowing page", async () => {
    const { renderPaymentReceiptDocumentHtml } = await import(
      "../src/modules/rendering/payment-receipt-document.js"
    );

    const html = renderPaymentReceiptDocumentHtml({
      brandName: "Sendly",
      locale: "en-CH",
      orderRef: "SM-4FD8704A",
      issuedAt: new Date("2026-04-09T12:47:20.000Z"),
      customerEmail: "samuelhalff@gmail.com",
      senderName: "Samuel Halff",
      recipientName: "Muller Immobilien AG",
      deliveryType: "registered",
      amountCents: 9650,
      currency: "CHF",
      lineItems: Array.from({ length: 22 }, (_, index) => ({
        label: `Line item ${index + 1} with explanatory content for receipt pagination validation`,
        amountCents: 400 + index,
      })),
      supportEmail: "contact@houle.ai",
      statementRetentionDays: 10,
      statusUrl: "https://houle.ai/en-CH/status/token-123",
      legalEntity: {
        name: "West Bay SA",
        addressLines: ["Chemin du Pré-Roset 19", "1294 Genthod", "Switzerland"],
        uidVat: "CHE-107.892.984",
      },
      stripeReferences: {
        paymentIntentId: "pi_test_123",
        chargeId: "ch_test_456",
        receiptUrl: "https://pay.stripe.com/receipts/test",
      },
    });

    const sheetCount = (html.match(/class="sheet"/g) ?? []).length;
    expect(sheetCount).toBeGreaterThan(1);
    expect(html).toContain("Receipt details (continued)");
    expect(html).toContain("page-break-after: always");
    expect(html).toContain("Open order status");
    expect(html).not.toContain(">https://houle.ai/en-CH/status/token-123<");
  });

  it("keeps short receipts on a single customer-facing sheet without Stripe processor references", async () => {
    const { renderPaymentReceiptDocumentHtml } = await import(
      "../src/modules/rendering/payment-receipt-document.js"
    );

    const html = renderPaymentReceiptDocumentHtml({
      brandName: "Sendly",
      locale: "en-CH",
      orderRef: "SM-C5DCBAB5",
      issuedAt: new Date("2026-04-09T12:47:20.000Z"),
      customerEmail: "samuelhalff@gmail.com",
      senderName: "Samuel Halff",
      recipientName: "Swisscom AG",
      deliveryType: "registered",
      amountCents: 965,
      currency: "CHF",
      lineItems: [
        { label: "ePost provider quote", amountCents: 625 },
        { label: "Sendly service", amountCents: 340 },
      ],
      supportEmail: "contact@houle.ai",
      statementRetentionDays: 10,
      statusUrl: "https://ark-fid.ddns.net/en-CH/status/token-123",
      legalEntity: {
        name: "West Bay SA",
        addressLines: ["Chemin du Pré-Roset 19", "1294 Genthod", "Switzerland"],
        uidVat: "CHE-107.892.984",
      },
      stripeReferences: {
        paymentIntentId: "pi_test_123",
        chargeId: "ch_test_456",
      },
    });

    const sheetCount = (html.match(/class="sheet"/g) ?? []).length;
    expect(sheetCount).toBe(1);
    expect((html.match(/Document access/g) ?? []).length).toBe(1);
    expect(html).not.toContain("Processor references");
    expect(html).not.toContain("Receipt references");
    expect(html).not.toContain("pi_test_123");
    expect(html).not.toContain("ch_test_456");
    expect(html).not.toContain("secondary reconciliation references");
  });
});
