"""
The painter of BASSA FEDELTÀ: a render made into a thick, scratched, loud painting. Colour laid with a knife
in wide strokes that mix as they go; shadows that turn violet; black contours pulled by hand; then the paint
attacked: hundreds of thin lines scratched and dragged through it in white, red and yellow, and a few
splashes. The people are deep black and flat, their faces a few marks.

    python3 pittura.py <passes-dir> <tag> <out.jpg> [--seed n]

It borrows the brush (strokes, bristles, impasto, canvas) from A PARTE's painter.
"""
import json
import os
import sys

import cv2
import numpy as np

cv2.setNumThreads(1)  # one painter per core: several of them work side by side

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(HERE, '..', '..', 'a-parte', 'board'))  # after our own modules: shots.py is ours
from paint import Strokes, _profiles, _trace, canvas_weave, impasto, load, noise, save, smooth  # noqa: E402

INK = np.float32([0.05, 0.04, 0.06])
SKIN = np.float32([0.05, 0.045, 0.065])
VIOLET = np.float32([0.17, 0.07, 0.3])
DEEP = np.float32([0.3, 0.13, 0.48])
# the colours the paint is scratched with
SCRATCH = np.float32([[0.96, 0.93, 0.86], [0.9, 0.18, 0.14], [0.97, 0.77, 0.12], [0.35, 0.75, 0.95], [0.05, 0.04, 0.06]])


def lum(img):
    return img @ np.float32([0.299, 0.587, 0.114])


def id_colour(i):
    """The id pass colour of an object id, packed as the painter reads it (the same hash as the stage's)."""
    h = (((i + 7) * 2654435761) & 0xFFFFFFFF)
    r = (h >> 16) & 255
    g = 0.3 + ((h >> 8) & 255) / 255 * 0.7
    b = 0.3 + (h & 255) / 255 * 0.7
    return r, int(round(g * 255)), int(round(b * 255))


def passes(passdir, tag, far):
    col = load(os.path.join(passdir, f'{tag}-color.png'))
    dep = load(os.path.join(passdir, f'{tag}-depth.png'))
    idp = (load(os.path.join(passdir, f'{tag}-id.png')) * 255 + 0.5).astype(np.int32)
    z = np.maximum((dep[..., 0] + dep[..., 1] / 255.0 + dep[..., 2] / 65025.0) * far, 0.05)
    ids = (idp[..., 0] << 16) | (idp[..., 1] << 8) | idp[..., 2]
    fp = os.path.join(passdir, f'{tag}-faces.json')
    faces = json.load(open(fp)) if os.path.exists(fp) else []
    mp = os.path.join(passdir, f'{tag}-meta.json')
    if not os.path.exists(mp):
        mp = os.path.join(passdir, 'meta.json')  # a frame of an animated shot: the shot's meta
    people = np.zeros(ids.shape, bool)
    for i in (json.load(open(mp)).get('people', []) if os.path.exists(mp) else []):
        r, g, b = id_colour(i)
        people |= (np.abs(idp[..., 0] - r) <= 1) & (np.abs(idp[..., 1] - g) <= 1) & (np.abs(idp[..., 2] - b) <= 1)
    return col, z, ids, faces, people


def wobble(h, w, seed, amp=3.5):
    """A hand that doesn't draw straight: a slow displacement of the whole picture."""
    dx = (noise(h, w, 260, seed + 1, 2) - 0.5) * 2 * amp
    dy = (noise(h, w, 260, seed + 2, 2) - 0.5) * 2 * amp
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    return xx + dx, yy + dy, dx, dy


