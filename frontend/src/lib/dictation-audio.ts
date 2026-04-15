"use client";

import { DICTATION_LIMITS } from "@swiss-mail/shared";

export interface DictationCaptureSession {
  stop: () => Promise<Uint8Array>;
  abort: () => Promise<void>;
}

export interface StreamingPcm16Resampler {
  process: (samples: Float32Array) => Uint8Array;
}

type BrowserAudioContext = AudioContext & {
  createScriptProcessor: (
    bufferSize: number,
    numberOfInputChannels: number,
    numberOfOutputChannels: number,
  ) => ScriptProcessorNode;
};

type BrowserAudioContextCtor = new (options?: AudioContextOptions) => BrowserAudioContext;

function getAudioContextCtor(): BrowserAudioContextCtor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const browserWindow = window as typeof window & {
    webkitAudioContext?: BrowserAudioContextCtor;
  };

  return (
    (window.AudioContext as BrowserAudioContextCtor | undefined) ??
    browserWindow.webkitAudioContext ??
    null
  );
}

function float32ToPcm16(samples: Float32Array): Uint8Array {
  const pcm = new Int16Array(samples.length);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return new Uint8Array(pcm.buffer);
}

function concatFloat32(left: Float32Array, right: Float32Array) {
  if (left.length === 0) {
    return right;
  }

  if (right.length === 0) {
    return left;
  }

  const merged = new Float32Array(left.length + right.length);
  merged.set(left);
  merged.set(right, left.length);
  return merged;
}

export function decodePcm16Bytes(bytes: Uint8Array): Int16Array {
  return new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
}

export function createStreamingPcm16Resampler(
  inputSampleRate: number,
  outputSampleRate: number,
): StreamingPcm16Resampler {
  if (
    !Number.isFinite(inputSampleRate) ||
    !Number.isFinite(outputSampleRate) ||
    inputSampleRate <= 0 ||
    outputSampleRate <= 0 ||
    inputSampleRate === outputSampleRate
  ) {
    return {
      process(samples) {
        return float32ToPcm16(samples);
      },
    };
  }

  const ratio = inputSampleRate / outputSampleRate;
  let pending = new Float32Array(0);
  let position = 0;

  return {
    process(samples) {
      const source = concatFloat32(pending, samples);
      const resampled: number[] = [];

      while (position + 1 < source.length) {
        const lowerIndex = Math.floor(position);
        const upperIndex = Math.min(lowerIndex + 1, source.length - 1);
        const fraction = position - lowerIndex;
        const lowerSample = source[lowerIndex] ?? 0;
        const upperSample = source[upperIndex] ?? lowerSample;

        resampled.push(lowerSample + (upperSample - lowerSample) * fraction);
        position += ratio;
      }

      const consumed = Math.min(Math.floor(position), source.length);
      pending = new Float32Array(source.subarray(consumed));
      position -= consumed;

      return float32ToPcm16(Float32Array.from(resampled));
    },
  };
}

function concatChunks(chunks: Uint8Array[]) {
  const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function stopTracks(stream: MediaStream) {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

export function supportsDictationCapture() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof window.WebSocket !== "undefined" &&
    typeof window.Blob !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    getAudioContextCtor() !== null
  );
}

export function buildWavBlob(pcmBytes: Uint8Array) {
  const headerBuffer = new ArrayBuffer(44);
  const wavBytes = Uint8Array.from(pcmBytes).buffer;
  const view = new DataView(headerBuffer);
  const byteRate =
    DICTATION_LIMITS.sampleRateHz * DICTATION_LIMITS.channelCount * (16 / 8);
  const blockAlign = DICTATION_LIMITS.channelCount * (16 / 8);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + pcmBytes.byteLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, DICTATION_LIMITS.channelCount, true);
  view.setUint32(24, DICTATION_LIMITS.sampleRateHz, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, pcmBytes.byteLength, true);

  return new Blob([headerBuffer, wavBytes], { type: "audio/wav" });
}

function computeRmsLevel(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0;
  }

  let sumOfSquares = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const value = samples[index] ?? 0;
    sumOfSquares += value * value;
  }

  const rms = Math.sqrt(sumOfSquares / samples.length);
  // Perceptual curve: boost quiet speech (~0.02..0.3 RMS) into a visible range.
  return Math.min(1, Math.max(0, rms * 4));
}

export async function startDictationCapture(options: {
  onPcmChunk: (chunk: Uint8Array) => void;
  onAudioLevel?: (level: number) => void;
}): Promise<DictationCaptureSession> {
  const AudioContextCtor = getAudioContextCtor();
  if (!AudioContextCtor || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Dictation capture is not supported in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: DICTATION_LIMITS.channelCount,
      sampleRate: DICTATION_LIMITS.sampleRateHz,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const audioContext = new AudioContextCtor({
    sampleRate: DICTATION_LIMITS.sampleRateHz,
  });
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(
    4096,
    DICTATION_LIMITS.channelCount,
    DICTATION_LIMITS.channelCount,
  );
  const sink = audioContext.createGain();
  const chunks: Uint8Array[] = [];
  let closed = false;
  const pcmResampler = createStreamingPcm16Resampler(
    audioContext.sampleRate,
    DICTATION_LIMITS.sampleRateHz,
  );

  sink.gain.value = 0;

  processor.onaudioprocess = (event) => {
    const inputChannel = event.inputBuffer.getChannelData(0);

    if (options.onAudioLevel) {
      options.onAudioLevel(computeRmsLevel(inputChannel));
    }

    const pcmChunk = pcmResampler.process(inputChannel);

    if (pcmChunk.byteLength === 0) {
      return;
    }

    chunks.push(pcmChunk);
    options.onPcmChunk(pcmChunk);
  };

  source.connect(processor);
  processor.connect(sink);
  sink.connect(audioContext.destination);

  const shutdown = async () => {
    if (closed) {
      return;
    }

    closed = true;
    processor.onaudioprocess = null;

    try {
      processor.disconnect();
    } catch {
      // Ignore cleanup races during teardown.
    }

    try {
      source.disconnect();
    } catch {
      // Ignore cleanup races during teardown.
    }

    try {
      sink.disconnect();
    } catch {
      // Ignore cleanup races during teardown.
    }

    stopTracks(stream);

    try {
      if (audioContext.state !== "closed") {
        await audioContext.close();
      }
    } catch {
      // Ignore cleanup races during teardown.
    }
  };

  return {
    async stop() {
      await shutdown();
      return concatChunks(chunks);
    },
    async abort() {
      await shutdown();
    },
  };
}
