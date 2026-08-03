"use client";

import { useEffect, useRef } from "react";
import { evaluateSharedPattern, patternNeedsTrust } from "@/lib/evaluator/evaluateSharedPattern";
import { idleFrame } from "@/lib/evaluator/preview/idleFrame";
import { renderPreviewFrame } from "@/lib/evaluator/preview/frameCanvas";
import type { StudioNode, StudioEdge } from "@/lib/evaluator/state/graphStore";
import type { GroupRegistry } from "@/lib/evaluator/state/graphEvaluator";

const GRID = 32;

export function LivePatternCanvas({
  nodes,
  edges,
  groups = {},
  trusted = false,
  running = true,
}: {
  nodes: StudioNode[];
  edges: StudioEdge[];
  groups?: GroupRegistry;
  trusted?: boolean;
  running?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runningRef = useRef(running);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) runningRef.current = false;

    let raf = 0;
    let width = 0;
    let height = 0;
    const resize = new ResizeObserver(([entry]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, entry.contentRect.width);
      height = Math.max(1, entry.contentRect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    resize.observe(canvas);

    let lastTimestamp: number | null = null;
    let elapsedSec = 0;
    const render = (timestamp: number) => {
      raf = window.requestAnimationFrame(render);
      if (lastTimestamp === null) lastTimestamp = timestamp;
      if (runningRef.current) elapsedSec += (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;
      if (width === 0 || height === 0) return;
      const tick = elapsedSec * 60;

      const pixel = Math.min(width, height) / GRID;
      const boardSize = pixel * GRID;
      const left = (width - boardSize) / 2;
      const top = (height - boardSize) / 2;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#05070b";
      ctx.fillRect(0, 0, width, height);

      const frame = evaluateSharedPattern(nodes, edges, tick, GRID, GRID, { groups, trusted }) ?? idleFrame(tick, GRID, GRID);
      ctx.save();
      ctx.translate(left, top);
      renderPreviewFrame(ctx, frame, pixel, "standard");
      ctx.restore();
    };
    raf = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(raf);
      resize.disconnect();
    };
  }, [nodes, edges, groups, trusted]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={patternNeedsTrust(nodes, groups) && !trusted ? "Live pattern preview (custom code not trusted)" : "Live evaluated pattern preview"}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
