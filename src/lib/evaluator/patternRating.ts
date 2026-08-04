// Studio Score: a deterministic frame-analysis heuristic, ported from the
// app's `ratePattern()` (Design-Studio-for-FastLED/src/state/patternRating.ts)
// so the site computes its own trustworthy score from the live graph instead
// of trusting a value the uploader's app computed and sent along. The pure
// criterion math below is a line-for-line port; the driver is rewritten for
// the site's context — no zustand rating store, no localStorage cache, no
// trust-prompt dialog (the site's trust model is the safe-by-default
// `evaluateSharedPattern` boundary, not the app's content-addressed trust
// store), and no thumbnail packing (nothing on the site displays one yet).
import { evaluateGraph, type AudioOverride, type GroupRegistry } from "./state/graphEvaluator";
import type { Frame, RGB } from "./state/ledColor";
import type { StudioNode, StudioEdge } from "./state/graphStore";
import { NODE_LIBRARY } from "./state/nodeLibrary";
import { buildPatternDiagnostics, type GraphDiagnostic } from "./state/patternDiagnostics";

export interface CriterionScore {
  id: string;
  label: string;
  /** 0–1. */
  score: number;
  detail: string;
  weight: number;
}

export type PatternIntent = "ambient" | "showpiece" | "accent" | "audio-reactive" | "static-utility";
export type PatternVerdict = "exceptional" | "strong" | "promising" | "needs-work" | "fundamentally-weak";

export interface PatternRatingResult {
  /** 0–100. */
  overall: number;
  intent: PatternIntent;
  inferredIntent: PatternIntent;
  verdict: PatternVerdict;
  verdictLabel: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  criteria: CriterionScore[];
  audioReactive: boolean;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  let acc = 0;
  for (const v of values) acc += (v - m) * (v - m);
  return Math.sqrt(acc / values.length);
}

function forEachPixel(frame: Frame, fn: (px: RGB, x: number, y: number) => void): void {
  for (let y = 0; y < frame.length; y++) {
    const row = frame[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const px = row[x];
      if (px) fn(px, x, y);
    }
  }
}

/** LED brightness proxy used throughout the app codebase (HSV "value"). 0–1. */
export function pixelBrightness(px: RGB): number {
  return Math.max(px.r, px.g, px.b) / 255;
}

/** 12-bin hue weight histogram, mirroring the app's signalVisual.dominantAmbientColor:
 *  ignores near-black / near-grey pixels, weights by brightness × saturation². */
function hueBinWeights(frame: Frame): number[] {
  const bins = new Array(12).fill(0);
  forEachPixel(frame, (px) => {
    const r = px.r, g = px.g, b = px.b;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    if (max < 12 || chroma < 8) return;
    let hue = 0;
    if (max === r) hue = ((g - b) / chroma + 6) % 6;
    else if (max === g) hue = (b - r) / chroma + 2;
    else hue = (r - g) / chroma + 4;
    const saturation = chroma / max;
    const weight = (max / 255) * saturation * saturation;
    bins[Math.floor((hue * 2) % bins.length)] += weight;
  });
  return bins;
}

/** Structure / visual clarity: does the pattern actually have shape? Combines
 *  spatial brightness variation, hue diversity, and lit coverage. A black frame
 *  or a flat single-colour fill scores low; a shaped, multi-hue pattern scores
 *  high. */
export function scoreStructure(frames: Frame[]): number {
  if (frames.length === 0) return 0;
  const per = frames.map((frame) => {
    const brights: number[] = [];
    let lit = 0;
    forEachPixel(frame, (px) => {
      const b = pixelBrightness(px);
      brights.push(b);
      if (b > 0.05) lit++;
    });
    if (brights.length === 0) return 0;
    const variation = clamp01(stddev(brights) / 0.3);
    const coverage = lit / brights.length;
    const bins = hueBinWeights(frame);
    const total = bins.reduce((a, b) => a + b, 0);
    const distinctHues = total > 0 ? bins.filter((w) => w / total > 0.05).length : 0;
    const hueDiversity = clamp01(distinctHues / 4);
    return 0.55 * variation + 0.3 * hueDiversity + 0.15 * coverage;
  });
  return clamp01(mean(per));
}

