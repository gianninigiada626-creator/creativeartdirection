"""
An engraved map of Ancona on old paper, drawn from code: the elbow of land ("ankon") with the
port in its crook, the Passetto cliffs, the straight axis of Corso Garibaldi and Viale della Vittoria,
Monte Conero to the south-east. Stylised, not surveyed.

The explorer's route and the stops are exported for the film (route.json); the map is build/map.png.
"""
import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, 'build')
F = os.path.join(HERE, 'fonts')
MW, MH = 3200, 2000
SS = 2  # supersampling

INK = (52, 38, 28)
RED = (168, 38, 30)
PAPER = (232, 216, 180)

COAST = [(0, 1150), (400, 1120), (800, 1090), (1050, 1060), (1180, 1010), (1240, 930), (1300, 900), (1380, 930), (1450, 900),
         (1460, 820), (1420, 760), (1440, 690), (1500, 620), (1560, 560), (1640, 520), (1720, 540), (1780, 600), (1900, 700),
         (2050, 800), (2200, 880), (2350, 960), (2500, 1060), (2650, 1180), (2780, 1320), (2900, 1480), (3000, 1600),
         (3100, 1700), (3200, 1760)]
LAND = COAST + [(3200, 2000), (0, 2000)]
MOLO_NORD = [(1500, 620), (1420, 600), (1330, 615), (1250, 650)]
MOLO_SUD = [(1180, 1010), (1150, 960), (1120, 890)]
CORSO = [(1470, 860), (1530, 875), (1610, 888), (1750, 900)]
VIALE = [(1750, 900), (1950, 925), (2150, 950), (2320, 978)]

STOPS = {
    'grotte': (2392, 1004, 'GROTTE DEL PASSETTO'),
    'scogli': (2452, 1052, 'GLI SCOGLI'),
    'piazza': (1612, 912, 'P.ZZA ROMA'),
    'bar': (1528, 878, 'IL BAR'),
    'porto': (1340, 612, 'IL MOLO'),
}
# the explorer's way, stop to stop (map pixels)
LEGS = {
    'grotte-scogli': [(2392, 1004), (2420, 1030), (2452, 1052)],
    'scogli-piazza': [(2452, 1052), (2380, 1000), (2320, 978), (2150, 950), (1950, 925), (1750, 900), (1660, 905), (1612, 912)],
    'piazza-bar': [(1612, 912), (1610, 888), (1530, 875), (1528, 878)],
    'bar-porto': [(1528, 878), (1470, 860), (1460, 800), (1450, 740), (1470, 670), (1500, 625), (1420, 603), (1340, 612)],
}


def font(name, size):
    return ImageFont.truetype(os.path.join(F, name), int(size * SS))


def S(pts):
    return [(x * SS, y * SS) for (x, y) in pts]


def spaced(draw, xy, text, fnt, fill, spacing=0.0, anchor='mm'):
    """Text with extra letter spacing (old maps spread their labels)."""
    if not spacing:
        draw.text(xy, text, font=fnt, fill=fill, anchor=anchor)
        return
    widths = [draw.textlength(ch, font=fnt) for ch in text]
    total = sum(widths) + spacing * SS * (len(text) - 1)
    x = xy[0] - total / 2
    for ch, w in zip(text, widths):
        draw.text((x, xy[1]), ch, font=fnt, fill=fill, anchor='lm')
        x += w + spacing * SS


