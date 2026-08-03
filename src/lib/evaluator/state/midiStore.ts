import { create } from 'zustand'

// Site-side stand-in for the app's useMidiStore. The real store bridges Web
// MIDI hardware — meaningless outside the desktop app. Shared patterns with a
// MIDI-driven control simply read an always-idle snapshot.
interface MidiState {
  supported: boolean
  active: boolean
  noteVelocity: Map<number, number>
  ccValues: Map<number, number>
}

export const useMidiStore = create<MidiState>()(() => ({
  supported: false,
  active: false,
  noteVelocity: new Map(),
  ccValues: new Map(),
}))
