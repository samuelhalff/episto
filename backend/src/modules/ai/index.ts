export {
  classifyIntent,
  extractFields,
  askFollowUp,
  draftLetter,
  reviseLetter,
  validateOutput,
  processUserMessage,
} from "./ai.service.js";
export type {
  ClassificationResult,
  FollowUpResult,
  ValidationResult,
  ProcessMessageInput,
  ProcessMessageResult,
} from "./ai.service.js";
export { PROMPT_VERSION } from "./prompts/index.js";
export { handleAiMessage, handleComposeFromContext } from "./ai.handler.js";
export type { HandleMessageInput, HandleComposeFromContextInput } from "./ai.handler.js";
