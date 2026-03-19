import type { Worker } from "bullmq";
import { createLogger } from "../shared/logging/index.js";
import { startEmailWorker } from "./email.worker.js";

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
  workers.push(emailWorker);

  emailWorker.on("completed", (job) => {
    logger.info({ jobId: job?.id, template: job?.data.template }, "Email job completed");
  });
  emailWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "Email job failed");
  });

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
