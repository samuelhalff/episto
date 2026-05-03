import { index, jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { sessions } from "./auth.js";
import { draftLetters, signatureFlowModeEnum } from "./drafting.js";
import { fileAssets } from "./files.js";
import { paymentAttempts } from "./payments.js";
import { createdAt, pk, ts, updatedAt } from "./helpers.js";

export const signatureProviderEnum = pgEnum("signature_provider", [
  "none",
  "mock",
  "swisssign",
  "swisssign_mock",
  "platform_aes",
  "skribble",
  "swisscom_ais",
]);

export const signatureEligibilityStatusEnum = pgEnum("signature_eligibility_status", [
  "not_started",
  "checking",
  "eligible",
  "conditionally_eligible",
  "blocked",
]);

export const signatureSessionStatusEnum = pgEnum("signature_session_status", [
  "not_required",
  "eligibility_pending",
  "eligibility_confirmed",
  "payment_authorized",
  "identity_stepup_started",
  "signature_session_created",
  "signature_in_progress",
  "signature_completed",
  "signed_document_attached",
  "failed",
  "expired",
  "cancelled",
]);

export const signatureSessions = pgTable(
  "signature_sessions",
  {
    id: pk(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => draftLetters.id),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    paymentAttemptId: uuid("payment_attempt_id").references(() => paymentAttempts.id),
    signatureFlowMode: signatureFlowModeEnum("signature_flow_mode").notNull(),
    provider: signatureProviderEnum("provider").notNull(),
    eligibilityStatus: signatureEligibilityStatusEnum("eligibility_status")
      .default("not_started")
      .notNull(),
    eligibilityReasons: jsonb("eligibility_reasons").default([]).notNull(),
    status: signatureSessionStatusEnum("status").default("eligibility_pending").notNull(),
    providerSessionId: text("provider_session_id"),
    handoffUrl: text("handoff_url"),
    oidcState: text("oidc_state"),
    oidcNonce: text("oidc_nonce"),
    pkceCodeVerifier: text("pkce_code_verifier"),
    signedFileAssetId: uuid("signed_file_asset_id").references(() => fileAssets.id),
    failureReason: text("failure_reason"),
    expiresAt: ts("expires_at"),
    completedAt: ts("completed_at"),
    metadata: jsonb("metadata"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    draftIdIdx: index("signature_sessions_draft_id_idx").on(table.draftId),
    sessionIdIdx: index("signature_sessions_session_id_idx").on(table.sessionId),
    paymentAttemptIdIdx: index("signature_sessions_payment_attempt_id_idx").on(
      table.paymentAttemptId,
    ),
    providerSessionIdIdx: index("signature_sessions_provider_session_id_idx").on(
      table.providerSessionId,
    ),
    statusIdx: index("signature_sessions_status_idx").on(table.status),
  }),
);

export const signatureEvents = pgTable(
  "signature_events",
  {
    id: pk(),
    signatureSessionId: uuid("signature_session_id")
      .notNull()
      .references(() => signatureSessions.id),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => draftLetters.id),
    eventSource: text("event_source").notNull(),
    eventType: text("event_type").notNull(),
    eventKey: text("event_key").notNull().unique(),
    payload: jsonb("payload"),
    processedAt: ts("processed_at"),
    createdAt: createdAt(),
  },
  (table) => ({
    sessionCreatedIdx: index("signature_events_session_created_idx").on(
      table.signatureSessionId,
      table.createdAt,
    ),
    draftIdIdx: index("signature_events_draft_id_idx").on(table.draftId),
  }),
);
