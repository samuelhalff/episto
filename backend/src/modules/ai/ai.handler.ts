/**
 * AI message handler — orchestrates intake, composition, and revision.
 *
 * Best-in-class call management rules:
 * - intake analysis is collapsed into one structured provider call
 * - first composition skips intake analysis when canonical state already proves readiness
 * - revisions bypass intake entirely once a real draft body exists
 */

import { getDb } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { and, eq } from "drizzle-orm";
import { hasMinimalIntakeContext } from "@episto/shared";

import { createLogger } from "../../shared/logging/index.js";
import { AppError } from "../../shared/errors/index.js";
import { analyzeIntake } from "./ai.service.js";
import { streamDraftGeneration, streamRevision } from "./ai.streaming.js";
import { createMessage } from "../messages/message.service.js";
import { emitDraftEvent } from "../drafting/draft-events.js";
import { acquireRedisLock } from "../../shared/redis-lock.js";
import {
  buildComposeInstructions,
  buildExistingFieldsContext,
  type ConversationHistoryEntry,
  emitAssistantCompletion,
  loadConversationHistory,
  mergeRecipientName,
  updateDraftFields,
} from "./draft-context.js";

const logger = createLogger("ai-handler");
const COMPOSE_LOCK_TTL_MS = 10 * 60 * 1000;
const UNSUPPORTED_LOCALE_MESSAGE =
  "I can currently prepare Swiss letters only in German, French, Italian, or English. Please choose one of those languages.";
const SUPPORTED_LOCALE_BY_LANGUAGE = [
  { locale: "de-CH", pattern: /\b(german|deutsch|allemand|tedesco)\b/i },
  {
    locale: "fr-CH",
    pattern:
      /\b(french|franzoesisch|franzosisch|französisch|francais|français|francese)\b/i,
  },
  { locale: "it-CH", pattern: /\b(italian|italienisch|italien|italiano)\b/i },
  { locale: "en-CH", pattern: /\b(english|englisch|anglais|inglese)\b/i },
] as const;

export interface HandleMessageInput {
  draftId: string;
  sessionId: string;
  userMessageId: string;
  userContent: string;
}

export interface HandleComposeFromContextInput {
  draftId: string;
  sessionId: string;
}

async function loadDraft(draftId: string, sessionId: string) {
  const db = getDb();
  const [draft] = await db
    .select()
    .from(schema.draftLetters)
    .where(
      and(
        eq(schema.draftLetters.id, draftId),
        eq(schema.draftLetters.sessionId, sessionId),
      ),
    )
    .limit(1);
  return draft ?? null;
}

function hasEnoughIntakeContext(
  intent: string,
  mergedFields: Record<string, unknown>,
  userContextText: string,
): boolean {
  return hasMinimalIntakeContext({
    intent,
    recipientCompany:
      typeof mergedFields.recipientCompany === "string"
        ? mergedFields.recipientCompany
        : undefined,
    recipientName: mergeRecipientName(mergedFields),
    userContextText,
  });
}

function getIntakeReplyContent(input: {
  ready: boolean;
  question?: string | undefined;
  message?: string | undefined;
  hasEnoughContext: boolean;
}): string {
  const question = input.question?.trim();
  if (question) {
    return question;
  }

  const message = input.message?.trim();
  if (message) {
    return message;
  }

  if (input.ready || input.hasEnoughContext) {
    return "I have enough to start structuring this. You can keep adding details here, or move on when you're ready.";
  }

  return "Could you provide more details about your letter?";
}

