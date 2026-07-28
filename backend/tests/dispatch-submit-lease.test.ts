import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentDb: null as ReturnType<typeof createDbMock> | null,
  createWorker: vi.fn(),
  emailQueueAdd: vi.fn().mockResolvedValue(undefined),
  createDispatchAttempt: vi.fn(),
  getDispatchAttemptByPaymentAttemptId: vi.fn(),
  getDispatchAttempt: vi.fn(),
  transitionDispatchState: vi.fn(),
  claimDispatchAttempt: vi.fn(),
  releaseDispatchClaim: vi.fn(),
  markDispatchSubmissionStarted: vi.fn(),
  adapterSubmit: vi.fn(),
  adapterCheckStatus: vi.fn(),
  recordEvent: vi.fn(),
  buildDispatchPackage: vi.fn(),
  settlePaymentForDispatchResolution: vi.fn(),
  canFinalizeDispatchResolution: vi.fn(),
  updateDraftStatusForDispatchResolution: vi.fn(),
  updateDraftStatusForDispatchSubmission: vi.fn(),
  enqueueDispatchReconciliation: vi.fn(),
  enqueueDispatchAcceptedEmail: vi.fn(),
  enqueueDispatchSubmittedEmail: vi.fn(),
  enqueueDispatchFailedEmail: vi.fn(),
  acquireRedisLock: vi.fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function createDbMock(selectResults: unknown[][] = [[]]) {
  let selectIndex = 0;
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));
  const select = vi.fn(() => {
    const rows = selectResults[selectIndex] ?? [];
    selectIndex += 1;
    return {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue(rows),
        })),
      })),
    };
  });

  // The submit worker creates or reuses the attempt and assembles the package
  // under one share lock on the draft, so that whole stretch is a transaction.
  const execute = vi.fn().mockResolvedValue({ rows: [] });
  const db = { select, update, updateWhere, execute } as {
    select: typeof select;
    update: typeof update;
    updateWhere: typeof updateWhere;
    execute: typeof execute;
    transaction: (fn: (tx: unknown) => unknown) => unknown;
  };
  db.transaction = (fn) => fn(db);

  return db;
}

vi.mock("../src/queue/index.js", () => ({
  QUEUE_NAMES: {
    SUBMIT_DISPATCH: "submit-dispatch",
    RECONCILE_DISPATCH: "reconcile-ambiguous-dispatch",
    SEND_EMAIL: "send-transactional-email",
  },
  createWorker: mocks.createWorker,
  getQueue: () => ({ add: mocks.emailQueueAdd }),
}));

vi.mock("../src/shared/logging/index.js", () => ({
  createLogger: () => mocks.logger,
}));

vi.mock("../src/shared/redis-lock.js", () => ({
  acquireRedisLock: mocks.acquireRedisLock,
}));

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    POSTAL_DISPATCH_PROVIDER: "epost",
  }),
}));

vi.mock("../src/db/index.js", () => ({
  getDb: () => mocks.currentDb,
  schema: {
    draftLetters: {
      id: "draft_id",
      sessionId: "session_id",
    },
    sessions: {
      id: "session_id",
    },
    dispatchAttempts: {
      id: "dispatch_attempt_id",
    },
  },
}));

vi.mock("../src/modules/dispatch/dispatch.service.js", () => ({
  createDispatchAttempt: mocks.createDispatchAttempt,
  getDispatchAttemptByPaymentAttemptId: mocks.getDispatchAttemptByPaymentAttemptId,
  getDispatchAttempt: mocks.getDispatchAttempt,
  transitionDispatchState: mocks.transitionDispatchState,
  claimDispatchAttempt: mocks.claimDispatchAttempt,
  releaseDispatchClaim: mocks.releaseDispatchClaim,
  markDispatchSubmissionStarted: mocks.markDispatchSubmissionStarted,
  DISPATCH_CLAIM_TTL_MINUTES: 15,
}));

