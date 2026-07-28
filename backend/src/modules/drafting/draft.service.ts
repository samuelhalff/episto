import { eq, and, sql } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError, validationError } from "../../shared/errors/index.js";
import {
  assertTransitionDraft,
  mergeDraftWorkspaceState,
  type DraftStatusValue,
  type DraftWorkspacePatch,
} from "@episto/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DraftRow {
  id: string;
  sessionId: string;
  status: string;
  locale: string;
  deliveryType: string;
  signatureFlowMode: string;
  fulfillmentStatus: string;
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
    signatureFlowMode: row.signatureFlowMode,
    fulfillmentStatus: row.fulfillmentStatus,
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
      signatureFlowMode: "visual",
      signatureMode: "drawn",
      fulfillmentStatus: "draft_created",
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

/**
 * The two statuses in which the letter is still the user's to change.
 *
 * Exported because a draft is more than its columns: its attachments and
 * signature are part of what gets printed, and the file routes have to answer
 * the same question this set answers. At `reviewed` the draft is snapshotted
 * and the PDF is rendered from that snapshot, so a file added or removed after
 * that point cannot reach the letter — it can only make what the customer sees
 * in the app disagree with what Swiss Post delivers.
 */
export const EDITABLE_STATUSES = new Set(["collecting", "fields_complete"]);

export async function updateDraft(
  db: Db,
  draftId: string,
  sessionId: string,
  updates: {
    locale?: string | undefined;
    subject?: string | null | undefined;
    body?: string | null | undefined;
    tone?: string | null | undefined;
    intent?: string | null | undefined;
    deliveryType?: string | undefined;
    signatureFlowMode?: string | undefined;
    enclosureNote?: string | null | undefined;
    signatureMode?: string | null | undefined;
    senderProfileId?: string | null | undefined;
    recipientProfileId?: string | null | undefined;
    signatureAssetId?: string | null | undefined;
    workspacePatch?: DraftWorkspacePatch | undefined;
  },
): Promise<DraftRow> {
  const values: Record<string, unknown> = { updatedAt: new Date() };

  if (updates.locale !== undefined) values.locale = updates.locale;
  if (updates.subject !== undefined) values.subject = updates.subject;
  if (updates.body !== undefined) values.body = updates.body;
  if (updates.tone !== undefined) values.tone = updates.tone;
  if (updates.intent !== undefined) values.intent = updates.intent;
  if (updates.deliveryType !== undefined) values.deliveryType = updates.deliveryType;
  if (updates.signatureFlowMode !== undefined) {
    values.signatureFlowMode = updates.signatureFlowMode;
  }
  if (updates.enclosureNote !== undefined) values.enclosureNote = updates.enclosureNote;
  if (updates.signatureMode !== undefined) values.signatureMode = updates.signatureMode;
  if (updates.senderProfileId !== undefined)
    values.senderProfileId = updates.senderProfileId;
  if (updates.recipientProfileId !== undefined)
    values.recipientProfileId = updates.recipientProfileId;
  if (updates.signatureAssetId !== undefined)
    values.signatureAssetId = updates.signatureAssetId;
  // Read-modify-write of `metadata` happens under a row lock, and only ever from
  // a delta. Merging on the client and sending the whole object loses every
  // write made between that client's render and its request — a finishing AI
  // turn, another tab, or its own debounced autosave.
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        status: schema.draftLetters.status,
        metadata: schema.draftLetters.metadata,
      })
      .from(schema.draftLetters)
      .where(
        and(
          eq(schema.draftLetters.id, draftId),
          eq(schema.draftLetters.sessionId, sessionId),
        ),
      )
      .for("update")
      .limit(1);

    if (!existing) throw notFoundError("draft");

    if (!EDITABLE_STATUSES.has(existing.status)) {
      throw validationError(`Draft cannot be edited in status '${existing.status}'`);
    }

    if (updates.workspacePatch) {
      values.metadata = mergeDraftWorkspaceState(
        existing.metadata,
        updates.workspacePatch,
      );
    }

    const [row] = await tx
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
  });
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

  assertTransitionDraft(existing.status as DraftStatusValue, newStatus);

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
