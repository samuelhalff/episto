/**
 * Standalone worker process entrypoint.
 *
 * Used by the `worker` Docker service (separate from the API server):
 *   CMD ["node", "dist/workers/runner.js"]
 *
 * Loads env, starts all BullMQ workers, and handles graceful shutdown
 * on SIGTERM/SIGINT. The worker process does not start an HTTP server.
 */
import { loadEnv } from "../shared/config/index.js";
import { createLogger } from "../shared/logging/index.js";
import { startWorkers, stopWorkers } from "./index.js";
import { closeAllQueues, registerScheduledJobs } from "../queue/index.js";
import { closeDb } from "../db/index.js";

loadEnv();
const logger = createLogger();

logger.info("Starting worker process");
startWorkers();
void registerScheduledJobs().then(() => {
  logger.info("Scheduled jobs registered");
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, "Worker shutting down…");
  try {
    await stopWorkers();
    await closeAllQueues();
    await closeDb();
    logger.info("Worker shutdown complete");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "Error during worker shutdown");
    process.exit(1);
  }
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception in worker process");
  void shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection in worker process");
  void shutdown("unhandledRejection");
});
