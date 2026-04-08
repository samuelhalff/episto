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

vi.mock("../src/modules/dispatch/dispatch-rate-matrix-sync.service.js", () => ({
  syncDispatchRateMatrix: vi.fn().mockResolvedValue({
    versionId: "matrix-version-1",
    entryCount: 20,
    expiresAt: new Date("2026-04-09T06:05:00.000Z"),
  }),
}));

it("refresh worker delegates to syncDispatchRateMatrix", async () => {
  const queue = await import("../src/queue/index.js");
  const { getDb } = await import("../src/db/index.js");
  const { syncDispatchRateMatrix } = await import(
    "../src/modules/dispatch/dispatch-rate-matrix-sync.service.js"
  );
  const { startRefreshDispatchRatesWorker } = await import(
    "../src/workers/refresh-dispatch-rates.worker.js"
  );

  const worker = startRefreshDispatchRatesWorker();
  expect(worker.name).toBe("refresh-dispatch-rates");
  const processor = vi.mocked(queue.createWorker).mock.calls[0]?.[1];
  await processor?.({} as never);
  expect(syncDispatchRateMatrix).toHaveBeenCalledWith({ db: getDb() });
  await worker.close();
});
