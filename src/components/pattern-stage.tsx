"use client";

import { Lock, Pause, Play } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { Pattern } from "@/lib/patterns";
import { sharedPatternGraph } from "@/lib/shared-pattern";
import { patternNeedsTrust } from "@/lib/evaluator/evaluateSharedPattern";
import { isAudioReactiveSubgraph } from "@/lib/evaluator/patternRating";
import type { StudioEdge, StudioNode } from "@/lib/evaluator/state/graphStore";
import type { GroupRegistry } from "@/lib/evaluator/state/graphEvaluator";
import { useAudioDock } from "@/lib/audio-dock";
import { LivePatternCanvas } from "./live-pattern-canvas";
import { PatternStageDeck } from "./pattern-stage-deck";

type LoadedGraph = { nodes: StudioNode[]; edges: StudioEdge[]; groups: GroupRegistry };

/** Whether the pattern's actual graph content is audio-reactive, checking
 *  nested groups too — independent of the "Audio Reactive" tag, which an
 *  uploader can simply forget to add (the tag alone used to gate the mic
 *  control, hiding it for genuinely audio-reactive but untagged patterns). */
function graphIsAudioReactive(graph: LoadedGraph | null): boolean {
  if (!graph) return false;
  if (isAudioReactiveSubgraph(graph.nodes)) return true;
  return Object.values(graph.groups).some((group) => isAudioReactiveSubgraph(group.nodes));
}

/**
 * The pattern detail page laid out like the app's Stage mode: the output
 * matrix on the left, the analysis deck on the right. The graph fetch lives
 * here rather than in the canvas because both columns need what it says — the
 * matrix renders it, and the deck offers the mic only when the graph actually
 * consumes the analysis bus.
 */
export function PatternStage({
  pattern,
  previousStep,
  nextStep,
  stepNote,
  rail,
}: {
  pattern: Pattern;
  previousStep: ReactNode;
  nextStep: ReactNode;
  stepNote?: ReactNode;
  rail?: ReactNode;
}) {
  const [graph, setGraph] = useState<LoadedGraph | null>(null);
  const [source, setSource] = useState(pattern.previewUrl ? "Reading pattern" : "No pattern data");
  const [running, setRunning] = useState(true);
  const [trusted, setTrusted] = useState(false);
  const dock = useAudioDock();
  const overrideRef = dock?.overrideRef;

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
  const audioReactive = pattern.tags.includes("Audio Reactive") || graphIsAudioReactive(graph);

  return (
    <section className="pattern-stage">
      <div className="stage-matrix">
        <div className="stage-matrix-head">
          <span className="stage-kicker">Output matrix</span>
          <strong>{source}</strong>
        </div>
        <div className="stage-matrix-frame">
          {previousStep}
          <div className="stage-screen">
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
            {graph && (
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
          {nextStep}
        </div>
        <div className="stage-matrix-readout">
          <span>{graph ? `${graph.nodes.length} nodes · ${graph.edges.length} patches` : "—"}</span>
          {stepNote}
        </div>
      </div>

      <PatternStageDeck audioReactive={audioReactive}>
        {rail}
      </PatternStageDeck>
    </section>
  );
}
