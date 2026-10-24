"""Disegni tecnici in piano (flat) della Tuta della Festa — Collezione 01 "Borgata".

Genera due tavole SVG:
  brand/03-collezione-01-borgata/giacca-della-festa/tavola-tecnica.svg
  brand/03-collezione-01-borgata/pantalone-della-festa/tavola-tecnica.svg

Le coordinate sono in cm (taglia base 3), y verso il basso, origine al centro davanti.
I disegni in piano sono indicativi: le misure vincolanti sono nella scheda tecnica.

Uso: python3 brand/strumenti/flats_borgata.py
"""

import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "03-collezione-01-borgata"

INK = "#1a1a1a"
GREY_FILL = "#ffffff"
LINING = "#efd3cf"      # rosa cipria (fodera)
MELTON = "#bdbdbd"      # sottocollo in melton
FONT = "Inter, Helvetica Neue, Arial, sans-serif"


# ── geometria ────────────────────────────────────────────────────────────────

def add(a, b):
    return (a[0] + b[0], a[1] + b[1])


def mul(a, k):
    return (a[0] * k, a[1] * k)


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def bez(p0, p1, p2, p3, n=48):
    pts = []
    for i in range(n + 1):
        t = i / n
        mt = 1 - t
        x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
        y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def seg(p0, p1, n=2):
    return [lerp(p0, p1, i / (n - 1)) for i in range(n)]


def chain(*parts):
    out = []
    for part in parts:
        if out and math.dist(out[-1], part[0]) < 1e-6:
            out.extend(part[1:])
        else:
            out.extend(part)
    return out


def mirror(pts):
    return [(-x, y) for x, y in pts]


def rev(pts):
    return list(reversed(pts))


def length(pts):
    return sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def point_at(pts, s):
    """Punto e tangente unitaria alla distanza s lungo la polilinea."""
    acc = 0.0
    for i in range(len(pts) - 1):
        d = math.dist(pts[i], pts[i + 1])
        if acc + d >= s or i == len(pts) - 2:
            t = 0 if d == 0 else min(max((s - acc) / d, 0), 1)
            p = lerp(pts[i], pts[i + 1], t)
            tan = ((pts[i + 1][0] - pts[i][0]) / d, (pts[i + 1][1] - pts[i][1]) / d) if d else (1, 0)
            return p, tan
        acc += d
    return pts[-1], (1, 0)


def sub_path(pts, s0, s1, step=0.5):
    n = max(2, int((s1 - s0) / step) + 1)
    return [point_at(pts, s0 + (s1 - s0) * i / (n - 1))[0] for i in range(n)]


def offset(pts, d):
    out = []
    for i, p in enumerate(pts):
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, len(pts) - 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        L = math.hypot(tx, ty) or 1
        out.append((p[0] - ty / L * d, p[1] + tx / L * d))
    return out


# ── SVG ──────────────────────────────────────────────────────────────────────

