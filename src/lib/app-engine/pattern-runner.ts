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

const BEAT_SECONDS = 0.5;

/**
 * Audio to drive an audio-reactive pattern with while no real audio is
 * playing: the app's own "pulse" rating scenario (state/patterns/
 * patternRating.ts audioForFrame + syntheticDetectors) — three bands swept on
 * unrelated periods and a beat every half second at 120 BPM. Without it most
 * audio patterns sit at their silence floor, which on a gallery is a black
 * square.
 */
export function demoAudio(engine: PatternEngine, seconds: number, beat: boolean): Engine.AudioSignal {
  const bass = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.7 * seconds);
  const mids = 0.5 + 0.5 * Math.sin(2 * Math.PI * 1.1 * seconds + 1);
  const treble = 0.5 + 0.5 * Math.sin(2 * Math.PI * 1.7 * seconds + 2);
  const energy = (bass + mids + treble) / 3;
  const spectrum = engine.bandsToSpectrum(bass, mids, treble);
  const beatIndex = Math.floor(seconds / BEAT_SECONDS);
  const level = (value: number) => 0.5 + value;
  return {
    active: true, micActive: true, beat, bpm: 120,
    bass, mids, treble, micBass: bass, micMids: mids, micTreble: treble,
    leftLevel: energy * 0.35, rightLevel: energy * 0.2, channelCount: 2,
    spectrum, detectorSpectrum: spectrum,
    vibe: {
      bass: level(bass), mid: level(mids), treble: level(treble), volume: 0.5 + energy,
      bassAtt: level(bass), midAtt: level(mids), trebleAtt: level(treble),
      bassSpike: beat, midSpike: false, trebleSpike: false,
    },
    structure: {
      downbeat: beat && beatIndex % 4 === 0, beatNumber: (beatIndex % 4) + 1,
      measurePhase: (seconds / 2) % 1,
      building: false, buildupProgress: 0, drop: false, dropImpact: 0,
      tempoStable: true, valence: 0.5, arousal: 0.6,
    },
    pitch: {
      hz: 220, note: 57, noteOn: beat, velocity: mids, confidence: 0.8,
      keyRoot: 0, keyMinor: false, keyConfidence: 0.5,
    },
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
  /** Whether the pattern listens to audio at all (so may want a demo signal). */
  audioReactive: boolean;
  /**
   * The pattern at `seconds`. Pass `audio` for real input; null drives an
   * audio-reactive pattern with demoAudio instead.
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
  let lastBeatIndex = -1;

  return {
    audioReactive,
    frame(seconds, width, height, live) {
      let audio = live;
      if (!audio && audioReactive) {
        const beatIndex = Math.floor(seconds / BEAT_SECONDS);
        audio = demoAudio(engine, seconds, beatIndex !== lastBeatIndex);
        lastBeatIndex = beatIndex;
      }
      const inputs: Record<string, unknown> = audio ? roleInputs(audio) : {};
      for (const paramId of audioParams) inputs[paramId] = audio;
      const tick = seconds * 60;
      try {
        return engine.evaluateGraphFull(
          graph.nodes, graph.edges, tick, width, height, graph.groups,
          false, trusted, prefix, audio, tick, inputs,
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
