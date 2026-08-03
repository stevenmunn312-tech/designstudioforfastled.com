"use client";

import { evaluateSharedPattern } from "@/lib/evaluator/evaluateSharedPattern";
import { renderPreviewFrame } from "@/lib/evaluator/preview/frameCanvas";
import type { Frame } from "@/lib/evaluator/state/ledColor";
import type { StudioEdge, StudioNode } from "@/lib/evaluator/state/graphStore";

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

export async function generatePreviewClip(nodes: StudioNode[], edges: StudioEdge[]): Promise<Blob | null> {
  const webmMime = pickWebmMime();
  if (!webmMime || nodes.length === 0) return null;

  const outW = GRID * SCALE;
  const outH = GRID * SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const totalFrames = DURATION_SEC * FPS;
  const warmupFrames = WARMUP_SEC * FPS;

  // Warm up stateful nodes (fire, particles, ...) before the recorded window,
  // discarding the results.
  for (let i = 0; i < warmupFrames; i += 1) {
    evaluateSharedPattern(nodes, edges, (i * 60) / FPS, GRID, GRID, {});
  }

  const frames: Array<Frame | null> = [];
  for (let i = 0; i < totalFrames; i += 1) {
    frames.push(evaluateSharedPattern(nodes, edges, ((warmupFrames + i) * 60) / FPS, GRID, GRID, {}));
  }

  const stream = canvas.captureStream(FPS);
  const recorder = new MediaRecorder(stream, { mimeType: webmMime, videoBitsPerSecond: 2_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };

  const drawFrame = (frame: Frame | null) => {
    if (frame) renderPreviewFrame(ctx, frame, SCALE, "standard");
  };

  return new Promise<Blob | null>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    recorder.onerror = () => resolve(null);
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
