# Syncing patterns and previews from the app

The gallery's built-in patterns and every live preview on the site come straight
from the Design Studio for FastLED app repository. Nothing is hand-copied, so
re-run the sync whenever the app changes a node, its LED Preview renderer or its
built-in Pattern Library.

## Running it

The app checkout needs its own `npm install`. Then, from this repo:

```bash
node scripts/app-sync/sync.mjs
```

The script finds the app at `$DESIGN_STUDIO_APP`, or a
`Design-Studio-for-FastLED` checkout beside this repo. You can also pass the
path as the first argument. Commit everything it writes.

## What it writes

| Output | What it is |
| --- | --- |
| `src/lib/app-engine/engine.js` | The app's evaluator (`evaluateGraphFull`) plus its WebGL and 2D LED renderers, bundled with the app's own esbuild. |
| `src/lib/app-engine/codeSandbox.worker.js` | The app's Code-node sandbox worker, which the engine spawns. |
| `src/lib/built-in-patterns.json` | Catalogue of the app's `BUNDLED_PATTERNS`: title, generated description, tags (category plus "best on" forms) and three accent colours sampled from a render. |
| `public/pattern-files/built-in/*.fastled-pattern.json` | One file per built-in pattern, in the same `{ name, subgraph, groups }` shape the app's share produces. The preview fetches it and visitors download it. |

The script only bundles the exports listed in `scripts/app-sync/engine-entry.ts`.
`src/lib/app-engine/engine.d.ts` types them by hand, so update both together.
The app's `state/graphStore` is replaced with `graph-store-stub.ts`: it is the
editor's whole project store, and the evaluator reads only two empty-for-a-pattern
fields from it.

## How the site uses it

- `src/lib/app-engine/pattern-runner.ts` runs one pattern in its own evaluator
  namespace, the same way the app's rating driver does. It binds the pattern's
  audio GroupInputs to the visitor's live audio. When no audio is live, it uses
  a demo beat modelled on the app's "pulse" rating scenario. Without it, most
  audio-reactive patterns show as a black square.
- `LivePatternCanvas` renders at 16×16, the app's LED Preview default, in the
  app's "standard" preview style. Gallery cards use the app's 2D renderer,
  because a page gets only about 16 WebGL contexts. The detail page uses the
  WebGL shader.
- Built-in patterns are first-party, so the site runs their Formula and Code
  nodes without a trust prompt, as the app does. Community uploads still ask.
- The gallery lists published community uploads first, then the built-ins in the
  app's library order.

## Not yet on the app engine

`src/lib/evaluator/` is the older hand-vendored copy. Three things still use it:

- the moderator Studio Score (`patternRating.ts`);
- the clip backfill (`generate-preview-clip.ts`);
- the dev-only hero-loop renderer.

Moving them onto `engine.js` would let that directory shrink to the audio
analysis code.
