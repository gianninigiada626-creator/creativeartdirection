"""Libreria minima di modellistica: geometria, pezzi del cartamodello ed esportazione.

Convenzioni
- Unità: cm. Asse y verso il basso (come sul tavolo di taglio guardando il disegno).
- Ogni pezzo è descritto dalla sua LINEA DI CUCITURA (netta), divisa in lati.
  Ogni lato ha il proprio margine di cucitura; la linea di taglio viene calcolata.
- Esportazioni: SVG 1:1 (mm), PDF a pagine A4 affiancabili, PDF unico per plotter,
  DXF R12 con livelli in stile AAMA (1 taglio, 4 tacche, 7 drittofilo, 8 linee interne,
  13 fori, 14 cucitura, 15 testi).
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path

# ── geometria ────────────────────────────────────────────────────────────────


def add(a, b):
    return (a[0] + b[0], a[1] + b[1])


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1])


def mul(a, k):
    return (a[0] * k, a[1] * k)


def unit(a):
    L = math.hypot(*a) or 1.0
    return (a[0] / L, a[1] / L)


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def dist(a, b):
    return math.dist(a, b)


def bez(p0, p1, p2, p3, step=0.2):
    approx = dist(p0, p1) + dist(p1, p2) + dist(p2, p3)
    n = max(8, int(approx / step))
    pts = []
    for i in range(n + 1):
        t = i / n
        mt = 1 - t
        pts.append((
            mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0],
            mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1],
        ))
    return pts


def seg(a, b):
    return [a, b]


def chain(*parts):
    out = []
    for part in parts:
        if out and dist(out[-1], part[0]) < 1e-6:
            out.extend(part[1:])
        else:
            out.extend(part)
    return out


def rev(pts):
    return list(reversed(pts))


def length(pts):
    return sum(dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def point_at(pts, s):
    """Punto e tangente alla distanza s lungo la polilinea (s può superare i limiti)."""
    if s <= 0:
        return pts[0], unit(sub(pts[1], pts[0]))
    acc = 0.0
    for i in range(len(pts) - 1):
        d = dist(pts[i], pts[i + 1])
        if d == 0:
            continue
        if acc + d >= s:
            t = (s - acc) / d
            return lerp(pts[i], pts[i + 1], t), unit(sub(pts[i + 1], pts[i]))
        acc += d
    return pts[-1], unit(sub(pts[-1], pts[-2]))


def split(pts, s):
    """Divide la polilinea alla distanza s: (prima, dopo)."""
    acc = 0.0
    for i in range(len(pts) - 1):
        d = dist(pts[i], pts[i + 1])
        if acc + d >= s:
            p = lerp(pts[i], pts[i + 1], (s - acc) / d if d else 0)
            return pts[: i + 1] + [p], [p] + pts[i + 1:]
        acc += d
    return list(pts), [pts[-1]]


def sub_path(pts, s0, s1):
    return split(split(pts, s1)[0], s0)[1]


def offset(pts, d):
    """Offset della polilinea: d > 0 verso la sinistra della direzione di percorrenza
    (con y verso il basso: percorrendo verso +x, la sinistra è -y)."""
    out = []
    n = len(pts)
    for i, p in enumerate(pts):
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, n - 1)]
        t = unit(sub(b, a))
        out.append((p[0] + t[1] * d, p[1] - t[0] * d))
    return out


def offset_var(pts, d0, d1):
    """Offset con distanza che varia linearmente lungo la polilinea (da d0 a d1)."""
    L = length(pts) or 1.0
    out, acc = [], 0.0
    n = len(pts)
    for i, p in enumerate(pts):
        if i:
            acc += dist(pts[i - 1], p)
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, n - 1)]
        t = unit(sub(b, a))
        d = d0 + (d1 - d0) * acc / L
        out.append((p[0] + t[1] * d, p[1] - t[0] * d))
    return out


def line_x(p1, p2, p3, p4):
    """Intersezione delle rette p1-p2 e p3-p4 (None se quasi parallele)."""
    d1, d2 = sub(p2, p1), sub(p4, p3)
    den = d1[0] * d2[1] - d1[1] * d2[0]
    if abs(den) < 1e-9 * (math.hypot(*d1) * math.hypot(*d2) + 1e-12) or abs(den) < 1e-9:
        return None
    t = ((p3[0] - p1[0]) * d2[1] - (p3[1] - p1[1]) * d2[0]) / den
    return add(p1, mul(d1, t))


def area(pts):
    s = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        s += x1 * y2 - x2 * y1
    return s / 2


def mirror_x(pts, x0=0.0):
    return [(2 * x0 - x, y) for x, y in pts]


def rotate(pts, ang, origin=(0, 0)):
    c, s = math.cos(ang), math.sin(ang)
    ox, oy = origin
    return [(ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c) for x, y in pts]


def translate(pts, d):
    return [(x + d[0], y + d[1]) for x, y in pts]


def bbox(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def clip_below(pts, y_max):
    """Taglia un poligono chiuso tenendo la parte con y <= y_max (Sutherland–Hodgman)."""
    out = []
    n = len(pts)
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        ina, inb = a[1] <= y_max, b[1] <= y_max
        if ina:
            out.append(a)
        if ina != inb:
            t = (y_max - a[1]) / (b[1] - a[1])
            out.append(lerp(a, b, t))
    return out


def rounded_rect(x0, y0, w, h, r=0.0):
    if r <= 0:
        return [(x0, y0), (x0 + w, y0), (x0 + w, y0 + h), (x0, y0 + h)]
    k = 0.5523 * r
    return chain(
        seg((x0 + r, y0), (x0 + w - r, y0)),
        bez((x0 + w - r, y0), (x0 + w - r + k, y0), (x0 + w, y0 + r - k), (x0 + w, y0 + r)),
        seg((x0 + w, y0 + r), (x0 + w, y0 + h - r)),
        bez((x0 + w, y0 + h - r), (x0 + w, y0 + h - r + k), (x0 + w - r + k, y0 + h), (x0 + w - r, y0 + h)),
        seg((x0 + w - r, y0 + h), (x0 + r, y0 + h)),
        bez((x0 + r, y0 + h), (x0 + r - k, y0 + h), (x0, y0 + h - r + k), (x0, y0 + h - r)),
        seg((x0, y0 + h - r), (x0, y0 + r)),
        bez((x0, y0 + r), (x0, y0 + r - k), (x0 + r - k, y0), (x0 + r, y0)),
    )


# ── pezzi ────────────────────────────────────────────────────────────────────


@dataclass
class Edge:
    pts: list
    sa: float = 1.0          # margine di cucitura
    kind: str = "seam"       # seam | fold (piega, margine 0) | fag (giunzione a giorno) | hem
    name: str = ""
    gap: float = 0.0         # solo "fag": metà del vuoto; la piega sta a gap verso l'interno
    sa_end: float | None = None   # se indicato, il margine varia da sa (inizio) a sa_end (fine)

    def sa_at(self, s):
        if self.sa_end is None:
            return self.sa
        L = length(self.pts) or 1.0
        return self.sa + (self.sa_end - self.sa) * min(max(s / L, 0.0), 1.0)

    def sa_max(self):
        return self.sa if self.sa_end is None else max(self.sa, self.sa_end)


@dataclass
class Piece:
    num: int
    name: str
    material: str            # TESSUTO | FODERA | MELTON | TASCHE
    cut: str                 # es. "Tagliare 2 (in coppia)"
    edges: list
    grain: tuple             # (p0, p1)
    notches: list = field(default_factory=list)   # (punto sulla cucitura, num tacche)
    drills: list = field(default_factory=list)    # punti foro
    lines: list = field(default_factory=list)     # (punti, stile, etichetta)
    notes: list = field(default_factory=list)     # righe di testo extra
    label_at: tuple | None = None
    code: str = "B01-GF"
    size: str = "3"

    # linea di cucitura chiusa
    def seam(self):
        pts = []
        for e in self.edges:
            pts = chain(pts, e.pts) if pts else list(e.pts)
        if dist(pts[0], pts[-1]) < 1e-6:
            pts = pts[:-1]
        return pts

    def _out_sign(self):
        return 1 if area(self.seam()) > 0 else -1

    def cut_line(self):
        sign = self._out_sign()
        offs = []
        for e in self.edges:
            if e.sa_end is not None:
                offs.append(offset_var(e.pts, sign * e.sa, sign * e.sa_end))
            elif e.sa <= 0:
                offs.append(list(e.pts))
            else:
                offs.append(offset(e.pts, sign * e.sa))
        n = len(offs)
        out = []
        for i in range(n):
            prev, cur = offs[i - 1], offs[i]
            corner = self.edges[i].pts[0]
            limit = 4 * max(self.edges[i].sa_max(), self.edges[i - 1].sa_max(), 0.5)
            p = line_x(prev[-2], prev[-1], cur[0], cur[1])
            if p is None or dist(p, corner) > limit:
                out += [prev[-1], cur[0]]      # angolo smussato
            else:
                out.append(p)
            out += cur[1:-1]
        return out

    def fold_lines(self):
        """Linee di piega dei lati a giorno (rientrate di gap rispetto alla linea nominale)."""
        sign = self._out_sign()
        return [offset(e.pts, -sign * e.gap) for e in self.edges if e.kind == "fag" and e.gap > 0]

    def outward(self, edge_idx, s):
        e = self.edges[edge_idx]
        p, t = point_at(e.pts, s)
        sign = self._out_sign()
        return p, (t[1] * sign, -t[0] * sign)

    def notch(self, edge_idx, s, count=1, from_end=False):
        e = self.edges[edge_idx]
        L = length(e.pts)
        s = L - s if from_end else s
        p, n = self.outward(edge_idx, s)
        self.notches.append((p, n, e.sa_at(s), count))

    def notch_segments(self):
        segs = []
        for p, n, sa, count in self.notches:
            tang = (-n[1], n[0])
            for k in range(count):
                off = (k - (count - 1) / 2) * 0.35
                q = add(p, mul(tang, off))
                a = add(q, mul(n, sa))
                b = add(q, mul(n, sa - 0.55)) if sa >= 0.55 else add(q, mul(n, -0.55))
                segs.append((a, b))
        return segs

    def all_points(self):
        pts = list(self.cut_line()) + list(self.seam())
        for l, _, _ in self.lines:
            pts += l
        pts += list(self.grain)
        return pts

    def transformed(self, f):
        """Nuovo pezzo con una trasformazione punto→punto applicata a tutto."""
        p = Piece(self.num, self.name, self.material, self.cut,
                  [Edge([f(q) for q in e.pts], e.sa, e.kind, e.name, e.gap, e.sa_end) for e in self.edges],
                  tuple(f(q) for q in self.grain), [], [f(q) for q in self.drills],
                  [([f(q) for q in l], st, lab) for l, st, lab in self.lines],
                  list(self.notes), f(self.label_at) if self.label_at else None, self.code, self.size)
        for q, n, sa, c in self.notches:
            q2 = f(q)
            p.notches.append((q2, unit(sub(f(add(q, n)), q2)), sa, c))
        return p


def rect_piece(num, name, material, cut, w, h, sa=1.0, grain="v", notes=(), code="B01-GF", fold_left=False):
    pts = [(0, 0), (w, 0), (w, h), (0, h)]
    edges = [Edge(seg(pts[0], pts[1]), sa), Edge(seg(pts[1], pts[2]), sa),
             Edge(seg(pts[2], pts[3]), sa), Edge(seg(pts[3], pts[0]), 0 if fold_left else sa,
                                                 "fold" if fold_left else "seam")]
    g = ((w / 2, h * 0.2), (w / 2, h * 0.8)) if grain == "v" else ((w * 0.2, h / 2), (w * 0.8, h / 2))
    return Piece(num, name, material, cut, edges, g, notes=list(notes), code=code)


# ── impaginazione ────────────────────────────────────────────────────────────


def layout(pieces, width, gap=3.0, margin=2.0):
    """Disposizione a scaffali (pezzi ordinati per altezza) entro una larghezza in cm.
    Restituisce lista di (pezzo spostato, bbox) e altezza totale."""
    items = []
    for pc in pieces:
        x0, y0, x1, y1 = bbox(pc.cut_line() + list(pc.grain))
        items.append((pc, x0, y0, x1 - x0, y1 - y0))
    order = sorted(items, key=lambda it: -it[4])
    placed = []
    x, y, row_h = margin, margin, 0.0
    for pc, x0, y0, w, h in order:
        if x + w > width - margin and x > margin:
            x = margin
            y += row_h + gap
            row_h = 0.0
        dx, dy = x - x0, y - y0
        moved = pc.transformed(lambda q, dx=dx, dy=dy: (q[0] + dx, q[1] + dy))
        placed.append(moved)
        x += w + gap
        row_h = max(row_h, h)
    return placed, y + row_h + margin


def piece_label_lines(pc):
    lines = [f"{pc.num}. {pc.name}", f"{pc.code} · taglia {pc.size}", pc.material, pc.cut]
    return lines + list(pc.notes)


def label_rotated(pc):
    x0, y0, x1, y1 = bbox(pc.seam())
    return (x1 - x0) < 14 and (y1 - y0) > 3 * (x1 - x0)


def label_anchor(pc):
    if pc.label_at:
        return pc.label_at
    x0, y0, x1, y1 = bbox(pc.seam())
    return ((x0 + x1) / 2, y0 + (y1 - y0) * 0.35)


# ── esportazione SVG ─────────────────────────────────────────────────────────

STYLE = {
    "cut": dict(stroke="#111111", width=0.45, dash=None),
    "seam": dict(stroke="#777777", width=0.25, dash="3 2"),
    "fag": dict(stroke="#c0392b", width=0.35, dash="6 2 1 2"),
    "fold": dict(stroke="#1f5fa8", width=0.35, dash="8 3"),
    "place": dict(stroke="#111111", width=0.3, dash=None),
    "hint": dict(stroke="#555555", width=0.25, dash="1.5 1.5"),
}


def _svg_path(pts, close, style, scale=10.0):
    st = STYLE[style]
    d = "M" + " L".join(f"{x * scale:.2f},{y * scale:.2f}" for x, y in pts) + (" Z" if close else "")
    dash = f' stroke-dasharray="{st["dash"]}"' if st["dash"] else ""
    return (f'<path d="{d}" fill="none" stroke="{st["stroke"]}" stroke-width="{st["width"]}"'
            f' stroke-linejoin="round"{dash}/>')


def _grain_svg(g, scale=10.0):
    (x0, y0), (x1, y1) = g
    t = unit((x1 - x0, y1 - y0))
    n = (-t[1], t[0])
    els = [f'<line x1="{x0*scale:.1f}" y1="{y0*scale:.1f}" x2="{x1*scale:.1f}" y2="{y1*scale:.1f}" stroke="#111111" stroke-width="0.35"/>']
    for (px, py), s in (((x0, y0), 1), ((x1, y1), -1)):
        a = (px + s * t[0] * 1.2 + n[0] * 0.45, py + s * t[1] * 1.2 + n[1] * 0.45)
        b = (px + s * t[0] * 1.2 - n[0] * 0.45, py + s * t[1] * 1.2 - n[1] * 0.45)
        els.append(f'<polyline points="{a[0]*scale:.1f},{a[1]*scale:.1f} {px*scale:.1f},{py*scale:.1f} '
                   f'{b[0]*scale:.1f},{b[1]*scale:.1f}" fill="none" stroke="#111111" stroke-width="0.35"/>')
    mid = lerp(g[0], g[1], 0.5)
    ang = math.degrees(math.atan2(t[1], t[0]))
    els.append(f'<text x="{mid[0]*scale:.1f}" y="{mid[1]*scale - 1.2:.1f}" font-size="3.2" font-family="Helvetica, Arial, sans-serif" '
               f'text-anchor="middle" transform="rotate({ang:.1f} {mid[0]*scale:.1f} {mid[1]*scale:.1f})">DRITTOFILO</text>')
    return els


def piece_svg(pc, scale=10.0):
    els = [_svg_path(pc.cut_line(), True, "cut", scale)]
    for e in pc.edges:
        st = {"fag": "hint", "fold": "fold"}.get(e.kind, "seam")
        els.append(_svg_path(e.pts, False, st, scale))
    for fl in pc.fold_lines():
        els.append(_svg_path(fl, False, "fag", scale))
    for a, b in pc.notch_segments():
        els.append(f'<line x1="{a[0]*scale:.2f}" y1="{a[1]*scale:.2f}" x2="{b[0]*scale:.2f}" y2="{b[1]*scale:.2f}" stroke="#111111" stroke-width="0.45"/>')
    for pts, style, lab in pc.lines:
        els.append(_svg_path(pts, False, style, scale))
        if lab:
            m = lerp(pts[0], pts[-1], 0.5)
            els.append(f'<text x="{m[0]*scale + 4:.1f}" y="{m[1]*scale - 2:.1f}" font-size="3" font-family="Helvetica, Arial, sans-serif" fill="#333333">{_esc(lab)}</text>')
    for d in pc.drills:
        x, y = d[0] * scale, d[1] * scale
        els.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2" fill="none" stroke="#111111" stroke-width="0.35"/>')
        els.append(f'<path d="M{x-2:.1f},{y:.1f} L{x+2:.1f},{y:.1f} M{x:.1f},{y-2:.1f} L{x:.1f},{y+2:.1f}" stroke="#111111" stroke-width="0.3"/>')
    els += _grain_svg(pc.grain, scale)
    ax, ay = label_anchor(pc)
    rot = f' transform="rotate(-90 {ax*scale:.1f} {ay*scale:.1f})"' if label_rotated(pc) else ""
    labels = piece_label_lines(pc)
    shift = -((len(labels) - 1) * 7 + 2) / 2 if label_rotated(pc) else 0
    lines_svg = []
    for i, line in enumerate(labels):
        size = 7 if i == 0 else 4.2
        weight = 700 if i == 0 else 400
        lines_svg.append(f'<text x="{ax*scale:.1f}" y="{ay*scale + shift + i * 7 + (0 if i == 0 else 2):.1f}" font-size="{size}" font-weight="{weight}" '
                         f'font-family="Helvetica, Arial, sans-serif" text-anchor="middle" fill="#111111">{_esc(line)}</text>')
    els.append(f"<g{rot}>" + "".join(lines_svg) + "</g>")
    return els


def _esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def export_svg(placed, width, height, path, title=""):
    w_mm, h_mm = width * 10, height * 10
    els = [f'<rect width="{w_mm:.0f}" height="{h_mm:.0f}" fill="#ffffff"/>']
    if title:
        els.append(f'<text x="20" y="14" font-size="9" font-weight="700" font-family="Helvetica, Arial, sans-serif">{_esc(title)}</text>')
    for pc in placed:
        els += piece_svg(pc)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w_mm:.0f}mm" height="{h_mm:.0f}mm" '
           f'viewBox="0 0 {w_mm:.0f} {h_mm:.0f}">\n' + "\n".join(els) + "\n</svg>\n")
    Path(path).write_text(svg, encoding="utf-8")


# ── esportazione PDF ─────────────────────────────────────────────────────────

def _pdf_draw_piece(c, pc, mm):
    from reportlab.lib.colors import HexColor

    def poly(pts, close=False, style="cut"):
        st = STYLE[style]
        c.setStrokeColor(HexColor(st["stroke"]))
        c.setLineWidth(st["width"] * mm)
        c.setDash([float(v) * mm for v in st["dash"].split()] if st["dash"] else [])
        p = c.beginPath()
        p.moveTo(pts[0][0] * 10 * mm, -pts[0][1] * 10 * mm)
        for x, y in pts[1:]:
            p.lineTo(x * 10 * mm, -y * 10 * mm)
        if close:
            p.close()
        c.drawPath(p, stroke=1, fill=0)

    poly(pc.cut_line(), True, "cut")
    for e in pc.edges:
        poly(e.pts, False, {"fag": "hint", "fold": "fold"}.get(e.kind, "seam"))
    for fl in pc.fold_lines():
        poly(fl, False, "fag")
    c.setDash([])
    c.setStrokeColor(HexColor("#111111"))
    c.setLineWidth(0.45 * mm)
    for a, b in pc.notch_segments():
        c.line(a[0] * 10 * mm, -a[1] * 10 * mm, b[0] * 10 * mm, -b[1] * 10 * mm)
    for pts, style, lab in pc.lines:
        poly(pts, False, style)
        if lab:
            m = lerp(pts[0], pts[-1], 0.5)
            c.setFillColor(HexColor("#333333"))
            c.setFont("Helvetica", 3 * mm)
            c.drawString(m[0] * 10 * mm + 4 * mm, -m[1] * 10 * mm + 2 * mm, lab)
    c.setDash([])
    c.setStrokeColor(HexColor("#111111"))
    c.setLineWidth(0.35 * mm)
    for d in pc.drills:
        x, y = d[0] * 10 * mm, -d[1] * 10 * mm
        c.circle(x, y, 2 * mm)
        c.line(x - 2 * mm, y, x + 2 * mm, y)
        c.line(x, y - 2 * mm, x, y + 2 * mm)
    (gx0, gy0), (gx1, gy1) = pc.grain
    c.line(gx0 * 10 * mm, -gy0 * 10 * mm, gx1 * 10 * mm, -gy1 * 10 * mm)
    t = unit((gx1 - gx0, gy1 - gy0))
    n = (-t[1], t[0])
    for (px, py), s in (((gx0, gy0), 1), ((gx1, gy1), -1)):
        for k in (1, -1):
            c.line(px * 10 * mm, -py * 10 * mm,
                   (px + s * t[0] * 1.2 + k * n[0] * 0.45) * 10 * mm, -(py + s * t[1] * 1.2 + k * n[1] * 0.45) * 10 * mm)
    mid = lerp(pc.grain[0], pc.grain[1], 0.5)
    c.saveState()
    c.translate(mid[0] * 10 * mm, -mid[1] * 10 * mm)
    c.rotate(-math.degrees(math.atan2(t[1], t[0])))
    c.setFillColor(HexColor("#111111"))
    c.setFont("Helvetica", 3.2 * mm)
    c.drawCentredString(0, 1.5 * mm, "DRITTOFILO")
    c.restoreState()
    ax, ay = label_anchor(pc)
    c.setFillColor(HexColor("#111111"))
    c.saveState()
    c.translate(ax * 10 * mm, -ay * 10 * mm)
    labels = piece_label_lines(pc)
    shift = 0.0
    if label_rotated(pc):
        c.rotate(90)
        shift = ((len(labels) - 1) * 7 + 2) / 2
    for i, line in enumerate(labels):
        c.setFont("Helvetica-Bold" if i == 0 else "Helvetica", (7 if i == 0 else 4.2) * mm)
        c.drawCentredString(0, (shift - (i * 7 + (0 if i == 0 else 2))) * mm, line)
    c.restoreState()


def export_pdf_plotter(placed, width, height, path, title):
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    W, H = width * 10 * mm, height * 10 * mm + 20 * mm
    c = canvas.Canvas(str(path), pagesize=(W, H))
    c.setTitle(title)
    c.setFont("Helvetica-Bold", 9 * mm)
    c.drawString(20 * mm, H - 12 * mm, title)
    c.translate(0, H - 20 * mm)
    for pc in placed:
        _pdf_draw_piece(c, pc, mm)
    c.showPage()
    c.save()


def export_pdf_tiles(placed, width, height, path, title, cover_lines, piece_rows):
    """PDF A4: copertina + pagine 1:1 affiancabili (le pagine vuote non vengono incluse)."""
    from reportlab.lib.colors import HexColor
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas

    PW, PH = A4
    M = 10 * mm                      # margine di stampa
    TW, TH = PW - 2 * M, PH - 2 * M  # area utile per pagina
    cols = math.ceil(width * 10 * mm / TW)
    rows = math.ceil(height * 10 * mm / TH)

    # quali tessere contengono qualcosa
    pts_cm = []
    for pc in placed:
        pts_cm += pc.cut_line()
        for e in pc.edges:
            pts_cm += e.pts
    used = set()
    for x, y in pts_cm:
        used.add((int(y * 10 * mm // TH), int(x * 10 * mm // TW)))
    # riempie anche le tessere interne ai pezzi (tra due bordi sulla stessa colonna)
    for pc in placed:
        x0, y0, x1, y1 = bbox(pc.cut_line())
        for r in range(int(y0 * 10 * mm // TH), int(y1 * 10 * mm // TH) + 1):
            for ccol in range(int(x0 * 10 * mm // TW), int(x1 * 10 * mm // TW) + 1):
                used.add((r, ccol))

    def tile_name(r, ccol):
        return f"{chr(65 + r)}{ccol + 1}"

    c = canvas.Canvas(str(path), pagesize=A4)
    c.setTitle(title)

    # copertina
    c.setFont("Helvetica-Bold", 16)
    c.drawString(M, PH - M - 14, title)
    c.setFont("Helvetica", 9)
    y = PH - M - 34
    for line in cover_lines:
        c.drawString(M, y, line)
        y -= 12
    # quadrato di controllo 10 x 10 cm
    sq_y = y - 10 - 100 * mm
    c.setLineWidth(0.6)
    c.rect(M, sq_y, 100 * mm, 100 * mm)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(M + 50 * mm, sq_y + 52 * mm, "QUADRATO DI CONTROLLO")
    c.setFont("Helvetica", 8)
    c.drawCentredString(M + 50 * mm, sq_y + 46 * mm, "deve misurare 10 x 10 cm")
    c.drawCentredString(M + 50 * mm, sq_y + 41 * mm, "stampa al 100%, senza adattare alla pagina")
    # mappa delle pagine
    mx, my = M + 108 * mm, sq_y
    cell = min((PW - M - mx) / cols, 100 * mm / rows)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(mx, sq_y + rows * cell + 6, "Mappa delle pagine (grigio = da stampare)")
    c.setFont("Helvetica", max(4, min(6, cell * 0.45)))
    for r in range(rows):
        for ccol in range(cols):
            x = mx + ccol * cell
            yy = sq_y + (rows - 1 - r) * cell
            if (r, ccol) in used:
                c.setFillColor(HexColor("#d8d8d8"))
                c.rect(x, yy, cell, cell, stroke=1, fill=1)
                c.setFillColor(HexColor("#111111"))
                c.drawCentredString(x + cell / 2, yy + cell / 2 - 2, tile_name(r, ccol))
            else:
                c.setFillColor(HexColor("#ffffff"))
                c.rect(x, yy, cell, cell, stroke=1, fill=0)
    c.setFillColor(HexColor("#111111"))
    # elenco pezzi
    y = sq_y - 18
    c.setFont("Helvetica-Bold", 9)
    c.drawString(M, y, "Pezzi")
    y -= 12
    c.setFont("Helvetica", 8)
    for row in piece_rows:
        if y < M + 10:
            c.showPage()
            y = PH - M - 10
            c.setFont("Helvetica", 8)
        c.drawString(M, y, row)
        y -= 10.5
    c.showPage()

    # ingombro di ogni pezzo con le sue etichette (cm), per disegnare solo i pezzi della pagina
    boxes = []
    for pc in placed:
        x0, y0, x1, y1 = bbox(pc.cut_line())
        boxes.append((x0 - 2, y0 - 2, x1 + 2, y1 + 2))
    n_pages = 0
    for r in range(rows):
        for ccol in range(cols):
            if (r, ccol) not in used:
                continue
            n_pages += 1
            c.saveState()
            p = c.beginPath()
            p.rect(M, M, TW, TH)
            c.clipPath(p, stroke=0, fill=0)
            c.translate(M - ccol * TW, PH - M + r * TH)
            tx0, ty0 = ccol * TW / (10 * mm), r * TH / (10 * mm)
            tx1, ty1 = tx0 + TW / (10 * mm), ty0 + TH / (10 * mm)
            for pc, (bx0, by0, bx1, by1) in zip(placed, boxes):
                if bx1 >= tx0 and bx0 <= tx1 and by1 >= ty0 and by0 <= ty1:
                    _pdf_draw_piece(c, pc, mm)
            c.restoreState()
            # cornice e riferimenti di giunzione
            c.setDash([])
            c.setLineWidth(0.3)
            c.setStrokeColor(HexColor("#999999"))
            c.rect(M, M, TW, TH)
            c.setFillColor(HexColor("#999999"))
            c.setFont("Helvetica", 7)
            c.drawString(M + 2, PH - M + 3, f"{title} · pagina {tile_name(r, ccol)} · riga {chr(65 + r)}, colonna {ccol + 1}")
            # triangoli di allineamento sui lati con le pagine vicine
            for side, cond in (("top", r > 0), ("bottom", r < rows - 1), ("left", ccol > 0), ("right", ccol < cols - 1)):
                if not cond:
                    continue
                if side in ("top", "bottom"):
                    yy = PH - M if side == "top" else M
                    for fx in (0.25, 0.75):
                        xx = M + TW * fx
                        c.line(xx - 4 * mm, yy, xx, yy + (-4 if side == "top" else 4) * mm)
                        c.line(xx + 4 * mm, yy, xx, yy + (-4 if side == "top" else 4) * mm)
                else:
                    xx = M if side == "left" else M + TW
                    for fy in (0.25, 0.75):
                        yy = M + TH * fy
                        c.line(xx, yy - 4 * mm, xx + (4 if side == "left" else -4) * mm, yy)
                        c.line(xx, yy + 4 * mm, xx + (4 if side == "left" else -4) * mm, yy)
            c.setFont("Helvetica-Bold", 22)
            c.setFillColor(HexColor("#e2e2e2"))
            c.drawRightString(PW - M - 4, M + 6, tile_name(r, ccol))
            c.setFillColor(HexColor("#111111"))
            c.showPage()
    c.save()
    return n_pages, rows, cols


# ── esportazione DXF (R12, livelli stile AAMA) ───────────────────────────────

def export_dxf(placed, path):
    """DXF R12 in millimetri. Ogni pezzo è un BLOCK, inserito nella sua posizione."""
    out = []

    def w(code, val):
        out.append(f"{code}\n{val}")

    def poly(pts, layer, close):
        w(0, "POLYLINE"); w(8, layer); w(66, 1); w(70, 1 if close else 0)
        for x, y in pts:
            w(0, "VERTEX"); w(8, layer); w(10, f"{x * 10:.3f}"); w(20, f"{-y * 10:.3f}")
        w(0, "SEQEND"); w(8, layer)

    def line(a, b, layer):
        w(0, "LINE"); w(8, layer)
        w(10, f"{a[0] * 10:.3f}"); w(20, f"{-a[1] * 10:.3f}")
        w(11, f"{b[0] * 10:.3f}"); w(21, f"{-b[1] * 10:.3f}")

    def text(p, s, h, layer="15"):
        w(0, "TEXT"); w(8, layer); w(10, f"{p[0] * 10:.3f}"); w(20, f"{-p[1] * 10:.3f}"); w(40, h); w(1, s)

    layers = ["1", "4", "7", "8", "13", "14", "15"]
    w(0, "SECTION"); w(2, "HEADER")
    w(9, "$ACADVER"); w(1, "AC1009")
    w(9, "$INSUNITS"); w(70, 4)
    w(0, "ENDSEC")
    w(0, "SECTION"); w(2, "TABLES")
    w(0, "TABLE"); w(2, "LAYER"); w(70, len(layers))
    for L in layers:
        w(0, "LAYER"); w(2, L); w(70, 0); w(62, 7); w(6, "CONTINUOUS")
    w(0, "ENDTAB"); w(0, "ENDSEC")

    w(0, "SECTION"); w(2, "BLOCKS")
    for pc in placed:
        bname = f"P{pc.num:02d}_{pc.name.replace(' ', '_').upper()}"[:31]
        w(0, "BLOCK"); w(8, "0"); w(2, bname); w(70, 0); w(10, 0.0); w(20, 0.0); w(30, 0.0); w(3, bname)
        poly(pc.cut_line(), "1", True)
        poly(pc.seam(), "14", True)
        for a, b in pc.notch_segments():
            line(a, b, "4")
        line(pc.grain[0], pc.grain[1], "7")
        for e in pc.edges:
            if e.kind == "fold":
                poly(e.pts, "8", False)
        for fl in pc.fold_lines():
            poly(fl, "8", False)
        for pts, _, _ in pc.lines:
            poly(pts, "8", False)
        for d in pc.drills:
            w(0, "POINT"); w(8, "13"); w(10, f"{d[0] * 10:.3f}"); w(20, f"{-d[1] * 10:.3f}")
        ax, ay = label_anchor(pc)
        text((ax - 6, ay), f"Piece Name: {pc.name}", 6)
        text((ax - 6, ay + 1.0), f"Quantity: {pc.cut}", 4)
        text((ax - 6, ay + 1.8), f"Material: {pc.material}", 4)
        text((ax - 6, ay + 2.6), f"Size: {pc.size}", 4)
        text((ax - 6, ay + 3.4), f"Style: {pc.code}", 4)
        w(0, "ENDBLK"); w(8, "0")
    w(0, "ENDSEC")

    w(0, "SECTION"); w(2, "ENTITIES")
    for pc in placed:
        bname = f"P{pc.num:02d}_{pc.name.replace(' ', '_').upper()}"[:31]
        w(0, "INSERT"); w(8, "0"); w(2, bname); w(10, 0.0); w(20, 0.0); w(30, 0.0)
    w(0, "ENDSEC")
    w(0, "EOF")
    Path(path).write_text("\n".join(out) + "\n", encoding="ascii", errors="replace")
