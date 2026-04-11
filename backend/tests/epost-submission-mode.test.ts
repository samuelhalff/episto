import { describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    EPOST_API_BASE_URL: "https://api.epost.ch",
    EPOST_API_KEY: "test-api-key",
    EPOST_TIMEOUT_MS: 5_000,
    EPOST_STANDARD_POSTAGE: "A_POST",
    EPOST_REGISTERED_POSTAGE: "REGISTERED",
    EPOST_SUBMISSION_MODE: "mock",
  }),
}));

import { EpostDispatchAdapter } from "../src/modules/dispatch/adapters/epost.adapter.js";
import type { DispatchPackage } from "@swiss-mail/shared";

const basePackage: DispatchPackage = {
  draftId: "11111111-1111-4111-8111-111111111111",
  snapshotId: "22222222-2222-4222-8222-222222222222",
  locale: "en-CH",
  deliveryType: "registered",
  estimatedPages: 2,
  sender: {
    firstName: "Swiss",
    lastName: "Mail",
    company: "Episto",
    addressLine1: "Bahnhofstrasse 1",
    postalCode: "8001",
    city: "Zurich",
    country: "CH",
    email: "sender@example.com",
    phone: null,
  },
  recipient: {
    firstName: "Jane",
    lastName: "Receiver",
    company: null,
    addressLine1: "Rue du Rhone 1",
    postalCode: "1204",
    city: "Geneva",
    country: "CH",
    email: null,
    phone: null,
  },
  renderedPdf: {
    fileAssetId: "33333333-3333-4333-8333-333333333333",
    filename: "letter.pdf",
    storageKey: "letters/final.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1_024,
  },
  attachments: [],
};

describe("EpostDispatchAdapter mock submission mode", () => {
  it("returns an accepted mock ePost delivery without calling the live submission endpoint", async () => {
    const adapter = new EpostDispatchAdapter({ submissionMode: "mock" });
    const requestJson = vi.spyOn(adapter as never, "requestJson");

    await expect(adapter.submit(basePackage)).resolves.toMatchObject({
      state: "accepted",
      providerReference: expect.stringMatching(/^EPR-T-R-[A-F0-9]{12}$/),
      trackingNumber: expect.any(String),
      failureReason: null,
    });

    expect(requestJson).not.toHaveBeenCalled();
  });

  it("returns a deterministic accepted status lookup for mock references", async () => {
    const adapter = new EpostDispatchAdapter({ submissionMode: "mock" });

    await expect(adapter.checkStatus("EPR-T-R-0D2D6C40F706")).resolves.toMatchObject({
      state: "accepted",
      providerReference: "EPR-T-R-0D2D6C40F706",
      trackingNumber: expect.any(String),
    });
  });
});
