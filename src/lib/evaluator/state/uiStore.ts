import { create } from 'zustand'

// Site-side stand-in for the app's useUiStore. graphEvaluator.ts only reads
// `testSignal` (whether audio-reactive nodes fall back to a synthetic demo
// signal absent real input) — defaulted true so a pattern with no audio
// override still shows lively motion instead of going flat.
interface UiState {
  testSignal: boolean
}

export const useUiStore = create<UiState>()(() => ({
  testSignal: true,
}))
