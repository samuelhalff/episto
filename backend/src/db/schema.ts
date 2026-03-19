import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enum types
// ---------------------------------------------------------------------------

export const sessionTypeEnum = pgEnum("session_type", ["guest"]);

export const localeEnum = pgEnum("locale_enum", [
  "de-CH",
  "fr-CH",
  "it-CH",
  "en-CH",
]);

export const draftStatusEnum = pgEnum("draft_status", [
  "collecting",
  "fields_complete",
  "reviewed",
  "rendering",
  "ready",
  "submitted",
  "dispatched",
  "closed",
]);

export const deliveryTypeEnum = pgEnum("delivery_type", [
  "standard",
  "registered",
]);

export const paymentStateEnum = pgEnum("payment_state", [
  "pending",
  "authorized",
  "captured",
  "failed",
  "cancelled",
  "refund_pending",
  "refunded",
  "partially_refunded",
]);

export const dispatchStateEnum = pgEnum("dispatch_state", [
  "queued",
  "submitted",
  "accepted",
  "rejected",
  "unknown",
  "reconciled",
]);

export const fileAssetKindEnum = pgEnum("file_asset_kind", [
  "attachment",
  "signature",
  "rendered_pdf",
]);

export const fileStatusEnum = pgEnum("file_status", [
  "active",
  "pending_deletion",
  "deleted",
]);

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

// ---------------------------------------------------------------------------
// Helper shorthand
// ---------------------------------------------------------------------------

const pk = () => uuid("id").defaultRandom().primaryKey();
const ts = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").defaultNow().notNull();
const updatedAt = () => ts("updated_at").defaultNow().notNull();

// ---------------------------------------------------------------------------
// 1. sessions
// ---------------------------------------------------------------------------

export const sessions = pgTable(
  "sessions",
  {
    id: pk(),
    type: sessionTypeEnum("type").default("guest").notNull(),
    email: text("email"),
    resumeTokenHash: text("resume_token_hash").notNull().unique(),
    resumeTokenExpiresAt: ts("resume_token_expires_at").notNull(),
    locale: localeEnum("locale").default("de-CH").notNull(),
    ipAddress: text("ip_address"),
    expiresAt: ts("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    expiresAtIdx: index("sessions_expires_at_idx").on(t.expiresAt),
  }),
);

// ---------------------------------------------------------------------------
// 2. draft_letters
// ---------------------------------------------------------------------------

export const draftLetters = pgTable(
  "draft_letters",
  {
    id: pk(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    status: draftStatusEnum("status").default("collecting").notNull(),
    locale: localeEnum("locale").notNull(),
    deliveryType: deliveryTypeEnum("delivery_type")
      .default("standard")
      .notNull(),
    subject: text("subject"),
    body: text("body"),
    tone: text("tone"),
    intent: text("intent"),
    enclosureNote: text("enclosure_note"),
    signatureMode: text("signature_mode"),
    schemaVersion: integer("schema_version").default(1).notNull(),
    senderProfileId: uuid("sender_profile_id").references(
      () => senderProfiles.id,
    ),
    recipientProfileId: uuid("recipient_profile_id").references(
      () => recipientProfiles.id,
    ),
    // FK to fileAssets defined via Drizzle relations to avoid circular reference
    signatureAssetId: uuid("signature_asset_id"),
    estimatedPages: integer("estimated_pages"),
    reviewedAt: ts("reviewed_at"),
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    sessionIdIdx: index("draft_letters_session_id_idx").on(t.sessionId),
    statusIdx: index("draft_letters_status_idx").on(t.status),
    createdAtIdx: index("draft_letters_created_at_idx").on(t.createdAt),
    subjectLenCheck: check(
      "draft_letters_subject_len",
      sql`length(${t.subject}) <= 200`,
    ),
    bodyLenCheck: check(
      "draft_letters_body_len",
      sql`length(${t.body}) <= 10000`,
    ),
  }),
);

