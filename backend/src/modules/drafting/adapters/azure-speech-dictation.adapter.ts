import { DICTATION_LIMITS } from "@episto/shared";
import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";

import { env } from "../../../shared/config/index.js";
import { providerOutageError } from "../../../shared/errors/index.js";
import { createLogger } from "../../../shared/logging/index.js";
import { extractBufferedWavPcm } from "./buffered-wav-audio.js";

const logger = createLogger("azure-speech-dictation");

const PCM_BITS_PER_SAMPLE = 16;
const BATCH_TRANSCRIPTION_GRACE_MS = 15_000;
const AZURE_SPEECH_LOCALE_OVERRIDES: Record<string, string> = {
  "en-CH": "en-GB",
};

// The languages Episto supports, mapped to Azure recognition locales. Used as
// the candidate set for automatic language identification so a speaker is
// transcribed in the language they actually speak — not the UI/browser locale
// (a French speaker on an English browser must not be recognised as English).
const SUPPORTED_DICTATION_LOCALES = ["de-CH", "fr-CH", "it-CH", "en-CH"] as const;
// At-start language identification allows at most four candidate languages,
// which is exactly Switzerland's set here.
const MAX_LANGUAGE_ID_CANDIDATES = 4;

function resolveAzureLocale(locale: string): string {
  return AZURE_SPEECH_LOCALE_OVERRIDES[locale] ?? locale;
}

/**
 * Candidate languages for automatic language identification. The requested UI
 * locale goes first (a tie-break hint that keeps, e.g., a German UI leaning
 * German), followed by the rest of the supported languages.
 */
export function buildCandidateLanguages(locale: string): string[] {
  const primary = resolveAzureLocale(locale);
  const seen = new Set<string>([primary]);
  const candidates = [primary];
  for (const supported of SUPPORTED_DICTATION_LOCALES) {
    const azureLocale = resolveAzureLocale(supported);
    if (!seen.has(azureLocale)) {
      seen.add(azureLocale);
      candidates.push(azureLocale);
    }
  }
  return candidates.slice(0, MAX_LANGUAGE_ID_CANDIDATES);
}

export interface LiveDictationCallbacks {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: Error) => void;
  onStopped?: () => void;
}

export interface LiveDictationSession {
  writeAudio: (chunk: Buffer) => void;
  stop: () => Promise<void>;
  close: () => Promise<void>;
}

function createBaseSpeechConfig() {
  const speechEnv = env();
  return speechsdk.SpeechConfig.fromSubscription(
    speechEnv.AZURE_SPEECH_API_KEY,
    speechEnv.AZURE_SPEECH_REGION,
  );
}

/** Single fixed recognition language — the pre-auto-detect behaviour, kept as a
 * fallback and for custom-endpoint deployments (which can't use multi-language
 * identification). */
function createSingleLanguageRecognizer(
  locale: string,
  audioConfig: speechsdk.AudioConfig,
) {
  const speechEnv = env();
  const config = createBaseSpeechConfig();
  config.speechRecognitionLanguage = resolveAzureLocale(locale);
  if (speechEnv.AZURE_SPEECH_CUSTOM_ENDPOINT_ID) {
    config.endpointId = speechEnv.AZURE_SPEECH_CUSTOM_ENDPOINT_ID;
  }
  return new speechsdk.SpeechRecognizer(config, audioConfig);
}

/** Recognizer with automatic language identification across the supported
 * languages, so the spoken language is detected rather than assumed from the
 * UI locale. Falls back to single-language recognition on any setup failure so
 * dictation can never be worse than before. */
function createAutoDetectRecognizer(locale: string, audioConfig: speechsdk.AudioConfig) {
  try {
    const config = createBaseSpeechConfig();
    // Detect the language once at the start of the utterance (lower latency than
    // continuous LID, and a dictation turn is a single language).
    config.setProperty(
      speechsdk.PropertyId.SpeechServiceConnection_LanguageIdMode,
      "AtStart",
    );
    const autoDetectConfig = speechsdk.AutoDetectSourceLanguageConfig.fromLanguages(
      buildCandidateLanguages(locale),
    );
    return speechsdk.SpeechRecognizer.FromConfig(config, autoDetectConfig, audioConfig);
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.message : String(error), locale },
      "Auto language-detection setup failed; falling back to single language",
    );
    return createSingleLanguageRecognizer(locale, audioConfig);
  }
}

function createPushStream() {
  return speechsdk.AudioInputStream.createPushStream(
    speechsdk.AudioStreamFormat.getWaveFormatPCM(
      DICTATION_LIMITS.sampleRateHz,
      PCM_BITS_PER_SAMPLE,
      DICTATION_LIMITS.channelCount,
    ),
  );
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return Uint8Array.from(buffer).buffer;
}

function applyPhraseHints(recognizer: speechsdk.SpeechRecognizer, hints: string[]) {
  const grammar = speechsdk.PhraseListGrammar.fromRecognizer(recognizer);

  for (const hint of hints) {
    grammar.addPhrase(hint);
  }
}

function isBenignCancellation(event: {
  reason?: speechsdk.CancellationReason;
  errorCode?: speechsdk.CancellationErrorCode;
}) {
  return (
    event.reason === speechsdk.CancellationReason.EndOfStream ||
    event.errorCode === speechsdk.CancellationErrorCode.NoError
  );
}

function withOperationTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(providerOutageError("Azure AI Speech", new Error(`${label} timed out`)));
    }, env().AZURE_SPEECH_REQUEST_TIMEOUT_MS);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function startContinuousRecognition(recognizer: speechsdk.SpeechRecognizer) {
  return withOperationTimeout(
    new Promise<void>((resolve, reject) => {
      recognizer.startContinuousRecognitionAsync(resolve, (error) =>
        reject(providerOutageError("Azure AI Speech", error)),
      );
    }),
    "Azure AI Speech start",
  );
}

function stopContinuousRecognition(recognizer: speechsdk.SpeechRecognizer) {
  return withOperationTimeout(
    new Promise<void>((resolve, reject) => {
      recognizer.stopContinuousRecognitionAsync(resolve, (error) =>
        reject(providerOutageError("Azure AI Speech", error)),
      );
    }),
    "Azure AI Speech stop",
  );
}

function closeRecognizer(recognizer: speechsdk.SpeechRecognizer) {
  return new Promise<void>((resolve) => {
    recognizer.close(resolve, () => resolve());
  });
}

function createRecognizer(
  locale: string,
  audioConfig: speechsdk.AudioConfig,
  hints: string[],
) {
  // A custom endpoint targets one language model, which is incompatible with
  // multi-language identification — keep single-language there.
  const useAutoDetect = !env().AZURE_SPEECH_CUSTOM_ENDPOINT_ID;
  const recognizer = useAutoDetect
    ? createAutoDetectRecognizer(locale, audioConfig)
    : createSingleLanguageRecognizer(locale, audioConfig);

  applyPhraseHints(recognizer, hints);

  return recognizer;
}

export async function createLiveDictationStream(options: {
  locale: string;
  hints: string[];
  callbacks: LiveDictationCallbacks;
}): Promise<LiveDictationSession> {
  const pushStream = createPushStream();
  const recognizer = createRecognizer(
    options.locale,
    speechsdk.AudioConfig.fromStreamInput(pushStream),
    options.hints,
  );

  let closed = false;
  let notifiedStopped = false;
  let stopPromise: Promise<void> | null = null;

  const notifyStopped = () => {
    if (notifiedStopped) {
      return;
    }

    notifiedStopped = true;
    options.callbacks.onStopped?.();
  };

  const close = async () => {
    if (closed) {
      return;
    }

    closed = true;

    try {
      pushStream.close();
    } catch {
      // The SDK tolerates duplicate closes; ignore cleanup races.
    }

    await closeRecognizer(recognizer);
  };

  recognizer.recognizing = (_sender, event) => {
    const text = event.result?.text?.trim();
    if (text) {
      options.callbacks.onPartial(text);
    }
  };

  recognizer.recognized = (_sender, event) => {
    const text = event.result?.text?.trim();
    if (text) {
      options.callbacks.onFinal(text);
    }
  };

  recognizer.canceled = (_sender, event) => {
    if (isBenignCancellation(event)) {
      notifyStopped();
      void close();
      return;
    }

    options.callbacks.onError(providerOutageError("Azure AI Speech", event.errorDetails));
    void close();
  };

  recognizer.sessionStopped = () => {
    notifyStopped();
    void close();
  };

  await startContinuousRecognition(recognizer);

  return {
    writeAudio(chunk) {
      if (closed || chunk.byteLength === 0) {
        return;
      }

      pushStream.write(toArrayBuffer(chunk));
    },
    async stop() {
      if (stopPromise) {
        return stopPromise;
      }

      stopPromise = (async () => {
        if (closed) {
          return;
        }

        pushStream.close();
        await stopContinuousRecognition(recognizer);
        notifyStopped();
        await close();
      })();

      return stopPromise;
    },
    close,
  };
}

export async function transcribeBufferedWav(options: {
  audioBuffer: Buffer;
  locale: string;
  hints: string[];
}): Promise<string> {
  extractBufferedWavPcm(options.audioBuffer);
  const recognizer = createRecognizer(
    options.locale,
    speechsdk.AudioConfig.fromWavFileInput(options.audioBuffer),
    options.hints,
  );
  const segments: string[] = [];

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(
      () => {
        fail(
          providerOutageError(
            "Azure AI Speech",
            new Error("Buffered transcription timed out"),
          ),
        );
      },
      DICTATION_LIMITS.maxCaptureSeconds * 1000 + BATCH_TRANSCRIPTION_GRACE_MS,
    );

    const cleanup = async () => {
      clearTimeout(timeoutId);
      await closeRecognizer(recognizer);
    };

    const succeed = (transcript: string) => {
      if (settled) {
        return;
      }

      settled = true;
      void cleanup().finally(() => resolve(transcript));
    };

    const fail = (error: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      void cleanup().finally(() => reject(error));
    };

    recognizer.recognized = (_sender, event) => {
      const text = event.result?.text?.trim();
      if (text) {
        segments.push(text);
      }
    };

    recognizer.canceled = (_sender, event) => {
      if (segments.length > 0 || isBenignCancellation(event)) {
        succeed(segments.join(" ").trim());
        return;
      }

      fail(providerOutageError("Azure AI Speech", event.errorDetails));
    };

    recognizer.sessionStopped = () => {
      succeed(segments.join(" ").trim());
    };

    recognizer.startContinuousRecognitionAsync(
      () => {
        // File-backed recognition starts reading immediately after the recognizer begins.
      },
      (error) => {
        fail(providerOutageError("Azure AI Speech", error));
      },
    );
  });
}
