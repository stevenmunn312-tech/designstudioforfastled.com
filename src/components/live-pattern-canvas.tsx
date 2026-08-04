"use client";

import { useEffect, useRef, type RefObject } from "react";
import { evaluateSharedPattern, patternNeedsTrust } from "@/lib/evaluator/evaluateSharedPattern";
import { idleFrame } from "@/lib/evaluator/preview/idleFrame";
import { renderPreviewFrame } from "@/lib/evaluator/preview/frameCanvas";
import type { StudioNode, StudioEdge } from "@/lib/evaluator/state/graphStore";
import type { AudioOverride, GroupRegistry } from "@/lib/evaluator/state/graphEvaluator";

const GRID = 32;

export function LivePatternCanvas({
  nodes,
  edges,
  groups = {},
  trusted = false,
  running = true,
  audioOverride,
}: {
  nodes: StudioNode[];
  edges: StudioEdge[];
  groups?: GroupRegistry;
  trusted?: boolean;
  running?: boolean;
  /** Read every frame (not a plain prop) so live mic input doesn't force a
   *  React re-render at audio-analysis rate. */
  audioOverride?: RefObject<AudioOverride | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runningRef = useRef(running);
  // A live canvas is its own GPU compositor layer, and on some GPU/driver
  // combinations Chromium leaks render/raster memory for that layer on every
  // composited frame — worse the more it's actually on screen. Scrolling it
  // out of the viewport stops the browser from compositing it at all, so
  // pausing the evaluate+draw work while off-screen (in addition to being a
  // straightforward CPU saving) caps how much time the tab spends exposed to
  // that leak, the same reasoning the app's NodePreview.tsx pause-when-off-
  // screen behavior is built on.
  const onScreenRef = useRef(true);

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

    // rootMargin resumes a little before it scrolls into view, so there's no
    // visible pop-in of a stale frame.
    const intersection = new IntersectionObserver(
      ([entry]) => { onScreenRef.current = entry?.isIntersecting ?? true; },
      { rootMargin: "150px" },
    );
    intersection.observe(canvas);

    let lastTimestamp: number | null = null;
    let elapsedSec = 0;
    const render = (timestamp: number) => {
      raf = window.requestAnimationFrame(render);
      if (!onScreenRef.current) {
        // Reset rather than let elapsedSec jump by the whole off-screen
        // span once back in view — same "frozen while paused" behaviour
        // runningRef already gives the play/pause button.
        lastTimestamp = null;
        return;
      }
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

      const frame = evaluateSharedPattern(nodes, edges, tick, GRID, GRID, {
        groups,
        trusted,
        audioOverride: audioOverride?.current ?? null,
        // Safe here specifically: the frame is read synchronously below and
        // the reference is dropped before the next call, unlike a capture
        // loop that collects frames into an array for later use.
        advancePool: true,
      }) ?? idleFrame(tick, GRID, GRID);
      ctx.save();
      ctx.translate(left, top);
      renderPreviewFrame(ctx, frame, pixel, "standard");
      ctx.restore();
    };
    raf = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(raf);
      resize.disconnect();
      intersection.disconnect();
    };
    // audioOverride is a ref — read fresh via .current every frame, its
    // identity is stable, and it must not restart this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
