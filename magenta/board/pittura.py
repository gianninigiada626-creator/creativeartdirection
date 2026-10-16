"""
The painter of MAGENTA: the oil painter of A PARTE, unchanged in its hand (the swirling strokes, the
impasto, the canvas), with the light of a moment in the history of cinema for each chapter, the dyes of an
old colour film fading to magenta, Ada turning into a flat magenta shape as she forgets, and the 1962 film
laid into the screens and walls where it is shown.

    python3 pittura.py <passes-dir> <tag> <out.jpg> --look <name> [--fade f] [--academy] [--seed n]
"""
import argparse
import json
import os
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(HERE, '..', '..', 'a-parte', 'board'))
import paint as AP  # noqa: E402  the painter of A PARTE

cv2.setNumThreads(1)
FILM = os.path.join(HERE, '..', 'build', 'film')
MAGENTA = np.float32([0.84, 0.09, 0.5])

# ── the light of each chapter, after an age of cinema ──────────────────────────────────────────
# the keys are A PARTE's (shadow: what darkness turns into; keep: how much of a dark area's colour
# survives; sat; warm: the colour highlights lean to; gain/gamma; lo/hi: where dark ends and light begins),
# plus `pre`: what is done to the colour before it is graded.
LOOKS = {
    # the nitrate print: black and white, silver, the light of the arc that trembles
    'nitrato': dict(pre='mono', tint=(0.98, 0.96, 0.92), shadow=(0.03, 0.03, 0.035), keep=0.5, sat=1.0, warm=(1, 0.97, 0.92), gain=1.1, gamma=0.95, lo=0.03, hi=0.4),
    # the blue tinting of the silent films: night and cold dyed into the film
    'imbibizione': dict(pre='tint', tint=(0.42, 0.62, 1.0), shadow=(0.02, 0.04, 0.1), keep=0.55, sat=1.1, warm=(0.85, 0.92, 1.0), gain=1.8, gamma=0.82, lo=0.02, hi=0.36),
    # Antonioni's first colour: washed greens and greys, the sea bleached; the false flowers keep their colour
    'deserto': dict(pre='deserto', shadow=(0.12, 0.14, 0.13), keep=0.6, sat=0.95, warm=(0.96, 1.0, 0.96), gain=1.12, gamma=1.0, lo=0.05, hi=0.5),
    'deserto_pioggia': dict(pre='deserto', shadow=(0.1, 0.12, 0.13), keep=0.6, sat=0.85, warm=(0.92, 0.96, 1.0), gain=1.1, gamma=1.0, lo=0.05, hi=0.5),
    # the three nights of the restoration: the monitor floods the lab with one colour
    'ciano': dict(pre=None, shadow=(0.01, 0.05, 0.07), keep=0.5, sat=1.3, warm=(0.8, 1.0, 1.0), gain=1.2, gamma=0.9, lo=0.02, hi=0.35),
    'giallo': dict(pre=None, shadow=(0.06, 0.04, 0.01), keep=0.5, sat=1.3, warm=(1.0, 0.9, 0.6), gain=1.2, gamma=0.9, lo=0.02, hi=0.35),
    'verde': dict(pre=None, shadow=(0.01, 0.05, 0.03), keep=0.55, sat=1.35, warm=(0.85, 1.0, 0.85), gain=1.35, gamma=0.88, lo=0.02, hi=0.33),
    # Technicolor: the fullest colour ever printed, deep blacks
    'technicolor': dict(pre=None, shadow=(0.01, 0.04, 0.06), keep=0.55, sat=1.4, warm=(0.92, 0.96, 1.0), gain=1.25, gamma=0.9, lo=0.02, hi=0.33),
    # Eastmancolor, 1962, as it came out of the bath; and the same film sixty years on, faded to magenta
    'eastman': dict(pre=None, shadow=(0.08, 0.07, 0.07), keep=0.6, sat=1.3, warm=(1.0, 0.94, 0.82), gain=1.05, gamma=1.0, lo=0.04, hi=0.45),
    'sbiadito': dict(pre='faded', shadow=(0.2, 0.08, 0.14), keep=0.65, sat=1.05, warm=(1.0, 0.86, 0.92), gain=1.0, gamma=1.0, lo=0.05, hi=0.5),
    # the restoration, one layer a night: the cyan back (the sky turns blue), then the yellow (the sun on the faces)
    'restauro1': dict(pre='faded', dyes=(1.0, 0.42, 0.96, 0.04), shadow=(0.12, 0.08, 0.12), keep=0.62, sat=1.15, warm=(0.98, 0.9, 0.92), gain=1.02, gamma=1.0, lo=0.05, hi=0.48),
    'restauro2': dict(pre='faded', dyes=(1.0, 0.85, 1.0, 0.02), shadow=(0.09, 0.07, 0.08), keep=0.6, sat=1.22, warm=(1.0, 0.92, 0.84), gain=1.04, gamma=1.0, lo=0.04, hi=0.46),
    # the light table: white light through pink film
    'tavolo': dict(pre=None, shadow=(0.08, 0.06, 0.08), keep=0.6, sat=1.1, warm=(1.0, 0.97, 0.96), gain=1.02, gamma=1.0, lo=0.05, hi=0.5),
    # the lab in the dark, lit only by the monitor
    'buio': dict(pre=None, shadow=(0.02, 0.02, 0.03), keep=0.5, sat=1.15, warm=(1.0, 0.9, 0.96), gain=1.25, gamma=0.9, lo=0.02, hi=0.34),
    # the road to Ostia: sodium, Wong Kar-wai's orange
    'sodio': dict(pre=None, shadow=(0.03, 0.02, 0.02), keep=0.5, sat=1.45, warm=(1.0, 0.72, 0.38), gain=1.35, gamma=0.88, lo=0.02, hi=0.32),
    # the night room: blue, the corridor's sodium through the door
    'notte': dict(pre=None, shadow=(0.02, 0.03, 0.06), keep=0.55, sat=1.2, warm=(1.0, 0.82, 0.6), gain=1.4, gamma=0.85, lo=0.02, hi=0.32),
    # dawn over the western sea: the band of magenta over the Earth's shadow
    'alba': dict(pre=None, shadow=(0.08, 0.06, 0.14), keep=0.6, sat=1.35, warm=(1.0, 0.8, 0.9), gain=1.15, gamma=0.95, lo=0.04, hi=0.42),
    # the morning after: milk white
    'mattino': dict(pre='deserto', shadow=(0.16, 0.17, 0.17), keep=0.7, sat=0.8, warm=(1, 1, 0.98), gain=1.3, gamma=0.95, lo=0.06, hi=0.55),
}


