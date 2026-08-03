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

function describeAudioError(err: unknown, fallback: string) {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") return "Audio access is blocked for this browser tab.";
    if (err.name === "NotFoundError") return "No microphone was found on this device.";
    if (err.name === "NotReadableError") return "The selected audio device is busy in another app.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * Detail-page audio sources for the live evaluator. A ref (not state) carries
 * the audio values so a 60fps render loop can read the latest frame without a
 * React re-render per frame; the UI state here is only for the surrounding
 * controls and status copy.
 */
export function useLiveAudio() {
  const [micEnabled, setMicEnabled] = useState(false);
  const [trackLoaded, setTrackLoaded] = useState(false);
  const [trackPlaying, setTrackPlaying] = useState(false);
  const [trackName, setTrackName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const overrideRef = useRef<AudioOverride | null>(null);
  const trackRef = useRef<HTMLAudioElement | null>(null);
  const trackUrlRef = useRef<string | null>(null);

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

    const clearTrackUrl = () => {
      if (!trackUrlRef.current) return;
      URL.revokeObjectURL(trackUrlRef.current);
      trackUrlRef.current = null;
    };

    // Never leave the mic hot if the visitor navigates away from the one
    // page that uses it — this is a client-side-routed SPA, so the engine
    // singleton otherwise survives the navigation.
    return () => {
      unsubscribe();
      track.pause();
      track.removeEventListener("play", handlePlay);
      track.removeEventListener("pause", handlePause);
      track.removeEventListener("ended", handleEnded);
      track.removeEventListener("error", handleError);
      track.removeAttribute("src");
      track.load();
      clearTrackUrl();
      trackRef.current = null;
      AudioEngine.instance.stop();
    };
  }, []);

  const enableMic = async () => {
    setError(null);
    const track = trackRef.current;
    track?.pause();
    try {
      await AudioEngine.instance.start();
      setMicEnabled(true);
    } catch (err) {
      setError(describeAudioError(err, "Microphone access was denied."));
      setMicEnabled(false);
    }
  };

  const disableMic = () => {
    AudioEngine.instance.stop();
    setMicEnabled(false);
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
    setMicEnabled(false);
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
      setMicEnabled(false);
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

  return {
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
  };
}
