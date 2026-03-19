export { draftRoutes } from "./draft.routes.js";
export { streamRoutes } from "./stream.routes.js";
export {
  createDraft,
  getDraftById,
  listDraftsBySession,
  updateDraft,
  transitionDraftStatus,
} from "./draft.service.js";
export {
  createSenderProfile,
  getSenderProfile,
  listSenderProfiles,
  createRecipientProfile,
  getRecipientProfile,
  listRecipientProfiles,
} from "./profile.service.js";
export {
  emitDraftEvent,
  subscribeDraft,
  unsubscribeDraft,
} from "./draft-events.js";
export type {
  DraftEventType,
  DraftEventMap,
  DraftEventHandler,
  AiTokenPayload,
  AiMessageCompletePayload,
  FieldUpdatePayload,
  DraftStatusPayload,
  StreamErrorPayload,
} from "./draft-events.js";