vi.mock("../src/modules/dispatch/adapters/postal.adapter.js", () => ({
  getDispatchAdapter: () => ({
    getCapabilities: () => ({ providerName: "epost-oneapi" }),
    submit: mocks.adapterSubmit,
    checkStatus: mocks.adapterCheckStatus,
  }),
}));

vi.mock("../src/modules/analytics/index.js", () => ({
  recordEvent: mocks.recordEvent,
}));

vi.mock("../src/modules/dispatch/dispatch-package.service.js", () => ({
  buildDispatchPackage: mocks.buildDispatchPackage,
}));

vi.mock("../src/modules/dispatch/dispatch.jobs.js", () => ({
  enqueueDispatchReconciliation: mocks.enqueueDispatchReconciliation,
}));

vi.mock("../src/modules/dispatch/dispatch-notifications.js", () => ({
  enqueueDispatchAcceptedEmail: mocks.enqueueDispatchAcceptedEmail,
  enqueueDispatchSubmittedEmail: mocks.enqueueDispatchSubmittedEmail,
  enqueueDispatchFailedEmail: mocks.enqueueDispatchFailedEmail,
}));

vi.mock("../src/workers/dispatch-settlement.js", () => ({
  settlePaymentForDispatchResolution: mocks.settlePaymentForDispatchResolution,
  canFinalizeDispatchResolution: mocks.canFinalizeDispatchResolution,
  updateDraftStatusForDispatchResolution: mocks.updateDraftStatusForDispatchResolution,
  updateDraftStatusForDispatchSubmission: mocks.updateDraftStatusForDispatchSubmission,
}));

/**
 * Submission is the one step in episto that cannot be undone: a registered
 * letter that reaches Swiss Post twice costs the user nothing and costs us a
 * duplicate posting the recipient will read. These cover the guards that keep
 * the provider call to exactly one worker.
 */
describe("submit dispatch — submission lease", () => {
  beforeEach(() => {
    mocks.currentDb = createDbMock([[]]);
    mocks.createDispatchAttempt.mockReset();
    mocks.getDispatchAttemptByPaymentAttemptId.mockReset();
    mocks.transitionDispatchState.mockReset();
    mocks.claimDispatchAttempt.mockReset().mockResolvedValue("2026-07-28 20:00:00+00");
    mocks.releaseDispatchClaim.mockReset().mockResolvedValue(undefined);
    mocks.markDispatchSubmissionStarted.mockReset().mockResolvedValue(true);
    mocks.adapterSubmit.mockReset();
    mocks.recordEvent.mockReset();
    mocks.buildDispatchPackage.mockReset();
    mocks.settlePaymentForDispatchResolution.mockReset();
    mocks.updateDraftStatusForDispatchSubmission.mockReset();
    mocks.enqueueDispatchReconciliation.mockReset();
    mocks.enqueueDispatchSubmittedEmail.mockReset();
    mocks.logger.info.mockReset();
    mocks.logger.warn.mockReset();
    mocks.logger.error.mockReset();
  });

  it("does not call the provider when another worker holds the submission lease", async () => {
    // A stalled job re-delivered while the first worker is still talking to
    // Swiss Post: the letter must not go out twice.
    mocks.getDispatchAttemptByPaymentAttemptId.mockResolvedValue({
      id: "dispatch-leased",
      paymentAttemptId: "payment-leased",
      state: "queued",
    });
    mocks.claimDispatchAttempt.mockResolvedValue(null);
    mocks.buildDispatchPackage.mockResolvedValue({ deliveryType: "standard" });

    const { processSubmitDispatchJob } =
      await import("../src/workers/submit-dispatch.worker.js");

    const job = {
      data: {
        draftId: "draft-leased",
        snapshotId: "snapshot-leased",
        paymentId: "payment-leased",
      },
      log: vi.fn(),
    };

    await expect(processSubmitDispatchJob(job as never)).resolves.toBeUndefined();

    expect(mocks.buildDispatchPackage).not.toHaveBeenCalled();
    expect(mocks.adapterSubmit).not.toHaveBeenCalled();
    expect(mocks.transitionDispatchState).not.toHaveBeenCalled();
  });

  it("does not call the provider if it lost the lease before submission", async () => {
    mocks.createDispatchAttempt.mockResolvedValue({ id: "dispatch-lost" });
    mocks.buildDispatchPackage.mockResolvedValue({ deliveryType: "standard" });
    mocks.markDispatchSubmissionStarted.mockResolvedValue(false);

    const { processSubmitDispatchJob } =
      await import("../src/workers/submit-dispatch.worker.js");

    const job = {
      data: {
        draftId: "draft-lost",
        snapshotId: "snapshot-lost",
        paymentId: "payment-lost",
      },
      log: vi.fn(),
    };

    await expect(processSubmitDispatchJob(job as never)).resolves.toBeUndefined();

    expect(mocks.adapterSubmit).not.toHaveBeenCalled();
    expect(mocks.transitionDispatchState).not.toHaveBeenCalled();
  });

  it("marks the point of no return before it calls the provider", async () => {
    // Order matters: after the call we may never get to write anything again.
    const calls: string[] = [];
    mocks.createDispatchAttempt.mockResolvedValue({ id: "dispatch-order" });
    mocks.buildDispatchPackage.mockResolvedValue({ deliveryType: "standard" });
    mocks.markDispatchSubmissionStarted.mockImplementation(async () => {
      calls.push("mark");
      return true;
    });
    mocks.adapterSubmit.mockImplementation(async () => {
      calls.push("submit");
      return {
        state: "submitted",
        providerReference: "provider-order",
        trackingNumber: null,
        providerPayload: {},
        failureReason: null,
      };
    });

    const { processSubmitDispatchJob } =
      await import("../src/workers/submit-dispatch.worker.js");

    await processSubmitDispatchJob({
      data: {
        draftId: "draft-order",
        snapshotId: "snapshot-order",
        paymentId: "payment-order",
      },
      log: vi.fn(),
    } as never);

    expect(calls).toEqual(["mark", "submit"]);
  });
});

