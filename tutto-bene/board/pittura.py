"""
The painter of FIN QUI TUTTO BENE: the oil painter of A PARTE, in black and white silver like the print of
La Haine, with one colour left in the world: him, the flat red shape with a hand-cut edge, and at the end the
red of the flares and of one letter on the billboard.

    python3 pittura.py <passes-dir> <tag> <out.jpg> --look <name> [--seed n]
"""
import argparse
import importlib.util
import json
import os
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(HERE, '..', '..', 'a-parte', 'board'))
import paint as AP  # noqa: E402  the painter of A PARTE

# MAGENTA's painter has the same module name as this one: load it under another
_spec = importlib.util.spec_from_file_location('magenta_pittura', os.path.join(HERE, '..', '..', 'magenta', 'board', 'pittura.py'))
MP = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(MP)
lay_in, save = MP.lay_in, MP.save   # the lay-in of pictures onto surfaces, and the jpeg writer

cv2.setNumThreads(1)
LUMA = np.float32([0.299, 0.587, 0.114])

# ── the silver: A PARTE's keys (shadow, keep, sat, warm, gain/gamma, lo/hi), all of it black and white ────────
LOOKS = {
    # outside at dawn: the closed blacks and the hard whites of the 35 mm black and white
    'argento': dict(tint=(0.97, 0.98, 1.0), shadow=(0.015, 0.015, 0.018), keep=0.42, sat=1.0, warm=(1, 1, 1), gain=1.12, gamma=1.08, lo=0.04, hi=0.42),
    # the floors: the lamps of the early morning, a little warmer, a little more light
    'interni': dict(tint=(1.0, 0.985, 0.95), shadow=(0.02, 0.018, 0.016), keep=0.45, sat=1.0, warm=(1, 1, 1), gain=1.32, gamma=1.0, lo=0.04, hi=0.45),
    # time stopped: the air, the whites open, the blacks lifted
    'sospeso': dict(tint=(0.97, 0.98, 1.0), shadow=(0.07, 0.07, 0.075), keep=0.6, sat=1.0, warm=(1, 1, 1), gain=1.22, gamma=0.94, lo=0.06, hi=0.52),
}


def mono(img, tint):
    y = img @ LUMA / float(np.float32(tint) @ LUMA)
    return np.clip(y[..., None] * np.float32(tint), 0, 1).astype(np.float32)


def reds(img):
    """Where the picture is red: him, the flares, the letter. Soft, so the hand-cut edge stays as it was cut."""
    r = img[..., 0] - np.maximum(img[..., 1], img[..., 2])
    return np.clip((r - 0.22) / 0.2, 0, 1).astype(np.float32)[..., None]


def painting(passdir, tag, look, seed=1, screens=None, grain=0):
    meta = json.load(open(os.path.join(passdir, f'{tag}-meta.json')))
    far = meta.get('far', 200.0)
    col = AP.load(os.path.join(passdir, f'{tag}-color.png'))
    dep = AP.load(os.path.join(passdir, f'{tag}-depth.png'))
    idp = (AP.load(os.path.join(passdir, f'{tag}-id.png')) * 255 + 0.5).astype(np.int32)
    z = np.maximum((dep[..., 0] + dep[..., 1] / 255.0 + dep[..., 2] / 65025.0) * far, 0.05)
    ids = (idp[..., 0] << 16) | (idp[..., 1] << 8) | idp[..., 2]
    fp = os.path.join(passdir, f'{tag}-faces.json')
    faces = json.load(open(fp)) if os.path.exists(fp) else []
    faces = [f for f in faces if f['pts']['center'][2] > 0.05]
    # him (id 255,0,0) and the red things (255,0,1): flat red over the painting, as in A PARTE
    him = (idp[..., 0] > 150) & (idp[..., 1] < 50) & (idp[..., 2] < 50)
    prop = him & (idp[..., 2] > 0)
    him = him & ~prop
    L = LOOKS[look]
    out = AP.paint_arrays(mono(col, L['tint']), z, ids, him, prop, faces, L, seed)
    # the strokes bring a little colour with them: back to silver, except the red
    keep = reds(out)
    out = mono(out, L['tint']) * (1 - keep) + out * keep
    # paper in the world: the receipt, the letter, the billboard (its red letter stays red)
    for sc in meta.get('screens', []):
        src = (screens or {}).get(sc['name'])
        if sc.get('corners') and src and os.path.exists(src):
            img = cv2.cvtColor(cv2.imread(src), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
            k = reds(img)
            img = mono(img, L['tint']) * (1 - k) + img * k
            out = lay_in(out, img, sc['corners'], sc['mode'], ids)
    if grain:
        # the grain of the stock, a different one on every drawing
        h, w = out.shape[:2]
        g = np.random.default_rng(grain).normal(0, 1, (h // 2, w // 2)).astype(np.float32)
        g = cv2.resize(cv2.GaussianBlur(g, (0, 0), 0.6), (w, h), interpolation=cv2.INTER_LINEAR)[..., None]
        y = out @ LUMA
        amt = 0.035 * (1 - np.abs(y - 0.5) * 1.2)[..., None]
        out = out + g * amt * (1 - keep * 0.7)
    return np.clip(out, 0, 1)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('passdir')
    ap.add_argument('tag')
    ap.add_argument('out')
    ap.add_argument('--look', default='argento')
    ap.add_argument('--seed', type=int, default=1)
    a = ap.parse_args()
    img = painting(a.passdir, a.tag, a.look, a.seed, grain=a.seed + 100)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    save(img, a.out)
    print(a.out)
