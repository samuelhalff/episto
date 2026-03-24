import type { Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import {
  createWorker,
  QUEUE_NAMES,
  type SubmitDispatchJob,
  type SendEmailJob,
  getQueue,
} from "../queue/index.js";
import { createLogger } from "../shared/logging/index.js";
import { getDb, schema } from "../db/index.js";
import { notFoundError, validationError } from "../shared/errors/index.js";
import {
  createDispatchAttempt,
  transitionDispatchState,
} from "../modules/dispatch/dispatch.service.js";
import { getDispatchAdapter } from "../modules/dispatch/adapters/postal.adapter.js";
import { recordEvent } from "../modules/analytics/index.js";

const logger = createLogger("submit-dispatch-worker");

/**
 * Submit-dispatch worker — submits a rendered letter to the postal provider.
 *
 * Trigger: Payment confirmed (captured).
 * Steps:
 *   1. Create dispatch_attempt record (state: queued)
 *   2. Load snapshot + rendered PDF + recipient details
 *   3. Submit to postal provider via adapter
 *   4. Transition dispatch state to "submitted" or "rejected"
 *   5. Transition draft status to "submitted"
 *   6. Enqueue dispatch-submitted notification email
 */
export function startSubmitDispatchWorker(): Worker<SubmitDispatchJob> {
  return createWorker<SubmitDispatchJob>(
    QUEUE_NAMES.SUBMIT_DISPATCH,
    async (job: Job<SubmitDispatchJob>) => {
      const { draftId, snapshotId, paymentId } = job.data;
      const db = getDb();
      const adapter = getDispatchAdapter();

      logger.info({ draftId, snapshotId, paymentId }, "Starting dispatch submission");

      // 1. Create dispatch attempt
      const attempt = await createDispatchAttempt(db, {
        draftId,
        snapshotId,
        providerName: "swiss-post-direct",
      });

      // 2. Load snapshot data to get recipient and PDF info
      const [snapshot] = await db
        .select()
        .from(schema.draftSnapshots)
        .where(eq(schema.draftSnapshots.id, snapshotId))
        .limit(1);

      if (!snapshot) {
        throw notFoundError(`snapshot ${snapshotId}`);
      }

      const snapshotData = snapshot.snapshotData as {
        deliveryType?: string;
        recipient?: {
          firstName?: string;
          lastName?: string;
          company?: string;
          addressLine1: string;
          postalCode: string;
          city: string;
          country: string;
        };
      };

      if (!snapshotData.recipient) {
        throw validationError(`Snapshot ${snapshotId} missing recipient data`);
      }

      // Get the rendered PDF storage key
      const pdfAsset = snapshot.renderedPdfAssetId
        ? await db
            .select()
            .from(schema.fileAssets)
            .where(eq(schema.fileAssets.id, snapshot.renderedPdfAssetId))
            .limit(1)
            .then((rows) => rows[0])
        : null;

      if (!pdfAsset) {
        throw notFoundError(`rendered PDF for snapshot ${snapshotId}`);
      }

      // 3. Submit to provider
      const recipient = snapshotData.recipient;
      const recipientName = [recipient.firstName, recipient.lastName, recipient.company]
        .filter(Boolean)
        .join(" ");

      try {
        const result = await adapter.submitJob(
          pdfAsset.storageKey,
          {
            name: recipientName,
            addressLine1: recipient.addressLine1,
            postalCode: recipient.postalCode,
            city: recipient.city,
            country: recipient.country,
          },
          snapshotData.deliveryType ?? "standard",
        );

        // 4. Transition to submitted
        await transitionDispatchState(db, attempt.id, "submitted", {
          providerReference: result.providerReference,
          providerPayload: result.providerPayload,
        });

        recordEvent({
          event: "dispatch_submitted",
          draftId,
          dispatchAttemptId: attempt.id,
          deliveryType: snapshotData.deliveryType ?? "standard",
        });

        // 5. Transition draft to submitted
        await db
          .update(schema.draftLetters)
          .set({ status: "submitted", updatedAt: new Date() })
          .where(eq(schema.draftLetters.id, draftId));

        // 6. Enqueue notification email
        const [draft] = await db
          .select({ sessionId: schema.draftLetters.sessionId })
          .from(schema.draftLetters)
          .where(eq(schema.draftLetters.id, draftId))
          .limit(1);

        const [session] = draft
          ? await db
              .select()
              .from(schema.sessions)
              .where(eq(schema.sessions.id, draft.sessionId))
              .limit(1)
          : [];

        if (session?.email) {
          const emailQueue = getQueue(QUEUE_NAMES.SEND_EMAIL);
          await emailQueue.add("dispatch-submitted", {
            to: session.email,
            template: "dispatch-submitted",
            locale: session.locale,
            data: { orderRef: draftId },
          } satisfies SendEmailJob);
        }

        logger.info(
          { draftId, dispatchId: attempt.id, ref: result.providerReference },
          "Dispatch submitted successfully",
        );

        job.log(`Dispatch submitted: ref=${result.providerReference}`);
      } catch (err) {
        // If provider rejects, record the failure
        const message = err instanceof Error ? err.message : "Unknown error";
        await transitionDispatchState(db, attempt.id, "rejected", {
          failureReason: message,
        });

        logger.error({ draftId, dispatchId: attempt.id, err: message }, "Dispatch rejected");
        throw err; // Re-throw for BullMQ retry logic
      }
    },
    { concurrency: 3 },
  );
}
