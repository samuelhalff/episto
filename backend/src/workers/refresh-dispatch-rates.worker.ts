import { createWorker, QUEUE_NAMES, type RefreshDispatchRatesJob } from "../queue/index.js";
import { getDb } from "../db/index.js";
import { refreshDispatchRateMatrixIfNeeded } from "../modules/dispatch/dispatch-rate-matrix.service.js";

export function startRefreshDispatchRatesWorker() {
  return createWorker<RefreshDispatchRatesJob>(
    QUEUE_NAMES.REFRESH_DISPATCH_RATES,
    async () => {
      await refreshDispatchRateMatrixIfNeeded(getDb(), new Date());
    },
  );
}
