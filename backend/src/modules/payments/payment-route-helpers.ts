import type { FastifyBaseLogger } from "fastify";
import type { Db } from "../../db/index.js";
import { enqueueDispatchSubmission } from "../dispatch/dispatch.jobs.js";
import { getLatestSnapshot } from "../rendering/snapshot.service.js";

export async function enqueueDispatchIfSnapshotReady(options: {
  db: Db;
  draftId: string;
  paymentId: string;
  log: Pick<FastifyBaseLogger, "error">;
  failureMessage: string;
  suppressFailure?: boolean;
}): Promise<void> {
  const {
    db,
    draftId,
    paymentId,
    log,
    failureMessage,
    suppressFailure = false,
  } = options;

  try {
    const snapshot = await getLatestSnapshot(db, draftId);
    if (snapshot?.renderedPdfAssetId) {
      await enqueueDispatchSubmission({
        draftId,
        snapshotId: snapshot.id,
        paymentId,
      });
    }
  } catch (err) {
    log.error({ err, draftId, paymentId }, failureMessage);
    if (!suppressFailure) {
      throw err;
    }
  }
}
