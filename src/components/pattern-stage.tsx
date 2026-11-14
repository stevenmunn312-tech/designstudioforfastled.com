"use client";

import { Lock, Pause, Play } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Pattern } from "@/lib/patterns";
import { tagKeys } from "@/lib/pattern-tags";
import { patternNeedsTrust } from "@/lib/evaluator/evaluateSharedPattern";
import { isAudioReactiveSubgraph } from "@/lib/evaluator/patternRating";
import { useAudioDock } from "@/lib/audio-dock";
import { usePatternGraph, type LoadedGraph } from "@/lib/use-pattern-graph";
import { LivePatternCanvas } from "./live-pattern-canvas";
import { PatternStageDeck } from "./pattern-stage-deck";

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
  const { graph, source } = usePatternGraph(pattern.previewUrl);
  const [running, setRunning] = useState(true);
  // Trust is per pattern file, so stepping to the next pattern asks again.
  // Built-ins ship with the app, which runs their code without asking.
  const [trustedUrl, setTrustedUrl] = useState<string | null>(null);
  const trusted = pattern.builtIn === true || (trustedUrl !== null && trustedUrl === pattern.previewUrl);
  const dock = useAudioDock();
  const overrideRef = dock?.overrideRef;

  const needsTrust = graph ? patternNeedsTrust(graph.nodes, graph.groups) : false;
  const audioReactive = tagKeys(pattern.tags).includes("audio-reactive") || graphIsAudioReactive(graph);
  const waitingForAudio = audioReactive && graph !== null && !dock?.analysisLive;

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
                <button type="button" className="button button-quiet" onClick={() => setTrustedUrl(pattern.previewUrl ?? null)}>
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
          {waitingForAudio && <span>Audio-reactive — play a track or turn on the mic</span>}
          {stepNote}
        </div>
      </div>

      <PatternStageDeck audioReactive={audioReactive}>
        {rail}
      </PatternStageDeck>
    </section>
  );
}
