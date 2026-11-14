# Home hero: workbench render

Source for `public/home/workbench-loop.{webm,mp4}` and `workbench-poster.jpg`.

The scene is an ESP32-S3-DevKitC-1 on a cutting mat, wired to a WS2812B strip,
with a 32×32 matrix out of focus behind it and a few tools on the bench. The
board is appended from the local Blender asset library
(`C:\Users\User\Desktop\Blender Assets`); everything else, including the
WS2812B strip, is modelled by `build_scene.py`. The strip (black PCB, 24 LEDs)
stands on its edge so it can snake across the mat behind the board with its
LEDs facing the camera. Only the data wire runs from the board to the strip;
the strip's 5V/GND and the board's GND trail off frame to an unseen supply.

## How the animation works

Cycles renders the scene **once**. Every LED that animates is its own emitter in
its own light group, so the render produces one linear light pass per LED
(42 strip pixels), 16 matrix regions for the light the matrix casts, one
camera-and-reflection pass for the matrix itself, plus ambient and the board's
onboard LEDs. Light adds linearly, so `composite.py` rebuilds any frame as

    frame = ambient + Σ colour(LED, t) × pass(LED)

then adds bloom and tone maps. The matrix's own pixels (and their mirror image
in the varnished bench) are recoloured from projected LED positions written by
`build_scene.py`. One 6–7 minute CPU render gives a noise-free, flicker-free
loop of any length; the patterns are periodic in the loop phase, so it is
seamless.

## Rebuild

Blender 5.2 and ffmpeg on PATH. From a scratch directory holding these files:

    blender -b --factory-startup --python build_scene.py -- <abs path>/out
    bash final.sh                 # render, 240-frame loop, encode
    bash final.sh --skip-render   # re-grade or change patterns only

Look and pattern knobs live at the top of `composite.py` (exposure and per-group
gains, overridable with `EV`, `GS`, `GML`, `GMD`, `AMB`, `GRGB`) and in
`strip_colors` / `matrix_colors`.
