"use client";

import {
  DICTATION_LIMITS,
  DictationLiveClientEventSchema,
  DictationLiveServerEventSchema,
  type DictationFieldContext,
} from "@swiss-mail/shared";
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
  isProcessing: boolean;
  audioLevel: number;
  elapsedSeconds: number;
  maxCaptureSeconds: number;
  interimText: string;
  finalText: string;
  startRecording: (locale: string) => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [maxCaptureSeconds, setMaxCaptureSeconds] = useState<number>(
    DICTATION_LIMITS.maxCaptureSeconds,
  );
  const [interimText, setInterimText] = useState("");
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
  const cancelRequestedRef = useRef(false);
  const liveFailedRef = useRef(false);
  const stopSignalRef = useRef<(() => void) | null>(null);
  const elapsedIntervalRef = useRef<number | null>(null);
  const audioLevelRafRef = useRef<number | null>(null);
  const pendingAudioLevelRef = useRef(0);
  const maxCaptureSecondsRef = useRef(DICTATION_LIMITS.maxCaptureSeconds);

  const clearElapsedInterval = useCallback(() => {
    if (elapsedIntervalRef.current !== null) {
      window.clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  const clearAudioLevelFrame = useCallback(() => {
    if (audioLevelRafRef.current !== null) {
      window.cancelAnimationFrame(audioLevelRafRef.current);
      audioLevelRafRef.current = null;
    }
  }, []);

  const setRecordingState = useCallback(
    (value: boolean) => {
      isRecordingRef.current = value;
      setIsRecording(value);
      if (!value) {
        clearElapsedInterval();
        clearAudioLevelFrame();
        pendingAudioLevelRef.current = 0;
        setAudioLevel(0);
      }
    },
    [clearAudioLevelFrame, clearElapsedInterval],
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
    setInterimText("");
  }, []);

  const stopRecording = useCallback(async () => {
    const attemptId = attemptIdRef.current;
    if (attemptId === 0 || finalizingAttemptRef.current === attemptId) {
      return;
    }

    const wasCancelled = cancelRequestedRef.current;
    finalizingAttemptRef.current = attemptId;
    stopRequestedRef.current = true;
    setInterimText("");
    setRecordingState(false);
    if (!wasCancelled) {
      setIsProcessing(true);
    }

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

        socket.send(
          JSON.stringify(DictationLiveClientEventSchema.parse({ type: "stop" })),
        );
        await Promise.race([stopSignal, createDelay(1500)]);
        closeSocket(socket);
      } else if (socket) {
        shouldFallback = true;
        closeSocket(socket);
      }

      socketRef.current = null;
      stopSignalRef.current?.();
      stopSignalRef.current = null;

      if (wasCancelled) {
        return;
      }

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
        cancelRequestedRef.current = false;
        liveFailedRef.current = false;
        setIsProcessing(false);
      }
    }
  }, [
    commitCurrentAttemptText,
    options.draftId,
    options.fieldContext,
    setRecordingState,
  ]);

  const cancelRecording = useCallback(async () => {
    cancelRequestedRef.current = true;
    setError(null);
    await stopRecording();
  }, [stopRecording]);

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
      clearAudioLevelFrame();
    };
  }, [clearAudioLevelFrame, clearElapsedInterval]);

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
      cancelRequestedRef.current = false;
      setError(null);
      setInterimText("");
      setElapsedSeconds(0);
      setMaxCaptureSeconds(maxCaptureSecondsRef.current);
      setAudioLevel(0);
      pendingAudioLevelRef.current = 0;
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
            setMaxCaptureSeconds(parsed.data.maxCaptureSeconds);
            return;
          case "partial":
            setInterimText(parsed.data.text);
            return;
          case "final":
            setInterimText("");
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

      const scheduleAudioLevelFrame = () => {
        if (audioLevelRafRef.current !== null) {
          return;
        }

        audioLevelRafRef.current = window.requestAnimationFrame(() => {
          audioLevelRafRef.current = null;
          if (attemptId !== attemptIdRef.current) {
            return;
          }

          setAudioLevel(pendingAudioLevelRef.current);
        });
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
          onAudioLevel: (level) => {
            if (attemptId !== attemptIdRef.current) {
              return;
            }

            pendingAudioLevelRef.current = level;
            scheduleAudioLevelFrame();
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
          setElapsedSeconds(nextElapsed);

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
        setInterimText("");
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
    isProcessing,
    audioLevel,
    elapsedSeconds,
    maxCaptureSeconds,
    interimText,
    finalText,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
    resetText,
    error,
  };
}
