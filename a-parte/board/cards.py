"""
The panels that are not a camera looking at a set: the title, the class photograph as a printed object,
the rain over the bus stop, the black at the end. All drawn on the same paper as the stylized panels.
"""
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from stylize import GRAPHITE, PAPER, RED, noise, wobble

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, '..', 'build', 'fonts')
W, H = 1920, 804


def font(name, size, weight=None):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    if weight is not None:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


def text_mask(lines, w=W, h=H):
    """lines: [(text, font, y_center, tracking_px)] → float mask, 1 where graphite goes."""
    im = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(im)
    for text, f, yc, track in lines:
        widths = [d.textlength(ch, font=f) for ch in text]
        total = sum(widths) + track * (len(text) - 1)
        x = (w - total) / 2
        for ch, cw in zip(text, widths):
            d.text((x, yc), ch, font=f, fill=255, anchor='lm')
            x += cw + track
    return np.asarray(im, np.float32) / 255.0


def pencil(mask, seed=3, amp=1.4):
    """A typed mask redrawn by hand: wobble, grain, a little break in the strokes."""
    h, w = mask.shape
    m = wobble(mask, amp, 60, seed)
    grain = 0.72 + 0.28 * np.random.default_rng(seed).random((h, w)).astype(np.float32)
    breaks = np.clip((noise(h, w, 14, seed + 1) - 0.15) * 2.5, 0.55, 1)
    return np.clip(m * grain * breaks, 0, 1)


def paper(w=W, h=H, dark=0.0, seed=7):
    """Warm paper, rubbed with charcoal by `dark` (0 clean, 1 nearly black)."""
    p = PAPER[None, None, :] * (0.96 + 0.06 * noise(h, w, 3, 99, 1)[..., None])
    if dark:
        rub = noise(h, w, 80, seed) * 0.5 + noise(h, w, 8, seed + 1, 2) * 0.5
        wash = np.clip(dark + (rub - 0.5) * 0.12, 0, 0.99)
        p = p * (1 - wash[..., None] * 0.94)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rr = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    p *= (1 - 0.32 * np.clip((rr - 0.55) / 0.85, 0, 1) ** 1.5)[..., None]
    p += np.random.default_rng(seed + 2).normal(0, 0.018, (h, w, 1)).astype(np.float32)
    return p


def ink(img, mask, color):
    return img * (1 - mask[..., None]) + np.float32(color) * mask[..., None]


