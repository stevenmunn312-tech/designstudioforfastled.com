"use client";

import { useEffect, useState } from "react";
import { sharedPatternGraph } from "@/lib/shared-pattern";
import type { StudioEdge, StudioNode } from "@/lib/evaluator/state/graphStore";
import type { GroupRegistry } from "@/lib/evaluator/state/graphEvaluator";

export type LoadedGraph = { nodes: StudioNode[]; edges: StudioEdge[]; groups: GroupRegistry };

/**
 * Fetch and parse a pattern file for a live preview. `enabled` defers the
 * fetch (a gallery card waits until it nears the viewport) without changing
 * what is loaded.
 */
export function usePatternGraph(url: string | undefined, enabled = true) {
  const [graph, setGraph] = useState<LoadedGraph | null>(null);
  const [source, setSource] = useState(url ? "Reading pattern" : "No pattern data");

  useEffect(() => {
    if (!url || !enabled) return;
    let cancelled = false;
    fetch(url)
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
        setSource("Live evaluation");
      })
      .catch(() => {
        if (!cancelled) setSource("Preview unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [url, enabled]);

  return { graph, source };
}
