import { eq } from "drizzle-orm";
import type { DispatchStatusLookup } from "@episto/shared";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { acquireRedisLock } from "../../shared/redis-lock.js";
import { getDispatchAdapter } from "./adapters/postal.adapter.js";
import {
  getDispatchAttempt,
  transitionDispatchState,
  type DispatchAttemptRow,
} from "./dispatch.service.js";
import { enqueueDispatchAcceptedEmail } from "./dispatch-notifications.js";
import {
  canFinalizeDispatchResolution,
  settlePaymentForDispatchResolution,
  updateDraftStatusForDispatchResolution,
} from "../../workers/dispatch-settlement.js";

const RECONCILE_LOCK_TTL_MS = 5 * 60 * 1000;

export interface DispatchProviderDiagnostics {
  status: DispatchStatusLookup["state"];
  providerErrorCode: string | null;
  failureReason: string | null;
  providerReference: string | null;
  trackingNumber: string | null;
  checkedAt: string;
  matchedBy: "senderCaseId+senderEndToEndId" | null;
  conflict: boolean;
}

export interface ReconcileDispatchResult {
  dispatchAttemptId: string;
  previousState: string;
  state: string;
  providerReference: string | null;
  trackingNumber: string | null;
  providerDiagnostics: DispatchProviderDiagnostics | null;
  changed: boolean;
  conflict: boolean;
  skipped: boolean;
}

const PROVIDER_CHECK_TIMEOUT_MS = 20_000;

async function withProviderTimeout<T>(operation: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                `Provider ${label} timed out after ${PROVIDER_CHECK_TIMEOUT_MS}ms`,
              ),
            ),
          PROVIDER_CHECK_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function diagnosticsFor(
  status: DispatchStatusLookup,
  providerReference: string | null,
  matchedBy: DispatchProviderDiagnostics["matchedBy"],
  conflict = false,
): DispatchProviderDiagnostics {
  return {
    status: status.state,
    providerErrorCode: status.providerErrorCode ?? null,
    failureReason: status.failureReason,
    providerReference,
    trackingNumber: status.trackingNumber,
    checkedAt: new Date().toISOString(),
    matchedBy,
    conflict,
  };
}

async function persistDiagnostics(
  db: Db,
  dispatchAttemptId: string,
  diagnostics: DispatchProviderDiagnostics,
): Promise<void> {
  await db
    .update(schema.dispatchAttempts)
    .set({
      providerDiagnostics: diagnostics,
      lastCheckedAt: new Date(diagnostics.checkedAt),
      providerReference: diagnostics.providerReference ?? undefined,
      trackingNumber: diagnostics.trackingNumber,
    })
    .where(eq(schema.dispatchAttempts.id, dispatchAttemptId));
}

