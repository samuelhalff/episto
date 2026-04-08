import { createWorker, QUEUE_NAMES, type RefreshDispatchRatesJob } from "../queue/index.js";
import { createLogger } from "../shared/logging/index.js";
import { getDb } from "../db/index.js";
import { syncDispatchRateMatrix } from "../modules/dispatch/dispatch-rate-matrix-sync.service.js";

const logger = createLogger("refresh-dispatch-rates-worker");

export function startRefreshDispatchRatesWorker() {
  return createWorker<RefreshDispatchRatesJob>(
    QUEUE_NAMES.REFRESH_DISPATCH_RATES,
    async () => {
      logger.info("Starting dispatch rate matrix refresh");
      const result = await syncDispatchRateMatrix({ db: getDb() });
      logger.info({ result }, "Dispatch rate matrix refresh complete");
    },
    { concurrency: 1 },
  );
}
