"""
The painter: turns a panel's render passes into an oil painting in the manner of paint-on-glass animation.
Thousands of brush strokes, coarse to fine, each following the form (a flow field built from the image's
own structure, swirling where the image is quiet), each with bristles, a dry tail and a ridge of paint
that catches the light. The world is graded into deep blue and anthracite with its lights kept vivid;
the protagonist stays one flat red shape on top, as always. Faces are painted with a few strokes.

    python3 paint.py <passes-dir> <tag> <out.jpg> [--look name] [--seed n]
"""
import json
import math
import os
import sys

import cv2
import numba as nb
import numpy as np

RED = np.float32([0.86, 0.1, 0.07])


# ── looks: the colour of each place ────────────────────────────────────────────────────────────
# shadow: the colour darkness turns into; keep: how much of a dark area's own colour survives;
# sat: saturation; warm: the colour highlights lean to; gain/gamma: exposure.
LOOKS = {
    'night':   dict(shadow=(0.035, 0.05, 0.10), keep=0.55, sat=1.35, warm=(1.0, 0.78, 0.45), gain=1.15, gamma=0.9, lo=0.02, hi=0.34),
    'home':    dict(shadow=(0.05, 0.05, 0.1), keep=0.55, sat=1.3, warm=(1.0, 0.8, 0.52), gain=1.15, gamma=0.9, lo=0.02, hi=0.36),
    'day':     dict(shadow=(0.07, 0.09, 0.15), keep=0.55, sat=1.25, warm=(1.0, 0.86, 0.6), gain=1.0, gamma=1.0, lo=0.04, hi=0.42),
    'cold':    dict(shadow=(0.05, 0.07, 0.11), keep=0.5, sat=1.2, warm=(0.85, 0.92, 1.0), gain=1.0, gamma=1.0, lo=0.04, hi=0.42),
    'party':   dict(shadow=(0.04, 0.03, 0.08), keep=0.4, sat=1.5, warm=(1.0, 0.75, 0.55), gain=1.1, gamma=0.9, lo=0.03, hi=0.4),
    'neon':    dict(shadow=(0.04, 0.07, 0.08), keep=0.5, sat=1.2, warm=(0.9, 1.0, 0.85), gain=1.0, gamma=1.0, lo=0.04, hi=0.42),
    'dawn':    dict(shadow=(0.06, 0.08, 0.15), keep=0.55, sat=1.3, warm=(1.0, 0.8, 0.7), gain=1.0, gamma=1.0, lo=0.04, hi=0.45),
    'nightlit': dict(shadow=(0.035, 0.05, 0.10), keep=0.65, sat=1.35, warm=(1.0, 0.78, 0.45), gain=1.45, gamma=0.85, lo=0.02, hi=0.3),
    'card':    dict(shadow=(0.05, 0.06, 0.1), keep=0.5, sat=1.0, warm=(1, 1, 1), gain=1.0, gamma=1.0, lo=0.03, hi=0.4),
}


def load(path):
    im = cv2.imread(path, cv2.IMREAD_COLOR)
    return cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0


