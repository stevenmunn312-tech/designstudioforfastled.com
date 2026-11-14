"""Relight the rendered light-group passes with animated LED patterns.

Run: blender -b --factory-startup --python composite.py -- <pass_dir> <leds.json> <out> <frames> [still_phase]
  frames == 1 -> writes a single PNG to <out> at phase still_phase (0..1)
  frames  > 1 -> writes a PNG sequence <out>/f_%04d.png covering one seamless loop
"""
import bpy, sys, os, json, math, subprocess, colorsys, time
import numpy as np

args = sys.argv[sys.argv.index("--") + 1:]
pass_dir, leds_path, out, frames = args[0], args[1], args[2], int(args[3])
still_phase = float(args[4]) if len(args) > 4 else 0.3
FFMPEG = r"C:\Users\User\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe"

# ---- look ----------------------------------------------------------------
EXPOSURE = 2.0 ** float(os.environ.get("EV", "4"))
G_AMBIENT = float(os.environ.get("AMB", "1.5"))
G_ESP = 0.6
G_RGB = float(os.environ.get("GRGB", "4"))
G_STRIP = float(os.environ.get("GS", "8"))         # per-LED, applied to direct view + light
G_MATRIX_LIGHT = float(os.environ.get("GML", "4"))
G_MATRIX_DIRECT = float(os.environ.get("GMD", "0.05"))
BLOOM_CAP = float(os.environ.get("BCAP", "6"))
WHITE_BLEED = float(os.environ.get("WB", "0.45"))
BLOOM = [(4, 0.10), (14, 0.07), (48, 0.06)]   # (radius px @1920, weight)
STRIP_FLOOR = 0.10      # minimum brightness so the strip never fully drops out

info = json.load(open(leds_path))
FULL_W = info["res"][0]


def load(name):
    img = bpy.data.images.load(os.path.join(pass_dir, name + ".exr"))
    w, h = img.size
    a = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    return a.reshape(h, w, 4)[::-1, :, :3].copy()


groups = info["groups"]
P = {g: load(g) for g in groups}
H, W = P["ambient"].shape[:2]
S = W / FULL_W
print("loaded", len(P), "passes", W, H)


def box_blur(img, r, axis):
    if r < 1:
        return img
    r = int(r)
    pad = [(0, 0)] * img.ndim
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(img, pad, mode="edge"), axis=axis, dtype=np.float32)
    sl_hi = [slice(None)] * img.ndim
    sl_lo = [slice(None)] * img.ndim
    n = img.shape[axis]
    sl_hi[axis] = slice(2 * r + 1, 2 * r + 1 + n)
    sl_lo[axis] = slice(0, n)
    out = c[tuple(sl_hi)] - c[tuple(sl_lo)]
    return out / (2 * r + 1)


