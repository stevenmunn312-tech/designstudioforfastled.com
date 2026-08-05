# Rendering the "Live authoring" hero loop

The `Live authoring` section on the home page ("Move a slider, see it
immediately") is backed by a seamlessly looping clip of a Juggle patch whose
`count` slider is dragged 1 → 8 → 1. This is how it gets regenerated.

Run `npm run dev` and open <http://localhost:3000/dev/hero-loop>. The route
404s outside development.

## Why it is rendered rather than screen-recorded

A screen recording cannot produce a clean seam here, for three reasons that
all come out of `evalJuggle` in
[`graphEvaluator.ts`](../../src/lib/evaluator/state/graphEvaluator.ts):

1. **Two sinusoids have to realign, not one.** Dot 0 is driven by
   `sin(t * speed * 2.5)` for position and `sin(t * speed * 3)` for its ±25%
   brightness pulse. Those frequencies are in a 6:5 ratio, so the shortest
   seamless interval is *five* position periods, not one. Cutting at one
   position period leaves the pulse 0.2 of a cycle out and steps the dot's
   brightness 0.75 → 0.99 across the seam.
2. **The trail never reaches black.** The fade is
   `scaleRgb(px, retention)`, and `scaleRgb` rounds — `Math.round(1 * 0.55)`
   is `1`. Every LED a dot has touched keeps a permanent 1/255 ghost, and
   those ghosts are an additive floor under the next lap. The buffer takes
   ~11 laps to reach a genuine fixed point.
3. **Sub-frame drift.** The loop period is an irrational number of frames at
   any real capture rate, so a hand-trimmed recording is always off by a
   fraction of a frame.

Colour needs no handling: `evalJuggle` samples the palette at
`(travel * 0.35 + i / dots) % 1`, and `i / dots` is 0 for dot 0 whatever
`count` is, so the surviving ball's colour is a pure function of its position
and realigns for free.

## What the tool does

- [`juggle-loop.ts`](../../src/lib/hero-loop/juggle-loop.ts) — the schedule.
  Loop period, frame sampling, the `count` keyframes, and the Juggle graph.
  Everything is a pure function of loop phase, which is what makes the seam
  provable instead of eyeballed. **This is the file to edit when tuning.**
- [`draw-overlay.ts`](../../src/lib/hero-loop/draw-overlay.ts) — the node card,
  sliders, cable, and matrix frame, drawn into the same canvas as the LEDs.
  Compositing the slider into the frames (rather than animating DOM over a
  `<video>`) is what keeps the handle and the matrix in lockstep; a CSS
  animation and a looping `<video>` drift apart within a minute.
- [`render-juggle-loop.ts`](../../src/lib/hero-loop/render-juggle-loop.ts) —
  runs discarded warm-up laps until the trail buffer stops changing between
  laps, captures one lap as PNGs, then re-evaluates phase 0 of the following
  lap and compares it against the captured frame 0.

**Do not encode a clip whose seam check failed.** The usual failure mode is a
handful of LEDs differing by 1/255 — invisible while scrubbing, visible as a
tick once it loops.

## Encoding

**Render & save frames…** writes `frame-0000.png` … `frame-0239.png` through
the dev-only route at
[`/api/dev/hero-loop-frame`](../../src/app/api/dev/hero-loop-frame/route.ts),
which drops them in `%TEMP%/hero-loop-frames` (`$TMPDIR/hero-loop-frames` on
Unix) and clears the directory first. The page prints the exact path when the
run finishes. They are a ~50MB intermediate that only ffmpeg consumes, which
is why they land outside the repo. From that folder:

```bash
ffmpeg -framerate 60 -i frame-%04d.png -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 0 -crf 32 -row-mt 1 -an juggle-loop.webm
```

```bash
ffmpeg -framerate 60 -i frame-%04d.png -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart -an juggle-loop.mp4
```

The MP4 is the Safari fallback — VP9 in WebM is not reliable there. Both go in
`public/app/`.

Verify the encode preserved the seam before shipping. VP9 with a long GOP can
smear the last frames; if the wrap looks soft, add `-g 240` so the clip is
exactly one GOP:

```bash
ffmpeg -i juggle-loop.webm -vf "select='eq(n\,0)+eq(n\,239)'" -vsync 0 seam-%d.png
```

## Embedding

Already wired. The `canvas` entry in the `features` array in
[`page.tsx`](../../src/app/page.tsx) carries a `video` field, and the feature
loop renders [`MotionSafeVideo`](../../src/components/motion-safe-video.tsx)
instead of `<Image>` when one is present. Adding a clip to another section is
a matter of giving that entry a `video: { webm, mp4 }`.

`MotionSafeVideo` renders the poster image on the server and only upgrades to
`<video>` once the client confirms `prefers-reduced-motion` is not set. That
is deliberate: a CSS-only `display: none` still fetches and decodes the clip,
so a visitor who asked for less motion would pay for it anyway. It also means
the no-JS case gets the screenshot rather than nothing.

## Tuning

Edit `SLIDER_PATH` in `juggle-loop.ts` to change how the drag reads. The
handle is continuous and `countAt()` rounds it, which is how the real slider
behaves under a drag — the matrix snaps between lane layouts while the handle
glides.

Two constraints on any edit:

- First and last keyframes must sit at `COUNT_MIN`, with the trailing hold
  wide enough for dots 1–7's trails to clear (~15 frames at the current
  `FADE`). That hold is what makes the frame before the cut match the frame
  after it.
- Every `count` change re-lanes *all* dots (`laneY` divides the height by
  `dots`), so the whole set jumps rows on each step. Budget enough dwell time
  per step that this reads as the pattern reconfiguring rather than as noise.

`FADE` is deliberately higher than the node's 0.22 default: this render
samples ~23 frames per animated second where the app evaluates 60, and
retention is applied per evaluated frame. Changing `FRAME_COUNT` or
`SPEED_SLIDER` means re-tuning `FADE` to match the app's trail length.

Use **Verify seam only** while tuning — it skips PNG encoding, which is most
of the run time.