class Sheet:
    def __init__(self, w, h, scale):
        self.w, self.h, self.k = w, h, scale
        self.els = []
        self.ox, self.oy = 0, 0
        self.flip = 1

    def view(self, ox, oy, flip=1):
        self.ox, self.oy, self.flip = ox, oy, flip

    def T(self, p):
        return (self.ox + p[0] * self.k * self.flip, self.oy + p[1] * self.k)

    def poly(self, pts, close=False, sw=1.4, fill="none", dash=None, color=INK, cap="round"):
        d = "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in map(self.T, pts))
        if close:
            d += " Z"
        extra = f' stroke-dasharray="{dash}"' if dash else ""
        self.els.append(
            f'<path d="{d}" fill="{fill}" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linejoin="round" stroke-linecap="{cap}"{extra}/>'
        )

    def circle(self, c, r, sw=1.0, fill="#fff"):
        x, y = self.T(c)
        self.els.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r * self.k:.2f}" '
                        f'fill="{fill}" stroke="{INK}" stroke-width="{sw}"/>')

    def button(self, c, r=0.75):
        self.circle(c, r, sw=1.0)
        for dx, dy in ((-0.2, -0.2), (0.2, -0.2), (-0.2, 0.2), (0.2, 0.2)):
            x, y = self.T((c[0] + dx, c[1] + dy))
            self.els.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="0.9" fill="{INK}"/>')

    def text(self, x, y, s, size=12, weight=400, anchor="start", color=INK, ls=0):
        s = s.replace("&", "&amp;").replace("<", "&lt;")
        self.els.append(
            f'<text x="{x:.1f}" y="{y:.1f}" font-family="{FONT}" font-size="{size}" '
            f'font-weight="{weight}" text-anchor="{anchor}" fill="{color}" '
            f'letter-spacing="{ls}">{s}</text>'
        )

    def rect(self, x, y, w, h, fill="none", sw=1, color=INK):
        self.els.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" '
                        f'stroke="{color}" stroke-width="{sw}"/>')

    def callout(self, n, at, label_pos):
        """Numero cerchiato in label_pos (cm) con linea guida verso at (cm)."""
        a, b = self.T(at), self.T(label_pos)
        self.els.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" '
                        f'stroke="#c0392b" stroke-width="0.9"/>')
        self.els.append(f'<circle cx="{a[0]:.1f}" cy="{a[1]:.1f}" r="2.2" fill="#c0392b"/>')
        self.els.append(f'<circle cx="{b[0]:.1f}" cy="{b[1]:.1f}" r="9" fill="#fff" '
                        f'stroke="#c0392b" stroke-width="1.2"/>')
        self.els.append(
            f'<text x="{b[0]:.1f}" y="{b[1] + 3.6:.1f}" font-family="{FONT}" font-size="10" '
            f'font-weight="700" text-anchor="middle" fill="#c0392b">{n}</text>'
        )

    def save(self, path):
        path.parent.mkdir(parents=True, exist_ok=True)
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" '
            f'viewBox="0 0 {self.w} {self.h}">\n'
            f'<rect width="100%" height="100%" fill="#ffffff"/>\n' + "\n".join(self.els) + "\n</svg>\n"
        )
        path.write_text(svg, encoding="utf-8")


def faggoting(sh, pts, w=0.95, step=0.62):
    """Giunzione a giorno: due bordi paralleli con il filo a zig-zag nel vuoto."""
    a, b = offset(pts, -w / 2), offset(pts, w / 2)
    band = chain(a, rev(b))
    sh.poly(band, close=True, sw=0.01, fill=LINING, color=LINING)
    sh.poly(a, sw=1.0)
    sh.poly(b, sw=1.0)
    L = length(pts)
    zz = []
    s, side = 0.0, 0
    while s <= L:
        p, t = point_at(pts, s)
        nx, ny = -t[1], t[0]
        k = (w / 2) * (1 if side else -1)
        zz.append((p[0] + nx * k, p[1] + ny * k))
        s += step
        side ^= 1
    sh.poly(zz, sw=0.55)


def zip_teeth(sh, top, bottom, w=0.55, step=0.42):
    sh.poly([top, bottom], sw=0.8)
    y = top[1]
    while y < bottom[1]:
        sh.poly([(-w, y), (w, y)], sw=0.6)
        y += step


def pick_stitch(sh, pts):
    sh.poly(pts, sw=0.7, dash="0.6 3.4")


def drape(sh, p, q, sw=0.6):
    sh.poly(bez(p, lerp(p, q, 0.3), lerp(p, q, 0.7), q, 12), sw=sw)


# ── GIACCA DELLA FESTA ───────────────────────────────────────────────────────

def jacket_geometry(alpha_deg=56):
    g = {}
    a = math.radians(alpha_deg)
    d = (math.sin(a), math.cos(a))
    nin = (-math.cos(a), math.sin(a))
    g["d"], g["nin"] = d, nin
    N, S, U = (9.0, 0.0), (23.5, 4.5), (29.0, 24.0)
    F, Ft, Nt = (0.0, 8.0), (0.0, 2.8), (9.3, -5.2)
    C1 = add(S, mul(d, 64))
    C2 = add(C1, mul(nin, 11))
    B1, B2 = (27.4, 64.6), (27.4, 69.6)
    g.update(N=N, S=S, U=U, F=F, Ft=Ft, Nt=Nt, C1=C1, C2=C2, B1=B1, B2=B2)

    g["collar_top"] = bez(Ft, (5.5, 2.8), (9.0, -1.5), Nt)
    g["collar_side"] = bez(Nt, (9.6, -3.0), (9.4, -1.2), N)
    g["neck_front"] = bez(F, (4.8, 8.0), (8.4, 4.4), N)
    g["shoulder"] = seg(N, S, 20)
    g["sleeve_top"] = bez(S, add(add(S, mul(d, 21)), mul(nin, -0.6)),
                          add(add(S, mul(d, 43)), mul(nin, -0.9)), C1)
    g["cuff"] = seg(C1, C2, 10)
    g["sleeve_under"] = bez(C2, add(lerp(C2, U, 0.33), mul(nin, -0.8)),
                            add(lerp(C2, U, 0.66), mul(nin, -0.6)), U)
    g["side"] = chain(bez(U, (29.3, 36), (29.8, 50), (29.6, 60.0)),
                      bez((29.6, 60.0), (29.6, 62.6), (28.6, 64.2), B1))
    g["body_hem"] = bez(B1, (20, 65.3), (8, 65.0), (0, 65.0))
    g["band_side"] = seg(B1, B2)
    g["band_bottom"] = bez(B2, (18, 70.0), (8, 69.9), (0, 69.9))

    vtop = add(add(C1, mul(d, -10)), mul(nin, 2.2))
    g["overarm"] = bez(S, add(add(S, mul(d, 18)), mul(nin, 0.9)),
                       add(add(S, mul(d, 36)), mul(nin, 1.8)), vtop)
    g["vent"] = [vtop, add(C1, mul(nin, 2.2))]
    return g


