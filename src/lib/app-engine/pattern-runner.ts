// Runs one shared pattern through the app's engine (engine.js), frame by frame.
//
// Kept free of any import of engine.js itself: the engine is handed in, so the
// browser can load it lazily (loadEngine below) and the catalogue sync script
// can pass the app's modules straight from source. Both then drive patterns
// through exactly this code.
import type * as Engine from "./engine";

/** The subset of engine.js a runner calls. */
export type PatternEngine = Pick<
  typeof Engine,
  "evaluateGraphFull" | "clearInstanceStateByPrefix" | "audioGroupInputParamIds" | "isAudioReactiveSubgraph" | "bandsToSpectrum"
>;

export type RunnableGraph = {
  nodes: Parameters<typeof Engine.evaluateGraphFull>[0];
  edges: Parameters<typeof Engine.evaluateGraphFull>[1];
  groups: Engine.GroupRegistry;
};

/**
 * The matrix size patterns are previewed at — the app's LED Preview default
 * (previewGrid.ts DEFAULT_GRID_SIZE), so a pattern reads at the same LED
 * density on the site as it does on first open in the app.
 */
export const PREVIEW_GRID = 16;

let enginePromise: Promise<typeof Engine> | null = null;

/** The engine is ~1.5 MB, so it loads on first use rather than with the page. */
export function loadEngine(): Promise<typeof Engine> {
  enginePromise ??= import("./engine.js") as Promise<typeof Engine>;
  return enginePromise;
}

/**
 * What a pattern hears with no live audio: the app's idle audio store — an
 * inactive signal at zero. Audio-reactive patterns sit at their silence floor
 * (often black), exactly as they do in the app with nothing playing.
 */
function silence(engine: PatternEngine): Engine.AudioSignal {
  const spectrum = engine.bandsToSpectrum(0, 0, 0);
  return {
    active: false, micActive: false, beat: false, bpm: 120,
    bass: 0, mids: 0, treble: 0, micBass: 0, micMids: 0, micTreble: 0,
    leftLevel: 0, rightLevel: 0, channelCount: 1,
    spectrum, detectorSpectrum: spectrum,
  };
}

/** Role inputs a pattern's band-named GroupInputs read, as the app's rating
 *  driver binds them from the same signal. */
function roleInputs(audio: Engine.AudioSignal): Record<string, number | boolean> {
  const bass = audio.micBass;
  const mids = audio.micMids;
  const treble = audio.micTreble;
  const energy = (bass + mids + treble) / 3;
  return {
    bass, mids, treble, kick: bass, snare: mids, hihat: treble, vocals: mids,
    reactivity: energy, beat: audio.beat === true, silence: energy < 0.01,
  };
}

let runnerSerial = 0;

export type PatternRunner = {
  /** Whether the pattern listens to audio at all. */
  audioReactive: boolean;
  /**
   * The pattern at `seconds`. Pass `audio` for live input; null is silence.
   * The returned frame is a pooled buffer: read it before the next call.
   */
  frame: (seconds: number, width: number, height: number, audio: Engine.AudioSignal | null) => Engine.Frame | null;
  /** Release this runner's per-node state (feedback buffers, simulations). */
  dispose: () => void;
};

/**
 * One pattern in its own evaluator namespace — the same isolation the app's
 * rating driver uses, so two previews of patterns that both name a node "base"
 * never share its state.
 */
export function createPatternRunner(engine: PatternEngine, graph: RunnableGraph, trusted: boolean): PatternRunner {
  const prefix = `site/${runnerSerial++}/`;
  const audioParams = engine.audioGroupInputParamIds(graph.nodes);
  const audioReactive = audioParams.length > 0
    || engine.isAudioReactiveSubgraph(graph.nodes)
    || Object.values(graph.groups).some((group) => engine.isAudioReactiveSubgraph(group.nodes));
  const quiet = silence(engine);

  return {
    audioReactive,
    frame(seconds, width, height, live) {
      const audio = live ?? quiet;
      const inputs: Record<string, unknown> = roleInputs(audio);
      for (const paramId of audioParams) inputs[paramId] = audio;
      const tick = seconds * 60;
      try {
        return engine.evaluateGraphFull(
          graph.nodes, graph.edges, tick, width, height, graph.groups,
          false, trusted, prefix, live, tick, inputs,
        ).frame;
      } catch {
        // One malformed frame renders blank rather than stopping the preview,
        // as the app's own preview loop does.
        return null;
      }
    },
    dispose: () => engine.clearInstanceStateByPrefix(prefix),
  };
}
