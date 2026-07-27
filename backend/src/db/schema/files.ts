import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sessions } from "./auth.js";
import { draftLetters } from "./drafting.js";
import { createdAt, pk, ts } from "./helpers.js";

export const fileAssetKindEnum = pgEnum("file_asset_kind", [
  "attachment",
  "signature",
  "rendered_pdf",
  "signed_pdf",
]);

export const fileStatusEnum = pgEnum("file_status", [
  "active",
  "pending_deletion",
  "deleted",
]);

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
    // Assistant-readable text extracted from an attachment (ingestion 0021).
    extractionStatus: text("extraction_status"),
    extractedText: text("extracted_text"),
    extractionPageCount: integer("extraction_page_count"),
    extractedAt: ts("extracted_at"),
    deletedAt: ts("deleted_at"),
    createdAt: createdAt(),
  },
  (table) => ({
    sessionIdIdx: index("file_assets_session_id_idx").on(table.sessionId),
    draftIdIdx: index("file_assets_draft_id_idx").on(table.draftId),
    kindStatusIdx: index("file_assets_kind_status_idx").on(table.kind, table.status),
  }),
);

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
    renderedPdfAssetId: uuid("rendered_pdf_asset_id").references(() => fileAssets.id),
    createdAt: createdAt(),
  },
  (table) => ({
    draftIdIdx: index("draft_snapshots_draft_id_idx").on(table.draftId),
    draftIdVersionUniq: uniqueIndex("draft_snapshots_draft_id_version_uniq").on(
      table.draftId,
      table.version,
    ),
  }),
);