def back_neck_line(g):
    return bez(g["N"], (4, 1.9), (-4, 1.9), (-g["N"][0], g["N"][1]))


def visible_above(pts, front_top):
    """Tiene solo i punti di pts che stanno sopra il bordo del collo davanti (simmetrico)."""
    def top_y(x):
        best = min(front_top, key=lambda q: abs(q[0] - abs(x)))
        return best[1]
    return [p for p in pts if p[1] < top_y(p[0]) - 0.3]


def jacket_half_outline(g):
    return chain(g["collar_top"], g["collar_side"], g["shoulder"], g["sleeve_top"], g["cuff"],
                 g["sleeve_under"], g["side"], g["band_side"], g["band_bottom"])


def jacket_outline(g):
    half = jacket_half_outline(g)
    return chain(half, rev(mirror(half)))


def draw_jacket_front(sh, g, interior=False):
    d, nin = g["d"], g["nin"]
    outline = jacket_outline(g)
    sh.poly(outline, close=True, sw=1.8, fill=GREY_FILL)

    # interno del collo dietro, visibile sopra i due collari davanti (melton)
    back_collar_top = bez(g["Nt"], (4, -3.9), (-4, -3.9), (-g["Nt"][0], g["Nt"][1]))
    inside_back = chain(back_collar_top, rev(mirror(g["collar_top"])), g["collar_top"])
    sh.poly(inside_back, close=True, sw=1.0, fill=MELTON)
    sh.poly(visible_above(back_neck_line(g), g["collar_top"]), sw=0.8)

    for side in (1, -1):
        m = (lambda pts: pts) if side == 1 else mirror
        sh.poly(m(g["neck_front"]), sw=1.1)
        arm = bez(g["S"], (22.9, 11), (24.6, 21.4), g["U"])
        sh.poly(m(arm), sw=1.1)
        sh.poly(m(g["body_hem"]), sw=1.1)
        if interior:
            continue
        # giunzione a giorno: spalla + cucitura superiore della manica, interrotta sul giro manica
        sh_line = offset(g["shoulder"], 0.55)
        faggoting(sh, m(sub_path(sh_line, 0, length(sh_line) - 0.6)))
        faggoting(sh, m(sub_path(g["overarm"], 0.6, length(g["overarm"]))))
        # spacco manica + 4 bottoni
        sh.poly(m(g["vent"]), sw=1.1)
        vc = g["vent"][1]
        for k in range(4):
            c = add(add(vc, mul(d, -(2.0 + 2.2 * k))), mul(nin, 1.15))
            sh.button(m([c])[0], 0.72)
        # tasca a doppio filetto obliqua
        p0, p1 = (11.0, 47.0), (16.2, 61.6)
        jets = [offset([p0, p1], o) for o in (-0.55, 0.0, 0.55)]
        sh.poly(m(chain(jets[0], rev(jets[2]))), close=True, sw=1.0)
        sh.poly(m(jets[1]), sw=0.9)
        tan = ((p1[0] - p0[0]) / math.dist(p0, p1), (p1[1] - p0[1]) / math.dist(p0, p1))
        for end in (p0, p1):
            nx, ny = -tan[1], tan[0]
            sh.poly(m([(end[0] - nx * 0.9, end[1] - ny * 0.9), (end[0] + nx * 0.9, end[1] + ny * 0.9)]), sw=1.6)
        # punto a mano lungo il bordo davanti e il collo
        pick_stitch(sh, m([(1.05, 3.4), (1.05, 64.6)]))
        pick_stitch(sh, m(offset(g["collar_top"], 0.6)[2:-6]))
        # pieghe morbide sopra la fascia
        drape(sh, m([(24.8, 61.5)])[0], m([(26.2, 64.1)])[0])
        drape(sh, m([(19.5, 62.8)])[0], m([(20.6, 64.8)])[0])

    if not interior:
        zip_teeth(sh, g["Ft"], (0, 69.9))
        # garage zip e cursore
        sh.poly([(-0.9, 2.8), (-0.9, 1.4), (0.9, 1.4), (0.9, 2.8)], sw=1.0)
        sh.poly([(-0.55, 4.0), (0.55, 4.0), (0.4, 7.0), (-0.4, 7.0)], close=True, sw=0.9, fill="#ffffff")
        sh.poly([(-0.45, 7.0), (-0.45, 9.0), (0.45, 9.0), (0.45, 7.0)], sw=0.8)


