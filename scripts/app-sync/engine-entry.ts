// What the site takes from Design Studio for FastLED's own preview engine.
//
// `@app` is aliased to the app repository's `src/` by sync.mjs, so every
// export below is the app's real code, bundled as-is into
// src/lib/app-engine/engine.js. Keep this list to what the site renders with;
// src/lib/app-engine/engine.d.ts types exactly these names.
export { evaluateGraphFull } from "@app/state/graphEvaluator";
export { clearInstanceStateByPrefix } from "@app/state/evaluator/memory";
export { audioGroupInputParamIds } from "@app/state/evaluator/openGroupInputs";
export { isAudioReactiveSubgraph } from "@app/state/patterns/audioReactiveSubgraph";
export { bandsToSpectrum } from "@app/state/player/showAudio";
export { WebGLLEDRenderer } from "@app/components/Preview/webglRenderer";
export { renderPreviewFrame } from "@app/components/Preview/frameCanvas";
export { idleFrame } from "@app/components/Preview/idleFrame";
