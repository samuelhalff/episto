import { describe, expect, it } from "vitest";

import { FILE_LIMITS } from "@swiss-mail/shared";

import {
  getEpostDispatchCapabilities,
  getAttachmentHandling,
  getStubDispatchCapabilities,
} from "../src/modules/dispatch/adapters/provider-capabilities.js";

describe("dispatch provider capabilities", () => {
  it("returns the stricter ePost attachment policy", () => {
    expect(getEpostDispatchCapabilities()).toEqual({
      providerName: "epost-oneapi",
      attachmentPolicy: {
        maxAttachmentsPerDraft: 1,
        allowedMimeTypes: ["application/pdf"],
      },
    });
  });

  it("falls back to the shared default attachment policy for non-ePost providers", () => {
    expect(getStubDispatchCapabilities()).toEqual({
      providerName: "stub",
      attachmentPolicy: {
        maxAttachmentsPerDraft: FILE_LIMITS.maxAttachmentsPerDraft,
        allowedMimeTypes: FILE_LIMITS.attachment.allowedMimeTypes,
      },
    });
  });

  it("maps attachment counts to the ePost attachment handling states", () => {
    const { attachmentPolicy } = getEpostDispatchCapabilities();
    expect(getAttachmentHandling(0, attachmentPolicy)).toBe("excluded");
    expect(getAttachmentHandling(1, attachmentPolicy)).toBe("single_hint");
    expect(getAttachmentHandling(2, attachmentPolicy)).toBe("unverified");
  });
});
