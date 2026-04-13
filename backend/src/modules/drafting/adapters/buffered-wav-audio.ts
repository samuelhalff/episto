import { DICTATION_LIMITS } from "@swiss-mail/shared";

import { validationError } from "../../../shared/errors/index.js";

const RIFF_CHUNK_ID = "RIFF";
const WAVE_FORMAT_ID = "WAVE";
const FMT_CHUNK_ID = "fmt ";
const DATA_CHUNK_ID = "data";
const WAV_CHUNK_HEADER_BYTES = 8;
const WAV_HEADER_BYTES = 12;
const PCM_FORMAT_TAG = 1;
const PCM_BITS_PER_SAMPLE = 16;
const PCM_BLOCK_ALIGN_BYTES =
  DICTATION_LIMITS.channelCount * (PCM_BITS_PER_SAMPLE / 8);

function invalidBufferedWavError() {
  return validationError("Audio payload must be a 16 kHz mono PCM WAV file.", [
    {
      field: "body",
      message: "Provide a 16 kHz mono PCM WAV recording.",
    },
  ]);
}

export function extractBufferedWavPcm(audioBuffer: Buffer): Buffer {
  if (
    audioBuffer.byteLength < WAV_HEADER_BYTES ||
    audioBuffer.toString("ascii", 0, 4) !== RIFF_CHUNK_ID ||
    audioBuffer.toString("ascii", 8, 12) !== WAVE_FORMAT_ID
  ) {
    throw invalidBufferedWavError();
  }

  let offset = WAV_HEADER_BYTES;
  let pcmData: Buffer | null = null;
  let sawSupportedFormat = false;

  while (offset + WAV_CHUNK_HEADER_BYTES <= audioBuffer.byteLength) {
    const chunkId = audioBuffer.toString("ascii", offset, offset + 4);
    const chunkSize = audioBuffer.readUInt32LE(offset + 4);
    const chunkStart = offset + WAV_CHUNK_HEADER_BYTES;
    const chunkEnd = chunkStart + chunkSize;

    if (chunkEnd > audioBuffer.byteLength) {
      throw invalidBufferedWavError();
    }

    if (chunkId === FMT_CHUNK_ID) {
      if (chunkSize < 16) {
        throw invalidBufferedWavError();
      }

      const audioFormat = audioBuffer.readUInt16LE(chunkStart);
      const channelCount = audioBuffer.readUInt16LE(chunkStart + 2);
      const sampleRate = audioBuffer.readUInt32LE(chunkStart + 4);
      const bitsPerSample = audioBuffer.readUInt16LE(chunkStart + 14);

      sawSupportedFormat =
        audioFormat === PCM_FORMAT_TAG &&
        channelCount === DICTATION_LIMITS.channelCount &&
        sampleRate === DICTATION_LIMITS.sampleRateHz &&
        bitsPerSample === PCM_BITS_PER_SAMPLE;
    }

    if (chunkId === DATA_CHUNK_ID) {
      pcmData = audioBuffer.subarray(chunkStart, chunkEnd);
    }

    offset = chunkEnd + (chunkSize % 2);
  }

  if (
    !sawSupportedFormat ||
    !pcmData ||
    pcmData.byteLength % PCM_BLOCK_ALIGN_BYTES !== 0
  ) {
    throw invalidBufferedWavError();
  }

  return pcmData;
}