# the colour of each place: saturation, how far the dark turns violet (and into what), contrast, how much the
# paint is scratched and dragged
LOOKS = {
    'viola': dict(sat=1.4, val=1.12, violet=0.6, deep=(0.3, 0.13, 0.48), contrast=1.12, scratch=1.0, drag=1.0),
    'giorno': dict(sat=1.35, val=1.08, violet=0.35, deep=(0.32, 0.22, 0.5), contrast=1.1, scratch=0.8, drag=0.9),
    'notte': dict(sat=1.35, val=1.2, violet=0.65, deep=(0.16, 0.12, 0.42), contrast=1.1, scratch=0.9, drag=1.0),
    'tramonto': dict(sat=1.35, val=1.08, violet=0.45, deep=(0.4, 0.14, 0.42), contrast=1.1, scratch=0.9, drag=1.0),
    'inverno': dict(sat=0.9, val=1.05, violet=0.4, deep=(0.22, 0.24, 0.36), contrast=1.05, scratch=0.6, drag=0.7),
    'bianco': dict(sat=0.75, val=1.05, violet=0.2, deep=(0.45, 0.44, 0.48), contrast=1.0, scratch=0.35, drag=0.4),
}


def colour(col, ids, people, look='viola'):
    """Colour in patches, louder: light and shade kept but pressed together, saturation up, shadows violet."""
    L = LOOKS[look]
    c8 = (np.clip(col, 0, 1) * 255).astype(np.uint8)
    flat = cv2.pyrMeanShiftFiltering(c8, 7, 22, maxLevel=2).astype(np.float32) / 255
    out = flat.copy()
    Y = lum(flat)
    for v in np.unique(ids):
        m = ids == v
        if m.sum() < 20:
            continue
        ym = np.median(Y[m])
        k = (ym + (Y[m] - ym) * 0.7) / np.maximum(Y[m], 1e-3)
        out[m] = flat[m] * np.clip(k, 0.5, 1.8)[:, None]
    hsv = cv2.cvtColor(np.clip(out, 0, 1), cv2.COLOR_RGB2HSV)
    hsv[..., 1] = np.clip(hsv[..., 1] * L['sat'], 0, 1)
    hsv[..., 2] = np.clip(hsv[..., 2] * L['val'], 0, 1)
    out = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)
    # a little more contrast, and the dark turns violet instead of grey
    out = np.clip((out - 0.5) * L['contrast'] + 0.5, 0, 1)
    Yo = lum(out)[..., None]
    t = np.clip(1 - Yo / 0.32, 0, 1) * L['violet']
    out = out * (1 - t) + np.float32(L['deep']) * (0.55 + Yo) * t
    # small things with drawing on them (posters, the stereo, a magazine) keep it, so their words still read
    detail = np.zeros(ids.shape, bool)
    Yc = lum(col)
    for v in np.unique(ids):
        m = ids == v
        if 200 < m.sum() < ids.size * 0.06 and Yc[m].std() > 0.09:
            detail |= m
    sharp = np.clip((col - 0.5) * 1.15 + 0.5, 0, 1)
    hs = cv2.cvtColor(sharp, cv2.COLOR_RGB2HSV)
    hs[..., 1] = np.clip(hs[..., 1] * 1.3, 0, 1)
    out[detail] = cv2.cvtColor(hs, cv2.COLOR_HSV2RGB)[detail]
    # the people's skin is one deep black, as in the paintings
    dark = cv2.medianBlur(((lum(col) < 0.16) & people).astype(np.uint8), 5).astype(bool) & ~detail
    out[dark] = SKIN
    return out, dark, detail


