"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DictationError =
  | "permission_denied"
  | "no_speech"
  | "network"
  | "not_supported"
  | "aborted";

export interface UseDictationReturn {
  /** False when the browser does not support the Web Speech API */
  isSupported: boolean;
  isRecording: boolean;
  /** Partial recognition result (in-progress utterance) */
  interimText: string;
  /** Committed recognition result (stable utterance) */
  finalText: string;
  startRecording: (locale: string) => void;
  stopRecording: () => void;
  /** Reset finalText and interimText to empty */
  resetText: () => void;
  error: DictationError | null;
}

// ---------------------------------------------------------------------------
// Web Speech API typings (not in all TS lib versions)
// ---------------------------------------------------------------------------

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

function getSpeechRecognitionConstructor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useDictation(): UseDictationReturn {
  const [isSupported] = useState(() => getSpeechRecognitionConstructor() !== null);
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<DictationError | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const startRecording = useCallback((locale: string) => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setError("not_supported");
      return;
    }

    // Stop any existing session first
    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = locale; // e.g. "de-CH", "fr-CH", "it-CH", "en-CH"

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        setFinalText((prev) => prev + final);
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      switch (event.error) {
        case "not-allowed":
        case "service-not-allowed":
          setError("permission_denied");
          break;
        case "no-speech":
          setError("no_speech");
          break;
        case "network":
          setError("network");
          break;
        case "aborted":
          setError("aborted");
          break;
        default:
          setError("not_supported");
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    setError(null);
    setInterimText("");
    setIsRecording(true);
    recognition.start();
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setInterimText("");
  }, []);

  const resetText = useCallback(() => {
    setFinalText("");
    setInterimText("");
  }, []);

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
