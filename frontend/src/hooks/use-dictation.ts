"use client";

import {
  DICTATION_LIMITS,
  DictationLiveClientEventSchema,
  DictationLiveServerEventSchema,
  type DictationFieldContext,
} from "@episto/shared";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { getApiWebSocketUrl } from "../lib/api";
import {
  startDictationCapture,
  type DictationCaptureSession,
} from "../lib/dictation-audio";
import {
  appendTranscript,
  buildDictationQuery,
  closeSocket,
  createDelay,
  getDictationSupportSnapshot,
  mapStartError,
  requestBufferedTranscription,
  subscribeToStaticBrowserCapability,
  type DictationError,
} from "./dictation-shared";

export type { DictationError } from "./dictation-shared";

export interface UseDictationOptions {
  draftId?: string;
  fieldContext: DictationFieldContext;
}

export interface UseDictationReturn {
  isSupported: boolean;
  isRecording: boolean;
  finalText: string;
  startRecording: (locale: string) => Promise<void>;
  stopRecording: () => Promise<void>;
  clearError: () => void;
  resetText: () => void;
  error: DictationError | null;
}

export function useDictation(options: UseDictationOptions): UseDictationReturn {
  const isSupported = useSyncExternalStore(
    subscribeToStaticBrowserCapability,
    getDictationSupportSnapshot,
    () => false,
  );
  const [isRecording, setIsRecording] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<DictationError | null>(null);

  const captureRef = useRef<DictationCaptureSession | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const finalTextRef = useRef("");
  const attemptBaseFinalTextRef = useRef("");
  const attemptIdRef = useRef(0);
  const currentAttemptFinalTextRef = useRef("");
  const isRecordingRef = useRef(false);
  const finalizingAttemptRef = useRef<number | null>(null);
  const stopRequestedRef = useRef(false);
  const liveFailedRef = useRef(false);
  const stopSignalRef = useRef<(() => void) | null>(null);
  const elapsedIntervalRef = useRef<number | null>(null);
  const maxCaptureSecondsRef = useRef(DICTATION_LIMITS.maxCaptureSeconds);

  const clearElapsedInterval = useCallback(() => {
    if (elapsedIntervalRef.current !== null) {
      window.clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  const setRecordingState = useCallback(
    (value: boolean) => {
      isRecordingRef.current = value;
      setIsRecording(value);
      if (!value) {
        clearElapsedInterval();
      }
    },
    [clearElapsedInterval],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const commitCurrentAttemptText = useCallback((nextText: string) => {
    const merged = appendTranscript(attemptBaseFinalTextRef.current, nextText);
    currentAttemptFinalTextRef.current = nextText.trim();
    finalTextRef.current = merged;
    setFinalText(merged);
  }, []);

  const resetText = useCallback(() => {
    finalTextRef.current = "";
    attemptBaseFinalTextRef.current = "";
    currentAttemptFinalTextRef.current = "";
    setFinalText("");
  }, []);

  const stopRecording = useCallback(async () => {
    const attemptId = attemptIdRef.current;
    if (attemptId === 0 || finalizingAttemptRef.current === attemptId) {
      return;
    }

    finalizingAttemptRef.current = attemptId;
    stopRequestedRef.current = true;
    setRecordingState(false);

    try {
      const capture = captureRef.current;
      captureRef.current = null;
      const pcmAudio = capture ? await capture.stop() : new Uint8Array();
      const socket = socketRef.current;

      if (socket?.readyState === WebSocket.OPEN) {
        const stopSignal = new Promise<void>((resolve) => {
          stopSignalRef.current = resolve;
        });

        socket.send(
          JSON.stringify(DictationLiveClientEventSchema.parse({ type: "stop" })),
        );
        await Promise.race([stopSignal, createDelay(1500)]);
        closeSocket(socket);
      } else if (socket) {
        closeSocket(socket);
      }

      socketRef.current = null;
      stopSignalRef.current?.();
      stopSignalRef.current = null;

      const hasLiveTranscript = currentAttemptFinalTextRef.current.trim().length > 0;
      if (pcmAudio.byteLength > 0 && !hasLiveTranscript) {
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
            commitCurrentAttemptText(transcript);
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
  }, [
    commitCurrentAttemptText,
    options.draftId,
    options.fieldContext,
    setRecordingState,
  ]);

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
      clearElapsedInterval();
    };
  }, [clearElapsedInterval]);

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
      attemptBaseFinalTextRef.current = finalTextRef.current;
      currentAttemptFinalTextRef.current = "";
      const query = buildDictationQuery(locale, options.fieldContext, options.draftId);
      const socket = new WebSocket(getApiWebSocketUrl(`/v1/dictation/live?${query}`));
      socketRef.current = socket;
      liveFailedRef.current = false;
      stopRequestedRef.current = false;
      setError(null);
      const startedAt =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const queuedAudioChunks: Uint8Array[] = [];
      let capture: DictationCaptureSession | null = null;
      let socketOpened = socket.readyState === WebSocket.OPEN;

      const flushQueuedAudio = () => {
        if (attemptId !== attemptIdRef.current || socket.readyState !== WebSocket.OPEN) {
          return;
        }

        for (const chunk of queuedAudioChunks) {
          socket.send(chunk);
        }

        queuedAudioChunks.length = 0;
      };

      socket.onopen = () => {
        if (attemptId !== attemptIdRef.current) {
          return;
        }

        socketOpened = true;
        flushQueuedAudio();
      };

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
            maxCaptureSecondsRef.current = parsed.data.maxCaptureSeconds;
            return;
          case "partial":
            return;
          case "final":
            commitCurrentAttemptText(
              appendTranscript(currentAttemptFinalTextRef.current, parsed.data.text),
            );
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
            stopSignalRef.current?.();
            stopSignalRef.current = null;
        }
      };

      socket.onerror = () => {
        if (attemptId !== attemptIdRef.current) {
          return;
        }

        liveFailedRef.current = true;

        if (!socketOpened) {
          closeSocket(socket);
          socketRef.current = null;
        }
      };

      socket.onclose = () => {
        if (attemptId !== attemptIdRef.current) {
          return;
        }

        socketRef.current = null;
        stopSignalRef.current?.();
        stopSignalRef.current = null;

        if (!socketOpened) {
          liveFailedRef.current = true;
          return;
        }

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
        capture = await startDictationCapture({
          onPcmChunk: (chunk) => {
            if (attemptId !== attemptIdRef.current) {
              return;
            }

            if (socket.readyState === WebSocket.OPEN) {
              socket.send(chunk);
              return;
            }

            queuedAudioChunks.push(chunk);
          },
        });

        if (attemptId !== attemptIdRef.current) {
          await capture.abort();
          return;
        }

        captureRef.current = capture;
        setRecordingState(true);

        clearElapsedInterval();
        elapsedIntervalRef.current = window.setInterval(() => {
          if (attemptId !== attemptIdRef.current || !isRecordingRef.current) {
            return;
          }
          const now = typeof performance !== "undefined" ? performance.now() : Date.now();
          const nextElapsed = Math.min(
            maxCaptureSecondsRef.current,
            Math.floor((now - startedAt) / 1000),
          );

          if (nextElapsed >= maxCaptureSecondsRef.current) {
            void stopRecordingRef.current();
          }
        }, 250);
      } catch (startError) {
        if (attemptId !== attemptIdRef.current) {
          return;
        }

        if (capture) {
          await capture.abort();
        }

        closeSocket(socket);
        socketRef.current = null;
        setRecordingState(false);
        setError(mapStartError(startError));
      }
    },
    [
      clearElapsedInterval,
      commitCurrentAttemptText,
      isSupported,
      options.draftId,
      options.fieldContext,
      setRecordingState,
    ],
  );

  return {
    isSupported,
    isRecording,
    finalText,
    startRecording,
    stopRecording,
    clearError,
    resetText,
    error,
  };
}
