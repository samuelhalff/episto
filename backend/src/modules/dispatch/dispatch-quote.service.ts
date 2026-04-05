import type { Db } from "../../db/index.js";
import { validationError } from "../../shared/errors/index.js";
import { getLatestSnapshot } from "../rendering/snapshot.service.js";
import { getDispatchAdapter } from "./adapters/postal.adapter.js";
import { buildDispatchPackage } from "./dispatch-package.service.js";

export async function getDispatchQuoteForDraft(
  db: Db,
  draftId: string,
) {
  const snapshot = await getLatestSnapshot(db, draftId);
  if (!snapshot) {
    throw validationError("Review the draft before requesting a delivery quote.");
  }

  const dispatchPackage = await buildDispatchPackage(db, draftId, snapshot.id, {
    allowPendingRenderedPdf: true,
  });

  return getDispatchAdapter().quotePrice(dispatchPackage);
}
