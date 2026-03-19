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
