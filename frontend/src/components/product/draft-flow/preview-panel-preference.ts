const storageKey = (draftId: string) => `swiss-mail.preview-panel:${draftId}`;

export function readPreviewPanelPreference(draftId: string): boolean | null {
  try {
    const value = sessionStorage.getItem(storageKey(draftId));
    if (value === "open") return true;
    if (value === "closed") return false;
    return null;
  } catch {
    return null;
  }
}

export function writePreviewPanelPreference(draftId: string, isOpen: boolean): void {
  try {
    sessionStorage.setItem(storageKey(draftId), isOpen ? "open" : "closed");
  } catch {
    // sessionStorage unavailable — silently ignore
  }
}
