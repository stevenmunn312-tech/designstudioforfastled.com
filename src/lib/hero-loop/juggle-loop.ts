import { SPEED_MAX } from "@/lib/evaluator/state/speedRange";
import type { StudioEdge, StudioNode } from "@/lib/evaluator/state/graphStore";

// Schedule and period arithmetic for the "Live authoring" hero loop: a Juggle
// patch whose `count` slider is dragged 1 → 8 → 1, rendered as a video that
// cuts back to frame 0 with no visible seam.
//
// Everything here is a pure function of loop phase, which is what makes the
// seam provable rather than eyeballed: render the schedule twice, keep the
// second lap, and assert that the evaluator's state at phase 0 of lap 3 equals
// the captured frame at phase 0 of lap 2. See renderJuggleLoop().
//
// This module owns no DOM. render-juggle-loop.ts draws it.

export const GRID = 32;

/**
 * Juggle `speed` slider position (0–1). Held at the maximum because
 * LOOP_SECONDS is inversely proportional to it — the node's slowest usable
 * setting would need a 21-second loop.
 */
export const SPEED_SLIDER = 1;

/**
 * Trail length. evalJuggle applies `retention = 1 - fade` once per *evaluated*
 * frame, not per second of animation. The app evaluates at 60fps; this render
 * samples LOOP_SECONDS with FRAME_COUNT frames (~23/sec), so left at the node
 * default of 0.22 the trails would come out roughly 2.6x longer than the app
 * actually draws them. This is the value that matches the app's look at this
 * sampling rate — re-tune it if FRAME_COUNT or LOOP_SECONDS changes.
 */
export const FADE = 0.45;

export const PALETTE = "rainbow";

/**
 * `seed = 0` is the only value that zeroes evalJuggle's per-dot phase offset
 * (`const phase = seed ? seedOffset(seed, i) : 0`). That is what makes t = 0 a
 * known state — dot 0 dead centre, moving right, pulse at 0.75 — and what
 * makes the period arithmetic below exact rather than approximate.
 */
export const SEED = 0;

export const COUNT_MIN = 1;
export const COUNT_MAX = 8;

/** The 0–1 slider position maps onto this internal rate. */
const INTERNAL_SPEED = SPEED_SLIDER * SPEED_MAX.Juggle;

// evalJuggle drives dot i with two independent sinusoids:
//
//   travel = sin(t * speed * (2.5 + i * 0.35) + i * 0.9)   → x position
//   pulse  = sin(t * speed * 3 + i)                        → brightness, ±25%
//
// `count` is held at 1 across the cut, so only dot 0 is on screen at the seam
// and only i = 0 has to realign — but BOTH of its sinusoids do. Their angular
// frequencies are 2.5*speed and 3*speed: a ratio of exactly 6:5. The shortest
// interval returning both to phase zero is therefore five travel periods
// (= six pulse periods), not one.
//
// Cutting at a single travel period is the tempting mistake: position and
// colour land perfectly, but the pulse is left 0.2 of a cycle out and the
// dot's brightness steps 0.75 → 0.99 at the seam.
//
// Dot 0's colour needs no term of its own. evalJuggle samples the palette at
// `(travel * 0.35 + i / dots) % 1`, and `i / dots` is 0 for i = 0 whatever
// `count` is — so the surviving ball's colour is a pure function of its
// position and realigns for free.
const TRAVEL_OMEGA = 2.5 * INTERNAL_SPEED;

/** Seconds for dot 0 to complete one left-right-left sweep. */
export const TRAVEL_PERIOD = (2 * Math.PI) / TRAVEL_OMEGA;

/** Seconds of animation in one seamless lap. ~10.47s at SPEED_SLIDER = 1. */
export const LOOP_SECONDS = 5 * TRAVEL_PERIOD;

/**
 * Frames sampled across LOOP_SECONDS. Playing them at OUTPUT_FPS compresses
 * the lap into CLIP_SECONDS — a uniform time scale of a periodic signal, so
 * the seam survives it untouched.
 */
export const FRAME_COUNT = 240;
export const OUTPUT_FPS = 60;

/** Duration of the encoded clip. 4.0s at the defaults above. */
export const CLIP_SECONDS = FRAME_COUNT / OUTPUT_FPS;

/**
 * Ceiling on discarded warm-up laps. renderJuggleLoop stops as soon as two
 * consecutive laps start from an identical buffer, so this is a bail-out, not
 * a target — hitting it means the trail never reached a fixed point and the
 * clip should not be shipped.
 *
 * The warm-up needs to converge at all because evalJuggle's trail does not
 * decay to black. It fades with `scaleRgb(px, retention)`, and scaleRgb
 * rounds: `Math.round(1 * 0.55) === 1`. Any channel that reaches 1 is stuck
 * there permanently, so every LED a dot has ever touched keeps a 1/255 ghost.
 * The ghosts are invisible alone, but they are an additive floor under the
 * next lap's dots, so the buffer takes several laps to settle — one warm-up
 * lap leaves a real (if low-amplitude) seam.
 */