def gauss(img, sigma):
    """~Gaussian via three box passes, with downsampling for large sigmas."""
    if sigma < 0.5:
        return img
    f = 1
    while sigma / f > 12 and min(img.shape[:2]) // (f * 2) > 16:
        f *= 2
    small = img
    if f > 1:
        hh, ww = (img.shape[0] // f) * f, (img.shape[1] // f) * f
        small = img[:hh, :ww].reshape(hh // f, f, ww // f, f, -1).mean(axis=(1, 3))
    s = sigma / f
    r = max(1, int(round(math.sqrt(12 * s * s / 3 + 1) / 2 - 0.5)))
    for _ in range(3):
        small = box_blur(small, r, 0)
        small = box_blur(small, r, 1)
    if f > 1:
        small = np.repeat(np.repeat(small, f, axis=0), f, axis=1)
        out = np.zeros_like(img)
        out[:small.shape[0], :small.shape[1]] = small
        if small.shape[0] < img.shape[0]:
            out[small.shape[0]:] = out[small.shape[0] - 1]
        if small.shape[1] < img.shape[1]:
            out[:, small.shape[1]:] = out[:, small.shape[1] - 1:small.shape[1]]
        # soften the block upsample
        out = box_blur(box_blur(out, f // 2, 0), f // 2, 1)
        return out
    return small


def srgb_to_linear(c):
    c = np.asarray(c, np.float32)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def hsv(h, s, v):
    h = np.asarray(h) % 1.0
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    v = np.broadcast_to(v, h.shape)
    p, q, t = (np.broadcast_to(x, h.shape) for x in (p, q, t))
    r = np.choose(i, [v, q, p, p, t, v])
    g = np.choose(i, [t, v, v, q, p, p])
    b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], -1)


TAU = 2 * math.pi


def strip_colors(ph):
    n = len(info["strip"])
    i = np.arange(n)
    # rainbow drifting away from the board, two hue cycles per loop
    hue = i / n * 0.9 - 2 * ph
    # a bright pulse running down the strip, three passes per loop
    pulse = np.cos(TAU * (i / n - 3 * ph)) * 0.5 + 0.5
    v = STRIP_FLOOR + (1 - STRIP_FLOOR) * (0.35 + 0.65 * pulse ** 3)
    return srgb_to_linear(hsv(hue, np.full(n, 0.92), v))


def matrix_colors(ph):
    y, x = np.mgrid[0:32, 0:32].astype(np.float32)
    cx, cy = 15.5 + 6 * math.cos(TAU * ph), 15.5 + 6 * math.sin(TAU * ph)
    d = np.hypot(x - cx, y - cy)
    v = (np.sin(x * 0.21 + TAU * ph) + np.sin(y * 0.27 - TAU * 2 * ph)
         + np.sin((x + y) * 0.16 + TAU * ph) + np.sin(d * 0.42 - TAU * 3 * ph))
    hue = v / 8 + ph
    val = 0.55 + 0.45 * (np.sin(d * 0.42 - TAU * 3 * ph) * 0.5 + 0.5)
    return srgb_to_linear(hsv(hue, np.full_like(v, 0.95), val))  # (32,32,3)


# ---- matrix direct-view recolour field ------------------------------------
# LED screen positions: direct view plus the mirror image in the bench top
mpts = np.concatenate([np.array(info["matrix"], np.float32).reshape(-1, 3),
                       np.array(info["matrix_mirror"], np.float32).reshape(-1, 3)])
inside = (mpts[:, 0] * S >= 0) & (mpts[:, 0] * S < W) & (mpts[:, 1] * S >= 0) & (mpts[:, 1] * S < H)
mx = np.round(mpts[inside, 0] * S).astype(int)
my = np.round(mpts[inside, 1] * S).astype(int)
sigma_m = info["matrix_coc_px"] * S / 3.2
sigma_wide = 90 * S


def splat(values, sigma):
    v = np.concatenate([values.reshape(-1, values.shape[-1])] * 2)[inside]
    img = np.zeros((H, W, v.shape[-1]), np.float32)
    np.add.at(img, (my, mx), v)
    return gauss(img, sigma)


ones = np.ones((32, 32, 1), np.float32)
w_sharp = splat(ones, sigma_m)
w_wide = splat(ones, sigma_wide)
K_WIDE = 0.02 * w_sharp.max() / w_wide.max()
w_norm = w_sharp + K_WIDE * w_wide + 1e-6


def frame(ph):
    img = P["ambient"] * G_AMBIENT + P["esp"] * G_ESP
    sc = strip_colors(ph)
    if "rgb" in P:  # onboard WS2812 mirrors the strip's first pixel
        img = img + P["rgb"] * (sc[0] * G_RGB)
    for i, c in enumerate(sc):
        img = img + P[f"s{i:02d}"] * (c * G_STRIP)
    mc = matrix_colors(ph)
    for ry in range(4):
        for rx in range(4):
            c = mc[ry * 8:ry * 8 + 8, rx * 8:rx * 8 + 8].reshape(-1, 3).mean(0)
            img = img + P[f"m{ry}{rx}"] * (c * G_MATRIX_LIGHT)
    # sharp per-LED colour where the matrix (or its reflection) is, a broad
    # blur of the pattern elsewhere (rough reflections on the mat, the board)
    field = (splat(mc, sigma_m) + K_WIDE * splat(mc, sigma_wide)) / w_norm
    img = img + P["mdirect"] * field * G_MATRIX_DIRECT
    img *= EXPOSURE
    # bloom from bright light only, capped so blown LED cores glow rather than flood
    m = img.max(-1, keepdims=True)
    capped = img * np.minimum(1.0, BLOOM_CAP / np.maximum(m, 1e-6))
    bright = np.maximum(capped - 0.8, 0)
    for r, wgt in BLOOM:
        img = img + gauss(bright, r * S) * wgt
    return img


def tonemap(img):
    # hue-preserving shoulder on the max channel; very hot pixels (LED cores)
    # drift toward white the way a sensor clips
    m = np.maximum(img.max(-1, keepdims=True), 1e-6)
    lw = 8.0
    mt = m * (1 + m / (lw * lw)) / (1 + m)
    mt = np.minimum(mt, 1.0)
    chroma = img / m
    heat = np.clip(np.log10(np.maximum(m, 1.0)) / 2.5, 0, WHITE_BLEED)
    out = (chroma * (1 - heat) + heat) * mt
    out = np.clip(out, 0, 1)
    # gentle vignette
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    vig = 1 - 0.35 * (((xx / W - 0.55) / 0.75) ** 2 + ((yy / H - 0.5) / 0.85) ** 2)
    out *= np.clip(vig, 0, 1)[..., None]
    out = np.where(out <= 0.0031308, out * 12.92, 1.055 * np.power(out, 1 / 2.4) - 0.055)
    return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)


def ffmpeg_out(path, n):
    cmd = [FFMPEG, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", "30", "-i", "-"]
    cmd += ([path] if n == 1 else [os.path.join(path, "f_%04d.png")])
    return subprocess.Popen(cmd, stdin=subprocess.PIPE)


if frames == 1:
    p = ffmpeg_out(out, 1)
    p.stdin.write(tonemap(frame(still_phase)).tobytes())
    p.stdin.close(); p.wait()
else:
    os.makedirs(out, exist_ok=True)
    p = ffmpeg_out(out, frames)
    t0 = time.time()
    for k in range(frames):
        p.stdin.write(tonemap(frame(k / frames)).tobytes())
        if k % 20 == 0:
            print(f"frame {k}/{frames} {time.time() - t0:.0f}s", flush=True)
    p.stdin.close(); p.wait()
print("COMPOSITE OK")
