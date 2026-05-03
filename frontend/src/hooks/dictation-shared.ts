"use client";

import {
  DictationTranscriptionResponseSchema,
  type DictationFieldContext,
} from "@episto/shared";

import { getApiUrl } from "../lib/api";
import { buildWavBlob, supportsDictationCapture } from "../lib/dictation-audio";

const BUFFERED_TRANSCRIPTION_TIMEOUT_MS = 20_000;

export type DictationError =
  | "permission_denied"
  | "no_speech"
  | "network"
  | "not_supported"
  | "aborted";

export function subscribeToStaticBrowserCapability() {
  return () => {};
}

export function getDictationSupportSnapshot() {
  return supportsDictationCapture();
}

export function appendTranscript(existing: string, next: string) {
  const trimmedNext = next.trim();
  if (!trimmedNext) {
    return existing;
  }

  const trimmedExisting = existing.trim();
  if (!trimmedExisting) {
    return trimmedNext;
  }

  const normalizedExisting = trimmedExisting.toLocaleLowerCase("en-CH");
  const normalizedNext = trimmedNext.toLocaleLowerCase("en-CH");
  if (normalizedExisting.endsWith(normalizedNext)) {
    return trimmedExisting;
  }

  return `${trimmedExisting} ${trimmedNext}`;
}

export function createDelay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

export function buildDictationQuery(
  locale: string,
  fieldContext: DictationFieldContext,
  draftId?: string,
) {
  const params = new URLSearchParams({ locale, fieldContext });
  if (draftId) params.set("draftId", draftId);
  return params.toString();
}

export function closeSocket(socket: WebSocket | null) {
  if (!socket) {
    return;
  }

  if (
    socket.readyState === WebSocket.CONNECTING ||
    socket.readyState === WebSocket.OPEN
  ) {
    socket.close();
  }
}

export function mapStartError(error: unknown): DictationError {
  if (
    error instanceof Error &&
    (error.message.includes("socket") || error.message.includes("Socket"))
  ) {
    return "network";
  }

  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "permission_denied";
    }

    if (error.name === "AbortError") {
      return "aborted";
    }
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "NotAllowedError"
  ) {
    return "permission_denied";
  }

  return "not_supported";
}

export async function requestBufferedTranscription(options: {
  locale: string;
  fieldContext: DictationFieldContext;
  draftId?: string;
  pcmAudio: Uint8Array;
}) {
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => {
    abortController.abort();
  }, BUFFERED_TRANSCRIPTION_TIMEOUT_MS);
  const query = buildDictationQuery(
    options.locale,
    options.fieldContext,
    options.draftId,
  );

  try {
    const response = await fetch(getApiUrl(`/v1/dictation/transcribe?${query}`), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "audio/wav",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: buildWavBlob(options.pcmAudio),
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error("Buffered dictation transcription failed.");
    }

    return DictationTranscriptionResponseSchema.parse(await response.json()).transcript;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
