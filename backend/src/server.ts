import { loadEnv, env } from "./shared/config/index.js";
import { createLogger } from "./shared/logging/index.js";
import { buildApp } from "./app.js";
import { startWorkers, stopWorkers } from "./workers/index.js";
import { closeAllQueues } from "./queue/index.js";

async function main(): Promise<void> {
  loadEnv();
  const config = env();
  const logger = createLogger();

  const app = await buildApp(logger);

  // Start BullMQ workers (in-process for MVP)
  startWorkers();

  await app.listen({ port: config.PORT, host: config.HOST });
  logger.info(`Server listening on ${config.HOST}:${config.PORT}`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down…");
    await app.close();
    await stopWorkers();
    await closeAllQueues();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