def region_flow(ids, seed):
    """Strokes straight, one direction per object (as a painter fills an area), turning to follow its edges."""
    h, w = ids.shape
    r = np.random.default_rng(seed)
    ang = np.zeros((h, w), np.float32)
    for v in np.unique(ids):
        m = ids == v
        ys, xs = np.nonzero(m)
        if len(xs) < 10:
            continue
        a = 0.5 * np.arctan2(2 * np.cov(xs, ys)[0, 1], np.var(xs) - np.var(ys)) if len(xs) > 50 else 0.0
        ang[m] = a + r.normal(0, 0.45)
    ang += (noise(h, w, 120, seed + 8, 2) - 0.5) * 1.2
    e = ((ids != np.roll(ids, 1, 0)) | (ids != np.roll(ids, 1, 1))).astype(np.float32)
    e = cv2.GaussianBlur(e, (0, 0), 3.0)
    ex = cv2.Sobel(e, cv2.CV_32F, 1, 0, ksize=5)
    ey = cv2.Sobel(e, cv2.CV_32F, 0, 1, ksize=5)
    near = smooth(0.02, 0.2, np.sqrt(ex * ex + ey * ey))
    te = np.arctan2(ey, ex) + np.pi / 2
    c2 = (1 - near) * np.cos(2 * ang) + near * np.cos(2 * te)
    s2 = (1 - near) * np.sin(2 * ang) + near * np.sin(2 * te)
    a = 0.5 * np.arctan2(cv2.GaussianBlur(s2, (0, 0), 2), cv2.GaussianBlur(c2, (0, 0), 2))
    return np.cos(a).astype(np.float32), np.sin(a).astype(np.float32)


def knife(canvas, height, ref, fx, fy, ids, R, steps, thresh, seed, jitter, alpha=0.96, spacing=0.8, err_min=None):
    """One layer of wide strokes; each load of paint is mixed differently, a touch of another hue in it."""
    h, w = ids.shape
    r = np.random.default_rng(seed)
    g = max(2.0, R * spacing)
    ys, xs = np.mgrid[g / 2:h - 1:g, g / 2:w - 1:g]
    xs = np.clip((xs + r.uniform(-g / 2, g / 2, xs.shape)).ravel(), 1, w - 2)
    ys = np.clip((ys + r.uniform(-g / 2, g / 2, ys.shape)).ravel(), 1, h - 2)
    if err_min is not None:
        err = cv2.blur(np.abs(canvas - ref).sum(2), (int(g) | 1, int(g) | 1))
        keep = err[ys.astype(int), xs.astype(int)] > err_min
        xs, ys = xs[keep], ys[keep]
    order = r.permutation(len(xs))
    xs, ys = xs[order], ys[order]
    st = Strokes()
    buf = np.zeros((steps + 2, 2), np.float32)
    prof = _profiles(r, len(xs))
    for i in range(len(xs)):
        n = _trace(np.float32(xs[i]), np.float32(ys[i]), np.float32(R), fx, fy, ref, ids, steps, np.float32(thresh), buf)
        c = ref[int(ys[i]), int(xs[i])]
        c = np.clip(c * (1 + r.normal(0, jitter)) * (1 + r.normal(0, jitter * 0.7, 3)), 0, 1)
        st.add(buf[:n].copy(), c, R * r.uniform(0.75, 1.25), alpha, prof[i], r.uniform(0.55, 0.9))
    st.render(canvas, height)


def drags(canvas, height, base, ids, fx, fy, detail, seed, n=340):
    """Paint dragged through paint: lighter, darker, and loud accents, thin and long, across every area."""
    h, w = ids.shape
    r = np.random.default_rng(seed)
    st = Strokes()
    prof = _profiles(r, n)
    for i in range(n):
        x, y = r.uniform(5, w - 5), r.uniform(5, h - 5)
        if detail[int(y), int(x)]:
            continue
        b = base[int(y), int(x)]
        k = r.random()
        if k < 0.5:
            c = np.clip(b + (1 - b) * r.uniform(0.25, 0.6), 0, 1)
        elif k < 0.85:
            c = np.clip(b * r.uniform(0.5, 0.75), 0, 1)
        else:
            c = SCRATCH[r.integers(0, 4)] * r.uniform(0.85, 1.0)
        a = np.arctan2(fy[int(y), int(x)], fx[int(y), int(x)]) + r.normal(0, 0.55)
        L = r.uniform(18, 70)
        pts = np.float32([[x + np.cos(a) * L * t, y + np.sin(a) * L * t] for t in np.linspace(-0.5, 0.5, 8)])
        st.add(pts, c, r.uniform(2.0, 5.0), r.uniform(0.45, 0.75), prof[i], r.uniform(0.25, 0.6))
    st.render(canvas, height)


