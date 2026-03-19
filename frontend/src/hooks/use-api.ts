// Barrel re-export — all hooks are split into focused modules.
// Existing imports from "./hooks/use-api" continue to work.

export { useSession } from "./use-session.js";
export type { UseSessionReturn, ExpiryWarningLevel } from "./use-session.js";
export {
  draftOptions,
  useDraft,
  useDrafts,
  useCreateDraft,
  useUpdateDraft,
  useTransitionDraft,
} from "./use-draft.js";
export { useSetSender, useSetRecipient } from "./use-profiles.js";
export { useConversation } from "./use-conversation.js";
export type { UseConversationReturn } from "./use-conversation.js";
export { useDraftFiles } from "./use-draft-files.js";
export type { UseDraftFilesReturn } from "./use-draft-files.js";
export { useCheckout } from "./use-checkout.js";
export type { UseCheckoutReturn } from "./use-checkout.js";
export { useLetterPreview } from "./use-letter-preview.js";
export type { UseLetterPreviewReturn, LetterPreviewData } from "./use-letter-preview.js";
export { useDispatchStatus } from "./use-dispatch-status.js";
