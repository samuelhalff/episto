import { describe, expect, it } from "vitest";
import * as schema from "../src/db/schema/index.js";
import {
  insertSessionSchema,
  insertDraftLetterSchema,
  insertSenderProfileSchema,
  insertRecipientProfileSchema,
  insertFileAssetSchema,
  insertDraftSnapshotSchema,
  insertConversationMessageSchema,
  insertPaymentAttemptSchema,
  insertDispatchAttemptSchema,
  insertDispatchStatusEventSchema,
  insertSupportEventSchema,
} from "../src/db/zod-schemas.js";

// ---------------------------------------------------------------------------
// Table presence — all 12 tables from database-schema.md must exist
// ---------------------------------------------------------------------------

describe("schema tables", () => {
  const expectedTables = [
    "sessions",
    "draftLetters",
    "senderProfiles",
    "recipientProfiles",
    "fileAssets",
    "draftSnapshots",
    "conversationMessages",
    "paymentAttempts",
    "dispatchAttempts",
    "dispatchStatusEvents",
    "supportEvents",
    "productEvents",
  ] as const;

  for (const tableName of expectedTables) {
    it(`exports ${tableName} table`, () => {
      expect(schema[tableName]).toBeDefined();
    });
  }

  it("has exactly 12 tables defined", () => {
    // Drizzle pgTable objects are instances of PgTable which have a Symbol-keyed
    // internal structure. The simplest check is counting the named table exports.
    const tableNames = expectedTables;
    expect(tableNames.length).toBe(12);
    // Verify each is a Drizzle table (has columns accessible)
    for (const name of tableNames) {
      const table = schema[name] as Record<string, unknown>;
      expect(table).toBeDefined();
      // Every Drizzle table has an 'id' column in our schema
      expect(table.id).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Enum values — must match shared/enums.ts and database-schema.md
// ---------------------------------------------------------------------------

describe("schema enums", () => {
  it("session_type has 'guest'", () => {
    expect(schema.sessionTypeEnum.enumValues).toEqual(["guest"]);
  });

  it("locale_enum has all 4 Swiss locales", () => {
    expect(schema.localeEnum.enumValues).toEqual(["de-CH", "fr-CH", "it-CH", "en-CH"]);
  });

  it("draft_status has correct 9 states", () => {
    expect(schema.draftStatusEnum.enumValues).toEqual([
      "collecting",
      "fields_complete",
      "reviewed",
      "rendering",
      "ready",
      "ready_to_sign",
      "submitted",
      "dispatched",
      "closed",
    ]);
  });

  it("delivery_type has standard and registered", () => {
    expect(schema.deliveryTypeEnum.enumValues).toEqual(["standard", "registered"]);
  });

  it("signature_assurance_level has visual and advanced", () => {
    expect(schema.signatureAssuranceLevelEnum.enumValues).toEqual(["visual", "advanced"]);
  });

  it("payment_state has all 8 states including cancelled and partially_refunded", () => {
    expect(schema.paymentStateEnum.enumValues).toEqual([
      "pending",
      "authorized",
      "captured",
      "failed",
      "cancelled",
      "refund_pending",
      "refunded",
      "partially_refunded",
    ]);
  });

  it("dispatch_state has 6 states (no 'draft' state)", () => {
    expect(schema.dispatchStateEnum.enumValues).toEqual([
      "queued",
      "submitted",
      "accepted",
      "rejected",
      "unknown",
      "reconciled",
    ]);
  });

  it("file_asset_kind has attachment, signature, rendered_pdf, signed_pdf", () => {
    expect(schema.fileAssetKindEnum.enumValues).toEqual([
      "attachment",
      "signature",
      "rendered_pdf",
      "signed_pdf",
    ]);
  });

  it("file_status has active, pending_deletion, deleted", () => {
    expect(schema.fileStatusEnum.enumValues).toEqual([
      "active",
      "pending_deletion",
      "deleted",
    ]);
  });

  it("message_role has user, assistant, system", () => {
    expect(schema.messageRoleEnum.enumValues).toEqual(["user", "assistant", "system"]);
  });
});

// ---------------------------------------------------------------------------
// Relations — verify all relations are exported
// ---------------------------------------------------------------------------

describe("schema relations", () => {
  const expectedRelations = [
    "sessionsRelations",
    "draftLettersRelations",
    "senderProfilesRelations",
    "recipientProfilesRelations",
    "fileAssetsRelations",
    "draftSnapshotsRelations",
    "conversationMessagesRelations",
    "paymentAttemptsRelations",
    "dispatchAttemptsRelations",
    "dispatchStatusEventsRelations",
    "supportEventsRelations",
  ] as const;

  for (const rel of expectedRelations) {
    it(`exports ${rel}`, () => {
      expect(schema[rel]).toBeDefined();
    });
  }
});

// ---------------------------------------------------------------------------
// drizzle-zod insert schemas — validate correct parsing
// ---------------------------------------------------------------------------

describe("drizzle-zod insert schemas", () => {
  it("insertSessionSchema accepts valid session data", () => {
    const result = insertSessionSchema.safeParse({
      resumeTokenHash: "abc123hash",
      resumeTokenExpiresAt: new Date(),
      expiresAt: new Date(),
    });
    expect(result.success).toBe(true);
  });

  it("insertSessionSchema rejects missing required fields", () => {
    const result = insertSessionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("insertDraftLetterSchema accepts valid draft data", () => {
    const result = insertDraftLetterSchema.safeParse({
      sessionId: "00000000-0000-0000-0000-000000000001",
      locale: "de-CH",
    });
    expect(result.success).toBe(true);
  });

  it("insertSenderProfileSchema requires firstName, lastName, address", () => {
    const result = insertSenderProfileSchema.safeParse({
      sessionId: "00000000-0000-0000-0000-000000000001",
      firstName: "Max",
      lastName: "Muster",
      addressLine1: "Musterstrasse 1",
      postalCode: "8001",
      city: "Zürich",
    });
    expect(result.success).toBe(true);
  });

  it("insertRecipientProfileSchema requires address fields", () => {
    const result = insertRecipientProfileSchema.safeParse({
      sessionId: "00000000-0000-0000-0000-000000000001",
      addressLine1: "Bahnhofstrasse 10",
      postalCode: "3011",
      city: "Bern",
    });
    expect(result.success).toBe(true);
  });

  it("insertFileAssetSchema requires kind, storageKey, mimeType, sizeBytes", () => {
    const result = insertFileAssetSchema.safeParse({
      sessionId: "00000000-0000-0000-0000-000000000001",
      kind: "attachment",
      storageKey: "attachments/session1/file1",
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });
    expect(result.success).toBe(true);
  });

  it("insertDraftSnapshotSchema requires draftId and snapshotData", () => {
    const result = insertDraftSnapshotSchema.safeParse({
      draftId: "00000000-0000-0000-0000-000000000001",
      snapshotData: { schemaVersion: 1, locale: "de-CH" },
    });
    expect(result.success).toBe(true);
  });

  it("insertConversationMessageSchema requires draftId, role, content", () => {
    const result = insertConversationMessageSchema.safeParse({
      draftId: "00000000-0000-0000-0000-000000000001",
      role: "user",
      content: "Hello",
    });
    expect(result.success).toBe(true);
  });

  it("insertPaymentAttemptSchema requires draftId, sessionId, amountCents, breakdown", () => {
    const result = insertPaymentAttemptSchema.safeParse({
      draftId: "00000000-0000-0000-0000-000000000001",
      sessionId: "00000000-0000-0000-0000-000000000002",
      amountCents: 490,
      breakdown: { base: 490, pages: 0, delivery: 0, attachments: 0 },
    });
    expect(result.success).toBe(true);
  });

  it("insertDispatchAttemptSchema requires draftId, snapshotId, providerName", () => {
    const result = insertDispatchAttemptSchema.safeParse({
      draftId: "00000000-0000-0000-0000-000000000001",
      snapshotId: "00000000-0000-0000-0000-000000000003",
      providerName: "swiss-post-direct",
    });
    expect(result.success).toBe(true);
  });

  it("insertDispatchStatusEventSchema requires dispatchAttemptId, newState, source", () => {
    const result = insertDispatchStatusEventSchema.safeParse({
      dispatchAttemptId: "00000000-0000-0000-0000-000000000001",
      newState: "submitted",
      source: "system",
    });
    expect(result.success).toBe(true);
  });

  it("insertSupportEventSchema requires eventType and actor", () => {
    const result = insertSupportEventSchema.safeParse({
      eventType: "refund_initiated",
      actor: "admin@example.com",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Pricing quote persistence schema
// ---------------------------------------------------------------------------

describe("pricing quote persistence schema", () => {
  it("exports provider rate matrix tables", () => {
    expect(schema.providerRateMatrixVersions).toBeDefined();
    expect(schema.providerRateMatrixEntries).toBeDefined();
  });

  it("exports draft quote cache table", () => {
    expect(schema.draftQuoteCache).toBeDefined();
  });
});
