// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { decodePcm16Bytes, startDictationCapture } from "../src/lib/dictation-audio";

type FakeTrack = { stop: ReturnType<typeof vi.fn> };
type FakeStream = { getTracks: () => FakeTrack[] };
type FakeProcessor = {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  onaudioprocess:
    | ((event: {
        inputBuffer: { getChannelData: (channel: number) => Float32Array };
      }) => void)
    | null;
};

const captureState = vi.hoisted(() => ({
  track: { stop: vi.fn() } as FakeTrack,
  processor: null as FakeProcessor | null,
  audioContextClose: vi.fn(async () => undefined),
}));

class FakeAudioContext {
  sampleRate = 48_000;
  state: AudioContextState = "running";
  destination = {};

  createMediaStreamSource() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  createScriptProcessor() {
    const processor: FakeProcessor = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      onaudioprocess: null,
    };

    captureState.processor = processor;
    return processor;
  }

  createGain() {
    return {
      gain: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  async close() {
    this.state = "closed";
    await captureState.audioContextClose();
  }
}

describe("startDictationCapture", () => {
  beforeEach(() => {
    captureState.track.stop.mockReset();
    captureState.audioContextClose.mockReset();
    captureState.processor = null;

    vi.stubGlobal("AudioContext", FakeAudioContext as unknown as typeof AudioContext);
    Object.defineProperty(globalThis.navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(
          async () =>
            ({
              getTracks: () => [captureState.track],
            }) satisfies FakeStream,
        ),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resamples captured browser audio to 16 kHz PCM before streaming or buffering it", async () => {
    const onPcmChunk = vi.fn();
    const capture = await startDictationCapture({ onPcmChunk });

    captureState.processor?.onaudioprocess?.({
      inputBuffer: {
        getChannelData: () => new Float32Array([0, 0.25, 0.5, 0.75, 0.5, 0.25]),
      },
    });

    expect(onPcmChunk).toHaveBeenCalledTimes(1);
    expect(
      Array.from(decodePcm16Bytes(onPcmChunk.mock.calls[0]?.[0] as Uint8Array)),
    ).toEqual([0, Math.round(0.75 * 0x7fff)]);

    const bufferedPcm = await capture.stop();
    expect(Array.from(decodePcm16Bytes(bufferedPcm))).toEqual([
      0,
      Math.round(0.75 * 0x7fff),
    ]);
    expect(captureState.track.stop).toHaveBeenCalledTimes(1);
    expect(captureState.audioContextClose).toHaveBeenCalledTimes(1);
  });
});
