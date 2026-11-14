// The app's microphone/track analysis, bundled into src/lib/app-engine/audio.js
// by sync.mjs. The site's AudioEngine (src/lib/evaluator/audio/audioEngine.ts)
// owns capture and playback; this is the analysis it runs on each frame, so
// patterns receive the same signal they do in the app — bands, beat, spectrum,
// channel levels and the Vibe / Song Structure / Pitch detector payloads.
// src/lib/app-engine/audio.d.ts types exactly these names.
export { FastLedAudioAnalyzer } from "@app/audio/fastledReactive";
export { levelsFromSampleChannels } from "@app/audio/stereoLevels";
export {
  MIC_DEFAULTS,
  MIC_FFT_SIZE,
  MIC_MAX_GAIN,
  MIC_SAMPLE_RATE,
  MIC_SPECTRUM_BARS,
} from "@app/audio/micAnalysis";
