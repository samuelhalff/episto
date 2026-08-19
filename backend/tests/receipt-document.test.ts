import { describe, expect, it } from "vitest";
import { renderReceiptDocumentHtml } from "../src/modules/rendering/receipt-document.js";

describe("receipt document pricing", () => {
  it("shows the pre-discount subtotal, promo code, discount, net subtotal, VAT, and total", () => {
    const html = renderReceiptDocumentHtml({
      locale: "en-CH",
      receiptNumber: "EP-R-000001",
      issuedAt: new Date("2026-07-30T00:00:00.000Z"),
      orderRef: "ORD-PROMO",
      currency: "CHF",
      netCents: 462,
      vatCents: 38,
      totalCents: 500,
      discountCents: 125,
      promoCode: "SAVE20",
      deliveryType: "registered",
      lineItems: [{ label: "Registered post", amountCents: 625 }],
      legalEntity: {
        name: "Episto AG",
        addressLine1: "Main Street 1",
        addressLine2: "8000 Zurich",
        country: "Switzerland",
        uidVat: "CHE-000.000.000",
      },
      supportEmail: "support@example.com",
    });

    expect(html).toContain("Subtotal before discount");
    expect(html).toContain(">6.25</span>");
    expect(html).toContain("Discount (SAVE20)");
    expect(html).toContain(">−1.25</span>");
    expect(html).toContain("Subtotal (net)");
    expect(html).toContain(">5.00</span>");
  });
});