/** Structural health from the pattern-specific graph diagnostics. Errors weigh
 *  heavily, warnings lightly. */
export function scoreStructuralHealth(diagnostics: GraphDiagnostic[]): number {
  let errors = 0;
  let warnings = 0;
  for (const d of diagnostics) {
    if (d.severity === "error") errors++;
    else warnings++;
  }
  return clamp01(1 - errors * 0.4 - warnings * 0.1);
}

// ── Audio classification ─────────────────────────────────────────────────────

const AUDIO_ROLES = new Set(["bass", "mids", "treble", "kick", "snare", "hihat", "vocals", "energy", "beat", "silence"]);
const AUDIO_BAND_HANDLES = new Set(["bass", "mids", "treble", "energy", "beat", "level", "vocals", "kick", "snare", "hihat", "spectrum"]);

const NODE_DEF = new Map(NODE_LIBRARY.map((def) => [def.type, def]));

function nodeType(node: StudioNode): string {
  return String(node.data.nodeType ?? "");
}
function nodeCategory(node: StudioNode): string {
  return String(node.data.category ?? "");
}
function nodeSubcategory(node: StudioNode): string {
  const own = (node.data as { subcategory?: unknown }).subcategory;
  if (typeof own === "string") return own;
  return NODE_DEF.get(nodeType(node))?.subcategory ?? "";
}
function groupInputRole(node: StudioNode): string {
  return String((node.data.properties as { paramId?: unknown }).paramId ?? "");
}
/** A GroupInput whose exposed port is the whole raw audio signal (as opposed to
 *  a single named band/role) is just as much a real audio source as one tagged
 *  with a band role — its `paramId` is often just "audio"/"param0". */
function groupInputIsAudioTyped(node: StudioNode): boolean {
  const outputs = (node.data as { outputs?: { dataType?: unknown }[] }).outputs;
  return (outputs ?? []).some((p) => p.dataType === "audio");
}

/** True when the subgraph is meant to react to audio: it contains an audio
 *  analyzer, an Audio-Reactive pattern node, or an audio-role GroupInput. */
export function isAudioReactiveSubgraph(nodes: StudioNode[]): boolean {
  return nodes.some(
    (n) =>
      nodeCategory(n) === "audio" ||
      nodeType(n) === "MicInput" ||
      nodeSubcategory(n) === "Audio-Reactive" ||
      (nodeType(n) === "GroupInput" && (AUDIO_ROLES.has(groupInputRole(n)) || groupInputIsAudioTyped(n))),
  );
}

// Nodes in this category are plain signal transforms (Smooth, Math, MapRange,
// Clamp, Lerp, Ease, …): wiring an audio band through one before a consumer
// doesn't change *what* is driving the consumer, so a source found behind one
// of these still counts as "fed by a real audio source".
const PASSTHROUGH_CATEGORY = "math";
const MAX_TRACE_DEPTH = 4;

/** Audio correctness: audio-reactive consumers should be fed by a real audio
 *  source (an analyzer or an audio-role GroupInput), not left unwired or driven
 *  by a non-audio signal. Traces back through simple signal-conditioning nodes
 *  so a Smooth'd/Math'd band still counts. */