def draw_jacket_interior(sh, g):
    """Vista interna: i davanti aperti visti dall'interno (sinistro e destro invertiti)."""
    d, nin = g["d"], g["nin"]
    outline = jacket_outline(g)
    sh.poly(outline, close=True, sw=1.8, fill=GREY_FILL)

    for side in (1, -1):
        m = (lambda pts: pts) if side == 1 else mirror
        # fodera: dalla paramontura al giro manica e al fondo (sopra la fascia)
        face_edge = chain(seg((6.0, 9.0), (6.0, 62.0), 20))
        lining = chain(seg((6.0, 62.6), (6.0, 6.6), 20),
                       bez((6.0, 6.6), (6.4, 3.6), (8.2, 1.6), (10.6, 0.7)),
                       seg((10.6, 0.7), (g["S"][0], g["S"][1] + 0.6), 10),
                       bez((g["S"][0], g["S"][1] + 0.6), (22.9, 11), (24.6, 21.4), g["U"]),
                       bez(g["U"], (29.3, 36), (29.8, 50), (29.4, 60.0)),
                       bez((29.4, 60.0), (29.2, 61.8), (27.8, 62.6), (26.5, 62.6)),
                       seg((26.5, 62.6), (6.0, 62.6), 10))
        sh.poly(m(lining), close=True, sw=1.0, fill=LINING)
        # salto di fodera (piega di agio) sopra l'orlo della fodera
        sh.poly(m(seg((6.4, 61.6), (26.0, 61.6), 10)), sw=0.6, dash="2 2")
        # fodera manica
        sleeve_lining = chain(g["sleeve_top"], g["cuff"], g["sleeve_under"],
                              rev(bez(g["S"], (22.9, 11), (24.6, 21.4), g["U"])))
        sh.poly(m(sleeve_lining), close=True, sw=1.0, fill=LINING)
        sh.poly(m(seg(add(g["C1"], mul(d, -4.5)), add(g["C2"], mul(d, -4.5)), 6)), sw=0.6, dash="2 2")
        sh.poly(m(g["neck_front"]), sw=1.1)
        sh.poly(m(g["body_hem"]), sw=1.1)
        # paramontura: cucitura con la fodera e punto a mano
        sh.poly(m(face_edge), sw=0.9)
        pick_stitch(sh, m([(1.05, 3.4), (1.05, 64.6)]))

    # collo interno in melton
    collar_band = chain(g["collar_top"], g["collar_side"], rev(g["neck_front"]))
    for m in ((lambda p: p), mirror):
        sh.poly(m(collar_band), close=True, sw=1.0, fill=MELTON)
    back_collar_top = bez(g["Nt"], (4, -3.9), (-4, -3.9), (-g["Nt"][0], g["Nt"][1]))
    back_neck = bez(g["N"], (4, 1.9), (-4, 1.9), (-g["N"][0], g["N"][1]))
    sh.poly(chain(back_collar_top, mirror(g["collar_side"]), rev(back_neck), rev(g["collar_side"])),
            close=True, sw=1.0, fill=MELTON)
    # paramontura collo dietro + catenella appendiabiti
    facing = chain(back_neck, bez((-g["N"][0], g["N"][1]), (-6, 5.0), (6, 5.0), g["N"]))
    sh.poly(facing, close=True, sw=0.9, fill="#ffffff")
    sh.poly(bez((-1.6, 1.9), (-1.6, 4.4), (1.6, 4.4), (1.6, 1.9), 16), sw=1.1)
    # tasca interna a filetto sul davanti sinistro (a sinistra guardando l'interno)
    sh.poly([(-8.0, 22.0), (-21.0, 22.0), (-21.0, 23.1), (-8.0, 23.1)], close=True, sw=1.0, fill="#ffffff")
    sh.poly([(-8.0, 22.55), (-21.0, 22.55)], sw=0.7)
    # etichetta composizione nella cucitura laterale sinistra
    sh.poly([(-28.9, 44.0), (-25.6, 44.0), (-25.6, 49.0), (-28.9, 49.0)], close=True, sw=0.9, fill="#ffffff")
    sh.poly([(-28.4, 45.4), (-26.2, 45.4)], sw=0.5)
    sh.poly([(-28.4, 46.6), (-26.2, 46.6)], sw=0.5)
    # zip vista dall'interno (nastro)
    sh.poly([(0, 2.8), (0, 69.9)], sw=1.0)


