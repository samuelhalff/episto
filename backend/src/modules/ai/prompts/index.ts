export { PROMPT_VERSION } from "./shared.js";
export type { PromptConversationMessage } from "./shared.js";

export {
  analyzeIntakePrompt,
  askFollowUpPrompt,
  classifyIntentPrompt,
  extractFieldsPrompt,
} from "./intake.js";
export type {
  AnalyzeIntakeInput,
  AskFollowUpInput,
  ClassifyIntentInput,
  ExtractFieldsInput,
} from "./intake.js";

export {
  draftLetterPrompt,
  generateSubjectPrompt,
  reviseLetterPrompt,
} from "./drafting.js";
export type {
  DraftLetterInput,
  GenerateSubjectInput,
  ReviseLetterInput,
} from "./drafting.js";

export { validateOutputPrompt } from "./validation.js";
export type { ValidateOutputInput } from "./validation.js";