def scratches(out, base, dark, detail, fx, fy, seed, n=1150):
    """Lines scratched into the wet paint: white and yellow where it is dark, red and black where it is light."""
    h, w = dark.shape
    r = np.random.default_rng(seed)
    layer = np.zeros((h, w), np.float32)
    col = np.zeros((h, w, 3), np.float32)
    Y = lum(base)
    for _ in range(n):
        x, y = int(r.uniform(3, w - 3)), int(r.uniform(3, h - 3))
        if detail[y, x] or (dark[y, x] and r.random() < 0.7):
            continue
        b = base[y, x]
        k = r.random()
        if k < 0.55:
            c = np.clip(b + (1 - b) * 0.7, 0, 1) if Y[y, x] < 0.5 else b * 0.45
        elif k < 0.85:
            c = SCRATCH[0] if Y[y, x] < 0.5 else SCRATCH[4]
        else:
            c = SCRATCH[r.choice([1, 2, 3])]
        a = np.arctan2(fy[y, x], fx[y, x]) + (r.normal(0, 0.35) if r.random() < 0.55 else r.uniform(0, np.pi))
        L = r.uniform(6, 30) if r.random() < 0.85 else r.uniform(35, 80)
        bend = r.normal(0, 0.15)
        pts = [(x + np.cos(a + bend * t) * L * t, y + np.sin(a + bend * t) * L * t) for t in np.linspace(-0.5, 0.5, 5)]
        pts = np.int32([[int(px), int(py)] for px, py in pts])
        v = float(r.uniform(0.35, 0.75))
        cv2.polylines(layer, [pts], False, v, 1 if r.random() < 0.8 else 2, cv2.LINE_AA)
        cv2.polylines(col, [pts], False, tuple(float(q) for q in c), 1 if r.random() < 0.8 else 2, cv2.LINE_AA)
    a = layer[..., None]
    return out * (1 - a) + col * a


def splashes(out, seed, n=110):
    h, w = out.shape[:2]
    r = np.random.default_rng(seed)
    for _ in range(n):
        x, y = int(r.uniform(0, w)), int(r.uniform(0, h))
        c = SCRATCH[r.integers(0, 5)]
        rad = int(r.choice([1, 1, 2, 2, 3]))
        a = r.uniform(0.5, 0.9)
        y0, y1, x0, x1 = max(0, y - rad), min(h, y + rad + 1), max(0, x - rad), min(w, x + rad + 1)
        yy, xx = np.mgrid[y0:y1, x0:x1]
        m = ((yy - y) ** 2 + (xx - x) ** 2 <= rad * rad)[..., None] * a
        out[y0:y1, x0:x1] = out[y0:y1, x0:x1] * (1 - m) + c * m
    return out


