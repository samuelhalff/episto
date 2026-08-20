"use client";

import { useCallback, useMemo, useState } from "react";
import type { FileAsset } from "@episto/shared";

/**
 * The attachment set the current body text was drafted against, so a file
 * added or removed at the later attachments step can surface as "documents
 * changed" instead of silently shipping a stale draft. Session-scoped: the
 * banner is a working-session aid, not durable draft state.
 */
const BODY_ATTACHMENTS_SYNCED_STORAGE_KEY_PREFIX = "episto.body-attachments-synced.v1.";

function readSyncedAttachmentFingerprint(draftId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(
      BODY_ATTACHMENTS_SYNCED_STORAGE_KEY_PREFIX + draftId,
    );
  } catch {
    return null;
  }
}

/**
 * Tracks whether the attachment set changed after the last AI write.
 *
 * `markAttachmentsSynced` must only be called from async success paths
 * (compose onSuccess, refinement send, an explicit "keep wording") — the
 * moments the body verifiably reflects the current documents — never from an
 * effect. A draft with no stored fingerprint (predating this feature, or
 * drafted in another browser session) starts un-tracked: the banner only ever
 * reports changes made after an observed AI write.
 */
export function useAttachmentDraftSync({
  draftId,
  attachments,
  filesLoading,
  bodyText,
}: {
  draftId: string;
  attachments: FileAsset[];
  filesLoading: boolean;
  bodyText: string;
}) {
  const [syncedAttachmentFingerprint, setSyncedAttachmentFingerprint] = useState<
    string | null
  >(() => readSyncedAttachmentFingerprint(draftId));

  const attachmentFingerprint = useMemo(
    () =>
      attachments
        .map((file) => file.id)
        .sort()
        .join("|"),
    [attachments],
  );

  const markAttachmentsSynced = useCallback(() => {
    // While the files query is loading, the fingerprint would read as "no
    // attachments"; recording that would make the real set look like a
    // change the moment it loads. Skip — the draft stays untracked until an
    // AI write happens with the attachment list actually known.
    if (filesLoading) return;
    setSyncedAttachmentFingerprint(attachmentFingerprint);
    try {
      window.sessionStorage.setItem(
        BODY_ATTACHMENTS_SYNCED_STORAGE_KEY_PREFIX + draftId,
        attachmentFingerprint,
      );
    } catch {
      // Session storage is best-effort; the in-memory state still applies.
    }
  }, [attachmentFingerprint, draftId, filesLoading]);

  const attachmentsChangedSinceDraft =
    !filesLoading &&
    bodyText.trim().length > 0 &&
    syncedAttachmentFingerprint !== null &&
    syncedAttachmentFingerprint !== attachmentFingerprint;

  return { attachmentsChangedSinceDraft, markAttachmentsSynced };
}
