"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
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

function describeAudioError(err: unknown, fallback: string) {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") return "Audio access is blocked for this browser tab.";
    if (err.name === "NotFoundError") return "No microphone was found on this device.";
    if (err.name === "NotReadableError") return "The selected audio device is busy in another app.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export type AudioDock = {
  micEnabled: boolean;
  trackLoaded: boolean;
  trackPlaying: boolean;
  trackName: string | null;
  error: string | null;
  enableMic: () => void;
  disableMic: () => void;
  loadTrack: (file: File) => Promise<void>;
  playTrack: () => Promise<void>;
  pauseTrack: () => void;
  clearTrack: () => void;
  overrideRef: RefObject<AudioOverride | null>;
};

const AudioDockContext = createContext<AudioDock | null>(null);

/** Only pattern detail routes host a live evaluator that can consume the mic. */
function isDetailRoute(pathname: string) {
  return /^\/patterns\/[^/]+\/?$/.test(pathname);
}

/**
 * The audio session for the whole `/patterns` section. It lives in the section
 * layout rather than in a page, because Next preserves layout state across
 * navigation: mounting the `<audio>` element here is what lets a loaded track
 * keep playing while the visitor steps from one pattern to the next.
 *
 * A ref (not state) carries the analysis values so a 60fps render loop can read
 * the latest frame without a React re-render per frame; the UI state here is
 * only for the surrounding controls and status copy.
 */
export function AudioDockProvider({ children }: { children: ReactNode }) {
  const [micArmed, setMicArmed] = useState(false);
  const [trackLoaded, setTrackLoaded] = useState(false);
  const [trackPlaying, setTrackPlaying] = useState(false);
  const [trackName, setTrackName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const overrideRef = useRef<AudioOverride | null>(null);
  const trackRef = useRef<HTMLAudioElement | null>(null);
  const trackUrlRef = useRef<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = AudioEngine.instance.subscribe((data) => {
      overrideRef.current = data.active ? toOverride(data) : null;
    });
    const track = new Audio();
    track.preload = "metadata";
    const handlePlay = () => setTrackPlaying(true);
    const handlePause = () => setTrackPlaying(false);
    const handleEnded = () => {
      setTrackPlaying(false);
      AudioEngine.instance.stop();
    };
    const handleError = () => {
      setError("The selected track could not be played in this browser.");
      setTrackPlaying(false);
      AudioEngine.instance.stop();
    };
    track.addEventListener("play", handlePlay);
    track.addEventListener("pause", handlePause);
    track.addEventListener("ended", handleEnded);
    track.addEventListener("error", handleError);
    trackRef.current = track;

    // Never leave the mic hot once the visitor leaves the patterns section
    // entirely — this is a client-side-routed SPA, so the engine singleton
    // otherwise survives the navigation.
    return () => {
      unsubscribe();
      track.pause();
      track.removeEventListener("play", handlePlay);
      track.removeEventListener("pause", handlePause);
      track.removeEventListener("ended", handleEnded);
      track.removeEventListener("error", handleError);
      track.removeAttribute("src");
      track.load();
      if (trackUrlRef.current) URL.revokeObjectURL(trackUrlRef.current);
      trackUrlRef.current = null;
      trackRef.current = null;
      AudioEngine.instance.stop();
    };
  }, []);

  // The gallery has no live evaluator to drive, so a mic left listening there
  // would be recording the room for nothing. Arming is the visitor's decision
  // and it sticks; whether the mic actually runs is the route's decision, so
  // stepping out to the gallery and back resumes it without a second click.
  // Track playback deliberately survives the same navigation either way.
  const onDetailRoute = isDetailRoute(pathname);
  const micEnabled = micArmed && onDetailRoute;

  useEffect(() => {
    if (!micArmed) return;
    if (!onDetailRoute) {
      AudioEngine.instance.stop();
      return;
    }
    let cancelled = false;
    void AudioEngine.instance.start().catch((err: unknown) => {
      if (cancelled) return;
      setError(describeAudioError(err, "Microphone access was denied."));
      setMicArmed(false);
    });
    return () => {
      cancelled = true;
    };
  }, [micArmed, onDetailRoute]);

  const enableMic = () => {
    setError(null);
    trackRef.current?.pause();
    setMicArmed(true);
  };

  const disableMic = () => {
    AudioEngine.instance.stop();
    setMicArmed(false);
  };

  const loadTrack = async (file: File) => {
    const track = trackRef.current;
    if (!track) {
      setError("Track playback is unavailable in this browser.");
      return;
    }
    setError(null);
    track.pause();
    AudioEngine.instance.stop();
    setMicArmed(false);
    if (trackUrlRef.current) URL.revokeObjectURL(trackUrlRef.current);
    trackUrlRef.current = URL.createObjectURL(file);
    track.src = trackUrlRef.current;
    track.currentTime = 0;
    track.load();
    setTrackLoaded(true);
    setTrackPlaying(false);
    setTrackName(file.name);
  };

  const playTrack = async () => {
    const track = trackRef.current;
    if (!track || !trackLoaded) return;
    setError(null);
    try {
      await AudioEngine.instance.startTrack(track);
      await track.play();
      setMicArmed(false);
    } catch (err) {
      AudioEngine.instance.stop();
      setTrackPlaying(false);
      setError(describeAudioError(err, "Playback could not be started."));
    }
  };

  const pauseTrack = () => {
    trackRef.current?.pause();
    AudioEngine.instance.stop();
    setTrackPlaying(false);
  };

  const clearTrack = () => {
    const track = trackRef.current;
    track?.pause();
    if (track) {
      track.removeAttribute("src");
      track.load();
    }
    if (trackUrlRef.current) {
      URL.revokeObjectURL(trackUrlRef.current);
      trackUrlRef.current = null;
    }
    AudioEngine.instance.stop();
    setTrackLoaded(false);
    setTrackPlaying(false);
    setTrackName(null);
  };

  return (
    <AudioDockContext.Provider
      value={{
        micEnabled,
        trackLoaded,
        trackPlaying,
        trackName,
        error,
        enableMic,
        disableMic,
        loadTrack,
        playTrack,
        pauseTrack,
        clearTrack,
        overrideRef,
      }}
    >
      {children}
    </AudioDockContext.Provider>
  );
}

/** Null outside the `/patterns` section — the homepage hero and the review
 *  screen render previews with no audio session behind them. */
export function useAudioDock(): AudioDock | null {
  return useContext(AudioDockContext);
}
