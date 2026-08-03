"use client";

import { Lock, Mic, MicOff, Pause, Play, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import type { Pattern } from "@/lib/patterns";
import { sharedPatternGraph } from "@/lib/shared-pattern";
import { patternNeedsTrust } from "@/lib/evaluator/evaluateSharedPattern";
import type { StudioEdge, StudioNode } from "@/lib/evaluator/state/graphStore";
import { useLiveAudio } from "@/lib/use-live-audio";
import { LivePatternCanvas } from "./live-pattern-canvas";

type PreviewVariant = "card" | "hero" | "detail";

type LoadedGraph = { nodes: StudioNode[]; edges: StudioEdge[] };

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
  const { enabled: micEnabled, error: micError, enableMic, disableMic, overrideRef } = useLiveAudio();
  const audioReactive = variant === "detail" && pattern.tags.includes("Audio Reactive");

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

  const needsTrust = graph ? patternNeedsTrust(graph.nodes) : false;

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
        {audioReactive && graph && (
          <button
            className="preview-transport preview-mic-toggle"
            type="button"
            onClick={() => (micEnabled ? disableMic() : void enableMic())}
            aria-label={micEnabled ? "Disable microphone input" : "Enable microphone input"}
          >
            {micEnabled ? <Mic size={14} /> : <MicOff size={14} />}
            {micEnabled ? "Mic on" : "Enable mic"}
          </button>
        )}
      </div>
      {audioReactive && micError && <p className="preview-mic-error">{micError}</p>}
      <div className="live-preview-readout">
        <span>{graph ? `${graph.nodes.length} nodes · ${graph.edges.length} patches` : "—"}</span>
        <span><Radio size={11} /> Live render</span>
      </div>
    </div>
  );
}
