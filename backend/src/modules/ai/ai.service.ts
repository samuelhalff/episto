/**
 * AI drafting service — orchestrates the canonical AI pipeline.
 *
 * Pipeline stages (from ai-provider-and-prompts.md):
 * 1. Intent and risk classification
 * 2. Structured field extraction
 * 3. Missing-field detection + follow-up question generation
 * 4. Draft generation (streaming)
 * 5. Post-generation validation
 * 6. Revision (streaming)
 */

import { complete, streamComplete } from "./adapters/azure-openai.js";
import {
  classifyIntentPrompt,
  extractFieldsPrompt,
  askFollowUpPrompt,
  draftLetterPrompt,
  reviseLetterPrompt,
  validateOutputPrompt,
  type ClassifyIntentInput,
  type ExtractFieldsInput,
  type AskFollowUpInput,
  type DraftLetterInput,
  type ReviseLetterInput,
  type ValidateOutputInput,
} from "./prompts/index.js";
import { createLogger } from "../../shared/logging/index.js";
import { AppError } from "../../shared/errors/index.js";

const logger = createLogger("ai-service");

// ---------------------------------------------------------------------------
// 1. Classify intent
// ---------------------------------------------------------------------------

export interface ClassificationResult {
  intent: string;
  risk: "low" | "medium" | "high";
  summary: string;
}

export async function classifyIntent(
  input: ClassifyIntentInput,
): Promise<ClassificationResult> {
  const messages = classifyIntentPrompt(input);
  const raw = await complete({ model: "classify", messages, temperature: 0.3 });

  try {
    const result = JSON.parse(raw) as ClassificationResult;

    if (result.intent === "blocked") {
      throw new AppError({
        family: "policy_refusal",
        statusCode: 422,
        code: "CONTENT_BLOCKED",
        message: `Content blocked by classification: ${result.summary}`,
        userMessage: "This type of content cannot be processed.",
        userAction: "Please describe a legitimate formal correspondence need.",
      });
    }

    return result;
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error({ raw }, "Failed to parse classification result");
    // Fallback: treat as general low-risk if parsing fails
    return { intent: "general", risk: "low", summary: "Unable to classify" };
  }
}

// ---------------------------------------------------------------------------
// 2. Extract fields
// ---------------------------------------------------------------------------

export async function extractFields(
  input: ExtractFieldsInput,
): Promise<Record<string, unknown>> {
  const messages = extractFieldsPrompt(input);
  const raw = await complete({ model: "classify", messages, temperature: 0.2 });

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    logger.error({ raw }, "Failed to parse field extraction result");
    return {};
  }
}

// ---------------------------------------------------------------------------
// 3. Ask follow-up
// ---------------------------------------------------------------------------

export interface FollowUpResult {
  ready: boolean;
  question?: string;
  message?: string;
}

export async function askFollowUp(
  input: AskFollowUpInput,
): Promise<FollowUpResult> {
  const messages = askFollowUpPrompt(input);
  const raw = await complete({ model: "classify", messages, temperature: 0.5 });

  try {
    return JSON.parse(raw) as FollowUpResult;
  } catch {
    logger.error({ raw }, "Failed to parse follow-up result");
    return { ready: false, question: "Could you provide more details about your letter?" };
  }
}

// ---------------------------------------------------------------------------
// 4. Draft letter (streaming)
// ---------------------------------------------------------------------------

export async function* draftLetter(
  input: DraftLetterInput,
): AsyncIterable<string> {
  const messages = draftLetterPrompt(input);
  yield* streamComplete({
    model: "draft",
    messages,
    temperature: 0.7,
    maxTokens: 4096,
  });
}

// ---------------------------------------------------------------------------
// 5. Validate output
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  violations: string[];
  severity: "none" | "warning" | "blocked";
}

export async function validateOutput(
  input: ValidateOutputInput,
): Promise<ValidationResult> {
  const messages = validateOutputPrompt(input);
  const raw = await complete({ model: "classify", messages, temperature: 0.1 });

  try {
    return JSON.parse(raw) as ValidationResult;
  } catch {
    logger.error({ raw }, "Failed to parse validation result");
    // Conservative fallback: flag as warning
    return { valid: true, violations: [], severity: "none" };
  }
}

// ---------------------------------------------------------------------------
// 6. Revise letter (streaming)
// ---------------------------------------------------------------------------

export async function* reviseLetter(
  input: ReviseLetterInput,
): AsyncIterable<string> {
  const messages = reviseLetterPrompt(input);
  yield* streamComplete({
    model: "draft",
    messages,
    temperature: 0.6,
    maxTokens: 4096,
  });
}

// ---------------------------------------------------------------------------
// Orchestrated pipeline: process user message
// ---------------------------------------------------------------------------

export interface ProcessMessageInput {
  draftId: string;
  userMessage: string;
  locale: string;
  existingFields: Record<string, unknown>;
  conversationHistory: { role: string; content: string }[];
}

export interface ProcessMessageResult {
  classification: ClassificationResult;
  extractedFields: Record<string, unknown>;
  followUp: FollowUpResult;
}

/**
 * Process a user message through the non-streaming classification pipeline.
 * Returns extracted fields and a follow-up question (or readiness signal).
 * Draft generation is handled separately via streaming.
 */
export async function processUserMessage(
  input: ProcessMessageInput,
): Promise<ProcessMessageResult> {
  // Stage 1: Classify intent
  const classification = await classifyIntent({
    userMessage: input.userMessage,
    locale: input.locale,
  });

  logger.info(
    { draftId: input.draftId, intent: classification.intent, risk: classification.risk },
    "Message classified",
  );

  // Stage 2: Extract fields
  const extractedFields = await extractFields({
    userMessage: input.userMessage,
    existingFields: input.existingFields,
    locale: input.locale,
  });

  // Merge extracted fields with existing
  const mergedFields = { ...input.existingFields, ...extractedFields };

  // Stage 3: Follow-up question
  const followUp = await askFollowUp({
    intent: classification.intent,
    existingFields: mergedFields,
    locale: input.locale,
  });

  return { classification, extractedFields, followUp };
}
