"""
The storyboard of BASSA FEDELTÀ: render every panel's passes on the stage, then paint them.

    python3 make.py              → build/passes/<id>-*.png, out/board/<id>.jpg
    python3 make.py 04 05        → only those panels

The gallery (13) hangs the painted living room (02) on its wall, so 02 is painted before 13 is rendered.
The stage must be served from the repository root on :8090.
"""
import json
import os
import subprocess
import sys
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import pittura
from shots import SHOTS

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
PASSES = os.path.join(ROOT, 'build', 'passes')
BOARD = os.path.join(ROOT, 'out', 'board')

# the light of each place
LOOK = {'01': 'viola', '02': 'viola', '03': 'viola', '04': 'giorno', '05': 'tramonto', '06': 'notte', '07': 'notte', '08': 'notte',
        '09': 'tramonto', '10': 'tramonto', '11': 'inverno', '12': 'notte', '13': 'bianco', '14': 'giorno', '15': 'notte', '16': 'viola'}


def render(ids):
    if ids:
        subprocess.run(['node', os.path.join(ROOT, 'engine3d', 'passes.mjs'), PASSES, *ids], check=True)


FONTS = os.path.join(ROOT, 'build', 'fonts')


def letter(img, text, size, centre, colour=(0.95, 0.92, 0.86), font='Anton.ttf', tilt=-2.5, seed=1):
    """Words painted on: the letters in cream with a black edge, their outline gone ragged like a brush's."""
    h, w = img.shape[:2]
    f = ImageFont.truetype(os.path.join(FONTS, font), size)
    layer = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(layer)
    box = d.textbbox((0, 0), text, font=f)
    d.text((centre[0] - (box[2] - box[0]) / 2, centre[1] - (box[3] - box[1]) / 2 - box[1]), text, font=f, fill=255)
    layer = layer.rotate(tilt, resample=Image.BICUBIC, center=centre)
    m = np.asarray(layer).astype(np.float32) / 255
    rough = pittura.noise(h, w, 3, seed, 2) - 0.5
    m = np.clip((cv2.GaussianBlur(m, (0, 0), 1.2) + rough * 0.5 - 0.5) * 6 + 0.5, 0, 1)
    edge = np.clip(cv2.dilate(m, np.ones((9, 9), np.uint8)) - m, 0, 1)[..., None]
    out = img * (1 - edge) + pittura.INK * edge
    paint_ = np.float32(colour) * (0.93 + 0.1 * pittura.noise(h, w, 6, seed + 1, 2)[..., None])
    return out * (1 - m[..., None]) + paint_ * m[..., None]


def paint_one(i):
    meta = json.load(open(os.path.join(PASSES, f'{i}-meta.json')))
    img = pittura.paint(PASSES, i, seed=int(i) + 1, far=meta['far'], look=LOOK[i])
    if i == '16':
        img = letter(img, 'BASSA FEDELTÀ', 190, (720, 330), seed=16)
    pittura.save(img, os.path.join(BOARD, f'{i}.jpg'))
    return i


def paint(ids, procs=4):
    os.makedirs(BOARD, exist_ok=True)
    with Pool(procs) as p:
        for i in p.imap_unordered(paint_one, ids):
            print('painted', i, flush=True)


if __name__ == '__main__':
    ids = sys.argv[1:] or [s['id'] for s in SHOTS]
    first = [i for i in ids if i != '13']
    render(first)
    paint(first)
    if '13' in ids:
        render(['13'])
        paint(['13'], 1)
