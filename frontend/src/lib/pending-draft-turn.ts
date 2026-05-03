export interface PendingDraftTurn {
  draftId: string;
  messageId: string;
}

const PREFIX = "episto.pending-draft-turn";

function getSessionStorage(): Storage | null {
  if (typeof globalThis === "undefined" || !("sessionStorage" in globalThis)) {
    return null;
  }

  return globalThis.sessionStorage;
}

export function primePendingDraftTurn(input: PendingDraftTurn) {
  getSessionStorage()?.setItem(`${PREFIX}:${input.draftId}`, JSON.stringify(input));
}

export function readPendingDraftTurn(draftId: string): PendingDraftTurn | null {
  const raw = getSessionStorage()?.getItem(`${PREFIX}:${draftId}`);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingDraftTurn;
  } catch {
    return null;
  }
}

export function clearPendingDraftTurn(draftId: string) {
  getSessionStorage()?.removeItem(`${PREFIX}:${draftId}`);
}