export function scoreAudioCorrectness(nodes: StudioNode[], edges: StudioEdge[]): number {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const sourceIds = new Set(
    nodes
      .filter(
        (n) =>
          nodeCategory(n) === "audio" ||
          nodeType(n) === "MicInput" ||
          (nodeType(n) === "GroupInput" && (AUDIO_ROLES.has(groupInputRole(n)) || groupInputIsAudioTyped(n))),
      )
      .map((n) => n.id),
  );
  const hasSource = sourceIds.size > 0;

  function resolvesToSource(nodeId: string, depth: number): boolean {
    if (sourceIds.has(nodeId)) return true;
    if (depth >= MAX_TRACE_DEPTH) return false;
    const upstream = nodeById.get(nodeId);
    if (!upstream || nodeCategory(upstream) !== PASSTHROUGH_CATEGORY) return false;
    return edges.some((e) => e.target === nodeId && resolvesToSource(e.source, depth + 1));
  }

  const reactive = nodes.filter((n) => nodeSubcategory(n) === "Audio-Reactive");

  let consumers = 0;
  let fed = 0;
  for (const node of reactive) {
    const def = NODE_DEF.get(nodeType(node));
    const bandHandles = (def?.inputs ?? [])
      .filter((p) => AUDIO_BAND_HANDLES.has(p.id) || p.dataType === "audio")
      .map((p) => p.id);
    if (bandHandles.length === 0) continue;
    consumers++;
    const isFed = edges.some(
      (e) =>
        e.target === node.id && bandHandles.includes(String(e.targetHandle ?? "")) && resolvesToSource(e.source, 0),
    );
    if (isFed) fed++;
  }

  if (consumers === 0) {
    if (sourceIds.size === 0) return 0.5;
    const usedSources = [...sourceIds].filter((id) => edges.some((e) => e.source === id)).length;
    return clamp01(usedSources / sourceIds.size);
  }

  const fedFraction = fed / consumers;
  return hasSource ? fedFraction : Math.min(fedFraction, 0.2);
}

// ── Intent inference ─────────────────────────────────────────────────────────

const STATIC_TYPES = new Set(["SolidColor", "Text", "Image", "ClockDisplay", "GradientFrame", "PaletteGradient"]);
const ACCENT_TYPES = new Set(["TwinkleFox", "Confetti", "Particles", "Starfield", "BeatFlash", "TrebleSparks", "KickShock", "RadialBurst"]);
const AMBIENT_TYPES = new Set(["Pacifica", "Noise", "Plasma", "FractalNoise", "FieldNoise", "FlowField", "ReactionDiffusion", "Blobs", "TurbulentBloom", "VocalAurora"]);
const ANIMATED_TYPES = new Set([
  "TimeNode", "Interval", "Counter", "Random", "Envelope", "Sin", "Cos", "Wave", "ComplexWave",
  "BeatSin", "HueCycle", "PaletteSweep", "Noise", "Plasma", "Rainbow", "Pride2015", "Pacifica",
  "TwinkleFox", "Scanner", "Confetti", "Juggle", "RadialBurst", "Spiral", "Kaleidoscope",
  "FractalNoise", "GaborNoise", "Blobs", "Animartrix", "Fire", "Fire2012", "Particles",
  "FlowField", "Starfield", "Boids", "ReactionDiffusion", "GameOfLife", "SpectrumBars",
  "SpectrumVisualizer", "BassPulse", "BassRings", "MidrangeWaves", "MidrangeBloom",
  "TrebleSparks", "TreblePrism", "AudioCascade", "BeatFlash", "KickShock", "VocalAurora",
  "BeatKaleidoscope", "SpectraMosaic", "PercussionBlobs", "EmberPulse", "TurbulentBloom",
  "GravityWell", "RainRipples", "PrismStorm", "AudioFlow", "ColorTrails", "WaveSim",
]);

export function inferPatternIntent(nodes: StudioNode[]): PatternIntent {
  if (isAudioReactiveSubgraph(nodes)) return "audio-reactive";
  const types = nodes.map(nodeType);
  if (types.some((type) => ACCENT_TYPES.has(type))) return "accent";
  if (types.some((type) => AMBIENT_TYPES.has(type))) return "ambient";
  const visibleTypes = types.filter((type) => !["GroupInput", "GroupOutput", "Comment"].includes(type));
  if (visibleTypes.some((type) => STATIC_TYPES.has(type)) && !visibleTypes.some((type) => ANIMATED_TYPES.has(type))) {
    return "static-utility";
  }
  return "showpiece";
}

// ── Motion / tone / composition ──────────────────────────────────────────────

interface MotionStats {
  meanDelta: number;
  spanDelta: number;
}

function frameDifference(a: Frame | undefined, b: Frame | undefined): number {
  if (!a || !b) return 0;
  const diffs: number[] = [];
  forEachPixel(b, (px, x, y) => {
    const prev = a[y]?.[x];
    if (!prev) return;
    diffs.push((Math.abs(px.r - prev.r) + Math.abs(px.g - prev.g) + Math.abs(px.b - prev.b)) / (255 * 3));
  });
  return mean(diffs);
}