def draw_jacket_back(sh, g):
    d, nin = g["d"], g["nin"]
    # collo dietro pieno + profilo
    half = chain(bez((0, -5.5), (4.0, -5.5), (8.0, -5.4), g["Nt"]), g["collar_side"], g["shoulder"],
                 g["sleeve_top"], g["cuff"], g["sleeve_under"], g["side"], g["band_side"], g["band_bottom"])
    outline = chain(half, rev(mirror(half)))
    sh.poly(outline, close=True, sw=1.8, fill=GREY_FILL)
    back_neck = bez(g["N"], (5, 1.8), (2, 1.8), (0, 1.8))
    for m in ((lambda p: p), mirror):
        sh.poly(m(back_neck), sw=1.1)
        arm = bez(g["S"], (24.6, 12), (25.2, 21.0), g["U"])
        sh.poly(m(arm), sw=1.1)
        sh.poly(m(g["body_hem"]), sw=1.1)
        sh_line = offset(g["shoulder"], 0.55)
        faggoting(sh, m(sub_path(sh_line, 0, length(sh_line) - 0.6)))
        faggoting(sh, m(sub_path(g["overarm"], 0.6, length(g["overarm"]))))
        sh.poly(m(g["vent"]), sw=1.1)
        pick_stitch(sh, m(offset(bez((0, -5.5), (4.0, -5.5), (8.0, -5.4), g["Nt"]), 0.6)[:-4]))
        # arricciatura della fascia (elastico interno nel dietro)
        for x in (3.5, 7.4, 11.0, 14.8, 18.3, 22.0, 25.0):
            sh.poly(m(bez((x, 65.6), (x + 0.4, 66.8), (x - 0.4, 68.0), (x, 69.2), 10)), sw=0.6)
        drape(sh, m([(10.0, 61.8)])[0], m([(11.0, 64.6)])[0])
        drape(sh, m([(21.0, 62.0)])[0], m([(21.8, 64.7)])[0])
    # cucitura centro dietro (con margine di riserva)
    sh.poly([(0, 1.8), (0, 65.0)], sw=1.1)


