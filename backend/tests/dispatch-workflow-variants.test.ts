import { describe, it, expect } from "vitest";
import {
  canTransitionDispatch,
  assertTransitionDispatch,
  DispatchState,
} from "@swiss-mail/shared";
import {
  submitMockEpostDelivery,
  lookupMockEpostStatus,
  isMockEpostProviderReference,
} from "../src/modules/dispatch/adapters/mock-epost-submission.js";
import type { DispatchPackage } from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// Dispatch state machine — variant-based tests
// ---------------------------------------------------------------------------

describe("Dispatch state machine — happy path", () => {
  it("allows queued → submitted", () => {
    expect(canTransitionDispatch("queued", "submitted")).toBe(true);
  });

  it("allows submitted → accepted", () => {
    expect(canTransitionDispatch("submitted", "accepted")).toBe(true);
  });
});

describe("Dispatch state machine — failure paths", () => {
  it("allows submitted → rejected", () => {
    expect(canTransitionDispatch("submitted", "rejected")).toBe(true);
  });

  it("allows submitted → unknown (ambiguous provider response)", () => {
    expect(canTransitionDispatch("submitted", "unknown")).toBe(true);
  });

  it("allows unknown → reconciled (manual admin reconciliation)", () => {
    expect(canTransitionDispatch("unknown", "reconciled")).toBe(true);
  });

  it("allows unknown → accepted (late provider confirmation)", () => {
    expect(canTransitionDispatch("unknown", "accepted")).toBe(true);
  });

  it("allows unknown → rejected (late provider rejection)", () => {
    expect(canTransitionDispatch("unknown", "rejected")).toBe(true);
  });
});

describe("Dispatch state machine — terminal states", () => {
  it("accepted is terminal", () => {
    for (const state of Object.values(DispatchState)) {
      expect(canTransitionDispatch("accepted", state)).toBe(false);
    }
  });

  it("rejected is terminal", () => {
    for (const state of Object.values(DispatchState)) {
      expect(canTransitionDispatch("rejected", state)).toBe(false);
    }
  });

  it("reconciled is terminal", () => {
    for (const state of Object.values(DispatchState)) {
      expect(canTransitionDispatch("reconciled", state)).toBe(false);
    }
  });
});

describe("Dispatch state machine — invalid transitions", () => {
  it("cannot go from queued directly to accepted", () => {
    expect(canTransitionDispatch("queued", "accepted")).toBe(false);
  });

  it("cannot go backwards from submitted to queued", () => {
    expect(canTransitionDispatch("submitted", "queued")).toBe(false);
  });

  it("assertTransitionDispatch throws on invalid transition", () => {
    expect(() => assertTransitionDispatch("accepted", "submitted")).toThrow(
      "Invalid dispatch transition",
    );
  });
});

// ---------------------------------------------------------------------------
// Mock ePost submission safety
// ---------------------------------------------------------------------------

describe("Mock ePost submission", () => {
  const mockPackage: DispatchPackage = {
    draftId: "draft-001",
    snapshotId: "snap-001",
    deliveryType: "standard",
    sender: {
      firstName: "Test",
      lastName: "Sender",
      company: null,
      addressLine1: "Bahnhofstrasse 1",
      postalCode: "8001",
      city: "Zurich",
      country: "CH",
      email: null,
      phone: null,
    },
    recipient: {
      firstName: "Test",
      lastName: "Recipient",
      company: null,
      addressLine1: "Rue du Rhone 1",
      postalCode: "1204",
      city: "Geneva",
      country: "CH",
      email: null,
      phone: null,
    },
    renderedPdf: {
      storageKey: "test/test.pdf",
      filename: "test.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
    },
    attachments: [],
    estimatedPages: 1,
  };

  it("returns accepted state for mock submission", () => {
    const result = submitMockEpostDelivery(mockPackage);
    expect(result.state).toBe("accepted");
  });

  it("generates a mock provider reference", () => {
    const result = submitMockEpostDelivery(mockPackage);
    expect(result.providerReference).toBeTruthy();
    expect(isMockEpostProviderReference(result.providerReference!)).toBe(true);
  });

  it("produces deterministic references for the same package", () => {
    const r1 = submitMockEpostDelivery(mockPackage);
    const r2 = submitMockEpostDelivery(mockPackage);
    expect(r1.providerReference).toBe(r2.providerReference);
  });

  it("mock status lookup returns accepted", () => {
    const result = submitMockEpostDelivery(mockPackage);
    const status = lookupMockEpostStatus(result.providerReference!);
    expect(status.state).toBe("accepted");
  });

  it("does not generate tracking number for standard mail", () => {
    const result = submitMockEpostDelivery(mockPackage);
    expect(result.trackingNumber).toBeNull();
  });

  it("generates tracking number for registered mail", () => {
    const registered = { ...mockPackage, deliveryType: "registered" as const };
    const result = submitMockEpostDelivery(registered);
    expect(result.trackingNumber).toBeTruthy();
  });
});
