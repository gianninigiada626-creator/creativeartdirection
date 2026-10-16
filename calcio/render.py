"""
OGNI STRADA — a football tribute sketch, 9:16, from five still photographs.

Every frame is a pure function of time: cameras push, drift and shake through the photos,
the ball is cut out and travels from one picture to the next, cuts land on a 110 bpm grid,
and the soundtrack (kick, crowd, whooshes, the ball itself) is synthesised on the same clock.

    python3 prep.py      # masks, clean plates and ball sprites → build/
    python3 render.py    # → out/ogni-strada.mp4      (--preview for a quick half-size pass)
"""
import math
import os
import subprocess
import sys
import wave

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, 'build')
OUT = os.path.join(HERE, 'out')
PREVIEW = '--preview' in sys.argv
W, H = (540, 960) if PREVIEW else (1080, 1920)
FPS = 24
SR = 48000
BPM = 110
BEAT = 60 / BPM
S0 = H / 2000  # source photos are 1500 × 2000: fit their height


def at(beats):
    return beats * BEAT


# ── the edit, on the beat grid ──
CUTS = {
    'rito': (at(0), at(4)),
    'strada': (at(4), at(10)),
    'cortile': (at(10), at(15)),
    'corsa': (at(15), at(19)),
    'stadio': (at(19), at(27)),
    'montaggio': (at(27), at(31)),
    'nero': (at(31), at(32)),
    'fine': (at(32), at(39)),
}
DURATION = at(39)


# ── easing ──
def clamp01(x):
    return max(0.0, min(1.0, x))


def span(t, a, b):
    return clamp01((t - a) / (b - a))


def smooth(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def ease_out(x):
    return 1 - (1 - clamp01(x)) ** 3


def ease_in(x):
    return clamp01(x) ** 3


def lerp(a, b, u):
    return a + (b - a) * u


def noise1(t, seed=0):
    """Smooth 1D value noise in [-1, 1] — for hand-held drift and crowd swells."""
    i = math.floor(t)
    f = t - i
    h = lambda n: (math.sin((n + seed * 57.0) * 12.9898) * 43758.5453) % 1.0 * 2 - 1
    return lerp(h(i), h(i + 1), f * f * (3 - 2 * f))


# ── sources ──
def load_rgb(path):
    return cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0


def load_rgba(path):
    im = cv2.imread(path, cv2.IMREAD_UNCHANGED).astype(np.float32) / 255.0
    return np.dstack([cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2RGB), im[..., 3:]])


SRC = {}
BALL = {}
BALL_AT = {'strada': (632, 1340), 'cortile': (322, 1035), 'corsa': (845, 372)}


def load():
    for n in ['strada', 'stadio', 'cortile', 'barbiere', 'corsa']:
        SRC[n] = load_rgb(os.path.join(B, f'{n}-src.jpg'))
        p = os.path.join(B, f'{n}-plate.jpg')
        if os.path.exists(p):
            SRC[n + ':plate'] = load_rgb(p)
            m = cv2.imread(os.path.join(B, f'{n}-mask.png'), cv2.IMREAD_GRAYSCALE).astype(np.float32) / 255.0
            SRC[n + ':fg'] = np.dstack([SRC[n], m])
        b = os.path.join(B, f'{n}-ball.png')
        if os.path.exists(b):
            BALL[n] = load_rgba(b)


# ── camera ──
class Cam:
    """Source-pixel centre, zoom (1 = photo height fills the frame), roll in degrees, screen offset."""

    def __init__(self, cx, cy, zoom=1.0, roll=0.0, ox=0.0, oy=0.0):
        self.cx, self.cy, self.zoom, self.roll, self.ox, self.oy = cx, cy, zoom, roll, ox, oy

    def clamped(self):
        # never look past the edge of the photo: keep the (rolled) frame inside 1500 × 2000
        s = S0 * self.zoom
        a = abs(math.radians(self.roll))
        hw, hh = W / 2 / s, H / 2 / s
        ew = hw * math.cos(a) + hh * math.sin(a)
        eh = hw * math.sin(a) + hh * math.cos(a)
        cx = min(max(self.cx, ew), 1500 - ew) if ew < 750 else 750
        cy = min(max(self.cy, eh), 2000 - eh) if eh < 1000 else 1000
        return cx, cy

    def matrix(self, depth=1.0):
        # depth < 1: farther layers move and grow less (parallax)
        z = 1 + (self.zoom - 1) * depth
        s = S0 * z
        cx, cy = self.clamped()
        a = math.radians(self.roll)
        ca, sa = math.cos(a) * s, math.sin(a) * s
        tx = W / 2 + self.ox * S0 * depth - (ca * cx - sa * cy)
        ty = H / 2 + self.oy * S0 * depth - (sa * cx + ca * cy)
        return np.float32([[ca, -sa, tx], [sa, ca, ty]])

    def project(self, x, y):
        M = self.matrix()
        return M[0, 0] * x + M[0, 1] * y + M[0, 2], M[1, 0] * x + M[1, 1] * y + M[1, 2]