def jacket_sheet():
    W, H, K = 1800, 1180, 5.2
    sh = Sheet(W, H, K)
    g = jacket_geometry()

    # intestazione
    sh.text(48, 62, "COLLEZIONE 01 — BORGATA", 13, 700, ls=2.5)
    sh.text(48, 98, "Giacca della Festa", 30, 300)
    sh.text(48, 124, "Codice B01-GF · Tavola tecnica in piano · Taglia base 3 · v1 · ottobre 2026 · disegno non in scala", 12, 400, color="#555")

    # vista davanti
    sh.view(470, 300)
    draw_jacket_front(sh, g)
    sh.text(470, 720, "DAVANTI", 12, 700, "middle", ls=2)
    # vista dietro
    sh.view(1330, 300)
    draw_jacket_back(sh, g)
    sh.text(1330, 720, "DIETRO", 12, 700, "middle", ls=2)

    # richiami davanti
    sh.view(470, 300)
    sh.callout(1, (5.0, 0.8), (-3.0, -16.0))
    sh.callout(2, (0.0, 30.0), (-14.0, 26.0))
    sh.callout(3, (1.05, 40.0), (-16.0, 40.0))
    sh.callout(4, (16.0, 2.9), (24.0, -12.0))
    sh.callout(5, (23.6, 4.9), (36.0, -6.0))
    sh.callout(6, (44.0, 23.0), (52.0, 10.0))
    sh.callout(7, (69.6, 44.0), (80.0, 52.0))
    sh.callout(8, (13.6, 54.3), (4.0, 54.0))
    sh.callout(9, (12.0, 67.4), (14.0, 76.0))
    sh.callout(10, (20.0, 36.0), (8.0, 34.0))
    # richiami dietro
    sh.view(1330, 300)
    sh.callout(11, (0.0, 30.0), (-10.0, 24.0))
    sh.callout(12, (11.0, 67.4), (18.0, 76.0))
    sh.callout(13, (0.0, -3.0), (10.0, -14.0))

    # legenda
    notes = [
        (1, "Collo a listino 5,5 cm, punto a mano sul bordo; collo interno in melton"),
        (2, "Zip Lampo divisibile a due cursori, metallo n. 5, finitura canna di fucile; garage zip in tessuto"),
        (3, "Punto a mano (pick stitch) a 6 mm dal bordo davanti, dalla sommità del collo alla fascia"),
        (4, "Giunzione a giorno 6 mm sulla cucitura spalla: nel vuoto si vede la fodera rosa"),
        (5, "La giunzione si interrompe 3 mm prima e dopo l'incrocio con il giro manica"),
        (6, "Giunzione a giorno sulla cucitura superiore della manica (manica in due pezzi, davanti/dietro)"),
        (7, "Spacco manica 10 cm, 4 asole funzionanti fatte a mano, bottoni in corozo 24L"),
        (8, "Tasca obliqua a doppio filetto, apertura 16 cm, travette a mano alle estremità"),
        (9, "Fascia fondo in tessuto, altezza 5 cm, elastico interno solo nel dietro"),
        (10, "Flanella di lana rigenerata, grigio medio mélange; spalla camicia napoletana senza imbottitura"),
        (11, "Cucitura centro dietro con margine di riserva 2,5 cm per future modifiche"),
        (12, "Fascia dietro arricciata dall'elastico interno tra le cuciture laterali"),
        (13, "Collo dietro altezza 5,5 cm al centro"),
    ]
    y0 = 790
    sh.text(48, y0, "DETTAGLI", 12, 700, ls=2)
    col_w = 860
    for i, (n, s) in enumerate(notes):
        col, row = divmod(i, 7)
        x = 48 + col * col_w
        y = y0 + 34 + row * 30
        sh.els.append(f'<circle cx="{x + 9}" cy="{y - 4}" r="9" fill="#fff" stroke="#c0392b" stroke-width="1.2"/>')
        sh.text(x + 9, y - 0.4, str(n), 10, 700, "middle", "#c0392b")
        sh.text(x + 28, y, s, 12.5)

    # materiali / colori
    sw = [("#8d8c89", "Flanella rigenerata", "grigio medio mélange"),
          (LINING, "Cupro Bemberg", "rosa cipria (fodera)"),
          (MELTON, "Melton", "collo interno"),
          ("#3d3b39", "Corozo / zip", "grigio scuro, canna di fucile")]
    x = 48
    yb = 1078
    sh.text(48, yb - 18, "MATERIALI", 12, 700, ls=2)
    for col, a, b in sw:
        sh.rect(x, yb, 46, 46, fill=col, sw=1)
        sh.text(x + 58, yb + 20, a, 12.5, 600)
        sh.text(x + 58, yb + 38, b, 12, 400, color="#555")
        x += 330
    sh.save(ROOT / "giacca-della-festa" / "tavola-tecnica.svg")

    # tavola interno
    sh2 = Sheet(1000, 980, 5.2)
    sh2.text(48, 62, "COLLEZIONE 01 — BORGATA", 13, 700, ls=2.5)
    sh2.text(48, 98, "Giacca della Festa — interno", 30, 300)
    sh2.text(48, 124, "B01-GF · Vista interna con i davanti aperti (sinistro e destro invertiti) · v1", 12, 400, color="#555")
    sh2.view(500, 300)
    draw_jacket_interior(sh2, g)
    sh2.text(500, 720, "INTERNO", 12, 700, "middle", ls=2)
    sh2.callout(14, (-17.0, 40.0), (-36.0, 74.0))
    sh2.callout(15, (3.5, 30.0), (-6.0, 76.0))
    sh2.callout(16, (-14.0, 22.5), (-40.0, 12.0))
    sh2.callout(17, (5.0, 4.5), (20.0, -12.0))
    sh2.callout(18, (0.0, 3.6), (-12.0, -14.0))
    sh2.callout(19, (-27.2, 46.5), (-46.0, 46.0))
    sh2.callout(20, (55.0, 38.0), (66.0, 24.0))
    notes2 = [
        (14, "Fodera davanti in cupro Bemberg rosa cipria, con piega di agio sopra l'orlo"),
        (15, "Paramontura in tessuto esterno 6 cm, punto a mano verso la zip"),
        (16, "Tasca interna a filetto 13 cm sul davanti sinistro"),
        (17, "Collo interno in melton grigio, come il sottocollo di una giacca sartoriale"),
        (18, "Paramontura collo dietro in tessuto e catenella appendiabiti"),
        (19, "Etichetta composizione e manutenzione (obbligatoria): unica scritta del capo"),
        (20, "Maniche interamente foderate; dietro mezzo foderato a farfalla, cuciture rifinite a sbieco in cupro rosa"),
    ]
    y0 = 790
    for i, (n, s) in enumerate(notes2):
        y = y0 + i * 26
        sh2.els.append(f'<circle cx="57" cy="{y - 4}" r="9" fill="#fff" stroke="#c0392b" stroke-width="1.2"/>')
        sh2.text(57, y - 0.4, str(n), 10, 700, "middle", "#c0392b")
        sh2.text(76, y, s, 12.5)
    sh2.save(ROOT / "giacca-della-festa" / "tavola-interno.svg")


