// Writes the app's built-in pattern library out as the site's catalogue.
//
// Bundled and run by sync.mjs with `@app` aliased to the app's `src/`. Reads
// BUNDLED_PATTERNS — the exact list the app's Pattern Library ships — and
// writes, for each one:
//   * the pattern file a visitor downloads and the preview fetches, in the
//     same `{ name, subgraph, groups }` shape the app's own share produces;
//   * a catalogue entry (title, generated description, tags, accent colours).
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BUNDLED_PATTERNS, AUDIO_REACTIVE_CATEGORY_ID } from "@app/state/patterns/bundledPatterns";
import { NODE_LIBRARY } from "@app/state/nodeLibrary";
import { evaluateGraphFull } from "@app/state/graphEvaluator";
import { clearInstanceStateByPrefix } from "@app/state/evaluator/memory";
import { audioGroupInputParamIds } from "@app/state/evaluator/openGroupInputs";
import { isAudioReactiveSubgraph } from "@app/state/patterns/audioReactiveSubgraph";
import { bandsToSpectrum } from "@app/state/player/showAudio";
import { suggestPatternFileName } from "@app/utils/communityUpload";
import {
  createPatternRunner,
  PREVIEW_GRID,
  type PatternEngine,
  type RunnableGraph,
} from "../../src/lib/app-engine/pattern-runner";

const [catalogPath, filesDir] = process.argv.slice(2);
if (!catalogPath || !filesDir) throw new Error("usage: dump-patterns <catalog.json> <files-dir>");

const LABELS = new Map(NODE_LIBRARY.map((def) => [def.type, def.label]));

/** Plumbing every pattern has; naming it would say nothing about the look. */
const PLUMBING = new Set([
  "GroupInput", "GroupOutput", "MapRange", "Clamp", "Smooth", "Math", "Switch", "Compare",
  "Logic", "SampleHold", "Envelope", "Random", "Trigger", "TimeNode", "Function",
  "BrightnessMod", "Saturation", "AudioFeatures", "FFTAnalyzer", "BeatDetect",
  "PercussionDetect", "Poline", "PaletteSelector",
]);

const FORM_LABEL: Record<string, string> = { matrix: "matrix", ring: "ring", string: "string" };

