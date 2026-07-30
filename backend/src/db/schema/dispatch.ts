import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { deliveryTypeEnum, draftLetters } from "./drafting.js";
import { draftSnapshots } from "./files.js";
import { createdAt, pk, ts, updatedAt } from "./helpers.js";
import { paymentAttempts } from "./payments.js";

export const dispatchStateEnum = pgEnum("dispatch_state", [
  "queued",
  "submitted",
  "accepted",
  "rejected",
  "unknown",
  "reconciled",
]);

export const providerRateMatrixStatusEnum = pgEnum("provider_rate_matrix_status", [
  "building",
  "active",
  "failed",
  "retired",
]);

export const quoteSourceEnum = pgEnum("quote_source", ["matrix", "live"]);

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
    paymentAttemptId: uuid("payment_attempt_id").references(() => paymentAttempts.id),
    state: dispatchStateEnum("state").default("queued").notNull(),
    providerName: text("provider_name").notNull(),
    providerReference: text("provider_reference"),
    trackingNumber: text("tracking_number"),
    submittedAt: ts("submitted_at"),
    /**
     * Lease held by the worker currently submitting this attempt. The provider
     * call happens outside any transaction, so a row lock cannot cover it —
     * this can. It expires, so a worker that dies mid-submission does not
     * strand the letter.
     */
    claimedAt: ts("claimed_at"),
    /**
     * Set immediately before the provider call — the point of no return. Once
     * it is set, no worker may claim this attempt again: we cannot know whether
     * Swiss Post received the letter, and posting it twice is worse than
     * stopping for human review.
     */
    submissionStartedAt: ts("submission_started_at"),
    lastCheckedAt: ts("last_checked_at"),
    /**
     * When the customer was told this attempt is under review. Set once, by the
     * dwell sweep, and never cleared on a later resolution — it records that we
     * spoke, not the current state.
     */
    underReviewNotifiedAt: ts("under_review_notified_at"),
    failureReason: text("failure_reason"),
    providerDiagnostics: jsonb("provider_diagnostics"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    draftIdIdx: index("dispatch_attempts_draft_id_idx").on(table.draftId),
    snapshotIdIdx: index("dispatch_attempts_snapshot_id_idx").on(table.snapshotId),
    paymentAttemptIdIdx: index("dispatch_attempts_payment_attempt_id_idx").on(
      table.paymentAttemptId,
    ),
    providerReferenceIdx: index("dispatch_attempts_provider_reference_idx").on(
      table.providerReference,
    ),
    stateIdx: index("dispatch_attempts_state_idx").on(table.state),
    paymentAttemptIdUniq: uniqueIndex("dispatch_attempts_payment_attempt_id_uniq")
      .on(table.paymentAttemptId)
      .where(sql`${table.paymentAttemptId} IS NOT NULL`),
  }),
);

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
    createdAt: createdAt(),
  },
  (table) => ({
    attemptCreatedIdx: index("dispatch_status_events_attempt_created_idx").on(
      table.dispatchAttemptId,
      table.createdAt,
    ),
  }),
);

export const providerRateMatrixVersions = pgTable(
  "provider_rate_matrix_versions",
  {
    id: pk(),
    providerName: text("provider_name").notNull(),
    status: providerRateMatrixStatusEnum("status").notNull(),
    verifiedAt: ts("verified_at"),
    effectiveAt: ts("effective_at"),
    expiresAt: ts("expires_at"),
    sourceEndpoint: text("source_endpoint"),
    failureReason: text("failure_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    activeProviderUniq: uniqueIndex("provider_rate_matrix_versions_active_provider_idx")
      .on(table.providerName)
      .where(sql`${table.status} = 'active'::provider_rate_matrix_status`),
  }),
);

export const providerRateMatrixEntries = pgTable(
  "provider_rate_matrix_entries",
  {
    id: pk(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => providerRateMatrixVersions.id),
    postage: text("postage").notNull(),
    numberOfPage: integer("number_of_page").notNull(),
    attachmentMode: text("attachment_mode").notNull(),
    shippingCountry: text("shipping_country").notNull(),
    envelopeSize: text("envelope_size").notNull(),
    windowLocation: text("window_location").notNull(),
    duplex: boolean("duplex").notNull(),
    providerQuotedCents: integer("provider_quoted_cents").notNull(),
    currency: text("currency").default("CHF").notNull(),
    providerQuoteReference: text("provider_quote_reference"),
    verifiedAt: ts("verified_at"),
    createdAt: createdAt(),
  },
  (table) => ({
    lookupIdx: index("provider_rate_matrix_entries_lookup_idx").on(
      table.versionId,
      table.postage,
      table.numberOfPage,
      table.attachmentMode,
      table.shippingCountry,
      table.envelopeSize,
      table.windowLocation,
      table.duplex,
    ),
  }),
);

export const draftQuoteCache = pgTable(
  "draft_quote_cache",
  {
    id: pk(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => draftLetters.id),
    snapshotId: uuid("snapshot_id").references(() => draftSnapshots.id),
    pricingInputHash: text("pricing_input_hash").notNull(),
    pricingInput: jsonb("pricing_input").notNull(),
    source: quoteSourceEnum("source").notNull(),
    deliveryType: deliveryTypeEnum("delivery_type").notNull(),
    postage: text("postage").notNull(),
    providerQuotedCents: integer("provider_quoted_cents").notNull(),
    swissMailMarkupCents: integer("swiss_mail_markup_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    currency: text("currency").default("CHF").notNull(),
    providerQuoteReference: text("provider_quote_reference"),
    rateMatrixVersionId: uuid("rate_matrix_version_id").references(
      () => providerRateMatrixVersions.id,
    ),
    generatedAt: ts("generated_at").notNull(),
    expiresAt: ts("expires_at"),
    createdAt: createdAt(),
  },
  (table) => ({
    inputHashIdx: index("draft_quote_cache_input_hash_idx").on(
      table.pricingInputHash,
      table.generatedAt,
    ),
  }),
);