# ── PANTALONE DELLA FESTA ────────────────────────────────────────────────────

def trouser_geometry():
    g = {}
    g["wb_top"], g["wb_h"] = 19.5, 4.0
    g["side"] = chain(bez((19.5, 4.0), (23.4, 6.6), (26.3, 12.0), (26.6, 21.0)),
                      bez((26.6, 21.0), (26.8, 42.0), (25.6, 72.0), (24.4, 104.0)))
    g["hem"] = seg((24.4, 104.0), (5.6, 104.0), 10)
    g["inseam"] = bez((5.6, 104.0), (4.8, 82.0), (2.6, 50.0), (0.6, 28.5))
    g["crotch"] = bez((0.6, 28.5), (0.2, 27.0), (0.0, 25.0), (0.0, 22.0))
    return g


def trouser_half(g, back=False):
    top = seg((0.0, 0.0), (19.5, 0.0), 10)
    wb_side = seg((19.5, 0.0), (19.5, 4.0))
    if back:
        crotch = bez((0.6, 28.5), (0.3, 29.5), (0.0, 30.0), (0.0, 30.0))
    else:
        crotch = g["crotch"]
    return chain(top, wb_side, g["side"], g["hem"], g["inseam"])


def draw_trousers(sh, g, back=False):
    half = trouser_half(g, back)
    outline = chain(half, rev(mirror(half)))
    sh.poly(outline, close=True, sw=1.8, fill="#ffffff")
    for m in ((lambda p: p), mirror):
        sh.poly(m(seg((0.0, 4.0), (19.5, 4.0), 8)), sw=1.1)              # cucitura cintura
        sh.poly(m(seg((24.6, 100.0), (5.4, 100.0), 8)), sw=1.1)           # risvolto
        # giunzione a giorno sulla cucitura laterale avanzata (2 cm verso il davanti)
        # (dal dietro non si vede: la cucitura è spostata verso il davanti)
        if not back:
            side_seam = offset(g["side"], 2.0)
            faggoting(sh, m(sub_path(side_seam, 0.2, length(side_seam) - 4.1)))
        # piega stirata
        sh.poly(m(bez((11.0, 4.0 if not back else 14.0), (12.5, 40), (14.2, 72), (15.0, 100.0))), sw=0.8)
        if not back:
            # pince
            sh.poly(m([(11.0, 4.0), (11.0, 11.0)]), sw=1.0)
            sh.poly(m(bez((11.0, 11.0), (11.2, 12.2), (11.4, 13.0), (11.5, 14.0), 8)), sw=0.6)
            # tasca laterale obliqua (termina sulla cucitura avanzata)
            sh.poly(m(bez((15.2, 4.0), (17.5, 9.0), (21.5, 15.0), (23.2, 19.0), 20)), sw=1.1)
            pick_stitch(sh, m(offset(bez((15.2, 4.0), (17.5, 9.0), (21.5, 15.0), (23.2, 19.0), 20), 0.6)))
        else:
            # pince dietro
            sh.poly(m([(9.5, 4.0), (9.8, 13.0)]), sw=1.0)
            # arricciatura cintura dietro (elastico interno)
            for x in (2.5, 5.5, 8.0, 12.5, 15.5, 18.0):
                sh.poly(m(bez((x, 0.7), (x + 0.3, 1.6), (x - 0.3, 2.4), (x, 3.3), 8)), sw=0.6)
    if not back:
        # patta: punto a mano a J
        pick_stitch(sh, chain(seg((-3.6, 4.6), (-3.6, 18.2), 10),
                              bez((-3.6, 18.2), (-3.6, 20.6), (-1.6, 21.6), (0.0, 22.0), 10)))
        sh.poly([(0.0, 4.0), (0.0, 22.0)], sw=1.0)
        sh.poly(g["crotch"], sw=1.0)
        sh.poly([(0.0, 0.0), (0.0, 4.0)], sw=1.0)
    else:
        sh.poly(bez((0.0, 4.0), (0.0, 18.0), (0.2, 26.0), (0.6, 28.5)), sw=1.1)
        # tasca a filetto con bottone sul dietro destro (destra guardando il dietro)
        px0, px1, py = 6.0, 20.0, 12.0
        sh.poly([(px0, py - 0.5), (px1, py - 0.5), (px1, py + 0.5), (px0, py + 0.5)], close=True, sw=1.0)
        sh.poly([(px0, py), (px1, py)], sw=0.8)
        sh.button(((px0 + px1) / 2, py + 1.9), 0.7)


