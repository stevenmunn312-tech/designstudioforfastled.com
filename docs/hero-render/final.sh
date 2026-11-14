#!/usr/bin/env bash
# Full render -> 8 s seamless loop -> webm/mp4/poster
set -e
cd "$(dirname "$0")"
D="$(pwd -W)"
B="/c/Program Files/Blender Foundation/Blender 5.2/blender.exe"
if [ "$1" != "--skip-render" ]; then
  rm -rf passes_v3
  "$B" -b out/workbench.blend --python render_passes.py -- "$D/passes_v3" 100 160 > render_full.log 2>&1
  grep "RENDER OK" render_full.log
fi
rm -rf frames && mkdir frames
"$B" -b --factory-startup --python composite.py -- "$D/passes_v3" "$D/out/leds.json" "$D/frames" 240 > composite.log 2>&1
grep "COMPOSITE OK" composite.log
mkdir -p enc
ffmpeg -y -loglevel error -framerate 30 -i frames/f_%04d.png -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -deadline good -cpu-used 2 -pix_fmt yuv420p -an enc/workbench-loop.webm
ffmpeg -y -loglevel error -framerate 30 -i frames/f_%04d.png -c:v libx264 -crf 25 -preset slow -pix_fmt yuv420p -movflags +faststart -an enc/workbench-loop.mp4
ffmpeg -y -loglevel error -i frames/f_0001.png -q:v 4 enc/workbench-poster.jpg
ls -la enc