def contours(out, base, ids, z, dark, seed):
    """Contours by hand in black, heavy, pressing and lifting; inside the black figures, a pale line."""
    h, w = ids.shape
    e_id = (ids != np.roll(ids, 1, 0)) | (ids != np.roll(ids, 1, 1))
    lz = np.log(z)
    e_z = (np.abs(lz - np.roll(lz, 1, 0)) > 0.05) | (np.abs(lz - np.roll(lz, 1, 1)) > 0.05)
    g8 = (np.clip(lum(base), 0, 1) * 255).astype(np.uint8)
    e_c = cv2.Canny(cv2.GaussianBlur(g8, (0, 0), 2.0), 50, 120) > 0
    e_c &= ~cv2.dilate(dark.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    e_id &= ~(cv2.erode(dark.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool))
    edge = (e_id | e_z | e_c).astype(np.uint8)
    dist = cv2.distanceTransform(1 - edge, cv2.DIST_L2, 3)
    width = 1.0 + 3.6 * np.clip(noise(h, w, 34, seed + 3, 2), 0, 1) ** 1.3
    breaks = noise(h, w, 22, seed + 4, 2) > 0.22
    m = np.clip(width - dist + 0.5, 0, 1) * breaks
    inner = cv2.erode(dark.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    m = np.where(inner, 0, m)[..., None]
    out = out * (1 - m) + INK * m
    ring = (dark & ~cv2.erode(dark.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)) & (noise(h, w, 22, seed + 5, 2) > 0.58)
    pale = cv2.GaussianBlur(ring.astype(np.float32), (0, 0), 0.6)[..., None] * 0.6
    return out * (1 - pale) + SCRATCH[0] * pale


def faces(canvas, height, faces_, z, seed, shift):
    """A face is a few marks on the dark: two eyes, brows, a thin mouth, a blue sheen."""
    r = np.random.default_rng(seed)
    h, w = z.shape
    st = Strokes()
    sx, sy = shift
    for f in faces_:
        # a face too far or too turned to measure comes back empty: nothing to paint there
        if f.get('facing') is None or f.get('px') is None or f['facing'] < 0.1 or f['px'] < 10:
            continue
        P = {}
        for k, v in f['pts'].items():
            x, y = int(np.clip(v[0], 0, w - 1)), int(np.clip(v[1], 0, h - 1))
            P[k] = np.float32([v[0] - sx[y, x], v[1] - sy[y, x], v[2]])
        cx, cy, cz = P['center']
        if z[int(np.clip(cy, 0, h - 1)), int(np.clip(cx, 0, w - 1))] < cz - 0.35:
            continue
        lw = max(1.0, f['px'] * 0.04)
        prof = _profiles(r, 1)[0] * 0.3 + 0.7
        expr = f.get('expr', 'neutral')
        side = f.get('side', 0.0)

        def line(pts, rad, col, alpha=0.9):
            st.add(np.float32([p[:2] for p in pts]), col, rad, alpha, prof, 0.95)

        line([P['browLo'] + np.float32([0, -lw * 3, 0]), P['browRo'] + np.float32([0, -lw * 3, 0])], lw * 1.6, np.float32([0.22, 0.26, 0.5]), 0.5)
        cheek = P['cheekL'] if side >= 0 else P['cheekR']
        line([cheek + np.float32([-lw, -lw, 0]), cheek + np.float32([lw * 2, lw, 0])], lw * 1.2, np.float32([0.3, 0.2, 0.45]), 0.4)
        white = np.float32([0.96, 0.92, 0.82])
        iris = np.float32([0.9, 0.74, 0.2])
        for e, sgn in (('eyeL', 1), ('eyeR', -1)):
            if (side > 0.6 and sgn < 0) or (side < -0.6 and sgn > 0):
                continue
            ex, ey = P[e][0], P[e][1]
            narrow = {'smile': 0.55, 'sad': 0.8, 'shout': 1.15}.get(expr, 0.9)
            line([(ex - lw * 1.6, ey, 0), (ex + lw * 1.6, ey, 0)], lw * 0.95 * narrow, white, 0.95)
            st.add(np.float32([[ex + lw * 0.2 * (1 if side >= 0 else -1), ey]]), iris, lw * 0.75 * narrow, 0.95, prof, 0.99)
            st.add(np.float32([[ex + lw * 0.2 * (1 if side >= 0 else -1), ey]]), INK, lw * 0.4, 0.95, prof, 0.99)
        lift = {'sad': 1.2, 'smile': -0.3, 'shout': -0.8}.get(expr, 0.0) * lw
        for i_, o_, sgn in (('browLi', 'browLo', 1), ('browRi', 'browRo', -1)):
            if (side > 0.6 and sgn < 0) or (side < -0.6 and sgn > 0):
                continue
            a, b = P[i_].copy(), P[o_].copy()
            a[1] -= lift + lw * 0.8
            b[1] -= lw * 0.8
            line([a, b], lw * 0.7, np.float32([0.36, 0.32, 0.44]), 0.85)
        ml, mr, mc = P['mouthL'].copy(), P['mouthR'].copy(), P['mouthC'].copy()
        lip = np.float32([0.55, 0.25, 0.28])
        if expr == 'shout':
            st.add(np.float32([mc[:2] + np.float32([0, lw * 0.6])]), np.float32([0.18, 0.05, 0.07]), lw * 1.5, 0.95, prof, 0.99)
            line([mc + np.float32([-lw * 1.1, -lw * 0.2, 0]), mc + np.float32([lw * 1.1, -lw * 0.2, 0])], lw * 0.35, white, 0.85)
        else:
            curve = {'sad': 1.0, 'smile': -1.3}.get(expr, 0.15) * lw
            ml[1] += curve
            mr[1] += curve
            line([ml, mc + np.float32([0, -curve * 0.3, 0]), mr], lw * 0.55, lip, 0.85)
    st.render(canvas, height)


def paint(passdir, tag, seed=1, far=30.0, look='viola'):
    col, z, ids, faces_, people = passes(passdir, tag, far)
    h, w = ids.shape
    mx, my, dx, dy = wobble(h, w, seed)
    col = cv2.remap(col, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    ids = cv2.remap(ids.astype(np.float32), mx, my, cv2.INTER_NEAREST, borderMode=cv2.BORDER_REFLECT).astype(np.int64)
    people = cv2.remap(people.astype(np.uint8), mx, my, cv2.INTER_NEAREST, borderMode=cv2.BORDER_REFLECT).astype(bool)
    z = cv2.remap(z, mx, my, cv2.INTER_NEAREST, borderMode=cv2.BORDER_REFLECT)
    base, dark, detail = colour(col, ids, people, look)
    L = LOOKS[look]
    fx, fy = region_flow(ids, seed)
    canvas = base * 0.85 + VIOLET * 0.15
    height = np.zeros((h, w), np.float32)
    for i, (R, steps, thresh, jit, err) in enumerate([(30, 5, 0.34, 0.09, None), (16, 4, 0.28, 0.08, 0.1), (8, 3, 0.22, 0.06, 0.12), (3.6, 3, 0.18, 0.04, 0.14)]):
        ref = cv2.GaussianBlur(base, (0, 0), max(0.8, R * 0.18))
        ids_l = ids if R < 10 else np.where(detail, -2 - ids, ids)
        knife(canvas, height, ref, fx, fy, ids_l, R, steps, thresh, seed * 31 + i, jit, err_min=err)
    canvas[detail] = canvas[detail] * 0.35 + base[detail] * 0.65
    drags(canvas, height, base, ids, fx, fy, detail, seed + 9, n=int(200 * L['drag']))
    faces(canvas, height, faces_, z, seed, (dx, dy))
    out = impasto(canvas, height, strength=3.0)
    out = contours(out, base, ids, z, dark, seed)
    out = scratches(out, base, dark, detail, fx, fy, seed + 21, n=int(1150 * L['scratch']))
    out = splashes(out, seed + 23, n=int(110 * L['scratch']))
    out *= canvas_weave(h, w, seed + 77)
    out += np.random.default_rng(seed + 2).normal(0, 0.008, (h, w, 1)).astype(np.float32)
    return np.clip(out, 0, 1)


if __name__ == '__main__':
    passdir, tag, out = sys.argv[1:4]
    seed = int(sys.argv[sys.argv.index('--seed') + 1]) if '--seed' in sys.argv else 1
    look = sys.argv[sys.argv.index('--look') + 1] if '--look' in sys.argv else 'viola'
    meta = os.path.join(passdir, f'{tag}-meta.json')
    far = json.load(open(meta))['far'] if os.path.exists(meta) else 30.0
    save(paint(passdir, tag, seed, far, look), out)
    print('ok', out)