def red_from(passdir, tag, rough=3.0, seed=1):
    """The protagonist's flat red shape, cut out of a rendered panel's id pass."""
    ids = cv2.cvtColor(cv2.imread(os.path.join(passdir, f'{tag}-id.png')), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    red = ((ids[..., 0] > 0.6) & (ids[..., 1] < 0.2) & (ids[..., 2] < 0.5 / 255)).astype(np.float32)
    h, w = red.shape
    m = cv2.GaussianBlur(red, (0, 0), rough)
    m = ((m + (noise(h, w, 10, seed + 11, 2) - 0.5) * 0.45) > 0.5).astype(np.float32)
    return cv2.GaussianBlur(m, (0, 0), 0.7)


def title_card(passdir, seed=3):
    """04 — A PARTE. Centred, quiet; and to one side, small, sitting against nothing: him."""
    img = paper(dark=0.0)
    big = font('CormorantGaramond[wght].ttf', 150, 500)
    small = font('CormorantGaramond-Italic[wght].ttf', 44, 400)
    m = text_mask([('A PARTE', big, H / 2 - 18, 34), ('aside', small, H / 2 + 92, 10)])
    img = ink(img, pencil(m, seed) * 0.92, GRAPHITE)
    # him, from the car park, small at the right — a parte
    red = red_from(passdir, '02', seed=seed)
    ys, xs = np.nonzero(red > 0.5)
    if len(xs):
        crop = red[ys.min() - 4:ys.max() + 4, xs.min() - 4:xs.max() + 4]
        s = 150 / crop.shape[0]
        crop = cv2.resize(crop, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        ch, cw = crop.shape
        x0, y0 = int(W * 0.81), int(H / 2 + 76 - ch)
        mm = np.zeros((H, W), np.float32)
        mm[y0:y0 + ch, x0:x0 + cw] = crop
        # the ground he sits on: one short pencil stroke
        line = np.zeros((H, W), np.float32)
        cv2.line(line, (x0 - 60, y0 + ch + 2), (x0 + cw + 70, y0 + ch + 2), 1.0, 2, cv2.LINE_AA)
        img = ink(img, pencil(line, seed + 6, 1.2) * 0.8, GRAPHITE)
        img = ink(img, mm, RED)
    return np.clip(img, 0, 1)


def end_card(seed=5):
    """28 — black. Then, very small, the title again."""
    img = paper(dark=0.96, seed=21)
    f = font('CormorantGaramond[wght].ttf', 46, 500)
    m = text_mask([('A PARTE', f, H / 2, 14)])
    img = ink(img, pencil(m, seed, 1.0) * 0.55, (0.86, 0.84, 0.8))
    return np.clip(img, 0, 1)


def photo(raw, passdir, tag='12'):
    """12 — the class photo, printed: three rows on a white border, and on the right edge, half of him."""
    red = red_from(passdir, tag)
    ys, xs = np.nonzero(red > 0.5)
    h, w = raw.shape[:2]
    # the print's frame cuts through the middle of him
    cut = int((xs.min() + xs.max()) / 2) + 2
    rh = ys.max() - ys.min()
    top, bot = max(0, int(ys.min() - rh * 0.45)), min(h, int(ys.max() + rh * 0.55))
    width = int((bot - top) * 1.5)
    left = max(0, cut - width)
    pic = raw[top:bot, left:cut]
    pic = cv2.resize(pic, (int(pic.shape[1] * 1.0), int(pic.shape[0] * 1.0)))
    ph, pw = pic.shape[:2]
    # flash-flat, slightly faded print
    pic = 0.12 + pic * 0.86
    b = 26
    card = np.ones((ph + 2 * b + 30, pw + 2 * b, 3), np.float32) * np.float32([0.95, 0.94, 0.91])
    card[b:b + ph, b:b + pw] = pic
    # the table it lies on
    bg = paper(dark=0.55, seed=31)
    ch, cw = card.shape[:2]
    s = min((H * 0.9) / ch, (W * 0.8) / cw)
    card = cv2.resize(card, (int(cw * s), int(ch * s)), interpolation=cv2.INTER_AREA)
    ch, cw = card.shape[:2]
    M = cv2.getRotationMatrix2D((cw / 2, ch / 2), -2.2, 1.0)
    big = (int(cw * 1.08), int(ch * 1.08))
    M[0, 2] += (big[0] - cw) / 2
    M[1, 2] += (big[1] - ch) / 2
    rot = cv2.warpAffine(card, M, big, borderValue=(0, 0, 0))
    alpha = cv2.warpAffine(np.ones(card.shape[:2], np.float32), M, big)
    x0, y0 = (W - big[0]) // 2 + 30, (H - big[1]) // 2
    shadow = cv2.GaussianBlur(alpha, (0, 0), 14)
    region = bg[y0 + 10:y0 + 10 + big[1], x0 + 14:x0 + 14 + big[0]]
    region *= (1 - shadow[..., None] * 0.55)
    region = bg[y0:y0 + big[1], x0:x0 + big[0]]
    region[:] = region * (1 - alpha[..., None]) + rot * alpha[..., None]
    # its own pencil outline
    edge = cv2.morphologyEx((alpha > 0.5).astype(np.uint8), cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)).astype(np.float32)
    full = np.zeros((H, W), np.float32)
    full[y0:y0 + big[1], x0:x0 + big[0]] = edge
    bg = ink(bg, pencil(full, 4, 1.2) * 0.85, GRAPHITE)
    return np.clip(bg, 0, 1)


def rain(img, seed=5, n=2600, angle=104, amount=0.5):
    """Rain drawn as quick pencil flicks, a little lighter where they cross the dark."""
    h, w = img.shape[:2]
    r = np.random.default_rng(seed)
    m = np.zeros((h, w), np.float32)
    a = np.deg2rad(angle)
    for _ in range(n):
        x, y = r.uniform(-40, w + 40), r.uniform(-40, h)
        L = r.uniform(14, 46)
        cv2.line(m, (int(x * 4), int(y * 4)), (int((x + np.cos(a) * L) * 4), int((y + np.sin(a) * L) * 4)), float(r.uniform(0.3, 1)), 1, cv2.LINE_AA, shift=2)
    m = wobble(m, 0.6, 40, seed)
    lum = img @ np.float32([0.299, 0.587, 0.114])
    light = (lum < 0.45)[..., None]
    streak = np.where(light, np.float32([0.92, 0.92, 0.94]), GRAPHITE)
    mm = (m * amount)[..., None]
    return np.clip(img * (1 - mm) + streak * mm, 0, 1)
