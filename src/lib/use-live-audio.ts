"use client";

import { useEffect, useRef, useState } from "react";
import { AudioEngine, type AudioData } from "@/lib/evaluator/audio/audioEngine";
import type { AudioOverride } from "@/lib/evaluator/state/graphEvaluator";

function toOverride(data: AudioData): AudioOverride {
  return {
    active: data.active,
    micActive: data.micActive,
    nativeFastLed: data.nativeFastLed,
    beat: data.beat,
    bpm: data.bpm,
    bass: data.bass,
    mids: data.mids,
    treble: data.treble,
    micBass: data.micBass,
    micMids: data.micMids,
    micTreble: data.micTreble,
    spectrum: data.spectrum,
    detectorSpectrum: data.detectorSpectrum,
  };
}

/**
 * Live microphone input for the detail page's live evaluator. A ref (not
 * state) carries the audio values so a 60fps render loop can read the latest
 * frame without a React re-render per frame; `enabled`/`error` are the only
 * state that actually needs to redraw the surrounding UI.
 */
export function useLiveAudio() {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overrideRef = useRef<AudioOverride | null>(null);

  useEffect(() => {
    const unsubscribe = AudioEngine.instance.subscribe((data) => {
      overrideRef.current = data.active ? toOverride(data) : null;
    });
    // Never leave the mic hot if the visitor navigates away from the one
    // page that uses it — this is a client-side-routed SPA, so the engine
    // singleton otherwise survives the navigation.
    return () => {
      unsubscribe();
      AudioEngine.instance.stop();
    };
  }, []);

  const enableMic = async () => {
    setError(null);
    try {
      await AudioEngine.instance.start();
      setEnabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone access was denied.");
      setEnabled(false);
    }
  };

  const disableMic = () => {
    AudioEngine.instance.stop();
    setEnabled(false);
  };

  return { enabled, error, enableMic, disableMic, overrideRef };
}