// ---------------------------------------------------------------------------
// 3. sender_profiles
// ---------------------------------------------------------------------------

export const senderProfiles = pgTable(
  "sender_profiles",
  {
    id: pk(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    company: text("company"),
    addressLine1: text("address_line_1").notNull(),
    addressLine2: text("address_line_2"),
    postalCode: text("postal_code").notNull(),
    city: text("city").notNull(),
    country: text("country").default("CH").notNull(),
    phone: text("phone"),
    email: text("email"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    sessionIdIdx: index("sender_profiles_session_id_idx").on(t.sessionId),
    postalCodeCheck: check(
      "sender_profiles_postal_code_format",
      sql`${t.postalCode} ~ '^[0-9]{4}$'`,
    ),
  }),
);

// ---------------------------------------------------------------------------
// 4. recipient_profiles
// ---------------------------------------------------------------------------

export const recipientProfiles = pgTable(
  "recipient_profiles",
  {
    id: pk(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    firstName: text("first_name"),
    lastName: text("last_name"),
    company: text("company"),
    department: text("department"),
    addressLine1: text("address_line_1").notNull(),
    addressLine2: text("address_line_2"),
    postalCode: text("postal_code").notNull(),
    city: text("city").notNull(),
    country: text("country").default("CH").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    sessionIdIdx: index("recipient_profiles_session_id_idx").on(t.sessionId),
    postalCodeCheck: check(
      "recipient_profiles_postal_code_format",
      sql`${t.postalCode} ~ '^[0-9]{4}$'`,
    ),
  }),
);

// ---------------------------------------------------------------------------
// 5. file_assets
// ---------------------------------------------------------------------------

export const fileAssets = pgTable(
  "file_assets",
  {
    id: pk(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    draftId: uuid("draft_id").references(() => draftLetters.id),
    kind: fileAssetKindEnum("kind").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    originalFilename: text("original_filename"),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sortOrder: integer("sort_order"),
    status: fileStatusEnum("status").default("active").notNull(),
    deletedAt: ts("deleted_at"),
    createdAt: createdAt(),
  },
  (t) => ({
    sessionIdIdx: index("file_assets_session_id_idx").on(t.sessionId),
    draftIdIdx: index("file_assets_draft_id_idx").on(t.draftId),
    kindStatusIdx: index("file_assets_kind_status_idx").on(t.kind, t.status),
  }),
);

// ---------------------------------------------------------------------------
// 6. draft_snapshots
// ---------------------------------------------------------------------------

export const draftSnapshots = pgTable(
  "draft_snapshots",
  {
    id: pk(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => draftLetters.id),
    version: integer("version").default(1).notNull(),
    schemaVersion: integer("schema_version").default(1).notNull(),
    snapshotData: jsonb("snapshot_data").notNull(),
    renderedPdfAssetId: uuid("rendered_pdf_asset_id").references(
      () => fileAssets.id,
    ),
    createdAt: createdAt(),
  },
  (t) => ({
    draftIdIdx: index("draft_snapshots_draft_id_idx").on(t.draftId),
    draftIdVersionUniq: uniqueIndex(
      "draft_snapshots_draft_id_version_uniq",
    ).on(t.draftId, t.version),
  }),
);

// ---------------------------------------------------------------------------
// 7. conversation_messages
// ---------------------------------------------------------------------------

export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: pk(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => draftLetters.id),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    toolCalls: jsonb("tool_calls"),
    createdAt: createdAt(),
  },
  (t) => ({
    draftIdCreatedAtIdx: index(
      "conversation_messages_draft_id_created_at_idx",
    ).on(t.draftId, t.createdAt),
  }),
);

// ---------------------------------------------------------------------------
// 8. payment_attempts
// ---------------------------------------------------------------------------

