import { createWorker, QUEUE_NAMES, type RefreshDispatchRatesJob } from "../queue/index.js";
import { createLogger } from "../shared/logging/index.js";
import { getDb } from "../db/index.js";
import { refreshDispatchRateMatrixIfNeeded } from "../modules/dispatch/dispatch-rate-matrix.service.js";

const logger = createLogger("refresh-dispatch-rates-worker");

export function startRefreshDispatchRatesWorker() {
  return createWorker<RefreshDispatchRatesJob>(
    QUEUE_NAMES.REFRESH_DISPATCH_RATES,
    async () => {
      logger.info("Checking dispatch rate matrix for staleness");
      await refreshDispatchRateMatrixIfNeeded(getDb(), new Date());
      logger.info("Dispatch rate matrix refresh check complete");
    },
    { concurrency: 1 },
  );
}
