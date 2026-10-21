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
from paint import paint
from stylize import save

HERE = os.path.dirname(os.path.abspath(__file__))
PASSES = os.path.join(HERE, '..', 'build', 'passes')
OUT = os.path.join(HERE, '..', 'out', 'board')

# the colour of each shot's world (see paint.LOOKS), and the moment of the shot that becomes its board panel
LOOK = {
    '01': 'night', '02': 'night', '03': 'night',
    '05': 'home', '06': 'home', '07': 'day', '08': 'day', '09': 'day', '10': 'night',
    '11': 'cold', '12': 'day', '13': 'cold', '14': 'cold', '15': 'party', '16': 'night',
    '17': 'neon', '18': 'cold', '19': 'night', '20': 'night', '21': 'night', '22': 'night', '23': 'nightlit',
    '24': 'dawn', '25': 'dawn', '26': 'dawn', '27': 'dawn',
}
STILL = {
    '01': 8.5, '02': 5, '03': 3, '05': 7.6, '06': 4, '07': 9, '08': 2.2, '09': 0.6, '10': 20, '11': 5, '12': 0,
    '13': 3, '14': 4, '15': 5, '16': 5, '17': 3, '18': 3, '19': 12, '20': 4, '21': 3, '22': 2, '23': 3,
    '24': 7, '25': 14, '26': 6, '27': 6,
}
RENDERED = sorted(LOOK)
CARDS = {'04': lambda seed: cards.title_card(PASSES, seed + 2), '28': lambda seed: cards.end_card(seed + 4)}
ALL = sorted(RENDERED + list(CARDS))
# what happens to a panel after it is painted
POST = {
    '12': lambda img, seed: cards.photo(img, PASSES),
    '13': lambda img, seed: cards.rain(img, seed=5 + seed),
    '14': lambda img, seed: cards.rain(img, seed=8 + seed, n=2200),
}


def draw(tag, seed=1, passdir=None, frame=None, post_seed=None):
    """One panel as a float image: a card, or a rendered set painted in the colour of its world."""
    if tag[:2] in CARDS:
        return CARDS[tag[:2]](seed)
    passdir = passdir or PASSES
    name = frame or tag
    meta = os.path.join(passdir, f'{name}-meta.json')
    if not os.path.exists(meta):
        meta = os.path.join(passdir, 'meta.json')
    far = json.load(open(meta))['far'] if os.path.exists(meta) else 200.0
    img = paint(passdir, name, far=far, look=LOOK.get(tag[:2], 'night'), seed=seed)
    post = POST.get(tag[:2])
    return post(img, seed if post_seed is None else post_seed) if post else img


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