/**
 * The user story: "I paid, and then something went wrong at the post office."
 *
 * There are two very different versions of that, and the difference decides
 * whether the user gets their money back automatically or a person looks at it:
 * the provider said no (nothing was sent), or the provider said nothing at all
 * (the letter may be on its way).
 */
describe("submit dispatch — what happens when the provider call fails", () => {
  beforeEach(() => {
    mocks.currentDb = createDbMock([[]]);
    mocks.createDispatchAttempt.mockReset().mockResolvedValue({ id: "dispatch-fail" });
    mocks.getDispatchAttemptByPaymentAttemptId.mockReset();
    mocks.transitionDispatchState.mockReset();
    mocks.claimDispatchAttempt.mockReset().mockResolvedValue("2026-07-28 20:00:00+00");
    mocks.markDispatchSubmissionStarted.mockReset().mockResolvedValue(true);
    mocks.adapterSubmit.mockReset();
    mocks.recordEvent.mockReset();
    mocks.buildDispatchPackage
      .mockReset()
      .mockResolvedValue({ deliveryType: "standard" });
    mocks.settlePaymentForDispatchResolution
      .mockReset()
      .mockResolvedValue({ payment: { id: "payment-fail", state: "refund_pending" } });
    mocks.updateDraftStatusForDispatchResolution.mockReset();
    mocks.updateDraftStatusForDispatchSubmission.mockReset();
    mocks.enqueueDispatchReconciliation.mockReset();
    mocks.enqueueDispatchFailedEmail.mockReset();
    mocks.logger.info.mockReset();
    mocks.logger.warn.mockReset();
    mocks.logger.error.mockReset();
  });

  const job = {
    data: {
      draftId: "draft-fail",
      snapshotId: "snapshot-fail",
      paymentId: "payment-fail",
    },
    log: vi.fn(),
  };

  async function runWithSubmitError(err: unknown): Promise<void> {
    mocks.adapterSubmit.mockRejectedValue(err);
    const { processSubmitDispatchJob } =
      await import("../src/workers/submit-dispatch.worker.js");
    await processSubmitDispatchJob(job as never);
  }

  it("refunds the user when the adapter says the letter never left", async () => {
    const { AppError } = await import("../src/shared/errors/index.js");
    const { markLetterNotSent } =
      await import("../src/modules/dispatch/dispatch-outcome.js");

    await runWithSubmitError(
      markLetterNotSent(
        new AppError({
          family: "dispatch_rejection",
          statusCode: 422,
          code: "EPOST_REJECTED_REQUEST",
          message: "Recipient address is not deliverable",
          userMessage: "The postal provider rejected this letter.",
        }),
      ),
    );

    expect(mocks.settlePaymentForDispatchResolution).toHaveBeenCalledWith(
      expect.anything(),
      "draft-fail",
      "payment-fail",
      "rejected",
    );
    expect(mocks.transitionDispatchState).toHaveBeenCalledWith(
      expect.anything(),
      "dispatch-fail",
      "rejected",
      expect.objectContaining({ failureReason: "Recipient address is not deliverable" }),
    );
    expect(mocks.enqueueDispatchFailedEmail).toHaveBeenCalled();
    expect(mocks.enqueueDispatchReconciliation).not.toHaveBeenCalled();
  });

  /**
   * The expensive mistake: refunding a letter Swiss Post already has. A
   * timeout tells us nothing about whether the request arrived.
   */
  it("does not refund, and does not call it rejected, when the outcome is unknown", async () => {
    await runWithSubmitError(new Error("socket hang up"));

    expect(mocks.settlePaymentForDispatchResolution).not.toHaveBeenCalled();
    expect(mocks.transitionDispatchState).toHaveBeenCalledWith(
      expect.anything(),
      "dispatch-fail",
      "unknown",
      expect.objectContaining({
        failureReason: expect.stringContaining("socket hang up"),
      }),
    );
    expect(mocks.enqueueDispatchReconciliation).toHaveBeenCalledWith({
      dispatchAttemptId: "dispatch-fail",
    });
  });

  /**
   * The trap the first version of this fell into: classifying by error family.
   * ePost's 400/422 mapper and its transport-failure mapper both produce an
   * `AppError`, and our own pre-flight raises `validation_error` — none of
   * which says anything about whether bytes left the machine. Only the
   * adapter's explicit mark does.
   */
  it("does not refund on an unmarked rejection-shaped error", async () => {
    const { AppError } = await import("../src/shared/errors/index.js");

    await runWithSubmitError(
      new AppError({
        family: "dispatch_rejection",
        statusCode: 422,
        code: "EPOST_REJECTED_REQUEST",
        message: "Looks deterministic, was never marked",
        userMessage: "The postal provider rejected this letter.",
      }),
    );

    expect(mocks.settlePaymentForDispatchResolution).not.toHaveBeenCalled();
    expect(mocks.transitionDispatchState).toHaveBeenCalledWith(
      expect.anything(),
      "dispatch-fail",
      "unknown",
      expect.anything(),
    );
  });

  /** A provider outage is ambiguous too: the request may still have landed. */
  it("treats a provider outage as unknown rather than a rejection", async () => {
    const { AppError } = await import("../src/shared/errors/index.js");

    await runWithSubmitError(
      new AppError({
        family: "provider_outage",
        statusCode: 503,
        code: "EPOST_REQUEST_FAILED",
        message: "Gateway timeout",
        userMessage: "Postal dispatch is temporarily unavailable.",
      }),
    );

    expect(mocks.settlePaymentForDispatchResolution).not.toHaveBeenCalled();
    expect(mocks.transitionDispatchState).toHaveBeenCalledWith(
      expect.anything(),
      "dispatch-fail",
      "unknown",
      expect.anything(),
    );
  });

  /**
   * Nothing may be re-thrown past the point of no return: a BullMQ retry would
   * take the lease, find `submission_started_at` set and return silently, so a
   * failure that escapes here is a failure nobody ever handles.
   */
  it("resolves the job rather than leaving it to a retry that cannot help", async () => {
    await runWithSubmitError(new Error("socket hang up"));
    // Reaching here at all is the assertion; make it explicit.
    expect(mocks.logger.error).toHaveBeenCalled();
  });
});
