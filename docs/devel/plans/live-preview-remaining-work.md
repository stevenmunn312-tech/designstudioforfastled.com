# Live preview: remaining work

Handoff for picking up where this session left off. Written 2026-08-03.

## Context

This site (designstudioforfastled.com) hosts community-shared FastLED patterns
from the Design Studio for FastLED desktop app. Patterns are evaluated
genuinely live in the browser — not approximated — using a slimmed port of the
app's own evaluation engine at `src/lib/evaluator/`. The gallery grid plays
back a short captured WebM clip per card instead of running a live evaluator
per card (that didn't scale); the homepage hero and the pattern detail page
still run the live evaluator directly, since only one instance ever renders
at a time in those spots.

## What exists today

- `src/lib/evaluator/` — ported `evaluateGraph` + node library + AnimARTrix +
  the Formula/Code sandbox. AnimARTrix is CC-BY-NC-SA-4.0 (not MIT like the
  rest), isolated in its own subdirectory with its license file, same as the
  app does. `evaluateSharedPattern()`/`patternNeedsTrust()` default every
  public pattern to untrusted for Custom Formula/Field Formula/Code nodes —
  the raw engine defaults the other way (`trusted = true`), which is correct
  for the app's own local content and wrong for anonymous public uploads.
- `LivePatternCanvas` — live-evaluation renderer, used on the detail page and
  homepage hero. It now accepts an `audioOverride` ref so the renderer can
  read live mic analysis every frame without forcing React re-renders at the
  audio-analysis cadence.
- `PatternPreviewMedia` — captured-clip `<video>` renderer, used on gallery
  cards; falls back to the live `PatternPreview` when a pattern has no clip.
- Live-audio plumbing for the pattern detail page:
  - `src/lib/evaluator/audio/fastledReactive.ts` — TypeScript port of
    FastLED's microphone analysis pipeline (conditioning, bands, beat detect,
    equalizer spectrum), feeding the evaluator's existing `AudioOverride`
    shape rather than inventing a site-only contract.
  - `src/lib/evaluator/audio/audioEngine.ts` — browser mic capture, local
    `<audio>` element analysis, and `FastLedAudioAnalyzer` orchestration.
  - `src/lib/use-live-audio.ts` — hook that owns mic + local-track lifecycle,
    exposes `enableMic` / `disableMic` plus track load/play/pause/clear
    actions, and publishes the latest values through a ref.
  - `PatternPreview` on the detail page now shows a dedicated audio control
    panel for `Audio Reactive` patterns: microphone enable/disable, local
    track selection, and clear status copy. This is intentionally **detail
    page only**; homepage hero and gallery browsing stay silent.
- Capture pipeline, two entry points into the same idea:
  - App-side: `sharePreviewCapture.ts` (Design-Studio-for-FastLED), wired into
    both share paths (Sidebar per-pattern share, MenuBar whole-project
    share), captures a clip at share time.
  - Site-side: `generate-preview-clip.ts` + the "Generate preview" button on
    `/review`, for backfilling patterns shared before capture-at-share-time
    existed.
- Supabase: `preview_media_path`/`preview_media_type` columns on `patterns`,
  a `pattern-previews` storage bucket, and a moderator-gated
  `set_pattern_preview_media` RPC (migrations `202608030004`/`0005`) — needed
  because the normal "update your own pattern" policy only allows edits while
  a pattern is still pending/unpublished.

## Remaining work

`src/lib/evaluator/state/audioStore.ts` is still just the inert fallback store.
The live audio path works because the evaluator prefers an explicit
`AudioOverride` whenever supplied. Keep it that way unless there is a strong
reason to make the site host a global always-on audio store.

### 1. Automated Studio Score / rating, computed by the site — done 2026-08-04

Both pieces landed:

- `src/lib/evaluator/patternRating.ts` ports the pure scoring math from the
  app's `patternRating.ts` (`scorePattern`, criterion scorers, intent
  inference) plus a site-adapted `ratePattern()` driver — no zustand rating
  store, no localStorage cache, no trust-prompt dialog, no thumbnail
  packing, all dropped as app-only concerns. It relies on a new
  `src/lib/evaluator/state/patternDiagnostics.ts`, a **trimmed** stand-in
  for the app's `buildGraphDiagnostics`: a shared pattern is always a Group
  subgraph, so it can never trigger the app's pin/power/RAM/board/DMX/
  schedule/show-engine diagnostic categories — only connection wiring,
  scalar expressions, and a couple of pattern-specific node warnings are
  ported. This was the dependency-graph audit the previous write-up asked
  for; the full 1000-line `validateGraph.ts` was not a clean copy-over and
  porting all of it would have been dead code for pattern content.