export const MAX_WARMUP_LAPS = 40;

/**
 * Consecutive laps that must start from an identical buffer before the
 * warm-up calls it settled. More than one, because the ghost set above grows
 * a few LEDs at a time and two neighbouring laps routinely match by
 * coincidence while it is still filling in.
 */
export const STABLE_LAPS_REQUIRED = 3;

/** Loop phase in [0, 1) for a frame index, which may run past one lap. */
export function phaseForFrame(index: number): number {
  return (index % FRAME_COUNT) / FRAME_COUNT;
}

/**
 * The `tick` to hand evaluateSharedPattern for a frame index. evaluateGraph
 * converts it back with `const t = tick / 60`, so this is "frames at an
 * assumed 60fps" rather than seconds. Deliberately NOT wrapped at FRAME_COUNT:
 * warm-up laps must advance real time, and every sinusoid is periodic in
 * LOOP_SECONDS anyway.
 */
export function tickForFrame(index: number): number {
  return ((index * LOOP_SECONDS) / FRAME_COUNT) * 60;
}

type Keyframe = { at: number; value: number };

/**
 * Where the Count handle sits over the lap, as a continuous value that
 * countAt() rounds to the integer the node actually receives — which is
 * exactly how the real slider behaves under a drag.
 *
 * The flat sections at each end are load-bearing. Dots 1–7 vanish the instant
 * `count` drops, leaving seven trails that need roughly ten evaluated frames
 * at FADE to reach black. Holding 1 for the last 10% of the lap (24 frames)
 * guarantees the frame before the cut is a lone dot on black, matching the
 * frame after it.
 *
 * Editing these: keep the first and last entries at value 1, and keep the
 * trailing hold at least ~15 frames wide.
 */
export const SLIDER_PATH: Keyframe[] = [
  { at: 0.0, value: COUNT_MIN },
  { at: 0.1, value: COUNT_MIN },
  { at: 0.42, value: COUNT_MAX },
  { at: 0.58, value: COUNT_MAX },
  { at: 0.9, value: COUNT_MIN },
  { at: 1.0, value: COUNT_MIN },
];

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Continuous handle position in [COUNT_MIN, COUNT_MAX] at a loop phase. */
export function sliderValueAt(phase: number): number {
  const p = ((phase % 1) + 1) % 1;
  for (let i = 0; i < SLIDER_PATH.length - 1; i += 1) {
    const a = SLIDER_PATH[i];
    const b = SLIDER_PATH[i + 1];
    if (p < a.at || p > b.at) continue;
    const span = b.at - a.at;
    if (span <= 0) continue;
    return a.value + (b.value - a.value) * easeInOutCubic((p - a.at) / span);
  }
  return SLIDER_PATH[SLIDER_PATH.length - 1].value;
}

/** The integer `count` the Juggle node sees at a loop phase. */
export function countAt(phase: number): number {
  const rounded = Math.round(sliderValueAt(phase));
  return Math.min(COUNT_MAX, Math.max(COUNT_MIN, rounded));
}

/**
 * A minimal Juggle → Matrix Output graph. evaluateGraph renders only what
 * reaches an explicit terminal, so the MatrixOutput node is required, not
 * decorative.
 *
 * `stateId` must stay constant for the whole of a run: evalJuggle keys its
 * persistent trail buffer off the node id, so rebuilding the graph each frame
 * with a fresh id would reset the trail on every frame. It is a parameter
 * only so that two runs can coexist — the dev page's live preview and a
 * capture pass would otherwise trample each other's trail buffer.
 */
export function juggleGraph(
  count: number,
  stateId = "hero-loop",
): { nodes: StudioNode[]; edges: StudioEdge[] } {
  const nodes: StudioNode[] = [
    {
      id: stateId,
      data: {
        label: "Juggle",
        nodeType: "Juggle",
        category: "pattern",
        properties: {
          speed: SPEED_SLIDER,
          count,
          fade: FADE,
          palette: PALETTE,
          seed: SEED,
        },
      },
    },
    {
      id: `${stateId}-out`,
      data: {
        label: "Matrix Output",
        nodeType: "MatrixOutput",
        category: "output",
        properties: { width: GRID, height: GRID },
      },
    },
  ];

  const edges: StudioEdge[] = [
    {
      id: `${stateId}-edge`,
      source: stateId,
      target: `${stateId}-out`,
      sourceHandle: "frame",
      targetHandle: "frame",
    },
  ];

  return { nodes, edges };
}
