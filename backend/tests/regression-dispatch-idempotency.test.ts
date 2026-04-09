/**
 * Regression: Dispatch idempotency guard must not corrupt state or swallow
 * legitimate transitions.
 *
 * User stories:
 * - "As a system, retrying a queued→submitted transition that already succeeded
 *    returns the current row without error (webhook/job retries are safe)."
 * - "As a system, a legitimate queued→submitted transition still works."
 * - "As a system, an illegal transition (e.g. accepted→queued) is still rejected."
 * - "As a system, idempotent no-ops do NOT record duplicate state events."
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError } from "../src/shared/errors/index.js";

const mocks = vi.hoisted(() => {
  const dispatchRow = {
    id: "disp-1",
    draftId: "draft-1",
    snapshotId: "snap-1",
    paymentAttemptId: "pa-1",
    state: "queued",
    providerName: "epost",
    providerReference: null,
    trackingNumber: null,
    submittedAt: null,
    lastCheckedAt: null,
    failureReason: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  return {
    dispatchRow: { ...dispatchRow },
    selectResult: [{ ...dispatchRow }] as unknown[],
    updateResult: [] as unknown[],
    insertEventResult: [
      {
        id: "evt-1",
        dispatchAttemptId: "disp-1",
        previousState: null,
        newState: "submitted",
        source: "system",
        createdAt: new Date(),
      },
    ],
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  };
});

vi.mock("../src/shared/logging/index.js", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

function makeFakeDb() {
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(mocks.selectResult),
  };
  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(mocks.updateResult),
  };
  const insertChain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(mocks.insertEventResult),
  };

  return {
    select: vi.fn().mockReturnValue(selectChain),
    update: vi.fn().mockReturnValue(updateChain),
    insert: vi.fn().mockReturnValue(insertChain),
    _selectChain: selectChain,
    _updateChain: updateChain,
    _insertChain: insertChain,
  };
}

vi.mock("../src/db/index.js", () => ({
  getDb: vi.fn(),
  schema: {
    dispatchAttempts: {
      id: "dispatch_attempts.id",
      draftId: "dispatch_attempts.draft_id",
      state: "dispatch_attempts.state",
      providerReference: "dispatch_attempts.provider_reference",
      createdAt: "dispatch_attempts.created_at",
    },
    dispatchStatusEvents: {
      id: "dispatch_status_events.id",
      dispatchAttemptId: "dispatch_status_events.dispatch_attempt_id",
      previousState: "dispatch_status_events.previous_state",
      newState: "dispatch_status_events.new_state",
      source: "dispatch_status_events.source",
      createdAt: "dispatch_status_events.created_at",
    },
    draftLetters: {
      id: "draft_letters.id",
      sessionId: "draft_letters.session_id",
    },
  },
}));

describe("regression: dispatch state transition idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns current row when transition target equals current state (idempotent retry)", async () => {
    // Dispatch is already "submitted" and we try to transition to "submitted" again
    const submittedRow = {
      ...mocks.dispatchRow,
      state: "submitted",
      submittedAt: new Date("2026-01-02"),
    };
    const db = makeFakeDb();
    db._selectChain.limit.mockResolvedValue([submittedRow]);

    const { transitionDispatchState } = await import(
      "../src/modules/dispatch/dispatch.service.js"
    );
    const result = await transitionDispatchState(
      db as never,
      "disp-1",
      "submitted",
    );

    expect(result.state).toBe("submitted");
    // Must NOT have called update (no DB write for no-op)
    expect(db.update).not.toHaveBeenCalled();
    // Must NOT have inserted a state event (no duplicate audit trail)
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("performs a legitimate queued→submitted transition", async () => {
    const queuedRow = { ...mocks.dispatchRow, state: "queued" };
    const submittedRow = {
      ...mocks.dispatchRow,
      state: "submitted",
      submittedAt: new Date(),
      updatedAt: new Date(),
    };
    const db = makeFakeDb();
    db._selectChain.limit.mockResolvedValue([queuedRow]);
    db._updateChain.returning.mockResolvedValue([submittedRow]);

    const { transitionDispatchState } = await import(
      "../src/modules/dispatch/dispatch.service.js"
    );
    const result = await transitionDispatchState(
      db as never,
      "disp-1",
      "submitted",
    );

    expect(result.state).toBe("submitted");
    expect(db.update).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled(); // state event recorded
  });

  it("rejects an illegal transition (accepted→queued)", async () => {
    const acceptedRow = { ...mocks.dispatchRow, state: "accepted" };
    const db = makeFakeDb();
    db._selectChain.limit.mockResolvedValue([acceptedRow]);

    const { transitionDispatchState } = await import(
      "../src/modules/dispatch/dispatch.service.js"
    );

    await expect(
      transitionDispatchState(db as never, "disp-1", "queued"),
    ).rejects.toThrow(AppError);
  });

  it("rejects transitioning from a terminal state (rejected→submitted)", async () => {
    const rejectedRow = { ...mocks.dispatchRow, state: "rejected" };
    const db = makeFakeDb();
    db._selectChain.limit.mockResolvedValue([rejectedRow]);

    const { transitionDispatchState } = await import(
      "../src/modules/dispatch/dispatch.service.js"
    );

    await expect(
      transitionDispatchState(db as never, "disp-1", "submitted"),
    ).rejects.toThrow(AppError);
  });

  it("idempotent no-op on queued→queued also works", async () => {
    const queuedRow = { ...mocks.dispatchRow, state: "queued" };
    const db = makeFakeDb();
    db._selectChain.limit.mockResolvedValue([queuedRow]);

    const { transitionDispatchState } = await import(
      "../src/modules/dispatch/dispatch.service.js"
    );
    const result = await transitionDispatchState(
      db as never,
      "disp-1",
      "queued",
    );

    expect(result.state).toBe("queued");
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });
});
