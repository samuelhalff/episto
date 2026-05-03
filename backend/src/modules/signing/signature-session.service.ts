import { and, desc, eq } from "drizzle-orm";
import {
  assertTransitionSignatureSession,
  type SignatureEligibilityReasonValue,
  type SignatureEligibilityStatusValue,
  type SignatureFlowModeValue,
  type SignatureSessionStatusValue,
} from "@episto/shared";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError } from "../../shared/errors/index.js";

export interface SignatureSessionRow {
  id: string;
  draftId: string;
  sessionId: string;
  paymentAttemptId: string | null;
  signatureFlowMode: SignatureFlowModeValue;
  provider: string;
  eligibilityStatus: SignatureEligibilityStatusValue;
  eligibilityReasons: SignatureEligibilityReasonValue[];
  status: SignatureSessionStatusValue;
  providerSessionId: string | null;
  handoffUrl: string | null;
  oidcState: string | null;
  oidcNonce: string | null;
  pkceCodeVerifier: string | null;
  signedFileAssetId: string | null;
  failureReason: string | null;
  expiresAt: Date | null;
  completedAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

function toSignatureSessionRow(
  row: typeof schema.signatureSessions.$inferSelect,
): SignatureSessionRow {
  return {
    id: row.id,
    draftId: row.draftId,
    sessionId: row.sessionId,
    paymentAttemptId: row.paymentAttemptId,
    signatureFlowMode: row.signatureFlowMode,
    provider: row.provider,
    eligibilityStatus: row.eligibilityStatus,
    eligibilityReasons: Array.isArray(row.eligibilityReasons)
      ? (row.eligibilityReasons as SignatureEligibilityReasonValue[])
      : [],
    status: row.status,
    providerSessionId: row.providerSessionId,
    handoffUrl: row.handoffUrl,
    oidcState: row.oidcState,
    oidcNonce: row.oidcNonce,
    pkceCodeVerifier: row.pkceCodeVerifier,
    signedFileAssetId: row.signedFileAssetId,
    failureReason: row.failureReason,
    expiresAt: row.expiresAt,
    completedAt: row.completedAt,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getLatestSignatureSession(
  db: Db,
  draftId: string,
): Promise<SignatureSessionRow | null> {
  const [row] = await db
    .select()
    .from(schema.signatureSessions)
    .where(eq(schema.signatureSessions.draftId, draftId))
    .orderBy(desc(schema.signatureSessions.createdAt))
    .limit(1);

  return row ? toSignatureSessionRow(row) : null;
}

export async function getSignatureSessionById(
  db: Db,
  signatureSessionId: string,
): Promise<SignatureSessionRow | null> {
  const [row] = await db
    .select()
    .from(schema.signatureSessions)
    .where(eq(schema.signatureSessions.id, signatureSessionId))
    .limit(1);

  return row ? toSignatureSessionRow(row) : null;
}

export async function createSignatureSession(
  db: Db,
  input: {
    draftId: string;
    sessionId: string;
    paymentAttemptId?: string | null;
    signatureFlowMode: SignatureFlowModeValue;
    provider: string;
    eligibilityStatus: SignatureEligibilityStatusValue;
    eligibilityReasons?: SignatureEligibilityReasonValue[];
    status: SignatureSessionStatusValue;
    providerSessionId?: string | null;
    handoffUrl?: string | null;
    oidcState?: string | null;
    oidcNonce?: string | null;
    pkceCodeVerifier?: string | null;
    expiresAt?: Date | null;
    metadata?: unknown;
  },
): Promise<SignatureSessionRow> {
  const [row] = await db
    .insert(schema.signatureSessions)
    .values({
      draftId: input.draftId,
      sessionId: input.sessionId,
      paymentAttemptId: input.paymentAttemptId ?? null,
      signatureFlowMode: input.signatureFlowMode,
      provider: input.provider as
        | "none"
        | "mock"
        | "swisssign"
        | "swisssign_mock"
        | "platform_aes"
        | "skribble"
        | "swisscom_ais",
      eligibilityStatus: input.eligibilityStatus,
      eligibilityReasons: input.eligibilityReasons ?? [],
      status: input.status,
      providerSessionId: input.providerSessionId ?? null,
      handoffUrl: input.handoffUrl ?? null,
      oidcState: input.oidcState ?? null,
      oidcNonce: input.oidcNonce ?? null,
      pkceCodeVerifier: input.pkceCodeVerifier ?? null,
      expiresAt: input.expiresAt ?? null,
      metadata: input.metadata ?? null,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create signature session");
  }

  return toSignatureSessionRow(row);
}

export async function transitionSignatureSessionStatus(
  db: Db,
  signatureSessionId: string,
  nextStatus: SignatureSessionStatusValue,
  patch?: {
    paymentAttemptId?: string | null;
    providerSessionId?: string | null;
    handoffUrl?: string | null;
    oidcState?: string | null;
    oidcNonce?: string | null;
    pkceCodeVerifier?: string | null;
    signedFileAssetId?: string | null;
    failureReason?: string | null;
    expiresAt?: Date | null;
    completedAt?: Date | null;
    eligibilityStatus?: SignatureEligibilityStatusValue;
    eligibilityReasons?: SignatureEligibilityReasonValue[];
    metadata?: unknown;
  },
): Promise<SignatureSessionRow> {
  const existing = await getSignatureSessionById(db, signatureSessionId);
  if (!existing) {
    throw notFoundError("signature session");
  }

  if (existing.status !== nextStatus) {
    assertTransitionSignatureSession(existing.status, nextStatus);
  }

  const [row] = await db
    .update(schema.signatureSessions)
    .set({
      status: nextStatus,
      paymentAttemptId:
        patch?.paymentAttemptId === undefined
          ? existing.paymentAttemptId
          : patch.paymentAttemptId,
      providerSessionId:
        patch?.providerSessionId === undefined
          ? existing.providerSessionId
          : patch.providerSessionId,
      handoffUrl:
        patch?.handoffUrl === undefined ? existing.handoffUrl : patch.handoffUrl,
      oidcState: patch?.oidcState === undefined ? existing.oidcState : patch.oidcState,
      oidcNonce: patch?.oidcNonce === undefined ? existing.oidcNonce : patch.oidcNonce,
      pkceCodeVerifier:
        patch?.pkceCodeVerifier === undefined
          ? existing.pkceCodeVerifier
          : patch.pkceCodeVerifier,
      signedFileAssetId:
        patch?.signedFileAssetId === undefined
          ? existing.signedFileAssetId
          : patch.signedFileAssetId,
      failureReason:
        patch?.failureReason === undefined ? existing.failureReason : patch.failureReason,
      expiresAt: patch?.expiresAt === undefined ? existing.expiresAt : patch.expiresAt,
      completedAt:
        patch?.completedAt === undefined ? existing.completedAt : patch.completedAt,
      eligibilityStatus:
        patch?.eligibilityStatus === undefined
          ? existing.eligibilityStatus
          : patch.eligibilityStatus,
      eligibilityReasons:
        patch?.eligibilityReasons === undefined
          ? existing.eligibilityReasons
          : patch.eligibilityReasons,
      metadata: patch?.metadata === undefined ? existing.metadata : patch.metadata,
      updatedAt: new Date(),
    })
    .where(eq(schema.signatureSessions.id, signatureSessionId))
    .returning();

  if (!row) {
    throw notFoundError("signature session");
  }

  return toSignatureSessionRow(row);
}

export async function recordSignatureEvent(
  db: Db,
  input: {
    signatureSessionId: string;
    draftId: string;
    eventSource: string;
    eventType: string;
    eventKey: string;
    payload?: unknown;
    processedAt?: Date | null;
  },
): Promise<boolean> {
  const [existing] = await db
    .select({ id: schema.signatureEvents.id })
    .from(schema.signatureEvents)
    .where(eq(schema.signatureEvents.eventKey, input.eventKey))
    .limit(1);

  if (existing) {
    return false;
  }

  await db.insert(schema.signatureEvents).values({
    signatureSessionId: input.signatureSessionId,
    draftId: input.draftId,
    eventSource: input.eventSource,
    eventType: input.eventType,
    eventKey: input.eventKey,
    payload: input.payload ?? null,
    processedAt: input.processedAt ?? null,
  });

  return true;
}

export async function getSignatureSessionByProviderSessionId(
  db: Db,
  providerSessionId: string,
): Promise<SignatureSessionRow | null> {
  const [row] = await db
    .select()
    .from(schema.signatureSessions)
    .where(eq(schema.signatureSessions.providerSessionId, providerSessionId))
    .limit(1);

  return row ? toSignatureSessionRow(row) : null;
}

export async function getSignatureSessionForDraftPayment(
  db: Db,
  draftId: string,
  paymentAttemptId: string,
): Promise<SignatureSessionRow | null> {
  const [row] = await db
    .select()
    .from(schema.signatureSessions)
    .where(
      and(
        eq(schema.signatureSessions.draftId, draftId),
        eq(schema.signatureSessions.paymentAttemptId, paymentAttemptId),
      ),
    )
    .orderBy(desc(schema.signatureSessions.createdAt))
    .limit(1);

  return row ? toSignatureSessionRow(row) : null;
}
