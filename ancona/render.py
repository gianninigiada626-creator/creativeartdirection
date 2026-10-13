"""
ANCONA — fauna urbana. A vintage nature-documentary short, 16:9, assembled entirely in code.

The explorer (a puppet cat on a skateboard) crosses the city on an engraved map; at each stop
the film cuts to one of the animated clips, and a museum specimen tag names the creature there.
Everything shares one 16mm print look: faded warm colour, halation, grain, gate weave, flicker,
dust and the odd scratch. The narration is recorded later, so the soundtrack is delivered as stems
(music, effects, clips) next to the mix, with a timed guide for the voice (VOCE.md).

    python3 prep.py && python3 map.py     # cut-outs, plates, the map → build/
    python3 render.py                     # → out/ancona.mp4 (+ out/stems/*.wav)
    python3 render.py 9.5 25 40           # single frames → out/still-*.jpg
"""
import json
import math
import os
import subprocess
import sys
import wave

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, 'assets')
B = os.path.join(HERE, 'build')
F = os.path.join(HERE, 'fonts')
OUT = os.path.join(HERE, 'out')
W, H = 1920, 1080
FPS = 24
SR = 48000


# ── helpers ──
def clamp01(x):
    return max(0.0, min(1.0, x))


def span(t, a, b):
    return clamp01((t - a) / (b - a))


