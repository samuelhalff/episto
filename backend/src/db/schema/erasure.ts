import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, pk } from "./helpers.js";

/**
 * The only row an erasure leaves behind.
 *
 * Deliberately not a `support_event`: that table carries `session_id`,
 * `draft_id` and a free-text `details` blob, so using it to record an erasure
 * would have kept a pointer to the person who asked to be forgotten. Here the
 * subject is an HMAC — support can still answer "was this session erased?"
 * while holding the id, and the table answers nothing to anyone reading it.
 */
export const erasureAudits = pgTable(
  "erasure_audits",
  {
    id: pk(),
    subjectDigest: text("subject_digest").notNull(),
    keyVersion: integer("key_version").default(1).notNull(),
    requestedBy: text("requested_by").notNull(),
    draftsErased: integer("drafts_erased").default(0).notNull(),
    ordersRetained: integer("orders_retained").default(0).notNull(),
    filesMarked: integer("files_marked").default(0).notNull(),
    createdAt: createdAt(),
  },
  (table) => ({
    subjectDigestIdx: index("erasure_audits_subject_digest_idx").on(table.subjectDigest),
    createdAtIdx: index("erasure_audits_created_at_idx").on(table.createdAt),
  }),
);