export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: pk(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => draftLetters.id),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    state: paymentStateEnum("state").default("pending").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    stripeChargeId: text("stripe_charge_id"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").default("CHF").notNull(),
    breakdown: jsonb("breakdown").notNull(),
    failureReason: text("failure_reason"),
    refundReason: text("refund_reason"),
    // Long-lived order access token (90-day TTL, distinct from the drafting session token).
    // Generated on payment capture; used by GET /orders/:orderToken for status/PDF access.
    orderAccessTokenHash: text("order_access_token_hash").unique(),
    orderAccessTokenExpiresAt: ts("order_access_token_expires_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    draftIdIdx: index("payment_attempts_draft_id_idx").on(t.draftId),
    sessionIdIdx: index("payment_attempts_session_id_idx").on(t.sessionId),
    stateIdx: index("payment_attempts_state_idx").on(t.state),
    orderTokenIdx: index("payment_attempts_order_token_idx").on(t.orderAccessTokenHash),
  }),
);

// ---------------------------------------------------------------------------
// 9. dispatch_attempts
// ---------------------------------------------------------------------------

export const dispatchAttempts = pgTable(
  "dispatch_attempts",
  {
    id: pk(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => draftLetters.id),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => draftSnapshots.id),
    state: dispatchStateEnum("state").default("queued").notNull(),
    providerName: text("provider_name").notNull(),
    providerReference: text("provider_reference"),
    providerPayload: jsonb("provider_payload"),
    submittedAt: ts("submitted_at"),
    lastCheckedAt: ts("last_checked_at"),
    failureReason: text("failure_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    draftIdIdx: index("dispatch_attempts_draft_id_idx").on(t.draftId),
    snapshotIdIdx: index("dispatch_attempts_snapshot_id_idx").on(t.snapshotId),
    providerReferenceIdx: index(
      "dispatch_attempts_provider_reference_idx",
    ).on(t.providerReference),
    stateIdx: index("dispatch_attempts_state_idx").on(t.state),
  }),
);

// ---------------------------------------------------------------------------
// 10. dispatch_status_events
// ---------------------------------------------------------------------------

export const dispatchStatusEvents = pgTable(
  "dispatch_status_events",
  {
    id: pk(),
    dispatchAttemptId: uuid("dispatch_attempt_id")
      .notNull()
      .references(() => dispatchAttempts.id),
    previousState: dispatchStateEnum("previous_state"),
    newState: dispatchStateEnum("new_state").notNull(),
    source: text("source").notNull(),
    providerEventData: jsonb("provider_event_data"),
    createdAt: createdAt(),
  },
  (t) => ({
    attemptCreatedIdx: index(
      "dispatch_status_events_attempt_created_idx",
    ).on(t.dispatchAttemptId, t.createdAt),
  }),
);

// ---------------------------------------------------------------------------
// 11. support_events
// ---------------------------------------------------------------------------

export const supportEvents = pgTable(
  "support_events",
  {
    id: pk(),
    sessionId: uuid("session_id").references(() => sessions.id),
    draftId: uuid("draft_id").references(() => draftLetters.id),
    eventType: text("event_type").notNull(),
    actor: text("actor").notNull(),
    details: jsonb("details"),
    createdAt: createdAt(),
  },
  (t) => ({
    sessionIdIdx: index("support_events_session_id_idx").on(t.sessionId),
    draftIdIdx: index("support_events_draft_id_idx").on(t.draftId),
    eventTypeCreatedAtIdx: index(
      "support_events_event_type_created_at_idx",
    ).on(t.eventType, t.createdAt),
  }),
);

// ---------------------------------------------------------------------------
// Relations — enable Drizzle relational queries
// ---------------------------------------------------------------------------

export const sessionsRelations = relations(sessions, ({ many }) => ({
  drafts: many(draftLetters),
  senderProfiles: many(senderProfiles),
  recipientProfiles: many(recipientProfiles),
  fileAssets: many(fileAssets),
  paymentAttempts: many(paymentAttempts),
  supportEvents: many(supportEvents),
}));

