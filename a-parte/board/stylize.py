"""
Turn the four render passes of a panel into a drawing: graphite contours that wobble like a hand,
hatching and rubbed charcoal where the light falls off, warm paper, and the protagonist painted
over it all as one flat red shape (as in the reference photograph).

    python3 stylize.py <passes-dir> <tag> <out.jpg> [--tint r,g,b] [--far 200]
"""
import os
import sys

import cv2
import numpy as np

PAPER = np.float32([0.93, 0.905, 0.86])
GRAPHITE = np.float32([0.15, 0.14, 0.14])
RED = np.float32([0.9, 0.11, 0.08])


def load(path, linear=False):
    im = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    im = cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    return im


def noise(h, w, scale, seed, octaves=3):
    r = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    amp = tot = 0.0
    a = 1.0
    for o in range(octaves):
        s = max(1, int(scale / 2 ** o))
        small = r.random((h // s + 3, w // s + 3)).astype(np.float32)
        out += cv2.resize(small, (w + 3 * s, h + 3 * s), interpolation=cv2.INTER_CUBIC)[s:s + h, s:s + w] * a
        tot += a
        a *= 0.5
    return out / tot


def wobble(img, amp, scale, seed):
    """Displace an image by a smooth noise field: lines drawn by a hand, not a ruler."""
    h, w = img.shape[:2]
    dx = (noise(h, w, scale, seed) - 0.5) * 2 * amp
    dy = (noise(h, w, scale, seed + 1) - 0.5) * 2 * amp
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    return cv2.remap(img, xx + dx, yy + dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)


def hatch_tex(h, w, angle, spacing, seed, length=(40, 160)):
    """A field of short parallel pencil strokes, slightly irregular, like hand hatching."""
    r = np.random.default_rng(seed)
    tex = np.zeros((h, w), np.float32)
    a = np.deg2rad(angle)
    dx, dy = np.cos(a), np.sin(a)
    n = int(h * w / (spacing * 60))
    for _ in range(n):
        x, y = r.uniform(-50, w + 50), r.uniform(-50, h + 50)
        L = r.uniform(*length)
        p0 = (x - dx * L / 2, y - dy * L / 2)
        p1 = (x + dx * L / 2, y + dy * L / 2)
        cv2.line(tex, (int(p0[0] * 4), int(p0[1] * 4)), (int(p1[0] * 4), int(p1[1] * 4)), float(r.uniform(0.4, 1.0)), 1, cv2.LINE_AA, shift=2)
    return np.clip(tex, 0, 1)


_HATCH = {}


def hatches(h, w):
    if (h, w) not in _HATCH:
        _HATCH[(h, w)] = (hatch_tex(h, w, -38, 5.0, 11), hatch_tex(h, w, 52, 5.5, 12), hatch_tex(h, w, -8, 6.0, 13))
    return _HATCH[(h, w)]


def stylize(passdir, tag, far=200.0, tint=(1, 1, 1), tint_amount=0.5, line_gain=1.0, red_rough=3.0, light_paper=True, seed=1):
    col = load(os.path.join(passdir, f'{tag}-color.png'))
    nrm = load(os.path.join(passdir, f'{tag}-normal.png')) * 2 - 1
    dep = load(os.path.join(passdir, f'{tag}-depth.png'))
    ids = load(os.path.join(passdir, f'{tag}-id.png'))
    h, w = col.shape[:2]
    d = dep[..., 0] + dep[..., 1] / 255.0 + dep[..., 2] / 65025.0
    z = np.maximum(d * far, 0.05)
    bg = d > 0.999

    # ── red: the protagonist and the rare red things ──
    red = ((ids[..., 0] > 0.6) & (ids[..., 1] < 0.2) & (ids[..., 2] < 0.2)).astype(np.float32)

    # ── contours: depth jumps, creases, object boundaries ──
    lz = np.log(z)
    ed = np.maximum(np.abs(lz - np.roll(lz, 1, 1)), np.abs(lz - np.roll(lz, 1, 0)))
    ed = np.clip((ed - 0.02) / 0.06, 0, 1)
    dn = np.minimum((nrm * np.roll(nrm, 1, 1)).sum(2), (nrm * np.roll(nrm, 1, 0)).sum(2))
    en = np.clip((0.86 - dn) / 0.3, 0, 1)
    di = np.maximum(np.abs(ids - np.roll(ids, 1, 1)).max(2), np.abs(ids - np.roll(ids, 1, 0)).max(2))
    ei = (di > 0.02).astype(np.float32)
    E = np.maximum(np.maximum(ed, en * 0.85), ei)
    E[bg & (np.roll(bg, 1, 1) & np.roll(bg, 1, 0))] = 0
    # closer things get a heavier line
    near = np.clip(1.6 - np.log(z) / 2.2, 0, 1)
    thick = cv2.dilate(E, np.ones((2, 2), np.uint8)) * near
    E = np.maximum(E, thick * 0.8)
    # two passes of a wobbly hand, graphite that breaks along the stroke
    L1 = wobble(E, 1.6, 90, seed)
    L2 = wobble(E, 1.8, 70, seed + 7)
    L2 = np.roll(np.roll(L2, 1, 0), 1, 1)
    L = np.maximum(L1, L2 * 0.55)
    breaks = np.clip((noise(h, w, 18, seed + 3) - 0.18) * 2.2, 0.25, 1)
    grain = 0.65 + 0.35 * np.random.default_rng(seed).random((h, w)).astype(np.float32)
    L = np.clip(L * breaks * grain * 0.95 * line_gain, 0, 1)

    # ── tone: rubbed charcoal and hatching where the light falls off ──
    Y = col @ np.float32([0.299, 0.587, 0.114])
    Ys = cv2.GaussianBlur(Y, (0, 0), 1.2)
    smudge = noise(h, w, 70, seed + 5)
    dark = np.clip((0.84 - Ys) / 0.8, 0, 1)
    wash = dark * (0.78 + 0.35 * (smudge - 0.5))
    h1, h2, h3 = hatches(h, w)
    hat = h1 * np.clip((0.5 - Ys) / 0.2, 0, 1) + h2 * np.clip((0.32 - Ys) / 0.15, 0, 1) + h3 * np.clip((0.18 - Ys) / 0.1, 0, 1)
    hat = wobble(hat, 1.0, 60, seed + 9) * 0.42
    # in the deepest dark the hatching drowns in rubbed charcoal; empty sky gets none
    hat *= np.clip((Ys - 0.05) / 0.14, 0, 1) * (~bg)
    deep = np.clip((0.16 - Ys) / 0.12, 0, 1)
    wash = np.maximum(wash, deep * (0.97 + 0.03 * (smudge - 0.5)))

    paper = PAPER[None, None, :] * (0.96 + 0.06 * noise(h, w, 3, 99, 1)[..., None])
    img = paper * (1 - wash[..., None] * 0.9)
    img = img * (1 - hat[..., None]) + GRAPHITE * hat[..., None] * 0.6
    if light_paper:
        # where light is strongest, the paper shows through clean
        lit = np.clip((Ys - 0.82) / 0.15, 0, 1)[..., None]
        img = img * (1 - lit * 0.6) + paper * 1.03 * lit * 0.6
    img = img * (1 - L[..., None]) + GRAPHITE * L[..., None]

    # ── the light of the age ──
    img *= 1 - tint_amount + tint_amount * np.float32(tint)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rr = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    img *= (1 - 0.32 * np.clip((rr - 0.55) / 0.85, 0, 1) ** 1.5)[..., None]
    img += np.random.default_rng(seed + 2).normal(0, 0.018, (h, w, 1)).astype(np.float32)

    # ── paint the red over everything: flat, a slightly blobby edge, no line, no shade ──
    if red.any():
        m = cv2.GaussianBlur(red, (0, 0), red_rough)
        m = ((m + (noise(h, w, 10, seed + 11, 2) - 0.5) * 0.45) > 0.5).astype(np.float32)
        m = cv2.GaussianBlur(m, (0, 0), 0.7)[..., None]
        paint = RED * (0.97 + 0.05 * noise(h, w, 5, seed + 12, 2)[..., None])
        img = img * (1 - m) + paint * m
    return np.clip(img, 0, 1)


def save(img, path):
    cv2.imwrite(path, cv2.cvtColor((img * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 93])


if __name__ == '__main__':
    passdir, tag, out = sys.argv[1:4]
    kw = {}
    if '--tint' in sys.argv:
        kw['tint'] = tuple(float(v) for v in sys.argv[sys.argv.index('--tint') + 1].split(','))
    if '--far' in sys.argv:
        kw['far'] = float(sys.argv[sys.argv.index('--far') + 1])
    save(stylize(passdir, tag, **kw), out)
