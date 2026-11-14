"use client";

import { Lock, Pause, Play, Radio } from "lucide-react";
import { useState } from "react";
import type { Pattern } from "@/lib/patterns";
import { patternNeedsTrust } from "@/lib/evaluator/evaluateSharedPattern";
import { usePatternGraph } from "@/lib/use-pattern-graph";
import { LivePatternCanvas } from "./live-pattern-canvas";

type PreviewVariant = "card" | "hero" | "detail";

export function PatternPreview({
  pattern,
  variant = "card",
  controls = false,
}: {
  pattern: Pattern;
  variant?: PreviewVariant;
  controls?: boolean;
}) {
  const { graph, source } = usePatternGraph(pattern.previewUrl);
  const [running, setRunning] = useState(true);
  const [trustedByVisitor, setTrusted] = useState(false);
  const trusted = pattern.builtIn === true || trustedByVisitor;

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
      <div className="live-preview-readout">
        <span>{graph ? `${graph.nodes.length} nodes · ${graph.edges.length} patches` : "—"}</span>
        <span><Radio size={11} /> Live render</span>
      </div>
    </div>
  );
}
