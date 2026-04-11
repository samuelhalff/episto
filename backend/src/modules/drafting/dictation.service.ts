import type { DictationSessionQuery } from "@swiss-mail/shared";

import type { Db } from "../../db/index.js";
import { notFoundError } from "../../shared/errors/index.js";
import { getDraftById } from "./draft.service.js";
import { DEFAULT_SWISS_RECIPIENT_HINTS, collectDraftContextHints, mergeDictationHints } from "./dictation-hints.js";
import { getRecipientProfile, getSenderProfile } from "./profile.service.js";
import {
  createLiveDictationStream,
  transcribeBufferedWav,
  type LiveDictationCallbacks,
  type LiveDictationSession,
} from "./adapters/azure-speech-dictation.adapter.js";

export interface ResolvedDictationContext {
  locale: string;
  fieldContext: DictationSessionQuery["fieldContext"];
  draftId: string | null;
  hints: string[];
}

export async function resolveDictationContext(
  db: Db,
  sessionId: string,
  query: DictationSessionQuery,
): Promise<ResolvedDictationContext> {
  if (!query.draftId) {
    return {
      locale: query.locale,
      fieldContext: query.fieldContext,
      draftId: null,
      hints: mergeDictationHints({
        canonicalHints: DEFAULT_SWISS_RECIPIENT_HINTS,
      }),
    };
  }

  const draft = await getDraftById(db, query.draftId, sessionId);
  if (!draft) {
    throw notFoundError("draft");
  }

  const [sender, recipient] = await Promise.all([
    draft.senderProfileId ? getSenderProfile(db, draft.senderProfileId, sessionId) : null,
    draft.recipientProfileId ? getRecipientProfile(db, draft.recipientProfileId, sessionId) : null,
  ]);

  return {
    locale: query.locale,
    fieldContext: query.fieldContext,
    draftId: draft.id,
    hints: mergeDictationHints({
      contextHints: collectDraftContextHints({
        draft,
        sender,
        recipient,
      }),
      canonicalHints: DEFAULT_SWISS_RECIPIENT_HINTS,
    }),
  };
}

export function createLiveDictationSession(options: {
  locale: string;
  hints: string[];
  callbacks: LiveDictationCallbacks;
}): Promise<LiveDictationSession> {
  return createLiveDictationStream(options);
}

export function transcribeBufferedDictation(options: {
  audioBuffer: Buffer;
  locale: string;
  hints: string[];
}): Promise<string> {
  return transcribeBufferedWav(options);
}
