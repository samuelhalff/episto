import type { Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { createWorker, QUEUE_NAMES, type RenderPdfJob } from "../queue/index.js";
import { createLogger } from "../shared/logging/index.js";
import { getDb } from "../db/index.js";
import { schema } from "../db/index.js";
import { renderSnapshotToPdf } from "../modules/rendering/render.service.js";
import { getPaymentForDraft } from "../modules/payments/payment.service.js";
import { enqueueDispatchSubmission } from "../modules/dispatch/dispatch.jobs.js";

const logger = createLogger("render-pdf-worker");

/**
 * Render-PDF worker — takes a snapshot and generates a PDF via Puppeteer.
 *
 * Trigger: Draft marked as "rendering" (status transition).
 * Steps:
 *   1. Load snapshot data from DB
 *   2. Render HTML → PDF via render.service
 *   3. Upload PDF to object storage (handled by render.service)
 *   4. Create file_asset record (handled by render.service)
 *   5. Transition draft status to "ready"
 */
export function startRenderPdfWorker(): Worker<RenderPdfJob> {
  return createWorker<RenderPdfJob>(
    QUEUE_NAMES.RENDER_PDF,
    async (job: Job<RenderPdfJob>) => {
      const { snapshotId, draftId } = job.data;

      logger.info({ snapshotId, draftId }, "Starting PDF render");

      const result = await renderSnapshotToPdf(snapshotId);

      logger.info(
        {
          snapshotId,
          draftId,
          pdfAssetId: result.pdfAssetId,
          pageCount: result.pageCount,
          sizeBytes: result.sizeBytes,
        },
        "PDF render complete",
      );

      // Transition draft to "ready" after successful render
      const db = getDb();
      await db
        .update(schema.draftLetters)
        .set({
          status: "ready",
          estimatedPages: result.pageCount,
          updatedAt: new Date(),
        })
        .where(eq(schema.draftLetters.id, draftId));

      const payment = await getPaymentForDraft(db, draftId);
      if (payment && ["authorized", "captured"].includes(payment.state)) {
        await enqueueDispatchSubmission({
          draftId,
          snapshotId,
          paymentId: payment.id,
        });
      }

      job.log(
        `PDF rendered: asset=${result.pdfAssetId}, pages=${result.pageCount}, size=${result.sizeBytes}`,
      );
    },
    { concurrency: 2 },
  );
}
