"""The look of SEX ON LA SANTA: a renderer's clean frame made to feel shot on a puppet stage.

From the passes of a panel (color, depth, id) it adds, in order:
  contact shadow   the depth buffer, unsharp-masked: creases and corners darken, as fleece and stone do
  depth of field   a real lens focused on the puppet, the set falling soft behind it
  bloom            the bulbs, the neon and the bar's glow spill a little light
  grade            warm practicals, blue night in the shadows, a soft shoulder, a vignette
  grain            film grain, heavier in the darks

  python3 look.py <passes-dir> <tag> <out.png> [--at x,y | --focus metres] [--stop 1.0] [--seed n]
"""
import argparse
import json
import os

import cv2
import numpy as np

cv2.setNumThreads(1)


def load_pair(color_path, depth_path, far):
    color = cv2.cvtColor(cv2.imread(color_path, cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    d = cv2.cvtColor(cv2.imread(depth_path, cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB).astype(np.float64) / 255.0
    depth = (d[..., 0] + d[..., 1] / 255.0 + d[..., 2] / 65025.0) * far
    depth[(d > 0.999).all(axis=2)] = far
    return color, depth.astype(np.float32)


def load(dirp, tag):
    meta = json.load(open(os.path.join(dirp, f'{tag}-meta.json')))
    color, depth = load_pair(os.path.join(dirp, f'{tag}-color.png'), os.path.join(dirp, f'{tag}-depth.png'), meta.get('far', 60))
    return color, depth, meta


def to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(c):
    c = np.clip(c, 0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def contact(depth, strength=1.0):
    """Darken where the surface sits behind what is around it: corners, creases, under the chin."""
    ao = np.ones_like(depth)
    sc = depth.shape[0] / 1080
    for sigma, k in ((4, 0.9), (16, 0.6), (48, 0.35)):
        blur = cv2.GaussianBlur(depth, (0, 0), sigma * sc)
        diff = (blur - depth) / np.maximum(depth, 0.1)  # negative: the neighbours are nearer, a crevice
        ao *= 1.0 + np.clip(diff, -0.08, 0.0) * (k * strength / 0.08) * 0.5
    return np.clip(ao, 0.45, 1.0)


def dof(img, depth, focus, stop=1.0, max_r=16):
    """A lens: the blur grows with the distance from the plane of focus (in dioptres, as a lens does)."""
    h = img.shape[0]
    coc = np.abs(1.0 / np.maximum(depth, 0.05) - 1.0 / focus) * stop * h * 0.0105
    max_r = max_r * h / 1080
    coc = np.clip(coc, 0, max_r)
    coc = coc * 1080 / h  # in the radii's own units below, which are sized for 1080
    radii = [0, 1.5, 3, 5, 8, 12, 16]
    layers = [img]
    for r in radii[1:]:
        layers.append(cv2.GaussianBlur(img, (0, 0), r * 0.55 * h / 1080))
    # blur the CoC map itself a little, so the edges of what is sharp do not cut hard
    coc = cv2.GaussianBlur(coc, (0, 0), 2.0)
    out = np.zeros_like(img)
    idx = np.interp(coc, radii, np.arange(len(radii)))
    lo = np.floor(idx).astype(int)
    t = (idx - lo)[..., None]
    hi = np.minimum(lo + 1, len(radii) - 1)
    stack = np.stack(layers, 0)
    yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]]
    out = stack[lo, yy, xx] * (1 - t) + stack[hi, yy, xx] * t
    return out


def bloom(lin, thresh=0.7, amount=0.5, tint=(1.0, 0.82, 0.6)):
    lum = lin @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    bright = lin * np.clip((lum - thresh) / (1 - thresh + 1e-6), 0, 4)[..., None]
    acc = np.zeros_like(lin)
    sc = lin.shape[0] / 1080
    for s, w in ((6, 0.45), (18, 0.3), (50, 0.18), (120, 0.1)):
        acc += cv2.GaussianBlur(bright, (0, 0), s * sc) * w
    return lin + acc * amount * np.array(tint, np.float32)


def grade(lin, warm=1.0):
    h, w = lin.shape[:2]
    lum = (lin @ np.array([0.2126, 0.7152, 0.0722], np.float32))[..., None]
    # split tone: the night in the shadows, the bulbs in the highlights
    shadow = np.array([0.80, 0.92, 1.18], np.float32)
    light = np.array([1.06, 1.0, 0.9], np.float32) ** warm
    m = np.clip(lum / 0.35, 0, 1)
    lin = lin * (shadow * (1 - m) + light * m)
    # a lift in the blacks toward blue, a soft shoulder
    lin = lin * 0.97 + np.array([0.004, 0.007, 0.014], np.float32)
    lin = lin / (1 + lin * 0.18)
    # saturation, a touch
    lum = (lin @ np.array([0.2126, 0.7152, 0.0722], np.float32))[..., None]
    lin = lum + (lin - lum) * 1.14
    # vignette
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2))
    lin = lin * (1 - 0.28 * np.clip(r - 0.45, 0, 1) ** 1.6)[..., None]
    return lin


def grain(srgb, seed=0, amount=0.028):
    rng = np.random.default_rng(seed)
    h, w = srgb.shape[:2]
    n = rng.standard_normal((h, w)).astype(np.float32)
    n = cv2.GaussianBlur(n, (0, 0), 0.7) * 1.6
    lum = srgb.mean(axis=2, keepdims=True)
    k = amount * (1.3 - lum)
    return srgb + n[..., None] * k


def look(dirp, tag, out, at=None, focus=None, stop=1.0, seed=0, ao=1.0):
    color, depth, meta = load(dirp, tag)
    return finish(color, depth, out, at, focus, stop, seed, ao)


def finish(color, depth, out, at=None, focus=None, stop=1.0, seed=0, ao=1.0, quality=None):
    h, w = depth.shape
    if focus is None:
        x, y = at if at else (w // 2, h // 2)
        win = depth[max(0, y - 6):y + 7, max(0, x - 6):x + 7]
        focus = float(np.median(win))
    lin = to_linear(color)
    lin = lin * contact(depth, ao)[..., None]
    lin = dof(lin, depth, focus, stop)
    lin = bloom(lin)
    lin = grade(lin)
    srgb = to_srgb(lin)
    # a gentle S: the darks a little deeper, the mids with more bite
    srgb = np.clip(srgb, 0, 1)
    srgb = srgb * 0.7 + (srgb * srgb * (3 - 2 * srgb)) * 0.3
    # the lens is never quite as sharp as the renderer
    srgb = cv2.GaussianBlur(srgb, (0, 0), 0.6 * max(0.7, h / 1080))
    srgb = grain(srgb, seed)
    img = cv2.cvtColor((np.clip(srgb, 0, 1) * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR)
    if out.endswith('.jpg'):
        cv2.imwrite(out, img, [cv2.IMWRITE_JPEG_QUALITY, quality or 93])
    else:
        cv2.imwrite(out, img)
    return focus


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('dir')
    ap.add_argument('tag')
    ap.add_argument('out')
    ap.add_argument('--at')
    ap.add_argument('--focus', type=float)
    ap.add_argument('--stop', type=float, default=1.0)
    ap.add_argument('--ao', type=float, default=1.0)
    ap.add_argument('--seed', type=int, default=0)
    a = ap.parse_args()
    at = tuple(int(v) for v in a.at.split(',')) if a.at else None
    f = look(a.dir, a.tag, a.out, at, a.focus, a.stop, a.seed, a.ao)
    print(a.tag, 'focus', round(f, 2), 'm')
