import { create } from 'zustand'
import { blankDmxSnapshot, type DmxSnapshot } from './dmx'

// Site-side stand-in for the app's useDmxStore. The real store polls a local
// Art-Net helper process over HTTP — meaningless outside the desktop app.
// Shared patterns with a DMXInput node simply read an always-idle snapshot.
interface DmxStoreState {
  helperOnline: boolean
  listening: boolean
  live: boolean
  listenPort: number
  universe: number
  packetRate: number
  error: string
  snapshot: DmxSnapshot
}

export const useDmxStore = create<DmxStoreState>()(() => ({
  helperOnline: false,
  listening: false,
  live: false,
  listenPort: 6454,
  universe: 0,
  packetRate: 0,
  error: '',
  snapshot: blankDmxSnapshot(0),
}))
