import { loadEnv, env } from "./shared/config/index.js";
import { createLogger } from "./shared/logging/index.js";
import { buildApp } from "./app.js";

async function main(): Promise<void> {
  loadEnv();
  const config = env();
  const logger = createLogger();

  const app = await buildApp(logger);

  await app.listen({ port: config.PORT, host: config.HOST });
  logger.info(`Server listening on ${config.HOST}:${config.PORT}`);
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
