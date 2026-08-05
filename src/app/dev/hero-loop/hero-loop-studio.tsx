"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  JuggleLoopCompositor,
  renderJuggleLoop,
  type SeamReport,
} from "@/lib/hero-loop/render-juggle-loop";
import {
  CLIP_SECONDS,
  FRAME_COUNT,
  LOOP_SECONDS,
  OUTPUT_FPS,
  TRAVEL_PERIOD,
} from "@/lib/hero-loop/juggle-loop";

const FRAME_SINK = "/api/dev/hero-loop-frame";

type Status =
  | { kind: "idle" }
  | { kind: "rendering"; done: number; total: number }
  | { kind: "done"; dir: string | null; seam: SeamReport }
  | { kind: "error"; message: string };

export function HeroLoopStudio() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const rendering = status.kind === "rendering";

  // Live preview. Advances one frame index per output frame, so what plays
  // here is exactly the frame sequence the capture pass will write — same
  // schedule, same sampling, same trail decay per step.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rendering || !playing) return;

    let compositor: JuggleLoopCompositor | null = null;
    let raf = 0;
    let index = 0;
    let last = 0;
    let accumulator = 0;
    const step = 1000 / OUTPUT_FPS;

    const tick = (now: number) => {
      // Constructed on the first tick rather than in the effect body: it can
      // throw (no WebGL, or the page is over its context budget) and reporting
      // that synchronously from an effect is a cascading render.
      if (!compositor) {
        try {
          compositor = new JuggleLoopCompositor("hero-loop-preview", canvas);
        } catch (error) {
          setStatus({ kind: "error", message: (error as Error).message });
          return;
        }
        last = now;
      }
      accumulator += now - last;
      last = now;
      // Cap catch-up so a backgrounded tab does not spend a second of main
      // thread replaying frames on return.
      if (accumulator > step * 8) accumulator = step * 8;
      while (accumulator >= step) {
        compositor.drawFrame(index);
        index += 1;
        accumulator -= step;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      compositor?.destroy();
    };
  }, [playing, rendering]);

  const verify = useCallback(async () => {
    setStatus({ kind: "rendering", done: 0, total: FRAME_COUNT });
    try {
      const seam = await renderJuggleLoop({
        onProgress: (done, total) => setStatus({ kind: "rendering", done, total }),
      });
      setStatus({ kind: "done", dir: null, seam });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    }
  }, []);

  const render = useCallback(async () => {
    setStatus({ kind: "rendering", done: 0, total: FRAME_COUNT });
    try {
      // Clear first: a shorter run would otherwise leave stale high-numbered
      // frames for ffmpeg to splice onto the end of the sequence.
      const cleared = await fetch(FRAME_SINK, { method: "DELETE" });
      if (!cleared.ok) throw new Error(`frame sink unavailable (${cleared.status})`);
      const { dir } = (await cleared.json()) as { dir: string };

      const seam = await renderJuggleLoop({
        onFrame: async (index, blob) => {
          const response = await fetch(`${FRAME_SINK}?index=${index}`, {
            method: "POST",
            body: blob,
          });
          if (!response.ok) throw new Error(`frame ${index} failed (${response.status})`);
        },
        onProgress: (done, total) => setStatus({ kind: "rendering", done, total }),
      });
      setStatus({ kind: "done", dir, seam });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    }
  }, []);

  const ffmpeg = [
    `ffmpeg -framerate ${OUTPUT_FPS} -i frame-%04d.png -c:v libvpx-vp9 -pix_fmt yuv420p \\`,
    "  -b:v 0 -crf 32 -row-mt 1 -an juggle-loop.webm",
  ].join("\n");

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "auto",
          borderRadius: 12,
          border: "1px solid var(--line)",
          background: "var(--ink)",
        }}
      />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => setPlaying((p) => !p)} disabled={rendering}>
          {playing ? "Pause preview" : "Play preview"}
        </button>
        <button type="button" onClick={verify} disabled={rendering}>
          Verify seam only
        </button>
        <button type="button" onClick={render} disabled={rendering}>
          {rendering ? "Rendering…" : "Render & save frames…"}
        </button>
        {status.kind === "rendering" && (
          <span>
            {status.done} / {status.total} frames
            {status.done === 0 && " (warm-up lap)"}
          </span>
        )}
      </div>

      {status.kind === "done" && (
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            border: `1px solid ${status.seam.seamless ? "var(--green)" : "var(--pink)"}`,
          }}
        >
          <strong>
            {status.seam.seamless
              ? "Seam verified — frame 0 and the wrap frame are pixel-identical."
              : "Seam is NOT clean. Do not ship this clip."}
          </strong>
          <p style={{ margin: "8px 0 0" }}>
            {status.seam.differingLeds} LED(s) differ, max channel delta{" "}
            {status.seam.maxChannelDelta}. Trail settled after {status.seam.warmupLaps}{" "}
            warm-up lap(s).
            {status.dir ? ` Wrote ${FRAME_COUNT} PNGs to “${status.dir}”.` : " No files written."}
          </p>
          {!status.seam.seamless && (
            <p style={{ margin: "8px 0 0" }}>
              {status.seam.warmupExhausted
                ? "The trail buffer never reached a fixed point — it hit MAX_WARMUP_LAPS still changing between laps. Check that FADE is high enough for the other dots' trails to clear during the hold at COUNT_MIN."
                : "Widen the trailing hold at COUNT_MIN in SLIDER_PATH, or raise FADE so the other dots' trails reach black before the cut."}
            </p>
          )}
        </div>
      )}

      {status.kind === "error" && (
        <div style={{ padding: 16, borderRadius: 10, border: "1px solid var(--pink)" }}>
          {status.message}
        </div>
      )}

      <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", margin: 0 }}>
        <dt>Travel period</dt>
        <dd style={{ margin: 0 }}>{TRAVEL_PERIOD.toFixed(4)}s (one sweep of dot 0)</dd>
        <dt>Loop period</dt>
        <dd style={{ margin: 0 }}>
          {LOOP_SECONDS.toFixed(4)}s — 5 travel periods, 6 pulse periods
        </dd>
        <dt>Sampling</dt>
        <dd style={{ margin: 0 }}>
          {FRAME_COUNT} frames @ {OUTPUT_FPS}fps = {CLIP_SECONDS.toFixed(2)}s clip
        </dd>
      </dl>

      <pre style={{ overflowX: "auto", padding: 16, background: "var(--board)", borderRadius: 10 }}>
        {ffmpeg}
      </pre>
    </div>
  );
}
