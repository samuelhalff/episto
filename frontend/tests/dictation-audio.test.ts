import { describe, expect, it } from "vitest";

import {
  createStreamingPcm16Resampler,
  decodePcm16Bytes,
} from "../src/lib/dictation-audio";

describe("dictation audio resampling", () => {
  it("downsamples browser audio to the backend dictation sample rate", () => {
    const resampler = createStreamingPcm16Resampler(48_000, 16_000);

    const pcmBytes = resampler.process(new Float32Array([0, 0.25, 0.5, 0.75, 0.5, 0.25]));

    expect(Array.from(decodePcm16Bytes(pcmBytes))).toEqual([
      0,
      Math.round(0.75 * 0x7fff),
    ]);
  });

  it("keeps chunk boundaries continuous while resampling streamed audio", () => {
    const chunkedResampler = createStreamingPcm16Resampler(48_000, 16_000);
    const firstChunk = chunkedResampler.process(new Float32Array([0, 0.2, 0.4, 0.6]));
    const secondChunk = chunkedResampler.process(new Float32Array([0.8, 1]));

    const fullResampler = createStreamingPcm16Resampler(48_000, 16_000);
    const fullChunk = fullResampler.process(new Float32Array([0, 0.2, 0.4, 0.6, 0.8, 1]));

    expect([
      ...Array.from(decodePcm16Bytes(firstChunk)),
      ...Array.from(decodePcm16Bytes(secondChunk)),
    ]).toEqual(Array.from(decodePcm16Bytes(fullChunk)));
  });
});
