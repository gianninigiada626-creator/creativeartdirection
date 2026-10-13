"""
Stylize every rendered panel with the light of its age, then lay them out on a contact sheet.

    python3 make.py [ids...]          # all panels when no ids are given
"""
import json
import os
import sys
from multiprocessing import Pool

import cv2
import numpy as np

import cards
from stylize import save, stylize

HERE = os.path.dirname(os.path.abspath(__file__))
PASSES = os.path.join(HERE, '..', 'build', 'passes')
OUT = os.path.join(HERE, '..', 'out', 'board')

SODIUM = (1.0, 0.86, 0.66)
SEPIA = (1.0, 0.92, 0.78)
COLD = (0.88, 0.93, 1.0)
NEON = (0.94, 1.0, 0.92)
DAWN = (0.93, 0.95, 1.0)

TINT = {
    '01': SODIUM, '02': SODIUM, '03': SODIUM,
    '05': SEPIA, '06': SEPIA, '07': SEPIA, '08': SEPIA, '09': SEPIA, '10': SEPIA,
    '11': COLD, '12': COLD, '13': COLD, '14': COLD, '15': COLD, '16': COLD,
    '17': NEON, '18': NEON,
    '19': SODIUM, '20': SODIUM, '21': SODIUM, '22': SODIUM, '23': SODIUM,
    '24': DAWN, '25': DAWN, '26': DAWN, '27': DAWN,
}
RENDERED = sorted(TINT)
CARDS = {'04': lambda seed: cards.title_card(PASSES, seed + 2), '28': lambda seed: cards.end_card(seed + 4)}
ALL = sorted(RENDERED + list(CARDS))
# what happens to a panel after it is drawn
POST = {
    '12': lambda img, seed: cards.photo(img, PASSES),
    '13': lambda img, seed: cards.rain(img, seed=5 + seed),
    '14': lambda img, seed: cards.rain(img, seed=8 + seed, n=2200),
}


def draw(tag, seed=1):
    """One panel as a float image: a card, or a rendered set stylized with the light of its age."""
    if tag[:2] in CARDS:
        return CARDS[tag[:2]](seed)
    meta = os.path.join(PASSES, f'{tag}-meta.json')
    far = json.load(open(meta))['far'] if os.path.exists(meta) else 200.0
    img = stylize(PASSES, tag, far=far, tint=TINT.get(tag[:2], (1, 1, 1)), seed=seed)
    post = POST.get(tag[:2])
    return post(img, seed) if post else img


def one(tag, seed=1, out=None):
    save(draw(tag, seed), out or os.path.join(OUT, f's-{tag}.jpg'))
    return tag


def sheet(tags, path, cols=4, w=480):
    h = int(w * 804 / 1920)
    rows = (len(tags) + cols - 1) // cols
    pad = 14
    S = np.full((rows * (h + pad + 22) + pad, cols * (w + pad) + pad, 3), 235, np.uint8)
    for i, t in enumerate(tags):
        im = cv2.imread(os.path.join(OUT, f's-{t}.jpg'))
        if im is None:
            continue
        r, c = divmod(i, cols)
        y, x = pad + r * (h + pad + 22) + 22, pad + c * (w + pad)
        S[y:y + h, x:x + w] = cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA)
        cv2.putText(S, t, (x, y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (40, 40, 40), 1, cv2.LINE_AA)
    cv2.imwrite(path, S, [cv2.IMWRITE_JPEG_QUALITY, 88])


if __name__ == '__main__':
    tags = sys.argv[1:] or ALL
    os.makedirs(OUT, exist_ok=True)
    with Pool(4) as p:
        for t in p.imap_unordered(one, tags):
            print(t, flush=True)
    sheet(tags, os.path.join(OUT, 'contact.jpg'))
