import { describe, expect, it, vi } from "vitest";

import { refreshDispatchRateMatrixIfNeeded } from "../src/modules/dispatch/dispatch-rate-matrix.service.js";

describe("refreshDispatchRateMatrixIfNeeded", () => {
  it("retires active matrix versions whose expiry has passed", async () => {
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            { id: "matrix-1" },
            { id: "matrix-2" },
          ]),
        })),
      })),
      update: vi.fn(() => ({
        set: updateSet,
      })),
    };
    const now = new Date("2026-04-07T12:00:00.000Z");

    await refreshDispatchRateMatrixIfNeeded(db as never, now);

    expect(db.update).toHaveBeenCalledTimes(2);
    expect(updateSet).toHaveBeenCalledWith({
      status: "retired",
      updatedAt: now,
    });
    expect(updateWhere).toHaveBeenCalledTimes(2);
  });

  it("does nothing when no active matrix version is expired", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      })),
      update: vi.fn(),
    };

    await refreshDispatchRateMatrixIfNeeded(db as never, new Date("2026-04-07T12:00:00.000Z"));

    expect(db.update).not.toHaveBeenCalled();
  });
});
