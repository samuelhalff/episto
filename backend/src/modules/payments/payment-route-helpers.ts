import type { FastifyBaseLogger } from "fastify";
import type { Db } from "../../db/index.js";
import { enqueueDispatchSubmission } from "../dispatch/dispatch.jobs.js";
import { canSubmitDispatchForDraft } from "../dispatch/dispatch-eligibility.js";
import { getLatestSnapshot } from "../rendering/snapshot.service.js";
import { getPaymentAttemptById } from "./payment.service.js";
import { getLatestSignatureSession } from "../signing/signature-session.service.js";
import { schema } from "../../db/index.js";
import { eq } from "drizzle-orm";

export async function enqueueDispatchIfEligible(options: {
  db: Db;
  draftId: string;
  paymentId: string;
  log: Pick<FastifyBaseLogger, "error">;
  failureMessage: string;
  suppressFailure?: boolean;
}): Promise<void> {
  const {
    db,
    draftId,
    paymentId,
    log,
    failureMessage,
    suppressFailure = false,
  } = options;

  try {
    const [draft, payment, snapshot, signatureSession] = await Promise.all([
      db
        .select({
          signatureFlowMode: schema.draftLetters.signatureFlowMode,
        })
        .from(schema.draftLetters)
        .where(eq(schema.draftLetters.id, draftId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      getPaymentAttemptById(db, paymentId),
      getLatestSnapshot(db, draftId),
      getLatestSignatureSession(db, draftId),
    ]);

    if (
      draft &&
      payment &&
      snapshot &&
      canSubmitDispatchForDraft({
        signatureFlowMode: draft.signatureFlowMode,
        paymentState: payment.state as
          | "pending"
          | "authorized"
          | "captured"
          | "failed"
          | "cancelled"
          | "refund_pending"
          | "refunded"
          | "partially_refunded",
        signatureSessionStatus: signatureSession?.status ?? null,
        signedFileAssetId: signatureSession?.signedFileAssetId ?? null,
        renderedPdfAssetId: snapshot.renderedPdfAssetId,
      })
    ) {
      await enqueueDispatchSubmission({
        draftId,
        snapshotId: snapshot.id,
        paymentId,
      });
    }
  } catch (err) {
    log.error({ err, draftId, paymentId }, failureMessage);
    if (!suppressFailure) {
      throw err;
    }
  }
}
