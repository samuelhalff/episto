import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const pushStream = {
    write: vi.fn(),
    close: vi.fn(),
  };

  const phraseList = {
    addPhrase: vi.fn(),
  };

  class MockSpeechRecognizer {
    static instances: MockSpeechRecognizer[] = [];

    recognizing:
      | ((sender: MockSpeechRecognizer, event: { result?: { text?: string } }) => void)
      | undefined;
    recognized:
      | ((sender: MockSpeechRecognizer, event: { result?: { text?: string } }) => void)
      | undefined;
    canceled:
      | ((sender: MockSpeechRecognizer, event: { errorDetails?: string }) => void)
      | undefined;
    sessionStopped:
      | ((sender: MockSpeechRecognizer, event: Record<string, never>) => void)
      | undefined;

    readonly startContinuousRecognitionAsync = vi.fn((cb?: () => void) => {
      cb?.();
    });
    readonly stopContinuousRecognitionAsync = vi.fn((cb?: () => void) => {
      cb?.();
    });
    readonly close = vi.fn((cb?: () => void) => {
      cb?.();
    });

    constructor() {
      MockSpeechRecognizer.instances.push(this);
    }
  }

  return {
    pushStream,
    phraseList,
    MockSpeechRecognizer,
  };
});

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    AZURE_SPEECH_REGION: "switzerlandnorth",
    AZURE_SPEECH_API_KEY: "speech-key",
    AZURE_SPEECH_REQUEST_TIMEOUT_MS: 15000,
    AZURE_SPEECH_CUSTOM_ENDPOINT_ID: undefined,
  }),
}));

vi.mock("microsoft-cognitiveservices-speech-sdk", () => ({
  AudioConfig: {
    fromStreamInput: vi.fn(() => ({})),
  },
  AudioInputStream: {
    createPushStream: vi.fn(() => mocks.pushStream),
  },
  AudioStreamFormat: {
    getWaveFormatPCM: vi.fn(() => ({})),
  },
  PhraseListGrammar: {
    fromRecognizer: vi.fn(() => mocks.phraseList),
  },
  SpeechConfig: {
    fromSubscription: vi.fn(() => ({
      speechRecognitionLanguage: "en-CH",
      endpointId: undefined,
    })),
  },
  SpeechRecognizer: mocks.MockSpeechRecognizer,
}));

import {
  createLiveDictationStream,
  transcribeBufferedWav,
} from "../src/modules/drafting/adapters/azure-speech-dictation.adapter.js";

describe("Azure speech dictation adapter", () => {
  beforeEach(() => {
    mocks.MockSpeechRecognizer.instances.length = 0;
    mocks.pushStream.write.mockReset();
    mocks.pushStream.close.mockReset();
    mocks.phraseList.addPhrase.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("streams live partial/final transcripts and applies phrase hints", async () => {
    const onPartial = vi.fn();
    const onFinal = vi.fn();
    const onError = vi.fn();
    const onStopped = vi.fn();

    const session = await createLiveDictationStream({
      locale: "de-CH",
      hints: ["Migros", "Swiss Post"],
      callbacks: {
        onPartial,
        onFinal,
        onError,
        onStopped,
      },
    });

    const recognizer = mocks.MockSpeechRecognizer.instances[0];
    recognizer?.recognizing?.(recognizer, { result: { text: "Gute" } });
    recognizer?.recognized?.(recognizer, { result: { text: "Guten Tag" } });

    session.writeAudio(Buffer.from([1, 2, 3]));
    await session.stop();

    expect(onPartial).toHaveBeenCalledWith("Gute");
    expect(onFinal).toHaveBeenCalledWith("Guten Tag");
    expect(onError).not.toHaveBeenCalled();
    expect(onStopped).toHaveBeenCalled();
    expect(mocks.pushStream.write).toHaveBeenCalledTimes(1);
    expect(mocks.pushStream.close).toHaveBeenCalled();
    expect(mocks.phraseList.addPhrase).toHaveBeenCalledWith("Migros");
    expect(mocks.phraseList.addPhrase).toHaveBeenCalledWith("Swiss Post");
  });

  it("concatenates buffered transcription segments into one transcript", async () => {
    const transcriptionPromise = transcribeBufferedWav({
      audioBuffer: Buffer.from("RIFF"),
      locale: "de-CH",
      hints: ["Migros"],
    });

    const recognizer = mocks.MockSpeechRecognizer.instances[0];
    recognizer?.recognized?.(recognizer, { result: { text: "Bitte" } });
    recognizer?.recognized?.(recognizer, { result: { text: "kuendigen" } });
    recognizer?.sessionStopped?.(recognizer, {});

    await expect(transcriptionPromise).resolves.toBe("Bitte kuendigen");
    expect(mocks.pushStream.write).toHaveBeenCalled();
    expect(mocks.pushStream.close).toHaveBeenCalled();
  });
});
