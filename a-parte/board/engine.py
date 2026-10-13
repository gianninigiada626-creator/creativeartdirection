"""
A small drawing engine for the A PARTE storyboard: graphite on warm paper, as if rotoscoped
over live action — and one flat red figure painted over the top.

Layers, composited at the end:
  ink    graphite lines and hatching (darkens the paper)
  tone   charcoal washes and the light of each age (multiplies the paper)
  glow   light that falls on the world (adds) — never on the red figure
  red    the protagonist: flat, unlined, unshaded, on top of everything
"""
import math

import cv2
import numpy as np

PAPER = np.float32([0.925, 0.902, 0.855])
GRAPHITE = np.float32([0.16, 0.15, 0.15])
RED = np.float32([0.905, 0.12, 0.09])


class Canvas:
    def __init__(self, w=1920, h=804, seed=1, paper=PAPER):
        self.w, self.h = w, h
        self.rng = np.random.default_rng(seed)
        self.ink = np.zeros((h, w), np.float32)
        self.tone = np.ones((h, w, 3), np.float32)
        self.glow = np.zeros((h, w, 3), np.float32)
        self.red = np.zeros((h, w), np.float32)
        self.redmask_hard = np.zeros((h, w), np.float32)
        self.paper = paper
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        self.xx, self.yy = xx, yy

    # ── noise ──
    def noise(self, scale=40, octaves=3, seed=None):
        r = np.random.default_rng(self.rng.integers(1 << 30) if seed is None else seed)
        out = np.zeros((self.h, self.w), np.float32)
        amp, tot = 1.0, 0.0
        for o in range(octaves):
            s = max(1, int(scale / (2 ** o)))
            small = r.random((self.h // s + 2, self.w // s + 2)).astype(np.float32)
            out += cv2.resize(small, (self.w + 2 * s, self.h + 2 * s), interpolation=cv2.INTER_CUBIC)[s:s + self.h, s:s + self.w] * amp
            tot += amp
            amp *= 0.5
        return out / tot

    # ── graphite ──
    def _wobble(self, pts, amount):
        pts = np.asarray(pts, np.float32)
        out = [pts[0]]
        for a, b in zip(pts[:-1], pts[1:]):
            L = float(np.hypot(*(b - a)))
            n = max(1, int(L / 28))
            nrm = np.float32([-(b - a)[1], (b - a)[0]]) / max(L, 1e-3)
            ph = self.rng.uniform(0, 6.28)
            for i in range(1, n + 1):
                u = i / n
                off = math.sin(u * math.pi * self.rng.uniform(0.8, 2.2) + ph) * amount * (0.4 + 0.6 * math.sin(u * math.pi))
                out.append(a + (b - a) * u + nrm * off)
        return np.array(out, np.float32)

    def stroke(self, pts, w=1.6, a=0.7, passes=2, jitter=1.0, overshoot=5.0, closed=False):
        """A pencil stroke along a polyline: a few nervous passes, overshooting the corners a little."""
        pts = np.asarray(pts, np.float32)
        if closed:
            pts = np.vstack([pts, pts[:1]])
        if len(pts) < 2:
            return
        lay = np.zeros_like(self.ink)
        for p in range(passes):
            q = pts.copy()
            if overshoot and not closed:
                d0 = q[0] - q[1]
                d1 = q[-1] - q[-2]
                q[0] = q[0] + d0 / max(np.hypot(*d0), 1e-3) * self.rng.uniform(0, overshoot)
                q[-1] = q[-1] + d1 / max(np.hypot(*d1), 1e-3) * self.rng.uniform(0, overshoot)
            q = q + self.rng.normal(0, jitter * 0.6, q.shape).astype(np.float32)
            q = self._wobble(q, jitter * 1.4)
            th = max(1, int(round(w * self.rng.uniform(0.7, 1.15))))
            cv2.polylines(lay, [np.round(q * 4).astype(np.int32)], False, float(a * self.rng.uniform(0.55, 1.0)), int(th), cv2.LINE_AA, shift=2)
        # graphite drags: the line breaks up a little along its length
        grain = 0.75 + 0.25 * self.rng.random(lay.shape).astype(np.float32)
        self.ink = np.maximum(self.ink, lay * grain) * 0.5 + (self.ink + lay * grain * 0.6) * 0.5

    def line(self, p0, p1, **k):
        self.stroke([p0, p1], **k)

    def hatch(self, mask, angle=45, spacing=7, a=0.35, w=1, jitter=0.6):
        """Parallel pencil strokes clipped to a mask (0..1)."""
        if mask.max() <= 0:
            return
        ys, xs = np.nonzero(mask > 0.02)
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        lay = np.zeros_like(self.ink)
        rad = math.radians(angle)
        dx, dy = math.cos(rad), math.sin(rad)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        R = math.hypot(x1 - x0, y1 - y0) / 2 + 10
        k = -R
        while k < R:
            ox, oy = cx - dy * k, cy + dx * k
            p0 = (ox - dx * R, oy - dy * R)
            p1 = (ox + dx * R, oy + dy * R)
            q = np.float32([p0, p1]) + self.rng.normal(0, jitter, (2, 2)).astype(np.float32)
            cv2.line(lay, tuple(int(v) for v in np.round(q[0] * 4)), tuple(int(v) for v in np.round(q[1] * 4)), float(a * self.rng.uniform(0.6, 1.0)), int(w), cv2.LINE_AA, shift=2)
            k += spacing * self.rng.uniform(0.75, 1.25)
        self.ink = np.maximum(self.ink, lay * mask)

    def wash(self, mask, value=0.3, grain=0.35, scale=60):
        """A charcoal wash: darkens by `value` inside a soft mask, unevenly, like rubbed graphite."""
        n = self.noise(scale)
        v = value * (1 - grain + grain * 2 * n) * mask
        self.tone *= (1 - v)[..., None]

    def tint(self, color, amount=1.0, mask=None):
        """The light of an age: a colour cast over everything (or inside a mask)."""
        m = 1.0 if mask is None else mask[..., None]
        self.tone *= 1 - m * amount + m * amount * np.float32(color)

    def light(self, mask, color=(1, 0.95, 0.8), strength=0.5):
        self.glow += mask[..., None] * np.float32(color) * strength

    # ── shapes ──
    def poly_mask(self, pts, feather=1.5):
        m = np.zeros_like(self.ink)
        cv2.fillPoly(m, [np.round(np.asarray(pts, np.float32) * 4).astype(np.int32)], 1.0, cv2.LINE_AA, shift=2)
        return cv2.GaussianBlur(m, (0, 0), feather) if feather else m

    def ellipse_mask(self, c, axes, angle=0, feather=1.5):
        m = np.zeros_like(self.ink)
        cv2.ellipse(m, (int(c[0] * 4), int(c[1] * 4)), (int(axes[0] * 4), int(axes[1] * 4)), angle, 0, 360, 1.0, -1, cv2.LINE_AA, shift=2)
        return cv2.GaussianBlur(m, (0, 0), feather) if feather else m

    def outline(self, mask, w=1.5, a=0.7, passes=2, jitter=1.0, simplify=2.0):
        """Trace a mask's contour with pencil strokes."""
        cs, _ = cv2.findContours((mask > 0.5).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        for c in cs:
            if len(c) < 8:
                continue
            c = cv2.approxPolyDP(c, simplify, True)[:, 0, :].astype(np.float32)
            self.stroke(c, w=w, a=a, passes=passes, jitter=jitter, overshoot=0, closed=True)

    # ── the red figure ──
    def paint_red(self, mask, rough=3.0, seed=None):
        """Flat red, laid on top like the reference: a slightly blobby painted edge, no line, no shade."""
        m = cv2.GaussianBlur(mask, (0, 0), rough)
        n = self.noise(14, 2, seed)
        edge = (m + (n - 0.5) * 0.5 > 0.5).astype(np.float32)
        edge = cv2.GaussianBlur(edge, (0, 0), 0.8)
        self.red = np.maximum(self.red, edge)

    # ── finish ──
    def render(self, vignette=0.25, grain=0.025, red_color=RED):
        base = self.paper[None, None, :] * self.tone
        ink = np.clip(self.ink, 0, 1)[..., None]
        img = base * (1 - ink) + GRAPHITE * ink
        img = img + self.glow * (1 - ink * 0.6)
        d = np.sqrt(((self.xx - self.w / 2) / (self.w / 2)) ** 2 + ((self.yy - self.h / 2) / (self.h / 2)) ** 2)
        img *= (1 - vignette * np.clip((d - 0.5) / 0.9, 0, 1) ** 1.6)[..., None]
        img += self.rng.normal(0, grain, (self.h, self.w, 1)).astype(np.float32)
        # paper tooth
        tooth = self.noise(3, 1, 99)[..., None]
        img *= 0.97 + 0.06 * tooth
        r = self.red[..., None]
        paint = np.float32(red_color) * (0.97 + 0.05 * self.noise(6, 2, 7)[..., None])
        img = img * (1 - r) + paint * r
        return np.clip(img, 0, 1)


# ── a pinhole camera for real perspective ──
class Cam:
    def __init__(self, pos=(0, 1.5, 0), yaw=0.0, pitch=0.0, fov=50, w=1920, h=804):
        self.pos = np.float32(pos)
        self.w, self.h = w, h
        self.f = (w / 2) / math.tan(math.radians(fov) / 2)
        cy, sy = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
        cp, sp = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))
        # world → camera: yaw about Y, then pitch about X. Camera looks down +Z.
        self.R = np.float32([[1, 0, 0], [0, cp, -sp], [0, sp, cp]]) @ np.float32([[cy, 0, -sy], [0, 1, 0], [sy, 0, cy]])

    def p(self, x, y, z):
        c = self.R @ (np.float32([x, y, z]) - self.pos)
        if c[2] < 0.05:
            c[2] = 0.05
        return (self.w / 2 + self.f * c[0] / c[2], self.h / 2 - self.f * c[1] / c[2])

    def depth(self, x, y, z):
        return float((self.R @ (np.float32([x, y, z]) - self.pos))[2])

    def scale(self, x, y, z):
        """Pixels per metre at a world point."""
        return self.f / max(self.depth(x, y, z), 0.05)


def box(cv, cam, x0, x1, y0, y1, z0, z1, faces=None, lines=True, w=1.6, a=0.7):
    """A box in perspective; `faces` = {name: wash value} for 'front','left','right','top'."""
    P = {k: cam.p(*v) for k, v in {
        'a': (x0, y0, z0), 'b': (x1, y0, z0), 'c': (x1, y1, z0), 'd': (x0, y1, z0),
        'e': (x0, y0, z1), 'f': (x1, y0, z1), 'g': (x1, y1, z1), 'h': (x0, y1, z1)}.items()}
    quads = {'front': 'abcd', 'back': 'efgh', 'left': 'aehd', 'right': 'bfgc', 'top': 'dcgh', 'bottom': 'abfe'}
    for name, val in (faces or {}).items():
        cv.wash(cv.poly_mask([P[c] for c in quads[name]], 1.0), val)
    if lines:
        for e in ['ab', 'bc', 'cd', 'da', 'ef', 'fg', 'gh', 'he', 'ae', 'bf', 'cg', 'dh']:
            cv.line(P[e[0]], P[e[1]], w=w, a=a)
    return P


# ── figures ──
POSES = {
    # angles in degrees, 0 = hanging straight down; positive = towards screen-left for 'front' figures
    'stand': dict(torso=0, head=0, ls=8, le=4, rs=-8, re=-4, lh=4, lk=0, rh=-4, rk=0),
    'walk': dict(torso=3, head=2, ls=-22, le=-12, rs=24, re=-20, lh=22, lk=-8, rh=-20, rk=-25),
    'raise': dict(torso=0, head=-4, ls=8, le=4, rs=-170, re=-6, lh=4, lk=0, rh=-4, rk=0),
    'sitfloor': dict(torso=-12, head=-6, ls=20, le=30, rs=10, re=40, lh=90, lk=0, rh=86, rk=2),
    'sitchair': dict(torso=0, head=4, ls=14, le=60, rs=-14, re=-60, lh=90, lk=-90, rh=86, rk=-88),
    'throw': dict(torso=8, head=6, ls=-30, le=-20, rs=-150, re=-40, lh=14, lk=-6, rh=-14, rk=0),
    'phone': dict(torso=6, head=20, ls=40, le=100, rs=-40, re=-100, lh=3, lk=0, rh=-3, rk=0),
    'bar': dict(torso=0, head=8, ls=10, le=4, rs=-172, re=0, lh=4, lk=0, rh=-4, rk=0),
    'dance': dict(torso=-8, head=-12, ls=-120, le=-40, rs=140, re=60, lh=18, lk=-20, rh=-10, rk=0),
    'crouch': dict(torso=30, head=20, ls=40, le=30, rs=-20, re=-30, lh=70, lk=-140, rh=60, rk=-130),
    'cry': dict(torso=25, head=35, ls=50, le=110, rs=-50, re=-110, lh=90, lk=-90, rh=86, rk=-88),
    'lean': dict(torso=-6, head=-4, ls=6, le=2, rs=-6, re=-2, lh=8, lk=0, rh=-2, rk=0),
}

PROPS = dict(head=0.13, neck=0.04, torso=0.31, uarm=0.18, farm=0.16, thigh=0.25, shin=0.24, hip=0.09, shoulder=0.12)
KID = dict(head=0.19, neck=0.03, torso=0.29, uarm=0.16, farm=0.14, thigh=0.22, shin=0.2, hip=0.075, shoulder=0.1)


def rig(base, height, pose, kid=False, side=1.0):
    """Joint positions on screen from the pelvis (`base`) and the figure's height in pixels.
    side = 1 for a figure drawn facing us, -1 mirrors it."""
    P = KID if kid else PROPS
    po = dict(POSES['stand'])
    po.update(POSES[pose] if isinstance(pose, str) else pose)
    H = height
    deg = lambda a: math.radians(a)

    def go(p, ang, L):
        return (p[0] + math.sin(deg(ang)) * L * H * side, p[1] + math.cos(deg(ang)) * L * H)

    pelvis = base
    t = deg(po['torso'])
    chest = (pelvis[0] - math.sin(t) * P['torso'] * H * side, pelvis[1] - math.cos(t) * P['torso'] * H)
    neck = (chest[0] - math.sin(t) * P['neck'] * H * side, chest[1] - math.cos(t) * P['neck'] * H)
    ht = deg(po['head'] + po['torso'])
    head = (neck[0] - math.sin(ht) * P['head'] * H * 0.55 * side, neck[1] - math.cos(ht) * P['head'] * H * 0.55)
    sh = P['shoulder'] * H
    lsh = (chest[0] + math.cos(t) * sh * side * 0.9, chest[1] - math.sin(t) * sh * 0.9 * side)
    rsh = (chest[0] - math.cos(t) * sh * side * 0.9, chest[1] + math.sin(t) * sh * 0.9 * side)
    lel = go(lsh, po['ls'] + po['torso'] * 0.3, P['uarm'])
    lha = go(lel, po['ls'] + po['le'], P['farm'])
    rel = go(rsh, po['rs'] + po['torso'] * 0.3, P['uarm'])
    rha = go(rel, po['rs'] + po['re'], P['farm'])
    hp = P['hip'] * H
    lhip = (pelvis[0] + hp * side * 0.6, pelvis[1])
    rhip = (pelvis[0] - hp * side * 0.6, pelvis[1])
    lkn = go(lhip, po['lh'], P['thigh'])
    lft = go(lkn, po['lh'] + po['lk'], P['shin'])
    rkn = go(rhip, po['rh'], P['thigh'])
    rft = go(rkn, po['rh'] + po['rk'], P['shin'])
    return dict(pelvis=pelvis, chest=chest, neck=neck, head=head, lsh=lsh, rsh=rsh, lel=lel, lha=lha, rel=rel, rha=rha,
                lhip=lhip, rhip=rhip, lkn=lkn, lft=lft, rkn=rkn, rft=rft, H=H, P=P, kid=kid)


def _limb(m, a, b, r0, r1):
    a = np.float32(a)
    b = np.float32(b)
    n = max(2, int(np.hypot(*(b - a)) / 3))
    for i in range(n + 1):
        u = i / n
        p = a + (b - a) * u
        r = r0 + (r1 - r0) * u
        cv2.circle(m, (int(p[0] * 4), int(p[1] * 4)), max(1, int(r * 4)), 1.0, -1, cv2.LINE_AA, shift=2)


def body_mask(cv, J, bulk=1.0, coat=False):
    """The silhouette of a rig: torso, limbs, head — the same shape is used for grey and red figures."""
    m = np.zeros_like(cv.ink)
    H, P = J['H'], J['P']
    u = H * bulk
    # torso: a tapered quad from the shoulders to the hips
    tq = [J['lsh'], J['rsh'], (J['rhip'][0] - (J['lhip'][0] - J['rhip'][0]) * 0.15, J['rhip'][1]), (J['lhip'][0] + (J['lhip'][0] - J['rhip'][0]) * 0.15, J['lhip'][1])]
    cv2.fillPoly(m, [np.round(np.float32(tq) * 4).astype(np.int32)], 1.0, cv2.LINE_AA, shift=2)
    _limb(m, J['chest'], J['pelvis'], 0.085 * u, 0.075 * u)
    _limb(m, J['neck'], J['chest'], 0.035 * u, 0.05 * u)
    for s in 'lr':
        _limb(m, J[s + 'sh'], J[s + 'el'], 0.045 * u, 0.037 * u)
        _limb(m, J[s + 'el'], J[s + 'ha'], 0.035 * u, 0.028 * u)
        cv2.circle(m, (int(J[s + 'ha'][0] * 4), int(J[s + 'ha'][1] * 4)), int(0.032 * u * 4), 1.0, -1, cv2.LINE_AA, shift=2)
        _limb(m, J[s + 'hip'], J[s + 'kn'], 0.06 * u, 0.046 * u)
        _limb(m, J[s + 'kn'], J[s + 'ft'], 0.044 * u, 0.034 * u)
        cv2.ellipse(m, (int(J[s + 'ft'][0] * 4), int(J[s + 'ft'][1] * 4)), (int(0.05 * u * 4), int(0.026 * u * 4)), 0, 0, 360, 1.0, -1, cv2.LINE_AA, shift=2)
    if coat:
        _limb(m, J['chest'], ((J['lkn'][0] + J['rkn'][0]) / 2, (J['lkn'][1] + J['rkn'][1]) / 2), 0.1 * u, 0.11 * u)
    hr = P['head'] * H * 0.5
    cv2.ellipse(m, (int(J['head'][0] * 4), int(J['head'][1] * 4)), (int(hr * 0.82 * 4), int(hr * 4)), 0, 0, 360, 1.0, -1, cv2.LINE_AA, shift=2)
    return cv2.GaussianBlur(m, (0, 0), 0.8)


def grey_figure(cv, J, tone=0.22, hair=0.6, look=-1, facing='front', coat=False, detail=1.0, light_from=-1):
    """A rotoscoped person: pencil contour, a wash for the clothes, a face that looks away."""
    m = body_mask(cv, J, coat=coat)
    cv.wash(m, tone, grain=0.25, scale=30)
    # shade the side away from the light with hatching
    H = J['H']
    if H > 60:
        cx = J['chest'][0]
        side = np.clip((cv.xx - cx) * -light_from / (H * 0.12), 0, 1)
        cv.hatch(m * side, angle=60, spacing=max(3, H * 0.018), a=0.28 * detail)
    cv.outline(m, w=max(1, H / 260), a=0.75, passes=2, jitter=max(0.5, H / 400), simplify=max(1.0, H / 300))
    # head: hair cap, a few features
    hr = J['P']['head'] * H * 0.5
    hx, hy = J['head']
    if hair > 0:
        if facing == 'back':  # the back of the head is mostly hair
            hm = cv.ellipse_mask((hx, hy - hr * 0.1), (hr * 0.86, hr * 0.92), 0, 1.0) * cv.ellipse_mask((hx, hy), (hr * 0.83, hr), 0, 1.0)
        else:
            hm = cv.ellipse_mask((hx, hy - hr * 0.35), (hr * 0.86, hr * 0.7), 0, 1.0) * cv.ellipse_mask((hx, hy), (hr * 0.83, hr), 0, 1.0)
        cv.wash(hm, hair * 0.6, grain=0.3, scale=10)
        if H > 80:
            cv.hatch(hm, angle=100, spacing=max(2, H * 0.008), a=0.4)
    if H > 70 and facing == 'front':
        ex = hr * 0.32
        ey = hy - hr * 0.05
        lk = look * hr * 0.12
        for sx in (-1, 1):
            cv.line((hx + sx * ex + lk - hr * 0.08, ey), (hx + sx * ex + lk + hr * 0.08, ey), w=max(1, H / 240), a=0.8, passes=1, jitter=0.3, overshoot=0)
        cv.line((hx + lk * 0.6, ey + hr * 0.08), (hx + lk * 0.8 + hr * 0.05, ey + hr * 0.32), w=max(1, H / 300), a=0.6, passes=1, jitter=0.3, overshoot=0)
        cv.line((hx - hr * 0.18 + lk * 0.5, hy + hr * 0.5), (hx + hr * 0.18 + lk * 0.5, hy + hr * 0.48), w=max(1, H / 280), a=0.6, passes=1, jitter=0.3, overshoot=0)
    return m


def red_figure(cv, J, bulk=1.06, rough=None, seed=None):
    m = body_mask(cv, J, bulk=bulk)
    cv.paint_red(m, rough=rough if rough is not None else max(1.2, J['H'] / 110), seed=seed)
    return m


def save(img, path):
    cv2.imwrite(path, cv2.cvtColor((img * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 92])
