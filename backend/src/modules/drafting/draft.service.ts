import { eq, and, sql } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError, validationError } from "../../shared/errors/index.js";
import {
  assertTransitionDraft,
  type DraftStatusValue,
} from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DraftRow {
  id: string;
  sessionId: string;
  status: string;
  locale: string;
  deliveryType: string;
  subject: string | null;
  body: string | null;
  tone: string | null;
  intent: string | null;
  enclosureNote: string | null;
  signatureMode: string | null;
  schemaVersion: number;
  senderProfileId: string | null;
  recipientProfileId: string | null;
  signatureAssetId: string | null;
  estimatedPages: number | null;
  reviewedAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

function toDraftRow(row: typeof schema.draftLetters.$inferSelect): DraftRow {
  return {
    id: row.id,
    sessionId: row.sessionId,
    status: row.status,
    locale: row.locale,
    deliveryType: row.deliveryType,
    subject: row.subject,
    body: row.body,
    tone: row.tone,
    intent: row.intent,
    enclosureNote: row.enclosureNote,
    signatureMode: row.signatureMode,
    schemaVersion: row.schemaVersion,
    senderProfileId: row.senderProfileId,
    recipientProfileId: row.recipientProfileId,
    signatureAssetId: row.signatureAssetId,
    estimatedPages: row.estimatedPages,
    reviewedAt: row.reviewedAt,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Create draft
// ---------------------------------------------------------------------------

export async function createDraft(
  db: Db,
  sessionId: string,
  locale: string,
): Promise<DraftRow> {
  const [row] = await db
    .insert(schema.draftLetters)
    .values({
      sessionId,
      status: "collecting",
      locale: locale as "de-CH" | "fr-CH" | "it-CH" | "en-CH",
      deliveryType: "standard",
      schemaVersion: 1,
    })
    .returning();

  if (!row) throw new Error("Failed to create draft");
  return toDraftRow(row);
}

// ---------------------------------------------------------------------------
// Get draft (scoped to session)
// ---------------------------------------------------------------------------

export async function getDraftById(
  db: Db,
  draftId: string,
  sessionId: string,
): Promise<DraftRow | null> {
  const [row] = await db
    .select()
    .from(schema.draftLetters)
    .where(
      and(
        eq(schema.draftLetters.id, draftId),
        eq(schema.draftLetters.sessionId, sessionId),
      ),
    )
    .limit(1);

  return row ? toDraftRow(row) : null;
}

// ---------------------------------------------------------------------------
// List drafts for session
// ---------------------------------------------------------------------------

export async function listDraftsBySession(
  db: Db,
  sessionId: string,
): Promise<DraftRow[]> {
  const rows = await db
    .select()
    .from(schema.draftLetters)
    .where(eq(schema.draftLetters.sessionId, sessionId))
    .orderBy(sql`${schema.draftLetters.createdAt} DESC`);

  return rows.map(toDraftRow);
}

// ---------------------------------------------------------------------------
// Update draft fields (only while editable)
// ---------------------------------------------------------------------------

const EDITABLE_STATUSES = new Set(["collecting", "fields_complete"]);

export async function updateDraft(
  db: Db,
  draftId: string,
  sessionId: string,
  updates: {
    subject?: string | null | undefined;
    body?: string | null | undefined;
    tone?: string | null | undefined;
    intent?: string | null | undefined;
    deliveryType?: string | undefined;
    enclosureNote?: string | null | undefined;
    signatureMode?: string | null | undefined;
    senderProfileId?: string | null | undefined;
    recipientProfileId?: string | null | undefined;
    signatureAssetId?: string | null | undefined;
    metadata?: unknown;
  },
): Promise<DraftRow> {
  const existing = await getDraftById(db, draftId, sessionId);
  if (!existing) throw notFoundError("draft");

  if (!EDITABLE_STATUSES.has(existing.status)) {
    throw validationError(
      `Draft cannot be edited in status '${existing.status}'`,
    );
  }

  const values: Record<string, unknown> = { updatedAt: new Date() };

  if (updates.subject !== undefined) values.subject = updates.subject;
  if (updates.body !== undefined) values.body = updates.body;
  if (updates.tone !== undefined) values.tone = updates.tone;
  if (updates.intent !== undefined) values.intent = updates.intent;
  if (updates.deliveryType !== undefined) values.deliveryType = updates.deliveryType;
  if (updates.enclosureNote !== undefined) values.enclosureNote = updates.enclosureNote;
  if (updates.signatureMode !== undefined) values.signatureMode = updates.signatureMode;
  if (updates.senderProfileId !== undefined) values.senderProfileId = updates.senderProfileId;
  if (updates.recipientProfileId !== undefined) values.recipientProfileId = updates.recipientProfileId;
  if (updates.signatureAssetId !== undefined) values.signatureAssetId = updates.signatureAssetId;
  if (updates.metadata !== undefined) values.metadata = updates.metadata;

  const [row] = await db
    .update(schema.draftLetters)
    .set(values)
    .where(
      and(
        eq(schema.draftLetters.id, draftId),
        eq(schema.draftLetters.sessionId, sessionId),
      ),
    )
    .returning();

  if (!row) throw notFoundError("draft");
  return toDraftRow(row);
}

// ---------------------------------------------------------------------------
// Transition draft status
// ---------------------------------------------------------------------------

export async function transitionDraftStatus(
  db: Db,
  draftId: string,
  sessionId: string,
  newStatus: DraftStatusValue,
): Promise<DraftRow> {
  const existing = await getDraftById(db, draftId, sessionId);
  if (!existing) throw notFoundError("draft");

  assertTransitionDraft(
    existing.status as DraftStatusValue,
    newStatus,
  );

  const values: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  if (newStatus === "reviewed") {
    values.reviewedAt = new Date();
  }

  const [row] = await db
    .update(schema.draftLetters)
    .set(values)
    .where(
      and(
        eq(schema.draftLetters.id, draftId),
        eq(schema.draftLetters.sessionId, sessionId),
      ),
    )
    .returning();

  if (!row) throw notFoundError("draft");
  return toDraftRow(row);
}
