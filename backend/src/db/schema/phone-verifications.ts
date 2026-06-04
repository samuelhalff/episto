import { index, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { sessions } from "./auth.js";
import { draftLetters } from "./drafting.js";
import { createdAt, pk, ts, updatedAt } from "./helpers.js";

export const phoneVerificationStatusEnum = pgEnum("phone_verification_status", [
  "pending",
  "verified",
  "expired",
  "failed",
]);

export const phoneVerifications = pgTable(
  "phone_verifications",
  {
    id: pk(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => draftLetters.id),
    phoneE164: text("phone_e164").notNull(),
    codeHash: text("code_hash").notNull(),
    status: phoneVerificationStatusEnum("status").default("pending").notNull(),
    sendCount: integer("send_count").default(1).notNull(),
    verifyAttemptCount: integer("verify_attempt_count").default(0).notNull(),
    provider: text("provider").default("noop").notNull(),
    providerMessageId: text("provider_message_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    lastSentAt: ts("last_sent_at").notNull(),
    expiresAt: ts("expires_at").notNull(),
    verifiedAt: ts("verified_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    sessionDraftIdx: index("phone_verifications_session_draft_idx").on(
      table.sessionId,
      table.draftId,
    ),
    phoneIdx: index("phone_verifications_phone_idx").on(table.phoneE164),
    statusIdx: index("phone_verifications_status_idx").on(table.status),
    expiresAtIdx: index("phone_verifications_expires_at_idx").on(table.expiresAt),
  }),
);
