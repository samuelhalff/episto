export {
  createDispatchAttempt,
  getDispatchAttempt,
  getDispatchForDraft,
  transitionDispatchState,
  recordDispatchEvent,
} from "./dispatch.service.js";
export type { DispatchAttemptRow, DispatchStatusEventRow } from "./dispatch.service.js";
export { dispatchRoutes } from "./dispatch.routes.js";
export {
  getDispatchAdapter,
  setDispatchAdapter,
} from "./adapters/postal.adapter.js";
export type {
  DispatchAdapter,
  SubmitResult,
  StatusResult,
} from "./adapters/postal.adapter.js";