export const draftLettersRelations = relations(
  draftLetters,
  ({ one, many }) => ({
    session: one(sessions, {
      fields: [draftLetters.sessionId],
      references: [sessions.id],
    }),
    senderProfile: one(senderProfiles, {
      fields: [draftLetters.senderProfileId],
      references: [senderProfiles.id],
    }),
    recipientProfile: one(recipientProfiles, {
      fields: [draftLetters.recipientProfileId],
      references: [recipientProfiles.id],
    }),
    signatureAsset: one(fileAssets, {
      fields: [draftLetters.signatureAssetId],
      references: [fileAssets.id],
    }),
    snapshots: many(draftSnapshots),
    messages: many(conversationMessages),
    fileAssets: many(fileAssets),
    paymentAttempts: many(paymentAttempts),
    dispatchAttempts: many(dispatchAttempts),
    supportEvents: many(supportEvents),
  }),
);

export const senderProfilesRelations = relations(
  senderProfiles,
  ({ one }) => ({
    session: one(sessions, {
      fields: [senderProfiles.sessionId],
      references: [sessions.id],
    }),
  }),
);

export const recipientProfilesRelations = relations(
  recipientProfiles,
  ({ one }) => ({
    session: one(sessions, {
      fields: [recipientProfiles.sessionId],
      references: [sessions.id],
    }),
  }),
);

export const fileAssetsRelations = relations(fileAssets, ({ one }) => ({
  session: one(sessions, {
    fields: [fileAssets.sessionId],
    references: [sessions.id],
  }),
  draft: one(draftLetters, {
    fields: [fileAssets.draftId],
    references: [draftLetters.id],
  }),
}));

export const draftSnapshotsRelations = relations(
  draftSnapshots,
  ({ one, many }) => ({
    draft: one(draftLetters, {
      fields: [draftSnapshots.draftId],
      references: [draftLetters.id],
    }),
    renderedPdfAsset: one(fileAssets, {
      fields: [draftSnapshots.renderedPdfAssetId],
      references: [fileAssets.id],
    }),
    dispatchAttempts: many(dispatchAttempts),
  }),
);

export const conversationMessagesRelations = relations(
  conversationMessages,
  ({ one }) => ({
    draft: one(draftLetters, {
      fields: [conversationMessages.draftId],
      references: [draftLetters.id],
    }),
  }),
);

export const paymentAttemptsRelations = relations(
  paymentAttempts,
  ({ one }) => ({
    draft: one(draftLetters, {
      fields: [paymentAttempts.draftId],
      references: [draftLetters.id],
    }),
    session: one(sessions, {
      fields: [paymentAttempts.sessionId],
      references: [sessions.id],
    }),
  }),
);

export const dispatchAttemptsRelations = relations(
  dispatchAttempts,
  ({ one, many }) => ({
    draft: one(draftLetters, {
      fields: [dispatchAttempts.draftId],
      references: [draftLetters.id],
    }),
    snapshot: one(draftSnapshots, {
      fields: [dispatchAttempts.snapshotId],
      references: [draftSnapshots.id],
    }),
    statusEvents: many(dispatchStatusEvents),
  }),
);

export const dispatchStatusEventsRelations = relations(
  dispatchStatusEvents,
  ({ one }) => ({
    dispatchAttempt: one(dispatchAttempts, {
      fields: [dispatchStatusEvents.dispatchAttemptId],
      references: [dispatchAttempts.id],
    }),
  }),
);

export const supportEventsRelations = relations(
  supportEvents,
  ({ one }) => ({
    session: one(sessions, {
      fields: [supportEvents.sessionId],
      references: [sessions.id],
    }),
    draft: one(draftLetters, {
      fields: [supportEvents.draftId],
      references: [draftLetters.id],
    }),
  }),
);
