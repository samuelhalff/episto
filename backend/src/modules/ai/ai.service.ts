/**
 * AI drafting service — orchestrates the canonical AI pipeline.
 *
 * Pipeline stages (from ai-provider-and-prompts.md):
 * 1. Intent and risk classification
 * 2. Structured field extraction
 * 3. Missing-field detection + follow-up question generation
 * 4. Draft generation (structured document response)
 * 5. Post-generation validation
 * 6. Revision (structured document response)
 */

import { complete } from "./adapters/azure-openai.js";
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
import {
  applyStructuredEdit,
  parseModelResponse,
  type AppliedDocumentResult,
  type ParseModelResponseOptions,
} from "./document-response.js";
import type { DocumentModel } from "@swiss-mail/shared";

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
// 4. Draft letter (structured response)
// ---------------------------------------------------------------------------

export async function draftLetter(
  input: DraftLetterInput,
  options: ParseModelResponseOptions = {},
): Promise<AppliedDocumentResult> {
  const messages = draftLetterPrompt(input);
  return generateStructuredDocument(messages, undefined, options);
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
    return { valid: true, violations: [], severity: "none" };
  }
}

// ---------------------------------------------------------------------------
// 6. Revise letter (structured response)
// ---------------------------------------------------------------------------

export async function reviseLetter(
  input: ReviseLetterInput,
  currentDocument?: DocumentModel,
  options: ParseModelResponseOptions = {},
): Promise<AppliedDocumentResult> {
  const messages = reviseLetterPrompt(input);
  return generateStructuredDocument(messages, currentDocument, options);
}

async function generateStructuredDocument(
  messages: ReturnType<typeof draftLetterPrompt>,
  currentDocument?: DocumentModel,
  options: ParseModelResponseOptions = {},
): Promise<AppliedDocumentResult> {
  const raw = await complete({
    model: "draft",
    messages,
    temperature: 0.6,
    maxTokens: 4096,
  });

  const parsed = parseModelResponse(raw, {
    expectedMode: "structured_edit",
    allowPlainTextFallback: options.allowPlainTextFallback ?? true,
    compatibilityMode: options.compatibilityMode ?? "plain_text_only",
  });

  if (!parsed.ok || !parsed.response) {
    logger.error({ errors: parsed.errors }, "Model response could not be interpreted safely");
    throw new AppError({
      family: "validation_error",
      statusCode: 502,
      code: "AI_RESPONSE_INVALID",
      message: `Model response invalid: ${parsed.errors.join(" | ")}`,
      userMessage: "The AI response could not be interpreted safely.",
      userAction: "Please try again or continue editing manually.",
    });
  }

  logger.info(
    {
      mode: parsed.mode,
      warnings: parsed.warnings,
      errors: parsed.errors,
    },
    "Model response parsed",
  );

  const applied = applyStructuredEdit(parsed.response, currentDocument);
  applied.warnings.push(...parsed.warnings, ...parsed.errors);

  logger.info(
    {
      mode: applied.mode,
      operationsApplied: applied.operationsApplied,
      warnings: applied.warnings,
    },
    "Structured document response applied",
  );

  return applied;
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

export async function processUserMessage(
  input: ProcessMessageInput,
): Promise<ProcessMessageResult> {
  const classification = await classifyIntent({
    userMessage: input.userMessage,
    locale: input.locale,
  });

  logger.info(
    { draftId: input.draftId, intent: classification.intent, risk: classification.risk },
    "Message classified",
  );

  const extractedFields = await extractFields({
    userMessage: input.userMessage,
    existingFields: input.existingFields,
    locale: input.locale,
  });

  const mergedFields = { ...input.existingFields, ...extractedFields };

  const followUp = await askFollowUp({
    intent: classification.intent,
    existingFields: mergedFields,
    locale: input.locale,
  });

  return { classification, extractedFields, followUp };
}
