"use client";

import {
  DictationLiveClientEventSchema,
  DictationLiveServerEventSchema,
  DictationTranscriptionResponseSchema,
  type DictationFieldContext,
} from "@swiss-mail/shared";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { getApiUrl, getApiWebSocketUrl } from "../lib/api";
import {
  buildWavBlob,
  startDictationCapture,
  supportsDictationCapture,
  type DictationCaptureSession,
} from "../lib/dictation-audio";

const BUFFERED_TRANSCRIPTION_TIMEOUT_MS = 20_000;

export type DictationError =
  | "permission_denied"
  | "no_speech"
  | "network"
  | "not_supported"
  | "aborted";

export interface UseDictationOptions {
  draftId?: string;
  fieldContext: DictationFieldContext;
}

export interface UseDictationReturn {
  isSupported: boolean;
  isRecording: boolean;
  interimText: string;
  finalText: string;
  startRecording: (locale: string) => Promise<void>;
  stopRecording: () => Promise<void>;
  resetText: () => void;
  error: DictationError | null;
}

function subscribeToStaticBrowserCapability() {
  return () => {};
}

function getDictationSupportSnapshot() {
  return supportsDictationCapture();
}

function appendTranscript(existing: string, next: string) {
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

function createDelay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function buildDictationQuery(locale: string, fieldContext: DictationFieldContext, draftId?: string) {
  const params = new URLSearchParams({
    locale,
    fieldContext,
  });

  if (draftId) {
    params.set("draftId", draftId);
  }

  return params.toString();
}

function closeSocket(socket: WebSocket | null) {
  if (!socket) {
    return;
  }

  if (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN) {
    socket.close();
  }
}

function mapStartError(error: unknown): DictationError {
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

async function waitForSocketOpen(socket: WebSocket) {
  if (socket.readyState === WebSocket.OPEN) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Dictation socket did not open in time."));
    }, 5000);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("error", handleFailure);
      socket.removeEventListener("close", handleFailure);
    };

    const handleOpen = () => {
      cleanup();
      resolve();
    };

    const handleFailure = () => {
      cleanup();
      reject(new Error("Dictation socket failed to open."));
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("error", handleFailure);
    socket.addEventListener("close", handleFailure);
  });
}

async function requestBufferedTranscription(options: {
  locale: string;
  fieldContext: DictationFieldContext;
  draftId?: string;
  pcmAudio: Uint8Array;
}) {
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => {
    abortController.abort();
  }, BUFFERED_TRANSCRIPTION_TIMEOUT_MS);
  const query = buildDictationQuery(options.locale, options.fieldContext, options.draftId);
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

