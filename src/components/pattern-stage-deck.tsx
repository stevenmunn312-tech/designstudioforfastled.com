"use client";

import { Mic, MicOff } from "lucide-react";
import { useRef, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import {
  nextSpectrumVisualizerMode,
  spectrumVisualizerLabel,
} from "@/lib/evaluator/preview/spectrumVisualizerModes";
import { useAudioDock } from "@/lib/audio-dock";
import {
  IconAdd,
  IconClear,
  IconNext,
  IconPause,
  IconPlay,
  IconPrev,
  IconVolume,
  IconVolumeMuted,
} from "./player-icons";
import { PreviewSpectrum } from "./preview-spectrum";

function fmtTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * The Stage rail: the same spectrum instrument and transport the desktop app
 * shows beside its output matrix, plus this pattern's identity and delivery.
 * It renders inside the /patterns layout's audio session, so the transport it
 * drives is the one that survives stepping between patterns.
 */
export function PatternStageDeck({
  audioReactive,
  children,
}: {
  /** Whether this pattern's graph actually consumes the analysis bus. */
  audioReactive: boolean;
  /** Pattern rating, facts and the download call to action, rendered under
   *  the deck. Server-rendered and passed through so the deck itself stays
   *  concerned only with audio. */
  children?: ReactNode;
}) {
  const dock = useAudioDock();
  const fileInputRef = useRef<HTMLInputElement>(null);
  if (!dock) return null;

  const {
    micEnabled,
    tracks,
    trackIndex,
    currentTrack,
    playing,
    ready,
    currentTime,
    duration,
    volume,
    visualizerMode,
    analysisLive,
    error,
  } = dock;

  const durationMs = duration * 1000;
  const positionMs = Math.min(currentTime, duration || currentTime) * 1000;
  const progressPct = durationMs > 0 ? Math.max(0, Math.min(100, (positionMs / durationMs) * 100)) : 0;
  const trackLabel = currentTrack
    ? `${currentTrack.name}${tracks.length > 1 ? ` · ${trackIndex + 1}/${tracks.length}` : ""}`
    : "Add local tracks to drive the matrix";

  const onPickMusic = (event: ChangeEvent<HTMLInputElement>) => {
    dock.addTracks(Array.from(event.target.files ?? []));
    // Reset so re-adding the same file fires another change event.
    event.target.value = "";
  };

  return (
    <aside className="stage-deck">
      <div className="stage-deck-glow" aria-hidden="true" />
      <div className="stage-deck-grid" aria-hidden="true" />

      <div className="stage-deck-head">
        <span className="stage-kicker">Spectrum</span>
        <div className="stage-deck-settings">
          <span className="stage-meta">{analysisLive ? "Live analysis bus" : "Idle transport"}</span>
          <button
            type="button"
            className="stage-visualizer-toggle"
            onClick={() => dock.setVisualizerMode(nextSpectrumVisualizerMode(visualizerMode))}
            aria-label={`Change spectrum visualizer. Current: ${spectrumVisualizerLabel(visualizerMode)}`}
            title="Show the next Stage spectrum visualizer"
          >
            <span>{spectrumVisualizerLabel(visualizerMode)}</span>
            <i aria-hidden="true">↻</i>
          </button>
        </div>
      </div>

      <PreviewSpectrum live={analysisLive} mode={visualizerMode} />

      <div className="stage-transport">
        <div className="stage-transport-head">
          <span className="stage-kicker">Transport</span>
          <div className="stage-chips">
            <span className="stage-chip">{micEnabled ? "Mic" : "Local"}</span>
            <span className="stage-chip">{playing ? "Running" : "Standing by"}</span>
            <span className="stage-chip">{volume === 0 ? "Muted" : `${Math.round(volume * 100)}%`}</span>
          </div>
        </div>
        <div className="stage-transport-top">
          <span className="stage-track-name" title={trackLabel}>♪ {trackLabel}</span>
          <span className="stage-track-time">{fmtTime(currentTime)} / {fmtTime(duration)}</span>
        </div>
        <input
          className="stage-progress"
          type="range"
          min={0}
          max={Math.max(1000, durationMs)}
          step={100}
          value={positionMs}
          onChange={(event) => dock.seek(Number(event.target.value) / 1000)}
          disabled={!ready || durationMs <= 0}
          style={{ "--pp": `${progressPct}%` } as CSSProperties}
          aria-label="Music playback position"
        />
        <div className="stage-controls">
          <div className="stage-controls-side">
            <button
              type="button"
              className="stage-icon-button"
              onClick={() => fileInputRef.current?.click()}
              title="Add tracks"
              aria-label="Add tracks"
            >
              <IconAdd />
            </button>
            <button
              type="button"
              className="stage-icon-button"
              onClick={dock.clearTracks}
              disabled={!tracks.length}
              title="Clear playlist"
              aria-label="Clear playlist"
            >
              <IconClear />
            </button>
          </div>
          <div className="stage-controls-centre">
            <button
              type="button"
              className="stage-icon-button"
              onClick={dock.previousTrack}
              disabled={!tracks.length}
              title="Previous"
              aria-label="Previous track"
            >
              <IconPrev />
            </button>
            <button
              type="button"
              className="stage-play-button"
              onClick={dock.togglePlay}
              disabled={!ready}
              title={playing ? "Pause" : "Play"}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <IconPause size={18} /> : <IconPlay size={18} />}
            </button>
            <button
              type="button"
              className="stage-icon-button"
              onClick={dock.nextTrack}
              disabled={trackIndex >= tracks.length - 1}
              title="Next"
              aria-label="Next track"
            >
              <IconNext />
            </button>
          </div>
          <div className="stage-controls-side stage-controls-volume">
            <span className="stage-volume-label">Gain</span>
            <button
              type="button"
              className="stage-icon-button"
              onClick={dock.toggleMute}
              title={volume === 0 ? "Unmute" : "Mute"}
              aria-label={volume === 0 ? "Unmute" : "Mute"}
            >
              {volume === 0 ? <IconVolumeMuted /> : <IconVolume />}
            </button>
            <input
              className="stage-volume"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => dock.setVolume(Number(event.target.value))}
              style={{ "--pp": `${volume * 100}%` } as CSSProperties}
              aria-label="Volume"
            />
          </div>
        </div>
        {audioReactive && (
          <button
            type="button"
            className={`stage-mic-button${micEnabled ? " is-active" : ""}`}
            onClick={() => (micEnabled ? dock.disableMic() : dock.enableMic())}
            aria-label={micEnabled ? "Disable microphone input" : "Enable microphone input"}
          >
            {micEnabled ? <MicOff size={13} /> : <Mic size={13} />}
            {micEnabled ? "Listening to the room" : "Drive from the room mic"}
          </button>
        )}
        {error && <p className="stage-transport-error" role="alert">{error}</p>}
      </div>

      {children}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="sr-only"
        onChange={onPickMusic}
      />
    </aside>
  );
}
