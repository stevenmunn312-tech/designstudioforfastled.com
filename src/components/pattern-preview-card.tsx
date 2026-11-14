"use client";

import { Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Pattern } from "@/lib/patterns";
import { usePatternGraph } from "@/lib/use-pattern-graph";
import { LivePatternCanvas } from "./live-pattern-canvas";

/**
 * A gallery card's live preview: the app's engine on a 2D canvas (see
 * LivePatternCanvas on why not WebGL). Nothing is fetched or evaluated until
 * the card first nears the viewport, so a 140-card gallery costs only what is
 * on screen.
 */
export function PatternPreviewCard({ pattern }: { pattern: Pattern }) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const { graph } = usePatternGraph(pattern.previewUrl, near);

  useEffect(() => {
    const screen = screenRef.current;
    if (!screen || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: "300px" },
    );
    observer.observe(screen);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="live-preview live-preview-card">
      <div className="live-preview-bar">
        <span><i /> Live pattern preview</span>
        <strong>{graph ? "Live evaluation" : "Loading"}</strong>
      </div>
      <div className="live-preview-screen" ref={screenRef}>
        {near && (
          <LivePatternCanvas
            nodes={graph?.nodes ?? []}
            edges={graph?.edges ?? []}
            groups={graph?.groups}
            trusted={pattern.builtIn === true}
            surface="2d"
          />
        )}
        <div className="preview-scanline" aria-hidden="true" />
      </div>
      <div className="live-preview-readout">
        <span><Radio size={11} /> Live render</span>
      </div>
    </div>
  );
}