export function useDictation(options: UseDictationOptions): UseDictationReturn {
  const isSupported = useSyncExternalStore(
    subscribeToStaticBrowserCapability,
    getDictationSupportSnapshot,
    () => false,
  );
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<DictationError | null>(null);

  const captureRef = useRef<DictationCaptureSession | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const finalTextRef = useRef("");
  const attemptIdRef = useRef(0);
  const currentAttemptFinalTextRef = useRef("");
  const isRecordingRef = useRef(false);
  const finalizingAttemptRef = useRef<number | null>(null);
  const stopRequestedRef = useRef(false);
  const liveFailedRef = useRef(false);
  const stopSignalRef = useRef<(() => void) | null>(null);

  const setRecordingState = useCallback((value: boolean) => {
    isRecordingRef.current = value;
    setIsRecording(value);
  }, []);

  const appendFinalText = useCallback((nextText: string) => {
    setFinalText((current) => {
      const merged = appendTranscript(current, nextText);
      finalTextRef.current = merged;
      return merged;
    });
  }, []);

  const resetText = useCallback(() => {
    finalTextRef.current = "";
    currentAttemptFinalTextRef.current = "";
    setFinalText("");
    setInterimText("");
  }, []);

  const stopRecording = useCallback(async () => {
    const attemptId = attemptIdRef.current;
    if (attemptId === 0 || finalizingAttemptRef.current === attemptId) {
      return;
    }

    finalizingAttemptRef.current = attemptId;
    stopRequestedRef.current = true;
    setInterimText("");
    setRecordingState(false);

    try {
      const capture = captureRef.current;
      captureRef.current = null;
      const pcmAudio = capture ? await capture.stop() : new Uint8Array();
      const socket = socketRef.current;
      let shouldFallback = liveFailedRef.current;

      if (socket?.readyState === WebSocket.OPEN) {
        const stopSignal = new Promise<void>((resolve) => {
          stopSignalRef.current = resolve;
        });

        socket.send(JSON.stringify(DictationLiveClientEventSchema.parse({ type: "stop" })));
        await Promise.race([stopSignal, createDelay(1500)]);
        closeSocket(socket);
      } else if (socket) {
        shouldFallback = true;
        closeSocket(socket);
      }

      socketRef.current = null;
      stopSignalRef.current?.();
      stopSignalRef.current = null;

      const hasLiveTranscript = currentAttemptFinalTextRef.current.trim().length > 0;
      if (pcmAudio.byteLength > 0 && (shouldFallback || !hasLiveTranscript)) {
        try {
          const transcript = await requestBufferedTranscription({
            locale: localeRef.current,
            fieldContext: options.fieldContext,
            pcmAudio,
            ...(options.draftId ? { draftId: options.draftId } : {}),
          });

          if (attemptId !== attemptIdRef.current) {
            return;
          }

          if (transcript.trim()) {
            setError(null);
            appendFinalText(transcript);
          } else if (!hasLiveTranscript) {
            setError("no_speech");
          }
        } catch {
          if (attemptId !== attemptIdRef.current) {
            return;
          }

          if (!hasLiveTranscript) {
            setError("network");
          }
        }
      } else if (!hasLiveTranscript && attemptId === attemptIdRef.current) {
        setError("no_speech");
      }
    } finally {
      if (finalizingAttemptRef.current === attemptId) {
        finalizingAttemptRef.current = null;
        stopRequestedRef.current = false;
        liveFailedRef.current = false;
      }
    }
  }, [appendFinalText, options.draftId, options.fieldContext, setRecordingState]);

  const stopRecordingRef = useRef(stopRecording);
  const localeRef = useRef("");

  stopRecordingRef.current = stopRecording;

  useEffect(() => {
    return () => {
      const capture = captureRef.current;
      captureRef.current = null;
      if (capture) {
        void capture.abort();
      }

      closeSocket(socketRef.current);
      socketRef.current = null;
    };
  }, []);

  const startRecording = useCallback(
    async (locale: string) => {
      localeRef.current = locale;

      if (!isSupported) {
        setError("not_supported");
        return;
      }

      if (isRecordingRef.current) {
        await stopRecordingRef.current();
      }

      const attemptId = attemptIdRef.current + 1;
      attemptIdRef.current = attemptId;
      currentAttemptFinalTextRef.current = "";
      const query = buildDictationQuery(locale, options.fieldContext, options.draftId);
      const socket = new WebSocket(getApiWebSocketUrl(`/v1/dictation/live?${query}`));
      socketRef.current = socket;
      liveFailedRef.current = false;
      stopRequestedRef.current = false;
      setError(null);
      setInterimText("");

      socket.onmessage = (event) => {
        if (attemptId !== attemptIdRef.current) {
          return;
        }

        let payload: unknown;
        try {
          payload = JSON.parse(event.data);
        } catch {
          liveFailedRef.current = true;
          return;
        }

        const parsed = DictationLiveServerEventSchema.safeParse(payload);
        if (!parsed.success) {
          liveFailedRef.current = true;
          return;
        }

        switch (parsed.data.type) {
          case "ready":
            return;
          case "partial":
            setInterimText(parsed.data.text);
            return;
          case "final":
            setInterimText("");
            currentAttemptFinalTextRef.current = appendTranscript(
              currentAttemptFinalTextRef.current,
              parsed.data.text,
            );
            appendFinalText(parsed.data.text);
            return;
          case "error":
            liveFailedRef.current = true;
            setError("network");
            if (
              finalizingAttemptRef.current !== attemptId &&
              !stopRequestedRef.current &&
              isRecordingRef.current
            ) {
              void stopRecordingRef.current();
            }
            return;
          case "stopped":
            setInterimText("");
            stopSignalRef.current?.();
            stopSignalRef.current = null;
        }
      };

      socket.onerror = () => {
        if (attemptId !== attemptIdRef.current) {
          return;
        }

        liveFailedRef.current = true;
      };

      socket.onclose = () => {
        if (attemptId !== attemptIdRef.current) {
          return;
        }

        socketRef.current = null;
        stopSignalRef.current?.();
        stopSignalRef.current = null;

        if (
          !stopRequestedRef.current &&
          isRecordingRef.current &&
          finalizingAttemptRef.current !== attemptId
        ) {
          liveFailedRef.current = true;
          void stopRecordingRef.current();
        }
      };

      try {
        await waitForSocketOpen(socket);
        const capture = await startDictationCapture({
          onPcmChunk: (chunk) => {
            if (attemptId === attemptIdRef.current && socket.readyState === WebSocket.OPEN) {
              socket.send(chunk);
            }
          },
        });

        if (attemptId !== attemptIdRef.current) {
          await capture.abort();
          return;
        }

        captureRef.current = capture;
        setRecordingState(true);
      } catch (startError) {
        if (attemptId !== attemptIdRef.current) {
          return;
        }

        closeSocket(socket);
        socketRef.current = null;
        setRecordingState(false);
        setInterimText("");
        setError(mapStartError(startError));
      }
    },
    [appendFinalText, isSupported, options.draftId, options.fieldContext, setRecordingState],
  );

  return {
    isSupported,
    isRecording,
    interimText,
    finalText,
    startRecording,
    stopRecording,
    resetText,
    error,
  };
}