def trouser_sheet():
    W, H, K = 1500, 1280, 5.0
    sh = Sheet(W, H, K)
    g = trouser_geometry()
    sh.text(48, 62, "COLLEZIONE 01 — BORGATA", 13, 700, ls=2.5)
    sh.text(48, 98, "Pantalone della Festa", 30, 300)
    sh.text(48, 124, "Codice B01-PF · Tavola tecnica in piano · Taglia base 3 · v1 · ottobre 2026 · disegno non in scala", 12, 400, color="#555")
    sh.view(390, 190)
    draw_trousers(sh, g)
    sh.text(390, 750, "DAVANTI", 12, 700, "middle", ls=2)
    sh.view(1060, 190)
    draw_trousers(sh, g, back=True)
    sh.text(1060, 750, "DIETRO", 12, 700, "middle", ls=2)

    sh.view(390, 190)
    sh.callout(1, (-10.0, 2.0), (-30.0, -6.0))
    sh.callout(2, (-3.6, 12.0), (-30.0, 12.0))
    sh.callout(3, (11.0, 8.0), (34.0, 2.0))
    sh.callout(4, (19.8, 12.2), (36.0, 14.0))
    sh.callout(5, (24.6, 50.0), (36.0, 50.0))
    sh.callout(6, (13.0, 60.0), (-14.0, 66.0))
    sh.callout(7, (-15.0, 102.0), (-30.0, 94.0))
    sh.view(1060, 190)
    sh.callout(8, (-12.5, 2.0), (-32.0, -6.0))
    sh.callout(9, (-9.6, 9.0), (-32.0, 12.0))
    sh.callout(10, (13.0, 12.0), (34.0, 4.0))
    sh.callout(11, (0.0, 20.0), (-24.0, 30.0))

    notes = [
        (1, "Cintura 4 cm in tessuto, davanti piatto; gancio e barretta + bottone interno, senza passanti"),
        (2, "Patta con zip Lampo in metallo; punto a mano a J"),
        (3, "Una pince per lato sul davanti"),
        (4, "Tasche laterali oblique, punto a mano sul bordo"),
        (5, "Giunzione a giorno sulla cucitura laterale, avanzata di 2 cm verso il davanti; fodera rosa sotto il vuoto, si ferma al risvolto"),
        (6, "Piega stirata permanente davanti e dietro"),
        (7, "Risvolto 4 cm"),
        (8, "Cintura dietro con elastico interno tra le cuciture laterali"),
        (9, "Una pince per lato sul dietro"),
        (10, "Tasca a filetto 14 cm con asola a mano e bottone in corozo, solo sul dietro destro"),
        (11, "Centro dietro con margine di riserva 4 cm (cintura e cavallo) per allargare il capo"),
    ]
    y0 = 815
    sh.text(48, y0, "DETTAGLI", 12, 700, ls=2)
    for i, (n, s) in enumerate(notes):
        y = y0 + 34 + i * 28
        sh.els.append(f'<circle cx="57" cy="{y - 4}" r="9" fill="#fff" stroke="#c0392b" stroke-width="1.2"/>')
        sh.text(57, y - 0.4, str(n), 10, 700, "middle", "#c0392b")
        sh.text(76, y, s, 12.5)
    sh.save(ROOT / "pantalone-della-festa" / "tavola-tecnica.svg")


if __name__ == "__main__":
    jacket_sheet()
    trouser_sheet()
    print("ok")
