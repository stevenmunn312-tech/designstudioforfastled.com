// Types for audio.js, the app's audio analysis bundled by
// scripts/app-sync/sync.mjs. Declared by hand because esbuild emits no types;
// keep in step with scripts/app-sync/audio-entry.ts.
import type { AudioSignal } from "./engine";

export type FastLedAudioResult = {
  bass: number;
  mids: number;
  treble: number;
  beat: boolean;
  bpm: number;
  beatConfidence: number;
  vibe: NonNullable<AudioSignal["vibe"]>;
  structure: NonNullable<AudioSignal["structure"]>;
  pitch: NonNullable<AudioSignal["pitch"]>;
  samples: number[];
};

export class FastLedAudioAnalyzer {
  constructor(fftSize: number);
  process(
    samples: Float32Array,
    sampleRate: number,
    nowMs: number,
    gain: number,
    spectrumOut: number[],
    noiseGate?: number,
  ): FastLedAudioResult;
}

export function levelsFromSampleChannels(
  leftSamples: ArrayLike<number>,
  rightSamples: ArrayLike<number>,
  channelCount: 1 | 2,
  gain?: number,
): { left: number; right: number; channelCount: 1 | 2 };

export const MIC_DEFAULTS: { readonly gain: number; readonly noiseGate: number };
export const MIC_FFT_SIZE: number;
export const MIC_MAX_GAIN: number;
export const MIC_SAMPLE_RATE: number;
export const MIC_SPECTRUM_BARS: number;
