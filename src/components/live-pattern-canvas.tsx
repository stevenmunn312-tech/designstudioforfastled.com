"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { patternNeedsTrust } from "@/lib/evaluator/evaluateSharedPattern";
import type { StudioNode, StudioEdge } from "@/lib/evaluator/state/graphStore";
import type { GroupRegistry } from "@/lib/evaluator/state/graphEvaluator";
import type { AudioSignal } from "@/lib/app-engine/engine";
import {
  createPatternRunner,
  loadEngine,
  PREVIEW_GRID,
  type PatternRunner,
} from "@/lib/app-engine/pattern-runner";

type Engine = Awaited<ReturnType<typeof loadEngine>>;

// Evaluating the graph and redrawing it on every display refresh — 60Hz, or
// 120-144Hz on plenty of monitors — is real, sustained main-thread work that
// competes with the browser's own scroll handling. This is a preview, not
// something that needs to track the display's native refresh rate; the
// evaluate+draw work runs at a fixed cadence while requestAnimationFrame keeps
// firing every real frame so scrolling itself stays smooth.
const TARGET_FPS = 30;
const MIN_FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

// Ceiling on the WebGL board's device-pixel size — see the render loop.
const MAX_BOARD_DEVICE_PX = 768;
const dprCap = () => Math.min(window.devicePixelRatio || 1, 2);

/**
 * A pattern evaluated live by the app's own engine (src/lib/app-engine) and
 * drawn by the app's own LED renderers, at the app's default preview size.
 *
 * `surface="webgl"` is the app's LED Preview shader, for the one large preview
 * on a page. `surface="2d"` is the app's canvas fallback renderer, for grids of
 * cards: a page only gets ~16 live WebGL contexts before the browser starts
 * force-losing the oldest, and a 2D canvas holds none.
 */
export function LivePatternCanvas({
  nodes,
  edges,
  groups = {},
  trusted = false,
  running = true,
  audioOverride,
  surface = "webgl",
}: {
  nodes: StudioNode[];
  edges: StudioEdge[];
  groups?: GroupRegistry;
  trusted?: boolean;
  running?: boolean;
  /** Read every frame (not a plain prop) so live mic input doesn't force a
   *  React re-render at audio-analysis rate. With no live audio, an
   *  audio-reactive pattern runs on the demo beat (see pattern-runner). */
  audioOverride?: RefObject<AudioSignal | null>;
  surface?: "webgl" | "2d";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runningRef = useRef(running);
  const [engine, setEngine] = useState<Engine | null>(null);
  // Scrolling the canvas out of view stops the browser compositing it, so the
  // evaluate+draw work pauses too — a straightforward CPU saving on a gallery,
  // and it caps time spent exposed to Chromium's per-composited-frame GPU leak
  // on some drivers (the reason the app's NodePreview pauses off-screen).
  const onScreenRef = useRef(true);
  // The runner reaches the render loop through a ref: a canvas hands out
  // exactly one WebGL context for its whole life, so the renderer cannot be
  // rebuilt when the graph arrives — only the runner it draws from changes.
  const runnerRef = useRef<PatternRunner | null>(null);

  useEffect(() => {
    let live = true;
    void loadEngine().then((loaded) => {
      if (live) setEngine(loaded);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!engine || nodes.length === 0) return;
    const runner = createPatternRunner(engine, { nodes, edges, groups }, trusted);
    runnerRef.current = runner;
    return () => {
      if (runnerRef.current === runner) runnerRef.current = null;
      runner.dispose();
    };
  }, [engine, nodes, edges, groups, trusted]);

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
    if (!canvas || !engine) return;

    // WebGL falls back to 2D exactly as the app does. A canvas is bound to a
    // context type only once a context is successfully created, so falling
    // through here is safe.
    let renderer: InstanceType<Engine["WebGLLEDRenderer"]> | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    if (surface === "webgl") {
      try {
        renderer = new engine.WebGLLEDRenderer(canvas);
      } catch {
        renderer = null;
      }
    }
    if (!renderer) {
      ctx = canvas.getContext("2d");
      if (!ctx) return;
    }

    // Reduced motion: one still, taken where the app bakes its pattern
    // thumbnails (patternThumbnail.ts) — past the opening of patterns that
    // start black and grow.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) runningRef.current = false;

    let raf = 0;
    let width = 0;
    let height = 0;
    const resize = new ResizeObserver(([entry]) => {
      const dpr = dprCap();
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

    const grid = PREVIEW_GRID;
    let lastTimestamp: number | null = null;
    let lastDrawTimestamp = 0;
    let elapsedSec = reduceMotion ? 2.5 : 0;
    let drawnRunner: PatternRunner | null | undefined;
    const render = (timestamp: number) => {
      raf = window.requestAnimationFrame(render);
      if (!onScreenRef.current) {
        // Reset rather than let elapsedSec jump by the whole off-screen span.
        lastTimestamp = null;
        return;
      }
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const advancing = runningRef.current;
      if (advancing) elapsedSec += (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;
      if (width === 0 || height === 0) return;
      if (timestamp - lastDrawTimestamp < MIN_FRAME_INTERVAL_MS) return;
      // Paused: the last frame stays on the canvas. Re-evaluating would still
      // advance stateful nodes (feedback, particles) at the frozen time. A
      // newly arrived graph still draws once.
      const runner = runnerRef.current;
      if (!advancing && drawnRunner === runner) return;
      drawnRunner = runner;
      lastDrawTimestamp = timestamp;

      const frame = runner?.frame(elapsedSec, grid, grid, audioOverride?.current ?? null)
        ?? engine.idleFrame(elapsedSec * 60, grid, grid);

      if (renderer) {
        // The shader samples a neighbourhood per fragment, so its cost is per
        // output pixel: cap the board's device resolution rather than letting
        // a HiDPI display quadruple the fragment count for nothing visible.
        const boardPx = Math.min(MAX_BOARD_DEVICE_PX, Math.min(width, height) * dprCap());
        renderer.render(frame, grid, grid, boardPx / grid, "standard");
        return;
      }

      const pixel = Math.min(width, height) / grid;
      const boardSize = pixel * grid;
      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = "#05070b";
      ctx!.fillRect(0, 0, width, height);
      ctx!.save();
      ctx!.translate((width - boardSize) / 2, (height - boardSize) / 2);
      engine.renderPreviewFrame(ctx!, frame, pixel, "standard");
      ctx!.restore();
    };
    raf = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(raf);
      resize.disconnect();
      intersection.disconnect();
      renderer?.destroy();
    };
    // Once per engine load, deliberately: the renderer is bound to this canvas
    // for its lifetime, and the runner and audio are read from refs per frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={patternNeedsTrust(nodes, groups) && !trusted ? "Live pattern preview (custom code not trusted)" : "Live evaluated pattern preview"}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
