"use client";

import { evaluateSharedPattern } from "@/lib/evaluator/evaluateSharedPattern";
import { renderPreviewFrame } from "@/lib/evaluator/preview/frameCanvas";
import { WebGLLEDRenderer } from "@/lib/evaluator/preview/webglRenderer";
import type { Frame } from "@/lib/evaluator/state/ledColor";
import {
  CANVAS_H,
  CANVAS_W,
  LED_RECT,
  LED_SCALE,
  drawChromeOver,
  drawChromeUnder,
} from "./draw-overlay";
import {
  FRAME_COUNT,
  GRID,
  MAX_WARMUP_LAPS,
  STABLE_LAPS_REQUIRED,
  countAt,
  juggleGraph,
  phaseForFrame,
  tickForFrame,
} from "./juggle-loop";

// Frame-exact renderer for the "Live authoring" hero loop.
//
// Deliberately NOT built on MediaRecorder + captureStream (which is what
// generate-preview-clip.ts uses for user pattern previews): that path paces
// frames off wall-clock time through setTimeout, so the number of frames that
// actually land in the file is whatever the event loop managed. A loop whose
// seam depends on landing exactly FRAME_COUNT frames can't be built on it.
// This emits PNGs instead and hands the timing to ffmpeg.

export interface SeamReport {
  /** True when the state at phase 0 of the next lap is pixel-identical. */
  seamless: boolean;
  /** Number of LEDs that differ, out of GRID * GRID. */
  differingLeds: number;
  /** Largest per-channel difference, 0–255. */
  maxChannelDelta: number;
  /** Discarded laps it took the trail buffer to settle. */
  warmupLaps: number;
  /** True when the warm-up gave up at MAX_WARMUP_LAPS without settling. */
  warmupExhausted: boolean;
}

export interface RenderCallbacks {
  /**
   * Called once per captured frame, in order. Awaited, so a consumer can
   * stream each PNG to disk and keep memory flat. Omit it to run the laps for
   * the seam check alone — PNG encoding is by far the slowest step, and
   * skipping it turns a tuning cycle on SLIDER_PATH from a minute into a
   * second or two.
   */
  onFrame?: (index: number, blob: Blob) => Promise<void> | void;
  onProgress?(done: number, total: number): void;
  signal?: AbortSignal;
}

function copyFrame(frame: Frame): Frame {
  return frame.map((row) => row.map(({ r, g, b }) => ({ r, g, b })));
}

function compareFrames(a: Frame, b: Frame): { differingLeds: number; maxChannelDelta: number } {
  let differingLeds = 0;
  let maxChannelDelta = 0;
  for (let y = 0; y < a.length; y += 1) {
    for (let x = 0; x < a[y].length; x += 1) {
      const p = a[y][x];
      const q = b[y][x];
      const d = Math.max(Math.abs(p.r - q.r), Math.abs(p.g - q.g), Math.abs(p.b - q.b));
      if (d > 0) differingLeds += 1;
      if (d > maxChannelDelta) maxChannelDelta = d;
    }
  }
  return { differingLeds, maxChannelDelta };
}

/**
 * Owns the two canvases and the evaluator state for one run of the loop.
 *
 * `stateId` namespaces evalJuggle's persistent trail buffer. Two compositors
 * alive at once (the dev page's live preview and a capture pass) MUST use
 * different ids or they will overwrite each other's trails.
 */
export class JuggleLoopCompositor {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly ledCanvas: HTMLCanvasElement;
  private renderer: WebGLLEDRenderer | null = null;
  private ledCtx: CanvasRenderingContext2D | null = null;
  private readonly stateId: string;
  private lastFrame: Frame | null = null;
  private destroyed = false;

  constructor(stateId: string, target?: HTMLCanvasElement) {
    this.stateId = stateId;

    this.canvas = target ?? document.createElement("canvas");
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable for the loop compositor");
    this.ctx = ctx;

    this.ledCanvas = document.createElement("canvas");
    this.ledCanvas.width = GRID * LED_SCALE;
    this.ledCanvas.height = GRID * LED_SCALE;

    // `preserveDrawingBuffer` is required: the compositor reads this canvas
    // back with drawImage() after each draw, and an unpreserved buffer may
    // already have been discarded by then.
    try {
      this.renderer = new WebGLLEDRenderer(this.ledCanvas, { preserveDrawingBuffer: true });
    } catch {
      this.renderer = null;
      this.ledCtx = this.ledCanvas.getContext("2d");
      if (!this.ledCtx) throw new Error("Neither WebGL nor 2D available for the LED grid");
    }
  }

  /**
   * Evaluate and draw one frame of the loop. Returns the evaluator's Frame so
   * a caller can retain it for the seam check — copy it first, the buffer is
   * pooled and gets handed back out two generations later.
   *
   * `evaluateOnly` advances the evaluator without touching either canvas. The
   * warm-up needs the trail buffer's side effects and nothing else, and it can
   * run thousands of frames; painting 1440x900 of chrome for each one is most
   * of the cost of a render and none of the value.
   */
  drawFrame(index: number, { evaluateOnly = false }: { evaluateOnly?: boolean } = {}): Frame | null {
    if (this.destroyed) return null;
    const phase = phaseForFrame(index);
    const { nodes, edges } = juggleGraph(countAt(phase), this.stateId);
    const frame = evaluateSharedPattern(nodes, edges, tickForFrame(index), GRID, GRID);
    this.lastFrame = frame;
    if (!frame || evaluateOnly) return frame;
    this.paint(frame, phase);
    return frame;
  }

