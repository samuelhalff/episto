import { expect, it, vi } from "vitest";

const mockWorker = {
  name: "refresh-dispatch-rates",
  close: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../src/queue/index.js", () => ({
  QUEUE_NAMES: {
    REFRESH_DISPATCH_RATES: "refresh-dispatch-rates",
  },
  createWorker: vi.fn(() => mockWorker),
}));

vi.mock("../src/db/index.js", () => ({
  getDb: vi.fn(),
}));

vi.mock("../src/modules/dispatch/dispatch-rate-matrix.service.js", () => ({
  refreshDispatchRateMatrixIfNeeded: vi.fn(),
}));

it("refresh worker delegates to refreshDispatchRateMatrixIfNeeded", async () => {
  const { refreshDispatchRateMatrixIfNeeded } =
    await import("../src/modules/dispatch/dispatch-rate-matrix.service.js");
  const { startRefreshDispatchRatesWorker } =
    await import("../src/workers/refresh-dispatch-rates.worker.js");

  const worker = startRefreshDispatchRatesWorker();
  expect(worker.name).toBe("refresh-dispatch-rates");
  expect(refreshDispatchRateMatrixIfNeeded).not.toHaveBeenCalled();
  await worker.close();
});

