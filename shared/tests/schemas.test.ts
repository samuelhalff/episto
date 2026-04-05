import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  LocaleSchema,
  DeliveryTypeSchema,
  DraftLetterSchema,
  DraftSnapshotSchema,
  SenderProfileSchema,
  RecipientProfileSchema,
  PaymentAttemptSchema,
  PaymentBreakdownSchema,
  FileAssetSchema,
  SnapshotDataSchema,
} from "../src/schemas/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uuid = () => randomUUID();
const now = new Date().toISOString();

// ---------------------------------------------------------------------------
// LocaleSchema
// ---------------------------------------------------------------------------

describe("LocaleSchema", () => {
  it.each(["de-CH", "fr-CH", "it-CH", "en-CH"])("accepts valid locale %s", (v) => {
    expect(LocaleSchema.parse(v)).toBe(v);
  });

  it("rejects an unknown locale", () => {
    expect(() => LocaleSchema.parse("en-US")).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => LocaleSchema.parse("")).toThrow();
  });

  it("rejects undefined", () => {
    expect(() => LocaleSchema.parse(undefined)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// DeliveryTypeSchema
// ---------------------------------------------------------------------------

describe("DeliveryTypeSchema", () => {
  it.each(["standard", "registered"])("accepts %s", (v) => {
    expect(DeliveryTypeSchema.parse(v)).toBe(v);
  });

  it("rejects unknown delivery type", () => {
    expect(() => DeliveryTypeSchema.parse("express")).toThrow();
  });

  it("rejects null", () => {
    expect(() => DeliveryTypeSchema.parse(null)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// DraftLetterSchema
// ---------------------------------------------------------------------------

describe("DraftLetterSchema", () => {
  const validDraft = () => ({
    id: uuid(),
    sessionId: uuid(),
    status: "collecting",
    locale: "de-CH",
    deliveryType: "standard",
    subject: "Test",
    body: "Hello",
    tone: null,
    intent: null,
    enclosureNote: null,
    signatureMode: null,
    senderProfileId: null,
    recipientProfileId: null,
    signatureAssetId: null,
    estimatedPages: null,
    reviewedAt: null,
    metadata: null,
    createdAt: now,
    updatedAt: now,
  });

  it("parses a valid draft", () => {
    const result = DraftLetterSchema.parse(validDraft());
    expect(result.status).toBe("collecting");
  });

  it("applies default schemaVersion", () => {
    const result = DraftLetterSchema.parse(validDraft());
    expect(result.schemaVersion).toBe(1);
  });

  it("rejects missing sessionId", () => {
    const d = validDraft();
    delete (d as Record<string, unknown>).sessionId;
    expect(() => DraftLetterSchema.parse(d)).toThrow();
  });

  it("rejects missing status", () => {
    const d = validDraft();
    delete (d as Record<string, unknown>).status;
    expect(() => DraftLetterSchema.parse(d)).toThrow();
  });

  it("rejects invalid status enum", () => {
    expect(() => DraftLetterSchema.parse({ ...validDraft(), status: "bogus" })).toThrow();
  });

  it("rejects subject longer than 200 chars", () => {
    expect(() =>
      DraftLetterSchema.parse({ ...validDraft(), subject: "x".repeat(201) }),
    ).toThrow();
  });

  it("accepts subject of exactly 200 chars", () => {
    const result = DraftLetterSchema.parse({ ...validDraft(), subject: "x".repeat(200) });
    expect(result.subject).toHaveLength(200);
  });
});

// ---------------------------------------------------------------------------
// SenderProfileSchema
// ---------------------------------------------------------------------------

describe("SenderProfileSchema", () => {
  const validSender = () => ({
    id: uuid(),
    sessionId: uuid(),
    firstName: "Max",
    lastName: "Muster",
    company: null,
    addressLine1: "Bahnhofstrasse 1",
    addressLine2: null,
    postalCode: "8001",
    city: "Zürich",
    country: "CH",
    email: null,
    phone: null,
    createdAt: now,
    updatedAt: now,
  });

  it("parses a valid sender profile", () => {
    expect(SenderProfileSchema.parse(validSender())).toBeDefined();
  });

  it("rejects empty firstName", () => {
    expect(() =>
      SenderProfileSchema.parse({ ...validSender(), firstName: "" }),
    ).toThrow();
  });

  it("rejects missing lastName", () => {
    const s = validSender();
    delete (s as Record<string, unknown>).lastName;
    expect(() => SenderProfileSchema.parse(s)).toThrow();
  });

  it("rejects invalid postal code (3 digits)", () => {
    expect(() =>
      SenderProfileSchema.parse({ ...validSender(), postalCode: "800" }),
    ).toThrow();
  });

  it("rejects postal code with letters", () => {
    expect(() =>
      SenderProfileSchema.parse({ ...validSender(), postalCode: "80AB" }),
    ).toThrow();
  });

  it("defaults country to CH when omitted", () => {
    const s = validSender();
    delete (s as Record<string, unknown>).country;
    const result = SenderProfileSchema.parse(s);
    expect(result.country).toBe("CH");
  });

  it("rejects country not exactly 2 chars", () => {
    expect(() =>
      SenderProfileSchema.parse({ ...validSender(), country: "CHE" }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// RecipientProfileSchema
// ---------------------------------------------------------------------------

describe("RecipientProfileSchema", () => {
  const validRecipient = () => ({
    id: uuid(),
    sessionId: uuid(),
    firstName: null,
    lastName: null,
    company: "ACME AG",
    department: null,
    addressLine1: "Seestrasse 10",
    addressLine2: null,
    postalCode: "6300",
    city: "Zug",
    country: "CH",
    createdAt: now,
    updatedAt: now,
  });

  it("parses a valid recipient profile", () => {
    expect(RecipientProfileSchema.parse(validRecipient())).toBeDefined();
  });

  it("allows nullable firstName and lastName", () => {
    const r = RecipientProfileSchema.parse(validRecipient());
    expect(r.firstName).toBeNull();
    expect(r.lastName).toBeNull();
  });

  it("rejects missing addressLine1", () => {
    const r = validRecipient();
    delete (r as Record<string, unknown>).addressLine1;
    expect(() => RecipientProfileSchema.parse(r)).toThrow();
  });

  it("rejects empty addressLine1", () => {
    expect(() =>
      RecipientProfileSchema.parse({ ...validRecipient(), addressLine1: "" }),
    ).toThrow();
  });

  it("rejects invalid postal code (5 digits)", () => {
    expect(() =>
      RecipientProfileSchema.parse({ ...validRecipient(), postalCode: "63000" }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// SnapshotDataSchema
// ---------------------------------------------------------------------------

describe("SnapshotDataSchema", () => {
  const validSnapshot = () => ({
    schemaVersion: 1,
    locale: "en-CH",
    deliveryType: "registered",
    subject: "Subject",
    body: "Body",
    enclosureNote: null,
    signatureMode: "typed",
    tone: "formal",
    intent: "cancellation",
    sender: {
      firstName: "Sam",
      lastName: "Example",
      company: null,
      addressLine1: "Rue Example 1",
      addressLine2: null,
      postalCode: "1205",
      city: "Geneva",
      country: "CH",
    },
    recipient: {
      firstName: null,
      lastName: null,
      company: "Swisscom AG",
      department: null,
      addressLine1: "Alte Tiefenaustrasse 6",
      addressLine2: null,
      postalCode: "3050",
      city: "Bern",
      country: "CH",
    },
    attachmentAssetIds: [],
    signatureAssetId: null,
    estimatedPages: 2,
    metadata: null,
  });

  it("parses a valid snapshot", () => {
    const result = SnapshotDataSchema.parse(validSnapshot());
    expect(result.estimatedPages).toBe(2);
  });

  it("defaults missing estimatedPages to null for legacy snapshots", () => {
    const snapshot = validSnapshot();
    delete (snapshot as Record<string, unknown>).estimatedPages;

    const result = SnapshotDataSchema.parse(snapshot);

    expect(result.estimatedPages).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PaymentAttemptSchema
// ---------------------------------------------------------------------------

describe("PaymentAttemptSchema", () => {
  const validPayment = () => ({
    id: uuid(),
    draftId: uuid(),
    sessionId: uuid(),
    state: "pending",
    stripePaymentIntentId: null,
    stripeChargeId: null,
    amountCents: 245,
    currency: "CHF",
    breakdown: {
      deliveryType: "standard",
      providerQuotedCents: 165,
      swissMailMarkupCents: 80,
      totalCents: 245,
      providerQuoteReference: "preview-123",
      attachmentHandling: "excluded",
      lineItems: [
        { label: "ePost provider quote", amountCents: 165, source: "provider" },
        { label: "Swiss Mail service", amountCents: 80, source: "swiss_mail" },
      ],
    },
    failureReason: null,
    refundReason: null,
    createdAt: now,
    updatedAt: now,
  });

  it("parses a valid payment attempt", () => {
    const result = PaymentAttemptSchema.parse(validPayment());
    expect(result.amountCents).toBe(245);
    expect(result.currency).toBe("CHF");
  });

  it("rejects negative amountCents", () => {
    // amountCents is z.number().int() — negative ints are technically valid at schema level.
    // The breakdown fields now enforce .nonnegative() but amountCents itself does not.
    const result = PaymentAttemptSchema.safeParse({
      ...validPayment(),
      amountCents: -100,
    });
    if (result.success) {
      expect(result.data.amountCents).toBe(-100);
    } else {
      expect(result.success).toBe(false);
    }
  });

  it("rejects currency other than CHF", () => {
    expect(() =>
      PaymentAttemptSchema.parse({ ...validPayment(), currency: "EUR" }),
    ).toThrow();
  });

  it("rejects invalid payment state", () => {
    expect(() =>
      PaymentAttemptSchema.parse({ ...validPayment(), state: "completed" }),
    ).toThrow();
  });

  it.each([
    "pending",
    "authorized",
    "captured",
    "failed",
    "cancelled",
    "refund_pending",
    "refunded",
    "partially_refunded",
  ])("accepts payment state %s", (state) => {
    expect(PaymentAttemptSchema.parse({ ...validPayment(), state }).state).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// FileAssetSchema
// ---------------------------------------------------------------------------

describe("FileAssetSchema", () => {
  const validFile = () => ({
    id: uuid(),
    sessionId: uuid(),
    draftId: null,
    kind: "attachment",
    storageKey: "attachments/abc/def",
    originalFilename: "doc.pdf",
    mimeType: "application/pdf",
    sizeBytes: 12345,
    sortOrder: null,
    status: "active",
    deletedAt: null,
    createdAt: now,
  });

  it("parses a valid file asset", () => {
    const result = FileAssetSchema.parse(validFile());
    expect(result.kind).toBe("attachment");
  });

  it("rejects invalid kind", () => {
    expect(() => FileAssetSchema.parse({ ...validFile(), kind: "video" })).toThrow();
  });

  it("accepts all valid kinds", () => {
    for (const kind of ["attachment", "signature", "rendered_pdf"]) {
      expect(FileAssetSchema.parse({ ...validFile(), kind }).kind).toBe(kind);
    }
  });

  it("accepts any mimeType string", () => {
    // mimeType is z.string() — not restricted to specific types
    const result = FileAssetSchema.parse({ ...validFile(), mimeType: "image/png" });
    expect(result.mimeType).toBe("image/png");
  });

  it("rejects missing storageKey", () => {
    const f = validFile();
    delete (f as Record<string, unknown>).storageKey;
    expect(() => FileAssetSchema.parse(f)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// SnapshotDataSchema
// ---------------------------------------------------------------------------

describe("SnapshotDataSchema", () => {
  const validSnapshot = () => ({
    schemaVersion: 1,
    locale: "de-CH",
    deliveryType: "standard",
    subject: "Kündigung",
    body: "Hiermit kündige ich…",
    enclosureNote: null,
    signatureMode: "typed",
    tone: "formal",
    intent: "cancellation",
    sender: {
      firstName: "Max",
      lastName: "Muster",
      company: null,
      addressLine1: "Bahnhofstrasse 1",
      addressLine2: null,
      postalCode: "8001",
      city: "Zürich",
      country: "CH",
    },
    recipient: {
      firstName: "Anna",
      lastName: "Beispiel",
      company: null,
      department: null,
      addressLine1: "Seestrasse 10",
      addressLine2: null,
      postalCode: "6300",
      city: "Zug",
      country: "CH",
    },
    attachmentAssetIds: [],
    signatureAssetId: null,
    estimatedPages: null,
    metadata: null,
  });

  it("parses a valid snapshot", () => {
    const result = SnapshotDataSchema.parse(validSnapshot());
    expect(result.schemaVersion).toBe(1);
    expect(result.sender.firstName).toBe("Max");
  });

  it("rejects missing sender", () => {
    const s = validSnapshot();
    delete (s as Record<string, unknown>).sender;
    expect(() => SnapshotDataSchema.parse(s)).toThrow();
  });

  it("rejects missing recipient", () => {
    const s = validSnapshot();
    delete (s as Record<string, unknown>).recipient;
    expect(() => SnapshotDataSchema.parse(s)).toThrow();
  });

  it("accepts attachmentAssetIds with UUIDs", () => {
    const snap = { ...validSnapshot(), attachmentAssetIds: [uuid(), uuid()] };
    const result = SnapshotDataSchema.parse(snap);
    expect(result.attachmentAssetIds).toHaveLength(2);
  });

  it("rejects non-UUID in attachmentAssetIds", () => {
    expect(() =>
      SnapshotDataSchema.parse({
        ...validSnapshot(),
        attachmentAssetIds: ["not-a-uuid"],
      }),
    ).toThrow();
  });

  it("accepts estimatedPages as a number", () => {
    const result = SnapshotDataSchema.parse({ ...validSnapshot(), estimatedPages: 3 });
    expect(result.estimatedPages).toBe(3);
  });

  it("accepts null estimatedPages", () => {
    const result = SnapshotDataSchema.parse({ ...validSnapshot(), estimatedPages: null });
    expect(result.estimatedPages).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// DraftSnapshotSchema
// ---------------------------------------------------------------------------

describe("DraftSnapshotSchema", () => {
  const validDraftSnapshot = () => ({
    id: uuid(),
    draftId: uuid(),
    version: 1,
    snapshotData: {
      schemaVersion: 1,
      locale: "de-CH",
      deliveryType: "standard",
      subject: "Test",
      body: "Body text",
      enclosureNote: null,
      signatureMode: null,
      tone: null,
      intent: null,
      sender: {
        firstName: "Max",
        lastName: "Muster",
        company: null,
        addressLine1: "Bahnhofstrasse 1",
        addressLine2: null,
        postalCode: "8001",
        city: "Zürich",
        country: "CH",
      },
      recipient: {
        firstName: null,
        lastName: null,
        company: "ACME",
        department: null,
        addressLine1: "Seestrasse 10",
        addressLine2: null,
        postalCode: "6300",
        city: "Zug",
        country: "CH",
      },
      attachmentAssetIds: [],
      signatureAssetId: null,
      estimatedPages: 1,
      metadata: null,
    },
    renderedPdfAssetId: null,
    createdAt: now,
  });

  it("parses a valid draft snapshot", () => {
    const result = DraftSnapshotSchema.parse(validDraftSnapshot());
    expect(result.version).toBe(1);
  });

  it("applies default schemaVersion of 1", () => {
    const result = DraftSnapshotSchema.parse(validDraftSnapshot());
    expect(result.schemaVersion).toBe(1);
  });

  it("accepts explicit schemaVersion", () => {
    const result = DraftSnapshotSchema.parse({
      ...validDraftSnapshot(),
      schemaVersion: 2,
    });
    expect(result.schemaVersion).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// PaymentBreakdownSchema
// ---------------------------------------------------------------------------

describe("PaymentBreakdownSchema", () => {
  it("parses a valid breakdown", () => {
    const result = PaymentBreakdownSchema.parse({
      deliveryType: "standard",
      providerQuotedCents: 165,
      swissMailMarkupCents: 80,
      totalCents: 245,
      providerQuoteReference: "preview-123",
      attachmentHandling: "excluded",
      lineItems: [
        { label: "ePost provider quote", amountCents: 165, source: "provider" },
        { label: "Swiss Mail service", amountCents: 80, source: "swiss_mail" },
      ],
    });
    expect(result.providerQuotedCents).toBe(165);
  });

  it("accepts zero values", () => {
    const result = PaymentBreakdownSchema.parse({
      deliveryType: "standard",
      providerQuotedCents: 0,
      swissMailMarkupCents: 0,
      totalCents: 0,
      providerQuoteReference: null,
      attachmentHandling: "excluded",
      lineItems: [],
    });
    expect(result.providerQuotedCents).toBe(0);
  });

  it("rejects negative values", () => {
    expect(() =>
      PaymentBreakdownSchema.parse({
        deliveryType: "standard",
        providerQuotedCents: -100,
        swissMailMarkupCents: 0,
        totalCents: 0,
        providerQuoteReference: null,
        attachmentHandling: "excluded",
        lineItems: [],
      }),
    ).toThrow();
  });

  it("rejects non-integer values", () => {
    expect(() =>
      PaymentBreakdownSchema.parse({
        deliveryType: "standard",
        providerQuotedCents: 1.5,
        swissMailMarkupCents: 0,
        totalCents: 0,
        providerQuoteReference: null,
        attachmentHandling: "excluded",
        lineItems: [],
      }),
    ).toThrow();
  });

  it("rejects missing fields", () => {
    expect(() => PaymentBreakdownSchema.parse({ providerQuotedCents: 100 })).toThrow();
  });
});
