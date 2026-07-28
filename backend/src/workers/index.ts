import type { Worker } from "bullmq";
import { createLogger } from "../shared/logging/index.js";
import { startEmailWorker } from "./email.worker.js";
import { startRenderPdfWorker } from "./render-pdf.worker.js";
import { startSubmitDispatchWorker } from "./submit-dispatch.worker.js";
import { startReconcileDispatchWorker } from "./reconcile-dispatch.worker.js";
import { startCleanupAssetsWorker } from "./cleanup-assets.worker.js";
import { startRefreshDispatchRatesWorker } from "./refresh-dispatch-rates.worker.js";
import { startDispatchLivenessWorker } from "./dispatch-liveness.worker.js";

const logger = createLogger();

const workers: Worker[] = [];

/**
 * Start all BullMQ workers.
 * Called from server.ts after env is loaded and Redis is available.
 * Workers run in-process for MVP simplicity. They can be extracted
 * into a separate process if needed for scaling.
 */
export function startWorkers(): void {
  const emailWorker = startEmailWorker();
  const renderPdfWorker = startRenderPdfWorker();
  const submitDispatchWorker = startSubmitDispatchWorker();
  const reconcileDispatchWorker = startReconcileDispatchWorker();
  const cleanupAssetsWorker = startCleanupAssetsWorker();
  const refreshDispatchRatesWorker = startRefreshDispatchRatesWorker();
  const dispatchLivenessWorker = startDispatchLivenessWorker();

  workers.push(
    emailWorker,
    renderPdfWorker,
    submitDispatchWorker,
    reconcileDispatchWorker,
    cleanupAssetsWorker,
    refreshDispatchRatesWorker,
    dispatchLivenessWorker,
  );

  // Log completion/failure events for all workers
  for (const worker of workers) {
    worker.on("completed", (job) => {
      logger.info({ queue: worker.name, jobId: job?.id }, "Job completed");
    });
    worker.on("failed", (job, err) => {
      logger.error(
        { queue: worker.name, jobId: job?.id, err: err.message },
        "Job failed",
      );
    });
  }

  logger.info(`Started ${workers.length} worker(s)`);
}

/**
 * Gracefully shut down all workers.
 * Called during server shutdown.
 */
export async function stopWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  workers.length = 0;
  logger.info("All workers stopped");
}
