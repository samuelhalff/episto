// Barrel re-export — all hooks are split into focused modules.
// Existing imports from "./hooks/use-api" continue to work.

export { useSession } from "./use-session";
export type { UseSessionReturn, ExpiryWarningLevel } from "./use-session";
export {
  draftOptions,
  useDraft,
  useDrafts,
  useCreateDraft,
  useUpdateDraft,
  useTransitionDraft,
  useReviewDraft,
  useComposeDraftFromContext,
} from "./use-draft";
export { useSetSender, useSetRecipient } from "./use-profiles";
export { useAddressSearch } from "./use-address-search";
export { useAddressDetails } from "./use-address-details";
export { useRecipientCompanySearch } from "./use-recipient-company-search";
export { useRecipientCompanyDetails } from "./use-recipient-company-details";
export { useConversation } from "./use-conversation";
export type { UseConversationReturn } from "./use-conversation";
export { useDraftFiles } from "./use-draft-files";
export type { UseDraftFilesReturn } from "./use-draft-files";
export { useCheckout } from "./use-checkout";
export type { UseCheckoutReturn } from "./use-checkout";
export { useLetterPreview } from "./use-letter-preview";
export type { UseLetterPreviewReturn, LetterPreviewData } from "./use-letter-preview";
export { useDispatchStatus } from "./use-dispatch-status";