function motionStats(frames: Frame[]): MotionStats {
  if (frames.length < 2) return { meanDelta: 0, spanDelta: 0 };
  const deltas: number[] = [];
  for (let i = 1; i < frames.length; i++) deltas.push(frameDifference(frames[i - 1], frames[i]));
  return { meanDelta: mean(deltas), spanDelta: frameDifference(frames[0], frames[frames.length - 1]) };
}

function scoreInRange(value: number, low: number, high: number, falloff: number): number {
  if (value >= low && value <= high) return 1;
  if (value < low) return clamp01(1 - (low - value) / Math.max(0.0001, falloff));
  return clamp01(1 - (value - high) / Math.max(0.0001, falloff));
}

function scoreComposition(frames: Frame[], nodes: StudioNode[], intent: PatternIntent): number {
  const raw = scoreStructure(frames);
  if (intent === "static-utility" && nodes.some((node) => nodeType(node) === "SolidColor")) return 0.9;
  if (intent === "ambient") return clamp01(0.48 + raw * 0.52);
  if (intent === "accent") return clamp01(0.38 + raw * 0.62);
  return raw;
}

function tonalStats(frames: Frame[]): { meanLuma: number; blackFraction: number; whiteFraction: number } {
  let total = 0, luma = 0, black = 0, white = 0;
  for (const frame of frames) {
    forEachPixel(frame, (px) => {
      const value = (0.2126 * px.r + 0.7152 * px.g + 0.0722 * px.b) / 255;
      total++;
      luma += value;
      if (value < 0.015) black++;
      if (value > 0.97 && Math.max(px.r, px.g, px.b) - Math.min(px.r, px.g, px.b) < 12) white++;
    });
  }
  return total === 0
    ? { meanLuma: 0, blackFraction: 1, whiteFraction: 0 }
    : { meanLuma: luma / total, blackFraction: black / total, whiteFraction: white / total };
}

function scoreTonalControl(frames: Frame[], intent: PatternIntent): number {
  const stats = tonalStats(frames);
  const ranges: Record<PatternIntent, [number, number, number]> = {
    ambient: [0.08, 0.55, 0.24],
    showpiece: [0.12, 0.72, 0.24],
    accent: [0.025, 0.45, 0.18],
    "audio-reactive": [0.06, 0.7, 0.24],
    "static-utility": [0.05, 0.85, 0.28],
  };
  const [low, high, falloff] = ranges[intent];
  const exposure = scoreInRange(stats.meanLuma, low, high, falloff);
  const blankPenalty = stats.blackFraction > 0.995 ? 0 : 1;
  const whitePenalty = clamp01(1 - Math.max(0, stats.whiteFraction - 0.75) / 0.25);
  return clamp01(exposure * blankPenalty * whitePenalty);
}

function scoreMotionCraft(frames: Frame[], intent: PatternIntent): number {
  const { meanDelta } = motionStats(frames);
  const ranges: Record<PatternIntent, [number, number, number]> = {
    ambient: [0.001, 0.09, 0.12],
    showpiece: [0.006, 0.22, 0.16],
    accent: [0.004, 0.34, 0.2],
    "audio-reactive": [0.004, 0.34, 0.2],
    "static-utility": [0, 0.012, 0.12],
  };
  const [low, high, falloff] = ranges[intent];
  return scoreInRange(meanDelta, low, high, falloff);
}

function scoreExpressiveness(frames: Frame[], intent: PatternIntent): number {
  if (intent === "static-utility") return 1;
  const { spanDelta } = motionStats(frames);
  const target = intent === "ambient" ? 0.035 : intent === "showpiece" ? 0.09 : 0.065;
  return clamp01(spanDelta / target);
}