function detectPromptLocaleRequest(userContent: string): {
  locale: string | null;
  unsupportedLocaleRequest: string | null;
} {
  const hasLocaleIntent =
    /\b(translate|switch|change|convert|write|make)\b/i.test(userContent) &&
    /\b(language|letter|whole|draft|text|to|in)\b/i.test(userContent);

  if (!hasLocaleIntent) {
    return { locale: null, unsupportedLocaleRequest: null };
  }

  const supported = SUPPORTED_LOCALE_BY_LANGUAGE.find(({ pattern }) =>
    pattern.test(userContent),
  );
  if (supported) {
    return { locale: supported.locale, unsupportedLocaleRequest: null };
  }

  const requestedLanguage =
    userContent.match(
      /\b(?:translate|switch|change|convert|write|make)\b.*?\b(?:to|in)\s+([A-Za-zÀ-ÿ-]+)/i,
    )?.[1] ?? "that language";

  return {
    locale: null,
    unsupportedLocaleRequest: requestedLanguage,
  };
}

async function applyIntakeAnalysis(input: {
  draftId: string;
  sessionId: string;
  draft: NonNullable<Awaited<ReturnType<typeof loadDraft>>>;
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
}): Promise<{
  intent: string;
  mergedFields: Record<string, unknown>;
  ready: boolean;
  question?: string | undefined;
  message?: string | undefined;
  unsupportedLocaleRequest?: string | undefined;
  hasEnoughContext: boolean;
}> {
  const existingFields = buildExistingFieldsContext(input.draft);
  const analysis = await analyzeIntake({
    userMessage: input.userMessage,
    existingFields,
    locale: input.draft.locale,
    conversationHistory: input.conversationHistory,
  });

  if (Object.keys(analysis.fields).length > 0) {
    await updateDraftFields(input.draftId, input.sessionId, analysis.fields);
  }

  const mergedFields = { ...existingFields, ...analysis.fields };

  if (analysis.intent !== existingFields.intent) {
    await updateDraftFields(input.draftId, input.sessionId, { intent: analysis.intent });
    mergedFields.intent = analysis.intent;
  }

  return {
    intent: analysis.intent,
    mergedFields,
    ready: analysis.ready,
    question: analysis.question,
    message: analysis.message,
    unsupportedLocaleRequest:
      typeof analysis.fields.unsupportedLocaleRequest === "string"
        ? analysis.fields.unsupportedLocaleRequest
        : undefined,
    hasEnoughContext: hasEnoughIntakeContext(
      analysis.intent,
      mergedFields,
      input.userMessage,
    ),
  };
}

async function emitUnsupportedLocaleMessage(
  draftId: string,
  conversationHistory: ConversationHistoryEntry[],
): Promise<void> {
  await emitAssistantCompletion(draftId, conversationHistory, UNSUPPORTED_LOCALE_MESSAGE);
}

export async function handleAiMessage(input: HandleMessageInput): Promise<void> {
  const { draftId, sessionId, userContent } = input;

  try {
    const draft = await loadDraft(draftId, sessionId);
    if (!draft) {
      logger.warn({ draftId }, "Draft not found during AI processing");
      return;
    }

    const conversationHistory = await loadConversationHistory(draftId);

    if (draft.body?.trim() && conversationHistory.length > 2) {
      const localeRequest = detectPromptLocaleRequest(userContent);
      if (localeRequest.unsupportedLocaleRequest) {
        await emitUnsupportedLocaleMessage(draftId, conversationHistory);
        return;
      }

      await streamRevision(
        draftId,
        sessionId,
        draft,
        userContent,
        updateDraftFields,
        localeRequest.locale,
      );
      return;
    }

    const analysis = await applyIntakeAnalysis({
      draftId,
      sessionId,
      draft,
      userMessage: userContent,
      conversationHistory,
    });

    if (analysis.unsupportedLocaleRequest) {
      await emitUnsupportedLocaleMessage(draftId, conversationHistory);
      return;
    }

    await emitAssistantCompletion(
      draftId,
      conversationHistory,
      getIntakeReplyContent(analysis),
    );
  } catch (err) {
    logger.error({ err, draftId }, "AI processing failed");

    const errorPayload =
      err instanceof AppError
        ? { code: err.code, message: err.userMessage }
        : {
            code: "AI_PROCESSING_FAILED",
            message:
              "AI processing encountered an error. You can continue editing manually.",
          };

    try {
      const assistantMsg = await createMessage(getDb(), {
        draftId,
        role: "assistant",
        content: errorPayload.message,
      });

      emitDraftEvent(draftId, "ai_message_complete", {
        messageId: assistantMsg.id,
        fullContent: errorPayload.message,
      });
    } catch (messageErr) {
      logger.error({ err: messageErr, draftId }, "Failed to persist AI error message");
    }

    emitDraftEvent(draftId, "error", errorPayload);
  }
}