def id_colour(i):
    """The id pass colour of an object id (the same hash as the stage's)."""
    h = (((i + 7) * 2654435761) & 0xFFFFFFFF)
    return (h >> 16) & 255, int(round((0.3 + ((h >> 8) & 255) / 255 * 0.7) * 255)), int(round((0.3 + (h & 255) / 255 * 0.7) * 255))


def fade_dyes(img, cyan=0.22, yellow=0.42, magenta=0.96, fog=0.06):
    """An Eastmancolor print sixty years on. Each channel's density is a dye: red is held back by cyan, green by
    magenta, blue by yellow. The cyan and the yellow fade; the magenta stays, and the picture turns pink."""
    d = -np.log10(np.clip(img, 0.004, 1.0))
    d[..., 0] *= cyan
    d[..., 1] *= magenta
    d[..., 2] *= yellow
    out = 10 ** (-d)
    # the base goes milky and pink with age
    return np.clip(out * (1 - fog) + fog * np.float32([1.0, 0.75, 0.88]), 0, 1).astype(np.float32)


def pre(img, L):
    p = L.get('pre')
    if p == 'mono' or p == 'tint':
        y = img @ np.float32([0.299, 0.587, 0.114])
        return np.clip(y[..., None] * np.float32(L.get('tint', (1, 1, 1))), 0, 1).astype(np.float32)
    if p == 'faded':
        return fade_dyes(img, *L.get('dyes', (0.22, 0.42, 0.96, 0.06)))
    if p == 'deserto':
        return desert(img, 0.62, 0.08)
    return img


