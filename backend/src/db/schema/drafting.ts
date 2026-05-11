import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { localeEnum, sessions } from "./auth.js";
import { createdAt, pk, ts, updatedAt } from "./helpers.js";

export const draftStatusEnum = pgEnum("draft_status", [
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

export const deliveryTypeEnum = pgEnum("delivery_type", ["standard", "registered"]);
export const signatureAssuranceLevelEnum = pgEnum("signature_assurance_level", [
  "visual",
  "advanced",
]);
export const signatureFlowModeEnum = pgEnum("signature_flow_mode", [
  "none",
  "visual",
  "swisssign_ses",
]);
export const orderFulfillmentStatusEnum = pgEnum("order_fulfillment_status", [
  "draft_created",
  "draft_completed",
  "preview_ready",
  "signature_not_required",
  "signature_selected",
  "signature_eligibility_confirmed",
  "payment_authorized",
  "identity_stepup_started",
  "signature_session_created",
  "signature_in_progress",
  "signature_completed",
  "signed_document_attached",
  "dispatch_submitted",
  "payment_captured",
  "dispatch_confirmed",
  "completed",
  "failed",
  "expired",
]);

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);

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
  (table) => ({
    sessionIdIdx: index("sender_profiles_session_id_idx").on(table.sessionId),
    postalCodeCheck: check(
      "sender_profiles_postal_code_format",
      sql`${table.postalCode} ~ '^[0-9]{4}$'`,
    ),
  }),
);

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
  (table) => ({
    sessionIdIdx: index("recipient_profiles_session_id_idx").on(table.sessionId),
    postalCodeCheck: check(
      "recipient_profiles_postal_code_format",
      sql`${table.postalCode} ~ '^[0-9]{4}$'`,
    ),
  }),
);

export const draftLetters = pgTable(
  "draft_letters",
  {
    id: pk(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    status: draftStatusEnum("status").default("collecting").notNull(),
    locale: localeEnum("locale").notNull(),
    deliveryType: deliveryTypeEnum("delivery_type").default("standard").notNull(),
    signatureAssuranceLevel: signatureAssuranceLevelEnum("signature_assurance_level")
      .default("visual")
      .notNull(),
    signatureFlowMode: signatureFlowModeEnum("signature_flow_mode")
      .default("visual")
      .notNull(),
    fulfillmentStatus: orderFulfillmentStatusEnum("fulfillment_status")
      .default("draft_created")
      .notNull(),
    subject: text("subject"),
    body: text("body"),
    tone: text("tone"),
    intent: text("intent"),
    enclosureNote: text("enclosure_note"),
    signatureMode: text("signature_mode").default("drawn"),
    schemaVersion: integer("schema_version").default(1).notNull(),
    senderProfileId: uuid("sender_profile_id").references(() => senderProfiles.id),
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
  (table) => ({
    sessionIdIdx: index("draft_letters_session_id_idx").on(table.sessionId),
    statusIdx: index("draft_letters_status_idx").on(table.status),
    createdAtIdx: index("draft_letters_created_at_idx").on(table.createdAt),
    subjectLenCheck: check(
      "draft_letters_subject_len",
      sql`length(${table.subject}) <= 200`,
    ),
    bodyLenCheck: check("draft_letters_body_len", sql`length(${table.body}) <= 10000`),
  }),
);

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
  (table) => ({
    draftIdCreatedAtIdx: index("conversation_messages_draft_id_created_at_idx").on(
      table.draftId,
      table.createdAt,
    ),
  }),
);