def smooth(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def ease_out(x):
    return 1 - (1 - clamp01(x)) ** 3


def ease_in_out(x):
    x = clamp01(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def lerp(a, b, u):
    return a + (b - a) * u


def hash1(n):
    return (math.sin(n * 12.9898 + 78.233) * 43758.5453) % 1.0


def noise1(t, seed=0):
    i = math.floor(t)
    f = t - i
    a, b = hash1(i + seed * 101) * 2 - 1, hash1(i + 1 + seed * 101) * 2 - 1
    return lerp(a, b, f * f * (3 - 2 * f))


def font(name, size):
    return ImageFont.truetype(os.path.join(F, name), int(size))


def rgba_f(img):
    return np.asarray(img.convert('RGBA')).astype(np.float32) / 255.0


def over(dst, rgba, opacity=1.0):
    a = rgba[..., 3:4] * opacity
    return dst * (1 - a) + rgba[..., :3] * a


def place(sprite, M, opacity=1.0, dst=None, tint=None):
    """Warp an RGBA sprite onto the frame with a 2×3 matrix (optionally tinted to the scene's light)."""
    lay = cv2.warpAffine(sprite, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    if tint is not None:
        lay[..., :3] *= np.float32(tint)
    return over(dst, lay, opacity)


def affine(sx, sy, rot_deg, px, py, ax, ay):
    """Matrix taking sprite point (ax, ay) to screen (px, py), scaled and rotated about it."""
    a = math.radians(rot_deg)
    ca, sa = math.cos(a), math.sin(a)
    return np.float32([[ca * sx, -sa * sy, px - (ca * sx * ax - sa * sy * ay)], [sa * sx, ca * sy, py - (sa * sx * ax + ca * sy * ay)]])


# ── the clips ──
CLIPS = {
    'polpo': ('01-passetto-polpo.mp4', 8.0),
    'vecchio': ('02-fontana-vecchio.mp4', 5.0),
    'orso': ('03-porto-orso.mp4', 5.0),
    'lupi': ('04-tuffi-lupi.mp4', 5.0),
    'gatto': ('05-bar-gatto.mp4', 5.0),
}


class Clip:
    """Sequential reader (cheap for the render), with a one-frame seek for stills."""

    def __init__(self, name):
        self.path = os.path.join(A, 'clips', CLIPS[name][0])
        self.proc = None
        self.pos = -1
        self.last = None

    def _open(self, start):
        if self.proc:
            self.proc.kill()
        self.proc = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-ss', f'{start / FPS:.4f}', '-i', self.path,
                                      '-vf', f'scale={W}:{H}:flags=lanczos', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                                     stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        self.pos = start - 1

    def frame(self, i):
        if self.proc is None or i <= self.pos - 1 or i > self.pos + 1 and i - self.pos > 48:
            self._open(i)
        while self.pos < i:
            buf = self.proc.stdout.read(W * H * 3)
            if len(buf) < W * H * 3:
                break
            self.last = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
            self.pos += 1
        return self.last.astype(np.float32) / 255.0


_CLIPS = {}


def clip(name):
    if name not in _CLIPS:
        _CLIPS[name] = Clip(name)
    return _CLIPS[name]


# ── the puppet on a skateboard ──
class Skater:
    def __init__(self):
        cut = cv2.imread(os.path.join(B, 'gatto-cut.png'), cv2.IMREAD_UNCHANGED).astype(np.float32) / 255.0
        cut = np.dstack([cv2.cvtColor(cut[..., :3], cv2.COLOR_BGR2RGB), cut[..., 3:]])
        h, w = cut.shape[:2]
        self.h, self.w = h, w
        y = np.arange(h, dtype=np.float32)[:, None] / h
        # split at the neck: the head is its own layer so it can bob like a hand puppet
        self.neck = (0.47 * w, 0.30 * h)
        head = cut.copy()
        head[..., 3] *= np.clip((0.335 - y) / 0.04, 0, 1)
        body = cut.copy()
        body[..., 3] *= np.clip((y - 0.27) / 0.04, 0, 1)
        self.head, self.body = head, body
        self.board = self._board(int(w * 1.32), w)

    def _board(self, L, w):
        """A side-on skateboard: maple deck with kicked tails, grip tape, trucks, two wheels."""
        th = max(6, int(w * 0.045))
        r = int(w * 0.075)
        img = Image.new('RGBA', (L + 20, th * 3 + r * 2 + 20), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        x0, x1, y0 = 10, L + 10, th + 6
        kick = th * 1.6
        deck = [(x0, y0 - kick), (x0 + L * 0.12, y0), (x1 - L * 0.12, y0), (x1, y0 - kick),
                (x1, y0 - kick + th), (x1 - L * 0.12, y0 + th), (x0 + L * 0.12, y0 + th), (x0, y0 - kick + th)]
        d.polygon(deck, fill=(178, 128, 74, 255))
        d.line(deck[:4], fill=(28, 26, 24, 255), width=max(2, th // 3))  # grip tape
        d.line(deck[4:] + deck[:1], fill=(120, 80, 44, 255), width=2)
        self.wheel_y = y0 + th + int(th * 0.6) + r
        self.wheel_x = [x0 + L * 0.2, x1 - L * 0.2]
        for wx in self.wheel_x:
            d.polygon([(wx - r * 0.9, y0 + th), (wx + r * 0.9, y0 + th), (wx + r * 0.4, self.wheel_y - r * 0.2), (wx - r * 0.4, self.wheel_y - r * 0.2)], fill=(150, 150, 146, 255))
        self.r = r
        self.board_top = y0
        return rgba_f(img)

    def wheel(self, r, angle):
        s = int(r * 2 + 4)
        img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        c = s / 2
        d.ellipse([c - r, c - r, c + r, c + r], fill=(232, 222, 196, 255), outline=(150, 140, 120, 255), width=2)
        d.ellipse([c - r * 0.42, c - r * 0.42, c + r * 0.42, c + r * 0.42], fill=(70, 70, 70, 255))
        a = math.radians(angle)
        d.line([(c + math.cos(a) * r * 0.55, c + math.sin(a) * r * 0.55), (c + math.cos(a) * r * 0.92, c + math.sin(a) * r * 0.92)], fill=(150, 140, 120, 255), width=max(2, int(r * 0.18)))
        return rgba_f(img)

    def draw(self, f, x, y, height, dist, t, lean=0.0, shadow=True, opacity=1.0, tint=None):
        """Feet (board top) at screen (x, y); `height` is the cat's height on screen; `dist` drives the wheels."""
        s = height / self.h
        bump = math.sin(dist * 0.07) * 0.004 * height + noise1(dist * 0.05, 3) * 0.004 * height
        if shadow:
            sh = np.zeros((H, W), np.float32)
            cv2.ellipse(sh, (int(x), int(y + self.r * 2.1 * s)), (int(self.board.shape[1] * s * 0.48), max(2, int(height * 0.025))), 0, 0, 360, 0.55, -1)
            sh = cv2.GaussianBlur(sh, (0, 0), max(1.0, height * 0.012))
            f = f * (1 - sh[..., None] * opacity)
        # board
        bh, bw = self.board.shape[:2]
        f = place(self.board, affine(s, s, 0, x, y + bump, bw / 2, self.board_top), opacity, f, tint)
        r = self.r * s
        ang = math.degrees(dist / max(r, 1e-3))
        wspr = self.wheel(self.r, ang)
        for wx in self.wheel_x:
            px = x + (wx - bw / 2) * s
            py = y + bump + (self.wheel_y - self.board_top) * s
            f = place(wspr, affine(s, s, 0, px, py, wspr.shape[1] / 2, wspr.shape[0] / 2), opacity, f, tint)
        # body sways a little over the board; the head bobs late, like a puppet on a hand
        sway = math.sin(t * 2.3) * 1.2 + lean
        feet = (self.w / 2, self.h * 0.985)
        f = place(self.body, affine(s, s, sway, x, y + bump, *feet), opacity, f, tint)
        a = math.radians(sway)
        nx, ny = self.neck[0] - feet[0], self.neck[1] - feet[1]
        hx = x + (math.cos(a) * nx - math.sin(a) * ny) * s
        hy = y + bump + (math.sin(a) * nx + math.cos(a) * ny) * s
        tilt = sway * 1.6 + math.sin(t * 3.1 + 0.6) * 3.0
        f = place(self.head, affine(s, s, tilt, hx, hy + math.sin(t * 6.2) * height * 0.004, *self.neck), opacity, f, tint)
        return f


SKATER = None


# ── cards and tags ──
def paper_tex(w, h, base=(239, 228, 200), seed=1):
    r = np.random.default_rng(seed)
    a = np.zeros((h, w, 3), np.float32) + np.float32(base)
    small = r.normal(0, 1, (max(2, h // 24), max(2, w // 24))).astype(np.float32)
    a += cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC)[..., None] * 7 * np.float32([1, 1, 1.3])
    a += r.normal(0, 4, (h, w, 1)).astype(np.float32)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


TAGS = {
    'gatto0': ('Felis rotulans', 'IL GATTO SKATER', ['HABITAT: tutta la città', 'ABITUDINI: non sta mai fermo']),
    'polpo': ('Octopus tifosus', 'IL POLPO DELLE GROTTE', ['HABITAT: grotte del Passetto', 'SEGNI PARTICOLARI: sciarpa biancorossa']),
    'lupi': ('Canis tuffator', 'I TUFFATORI', ['HABITAT: gli scogli del Passetto', 'ABITUDINI: si buttano. Sempre.']),
    'vecchio': ('Homo philosophus', 'IL PENSATORE DI PIAZZA', ['HABITAT: la fontana dei cavalli', 'ABITUDINI: osserva, commenta']),
    'gatto': ('Felis rotulans', 'SOSTA AL BAR', ['DIETA: birra e Gazzetta', 'DURATA DELLA SOSTA: incerta']),
    'orso': ('Ursus mosciolarius', "L'ORSO DEL PORTO", ['HABITAT: il molo, al tramonto', 'DIETA: moscioli']),
}
_TAG = {}


def tag_image(key, typed=1.0):
    """A museum specimen label: Latin name, common name, typed notes (revealed by `typed` 0..1)."""
    latin, common, notes = TAGS[key]
    n_chars = sum(len(s) for s in notes)
    shown = int(round(typed * n_chars))
    ck = (key, shown)
    if ck in _TAG:
        return _TAG[ck]
    w, h = 780, 300
    img = paper_tex(w, h, seed=len(key) * 7).convert('RGBA')
    d = ImageDraw.Draw(img)
    ink = (46, 34, 26, 255)
    d.rectangle([10, 10, w - 11, h - 11], outline=ink, width=3)
    d.rectangle([20, 20, w - 21, h - 21], outline=ink, width=1)
    d.ellipse([34, h / 2 - 12, 58, h / 2 + 12], fill=(30, 24, 20, 255))  # punched hole
    d.ellipse([38, h / 2 - 8, 54, h / 2 + 8], fill=(0, 0, 0, 0))
    d.text((84, 34), latin, font=font('im-fell-italic.woff', 66), fill=ink)
    d.text((88, 116), common, font=font('im-fell.woff', 34), fill=(150, 36, 28, 255))
    d.line([(88, 162), (w - 50, 162)], fill=ink, width=1)
    y = 180
    left = shown
    for line in notes:
        part = line[:max(0, left)]
        left -= len(line)
        d.text((90, y), part, font=font('special-elite.woff', 30), fill=ink)
        y += 44
    # the string through the hole, off to the left
    out = Image.new('RGBA', (w + 260, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(out)
    out.alpha_composite(img, (260, 0))
    od.line([(0, h / 2 - 40), (120, h / 2 - 20), (260 + 46, h / 2)], fill=(210, 196, 160, 255), width=4)
    arr = rgba_f(out)
    _TAG[ck] = arr
    return arr


def draw_tag(f, key, u, dur, side='left'):
    """Slides in, types its notes, holds, slides out."""
    if u < 0 or u > dur:
        return f
    k_in = ease_out(span(u, 0, 0.5))
    k_out = smooth(span(u, dur - 0.45, dur))
    typed = span(u, 0.6, 0.6 + 1.6)
    img = tag_image(key, typed)
    h, w = img.shape[:2]
    s = 0.86
    if side == 'left':
        x = lerp(-w * s, 40, k_in) - k_out * (w * s + 60)
        rot = lerp(-6, -1.6, k_in)
    else:
        x = lerp(W, W - w * s - 10, k_in) + k_out * (w * s + 60)
        rot = lerp(6, 1.4, k_in)
        # card first, the string trailing off to the right
        img = np.concatenate([img[:, 260:], img[:, :260][:, ::-1]], axis=1)
    y = H - h * s - 70
    # a soft shadow under the card
    sh = np.zeros((H, W), np.float32)
    x0 = int(x + (0 if side == 'right' else 260 * s))
    cv2.rectangle(sh, (x0 + 14, int(y + 18)), (int(x0 + 780 * s + 14), int(y + h * s + 18)), 0.45, -1)
    sh = cv2.GaussianBlur(sh, (0, 0), 14)
    f = f * (1 - sh[..., None])
    return place(img, affine(s, s, rot, x, y, 0, 0), 1.0, f)


_CARDS = {}


def title_card(kind):
    if kind in _CARDS:
        return _CARDS[kind]
    img = Image.new('RGBA', (W, H), (14, 11, 9, 255))
    d = ImageDraw.Draw(img)
    cream = (236, 224, 196, 255)
    if kind == 'title':
        d.text((W / 2, 330), 'un documentario sulla', font=font('im-fell-italic.woff', 52), fill=cream, anchor='mm')
        _spaced(d, (W / 2, 530), 'ANCONA', font('im-fell.woff', 230), cream, 40)
        d.line([(W / 2 - 360, 680), (W / 2 + 360, 680)], fill=cream, width=2)
        _spaced(d, (W / 2, 760), 'FAUNA URBANA', font('im-fell.woff', 64), cream, 22)
        d.line([(W / 2 - 360, 840), (W / 2 + 360, 840)], fill=cream, width=2)
    elif kind == 'fine':
        d.text((W / 2, 500), 'Fine', font=font('im-fell-italic.woff', 230), fill=cream, anchor='mm')
        _spaced(d, (W / 2, 700), 'ANCONA  ·  FAUNA URBANA', font('im-fell.woff', 44), cream, 12)
    _CARDS[kind] = rgba_f(img)
    return _CARDS[kind]


def _spaced(d, xy, text, fnt, fill, spacing):
    widths = [d.textlength(ch, font=fnt) for ch in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x = xy[0] - total / 2
    for ch, w in zip(text, widths):
        d.text((x, xy[1]), ch, font=fnt, fill=fill, anchor='lm')
        x += w + spacing


def leader(u):
    """Academy-style countdown: 3, 2, then black with the 2-pop."""
    f = np.full((H, W, 3), 0.42, np.float32)
    n = 3 - int(u)
    if n <= 1:
        return np.zeros((H, W, 3), np.float32)
    k = u % 1.0
    cx, cy, R = W // 2, H // 2, int(H * 0.38)
    sweep = np.zeros((H, W), np.uint8)
    cv2.ellipse(sweep, (cx, cy), (R * 3, R * 3), -90, 0, 360 * k, 255, -1)
    f[sweep > 0] *= 0.62
    for r in (R, int(R * 0.86)):
        cv2.circle(f, (cx, cy), r, (0.92, 0.92, 0.92), 6, cv2.LINE_AA)
    cv2.line(f, (0, cy), (W, cy), (0.85, 0.85, 0.85), 3, cv2.LINE_AA)
    cv2.line(f, (cx, 0), (cx, H), (0.85, 0.85, 0.85), 3, cv2.LINE_AA)
    img = Image.fromarray((f * 255).astype(np.uint8))
    ImageDraw.Draw(img).text((cx, cy + 10), str(n), font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 420), fill=(20, 20, 20), anchor='mm')
    return np.asarray(img).astype(np.float32) / 255.0


# ── the map ──
MAP = None
ROUTE = None


def load_map():
    global MAP, ROUTE
    MAP = cv2.cvtColor(cv2.imread(os.path.join(B, 'map.png')), cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    ROUTE = json.load(open(os.path.join(B, 'route.json')))


def polyline_at(pts, u):
    """Point at fraction u along a polyline, plus the cumulative length."""
    seg = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    total = sum(seg)
    d = clamp01(u) * total
    for i, L in enumerate(seg):
        if d <= L or i == len(seg) - 1:
            k = d / L if L else 0
            return (lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)), clamp01(u) * total
        d -= L
    return pts[-1], total


def dots(pts, upto=1.0, step=16):
    out = []
    seg = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    total = sum(seg)
    d = 0.0
    while d <= total * upto:
        out.append(polyline_at(pts, d / total)[0])
        d += step
    return out


LEG_ORDER = ['grotte-scogli', 'scogli-piazza', 'piazza-bar', 'bar-porto']


def map_frame(cx, cy, zoom, done_legs=(), leg=None, leg_u=0.0, cat=True, t=0.0, dusk=0.0, cat_scale=1.0):
    """The map through a camera centred on map point (cx, cy); zoom 1 = the whole map's width on screen."""
    s = W / 3200 * zoom
    M = np.float32([[s, 0, W / 2 - s * cx], [0, s, H / 2 - s * cy]])
    f = cv2.warpAffine(MAP, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
    red = (0.62, 0.15, 0.11)
    for name in done_legs:
        for (x, y) in dots(ROUTE['legs'][name]):
            cv2.circle(f, (int(M[0, 0] * x + M[0, 2]), int(M[1, 1] * y + M[1, 2])), max(2, int(4 * s)), red, -1, cv2.LINE_AA)
    pos = None
    if leg:
        pts = ROUTE['legs'][leg]
        for (x, y) in dots(pts, leg_u):
            cv2.circle(f, (int(M[0, 0] * x + M[0, 2]), int(M[1, 1] * y + M[1, 2])), max(2, int(4 * s)), red, -1, cv2.LINE_AA)
        pos, dist = polyline_at(pts, leg_u)
    if dusk:
        f = f * (1 - 0.45 * dusk) * np.float32([1.0, 0.86, 0.72]) ** dusk
    if cat and pos is not None:
        px, py = M[0, 0] * pos[0] + M[0, 2], M[1, 1] * pos[1] + M[1, 2]
        f = SKATER.draw(f, px, py, 150 * cat_scale, dist * s * 3, t, shadow=True)
    return f


def map_cam_for(leg, u, zoom=2.6):
    pts = ROUTE['legs'][leg]
    (x, y), _ = polyline_at(pts, u)
    return x, y - 40 / zoom * 2.0, zoom


# ── the timeline ──
# (start, end, name)
SEG = []


def seg(name, dur):
    t0 = SEG[-1][1] if SEG else 0.0
    SEG.append((t0, t0 + dur, name))


seg('leader', 3.0)
seg('title', 5.0)
seg('intro', 6.0)
seg('overview', 4.0)
seg('clip:polpo', 8.0)
seg('freeze:polpo', 2.5)
seg('leg:grotte-scogli', 2.5)
seg('clip:lupi', 5.0)
seg('leg:scogli-piazza', 3.5)
seg('clip:vecchio', 5.0)
seg('leg:piazza-bar', 2.5)
seg('clip:gatto', 5.0)
seg('leg:bar-porto', 3.0)
seg('clip:orso', 5.0)
seg('crossing', 4.0)
seg('recap', 4.5)
seg('fine', 4.0)
seg('runout', 1.0)
DURATION = SEG[-1][1]
START = {name: a for (a, b, name) in SEG}
END = {name: b for (a, b, name) in SEG}
# tags: (segment it starts in, offset, duration, key, side)
TAG_CUES = [
    ('intro', 1.8, 3.8, 'gatto0', 'right'),
    ('clip:polpo', 6.4, 3.9, 'polpo', 'right'),
    ('clip:lupi', 0.5, 3.9, 'lupi', 'right'),
    ('clip:vecchio', 0.6, 4.0, 'vecchio', 'right'),
    ('clip:gatto', 0.6, 4.0, 'gatto', 'right'),
    ('clip:orso', 0.6, 4.0, 'orso', 'right'),
]
# skate wipes: the cat crosses close to the lens on these cuts
WIPES = ['clip:polpo', 'clip:lupi', 'clip:vecchio', 'clip:gatto', 'clip:orso']
WIPE_D = 0.8


def picture(name, u, t):
    """The frame of a segment, before tags, wipes and the film look."""
    if name == 'leader':
        return leader(u)
    if name in ('title', 'fine'):
        f = title_card(name)[..., :3].copy()
        fade = smooth(span(u, 0, 0.8)) * (1 - smooth(span(u, 3.6 if name == 'title' else 3.4, 4.6 if name == 'title' else 4.0)))
        return f * fade
    if name == 'runout':
        v = 0.9 if (int(u * FPS) % 3 == 0) else 0.05
        return np.full((H, W, 3), v, np.float32) * np.float32([1, 0.95, 0.85])
    if name == 'intro':
        # the studio: black velvet, a pool of light; the explorer rolls in, poses, rolls off
        f = studio()
        x = W * 0.42
        dist = 0.0
        if u < 1.4:
            k = ease_out(u / 1.4)
            x = lerp(-400, W * 0.42, k)
            dist = k * 1800
        elif u > 5.2:
            k = (u - 5.2) / 0.8
            x = W * 0.42 + k * k * 1700
            dist = 1800 + k * k * 1700
        else:
            dist = 1800
        lean = -6 * (1 - ease_out(span(u, 1.2, 1.7))) * (u > 1.0) + 4 * span(u, 5.0, 5.4)
        return SKATER.draw(f, x, H * 0.9, H * 0.74, dist, u, lean=lean)
    if name == 'overview':
        k = ease_in_out(span(u, 0.0, 4.0))
        cx, cy, zoom = lerp(1600, 2392, k), lerp(1000, 980, k), lerp(1.05, 2.6, k)
        return map_frame(cx, cy, zoom, leg='grotte-scogli', leg_u=0.0, t=u, cat_scale=lerp(0.6, 1.0, k))
    if name.startswith('clip:'):
        key = name[5:]
        return clip(key).frame(int(u * FPS))
    if name == 'freeze:polpo':
        f = clip('polpo').frame(int(CLIPS['polpo'][1] * FPS) - 2)
        z = 1 + 0.06 * smooth(u / 2.5)
        M = cv2.getRotationMatrix2D((W * 0.55, H * 0.45), 0, z)
        return cv2.warpAffine(f, M, (W, H), borderMode=cv2.BORDER_REFLECT_101)
    if name.startswith('leg:'):
        leg = name[4:]
        i = LEG_ORDER.index(leg)
        d = END[name] - START[name]
        k = ease_in_out(span(u, 0.15, d - 0.25))
        cx, cy, zoom = map_cam_for(leg, k, 2.6 if leg != 'scogli-piazza' else 2.2)
        dusk = span(u, 0, d) if leg == 'bar-porto' else 0.0
        return map_frame(cx, cy, zoom, done_legs=LEG_ORDER[:i], leg=leg, leg_u=k, t=u, dusk=dusk)
    if name == 'crossing':
        # the last light on the pier: the explorer rolls up beside the bear and stops
        f = clip('orso').frame(int(CLIPS['orso'][1] * FPS) - 2)
        z = 1 + 0.04 * smooth(u / 4)
        M = cv2.getRotationMatrix2D((W * 0.55, H * 0.5), 0, z)
        f = cv2.warpAffine(f, M, (W, H), borderMode=cv2.BORDER_REFLECT_101)
        k = ease_out(span(u, 0.1, 2.2))
        x = lerp(W + 260, W * 0.75, k)
        lean = 7 * (1 - ease_out(span(u, 1.9, 2.6))) * (u > 1.6)
        return SKATER.draw(f, x, H * 0.95, H * 0.4, k * 2600, u, lean=lean, tint=(0.62, 0.56, 0.58))
    if name == 'recap':
        k = ease_in_out(span(u, 0, 3.2))
        cx, cy, zoom = lerp(1340, 1800, k), lerp(612, 900, k), lerp(2.6, 1.15, k)
        return map_frame(cx, cy, zoom, done_legs=LEG_ORDER, leg='bar-porto', leg_u=1.0, t=u, dusk=1.0 - 0.5 * k, cat_scale=lerp(1, 0.7, k)) * (1 - smooth(span(u, 3.6, 4.5)))
    raise ValueError(name)


_STUDIO = None


def studio():
    global _STUDIO
    if _STUDIO is None:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        floor = np.exp(-(((xx - W * 0.45) / (W * 0.32)) ** 2 + ((yy - H * 0.93) / (H * 0.09)) ** 2))
        back = np.exp(-(((xx - W * 0.45) / (W * 0.45)) ** 2 + ((yy - H * 0.45) / (H * 0.55)) ** 2))
        v = 0.025 + 0.07 * back + 0.22 * floor
        _STUDIO = (v[..., None] * np.float32([1.0, 0.93, 0.82])).astype(np.float32)
    return _STUDIO.copy()


def segment_at(t):
    for (a, b, name) in SEG:
        if a <= t < b:
            return name, t - a
    return SEG[-1][2], t - SEG[-1][0]


def compose(t):
    name, u = segment_at(t)
    f = picture(name, u, t)
    # skate wipe across the cut into each clip: the cat passes close to the lens
    for w in WIPES:
        c = START[w]
        if c - WIPE_D / 2 <= t < c + WIPE_D / 2:
            k = (t - (c - WIPE_D / 2)) / WIPE_D
            prev_name, _ = segment_at(c - 1e-3)
            if t < c:  # the next shot waits on its first frame
                prv, nxt = f, picture(w, 0.0, t)
            else:  # the last shot holds its last frame
                prv, nxt = picture(prev_name, END[prev_name] - START[prev_name] - 1e-3, t), f
            x = lerp(-W * 0.35, W * 1.35, ease_in_out(k))
            mask = np.clip((x - np.arange(W, dtype=np.float32)) / 30.0, 0, 1)[None, :, None]
            f = prv * (1 - mask) + nxt * mask
            f = SKATER.draw(f, x, H * 1.32, H * 1.55, k * 6000, t, lean=-8, shadow=False)
    for (segname, off, dur, key, side) in TAG_CUES:
        f = draw_tag(f, key, t - (START[segname] + off), dur, side)
    return f


# ── 16mm print ──
_yy, _xx = np.mgrid[0:H, 0:W].astype(np.float32)
_d = np.sqrt(((_xx - W / 2) / (W / 2)) ** 2 + ((_yy - H / 2) / (H / 2)) ** 2)
VIGN = (1 - 0.42 * np.clip((_d - 0.55) / 0.8, 0, 1) ** 1.4)[..., None].astype(np.float32)


def gate_mask():
    g = np.zeros((H, W), np.float32)
    r, m = int(H * 0.055), int(H * 0.022)
    cv2.rectangle(g, (m + r, m), (W - m - r, H - m), 1, -1)
    cv2.rectangle(g, (m, m + r), (W - m, H - m - r), 1, -1)
    for cx, cy in [(m + r, m + r), (W - m - r, m + r), (m + r, H - m - r), (W - m - r, H - m - r)]:
        cv2.circle(g, (cx, cy), r, 1, -1, cv2.LINE_AA)
    return cv2.GaussianBlur(g, (0, 0), 2.5)[..., None]


GATE = gate_mask()


def film(f, i):
    t = i / FPS
    rng = np.random.default_rng(i * 7 + 3)
    # gate weave: the frame drifts a pixel or two
    wx, wy = noise1(t * 3.1, 1) * 1.6 + (rng.random() - 0.5) * 0.6, noise1(t * 2.7, 2) * 1.2 + (rng.random() - 0.5) * 0.5
    f = cv2.warpAffine(f, np.float32([[1, 0, wx], [0, 1, wy]]), (W, H), borderMode=cv2.BORDER_REFLECT_101)
    f = cv2.GaussianBlur(f, (0, 0), 0.7)
    lum = f @ np.float32([0.299, 0.587, 0.114])
    hi = cv2.resize(np.clip(lum - 0.6, 0, 1), (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    hi = cv2.resize(cv2.GaussianBlur(hi, (0, 0), 2.4), (W, H))[..., None]
    f = f + hi * np.float32([0.55, 0.22, 0.08])
    f = 0.5 + (f - 0.5) * 1.06
    l = (f @ np.float32([0.299, 0.587, 0.114]))[..., None]
    f = l + (f - l) * 0.74
    f = f * np.float32([1.03, 0.98, 0.86]) * 0.9 + np.float32([0.07, 0.056, 0.038])
    f = f * (1 + (noise1(t * 11, 4) * 0.025 + (rng.random() - 0.5) * 0.02))  # flicker
    # dust, the odd hair, a scratch now and then
    dust = np.zeros((H, W), np.float32)
    for _ in range(rng.poisson(3)):
        x, y = int(rng.uniform(0, W)), int(rng.uniform(0, H))
        cv2.circle(dust, (x, y), int(rng.uniform(1, 4)), 1.0 if rng.random() < 0.7 else -1.0, -1, cv2.LINE_AA)
    if rng.random() < 0.06:
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        pts = np.array([[x + k * 6 + math.sin(k * 0.7) * 8, y + k * 4] for k in range(20)], np.int32)
        cv2.polylines(dust, [pts], False, 1.0, 1, cv2.LINE_AA)
    sx = int(noise1(t * 0.4, 9) * W * 0.4 + W * 0.5)
    if hash1(int(t * 2)) < 0.35:
        cv2.line(dust, (sx, 0), (sx + int(noise1(t, 3) * 6), H), -0.6, 1, cv2.LINE_AA)
    dust = cv2.GaussianBlur(dust, (0, 0), 0.8)
    f = f * (1 - np.clip(dust, 0, 1)[..., None] * 0.85) + np.clip(-dust, 0, 1)[..., None] * 0.6
    f = f * VIGN
    g = rng.standard_normal((H // 2, W // 2)).astype(np.float32)
    f = f + cv2.resize(g, (W, H))[..., None] * 0.04
    f = f * GATE
    return np.clip(f, 0, 1)


# ── sound ──
def band(x, lo, hi):
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(fr)
    if lo:
        m *= np.clip((fr - lo * 0.8) / (lo * 0.4), 0, 1)
    if hi:
        m *= np.clip((hi * 1.2 - fr) / (hi * 0.4), 0, 1)
    return np.fft.irfft(X * m, len(x)).astype(np.float32)


def env(n, a, d):
    tt = np.arange(n) / SR
    return (np.minimum(1, tt / max(a, 1e-4)) * np.exp(-tt / d)).astype(np.float32)


def pluck(freq, dur, rng, bright=0.5):
    """Karplus–Strong: a plucked string (the upright bass)."""
    n = int(dur * SR)
    p = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, p).astype(np.float32)
    buf = np.convolve(buf, np.ones(3) / 3, 'same').astype(np.float32)
    out = np.zeros(n, np.float32)
    idx = 0
    for i in range(n):
        out[i] = buf[idx]
        nxt = (idx + 1) % p
        buf[idx] = 0.5 * (buf[idx] + buf[nxt]) * (0.994 + 0.004 * bright)
        idx = nxt
    return out


def vibes(freqs, dur, start_amp=0.3):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    trem = 1 + 0.25 * np.sin(2 * np.pi * 5.2 * tt)
    s = sum(np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * f * 4 * tt) * np.exp(-tt / 0.15) for f in freqs)
    return (s * np.exp(-tt / 1.4) * np.minimum(1, tt / 0.004) * trem * start_amp / len(freqs)).astype(np.float32)


def music(n, rng):
    """A little library-music combo: walking bass, brushes, vibraphone. 92 bpm, D minor turnaround."""
    out = np.zeros(n, np.float32)
    bpm = 92
    beat = 60 / bpm
    t0 = START['title'] + 0.3
    t1 = START['fine'] + 3.6
    note = lambda m: 440 * 2 ** ((m - 69) / 12)
    # Dm9 | G13 | Cmaj9 | A7b9
    walk = [[38, 41, 45, 48], [43, 47, 50, 49], [36, 40, 43, 47], [45, 44, 43, 40]]
    chords = [[62, 65, 69, 72, 76], [59, 64, 65, 69], [60, 64, 67, 71, 74], [61, 64, 67, 70]]
    bar = 4 * beat
    k = 0
    cache = {}
    while t0 + k * beat < t1:
        b = (k // 4) % 4
        i = int((t0 + k * beat) * SR)
        m = walk[b][k % 4]
        if m not in cache:
            cache[m] = band(pluck(note(m), beat * 1.6, rng), 0, 1800) * env(int(beat * 1.6 * SR), 0.002, 0.5)
        s = cache[m]
        out[i:i + len(s)] += s[:max(0, n - i)] * 0.5
        # brushes: a swish on 2 and 4, a soft tap elsewhere
        sw = band(rng.standard_normal(int(0.25 * SR)).astype(np.float32), 2500, 9000) * env(int(0.25 * SR), 0.03 if k % 2 else 0.002, 0.09 if k % 2 else 0.03)
        out[i:i + len(sw)] += sw[:max(0, n - i)] * (0.09 if k % 2 else 0.04)
        if k % 4 == 0:
            v = vibes([note(x) for x in chords[b]], bar * 0.9)
            out[i:i + len(v)] += v[:max(0, n - i)]
        if k % 4 == 1:
            j = int((t0 + (k + 0.5) * beat) * SR)
            v = vibes([note(x) for x in chords[b][1:4]], beat * 2, 0.18)
            out[j:j + len(v)] += v[:max(0, n - j)]
        k += 1
    # fade in after the title, out on the end card; dip under the clips (their own sound + the voice)
    tt = np.arange(n) / SR
    lvl = np.clip((tt - t0) / 1.5, 0, 1) * np.clip((t1 - tt) / 2.0, 0, 1)
    duck = np.ones(n, np.float32)
    for (a, b, name) in SEG:
        if name.startswith('clip:') or name.startswith('freeze'):
            duck -= 0.55 * np.clip(np.minimum((tt - a) / 0.4, (b - tt) / 0.4), 0, 1)
    return out * lvl * np.clip(duck, 0.3, 1)


def effects(n, rng):
    out = np.zeros(n, np.float32)
    tt = np.arange(n) / SR
    # the projector: a hum and the gate's flutter, all film long
    hum = 0.012 * np.sin(2 * np.pi * 50 * tt) + 0.006 * np.sin(2 * np.pi * 100 * tt)
    clatter = band(rng.standard_normal(n).astype(np.float32), 400, 3000) * (0.5 + 0.5 * np.sin(2 * np.pi * 24 * tt)) ** 6 * 0.035
    out += (hum + clatter) * np.clip(tt / 0.6, 0, 1) * np.clip((DURATION - tt) / 0.5, 0, 1)
    # the 2-pop
    i = int((START['leader'] + 1.0) * SR)
    m = int(SR / FPS)
    out[i:i + m] += 0.5 * np.sin(2 * np.pi * 1000 * np.arange(m) / SR)

    def roll(a, b, gain):
        i, j = int(a * SR), int(b * SR)
        m = j - i
        r = band(rng.standard_normal(m).astype(np.float32), 60, 900)
        clacks = np.zeros(m, np.float32)
        for c in np.cumsum(rng.uniform(0.18, 0.4, 40)):
            ci = int(c * SR)
            if ci < m - 2000:
                clacks[ci:ci + 2000] += band(rng.standard_normal(2000).astype(np.float32), 200, 2500) * env(2000, 0.0005, 0.01)
        e = np.clip(np.minimum(np.arange(m) / (0.15 * SR), (m - np.arange(m)) / (0.25 * SR)), 0, 1)
        out[i:j] += (r * 0.5 + clacks * 0.6) * e * gain

    roll(START['intro'], START['intro'] + 1.5, 0.35)
    roll(START['intro'] + 5.1, END['intro'], 0.3)
    for (a, b, name) in SEG:
        if name.startswith('leg:'):
            roll(a + 0.1, b - 0.1, 0.18)
    roll(START['crossing'] + 0.1, START['crossing'] + 2.3, 0.22)
    for w in WIPES:
        c = START[w]
        m = int(WIPE_D * SR)
        wh = band(rng.standard_normal(m).astype(np.float32), 300, 4000) * np.sin(np.pi * np.linspace(0, 1, m)) ** 2
        i = int((c - WIPE_D / 2) * SR)
        out[i:i + m] += wh * 0.25
        roll(c - WIPE_D / 2, c + WIPE_D / 2, 0.35)
    # typewriter on the tags
    for (segname, off, dur, key, side) in TAG_CUES:
        a = START[segname] + off + 0.6
        nchar = sum(len(s) for s in TAGS[key][2])
        for c in range(nchar):
            ci = int((a + 1.6 * c / nchar + rng.uniform(-0.01, 0.01)) * SR)
            click = band(rng.standard_normal(1200).astype(np.float32), 1500, 7000) * env(1200, 0.0002, 0.006)
            out[ci:ci + 1200] += click * 0.18
        # the card slides in: a paper swish
        m = int(0.35 * SR)
        i = int((START[segname] + off) * SR)
        out[i:i + m] += band(rng.standard_normal(m).astype(np.float32), 1500, 8000) * env(m, 0.05, 0.1) * 0.1
    return out


def clip_audio(n):
    out = np.zeros((n, 2), np.float32)
    for (a, b, name) in SEG:
        if not name.startswith('clip:'):
            continue
        key = name[5:]
        raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(A, 'clips', CLIPS[key][0]), '-t', str(b - a),
                              '-f', 's16le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout
        s = np.frombuffer(raw, np.int16).reshape(-1, 2).astype(np.float32) / 32768
        m = len(s)
        e = np.clip(np.minimum(np.arange(m) / (0.08 * SR), (m - np.arange(m)) / (0.25 * SR)), 0, 1)[:, None]
        i = int(a * SR)
        out[i:i + m] += (s * e)[:max(0, n - i)] * 0.6
    return out


def write_wav(path, stereo):
    stereo = np.clip(stereo, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((stereo * 32767).astype(np.int16).tobytes())


def soundtrack():
    n = int(DURATION * SR)
    rng = np.random.default_rng(11)
    mus = music(n, rng)
    fx = effects(n, rng)
    clips = clip_audio(n)
    os.makedirs(os.path.join(OUT, 'stems'), exist_ok=True)
    st = lambda mono: np.stack([mono, mono], 1)
    write_wav(os.path.join(OUT, 'stems', 'musica.wav'), st(mus) * 0.8)
    write_wav(os.path.join(OUT, 'stems', 'effetti.wav'), st(fx))
    write_wav(os.path.join(OUT, 'stems', 'clip.wav'), clips)
    mix = st(mus) * 0.8 + st(fx) + clips
    mix = np.tanh(mix * 1.1) * 0.9
    path = os.path.join(OUT, 'ancona.wav')
    write_wav(path, mix)
    return path


def main():
    global SKATER
    os.makedirs(OUT, exist_ok=True)
    load_map()
    SKATER = Skater()
    only = [float(a) for a in sys.argv[1:] if a.replace('.', '', 1).isdigit()]
    if only:
        for t in only:
            i = int(round(t * FPS))
            f = film(compose(i / FPS), i)
            Image.fromarray((f * 255).astype(np.uint8)).save(os.path.join(OUT, f'still-{t:05.1f}.jpg'), quality=90)
        return
    wav = soundtrack()
    out = os.path.join(OUT, 'ancona.mp4')
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-i', wav, '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p',
                           '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    total = int(DURATION * FPS)
    for i in range(total):
        ff.stdin.write((film(compose(i / FPS), i) * 255 + 0.5).astype(np.uint8).tobytes())
        if i % (FPS * 2) == 0:
            print(f'{i}/{total}', flush=True)
    ff.stdin.close()
    ff.wait()
    print('→', out)


if __name__ == '__main__':
    main()