def desert(img, keep, veil):
    """Everything washed out toward a pale grey-green, except the one colour that is false."""
    hsv = cv2.cvtColor(img.astype(np.float32), cv2.COLOR_RGB2HSV)
    false_ = (hsv[..., 0] > 290) & (hsv[..., 0] < 345) & (hsv[..., 1] > 0.45)
    hsv[..., 1] = np.where(false_, np.minimum(1, hsv[..., 1] * 1.25), hsv[..., 1] * keep)
    out = cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)
    return np.clip(out * (1 - veil) + veil * np.float32([0.78, 0.84, 0.8]), 0, 1).astype(np.float32)


def figure_mask(idp, fig, seed):
    """Ada's shape, and the part of it that has gone magenta: eaten from the edge inward, as a stain on a frame."""
    if not fig or not fig.get('fade'):
        return None
    r, g, b = id_colour(fig['id'])
    m = (np.abs(idp[..., 0] - r) <= 1) & (np.abs(idp[..., 1] - g) <= 1) & (np.abs(idp[..., 2] - b) <= 1)
    if not m.any():
        return None
    f = float(fig['fade'])
    if f >= 0.999:
        return m
    # the colour goes first from her ends, the hands and the feet and the edge, and last from her face
    dist = cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, 5)
    dn = dist / max(dist.max(), 1e-3)
    h, w = m.shape
    if fig.get('head'):
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        dh = np.hypot(xx - fig['head'][0], yy - fig['head'][1])
        gh = dh / max(dh[m].max(), 1e-3)
        score = 0.65 * gh + 0.35 * (1 - dn)
    else:
        score = 1 - dn
    wob = AP.noise(h, w, 14, seed + 41, 3) - 0.5
    return m & ((score + 0.3 * wob) > 1 - f * 1.05)


def lay_in(canvas, img, corners, mode):
    """The 1962 film laid into a monitor or onto a wall, from its four corners on the picture."""
    h, w = canvas.shape[:2]
    ih, iw = img.shape[:2]
    cs = np.float32(corners)
    # work only on the part of the picture the frame (and its glow) can reach
    pad = {'ghost': 130, 'projection': 70}.get(mode, 45)
    x0, y0 = int(max(0, np.floor(cs[:, 0].min()) - pad)), int(max(0, np.floor(cs[:, 1].min()) - pad))
    x1, y1 = int(min(w, np.ceil(cs[:, 0].max()) + pad)), int(min(h, np.ceil(cs[:, 1].max()) + pad))
    if x1 - x0 < 2 or y1 - y0 < 2:
        return canvas
    bw, bh = x1 - x0, y1 - y0
    src = np.float32([[0, 0], [iw, 0], [iw, ih], [0, ih]])
    M = cv2.getPerspectiveTransform(src, cs - np.float32([x0, y0]))
    warped = cv2.warpPerspective(img, M, (bw, bh), flags=cv2.INTER_AREA)
    mask = cv2.warpPerspective(np.ones((ih, iw), np.float32), M, (bw, bh))
    out = canvas.copy()
    roi = canvas[y0:y1, x0:x1]
    if mode == 'ghost':
        # a face in the black glass of the monitor: a reflection, faint, its edges lost
        soft = cv2.GaussianBlur(mask, (0, 0), 40)[..., None]
        y = warped.mean(axis=2, keepdims=True)
        res = 1 - (1 - roi) * (1 - 0.42 * soft * (0.4 * warped + 0.6 * y))
    elif mode == 'projection':
        # a picture thrown on a rough wall: soft at the edges, the wall's grain through it, a little glow round it
        soft = cv2.GaussianBlur(mask, (0, 0), 2.2)[..., None]
        glow = cv2.GaussianBlur(warped * mask[..., None], (0, 0), 22) * 0.35
        res = roi * (1 - soft * 0.7) + warped * soft * (0.85 + 0.25 * roi.mean(axis=2, keepdims=True)) + glow
    else:
        soft = cv2.GaussianBlur(mask, (0, 0), 0.8)[..., None]
        glow = cv2.GaussianBlur(warped * mask[..., None], (0, 0), 14) * 0.25
        res = roi * (1 - soft) + warped * 0.92 * soft + glow
    out[y0:y1, x0:x1] = np.clip(res, 0, 1)
    return out