- A moderator "Compute Studio Score" button
  (`src/app/review/compute-studio-score-button.tsx`) backfills
  `patterns.studio_score` for approved/published patterns missing one, via
  migration `202608030006`'s `set_pattern_studio_score` RPC — same shape as
  the existing preview-clip backfill, same safe-by-default (untrusted)
  evaluation.
- The score displays on the pattern detail page
  (`src/app/patterns/[id]/page.tsx`) when set. Not yet on the gallery card —
  `PatternCard` has no slot designed for it.
- Uploader's personal 1–5 star rating now travels through the share payload:
  app-side `communityUpload.ts`'s `CommunitySharePattern.personalRating`
  (read from `usePatternRatingStore` in `Sidebar.tsx`'s per-pattern share
  path only — whole-project shares from `MenuBar.tsx` have no single
  Pattern Library entry to have been rated, so they never set it), through
  `/upload/handoff/route.ts` and `upload-form.tsx`'s hidden `uploaderRating`
  field, into `patterns.uploader_rating` (migration `202608030007`) via
  `actions.ts`. Nothing reads this column yet — no UI seeds a "community"
  rating display from it. That's future work once the site has any rating
  UI at all, and there isn't one today.

### 2. Cut a packaged app release for the capture-at-share feature

`sharePreviewCapture.ts` and the rest of the share-time capture work are
pushed to the app repo's `main`, but not built into a downloadable release —
still sitting at v0.5.1. Anyone downloading the app today won't get
auto-capture on share until a new version is cut: version bump + CHANGELOG
entry + tag + wait for the packaging workflow + publish the draft release +
update this site's `src/lib/app-release.ts`. Same process used for the v0.5.1
cut earlier this session.

### 3. Architecture debt: the evaluator is a vendored copy, not a shared package

`src/lib/evaluator/` here is a **copy** of files from
`Design-Studio-for-FastLED/src/{state,audio,animartrix}/`, not a dependency.
Any node type, bugfix, or behavior change made in the app's real evaluator
will **not** automatically show up here — it needs a manual re-sync. This was
a deliberate call to unblock progress quickly; extracting a real shared
package both repos depend on was explicitly deferred as its own, bigger
project. Worth revisiting if drift becomes a real problem — e.g. a new node
type added in the app quietly not rendering on the site.

### 4. Not a bug: the `/review` backfill section is permanent

Once all pre-existing patterns have a backfilled clip, "Missing a looping
preview clip" on `/review` will empty out on its own. It's a standing
moderator tool, not a one-off migration script — leave it in place.

## Relevant files

**community-site**
- `src/lib/evaluator/` — the ported engine
- `src/lib/evaluator/evaluateSharedPattern.ts` — safe-default trust wrapper
- `src/lib/evaluator/patternRating.ts` — Studio Score engine (ported)
- `src/lib/evaluator/state/patternDiagnostics.ts` — trimmed, group-target-only
  `buildGraphDiagnostics` stand-in, feeding the score's "technical integrity"
  criterion
- `src/components/live-pattern-canvas.tsx` — live renderer
- `src/components/pattern-preview-media.tsx` — captured-clip renderer
- `src/lib/evaluator/audio/audioEngine.ts` — browser mic capture + analyzer
- `src/lib/evaluator/audio/fastledReactive.ts` — FastLED-style TS audio analysis
- `src/lib/use-live-audio.ts` — detail-page mic hook
- `src/lib/generate-preview-clip.ts` — site-side backfill capture
- `src/app/review/generate-preview-button.tsx` — moderator preview-clip backfill UI
- `src/app/review/compute-studio-score-button.tsx` — moderator Studio Score backfill UI
- `src/app/upload/handoff/route.ts`, `upload-form.tsx`, `actions.ts` — carry
  `personalRating`/`uploaderRating` from the app handoff into `patterns.uploader_rating`
- `supabase/migrations/202608030001` through `0007` — schema history

**Design-Studio-for-FastLED**
- `src/utils/sharePreviewCapture.ts` — app-side capture at share time
- `src/utils/communityUpload.ts` — two-step tab-open/post transport (the
  `window.open` popup-blocking constraint is documented in its comments),
  now also carries `personalRating` from `Sidebar.tsx`'s per-pattern share
- `src/state/patternRating.ts` — Pattern Insights / Studio Score. The pure
  scoring math is now ported to the site's `patternRating.ts`; this file
  remains the source of truth if the two ever need re-syncing (see item 3,
  architecture debt).
