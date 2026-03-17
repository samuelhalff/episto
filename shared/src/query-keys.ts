export const queryKeys = {
  session: (id: string) => ["sessions", id] as const,
  draft: (id: string) => ["drafts", id] as const,
  payment: (draftId: string) => ["payments", draftId] as const,
  dispatch: (draftId: string) => ["dispatch", draftId] as const,
} as const;