def academy(img):
    """1.37:1 inside the 2.39 frame: the middle of the picture, black at the sides."""
    h, w = img.shape[:2]
    cw = int(round(h * 1.37))
    x0 = (w - cw) // 2
    out = np.zeros_like(img)
    out[:, x0:x0 + cw] = img[:, x0:x0 + cw]
    return out


def crop_academy(img):
    h, w = img.shape[:2]
    cw = int(round(h * 1.37))
    x0 = (w - cw) // 2
    return img[:, x0:x0 + cw].copy()


def painting(passdir, tag, look, seed=1, fade=None, screens=None):
    meta = json.load(open(os.path.join(passdir, f'{tag}-meta.json')))
    far = meta.get('far', 200.0)
    col = AP.load(os.path.join(passdir, f'{tag}-color.png'))
    dep = AP.load(os.path.join(passdir, f'{tag}-depth.png'))
    idp = (AP.load(os.path.join(passdir, f'{tag}-id.png')) * 255 + 0.5).astype(np.int32)
    z = np.maximum((dep[..., 0] + dep[..., 1] / 255.0 + dep[..., 2] / 65025.0) * far, 0.05)
    ids = (idp[..., 0] << 16) | (idp[..., 1] << 8) | idp[..., 2]
    fp = os.path.join(passdir, f'{tag}-faces.json')
    faces = json.load(open(fp)) if os.path.exists(fp) else []
    L = LOOKS[look]
    col = pre(col, L)
    none = np.zeros(ids.shape, bool)
    fig = meta.get('figure')
    if fig is not None and fade is not None:
        fig = {**fig, 'fade': fade}
    fm = figure_mask(idp, fig, seed)
    out = AP.paint_arrays(col, z, ids, none, none, faces, L, seed)
    if L.get('pre') == 'deserto':
        # the strokes bring their own colour with them: wash it out again, as the room is
        out = desert(out, 0.75, 0.0)
    elif L.get('pre') in ('mono', 'tint'):
        # black and white stays black and white, or one tint, whatever colour the strokes brought
        tint = np.float32(L.get('tint', (1, 1, 1)))
        y = (out @ np.float32([0.299, 0.587, 0.114])) / float(tint @ np.float32([0.299, 0.587, 0.114]))
        out = np.clip(y[..., None] * tint, 0, 1).astype(np.float32)
    # the 1962 film where it is shown
    for sc in meta.get('screens', []):
        src = (screens or {}).get(sc['name']) or os.path.join(FILM, f"{sc['name']}.jpg")
        if os.path.exists(src):
            img = cv2.cvtColor(cv2.imread(src), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
            out = lay_in(out, img, sc['corners'], sc['mode'])
    # Ada, as much of her as has gone: one flat magenta shape with a hand-cut edge, as the red of A PARTE
    if fm is not None:
        h, w = fm.shape
        m = cv2.GaussianBlur(fm.astype(np.float32), (0, 0), 2.2)
        m = ((m + (AP.noise(h, w, 9, seed + 11, 2) - 0.5) * 0.4) > 0.5).astype(np.float32)
        m = cv2.GaussianBlur(m, (0, 0), 0.8)[..., None]
        paint_m = MAGENTA * (0.96 + 0.05 * AP.noise(h, w, 6, seed + 12, 2)[..., None])
        out = out * (1 - m) + paint_m * m
    return out


def save(img, path):
    cv2.imwrite(path, cv2.cvtColor((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 93])


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('passdir')
    ap.add_argument('tag')
    ap.add_argument('out')
    ap.add_argument('--look', default='deserto')
    ap.add_argument('--fade', type=float)
    ap.add_argument('--seed', type=int, default=1)
    ap.add_argument('--academy', action='store_true', help='show it in 1.37 inside the wide frame')
    ap.add_argument('--film', action='store_true', help='keep only the 1.37 middle: a frame of the 1962 film')
    a = ap.parse_args()
    img = painting(a.passdir, a.tag, a.look, a.seed, a.fade)
    if a.film:
        img = crop_academy(img)
    elif a.academy:
        img = academy(img)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    save(img, a.out)
    print(a.out)
