import type { Job, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { createWorker, QUEUE_NAMES, type RenderPdfJob } from "../queue/index.js";
import { createLogger } from "../shared/logging/index.js";
import { getDb } from "../db/index.js";
import { schema } from "../db/index.js";
import { renderSnapshotToPdf } from "../modules/rendering/render.service.js";
import { getPaymentForDraft } from "../modules/payments/payment.service.js";
import { enqueueDispatchSubmission } from "../modules/dispatch/dispatch.jobs.js";
import { transitionDraftStatus } from "../modules/drafting/draft.service.js";
import { setInitialDraftFulfillmentStatus } from "../modules/signing/fulfillment.service.js";
import { isSwissSignFlowMode } from "../modules/signing/signature-flow.js";

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
 *   5. Persist the final page count and transition draft status
 */
export async function processRenderPdfJob(job: Job<RenderPdfJob>): Promise<void> {
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

  const db = getDb();
  const [current] = await db
    .select({
      status: schema.draftLetters.status,
      sessionId: schema.draftLetters.sessionId,
      signatureFlowMode: schema.draftLetters.signatureFlowMode,
    })
    .from(schema.draftLetters)
    .where(eq(schema.draftLetters.id, draftId))
    .limit(1);

  if (current?.status !== "rendering" || !current.sessionId) {
    logger.info(
      { draftId, currentStatus: current?.status },
      "Draft is no longer rendering; skipping post-render transition",
    );
    return;
  }

  await db
    .update(schema.draftLetters)
    .set({
      estimatedPages: result.pageCount,
      updatedAt: new Date(),
    })
    .where(eq(schema.draftLetters.id, draftId));

  if (result.pageCount > 5) {
    await transitionDraftStatus(db, draftId, current.sessionId, "collecting");
    job.log("PDF rendered with more than 5 pages; returning draft to editing");
    return;
  }

  const nextStatus = isSwissSignFlowMode(current.signatureFlowMode)
    ? "ready_to_sign"
    : "ready";

  await transitionDraftStatus(db, draftId, current.sessionId, nextStatus);
  await setInitialDraftFulfillmentStatus(db, draftId, current.signatureFlowMode);

  if (nextStatus !== "ready") {
    job.log(`PDF rendered and frozen for signing: asset=${result.pdfAssetId}`);
    return;
  }

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
}

export function startRenderPdfWorker(): Worker<RenderPdfJob> {
  return createWorker<RenderPdfJob>(QUEUE_NAMES.RENDER_PDF, processRenderPdfJob, {
    concurrency: 2,
  });
}
