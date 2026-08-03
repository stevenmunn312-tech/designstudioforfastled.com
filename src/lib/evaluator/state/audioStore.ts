import { create } from 'zustand'

// Site-side stand-in for the app's useAudioStore. The real store wraps a live
// microphone AudioEngine — not meaningful outside the desktop app. evaluateGraph
// always prefers an explicit audioOverride when the caller supplies one (see
// graphEvaluator.ts), so this idle state is only ever read by the rare node
// that reads the store directly instead of through the override.
interface AudioState {
  active: boolean
  nativeFastLed: boolean
  bass: number
  mids: number
  treble: number
  beat: boolean
  bpm: number
  spectrum: number[]
  detectorSpectrum: number[]
  previewSpectrum: number[]
  micActive: boolean
  micBass: number
  micMids: number
  micTreble: number
  micSpectrum: number[]
  micDetectorSpectrum: number[]
}

const NUM_SPECTRUM_BARS = 16

export const useAudioStore = create<AudioState>()(() => ({
  active: false,
  nativeFastLed: false,
  bass: 0,
  mids: 0,
  treble: 0,
  beat: false,
  bpm: 120,
  spectrum: Array(NUM_SPECTRUM_BARS).fill(0),
  detectorSpectrum: Array(NUM_SPECTRUM_BARS).fill(0),
  previewSpectrum: Array(NUM_SPECTRUM_BARS).fill(0),
  micActive: false,
  micBass: 0,
  micMids: 0,
  micTreble: 0,
  micSpectrum: Array(NUM_SPECTRUM_BARS).fill(0),
  micDetectorSpectrum: Array(NUM_SPECTRUM_BARS).fill(0),
}))