function averageFrame(frames: Frame[]): Frame | undefined {
  const h = frames[0]?.length ?? 0;
  const w = frames[0]?.[0]?.length ?? 0;
  if (!w || !h || frames.length === 0) return undefined;
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      let r = 0, g = 0, b = 0, count = 0;
      for (const frame of frames) {
        const px = frame[y]?.[x];
        if (!px) continue;
        r += px.r; g += px.g; b += px.b; count++;
      }
      return count ? { r: r / count, g: g / count, b: b / count } : { r: 0, g: 0, b: 0 };
    }),
  );
}

function scoreAudioResponsiveness(scenarios: Record<string, Frame[]>): number {
  const silent = averageFrame(scenarios.silent ?? []);
  const steady = averageFrame(scenarios.steady ?? []);
  const pulse = averageFrame(scenarios.pulse ?? []);
  const separation = Math.max(
    frameDifference(silent, steady),
    frameDifference(silent, pulse),
    frameDifference(steady, pulse),
  );
  return clamp01(separation / 0.16);
}

// ── Combine into a rating ─────────────────────────────────────────────────────

interface CriterionSpec {
  id: string;
  label: string;
  weight: number;
  score: number;
  detail: (score: number) => string;
}

function pct(score: number): number {
  return Math.round(score * 100);
}

/** Combine the criterion scores of one pattern into a 0–100 rating, renormalising
 *  weights over the criteria that actually apply (audio is omitted when the
 *  pattern isn't audio-reactive). */
export function scorePattern(
  frames: Frame[],
  diagnostics: GraphDiagnostic[],
  nodes: StudioNode[],
  edges: StudioEdge[],
  requestedIntent?: PatternIntent,
  scenarios: Record<string, Frame[]> = {},
): PatternRatingResult {
  const audioReactive = isAudioReactiveSubgraph(nodes);
  const inferredIntent = inferPatternIntent(nodes);
  const intent = requestedIntent ?? inferredIntent;

  const specs: CriterionSpec[] = [
    {
      id: "technical", label: "Technical integrity", weight: 0.18,
      score: scoreStructuralHealth(diagnostics),
      detail: (s) => (s >= 0.99 ? "The graph is clean and complete" : s >= 0.6 ? "Minor graph warnings need review" : "Graph errors undermine the result"),
    },
    {
      id: "composition", label: "Spatial composition", weight: 0.22,
      score: scoreComposition(frames, nodes, intent),
      detail: (s) => (s >= 0.8 ? "Uses the matrix with clear intent" : s >= 0.55 ? "The composition reads, but lacks definition" : "The frame feels unresolved for this intent"),
    },
    {
      id: "tone", label: "Colour & tonal control", weight: 0.18,
      score: scoreTonalControl(frames, intent),
      detail: (s) => (s >= 0.8 ? "Brightness and colour remain controlled" : s >= 0.55 ? "Some passages lose tonal separation" : "Output is crushed, empty, or overexposed"),
    },
    {
      id: "motion", label: "Motion craft", weight: intent === "static-utility" ? 0.14 : 0.22,
      score: scoreMotionCraft(frames, intent),
      detail: (s) => (s >= 0.8 ? "Motion suits the pattern's intent" : s >= 0.55 ? "Pacing is usable but uneven" : intent === "static-utility" ? "Unexpected motion distracts from its function" : "Motion is either inert or too erratic"),
    },
    {
      id: "expressiveness", label: "Expressiveness over time", weight: intent === "static-utility" ? 0.1 : 0.2,
      score: scoreExpressiveness(frames, intent),
      detail: (s) => (s >= 0.8 ? "Develops meaningfully across the captured run" : s >= 0.55 ? "Some evolution, but the range is narrow" : intent === "static-utility" ? "Stable and readable" : "Changes too little to sustain interest"),
    },
  ];

  if (intent === "audio-reactive") {
    specs.push({
      id: "audio", label: "Audio responsiveness", weight: 0.22,
      score: scoreAudioCorrectness(nodes, edges) * scoreAudioResponsiveness(scenarios),
      detail: (s) => (s >= 0.8 ? "Music creates a clear, controlled response" : s >= 0.5 ? "Audio response is present but subtle or uneven" : "Audio wiring or visible response is too weak"),
    });
  }

  const totalWeight = specs.reduce((a, s) => a + s.weight, 0);
  let overall = pct(specs.reduce((a, s) => a + s.score * s.weight, 0) / totalWeight);
  const hasError = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const { blackFraction } = tonalStats(frames);
  if (hasError) overall = Math.min(overall, 49);
  if (blackFraction > 0.995) overall = Math.min(overall, 29);
  const criteria: CriterionScore[] = specs.map((s) => ({
    id: s.id, label: s.label, score: s.score, weight: s.weight, detail: s.detail(s.score),
  }));
  const { id: verdict, label: verdictLabel } = verdictForScore(overall);
  const ranked = [...criteria].sort((a, b) => b.score - a.score);
  const strengths = ranked.filter((criterion) => criterion.score >= 0.72).slice(0, 2).map((criterion) => criterion.detail);
  const improvements = [...criteria].sort((a, b) => a.score - b.score).slice(0, 2).map((criterion) => criterion.detail);
  const weakest = [...criteria].sort((a, b) => a.score - b.score)[0];
  const summary = `${verdictLabel} for ${intent}. ${weakest?.detail ?? "No critique available."}`;
  return {
    overall, criteria, audioReactive, intent, inferredIntent, verdict, verdictLabel,
    summary, strengths, improvements,
  };
}