def paper(rng):
    w, h = MW * SS, MH * SS
    base = np.zeros((h // 8, w // 8, 3), np.float32) + np.float32(PAPER)
    # stains and foxing, then folds
    for _ in range(60):
        cx, cy, r = rng.uniform(0, w // 8), rng.uniform(0, h // 8), rng.uniform(10, 90)
        yy, xx = np.mgrid[0:h // 8, 0:w // 8]
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r
        base -= (np.exp(-d ** 2) * rng.uniform(4, 18))[..., None] * np.float32([0.8, 1.0, 1.4])
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    a = np.asarray(img).astype(np.float32)
    a += rng.normal(0, 5, (h, w, 1)).astype(np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    edge = np.minimum(np.minimum(xx, w - xx), np.minimum(yy, h - yy)) / (60 * SS)
    a *= (0.78 + 0.22 * np.clip(edge, 0, 1))[..., None]
    for fx in [w / 3, 2 * w / 3]:
        a *= (1 - 0.07 * np.exp(-((xx - fx) / (3 * SS)) ** 2))[..., None]
    a *= (1 - 0.07 * np.exp(-((yy - h / 2) / (3 * SS)) ** 2))[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def hatch_sea(img, rng):
    """Engraved sea: wavy horizontal lines, denser near the coast."""
    sea = Image.new('L', img.size, 0)
    ImageDraw.Draw(sea).polygon(S(LAND), fill=0)
    d = ImageDraw.Draw(sea)
    d.rectangle([0, 0, img.size[0], img.size[1]], fill=255)
    d.polygon(S(LAND), fill=0)
    lines = Image.new('L', img.size, 0)
    dl = ImageDraw.Draw(lines)
    for y in range(0, MH * SS, 14 * SS):
        pts = [(x, y + math.sin(x / (55 * SS) + y * 0.013) * 3 * SS) for x in range(0, MW * SS + 40, 20 * SS)]
        dl.line(pts, fill=150, width=SS)
    # coastal ripples: offset copies of the coastline
    for k, a in [(10, 170), (22, 120), (38, 80), (58, 50)]:
        off = [(x + k * 0.3, y - k) for (x, y) in COAST]
        dl.line(S(off), fill=a, width=SS)
    lines = Image.composite(lines, Image.new('L', img.size, 0), sea)
    ink = Image.new('RGB', img.size, (70, 84, 96))
    img.paste(ink, (0, 0), lines.point(lambda v: int(v * 0.55)))


def town(draw, rng):
    """Blocks of the old town and the newer grid, hatched lightly."""
    for (cx, cy, rx, ry, n) in [(1600, 760, 170, 150, 70), (1660, 900, 260, 90, 80), (2050, 960, 300, 60, 60), (1350, 1050, 200, 60, 30)]:
        for _ in range(n):
            x = cx + rng.uniform(-rx, rx)
            y = cy + rng.uniform(-ry, ry)
            w, h = rng.uniform(16, 42), rng.uniform(12, 30)
            box = [x * SS, y * SS, (x + w) * SS, (y + h) * SS]
            draw.rectangle(box, outline=INK + (150,), width=SS)
            for k in range(0, int(w), 6):
                draw.line([((x + k) * SS, y * SS), ((x + k) * SS, (y + h) * SS)], fill=INK + (60,), width=1)


def icon_church(d, x, y, s=1.0):
    x, y = x * SS, y * SS
    u = 10 * SS * s
    d.polygon([(x - 2 * u, y), (x + 2 * u, y), (x + 2 * u, y - 2 * u), (x - 2 * u, y - 2 * u)], outline=INK, width=2 * SS)
    d.polygon([(x - 2.3 * u, y - 2 * u), (x, y - 3.4 * u), (x + 2.3 * u, y - 2 * u)], outline=INK, width=2 * SS)
    d.ellipse([x - 0.9 * u, y - 4.6 * u, x + 0.9 * u, y - 2.9 * u], outline=INK, width=2 * SS)
    d.line([(x, y - 4.6 * u), (x, y - 5.6 * u)], fill=INK, width=2 * SS)
    d.line([(x - 0.4 * u, y - 5.2 * u), (x + 0.4 * u, y - 5.2 * u)], fill=INK, width=2 * SS)


def icon_arch(d, x, y, s=1.0):
    x, y = x * SS, y * SS
    u = 9 * SS * s
    d.rectangle([x - 2 * u, y - 3 * u, x + 2 * u, y], outline=INK, width=2 * SS)
    d.arc([x - u, y - 2.2 * u, x + u, y - 0.2 * u], 180, 360, fill=INK, width=2 * SS)
    d.line([(x - u, y - 1.2 * u), (x - u, y)], fill=INK, width=2 * SS)
    d.line([(x + u, y - 1.2 * u), (x + u, y)], fill=INK, width=2 * SS)


def icon_temple(d, x, y, s=1.0):
    x, y = x * SS, y * SS
    u = 9 * SS * s
    d.ellipse([x - 2 * u, y - 0.6 * u, x + 2 * u, y + 0.6 * u], outline=INK, width=2 * SS)
    for k in range(-2, 3):
        d.line([(x + k * 0.9 * u, y), (x + k * 0.9 * u, y - 2.4 * u)], fill=INK, width=2 * SS)
    d.arc([x - 2 * u, y - 3.6 * u, x + 2 * u, y - 1.2 * u], 180, 360, fill=INK, width=2 * SS)


def icon_ship(d, x, y, s=1.0):
    x, y = x * SS, y * SS
    u = 10 * SS * s
    d.polygon([(x - 3 * u, y - u), (x + 3 * u, y - u), (x + 2.2 * u, y), (x - 2.2 * u, y)], outline=INK, width=2 * SS)
    d.rectangle([x - 1.2 * u, y - 2.2 * u, x + 1.2 * u, y - u], outline=INK, width=2 * SS)
    d.line([(x + 0.4 * u, y - 2.2 * u), (x + 0.4 * u, y - 3.2 * u)], fill=INK, width=3 * SS)


def mole(d, x, y, r=34):
    pts = [(x + r * math.cos(a), y + r * math.sin(a)) for a in [math.radians(-90 + 72 * k) for k in range(5)]]
    d.polygon(S(pts), outline=INK, width=3 * SS)
    inner = [(x + 0.55 * (px - x), y + 0.55 * (py - y)) for (px, py) in pts]
    d.polygon(S(inner), outline=INK, width=2 * SS)


def compass(d, x, y, r=120):
    X, Y, R = x * SS, y * SS, r * SS
    d.ellipse([X - R, Y - R, X + R, Y + R], outline=INK, width=2 * SS)
    d.ellipse([X - R * 0.86, Y - R * 0.86, X + R * 0.86, Y + R * 0.86], outline=INK, width=SS)
    for k in range(8):
        a = math.radians(k * 45 - 90)
        L = R * (1.0 if k % 2 == 0 else 0.6)
        w = R * 0.12
        tip = (X + math.cos(a) * L, Y + math.sin(a) * L)
        l = (X + math.cos(a + math.pi / 2) * w, Y + math.sin(a + math.pi / 2) * w)
        rr = (X + math.cos(a - math.pi / 2) * w, Y + math.sin(a - math.pi / 2) * w)
        d.polygon([tip, l, (X, Y)], fill=INK)
        d.polygon([tip, rr, (X, Y)], outline=INK, width=SS)
    spaced(d, (X, Y - R * 1.22), 'N', font('im-fell.woff', 56), INK)


def hills(d, rng):
    """Monte Conero and the hills behind the town, in old hachures."""
    for (cx, cy, r, n) in [(2980, 1820, 210, 90), (2200, 1500, 260, 60), (1300, 1500, 300, 50), (700, 1650, 260, 40)]:
        for _ in range(n):
            a = rng.uniform(0, math.pi * 2)
            rr = r * math.sqrt(rng.uniform(0.05, 1))
            x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr * 0.6
            L = 14 * (1.2 - rr / r)
            d.line(S([(x, y), (x + math.cos(a) * L, y + math.sin(a) * L * 0.6)]), fill=INK + (130,), width=SS)


def main():
    os.makedirs(B, exist_ok=True)
    rng = np.random.default_rng(7)
    img = paper(rng).convert('RGB')
    hatch_sea(img, rng)
    over = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    # land tint and the engraved coastline (a heavy line and a fine one)
    d.polygon(S(LAND), fill=(214, 192, 150, 70))
    d.line(S(COAST), fill=INK, width=5 * SS, joint='curve')
    d.line(S([(x + 6, y + 8) for (x, y) in COAST]), fill=INK + (140,), width=SS, joint='curve')
    for molo in [MOLO_NORD, MOLO_SUD]:
        d.line(S(molo), fill=INK, width=9 * SS, joint='curve')
    hills(d, rng)
    town(d, rng)
    # the straight axis: Corso Garibaldi and Viale della Vittoria
    for road in [CORSO, VIALE]:
        d.line(S([(x, y - 6) for x, y in road]), fill=INK, width=2 * SS)
        d.line(S([(x, y + 6) for x, y in road]), fill=INK, width=2 * SS)
    small = font('im-fell-italic.woff', 30)
    mid = font('im-fell.woff', 40)
    d.text((1690 * SS, 862 * SS), 'Corso Garibaldi', font=small, fill=INK, anchor='mm')
    d.text((2040 * SS, 912 * SS), 'Viale della Vittoria', font=small, fill=INK, anchor='mm')
    # landmarks
    icon_church(d, 1660, 590, 1.2)
    d.text((1660 * SS, 625 * SS), 'S. Ciriaco', font=small, fill=INK, anchor='mm')
    icon_arch(d, 1450, 660, 1.0)
    d.text((1478 * SS, 650 * SS), 'Arco di Traiano', font=font('im-fell-italic.woff', 24), fill=INK, anchor='lm')
    mole(d, 1290, 960)
    d.text((1290 * SS, 1018 * SS), 'Mole Vanvitelliana', font=font('im-fell-italic.woff', 24), fill=INK, anchor='mm')
    icon_temple(d, 2330, 960, 1.1)
    icon_ship(d, 1200, 800, 1.4)
    icon_ship(d, 900, 560, 1.0)
    d.text((1255 * SS, 860 * SS), 'IL PORTO', font=mid, fill=INK, anchor='mm')
    spaced(d, (2480 * SS, 900 * SS), 'IL PASSETTO', font('im-fell.woff', 44), INK, 6)
    d.text((2985 * SS, 1720 * SS), 'M. Conero', font=font('im-fell-italic.woff', 40), fill=INK, anchor='mm')
    spaced(d, (1900 * SS, 300 * SS), 'MARE  ADRIATICO', font('im-fell-italic.woff', 96), (60, 72, 84), 22)
    compass(d, 420, 380)
    # cartouche
    cx, cy = 560, 1700
    d.rectangle([(cx - 380) * SS, (cy - 150) * SS, (cx + 380) * SS, (cy + 150) * SS], fill=PAPER + (235,), outline=INK, width=3 * SS)
    d.rectangle([(cx - 362) * SS, (cy - 132) * SS, (cx + 362) * SS, (cy + 132) * SS], outline=INK, width=SS)
    spaced(d, (cx * SS, (cy - 50) * SS), 'ANCONA', font('im-fell.woff', 110), INK, 18)
    d.text((cx * SS, (cy + 40) * SS), 'pianta della città', font=font('im-fell-italic.woff', 40), fill=INK, anchor='mm')
    d.text((cx * SS, (cy + 90) * SS), "con l'itinerario dell'esploratore", font=font('im-fell-italic.woff', 30), fill=INK, anchor='mm')
    # stops: a small red ring and the name
    lab = font('im-fell.woff', 30)
    place = {'grotte': (30, -26, 'lm'), 'scogli': (30, 28, 'lm'), 'piazza': (0, 40, 'mm'), 'bar': (0, -38, 'mm'), 'porto': (0, 48, 'mm')}
    for key, (x, y, name) in STOPS.items():
        d.ellipse([(x - 12) * SS, (y - 12) * SS, (x + 12) * SS, (y + 12) * SS], outline=RED, width=3 * SS)
        dx, dy, anchor = place[key]
        d.text(((x + dx) * SS, (y + dy) * SS), name, font=lab, fill=RED, anchor=anchor)
    img = img.convert('RGBA')
    img.alpha_composite(over)
    img = img.filter(ImageFilter.GaussianBlur(0.6 * SS)).resize((MW, MH), Image.LANCZOS).convert('RGB')
    img.save(os.path.join(B, 'map.png'))
    json.dump({'size': [MW, MH], 'stops': {k: v[:2] for k, v in STOPS.items()}, 'legs': LEGS}, open(os.path.join(B, 'route.json'), 'w'))
    print('map →', os.path.join(B, 'map.png'))


if __name__ == '__main__':
    main()
