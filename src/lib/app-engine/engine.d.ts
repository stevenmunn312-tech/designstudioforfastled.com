// Types for engine.js, the app's preview engine bundled by
// scripts/app-sync/sync.mjs. Declared by hand because esbuild emits no types;
// keep in step with scripts/app-sync/engine-entry.ts.
import type { StudioEdge, StudioNode } from "@/lib/evaluator/state/graphStore";
import type { AudioOverride } from "@/lib/evaluator/state/graphEvaluator";

export type RGB = { r: number; g: number; b: number };
/** Row-major [y][x]. */
export type Frame = RGB[][];
export type GroupRegistry = Record<string, { nodes: StudioNode[]; edges: StudioEdge[] }>;
export type PortValue = unknown;
export type PreviewStyle = "standard" | "soft" | "dreamy" | "cyberpunk" | "neon" | "crt";

/** The app's AudioSignal: the site's AudioOverride plus the detector payloads
 *  newer nodes read (each optional; absent reads as inactive). */
export type AudioSignal = AudioOverride & {
  beatConfidence?: number;
  leftLevel?: number;
  rightLevel?: number;
  channelCount?: 1 | 2;
  vibe?: Record<string, number | boolean>;
  structure?: Record<string, number | boolean>;
  pitch?: Record<string, number | boolean>;
  /** 128 conditioned samples, -1..1; read by Waveform. */
  samples?: readonly number[];
};

export function evaluateGraphFull(
  nodes: StudioNode[],
  edges: StudioEdge[],
  tick: number,
  gridW?: number,
  gridH?: number,
  groups?: GroupRegistry,
  auxNodes?: boolean,
  trusted?: boolean,
  instancePrefix?: string,
  audioOverride?: AudioSignal | null,
  elapsedTick?: number,
  groupInputs?: Record<string, PortValue>,
): { frame: Frame | null; outputs: Map<string, Record<string, unknown>> };

export function clearInstanceStateByPrefix(prefix: string): void;
export function audioGroupInputParamIds(nodes: readonly StudioNode[]): string[];
export function isAudioReactiveSubgraph(nodes: readonly StudioNode[]): boolean;
export function bandsToSpectrum(bass: number, mids: number, treble: number): number[];
export function idleFrame(tick: number, gridW: number, gridH: number): Frame;
export function renderPreviewFrame(ctx: CanvasRenderingContext2D, frame: Frame, pixel: number, style: PreviewStyle): void;

export class WebGLLEDRenderer {
  constructor(canvas: HTMLCanvasElement, opts?: { preserveDrawingBuffer?: boolean });
  render(frame: Frame, gridW: number, gridH: number, pixel: number, style: PreviewStyle): void;
  destroy(): void;
}