  /**
   * Paint the most recently evaluated frame without advancing the evaluator.
   * Lets a caller run frames with `evaluateOnly` and still render the one it
   * stopped on.
   */
  paintLast(phase: number): void {
    if (this.destroyed || !this.lastFrame) return;
    this.paint(this.lastFrame, phase);
  }

  private paint(frame: Frame, phase: number): void {
    if (this.renderer) this.renderer.render(frame, GRID, GRID, LED_SCALE, "standard");
    else if (this.ledCtx) renderPreviewFrame(this.ledCtx, frame, LED_SCALE, "standard");

    drawChromeUnder(this.ctx, phase);
    this.ctx.drawImage(this.ledCanvas, LED_RECT.x, LED_RECT.y);
    drawChromeOver(this.ctx);
  }

  async toPng(): Promise<Blob> {
    const blob = await new Promise<Blob | null>((resolve) =>
      this.canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("canvas.toBlob returned null");
    return blob;
  }

  destroy() {
    this.destroyed = true;
    // WebGL contexts are a capped per-page resource; a capture pass that kept
    // its context would push a live preview's into the force-lost set.
    this.renderer?.destroy({ releaseContext: true });
    this.renderer = null;
  }
}

/**
 * Render one seamless lap as FRAME_COUNT PNGs.
 *
 * Discards whole laps until the trail buffer — the only state evalJuggle
 * carries between frames — reaches a fixed point and so becomes a pure
 * function of loop phase. That is what makes frame 0 and the frame the video
 * wraps to identical rather than merely similar.
 *
 * The returned SeamReport is the proof: it re-evaluates phase 0 of the lap
 * after the captured one and compares it against the captured frame 0.
 * `seamless: false` means the clip will jump — do not ship it on the strength
 * of it looking fine in a preview, since the usual failure is a low-amplitude
 * residual you cannot see scrubbing but can see looping.
 */
export async function renderJuggleLoop(callbacks: RenderCallbacks): Promise<SeamReport> {
  const { onFrame, onProgress, signal } = callbacks;
  const compositor = new JuggleLoopCompositor(`hero-loop-capture-${Date.now()}`);

  try {
    // Canvas text falls back to a system face until the page's webfonts are
    // ready; without this the first frames render in a different font.
    if (typeof document !== "undefined" && document.fonts) await document.fonts.ready;

    // Warm-up. Run whole laps, discarded, until STABLE_LAPS_REQUIRED of them
    // in a row begin from an identical buffer — at that point the trail is a
    // fixed point of the schedule and every later lap is byte-for-byte the
    // same, which is the property the seam depends on. Converging on the
    // observed state rather than a hardcoded lap count means SLIDER_PATH and
    // FADE stay tunable without anyone re-deriving how long settling takes.
    let cursor = 0;
    let warmupLaps = 0;
    let settled = false;
    let stableLaps = 0;
    let lapStart: Frame | null = null;

    for (;;) {
      signal?.throwIfAborted();
      const drawn = compositor.drawFrame(cursor, { evaluateOnly: true });
      const snapshot = drawn ? copyFrame(drawn) : null;

      // One matching pair is not convergence. The stuck-at-1 ghost set grows
      // a few LEDs at a time, and consecutive laps land on identical frame 0s
      // well before it saturates — the run that trusted a single match
      // reported "settled after 7 laps" and still wrapped 2 LEDs out.
      if (lapStart && snapshot && compareFrames(lapStart, snapshot).differingLeds === 0) {
        stableLaps += 1;
      } else {
        stableLaps = 0;
      }
      lapStart = snapshot;
      if (stableLaps >= STABLE_LAPS_REQUIRED) {
        settled = true;
        break;
      }
      if (warmupLaps >= MAX_WARMUP_LAPS) break;

      for (let i = 1; i < FRAME_COUNT; i += 1) {
        signal?.throwIfAborted();
        compositor.drawFrame(cursor + i, { evaluateOnly: true });
        // Yield periodically so a multi-lap warm-up does not lock the tab.
        if (i % 120 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
      }
      cursor += FRAME_COUNT;
      warmupLaps += 1;
      onProgress?.(0, FRAME_COUNT);
    }

    // Capture lap. The warm-up evaluated frame 0 at `cursor` but skipped its
    // drawing, so paint it now — re-evaluating instead would advance the trail
    // by a frame and desynchronise every later index from its phase.
    compositor.paintLast(phaseForFrame(cursor));
    if (onFrame) await onFrame(0, await compositor.toPng());
    onProgress?.(1, FRAME_COUNT);
    for (let i = 1; i < FRAME_COUNT; i += 1) {
      signal?.throwIfAborted();
      compositor.drawFrame(cursor + i);
      if (onFrame) await onFrame(i, await compositor.toPng());
      onProgress?.(i + 1, FRAME_COUNT);
    }

    // Phase 0 of the next lap — the frame the video cuts back to.
    const wrapped = compositor.drawFrame(cursor + FRAME_COUNT);
    if (!lapStart || !wrapped) {
      return {
        seamless: false,
        differingLeds: GRID * GRID,
        maxChannelDelta: 255,
        warmupLaps,
        warmupExhausted: !settled,
      };
    }
    const diff = compareFrames(lapStart, wrapped);
    return {
      seamless: diff.differingLeds === 0 && settled,
      ...diff,
      warmupLaps,
      warmupExhausted: !settled,
    };
  } finally {
    compositor.destroy();
  }
}
