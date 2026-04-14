import { DICTATION_LIMITS } from "@swiss-mail/shared";
import * as speechsdk from "microsoft-cognitiveservices-speech-sdk";

import { env } from "../../../shared/config/index.js";
import { providerOutageError } from "../../../shared/errors/index.js";
import { extractBufferedWavPcm } from "./buffered-wav-audio.js";

const PCM_BITS_PER_SAMPLE = 16;
const BATCH_TRANSCRIPTION_GRACE_MS = 15_000;

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

function createSpeechConfig(locale: string) {
  const speechEnv = env();
  const config = speechsdk.SpeechConfig.fromSubscription(
    speechEnv.AZURE_SPEECH_API_KEY,
    speechEnv.AZURE_SPEECH_REGION,
  );

  config.speechRecognitionLanguage = locale;

  if (speechEnv.AZURE_SPEECH_CUSTOM_ENDPOINT_ID) {
    config.endpointId = speechEnv.AZURE_SPEECH_CUSTOM_ENDPOINT_ID;
  }

  return config;
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
      recognizer.startContinuousRecognitionAsync(
        resolve,
        (error) => reject(providerOutageError("Azure AI Speech", error)),
      );
    }),
    "Azure AI Speech start",
  );
}

function stopContinuousRecognition(recognizer: speechsdk.SpeechRecognizer) {
  return withOperationTimeout(
    new Promise<void>((resolve, reject) => {
      recognizer.stopContinuousRecognitionAsync(
        resolve,
        (error) => reject(providerOutageError("Azure AI Speech", error)),
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
  const recognizer = new speechsdk.SpeechRecognizer(createSpeechConfig(locale), audioConfig);

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
    const timeoutId = setTimeout(() => {
      fail(providerOutageError("Azure AI Speech", new Error("Buffered transcription timed out")));
    }, DICTATION_LIMITS.maxCaptureSeconds * 1000 + BATCH_TRANSCRIPTION_GRACE_MS);

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
