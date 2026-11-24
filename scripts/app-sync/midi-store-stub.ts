// Stands in for the app's `state/midiStore` inside the engine bundle.
//
// The real store subscribes to the app's MidiEngine when it is created, and
// that subscription calls navigator.requestMIDIAccess(). In the site's bundle
// the store is created as soon as the engine loads, so every pattern preview
// would make the browser ask visitors for MIDI device access. MIDI input is
// preview-only in the desktop app, so the site reads an always-idle snapshot:
// MIDI nodes see no notes and no controller values.
import { create } from "zustand";

export const useMidiStore = create(() => ({
  supported: false,
  active: false,
  noteVelocity: new Map<number, number>(),
  ccValues: new Map<number, number>(),
  channelNoteVelocity: new Map<string, number>(),
  channelCcValues: new Map<string, number>(),
}));
