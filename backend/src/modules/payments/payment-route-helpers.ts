import type { FastifyBaseLogger } from "fastify";
import type { Db } from "../../db/index.js";
import { enqueueDispatchSubmission } from "../dispatch/dispatch.jobs.js";
import { canSubmitDispatchForDraft } from "../dispatch/dispatch-eligibility.js";
import { getLatestSnapshot } from "../rendering/snapshot.service.js";
import { getPaymentAttemptById } from "./payment.service.js";
import { schema } from "../../db/index.js";
import { eq } from "drizzle-orm";
import { acquireRedisLock } from "../../shared/redis-lock.js";

export async function enqueueDispatchIfEligible(options: {
  db: Db;
  draftId: string;
  paymentId: string;
  log: Pick<FastifyBaseLogger, "error" | "warn">;
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

  // Acquire a short-lived Redis lock to collapse concurrent enqueue attempts
  // (webhook + checkout-success). If Redis is UNAVAILABLE we proceed WITHOUT the
  // lock rather than fail the payment→dispatch path: the partial unique index
  // dispatch_attempts_payment_attempt_id_uniq (migration 0014) is the durable
  // idempotency guarantee, so a Redis outage degrades gracefully instead of
  // 500-ing payment reconciliation. `null` from a successful call means the lock
  // is held elsewhere (real contention) → skip; a thrown error means Redis is
  // down → proceed.
  const lockKey = `dispatch:enqueue:${paymentId}`;
  let lock: Awaited<ReturnType<typeof acquireRedisLock>> = null;
  let redisAvailable = true;
  try {
    lock = await acquireRedisLock(lockKey, 30_000);
  } catch (err) {
    redisAvailable = false;
    log.warn(
      { err, paymentId, draftId, lockKey },
      "Redis unavailable acquiring dispatch-enqueue lock; proceeding without it (DB unique index enforces idempotency)",
    );
  }
  if (redisAvailable && !lock) {
    log.warn(
      { paymentId, draftId, lockKey },
      "Skipping dispatch enqueue — lock held by another process",
    );
    return;
  }

  try {
    const [draft, payment, snapshot] = await Promise.all([
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
  } finally {
    if (lock) {
      await lock.release();
    }
  }
}