def warp(img, M, border=cv2.BORDER_REFLECT_101):
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=border)


def over(dst, rgba):
    a = rgba[..., 3:4]
    return dst * (1 - a) + rgba[..., :3] * a


def photo(name, cam, parallax=False):
    if parallax and name + ':plate' in SRC:
        bg = warp(SRC[name + ':plate'], cam.matrix(0.55))
        fg = warp(SRC[name + ':fg'], cam.matrix(1.0), cv2.BORDER_CONSTANT)
        return over(bg, fg)
    return warp(SRC[name], cam.matrix())


def ball(frame, name, cam, x, y, scale=1.0, spin=0.0):
    """Draw a ball sprite at source position (x, y), scaled and spun, through the camera."""
    spr = BALL[name]
    h, w = spr.shape[:2]
    px, py = cam.project(x, y)
    s = S0 * cam.zoom * scale
    a = math.radians(cam.roll + spin)
    ca, sa = math.cos(a) * s, math.sin(a) * s
    M = np.float32([[ca, -sa, px - (ca * w / 2 - sa * h / 2)], [sa, ca, py - (sa * w / 2 + ca * h / 2)]])
    return over(frame, warp(spr, M, cv2.BORDER_CONSTANT))


def shake(t, amount, seed=1, rate=9.0):
    return noise1(t * rate, seed) * amount, noise1(t * rate, seed + 5) * amount


# ── the look ──
_yy, _xx = np.mgrid[0:H, 0:W].astype(np.float32)
_d = np.sqrt(((_xx - W / 2) / (W / 2)) ** 2 * 0.6 + ((_yy - H / 2) / (H / 2)) ** 2)
VIGNETTE = (1 - 0.55 * np.clip((_d - 0.45) / 0.85, 0, 1) ** 1.6)[..., None].astype(np.float32)


# ── shots: each returns an RGB frame for local time u, plus effects ──
def shot_rito(u):
    d = CUTS['rito'][1]
    k = smooth(u / d)
    cam = Cam(880 + noise1(u * 0.6, 3) * 6, 1180, lerp(1.04, 1.13, k), lerp(-0.6, 0.4, k))
    f = photo('barbiere', cam)
    # the clippers buzz: the barber's hand trembles against the head
    jx, jy = shake(u, 2.2 * S0 * 2, 11, 60)
    m = cv2.getRotationMatrix2D((0, 0), 0, 1)
    region = np.zeros((H, W), np.float32)
    x0, y0 = cam.project(330, 1060)
    x1, y1 = cam.project(620, 1420)
    cv2.ellipse(region, (int((x0 + x1) / 2), int((y0 + y1) / 2)), (int(abs(x1 - x0) / 2), int(abs(y1 - y0) / 2)), 0, 0, 360, 1.0, -1)
    region = cv2.GaussianBlur(region, (0, 0), 12 * W / 1080)
    m[:, 2] = (jx, jy)
    moved = cv2.warpAffine(f, m, (W, H), borderMode=cv2.BORDER_REFLECT_101)
    f = f * (1 - region[..., None]) + moved * region[..., None]
    return f, {'fade_in': 1 - span(u, 0, 0.5)}


