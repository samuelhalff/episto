import { describe, expect, it } from "vitest";

describe("confirmation document template", () => {
  it("renders a first-page confirmation record with Swiss Mail branding and dispatch metadata", async () => {
    const { renderConfirmationDocumentHtml } =
      await import("../src/modules/rendering/confirmation-document.js");

    const html = renderConfirmationDocumentHtml({
      orderRef: "SM-4FD8704A",
      locale: "en-CH",
      submittedAt: new Date("2026-04-08T12:00:00.000Z"),
      dispatchState: "accepted",
      deliveryType: "registered",
      providerReference: "mock-epost-registered-1234",
      trackingNumber: "98.40.541881.00002354",
      pageCount: 2,
      attachmentNames: ["contract-scan.pdf"],
      sender: {
        firstName: "Anna",
        lastName: "Meier",
        company: null,
        addressLine1: "Seestrasse 15",
        addressLine2: null,
        postalCode: "8002",
        city: "Zurich",
        country: "CH",
      },
      recipient: {
        firstName: null,
        lastName: null,
        company: "Muller Immobilien AG",
        department: null,
        addressLine1: "Bahnhofstrasse 42",
        addressLine2: null,
        postalCode: "8001",
        city: "Zurich",
        country: "CH",
      },
      subject: "Termination of lease",
      contentSummary:
        "This document confirms that the attached letter was submitted for dispatch.",
      letterHtml: '<section class="letter-pages">Letter body</section>',
    });

    expect(html).toContain("Swiss Mail");
    expect(html).toContain("SM-4FD8704A");
    expect(html).toContain("mock-epost-registered-1234");
    expect(html).toContain("98.40.541881.00002354");
    expect(html).toContain("contract-scan.pdf");
    expect(html).toContain("This document confirms");
    expect(html).toContain("letter-pages");
  });
});
