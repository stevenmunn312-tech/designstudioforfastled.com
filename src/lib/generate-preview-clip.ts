"use client";

import { evaluateSharedPattern } from "@/lib/evaluator/evaluateSharedPattern";
import { renderPreviewFrame } from "@/lib/evaluator/preview/frameCanvas";
import { WebGLLEDRenderer } from "@/lib/evaluator/preview/webglRenderer";
import type { Frame } from "@/lib/evaluator/state/ledColor";
import type { StudioEdge, StudioNode } from "@/lib/evaluator/state/graphStore";
import type { GroupRegistry } from "@/lib/evaluator/state/graphEvaluator";

// Client-side capture of a short looping WebM for a pattern that already
// exists on the site (no Design Studio app involved) — used to backfill a
// preview clip for patterns shared before that became part of the upload
// flow. Mirrors the app's own sharePreviewCapture.ts, but evaluateGraph
// already returns a Frame directly here, so there's no packed-byte
// conversion step to undo before rendering.

const GRID = 32;
const DURATION_SEC = 5;
const FPS = 20;
const SCALE = 8;
const WARMUP_SEC = 2;

function pickWebmMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const mime of ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return null;
}

export async function generatePreviewClip(
  nodes: StudioNode[],
  edges: StudioEdge[],
  groups: GroupRegistry = {},
): Promise<Blob | null> {
  const webmMime = pickWebmMime();
  if (!webmMime || nodes.length === 0) return null;

  const outW = GRID * SCALE;
  const outH = GRID * SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;

  // Rasterise through the same shader the live preview uses, so a backfilled
  // clip matches what a visitor sees and a moderator is not left waiting on the
  // per-LED sprite path (~100ms a frame, and this draws 100 of them).
  // `preserveDrawingBuffer` is required here and only here: captureStream reads
  // the canvas back after each draw, which an unpreserved buffer may already
  // have discarded.
  let renderer: WebGLLEDRenderer | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    renderer = new WebGLLEDRenderer(canvas, { preserveDrawingBuffer: true });
  } catch {
    renderer = null;
    ctx = canvas.getContext("2d");
    if (!ctx) return null;
  }

  const totalFrames = DURATION_SEC * FPS;
  const warmupFrames = WARMUP_SEC * FPS;

  // Warm up stateful nodes (fire, particles, ...) before the recorded window,
  // discarding the results.
  for (let i = 0; i < warmupFrames; i += 1) {
    evaluateSharedPattern(nodes, edges, (i * 60) / FPS, GRID, GRID, { groups });
  }

  // Copy every captured frame out of the evaluator's buffer pool. Omitting
  // `advancePool` below only stops *this* loop advancing the pool — it does not
  // make the returned buffers ours to keep. Any live PatternPreview mounted at
  // the same time advances it ~30x/sec, and the backfill button that calls this
  // sits on /review alongside a live preview for every pending pattern, so two
  // generations (~66ms) after evaluation these buffers get handed back out and
  // overwritten while we are still drawing them into the recorder over the next
  // five seconds. See evaluateSharedPattern's `advancePool` doc: a capture loop
  // that collects frames into an array for later use must not hold pooled
  // buffers.
  const frames: Array<Frame | null> = [];
  for (let i = 0; i < totalFrames; i += 1) {
    const frame = evaluateSharedPattern(nodes, edges, ((warmupFrames + i) * 60) / FPS, GRID, GRID, { groups });
    frames.push(frame ? frame.map((row) => row.map(({ r, g, b }) => ({ r, g, b }))) : null);
  }

  const stream = canvas.captureStream(FPS);
  const recorder = new MediaRecorder(stream, { mimeType: webmMime, videoBitsPerSecond: 2_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };

  const drawFrame = (frame: Frame | null) => {
    if (!frame) return;
    if (renderer) renderer.render(frame, GRID, GRID, SCALE, "standard");
    else renderPreviewFrame(ctx!, frame, SCALE, "standard");
  };

  return new Promise<Blob | null>((resolve) => {
    // Hand the context back either way. WebGL contexts are a capped per-page
    // resource and this runs on /review, where a live preview is already
    // holding one per pending pattern — a backfill that kept its context would
    // push one of them into the force-lost set, and every repeat capture would
    // take another slot.
    const finish = (blob: Blob | null) => {
      // Safe to release here, unlike in the live preview: this canvas is
      // off-DOM, created for this one capture, and dropped with the renderer.
      renderer?.destroy({ releaseContext: true });
      renderer = null;
      resolve(blob);
    };
    recorder.onstop = () => finish(new Blob(chunks, { type: "video/webm" }));
    recorder.onerror = () => finish(null);
    drawFrame(frames[0]);
    recorder.start();
    const started = performance.now();
    let drawn = 1;
    const tick = () => {
      const due = Math.min(frames.length, Math.floor(((performance.now() - started) / 1000) * FPS) + 1);
      if (drawn < due) {
        drawFrame(frames[due - 1]);
        drawn = due;
      }
      if (drawn >= frames.length) {
        setTimeout(() => recorder.stop(), 1000 / FPS + 120);
        return;
      }
      setTimeout(tick, 1000 / FPS / 2);
    };
    setTimeout(tick, 1000 / FPS / 2);
  });
}
