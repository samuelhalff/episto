export const queryKeys = {
  session: (id: string) => ["sessions", id] as const,
  draft: (id: string) => ["drafts", id] as const,
  drafts: () => ["drafts"] as const,
  draftMessages: (draftId: string) => ["drafts", draftId, "messages"] as const,
  draftFiles: (draftId: string) => ["drafts", draftId, "files"] as const,
  draftPreview: (draftId: string) => ["drafts", draftId, "preview"] as const,
  draftQuote: (draftId: string) => ["drafts", draftId, "quote"] as const,
  payment: (draftId: string) => ["payments", draftId] as const,
  dispatch: (draftId: string) => ["dispatch", draftId] as const,
  order: (orderToken: string) => ["orders", orderToken] as const,
  pricing: () => ["pricing"] as const,
} as const;