def noise(h, w, scale, seed, octaves=3):
    r = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    a, tot = 1.0, 0.0
    for o in range(octaves):
        s = max(1, int(scale / 2 ** o))
        small = r.random((h // s + 3, w // s + 3)).astype(np.float32)
        out += cv2.resize(small, (w + 3 * s, h + 3 * s), interpolation=cv2.INTER_CUBIC)[s:s + h, s:s + w] * a
        tot += a
        a *= 0.5
    return out / tot


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def grade(img, look):
    """Darkness into deep blue and anthracite; colour where the light is, warmer and more saturated."""
    L = LOOKS[look] if isinstance(look, str) else look
    img = np.clip(img * L['gain'], 0, 1) ** L['gamma']
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    hsv[..., 1] = np.clip(hsv[..., 1] * L['sat'], 0, 1)
    img = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)
    Y = img @ np.float32([0.299, 0.587, 0.114])
    w = smooth(L['lo'], L['hi'], Y)[..., None]
    sh = np.float32(L['shadow'])
    dark = img * L['keep'] * (0.6 + 0.8 * sh / max(sh.max(), 1e-3)) + sh * (1 - L['keep'])
    out = dark * (1 - w) + img * w
    hl = smooth(0.55, 1.0, Y)[..., None]
    out = out * (1 - 0.25 * hl) + out * np.float32(L['warm']) * 0.25 * hl * 1.15
    return np.clip(out, 0, 1)


# ── orientation of the strokes ─────────────────────────────────────────────────────────────────
def flow(img, depth, ids, seed, swirl=420.0):
    """Unit tangent field: along the image's edges where it has them, a slow swirl where it doesn't."""
    h, w = ids.shape
    Y = cv2.GaussianBlur(img @ np.float32([0.299, 0.587, 0.114]), (0, 0), 2.0)
    gx = cv2.Sobel(Y, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(Y, cv2.CV_32F, 0, 1, ksize=3)
    ld = np.log(np.maximum(depth, 1e-3))
    dx = cv2.Sobel(ld, cv2.CV_32F, 1, 0, ksize=3)
    dy = cv2.Sobel(ld, cv2.CV_32F, 0, 1, ksize=3)
    e = ((ids != np.roll(ids, 1, 0)) | (ids != np.roll(ids, 1, 1))).astype(np.float32)
    e = cv2.GaussianBlur(e, (0, 0), 2.0)
    ex = cv2.Sobel(e, cv2.CV_32F, 1, 0, ksize=3)
    ey = cv2.Sobel(e, cv2.CV_32F, 0, 1, ksize=3)
    gx = gx + 0.15 * np.clip(dx, -1, 1) + 0.6 * ex
    gy = gy + 0.15 * np.clip(dy, -1, 1) + 0.6 * ey
    s = 7.0
    J11 = cv2.GaussianBlur(gx * gx, (0, 0), s)
    J12 = cv2.GaussianBlur(gx * gy, (0, 0), s)
    J22 = cv2.GaussianBlur(gy * gy, (0, 0), s)
    tr = J11 + J22
    det = np.sqrt((J11 - J22) ** 2 + 4 * J12 * J12)
    coh = det / (tr + 1e-6)
    strength = smooth(0.001, 0.02, tr) * smooth(0.1, 0.5, coh)
    theta = 0.5 * np.arctan2(2 * J12, J11 - J22) + np.pi / 2  # along the edges, not across
    # the swirl: a stream function's curl, big and slow
    psi = noise(h, w, swirl, seed + 31, 1) + 0.25 * noise(h, w, swirl / 3, seed + 32, 1)
    sx = cv2.Sobel(psi, cv2.CV_32F, 0, 1, ksize=5)
    sy = -cv2.Sobel(psi, cv2.CV_32F, 1, 0, ksize=5)
    phi = np.arctan2(sy, sx)
    c2 = strength * np.cos(2 * theta) + (1 - strength) * np.cos(2 * phi)
    s2 = strength * np.sin(2 * theta) + (1 - strength) * np.sin(2 * phi)
    c2 = cv2.GaussianBlur(c2, (0, 0), 3)
    s2 = cv2.GaussianBlur(s2, (0, 0), 3)
    a = 0.5 * np.arctan2(s2, c2)
    return np.cos(a).astype(np.float32), np.sin(a).astype(np.float32)


# ── strokes ────────────────────────────────────────────────────────────────────────────────────
@nb.njit(cache=True)
def _trace(x0, y0, R, fx, fy, ref, ids, steps, thresh, out):
    h, w = ids.shape
    c0 = ref[int(y0), int(x0)]
    idv = ids[int(y0), int(x0)]
    half = steps // 2
    # backwards, then forwards from the start point; the stroke is centred where it was placed
    back = np.zeros((half + 1, 2), np.float32)
    nb_ = 0
    for direction in (-1.0, 1.0):
        px, py = x0, y0
        pdx, pdy = 0.0, 0.0
        n = 0
        limit = half if direction < 0 else steps - half
        for k in range(limit):
            ix, iy = int(px), int(py)
            dx = fx[iy, ix] * direction
            dy = fy[iy, ix] * direction
            if k > 0:
                if dx * pdx + dy * pdy < 0:
                    dx, dy = -dx, -dy
                dx = 0.55 * dx + 0.45 * pdx
                dy = 0.55 * dy + 0.45 * pdy
                ln = math.sqrt(dx * dx + dy * dy) + 1e-6
                dx /= ln
                dy /= ln
            nx = px + dx * R * 0.6
            ny = py + dy * R * 0.6
            if nx < 1 or ny < 1 or nx > w - 2 or ny > h - 2:
                break
            if ids[int(ny), int(nx)] != idv:
                break
            c = ref[int(ny), int(nx)]
            d = abs(c[0] - c0[0]) + abs(c[1] - c0[1]) + abs(c[2] - c0[2])
            if k >= 1 and d > thresh:
                break
            px, py, pdx, pdy = nx, ny, dx, dy
            if direction < 0:
                back[n, 0] = px
                back[n, 1] = py
                nb_ = n + 1
            else:
                out[nb_ + 1 + n, 0] = px
                out[nb_ + 1 + n, 1] = py
            n += 1
        if direction < 0:
            for j in range(nb_):
                out[j, 0] = back[nb_ - 1 - j, 0]
                out[j, 1] = back[nb_ - 1 - j, 1]
            out[nb_, 0] = x0
            out[nb_, 1] = y0
        else:
            return nb_ + 1 + n
    return nb_ + 1


@nb.njit(cache=True)
def _render(canvas, height, pts, offs, cols, rads, alph, prof, dry):
    H, W = height.shape
    for s in range(len(offs) - 1):
        a0, a1 = offs[s], offs[s + 1]
        r = rads[s]
        L = 0.0
        for i in range(a0, a1 - 1):
            L += math.sqrt((pts[i + 1, 0] - pts[i, 0]) ** 2 + (pts[i + 1, 1] - pts[i, 1]) ** 2)
        single = a1 - a0 < 2
        if single:
            L = r
        sacc = 0.0
        nseg = 1 if single else a1 - a0 - 1
        for i in range(nseg):
            p0x, p0y = pts[a0 + i, 0], pts[a0 + i, 1]
            if single:
                p1x, p1y = p0x + 0.5, p0y
            else:
                p1x, p1y = pts[a0 + i + 1, 0], pts[a0 + i + 1, 1]
            dx, dy = p1x - p0x, p1y - p0y
            sl2 = dx * dx + dy * dy + 1e-6
            sl = math.sqrt(sl2)
            xa = int(max(0.0, min(p0x, p1x) - r - 1))
            xb = int(min(W - 1.0, max(p0x, p1x) + r + 1))
            ya = int(max(0.0, min(p0y, p1y) - r - 1))
            yb = int(min(H - 1.0, max(p0y, p1y) + r + 1))
            for y in range(ya, yb + 1):
                for x in range(xa, xb + 1):
                    t = ((x - p0x) * dx + (y - p0y) * dy) / sl2
                    if t < 0.0:
                        t = 0.0
                    elif t > 1.0:
                        t = 1.0
                    cx = p0x + t * dx
                    cy = p0y + t * dy
                    dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
                    if dist > r:
                        continue
                    cr = (dx * (y - p0y) - dy * (x - p0x)) / sl
                    u = cr / r
                    if u > 1.0:
                        u = 1.0
                    elif u < -1.0:
                        u = -1.0
                    v = (sacc + t * sl) / (L + 1e-6)
                    # a brush is narrower where it lands and where it lifts
                    taper = min(1.0, v / 0.12 + 0.45, (1.0 - v) / 0.2 + 0.25)
                    au = abs(u)
                    if au > taper:
                        continue
                    bi = int((u * 0.5 + 0.5) * 15.999)
                    b = prof[s, bi]
                    # the dry end of the stroke: bristles give out one by one
                    if v > dry[s] and b < (v - dry[s]) / (1.0 - dry[s] + 1e-6) * 1.15:
                        continue
                    edge = (taper - au) / 0.25
                    if edge > 1.0:
                        edge = 1.0
                    a = alph[s] * edge
                    sh = 0.9 + 0.2 * b
                    for k in range(3):
                        canvas[y, x, k] = canvas[y, x, k] * (1.0 - a) + cols[s, k] * sh * a
                    # paint is thickest in the middle of the stroke and pushed up at its edges
                    hh = 0.55 + 0.3 * (1.0 - u * u) + 0.25 * au * au * au + 0.15 * b
                    height[y, x] = height[y, x] * (1.0 - 0.7 * a) + hh * a
            sacc += sl


class Strokes:
    def __init__(self):
        self.pts, self.offs, self.cols, self.rads, self.alph, self.prof, self.dry = [], [0], [], [], [], [], []

    def add(self, pts, col, r, alpha, prof, dry):
        self.pts.append(pts)
        self.offs.append(self.offs[-1] + len(pts))
        self.cols.append(col)
        self.rads.append(r)
        self.alph.append(alpha)
        self.prof.append(prof)
        self.dry.append(dry)

    def render(self, canvas, height):
        if not self.cols:
            return
        _render(canvas, height, np.concatenate(self.pts).astype(np.float32), np.int64(self.offs), np.float32(self.cols),
                np.float32(self.rads), np.float32(self.alph), np.float32(self.prof), np.float32(self.dry))


def _profiles(r, n):
    """Bristles across a brush: a few thick ones, a few thin, a soft gap here and there."""
    p = r.random((n, 16)).astype(np.float32)
    for _ in range(2):
        p = (p + np.roll(p, 1, 1) + np.roll(p, -1, 1)) / 3
    p = (p - p.min(1, keepdims=True)) / (np.ptp(p, 1, keepdims=True) + 1e-6)
    amp = r.uniform(0.35, 1.0, (n, 1)).astype(np.float32)
    return np.clip(1 - amp * (1 - p), 0, 1)


def paint_layer(canvas, height, ref, fx, fy, ids, R, steps, thresh, seed, spacing=0.9, err_min=None, mask=None, alpha=0.95, jitter=0.06):
    h, w = ids.shape
    r = np.random.default_rng(seed)
    g = max(2.0, R * spacing)
    ys, xs = np.mgrid[g / 2:h - 1:g, g / 2:w - 1:g]
    xs = (xs + r.uniform(-g / 2, g / 2, xs.shape)).ravel()
    ys = (ys + r.uniform(-g / 2, g / 2, ys.shape)).ravel()
    xs = np.clip(xs, 1, w - 2)
    ys = np.clip(ys, 1, h - 2)
    if err_min is not None:
        err = np.abs(canvas - ref).sum(2)
        err = cv2.blur(err, (int(g) | 1, int(g) | 1))
        keep = err[ys.astype(int), xs.astype(int)] > err_min
        if mask is not None:
            keep |= mask[ys.astype(int), xs.astype(int)] > 0.5
        xs, ys = xs[keep], ys[keep]
    order = r.permutation(len(xs))
    xs, ys = xs[order], ys[order]
    st = Strokes()
    buf = np.zeros((steps + 2, 2), np.float32)
    prof = _profiles(r, len(xs))
    for i in range(len(xs)):
        n = _trace(np.float32(xs[i]), np.float32(ys[i]), np.float32(R), fx, fy, ref, ids, steps, np.float32(thresh), buf)
        c = ref[int(ys[i]), int(xs[i])]
        # every brushload is mixed a little differently
        c = np.clip(c * (1 + r.normal(0, jitter * 0.8, 3)) * (1 + r.normal(0, jitter)) + r.normal(0, jitter * 0.12, 3), 0, 1)
        st.add(buf[:n].copy(), c, R * r.uniform(0.85, 1.15), alpha, prof[i], r.uniform(0.5, 0.8))
    st.render(canvas, height)
    return len(xs)


# ── faces ──────────────────────────────────────────────────────────────────────────────────────
def paint_faces(canvas, height, faces, depth_m, ids, seed):
    """A few strokes for a face: eyes, brows, the shadow of the nose, a mouth. Expression lives in their angles."""
    r = np.random.default_rng(seed)
    h, w = ids.shape
    st = Strokes()
    for f in faces:
        if f['facing'] < 0.05 or f['px'] < 9:
            continue
        P = {k: np.float32(v) for k, v in f['pts'].items()}
        cx, cy, cz = P['center']
        ix, iy = int(np.clip(cx, 0, w - 1)), int(np.clip(cy, 0, h - 1))
        # hidden behind something nearer
        if depth_m[iy, ix] < cz - 0.35:
            continue
        px = f['px']
        lw = max(0.9, px * 0.028)
        skin = canvas[int(np.clip(P['noseTip'][1], 0, h - 1)), int(np.clip(P['noseTip'][0], 0, w - 1))].copy()
        dark = np.float32([0.07, 0.05, 0.06])
        brow_c = skin * 0.35
        lip = np.clip(skin * np.float32([0.62, 0.42, 0.42]), 0, 1)
        expr = f.get('expr', 'neutral')
        prof = _profiles(r, 1)[0] * 0.3 + 0.7
        side = f.get('side', 0.0)

        def line(a, b, rad, col, alpha=0.9, bend=0.0):
            a, b = np.float32(a[:2]), np.float32(b[:2])
            m = (a + b) / 2 + np.float32([0, bend])
            pts = np.stack([a, (a + m) / 2, m, (m + b) / 2, b]).astype(np.float32)
            st.add(pts, col, rad, alpha, prof, 0.95)

        def dot(p, rad, col, alpha=0.95):
            st.add(np.float32([p[:2]]), col, rad, alpha, prof, 0.99)

        eye_w = np.linalg.norm(P['eyeL'][:2] - P['eyeR'][:2]) * 0.28
        down = {'sad': 0.6, 'cry': 1.0, 'focus': 1.3, 'tired': 0.8}.get(expr, 0.0)
        for e, sgn in (('eyeL', 1), ('eyeR', -1)):
            # the far eye goes when the head turns away from us
            if (side > 0.55 and sgn < 0) or (side < -0.55 and sgn > 0):
                continue
            ex, ey = P[e][0], P[e][1]
            if expr in ('cry', 'focus'):
                line((ex - eye_w, ey + 0.2 * lw), (ex + eye_w, ey + 0.2 * lw), lw * 0.9, dark, 0.85, bend=lw * 0.9)
            else:
                dot((ex, ey + down * lw * 0.3), lw * 1.35, dark)
                dot((ex + lw * 0.35, ey - lw * 0.35), lw * 0.4, np.float32([0.9, 0.88, 0.85]), 0.8)
        # brows: sorrow lifts their inner ends, a smile relaxes them
        lift = {'sad': 1.4, 'cry': 2.0, 'smile': -0.3, 'focus': 0.2, 'tired': 0.5}.get(expr, 0.0) * lw
        for i_, o_, sgn in (('browLi', 'browLo', 1), ('browRi', 'browRo', -1)):
            if (side > 0.55 and sgn < 0) or (side < -0.55 and sgn > 0):
                continue
            a, b = P[i_].copy(), P[o_].copy()
            a[1] -= lift
            line(a, b, lw * 0.75, brow_c, 0.8)
        # the nose: a shadow on its far side
        nt, nb_ = P['noseTop'], P['noseTip']
        off = np.float32([lw * 0.8 * (1 if side >= 0 else -1), 0, 0])
        line(nt + off, nb_ + off, lw * 0.7, skin * 0.62, 0.65)
        dot(nb_ + np.float32([0, lw * 0.4, 0]), lw * 0.8, skin * 0.55, 0.6)
        # the mouth: corners down for grief, up for a smile, a little open when singing or shouting
        curve = {'sad': 1.2, 'cry': 1.8, 'smile': -1.5, 'shout': 0.0, 'focus': 0.3}.get(expr, 0.2) * lw
        ml, mr, mc = P['mouthL'].copy(), P['mouthR'].copy(), P['mouthC']
        ml[1] += curve
        mr[1] += curve
        if expr == 'shout':
            dot(mc, lw * 2.2, dark, 0.9)
        st.add(np.stack([ml[:2], mc[:2] + np.float32([0, -curve * 0.3]), mr[:2]]).astype(np.float32), lip, lw * 0.85, 0.85, prof, 0.95)
        if expr == 'cry':
            for e in ('eyeL', 'eyeR'):
                p = P[e]
                line(p + np.float32([0, lw * 1.5, 0]), p + np.float32([lw * 0.5, lw * 6, 0]), lw * 0.45, np.float32([0.75, 0.8, 0.9]), 0.55)
        # a warm touch on the cheeks
        for c in ('cheekL', 'cheekR'):
            dot(P[c], lw * 2.0, np.clip(skin * np.float32([1.08, 0.92, 0.88]), 0, 1), 0.25)
    st.render(canvas, height)


# ── the whole painting ─────────────────────────────────────────────────────────────────────────
def impasto(canvas, height, strength=2.6, light=(-0.55, -0.65, 0.52)):
    Hm = cv2.GaussianBlur(height, (0, 0), 0.8)
    nx = -cv2.Sobel(Hm, cv2.CV_32F, 1, 0, ksize=3) * strength
    ny = -cv2.Sobel(Hm, cv2.CV_32F, 0, 1, ksize=3) * strength
    nz = np.ones_like(nx)
    n = np.sqrt(nx * nx + ny * ny + 1)
    l = np.float32(light) / np.linalg.norm(light)
    d = (nx * l[0] + ny * l[1] + nz * l[2]) / n
    shade = 0.86 + 0.14 * d / l[2]
    hv = l + np.float32([0, 0, 1])
    hv /= np.linalg.norm(hv)
    spec = np.clip((nx * hv[0] + ny * hv[1] + nz * hv[2]) / n, 0, 1) ** 60 * 0.06
    return np.clip(canvas * shade[..., None] + spec[..., None], 0, 1)


def canvas_weave(h, w, seed):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    weave = 0.5 + 0.25 * np.sin(xx * 1.9) * np.sin(yy * 1.7) + 0.25 * noise(h, w, 2, seed, 1)
    return (0.965 + 0.05 * weave)[..., None]


def paint(passdir, tag, far=200.0, look='night', seed=1, faces=None, scale=1.0, red_rough=2.5):
    """A rendered panel (its four passes and its faces) into a painting."""
    col = load(os.path.join(passdir, f'{tag}-color.png'))
    dep = load(os.path.join(passdir, f'{tag}-depth.png'))
    idp = (load(os.path.join(passdir, f'{tag}-id.png')) * 255 + 0.5).astype(np.int32)
    d = dep[..., 0] + dep[..., 1] / 255.0 + dep[..., 2] / 65025.0
    z = np.maximum(d * far, 0.05)
    ids = (idp[..., 0] << 16) | (idp[..., 1] << 8) | idp[..., 2]
    him = (idp[..., 0] > 150) & (idp[..., 1] < 50) & (idp[..., 2] < 50)
    prop = him & (idp[..., 2] > 0)
    him = him & ~prop
    if faces is None:
        fp = os.path.join(passdir, f'{tag}-faces.json')
        faces = json.load(open(fp)) if os.path.exists(fp) else []
    return paint_arrays(col, z, ids, him, prop, faces, look, seed, scale, red_rough)


def paint_arrays(col, z, ids, him, prop, faces, look, seed, scale=1.0, red_rough=2.5, graded=False):
    h, w = col.shape[:2]
    L = LOOKS[look] if isinstance(look, str) else look
    img = col if graded else grade(col, L)
    # paint the world as if he weren't there: his shape is filled from around it, then laid flat on top
    if him.any():
        img = cv2.inpaint((img * 255).astype(np.uint8), (cv2.dilate(him.astype(np.uint8), np.ones((5, 5), np.uint8))) * 255, 5, cv2.INPAINT_TELEA).astype(np.float32) / 255
        ids = ids.copy()
        ids[him] = -1
    fx, fy = flow(img, z, ids, seed)
    canvas = np.empty((h, w, 3), np.float32)
    canvas[:] = np.float32(L['shadow'])
    canvas *= (0.85 + 0.3 * noise(h, w, 40, seed + 5))[..., None]
    height = np.zeros((h, w), np.float32)
    s = scale
    # coarse to fine: a ground of big swirling strokes, then detail only where the picture needs it
    layers = [(30 * s, 30, 0.7, None), (16 * s, 20, 0.5, 0.24), (8 * s, 12, 0.34, 0.17), (3.8 * s, 7, 0.24, 0.12)]
    fmask = np.zeros((h, w), np.float32)
    for f in faces:
        if f.get('facing', 0) > 0 and f['px'] > 12:
            cx, cy = f['pts']['center'][:2]
            cv2.circle(fmask, (int(cx), int(cy)), int(f['px'] * 0.6), 1.0, -1)
    for i, (R, steps, thresh, err) in enumerate(layers):
        ref = cv2.GaussianBlur(img, (0, 0), max(0.8, R * 0.35))
        paint_layer(canvas, height, ref, fx, fy, ids, R, steps, thresh, seed * 101 + i, err_min=err, mask=fmask if i >= 2 else None,
                    alpha=0.96 if i == 0 else 0.9, jitter=0.1 if i < 2 else 0.05)
    paint_faces(canvas, height, faces, z, ids, seed)
    out = impasto(canvas, height)
    out *= canvas_weave(h, w, seed + 77)
    # vignette into the dark
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rr = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    vg = np.clip((rr - 0.6) / 0.8, 0, 1) ** 1.6
    out = out * (1 - 0.45 * vg[..., None]) + np.float32(L['shadow']) * 0.45 * vg[..., None]
    # him: flat red, a hand-cut edge; the rare red things keep a crisper one
    if him.any() or prop.any():
        m = cv2.GaussianBlur(him.astype(np.float32), (0, 0), red_rough)
        m = ((m + (noise(h, w, 9, seed + 11, 2) - 0.5) * 0.4) > 0.5).astype(np.float32)
        mp = cv2.GaussianBlur(prop.astype(np.float32), (0, 0), 0.8)
        mp = ((mp + (noise(h, w, 4, seed + 13, 2) - 0.5) * 0.3) > 0.45).astype(np.float32)
        m = cv2.GaussianBlur(np.maximum(m, mp), (0, 0), 0.8)[..., None]
        paint_red = RED * (0.97 + 0.04 * noise(h, w, 6, seed + 12, 2)[..., None])
        out = out * (1 - m) + paint_red * m
    out += np.random.default_rng(seed + 2).normal(0, 0.01, (h, w, 1)).astype(np.float32)
    return np.clip(out, 0, 1)


def paint_ground(h, w, top, bottom, seed=1, look='card'):
    """A painted ground with nothing on it: dark colour laid in big swirling strokes (title cards, a table)."""
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    base = np.float32(top) * (1 - t) + np.float32(bottom) * t
    base = np.broadcast_to(base, (h, w, 3)).copy()
    base *= (0.8 + 0.4 * noise(h, w, 180, seed + 3, 2))[..., None]
    z = np.full((h, w), 10.0, np.float32)
    ids = np.zeros((h, w), np.int32)
    none = np.zeros((h, w), bool)
    return paint_arrays(np.clip(base, 0, 1), z, ids, none, none, [], look, seed, graded=True)


def save(img, path):
    cv2.imwrite(path, cv2.cvtColor((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 93])


if __name__ == '__main__':
    passdir, tag, out = sys.argv[1:4]
    kw = {}
    for k in ('look', 'seed', 'far'):
        if f'--{k}' in sys.argv:
            v = sys.argv[sys.argv.index(f'--{k}') + 1]
            kw[k] = v if k == 'look' else (int(v) if k == 'seed' else float(v))
    if 'far' not in kw:
        meta = os.path.join(passdir, f'{tag}-meta.json')
        kw['far'] = json.load(open(meta))['far'] if os.path.exists(meta) else 200.0
    save(paint(passdir, tag, **kw), out)
