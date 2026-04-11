import { describe, expect, it } from "vitest";

import {
  DispatchProviderCapabilitiesSchema,
  DispatchPackageSchema,
  DispatchQuoteSchema,
  DispatchSubmitResultSchema,
  DispatchStatusLookupSchema,
  PostalPostageSchema,
} from "../src/dispatch-provider.ts";

describe("dispatch provider contracts", () => {
  it("accepts supported postal postage values", () => {
    expect(PostalPostageSchema.parse("A_POST")).toBe("A_POST");
    expect(PostalPostageSchema.parse("REGISTERED")).toBe("REGISTERED");
  });

  it("parses a canonical dispatch package", () => {
    const result = DispatchPackageSchema.parse({
      draftId: "11111111-1111-4111-8111-111111111111",
      snapshotId: "22222222-2222-4222-8222-222222222222",
      locale: "en-CH",
      deliveryType: "registered",
      estimatedPages: 2,
      sender: {
        firstName: "Samuel",
        lastName: "Halff",
        company: "Ark Fiduciaire SA",
        addressLine1: "26 Boulevard Georges Favon",
        addressLine2: null,
        postalCode: "1204",
        city: "Geneve",
        country: "CH",
        email: "samuel@example.com",
        phone: null,
      },
      recipient: {
        firstName: "Samuel",
        lastName: "Halff",
        company: null,
        department: null,
        addressLine1: "7 rue De-Beaumont",
        addressLine2: null,
        postalCode: "1206",
        city: "Geneve",
        country: "CH",
      },
      renderedPdf: {
        fileAssetId: "33333333-3333-4333-8333-333333333333",
        filename: "letter.pdf",
        storageKey: "renders/draft-1/1.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      },
      attachments: [],
    });

    expect(result.deliveryType).toBe("registered");
    expect(result.renderedPdf.filename).toBe("letter.pdf");
  });

  it("parses provider capabilities with attachment policy", () => {
    const result = DispatchProviderCapabilitiesSchema.parse({
      providerName: "epost-oneapi",
      attachmentPolicy: {
        maxAttachmentsPerDraft: 1,
        allowedMimeTypes: ["application/pdf"],
      },
    });

    expect(result.attachmentPolicy.maxAttachmentsPerDraft).toBe(1);
    expect(result.attachmentPolicy.allowedMimeTypes).toEqual(["application/pdf"]);
  });

  it("parses a dispatch quote with provider and Episto rows", () => {
    const result = DispatchQuoteSchema.parse({
      draftId: "11111111-1111-4111-8111-111111111111",
      snapshotId: "22222222-2222-4222-8222-222222222222",
      deliveryType: "standard",
      providerQuotedCents: 165,
      swissMailMarkupCents: 80,
      totalCents: 245,
      currency: "CHF",
      providerQuoteReference: "preview-123",
      attachmentHandling: "excluded",
      lineItems: [
        { label: "Provider quote", amountCents: 165, source: "provider" },
        { label: "Episto service", amountCents: 80, source: "swiss_mail" },
      ],
    });

    expect(result.totalCents).toBe(245);
    expect(result.lineItems).toHaveLength(2);
  });

  it("parses a status lookup with tracking metadata", () => {
    const result = DispatchStatusLookupSchema.parse({
      state: "accepted",
      providerReference: "delivery-5",
      trackingNumber: "98.40.541881.00002354",
      failureReason: null,
      checkedAt: new Date(),
    });

    expect(result.trackingNumber).toBe("98.40.541881.00002354");
  });

  it("does not expose raw provider payload fields in normalized dispatch schemas", () => {
    expect("providerPayload" in DispatchSubmitResultSchema.shape).toBe(false);
    expect("providerPayload" in DispatchStatusLookupSchema.shape).toBe(false);
  });
});