export function verdictForScore(score: number): { id: PatternVerdict; label: string } {
  if (score >= 90) return { id: "exceptional", label: "Exceptional" };
  if (score >= 75) return { id: "strong", label: "Strong" };
  if (score >= 60) return { id: "promising", label: "Promising" };
  if (score >= 40) return { id: "needs-work", label: "Needs work" };
  return { id: "fundamentally-weak", label: "Fundamentally weak" };
}

// ── Offline rendering + driver ───────────────────────────────────────────────

const SPECTRUM_BINS = 32;
const BASS_BIN_END = 6;
const MID_BIN_END = 16;

/** Build the coarse 32-bin spectrum the firmware fills from three bands,
 *  mirroring the app's showAudio.ts (only this one function is needed here). */
function bandsToSpectrum(bass: number, mids: number, treble: number): number[] {
  return Array.from({ length: SPECTRUM_BINS }, (_, b) => (b < BASS_BIN_END ? bass : b < MID_BIN_END ? mids : treble));
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ── Capture parameters (mirrors the app's RATE_* constants) ────────────────────
const RATE_FPS = 15;
const RATE_DURATION_SEC = 1.4;
const RATE_FRAMES = Math.max(2, Math.round(RATE_FPS * RATE_DURATION_SEC));
const RATE_WARMUP_FRAMES = Math.max(2, Math.round(RATE_FPS * 1.2));
const RATE_RUNS = 2;
const RATE_GAP_FRAMES = Math.max(1, Math.round(RATE_FPS * 0.8));

type AudioScenario = "silent" | "steady" | "pulse";

/** Deterministic audio scenarios let the critic distinguish "looks good during
 *  one sweep" from a pattern that behaves coherently in silence, sustained
 *  energy, and beat-heavy material. */
function audioForFrame(i: number, scenario: AudioScenario): { override: AudioOverride; roles: Record<string, number | boolean> } {
  const t = i / RATE_FPS;
  const bass = scenario === "silent" ? 0 : scenario === "steady" ? 0.58 : 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.7 * t);
  const mids = scenario === "silent" ? 0 : scenario === "steady" ? 0.42 : 0.5 + 0.5 * Math.sin(2 * Math.PI * 1.1 * t + 1);
  const treble = scenario === "silent" ? 0 : scenario === "steady" ? 0.34 : 0.5 + 0.5 * Math.sin(2 * Math.PI * 1.7 * t + 2);
  const beat = scenario === "pulse" && i % Math.max(1, Math.round(RATE_FPS * 0.5)) === 0;
  const spectrum = bandsToSpectrum(bass, mids, treble);
  const override: AudioOverride = {
    active: true, micActive: true, beat, bpm: 120,
    bass, mids, treble, micBass: bass, micMids: mids, micTreble: treble,
    spectrum, detectorSpectrum: spectrum,
  } as AudioOverride;
  const roles: Record<string, number | boolean> = {
    bass, mids, treble, kick: bass, snare: mids, hihat: treble, vocals: mids,
    energy: (bass + mids + treble) / 3, beat, silence: scenario === "silent",
  };
  return { override, roles };
}

function copyFrame(frame: Frame): Frame {
  return frame.map((row) => row.map((px) => ({ r: px.r, g: px.g, b: px.b })));
}

function blankFrame(w: number, h: number): Frame {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => ({ r: 0, g: 0, b: 0 })));
}

