"use client";

import { useEffect, useRef, type RefObject } from "react";
import { evaluateSharedPattern, patternNeedsTrust } from "@/lib/evaluator/evaluateSharedPattern";
import { idleFrame } from "@/lib/evaluator/preview/idleFrame";
import { renderPreviewFrame } from "@/lib/evaluator/preview/frameCanvas";
import { WebGLLEDRenderer } from "@/lib/evaluator/preview/webglRenderer";
import type { StudioNode, StudioEdge } from "@/lib/evaluator/state/graphStore";
import type { AudioOverride, GroupRegistry } from "@/lib/evaluator/state/graphEvaluator";

const GRID = 32;
// Evaluating the graph and redrawing it (renderGridFrame's ~2000 drawImage
// calls at 32x32) on every display refresh — 60Hz, or 120-144Hz on plenty of
// monitors — is real, sustained main-thread work that competes with the
// browser's own scroll handling. This is a decorative background preview,
// not something that needs to track the display's native refresh rate;
// throttling the actual evaluate+draw work to a fixed cadence cuts that cost
// well over half on a 60Hz display and more on higher-refresh ones, while
// requestAnimationFrame keeps firing every real frame so scrolling itself
// stays smooth.
const TARGET_FPS = 30;
const MIN_FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

// Ceiling on the WebGL board's device-pixel size — see the render loop.
const MAX_BOARD_DEVICE_PX = 768;
const dprCap = () => Math.min(window.devicePixelRatio || 1, 2);

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
  // The graph reaches the render loop through a ref, not through the effect's
  // dependency list. A canvas hands out exactly one WebGL context for its whole
  // life, so tearing the renderer down and rebuilding it on this canvas is not
  // possible — and the graph *always* changes once, when the pattern fetch
  // resolves and replaces the empty placeholder arrays. Keying the renderer on
  // it meant every preview rebuilt itself at that moment; it also pointlessly
  // recompiled the shader for a change the GPU side does not care about.
  const graphRef = useRef({ nodes, edges, groups, trusted });

  useEffect(() => {
    graphRef.current = { nodes, edges, groups, trusted };
  }, [nodes, edges, groups, trusted]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  // Dev-only: warn if a CSS filter/backdrop-filter ever reappears on or over
  // this canvas (see lib/dev/animation-filter-guard). Dynamically imported so
  // the module is not bundled into production builds.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    void import("@/lib/dev/animation-filter-guard").then((mod) => mod.installAnimationFilterGuard());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // WebGL first, exactly as the app does: one draw call per frame instead of
    // frameCanvas.ts's few-thousand per-LED sprite blits (see webglRenderer.ts
    // for the measurements). A canvas is bound to a context type only once a
    // context is successfully created, so falling through to 2D here is safe.
    let renderer: WebGLLEDRenderer | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      renderer = new WebGLLEDRenderer(canvas);
    } catch {
      renderer = null;
      ctx = canvas.getContext("2d");
      if (!ctx) return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) runningRef.current = false;

    let raf = 0;
    let width = 0;
    let height = 0;
    const resize = new ResizeObserver(([entry]) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, entry.contentRect.width);
      height = Math.max(1, entry.contentRect.height);
      // Under WebGL the renderer owns the backing store (it sizes the canvas to
      // the square LED board and `object-fit: contain` centres it in the
      // screen), so only the 2D path sizes it here.
      if (!ctx) return;
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
    let lastDrawTimestamp = 0;
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
      // elapsedSec keeps advancing every real tick above (so motion timing
      // stays accurate and resuming from pause/off-screen isn't jumpy) — only
      // the expensive evaluate+draw work itself is throttled.
      if (timestamp - lastDrawTimestamp < MIN_FRAME_INTERVAL_MS) return;
      lastDrawTimestamp = timestamp;
      // A lost context has nowhere to put a frame, so skip the evaluation too
      // rather than burning the pass. The renderer keeps the canvas registered
      // for restore and picks up again on the next tick once it fires.
      if (renderer?.isLost) return;
      const tick = elapsedSec * 60;

      const graph = graphRef.current;
      const frame = evaluateSharedPattern(graph.nodes, graph.edges, tick, GRID, GRID, {
        groups: graph.groups,
        trusted: graph.trusted,
        audioOverride: audioOverride?.current ?? null,
        // Safe here specifically: the frame is read synchronously below and
        // the reference is dropped before the next call, unlike a capture
        // loop that collects frames into an array for later use.
        advancePool: true,
      }) ?? idleFrame(tick, GRID, GRID);

      if (renderer) {
        // The shader samples a 7x7 neighbourhood per fragment, so its cost is
        // per output pixel: cap the board's device resolution rather than
        // letting a HiDPI display quadruple the fragment count for a 32x32
        // matrix that gains nothing visible above this.
        const boardPx = Math.min(MAX_BOARD_DEVICE_PX, Math.min(width, height) * dprCap());
        renderer.render(frame, GRID, GRID, boardPx / GRID, "standard");
        return;
      }

      const pixel = Math.min(width, height) / GRID;
      const boardSize = pixel * GRID;
      const left = (width - boardSize) / 2;
      const top = (height - boardSize) / 2;

      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = "#05070b";
      ctx!.fillRect(0, 0, width, height);
      ctx!.save();
      ctx!.translate(left, top);
      renderPreviewFrame(ctx!, frame, pixel, "standard");
      ctx!.restore();
    };
    raf = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(raf);
      resize.disconnect();
      intersection.disconnect();
      renderer?.destroy();
    };
    // Mount-once, deliberately. The renderer is bound to this canvas element
    // for its lifetime (see graphRef above and destroy()'s note), and both the
    // graph and audioOverride are read fresh from refs every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={patternNeedsTrust(nodes, groups) && !trusted ? "Live pattern preview (custom code not trusted)" : "Live evaluated pattern preview"}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