export async function handleComposeFromContext(
  input: HandleComposeFromContextInput,
): Promise<void> {
  const { draftId, sessionId } = input;

  const lock = await acquireRedisLock(`ai-compose:${draftId}`, COMPOSE_LOCK_TTL_MS);
  if (!lock) {
    logger.info(
      { draftId },
      "Skipping duplicate context composition while one is already running",
    );
    return;
  }

  try {
    const draft = await loadDraft(draftId, sessionId);
    if (!draft) {
      logger.warn({ draftId }, "Draft not found during context composition");
      return;
    }

    if (draft.body?.trim()) {
      logger.info(
        { draftId },
        "Skipping context composition because body already exists",
      );
      return;
    }

    const conversationHistory = await loadConversationHistory(draftId);
    const userInstructions = buildComposeInstructions(conversationHistory);

    if (!userInstructions) {
      emitDraftEvent(draftId, "error", {
        code: "AI_CONTEXT_MISSING",
        message: "Add a short description first so the draft can be composed.",
      });
      return;
    }

    const existingFields = buildExistingFieldsContext(draft);
    const existingIntent =
      typeof existingFields.intent === "string" && existingFields.intent.trim().length > 0
        ? existingFields.intent
        : null;

    if (
      existingIntent &&
      hasEnoughIntakeContext(existingIntent, existingFields, userInstructions)
    ) {
      await streamDraftGeneration(
        draftId,
        sessionId,
        draft,
        { ...existingFields, intent: existingIntent },
        existingIntent,
        conversationHistory,
        userInstructions,
        updateDraftFields,
      );
      return;
    }

    const analysis = await applyIntakeAnalysis({
      draftId,
      sessionId,
      draft,
      userMessage: userInstructions,
      conversationHistory,
    });

    if (analysis.unsupportedLocaleRequest) {
      await emitUnsupportedLocaleMessage(draftId, conversationHistory);
      return;
    }

    if (analysis.question?.trim() && !analysis.hasEnoughContext) {
      await emitAssistantCompletion(
        draftId,
        conversationHistory,
        getIntakeReplyContent(analysis),
      );
      return;
    }

    if (!analysis.ready && !analysis.hasEnoughContext) {
      await emitAssistantCompletion(
        draftId,
        conversationHistory,
        getIntakeReplyContent(analysis),
      );
      return;
    }

    await streamDraftGeneration(
      draftId,
      sessionId,
      draft,
      analysis.mergedFields,
      analysis.intent,
      conversationHistory,
      userInstructions,
      updateDraftFields,
    );
  } catch (err) {
    logger.error({ err, draftId }, "Context-based AI composition failed");

    const errorPayload =
      err instanceof AppError
        ? { code: err.code, message: err.userMessage }
        : {
            code: "AI_PROCESSING_FAILED",
            message:
              "AI processing encountered an error. You can continue editing manually.",
          };

    try {
      const assistantMsg = await createMessage(getDb(), {
        draftId,
        role: "assistant",
        content: errorPayload.message,
      });

      emitDraftEvent(draftId, "ai_message_complete", {
        messageId: assistantMsg.id,
        fullContent: errorPayload.message,
      });
    } catch (messageErr) {
      logger.error(
        { err: messageErr, draftId },
        "Failed to persist compose error message",
      );
    }

    emitDraftEvent(draftId, "error", errorPayload);
  } finally {
    try {
      await lock.release();
    } catch (releaseErr) {
      logger.warn({ err: releaseErr, draftId }, "Failed to release compose lock");
    }
  }
}