let rateSerial = 0;

/** Render a pattern subgraph to `runs` scoring windows (each RATE_FRAMES
 *  frames), spread across the animation after a warm-up prefix, under one
 *  continuous evaluation with swept audio. The windows sample different
 *  moments so the caller can keep the best. */
async function captureWindows(
  nodes: StudioNode[],
  edges: StudioEdge[],
  w: number,
  h: number,
  groups: GroupRegistry,
  trusted: boolean,
  scenario: AudioScenario,
  runs: number,
  signal?: AbortSignal,
): Promise<Frame[][]> {
  const prefix = `__rate_${rateSerial++}/`;
  let i = 0;
  const step = async (): Promise<Frame> => {
    if (signal?.aborted) throw new DOMException("Pattern scan cancelled", "AbortError");
    const tick = (i * 60) / RATE_FPS;
    const { override, roles } = audioForFrame(i, scenario);
    i++;
    let rendered: Frame | null = null;
    try {
      rendered = evaluateGraph(nodes, edges, tick, w, h, groups, prefix, new Set(), roles, override, trusted);
    } catch {
      rendered = null;
    }
    if (i % 8 === 0) await yieldToUi();
    return rendered ? copyFrame(rendered) : blankFrame(w, h);
  };

  for (let k = 0; k < RATE_WARMUP_FRAMES; k++) await step();
  const windows: Frame[][] = [];
  for (let run = 0; run < runs; run++) {
    const frames: Frame[] = [];
    for (let k = 0; k < RATE_FRAMES; k++) frames.push(await step());
    windows.push(frames);
    if (run < runs - 1) for (let k = 0; k < RATE_GAP_FRAMES; k++) await step();
  }
  return windows;
}

export interface RatePatternOptions {
  gridW: number;
  gridH: number;
  groups?: GroupRegistry;
  /** Must only be `true` after real, per-pattern trust has already been
   *  established (moderator approval / same boundary evaluateSharedPattern
   *  enforces) — never default this to true for anonymous content. */
  trusted?: boolean;
  intent?: PatternIntent;
  signal?: AbortSignal;
}

/** Rate a pattern subgraph (rendered + analysed). Never throws for a
 *  render failure — callers get a `failed` result so one bad pattern can't
 *  stall a moderator backfill batch; an abort still throws so the caller can
 *  distinguish "cancelled" from "scored". */
export async function ratePattern(
  nodes: StudioNode[],
  edges: StudioEdge[],
  options: RatePatternOptions,
): Promise<PatternRatingResult | { failed: true; error: string }> {
  const groups = options.groups ?? {};
  const trusted = options.trusted === true;
  try {
    const audioReactive = isAudioReactiveSubgraph(nodes) || options.intent === "audio-reactive";
    const scenarios: Record<string, Frame[]> = {};
    if (audioReactive) {
      for (const scenario of ["silent", "steady", "pulse"] as const) {
        scenarios[scenario] = (await captureWindows(nodes, edges, options.gridW, options.gridH, groups, trusted, scenario, 1, options.signal))[0] ?? [];
      }
    } else {
      scenarios.motion = (await captureWindows(nodes, edges, options.gridW, options.gridH, groups, trusted, "pulse", RATE_RUNS, options.signal)).flat();
    }
    const frames = Object.values(scenarios).flat();
    const diagnostics = buildPatternDiagnostics(nodes, edges, options.gridW, options.gridH);
    return scorePattern(frames, diagnostics, nodes, edges, options.intent, scenarios);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return { failed: true, error: err instanceof Error ? err.message : String(err) };
  }
}