async function reconcileLocked(
  db: Db,
  dispatchAttemptId: string,
): Promise<ReconcileDispatchResult> {
  const attempt = await getDispatchAttempt(db, dispatchAttemptId);
  if (!attempt) {
    return {
      dispatchAttemptId,
      previousState: "missing",
      state: "missing",
      providerReference: null,
      trackingNumber: null,
      providerDiagnostics: null,
      changed: false,
      conflict: false,
      skipped: true,
    };
  }

  if (!["submitted", "unknown", "rejected"].includes(attempt.state)) {
    return {
      dispatchAttemptId,
      previousState: attempt.state,
      state: attempt.state,
      providerReference: attempt.providerReference,
      trackingNumber: attempt.trackingNumber,
      providerDiagnostics: null,
      changed: false,
      conflict: false,
      skipped: true,
    };
  }

  const adapter = getDispatchAdapter();
  let providerReference = attempt.providerReference;
  let matchedBy: DispatchProviderDiagnostics["matchedBy"] = null;

  if (!providerReference) {
    const match = await withProviderTimeout(
      adapter.findDeliveryByApplicationIdentifiers(attempt.draftId, attempt.snapshotId),
      "identifier discovery",
    );
    providerReference = match?.providerReference ?? null;
    if (providerReference) matchedBy = "senderCaseId+senderEndToEndId";
  }

  if (!providerReference) {
    await db
      .update(schema.dispatchAttempts)
      .set({
        lastCheckedAt: new Date(),
        providerDiagnostics: {
          status: "unknown",
          providerErrorCode: "PROVIDER_REFERENCE_NOT_FOUND",
          failureReason: "No exact provider delivery matched this draft and snapshot.",
          providerReference: null,
          trackingNumber: null,
          checkedAt: new Date().toISOString(),
          matchedBy: null,
          conflict: false,
        } satisfies DispatchProviderDiagnostics,
      })
      .where(eq(schema.dispatchAttempts.id, dispatchAttemptId));
    if (attempt.state === "submitted") {
      await transitionDispatchState(db, dispatchAttemptId, "unknown", {
        failureReason: "No exact provider delivery matched this draft and snapshot.",
      });
    }
    const diagnostics: DispatchProviderDiagnostics = {
      status: "unknown",
      providerErrorCode: "PROVIDER_REFERENCE_NOT_FOUND",
      failureReason: "No exact provider delivery matched this draft and snapshot.",
      providerReference: null,
      trackingNumber: null,
      checkedAt: new Date().toISOString(),
      matchedBy: null,
      conflict: false,
    };
    return {
      dispatchAttemptId,
      previousState: attempt.state,
      state: attempt.state === "submitted" ? "unknown" : attempt.state,
      providerReference: null,
      trackingNumber: null,
      providerDiagnostics: diagnostics,
      changed: attempt.state === "submitted",
      conflict: false,
      skipped: false,
    };
  }

  const status = await withProviderTimeout(
    adapter.checkStatus(providerReference),
    "status check",
  );
  const conflict = attempt.state === "rejected" && status.state === "accepted";
  const diagnostics = diagnosticsFor(status, providerReference, matchedBy, conflict);

  // A rejected dispatch is terminal from the application/payment perspective.
  // A later provider acceptance is retained as an operational conflict; it can
  // never silently capture/release money or resurrect the customer's draft.
  if (attempt.state === "rejected") {
    await persistDiagnostics(db, dispatchAttemptId, diagnostics);
    return {
      dispatchAttemptId,
      previousState: attempt.state,
      state: attempt.state,
      providerReference,
      trackingNumber: status.trackingNumber,
      providerDiagnostics: diagnostics,
      changed: false,
      conflict,
      skipped: false,
    };
  }

  if (status.state === "accepted" || status.state === "rejected") {
    const settlement = await settlePaymentForDispatchResolution(
      db,
      attempt.draftId,
      attempt.paymentAttemptId,
      status.state,
    );
    if (!canFinalizeDispatchResolution(status.state, settlement.payment)) {
      throw new Error(
        `Cannot finalize dispatch ${dispatchAttemptId} as ${status.state} while payment is ${settlement.payment?.state ?? "missing"}`,
      );
    }
    await updateDraftStatusForDispatchResolution(
      db,
      attempt.draftId,
      status.state,
      settlement.payment,
    );
    await transitionDispatchState(db, dispatchAttemptId, status.state, {
      providerReference,
      trackingNumber: status.trackingNumber,
      failureReason: status.failureReason ?? undefined,
    });
    await persistDiagnostics(db, dispatchAttemptId, diagnostics);

    if (status.state === "accepted" && settlement.payment) {
      try {
        await enqueueDispatchAcceptedEmail(db, {
          dispatchAttemptId,
          draftId: attempt.draftId,
          paymentId: settlement.payment.id,
          providerReference,
          trackingNumber: status.trackingNumber,
        });
      } catch {
        // The dispatch is already durably resolved; the email outbox can retry independently.
      }
    }
    return {
      dispatchAttemptId,
      previousState: attempt.state,
      state: status.state,
      providerReference,
      trackingNumber: status.trackingNumber,
      providerDiagnostics: diagnostics,
      changed: true,
      conflict: false,
      skipped: false,
    };
  }

  await persistDiagnostics(db, dispatchAttemptId, diagnostics);
  return {
    dispatchAttemptId,
    previousState: attempt.state,
    state: attempt.state,
    providerReference,
    trackingNumber: status.trackingNumber,
    providerDiagnostics: diagnostics,
    changed: false,
    conflict: false,
    skipped: false,
  };
}

export async function reconcileDispatch(
  db: Db,
  dispatchAttemptId: string,
): Promise<ReconcileDispatchResult> {
  const lock = await acquireRedisLock(
    `dispatch-reconcile:${dispatchAttemptId}`,
    RECONCILE_LOCK_TTL_MS,
  );
  if (!lock) {
    return {
      dispatchAttemptId,
      previousState: "locked",
      state: "locked",
      providerReference: null,
      trackingNumber: null,
      providerDiagnostics: null,
      changed: false,
      conflict: false,
      skipped: true,
    };
  }
  try {
    return await reconcileLocked(db, dispatchAttemptId);
  } catch (error) {
    await db
      .update(schema.dispatchAttempts)
      .set({ lastCheckedAt: new Date() })
      .where(eq(schema.dispatchAttempts.id, dispatchAttemptId));
    throw error;
  } finally {
    await lock.release();
  }
}