type CatalogEntry = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  colors: [string, string, string];
  createdAt: string;
  fileName: string;
};

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function listOf(words: string[]): string {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

type Node = { data?: { nodeType?: string } };

function describe(nodes: Node[], audio: boolean, bestOn: string[] | undefined): string {
  const engines: string[] = [];
  for (const node of nodes) {
    const type = node.data?.nodeType ?? "";
    if (PLUMBING.has(type)) continue;
    const label = LABELS.get(type) ?? type;
    if (label && !engines.includes(label)) engines.push(label);
  }
  const lead = audio
    ? "Audio-reactive pattern from the Design Studio library — play music or enable the mic to drive it."
    : "Pattern from the Design Studio library.";
  const built = engines.length ? ` Built from ${listOf(engines.slice(0, 4))}.` : "";
  const forms = (bestOn ?? []).map((form) => FORM_LABEL[form] ?? form);
  const best = forms.length ? ` Best on a ${listOf(forms)} layout.` : "";
  return `${lead}${built}${best}`;
}

const hex = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
const FALLBACK: [string, string, string] = ["#61e4ff", "#876bff", "#ff78b7"];

const engine: PatternEngine = {
  evaluateGraphFull: evaluateGraphFull as unknown as PatternEngine["evaluateGraphFull"],
  clearInstanceStateByPrefix,
  audioGroupInputParamIds: audioGroupInputParamIds as unknown as PatternEngine["audioGroupInputParamIds"],
  isAudioReactiveSubgraph: isAudioReactiveSubgraph as unknown as PatternEngine["isAudioReactiveSubgraph"],
  bandsToSpectrum,
};

/**
 * Three accent colours for the card and detail page, taken from what the
 * pattern actually renders on the site (the same runner and demo beat): a
 * few seconds of frames, lit pixels bucketed by hue, the heaviest buckets
 * averaged and lifted to full brightness. A single-hue pattern fills the
 * rest from its own darker and lighter pixels.
 */
function accentColors(pattern: (typeof BUNDLED_PATTERNS)[number]): [string, string, string] {
  const buckets = Array.from({ length: 12 }, () => ({ weight: 0, r: 0, g: 0, b: 0 }));
  const lit: { r: number; g: number; b: number; luma: number }[] = [];
  // Plenty of patterns scatter sparks with Math.random. Seed it from the
  // pattern's name so an unchanged pattern samples the same colours on every
  // sync instead of churning the catalogue.
  let seed = [...pattern.name].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261);
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const runner = createPatternRunner(engine, { ...pattern.subgraph, groups: {} } as RunnableGraph, true);
  for (let second = 0.25; second <= 8; second += 0.25) {
    const frame = runner.frame(second, PREVIEW_GRID, PREVIEW_GRID, null);
    if (second < 2) continue;
    for (const row of frame ?? []) {
      for (const { r, g, b } of row) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max < 40) continue;
        lit.push({ r, g, b, luma: 0.2126 * r + 0.7152 * g + 0.0722 * b });
        const sat = (max - min) / max;
        let hue = 0;
        if (max !== min) {
          if (max === r) hue = ((g - b) / (max - min) + 6) % 6;
          else if (max === g) hue = (b - r) / (max - min) + 2;
          else hue = (r - g) / (max - min) + 4;
        }
        const bucket = buckets[Math.floor(hue * 2) % 12];
        const weight = (0.25 + sat) * max;
        bucket.weight += weight;
        bucket.r += r * weight;
        bucket.g += g * weight;
        bucket.b += b * weight;
      }
    }
  }
  const picked = buckets
    .filter((bucket) => bucket.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(({ weight, r, g, b }) => {
      const [mr, mg, mb] = [r / weight, g / weight, b / weight];
      const lift = 255 / Math.max(1, mr, mg, mb);
      return `#${hex(mr * lift)}${hex(mg * lift)}${hex(mb * lift)}`;
    });
  runner.dispose();
  lit.sort((a, b) => a.luma - b.luma);
  for (const quantile of [0.97, 0.5, 0.2]) {
    if (picked.length >= 3) break;
    const pixel = lit[Math.floor(quantile * (lit.length - 1))];
    if (!pixel) break;
    const color = `#${hex(pixel.r)}${hex(pixel.g)}${hex(pixel.b)}`;
    if (!picked.includes(color)) picked.push(color);
  }
  while (picked.length < 3) picked.push(picked[0] ?? FALLBACK[picked.length]);
  return picked as [string, string, string];
}

mkdirSync(filesDir, { recursive: true });
for (const stale of readdirSync(filesDir)) {
  if (stale.endsWith(".fastled-pattern.json")) rmSync(join(filesDir, stale));
}

const seen = new Set<string>();
const catalog: CatalogEntry[] = BUNDLED_PATTERNS.map((pattern) => {
  const id = slug(pattern.name);
  if (!id || seen.has(id)) throw new Error(`Built-in pattern "${pattern.name}" has an empty or duplicate slug "${id}"`);
  seen.add(id);

  const audio = pattern.categoryId === AUDIO_REACTIVE_CATEGORY_ID;
  const forms = (pattern.bestOn ?? []).map((form) => form[0].toUpperCase() + form.slice(1));
  writeFileSync(
    join(filesDir, `${id}.fastled-pattern.json`),
    JSON.stringify({ name: pattern.name, subgraph: pattern.subgraph, groups: pattern.groups ?? {} }),
  );

  return {
    id,
    title: pattern.name,
    description: describe(pattern.subgraph.nodes as Node[], audio, pattern.bestOn),
    tags: [audio ? "Audio Reactive" : "Standard", ...forms],
    colors: accentColors(pattern),
    createdAt: new Date(pattern.createdAt).toISOString(),
    fileName: suggestPatternFileName(pattern.name),
  };
});

writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Wrote ${catalog.length} built-in patterns.`);