def shot_strada(u):
    d = CUTS['strada'][1] - CUTS['strada'][0]
    throw = d - 0.85
    push = ease_in(span(u, throw, d))
    cam = Cam(820, 1260 + push * 60, lerp(1.08, 1.2, smooth(u / throw)) + push * 0.55, lerp(0.8, -0.6, smooth(u / d)))
    hx, hy = shake(u, 4, 2, 1.3)
    cam.ox, cam.oy = hx, hy
    f = photo('strada', cam, parallax=True)
    bx, by = BALL_AT['strada']
    spin = u * 420
    # a little toss, then thrown at the lens
    toss = math.sin(math.pi * span(u, 1.3, 2.05)) * 110
    if u < throw:
        f = ball(f, 'strada', cam, bx, by - toss, 1.0, spin)
    else:
        k = span(u, throw, d)
        grow = math.exp(k * 3.2)
        f = ball(f, 'strada', cam, lerp(bx, cam.cx, ease_in(k)), lerp(by, cam.cy, ease_in(k)), grow, spin + k * 300)
    return f, {'blur': 4 if u > throw else 1, 'ca': push * 6}


def shot_cortile(u):
    d = CUTS['cortile'][1] - CUTS['cortile'][0]
    hit = 0.45
    imp = span(u, hit, hit + 0.6)
    sx, sy = shake(u, 26 * (1 - imp) * (u > hit), 4, 14)
    cam = Cam(760 + sx, 1000 + sy, lerp(1.06, 1.14, smooth(u / d)), lerp(0, 1.5, smooth(u / d)))
    f = photo('cortile', cam)
    # the washing line sways in the draught
    _, line_y = cam.project(750, 640)
    band_mask = np.clip((line_y - _yy) / (90 * W / 1080), 0, 1)
    dx = band_mask * (3.5 * W / 1080) * np.sin(u * 2.6 + _xx * (0.012 * 1080 / W))
    f = cv2.remap(f, _xx + dx, _yy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
    bx, by = BALL_AT['cortile']
    if u < hit:
        k = ease_out(u / hit)
        f = ball(f, 'cortile', cam, lerp(cam.cx, bx, k), lerp(cam.cy, by, k), lerp(9.0, 1.0, k), u * 500)
    else:
        k = span(u, hit, hit + 1.25)
        x = lerp(bx, 1250, ease_out(k))
        y = lerp(by, 240, ease_out(k)) - math.sin(math.pi * k) * 160
        if k < 1:
            f = ball(f, 'cortile', cam, x, y, lerp(1.0, 0.22, ease_out(k)), 200 + u * 900)
    return f, {'flash': 0.7 * (1 - span(u, hit, hit + 0.12)) * (u >= hit), 'ca': 8 * (1 - span(u, hit, hit + 0.3)) * (u >= hit), 'blur': 3 if u < hit + 0.5 else 1}


def shot_corsa(u):
    d = CUTS['corsa'][1] - CUTS['corsa'][0]
    third = d / 3
    if u < third:  # the boots, tracked fast
        k = u / third
        cam = Cam(lerp(1150, 700, k), 1330, 1.75, -3)
        return photo('corsa', cam), {'blur': 5}
    if u < 2 * third:  # the ball arrives in his hands
        k = (u - third) / third
        cam = Cam(830, 430, 1.85, 2)
        f = photo('corsa', cam)
        land = ease_out(span(k, 0, 0.42))
        bx, by = BALL_AT['corsa']
        if land < 1:
            f = ball(f, 'corsa', cam, lerp(200, bx, land), lerp(-150, by, land), lerp(2.2, 1.0, land), k * 500)
        return f, {'blur': 4 if land < 1 else 2, 'flash': 0.35 * (1 - span(k, 0.42, 0.55)) * (k > 0.42)}
    k = (u - 2 * third) / third
    whip = ease_in(span(k, 0.55, 1.0))
    cam = Cam(lerp(780, 400, k) - whip * 700, 1000, 1.08, lerp(1, -4, k))
    return photo('corsa', cam), {'blur': 3 + int(whip * 8)}


def shot_stadio(u):
    d = CUTS['stadio'][1] - CUTS['stadio'][0]
    k = smooth(u / d)
    whip = 1 - ease_out(span(u, 0, 0.35))
    hx, hy = shake(u, 5, 7, 0.9)
    cam = Cam(760 + whip * 600 + hx, lerp(1000, 760, k) + hy, lerp(1.05, 1.22, k), lerp(-1.0, 0.8, k))
    f = photo('stadio', cam)
    # stadium lights breathe, dust drifts through them
    lum = f.mean(axis=2, keepdims=True)
    flick = 0.5 + 0.5 * math.sin(u * 7.0) * math.sin(u * 2.3 + 1)
    glow = np.clip(lum - 0.32, 0, 1) * (0.9 + 0.8 * flick)
    f = f + cv2.GaussianBlur(glow, (0, 0), 6 * W / 1080)[..., None] * np.float32([0.55, 0.85, 0.75])
    f = dust(f, u, cam)
    return f, {'blur': 1 + int(whip * 8)}


def dust(f, u, cam, n=70):
    r = np.random.default_rng(5)
    xs, ys = r.uniform(0, 1500, n), r.uniform(0, 2000, n)
    sp, sz = r.uniform(20, 70, n), r.uniform(1.5, 4.5, n)
    layer = np.zeros((H, W), np.float32)
    for i in range(n):
        x = xs[i] + math.sin(u * 0.7 + i) * 30
        y = (ys[i] - u * sp[i]) % 2000
        px, py = cam.project(x, y)
        if 0 <= px < W and 0 <= py < H:
            cv2.circle(layer, (int(px), int(py)), max(1, int(sz[i] * W / 1080)), 1.0, -1, cv2.LINE_AA)
    layer = cv2.GaussianBlur(layer, (0, 0), 1.5)
    return f + layer[..., None] * np.float32([0.5, 0.55, 0.5])


MONTAGE = [
    ('barbiere', 900, 1150, 2.4, None),
    ('strada', 632, 1340, 2.2, 'strada'),
    ('stadio', 760, 900, 1.8, None),
    ('corsa', 1200, 1250, 2.0, None),
    ('cortile', 900, 450, 1.8, None),
    ('strada', 910, 1130, 2.5, None),
    ('stadio', 1350, 1300, 2.0, None),
    ('cortile', 322, 1035, 2.4, 'cortile'),
]


def shot_montaggio(u):
    step = (CUTS['montaggio'][1] - CUTS['montaggio'][0]) / len(MONTAGE)
    i = min(len(MONTAGE) - 1, int(u / step))
    k = (u - i * step) / step
    name, x, y, z, b = MONTAGE[i]
    cam = Cam(x, y, z * (1 + 0.1 * k), (2.5 if i % 2 else -2.5) * (1 - k))
    f = photo(name, cam)
    if b:
        f = ball(f, b, cam, *BALL_AT[b], 1.0, u * 700)
    return f, {'flash': 0.55 * (1 - span(k, 0, 0.3)), 'ca': 5 * (1 - k)}


def shot_nero(u):
    return np.zeros((H, W, 3), np.float32), {}


def shot_fine(u):
    d = CUTS['fine'][1] - CUTS['fine'][0]
    cam = Cam(760, 900, 1.3 + 0.05 * u / d)
    f = photo('stadio', cam) * 0.16
    f = cv2.GaussianBlur(f, (0, 0), 14 * W / 1080)
    return f, {'fade_out': span(u, d - 0.8, d)}


SHOTS = {k: globals()[f'shot_{k}'] for k in CUTS}

# ── titles ──
FONT_BIG = os.path.join(HERE, 'fonts', 'anton.woff')
FONT_SMALL = os.path.join(HERE, 'fonts', 'oswald-500.woff')
TITLES = [
    # (start, end, text, size, y as a fraction of the height)
    (CUTS['rito'][0] + 0.75, CUTS['rito'][1], 'OGNI RITO.', 150, 0.80),
    (CUTS['strada'][0] + 0.5, CUTS['strada'][1] - 1.0, 'OGNI STRADA.', 150, 0.80),
    (CUTS['cortile'][0] + 0.9, CUTS['cortile'][1], 'OGNI CORTILE.', 150, 0.80),
    (CUTS['stadio'][0] + 1.2, CUTS['stadio'][1] - 0.2, 'OGNI DOMENICA.', 150, 0.80),
    (CUTS['fine'][0] + 0.15, DURATION, 'IL CALCIO', 230, 0.44),
    (CUTS['fine'][0] + 0.85, DURATION, 'È DI CHI LO VIVE.', 112, 0.535),
]
_TEXT = {}


def text_layer(text, size):
    key = (text, size)
    if key not in _TEXT:
        s = size * W / 1080
        font = ImageFont.truetype(FONT_BIG, int(s))
        x0, y0, x1, y1 = font.getbbox(text)
        img = Image.new('RGBA', (x1 - x0 + 40, y1 - y0 + 40), (0, 0, 0, 0))
        ImageDraw.Draw(img).text((20 - x0, 20 - y0), text, font=font, fill=(244, 240, 230, 255))
        _TEXT[key] = np.asarray(img).astype(np.float32) / 255.0
    return _TEXT[key]


def titles(f, t):
    for (a, b, text, size, yf) in TITLES:
        if not (a <= t < b):
            continue
        u = t - a
        # slam in: a little big, settles in 0.18 s
        k = ease_out(span(u, 0, 0.18))
        sc = lerp(1.18, 1.0, k)
        alpha = k * (1 - span(t, b - 0.12, b))
        tl = text_layer(text, size)
        h, w = tl.shape[:2]
        M = np.float32([[sc, 0, W / 2 - sc * w / 2], [0, sc, H * yf - sc * h / 2]])
        lay = cv2.warpAffine(tl, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
        lay[..., 3] *= alpha
        f = over(f, lay)
    return f


def grade(f, fx, frame):
    f = np.clip(f, 0, 1.5)
    lum = (f * np.float32([0.299, 0.587, 0.114])).sum(axis=2, keepdims=True)
    # halation: the highlights bleed warm
    hi = cv2.resize(np.clip(lum - 0.55, 0, 1), (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    hi = cv2.resize(cv2.GaussianBlur(hi, (0, 0), 6), (W, H), interpolation=cv2.INTER_LINEAR)[..., None]
    f = f + hi * np.float32([0.5, 0.28, 0.14])
    # filmic contrast, teal shadows, warm highlights, a touch less saturation
    f = 0.5 + (f - 0.5) * 1.1
    lum = np.clip((f * np.float32([0.299, 0.587, 0.114])).sum(axis=2, keepdims=True), 0, 1)
    tone = lum * lum * (3 - 2 * lum)
    f = f * ((1 - tone) * np.float32([0.9, 1.0, 1.04]) + tone * np.float32([1.06, 1.0, 0.9]))
    f = lum + (f - lum) * 0.9
    if fx.get('ca'):
        k = int(round(fx['ca'] * W / 1080))
        if k:
            f[..., 0] = np.roll(f[..., 0], k, axis=1)
            f[..., 2] = np.roll(f[..., 2], -k, axis=1)
    f = f * VIGNETTE
    # grain, a little coarser than a pixel
    g = np.random.default_rng(frame).standard_normal((H // 2, W // 2)).astype(np.float32)
    g = cv2.resize(g, (W, H), interpolation=cv2.INTER_LINEAR)[..., None]
    f = f + g * 0.035
    if fx.get('flash'):
        f = f + (1 - f) * fx['flash']
    fade = max(fx.get('fade_in', 0), fx.get('fade_out', 0))
    if fade:
        f = f * (1 - fade)
    return np.clip(f, 0, 1)


def shot_at(t):
    for name, (a, b) in CUTS.items():
        if a <= t < b:
            return name, t - a
    return 'fine', t - CUTS['fine'][0]


def frame_at(i):
    t = i / FPS
    name, u = shot_at(t)
    f, fx = SHOTS[name](u)
    n = fx.get('blur', 1)
    if n > 1:
        # motion blur: average sub-frames across a 180° shutter
        acc = f.copy()
        for j in range(1, n):
            acc += SHOTS[name](u + (j / n - 0.5) * 0.5 / FPS)[0]
        f = acc / n
    f = titles(f, t)
    return grade(f, fx, i)


# ── sound ──
def band(x, lo, hi, soft=0.15):
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(fr)
    if lo:
        m *= np.clip((fr - lo * (1 - soft)) / (lo * soft * 2 + 1e-9), 0, 1)
    if hi:
        m *= np.clip((hi * (1 + soft) - fr) / (hi * soft * 2 + 1e-9), 0, 1)
    return np.fft.irfft(X * m, len(x)).astype(np.float32)


def env(n, attack, decay):
    t = np.arange(n) / SR
    return (np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)).astype(np.float32)


def soundtrack():
    n = int(DURATION * SR) + SR
    L = np.zeros(n, np.float32)
    R = np.zeros(n, np.float32)
    rng = np.random.default_rng(9)

    def add(sig, t, gain=1.0, pan=0.0):
        i = int(t * SR)
        sig = sig[: max(0, n - i)]
        L[i:i + len(sig)] += sig * gain * (1 - max(0, pan))
        R[i:i + len(sig)] += sig * gain * (1 + min(0, pan))

    def kick(vel=1.0):
        m = int(0.45 * SR)
        tt = np.arange(m) / SR
        f = 45 + 75 * np.exp(-tt / 0.035)
        ph = 2 * np.pi * np.cumsum(f) / SR
        click = band(rng.standard_normal(m).astype(np.float32), 2000, 8000) * env(m, 0.0005, 0.004)
        return (np.sin(ph) * env(m, 0.001, 0.16) + click * 0.3) * vel

    def thud(f0=80, dec=0.12):  # leather on boot
        m = int(0.4 * SR)
        tt = np.arange(m) / SR
        body = np.sin(2 * np.pi * (f0 + 60 * np.exp(-tt / 0.02)) * tt) * env(m, 0.0005, dec)
        slap = band(rng.standard_normal(m).astype(np.float32), 900, 4500) * env(m, 0.0003, 0.018)
        return body + slap * 0.9

    def whoosh(dur, lo=300, hi=5000, rise=True):
        m = int(dur * SR)
        x = rng.standard_normal(m).astype(np.float32)
        out = np.zeros(m, np.float32)
        parts = 8
        for p in range(parts):
            a, b = p * m // parts, (p + 1) * m // parts
            c = (p + 0.5) / parts if rise else 1 - (p + 0.5) / parts
            f = lo * (hi / lo) ** c
            seg = band(x[max(0, a - 2048):b + 2048], f * 0.6, f * 1.6)
            out[a:b] = seg[(a - max(0, a - 2048)):(a - max(0, a - 2048)) + (b - a)]
        shape = np.sin(np.pi * np.linspace(0, 1, m)) ** (1.5 if rise else 0.8)
        return out * shape.astype(np.float32)

    # crowd bed: noise through the voice band, swelling with the edit
    crowd = band(rng.standard_normal(n).astype(np.float32), 180, 2600)
    crowd2 = band(rng.standard_normal(n).astype(np.float32), 180, 2600)
    tt = np.arange(n) / SR
    lvl = np.interp(tt, [0, CUTS['strada'][0], CUTS['stadio'][0], CUTS['stadio'][0] + 2.5, CUTS['montaggio'][0], CUTS['nero'][0] - 0.01, CUTS['nero'][0], CUTS['fine'][0] + 0.2, CUTS['fine'][0] + 1.5, DURATION],
                    [0.015, 0.03, 0.06, 0.2, 0.26, 0.32, 0.0, 0.0, 0.05, 0.0]).astype(np.float32)
    swell = 1 + 0.35 * np.sin(2 * np.pi * tt * 0.37) * np.sin(2 * np.pi * tt * 0.11 + 1)
    chant = 1 + 0.45 * (tt > CUTS['stadio'][0] + 1.5) * (tt < CUTS['nero'][0]) * np.maximum(0, np.sin(np.pi * tt / BEAT)) ** 2
    L += crowd * lvl * swell * chant
    R += crowd2 * lvl * swell * chant

    # heartbeat under the barber, clipper buzz
    for k in range(4):
        add(thud(48, 0.09), at(k), 0.55)
        add(thud(44, 0.08), at(k) + 0.17, 0.35)
    m = int(CUTS['rito'][1] * SR)
    saw = ((np.arange(m) * 118 / SR) % 1.0 * 2 - 1).astype(np.float32)
    buzz = band(saw, 100, 3000) * (0.6 + 0.4 * np.sin(2 * np.pi * np.arange(m) / SR * 7))
    add(buzz * np.minimum(1, np.arange(m) / (0.3 * SR)), 0, 0.05, -0.3)

    # the beat: kick on every beat from the street on, claps and hats once we run
    for k in range(4, 31):
        add(kick(0.55 + 0.45 * k / 31), at(k), 0.9)
        if k >= 15:
            clap = band(rng.standard_normal(int(0.2 * SR)).astype(np.float32), 900, 6000) * env(int(0.2 * SR), 0.001, 0.05)
            if k % 2 == 1:
                add(clap, at(k), 0.35)
            hat = band(rng.standard_normal(int(0.06 * SR)).astype(np.float32), 7000, 16000) * env(int(0.06 * SR), 0.0005, 0.012)
            add(hat, at(k) + BEAT / 2, 0.25, 0.3 if k % 2 else -0.3)
    # sub drone pumping with the kick
    a, b = CUTS['strada'][0], CUTS['nero'][0]
    m = int((b - a) * SR)
    t2 = np.arange(m) / SR
    pump = 1 - 0.8 * np.exp(-((t2 % BEAT) / 0.08))
    drone = (np.sin(2 * np.pi * 55 * t2) + 0.4 * np.sin(2 * np.pi * 82.4 * t2) * (t2 > CUTS['stadio'][0] - a)) * pump
    add((drone * np.minimum(1, t2 / 1.5)).astype(np.float32), a, 0.16)

    # the ball's journey
    add(whoosh(0.85, 250, 3000, rise=True), CUTS['strada'][1] - 0.85, 0.5)
    add(whoosh(0.45, 400, 6000, rise=False), CUTS['cortile'][0], 0.45)
    add(thud(85, 0.14), CUTS['cortile'][0] + 0.45, 1.0)
    add(whoosh(1.1, 300, 2500, rise=False), CUTS['cortile'][0] + 0.47, 0.35, 0.4)
    add(thud(95, 0.08), CUTS['corsa'][0] + (CUTS['corsa'][1] - CUTS['corsa'][0]) / 3 + 0.3, 0.6)
    add(whoosh(0.5, 500, 7000, rise=True), CUTS['stadio'][0] - 0.45, 0.6, -0.4)
    # riser into the montage, hits on its cuts
    add(whoosh(2.0, 200, 9000, rise=True), CUTS['montaggio'][0] - 1.9, 0.35)
    step = (CUTS['montaggio'][1] - CUTS['montaggio'][0]) / len(MONTAGE)
    for i in range(len(MONTAGE)):
        add(band(rng.standard_normal(int(0.4 * SR)).astype(np.float32), 3000, 12000) * env(int(0.4 * SR), 0.001, 0.08), CUTS['montaggio'][0] + i * step, 0.18)
    # silence, one ball bouncing, then the title
    for j, (dt, g) in enumerate([(0.08, 0.7), (0.36, 0.45), (0.55, 0.28), (0.67, 0.15)]):
        add(thud(110, 0.06), CUTS['nero'][0] + dt, g)
    boom = np.sin(2 * np.pi * 38 * np.arange(int(2.5 * SR)) / SR) * env(int(2.5 * SR), 0.005, 0.7)
    add(boom.astype(np.float32), CUTS['fine'][0], 0.8)
    m = int((DURATION - CUTS['fine'][0]) * SR)
    t3 = np.arange(m) / SR
    pad = sum(np.sin(2 * np.pi * f * t3 + i) for i, f in enumerate([110, 164.8, 220, 261.6]))
    pad = pad * np.minimum(1, t3 / 1.2) * np.clip((t3[-1] - t3) / 1.0, 0, 1)
    add(band(pad.astype(np.float32), 0, 1200), CUTS['fine'][0], 0.05)

    mix = np.stack([L, R], 1)[: int(DURATION * SR)]
    mix = np.tanh(mix * 1.2)
    mix = mix / np.abs(mix).max() * 0.89
    path = os.path.join(OUT, 'ogni-strada.wav')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    return path


def main():
    os.makedirs(OUT, exist_ok=True)
    load()
    wav = soundtrack()
    only = [float(a) for a in sys.argv[1:] if a.replace('.', '', 1).isdigit()]
    if only:  # stills at given times, for checking frames
        for t in only:
            f = frame_at(int(round(t * FPS)))
            Image.fromarray((f * 255).astype(np.uint8)).save(os.path.join(OUT, f'still-{t:05.2f}.jpg'), quality=90)
        return
    out = os.path.join(OUT, 'ogni-strada-preview.mp4' if PREVIEW else 'ogni-strada.mp4')
    ff = subprocess.Popen([
        'ffmpeg', '-y', '-loglevel', 'error',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
        '-i', wav,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out,
    ], stdin=subprocess.PIPE)
    total = int(DURATION * FPS)
    for i in range(total):
        ff.stdin.write((frame_at(i) * 255 + 0.5).astype(np.uint8).tobytes())
        if i % FPS == 0:
            print(f'{i}/{total}', flush=True)
    ff.stdin.close()
    ff.wait()
    print('→', out)


if __name__ == '__main__':
    main()
