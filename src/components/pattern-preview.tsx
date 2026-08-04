"use client";

import { Lock, Mic, MicOff, Pause, Play, Radio, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Pattern } from "@/lib/patterns";
import { sharedPatternGraph } from "@/lib/shared-pattern";
import { patternNeedsTrust } from "@/lib/evaluator/evaluateSharedPattern";
import { isAudioReactiveSubgraph } from "@/lib/evaluator/patternRating";
import type { StudioEdge, StudioNode } from "@/lib/evaluator/state/graphStore";
import type { GroupRegistry } from "@/lib/evaluator/state/graphEvaluator";
import { useLiveAudio } from "@/lib/use-live-audio";
import { LivePatternCanvas } from "./live-pattern-canvas";

type PreviewVariant = "card" | "hero" | "detail";

type LoadedGraph = { nodes: StudioNode[]; edges: StudioEdge[]; groups: GroupRegistry };

/** Whether the pattern's actual graph content is audio-reactive, checking
 *  nested groups too — independent of the "Audio Reactive" tag, which an
 *  uploader can simply forget to add (the tag alone used to gate the mic
 *  panel, hiding it for genuinely audio-reactive but untagged patterns). */
function graphIsAudioReactive(graph: LoadedGraph | null): boolean {
  if (!graph) return false;
  if (isAudioReactiveSubgraph(graph.nodes)) return true;
  return Object.values(graph.groups).some((group) => isAudioReactiveSubgraph(group.nodes));
}

export function PatternPreview({
  pattern,
  variant = "card",
  controls = false,
}: {
  pattern: Pattern;
  variant?: PreviewVariant;
  controls?: boolean;
}) {
  const [graph, setGraph] = useState<LoadedGraph | null>(null);
  const [source, setSource] = useState(pattern.previewUrl ? "Reading pattern" : "No pattern data");
  const [running, setRunning] = useState(true);
  const [trusted, setTrusted] = useState(false);
  const {
    micEnabled,
    trackLoaded,
    trackPlaying,
    trackName,
    error: audioError,
    enableMic,
    disableMic,
    loadTrack,
    playTrack,
    pauseTrack,
    clearTrack,
    overrideRef,
  } = useLiveAudio();
  const audioReactive = variant === "detail" && (pattern.tags.includes("Audio Reactive") || graphIsAudioReactive(graph));
  const audioStatus = micEnabled
    ? "Mic live"
    : trackPlaying
      ? "Track live"
      : trackLoaded
        ? "Track ready"
        : "Silent";

  useEffect(() => {
    if (!pattern.previewUrl) return;
    let cancelled = false;
    fetch(pattern.previewUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Preview source unavailable");
        return response.json();
      })
      .then((project) => {
        if (cancelled) return;
        const next = sharedPatternGraph(project);
        if (!next) {
          setSource("Could not read pattern");
          return;
        }
        setGraph(next as LoadedGraph);
        setTrusted(false);
        setSource("Live evaluation");
      })
      .catch(() => {
        if (!cancelled) setSource("Preview unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [pattern.previewUrl]);

  const needsTrust = graph ? patternNeedsTrust(graph.nodes, graph.groups) : false;

  return (
    <div className={`live-preview live-preview-${variant}`}>
      <div className="live-preview-bar">
        <span><i /> Live pattern preview</span>
        <strong>{source}</strong>
      </div>
      <div className="live-preview-screen">
        <LivePatternCanvas
          nodes={graph?.nodes ?? []}
          edges={graph?.edges ?? []}
          groups={graph?.groups ?? {}}
          trusted={trusted}
          running={running}
          audioOverride={overrideRef}
        />
        <div className="preview-scanline" aria-hidden="true" />
        {needsTrust && !trusted && (
          <div className="preview-trust-gate">
            <Lock size={16} aria-hidden="true" />
            <p>This pattern includes custom code. Trust it to run that part live.</p>
            <button type="button" className="button button-outline" onClick={() => setTrusted(true)}>
              Trust and run
            </button>
          </div>
        )}
        {controls && graph && (
          <button
            className="preview-transport"
            type="button"
            onClick={() => setRunning((value) => !value)}
            aria-label={running ? "Pause animated preview" : "Play animated preview"}
          >
            {running ? <Pause size={14} /> : <Play size={14} />}
            {running ? "Pause" : "Play"}
          </button>
        )}
      </div>
      {audioReactive && graph && (
        <div className="preview-audio-panel">
          <div className="preview-audio-head">
            <div>
              <span>Audio source</span>
              <strong>{audioStatus}</strong>
            </div>
            <span className="preview-audio-pill">Detail page only</span>
          </div>
          <div className="preview-audio-grid">
            <section className={`preview-audio-card${micEnabled ? " is-active" : ""}`}>
              <div className="preview-audio-label">
                <Mic size={12} />
                <span>Microphone</span>
              </div>
              <p>Drive reactive nodes from the room or your speakers.</p>
              <button
                className="preview-audio-button"
                type="button"
                onClick={() => (micEnabled ? disableMic() : void enableMic())}
                aria-label={micEnabled ? "Disable microphone input" : "Enable microphone input"}
              >
                {micEnabled ? <MicOff size={13} /> : <Mic size={13} />}
                {micEnabled ? "Disable mic" : "Enable mic"}
              </button>
            </section>
            <section className={`preview-audio-card${trackLoaded ? " is-active" : ""}`}>
              <div className="preview-audio-label">
                <Play size={12} />
                <span>Local track</span>
              </div>
              <p>{trackName ?? "Choose a local file to feed the live evaluator."}</p>
              <div className="preview-audio-actions">
                <label className="preview-audio-button preview-audio-upload">
                  <Upload size={13} />
                  {trackLoaded ? "Replace track" : "Choose track"}
                  <input
                    className="sr-only"
                    type="file"
                    accept="audio/*"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      if (file) void loadTrack(file);
                    }}
                  />
                </label>
                {trackLoaded && (
                  <button
                    className="preview-audio-button"
                    type="button"
                    onClick={() => (trackPlaying ? pauseTrack() : void playTrack())}
                  >
                    {trackPlaying ? <Pause size={13} /> : <Play size={13} />}
                    {trackPlaying ? "Pause" : "Play"}
                  </button>
                )}
                {trackLoaded && (
                  <button className="preview-audio-button preview-audio-clear" type="button" onClick={clearTrack}>
                    <X size={13} />
                    Clear
                  </button>
                )}
              </div>
            </section>
          </div>
          <p className="preview-audio-note">
            Audio controls stay on the pattern detail page so the homepage and gallery remain calm and silent while browsing.
          </p>
        </div>
      )}
      {audioReactive && audioError && <p className="preview-mic-error">{audioError}</p>}
      <div className="live-preview-readout">
        <span>{graph ? `${graph.nodes.length} nodes · ${graph.edges.length} patches` : "—"}</span>
        {audioReactive && (
          <span>
            {micEnabled ? <Mic size={11} /> : trackLoaded ? <Play size={11} /> : <MicOff size={11} />}
            {audioStatus}
          </span>
        )}
        <span><Radio size={11} /> Live render</span>
      </div>
    </div>
  );
}
