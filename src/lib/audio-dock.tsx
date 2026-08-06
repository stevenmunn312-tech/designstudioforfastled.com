"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { AudioEngine, type AudioData } from "@/lib/evaluator/audio/audioEngine";
import type { SpectrumVisualizerMode } from "@/lib/evaluator/preview/spectrumVisualizerModes";
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

export type DockTrack = { id: string; name: string; url: string };

export type AudioDock = {
  micEnabled: boolean;
  enableMic: () => void;
  disableMic: () => void;
  tracks: DockTrack[];
  trackIndex: number;
  currentTrack: DockTrack | null;
  addTracks: (files: File[]) => void;
  clearTracks: () => void;
  playing: boolean;
  ready: boolean;
  /** Seconds, matching HTMLMediaElement. */
  currentTime: number;
  duration: number;
  togglePlay: () => void;
  previousTrack: () => void;
  nextTrack: () => void;
  seek: (seconds: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  visualizerMode: SpectrumVisualizerMode;
  setVisualizerMode: (mode: SpectrumVisualizerMode) => void;
  /** Whether the analysis bus is actually carrying signal right now. */
  analysisLive: boolean;
  error: string | null;
  overrideRef: RefObject<AudioOverride | null>;
};

const AudioDockContext = createContext<AudioDock | null>(null);

let nextTrackId = 0;

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
  const [tracks, setTracks] = useState<DockTrack[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.9);
  const [visualizerMode, setVisualizerMode] = useState<SpectrumVisualizerMode>("auto");
  const [error, setError] = useState<string | null>(null);
  const overrideRef = useRef<AudioOverride | null>(null);
  const playerRef = useRef<HTMLAudioElement>(null);
  const tracksRef = useRef<DockTrack[]>([]);
  const pendingPlayRef = useRef(false);
  const lastAudibleVolume = useRef(0.9);
  const pathname = usePathname();

  const currentTrack = tracks[trackIndex] ?? null;

  // Mirrored for the unmount cleanup, which must revoke whatever the playlist
  // held at teardown without re-running on every playlist edit.
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  useEffect(() => {
    const unsubscribe = AudioEngine.instance.subscribe((data) => {
      overrideRef.current = data.active ? toOverride(data) : null;
    });
    return unsubscribe;
  }, []);

  // Leaving the patterns section entirely tears the session down: revoke every
  // playlist URL and make sure the engine is not left holding the mic.
  useEffect(() => {
    return () => {
      for (const track of tracksRef.current) URL.revokeObjectURL(track.url);
      AudioEngine.instance.stop();
    };
  }, []);

  useEffect(() => {
    if (playerRef.current) playerRef.current.volume = volume;
  }, [volume, currentTrack]);

  // The gallery has no live evaluator to drive, so a mic left listening there
  // would be recording the room for nothing. Arming is the visitor's decision
  // and it sticks; whether it actually listens is the route's decision, so
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
    playerRef.current?.pause();
    setMicArmed(true);
  };

  const disableMic = () => {
    AudioEngine.instance.stop();
    setMicArmed(false);
  };

  /** Routes the element into the analysis bus, then starts it. The engine is
   *  the only path to the speakers once a track is connected, so playback and
   *  analysis start together or not at all. */
  const startPlayback = async () => {
    const player = playerRef.current;
    if (!player) return;
    setError(null);
    setMicArmed(false);
    try {
      await AudioEngine.instance.startTrack(player);
      await player.play();
    } catch (err) {
      AudioEngine.instance.stop();
      setPlaying(false);
      setError(describeAudioError(err, "This audio file could not be played in the browser."));
    }
  };

  const selectTrack = (index: number, autoplay: boolean) => {
    if (index < 0 || index >= tracks.length) return;
    pendingPlayRef.current = autoplay;
    setTrackIndex(index);
    setReady(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  };

  const addTracks = (files: File[]) => {
    if (!files.length) return;
    const added = files.map((file) => ({
      id: `track-${nextTrackId++}`,
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    // Opening files is an explicit playback gesture: select the first newly
    // added track and let onLoadedMetadata start it as soon as it is ready.
    pendingPlayRef.current = true;
    setTracks([...tracks, ...added]);
    setTrackIndex(tracks.length);
    setReady(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  };

  const clearTracks = () => {
    const player = playerRef.current;
    if (player) {
      player.pause();
      player.removeAttribute("src");
      player.load();
    }
    for (const track of tracks) URL.revokeObjectURL(track.url);
    AudioEngine.instance.stop();
    pendingPlayRef.current = false;
    setTracks([]);
    setTrackIndex(0);
    setReady(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  };

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player || !currentTrack) return;
    if (playing) {
      player.pause();
      AudioEngine.instance.stop();
      return;
    }
    void startPlayback();
  };

  // Previous restarts the current track when it is more than a moment in (or is
  // the first track); otherwise it steps back through the playlist.
  const previousTrack = () => {
    const player = playerRef.current;
    if ((player && player.currentTime > 3) || trackIndex === 0) {
      if (player) player.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    selectTrack(trackIndex - 1, playing);
  };

  const nextTrack = () => selectTrack(trackIndex + 1, playing);

  const seek = (seconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    player.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const setVolume = (next: number) => {
    setVolumeState(Math.max(0, Math.min(1, next)));
  };

  const toggleMute = () => {
    if (volume > 0) {
      lastAudibleVolume.current = volume;
      setVolume(0);
      return;
    }
    setVolume(lastAudibleVolume.current || 0.9);
  };

  const onLoadedMetadata = () => {
    const player = playerRef.current;
    if (!player) return;
    player.volume = volume;
    setDuration(Number.isFinite(player.duration) ? player.duration : 0);
    setReady(true);
    if (pendingPlayRef.current) {
      pendingPlayRef.current = false;
      void startPlayback();
    }
  };

  const onEnded = () => {
    if (trackIndex < tracks.length - 1) {
      selectTrack(trackIndex + 1, true);
      return;
    }
    AudioEngine.instance.stop();
    setPlaying(false);
    setCurrentTime(0);
    const player = playerRef.current;
    if (player) player.currentTime = 0;
  };

  return (
    <AudioDockContext.Provider
      value={{
        micEnabled,
        enableMic,
        disableMic,
        tracks,
        trackIndex,
        currentTrack,
        addTracks,
        clearTracks,
        playing,
        ready,
        currentTime,
        duration,
        togglePlay,
        previousTrack,
        nextTrack,
        seek,
        volume,
        setVolume,
        toggleMute,
        visualizerMode,
        setVisualizerMode,
        analysisLive: micEnabled || playing,
        error,
        overrideRef,
      }}
    >
      {children}
      <audio
        ref={playerRef}
        src={currentTrack?.url ?? undefined}
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={() => setCurrentTime(playerRef.current?.currentTime ?? 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={onEnded}
        onError={() => setError("This audio file could not be decoded in the browser.")}
      />
    </AudioDockContext.Provider>
  );
}

/** Null outside the `/patterns` section — the homepage hero and the review
 *  screen render previews with no audio session behind them. */
export function useAudioDock(): AudioDock | null {
  return useContext(AudioDockContext);
}
