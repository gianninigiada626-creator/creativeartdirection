"""Cartamodello del Pantalone della Festa (B01-PF), taglia base 3.

Genera nella cartella brand/03-collezione-01-borgata/pantalone-della-festa/cartamodello/
gli stessi formati della giacca (PDF A4, PDF plotter, DXF, SVG) e verifica-misure.md.

Uso: python3 brand/strumenti/cartamodello_pantalone.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cartamodello_lib import (Edge, Piece, add, area, bbox, bez, chain, dist, export_dxf, export_pdf_plotter,  # noqa: E402
                              export_pdf_tiles, export_svg, layout, length, lerp, mul, offset, point_at,
                              rect_piece, rev, seg, sub, unit)

OUT = Path(__file__).resolve().parents[1] / "03-collezione-01-borgata" / "pantalone-della-festa" / "cartamodello"
CODE = "B01-PF"

# ── misure di costruzione, taglia 3 (cm). y = 0 sulla cucitura della cintura ──
WB_H = 4.0
Y_HIP = 14.0            # bacino misurato 18 cm sotto il bordo della cintura
Y_CR = 24.0             # linea del cavallo (altezza cavallo dal bordo cintura: 28)
INSEAM = 76.0
L = Y_CR + INSEAM       # fondo finito
Y_KNEE = Y_CR + 35.0
HIP_F, HIP_B = 25.5, 27.5           # 1/4 bacino ∓ 1 (bacino 106)
EXT_F, EXT_B = 4.8, 10.0            # prolungamenti del cavallo
BACK_CR_DROP = 0.7
WAIST_Q = 21.0                      # 1/4 vita in estensione (84)
WAIST_RELAXED_HALF = 39.0
PLEAT, DART = 3.0, 2.0
KNEE_F, KNEE_B = 22.0, 24.0         # ginocchio 46
HEM_F, HEM_B = 18.0, 20.0           # fondo 38
SIDE_SHIFT = 2.0                    # cucitura laterale spostata verso il davanti
TURNUP = 4.0
TURNUP_EXT = 2 * TURNUP + 4.0       # prolungamento: 2 × risvolto + 4 cm di orlo
FAG_GAP = 0.3
FAG_SA = 1.0 - FAG_GAP
SA = 1.0
POCKET_LOW = 16.0                   # la tasca laterale finisce sulla cucitura a 16 cm
POCKET_IN = 4.5
FLY_W, FLY_L = 3.5, 18.0


def to_y(pts, y0):
    """Allunga o accorcia l'inizio della polilinea fino alla retta y = y0."""
    a, b = pts[0], pts[1]
    t = (y0 - a[1]) / (b[1] - a[1]) if b[1] != a[1] else 0
    first = lerp(a, b, t)
    return [first] + [p for p in pts[1:] if p[1] > y0]


def cut_at_y(pts, y):
    """Divide una polilinea discendente alla quota y."""
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        if (a[1] - y) * (b[1] - y) <= 0 and a[1] != b[1]:
            p = lerp(a, b, (y - a[1]) / (b[1] - a[1]))
            return pts[: i + 1] + [p], [p] + pts[i + 1:]
    return pts, [pts[-1]]


def x_at_y(pts, y):
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        if (a[1] - y) * (b[1] - y) <= 0 and a[1] != b[1]:
            return lerp(a, b, (y - a[1]) / (b[1] - a[1]))[0]
    return None


def turnup(x_hem, slope):
    """Prolungamento sotto il fondo finito, specchiato a ogni piega perché il risvolto
    segua la rastremazione della gamba. slope = dx/dy della gamba sopra il fondo."""
    pts = [(x_hem, L)]
    x = x_hem
    for k in range(3):
        s = -slope if k % 2 == 0 else slope
        h = TURNUP if k < 2 else TURNUP_EXT - 2 * TURNUP
        x += s * h
        pts.append((x, pts[-1][1] + h))
    return pts


def leg_side(waist, hip_x, knee_x, hem_x):
    return chain(bez(waist, (waist[0] + 1.1, 4.0), (hip_x, 9.0), (hip_x, Y_HIP)),
                 seg((hip_x, Y_HIP), (hip_x, Y_CR)),
                 bez((hip_x, Y_CR), (hip_x, Y_CR + 9.0),
                     add((knee_x, Y_KNEE), mul(unit((knee_x - hem_x, Y_KNEE - L)), 9.0)), (knee_x, Y_KNEE)),
                 seg((knee_x, Y_KNEE), (hem_x, L)))


def leg_inseam(crotch, knee_x, hem_x):
    up = unit((knee_x - hem_x, Y_KNEE - L))
    return chain(seg((hem_x, L), (knee_x, Y_KNEE)),
                 bez((knee_x, Y_KNEE), add((knee_x, Y_KNEE), mul(up, 9.0)),
                     (crotch[0] + 1.3, crotch[1] + 6.0), crotch))


# ── davanti ──────────────────────────────────────────────────────────────────

def front_geometry():
    f = {}
    f["CFw"] = (0.8, 0.0)
    f["CR"] = (-EXT_F, Y_CR)
    crease = (HIP_F - EXT_F) / 2
    f["crease"] = crease
    side_w = (f["CFw"][0] + WAIST_Q - 1.0 + PLEAT, 0.0)
    side0 = leg_side(side_w, HIP_F, crease + KNEE_F / 2, crease + HEM_F / 2)
    side = to_y(offset(side0, -SIDE_SHIFT), 0.0)
    side, _ = cut_at_y(side, L)
    f["side"] = side
    f["inseam"] = leg_inseam(f["CR"], crease - KNEE_F / 2, crease - HEM_F / 2)
    f["crotch"] = bez((0.0, Y_HIP), (0.0, 19.5), (-1.6, Y_CR), f["CR"])
    f["cf"] = seg(f["CFw"], (0.0, Y_HIP))
    return f


def make_front(f):
    side = f["side"]
    sw = side[0]
    p_top = (sw[0] - POCKET_IN, 0.0)
    above, below = cut_at_y(side, POCKET_LOW)
    p_side = below[0]
    fag, plain = cut_at_y(below, L - TURNUP)
    side_slope = (side[-1][0] - side[-2][0]) / (side[-1][1] - side[-2][1])
    in_slope = (f["inseam"][1][0] - f["inseam"][0][0]) / (f["inseam"][1][1] - f["inseam"][0][1])
    side_ext = turnup(side[-1][0], side_slope)
    ins_ext = turnup(f["inseam"][0][0], in_slope)
    opening = bez(p_top, add(p_top, (1.2, 5.0)), add(p_side, (-1.4, -4.0)), p_side)
    pc = Piece(1, "Davanti", "TESSUTO", "Tagliare 2 (in coppia)",
               [Edge(seg(f["CFw"], p_top), SA, name="cintura"),
                Edge(opening, SA, name="apertura tasca"),
                Edge(fag, FAG_SA, "fag", "laterale a giorno", FAG_GAP),
                Edge(chain(plain, side_ext[1:]), SA, name="laterale risvolto"),
                Edge(seg(side_ext[-1], ins_ext[-1]), 0.0, "hem", "orlo"),
                Edge(chain(rev(ins_ext), f["inseam"][1:]), SA, name="interno gamba"),
                Edge(rev(f["crotch"]), SA, name="cavallo"),
                Edge(rev(f["cf"]), SA, name="centro davanti")],
               ((f["crease"], 8.0), (f["crease"], L - 8.0)), code=CODE)
    c = f["crease"]
    pc.lines += [
        (seg((c, 0.0), (c, 7.0)), "place", "pince 3 cm"),
        (seg((c + PLEAT, 0.0), (c + PLEAT, 4.0)), "hint", ""),
        (seg((x_at_y(f["inseam"], L), L), (x_at_y(side, L - 0.001) or side[-1][0], L)), "fold", "fondo finito"),
        (seg((ins_ext[1][0], L + TURNUP), (side_ext[1][0], L + TURNUP)), "fold", "piega risvolto"),
        (seg((ins_ext[2][0], L + 2 * TURNUP), (side_ext[2][0], L + 2 * TURNUP)), "fold", "piega risvolto"),
        (seg((x_at_y(f["inseam"], L - TURNUP), L - TURNUP), (plain[0][0], L - TURNUP)), "hint", "altezza risvolto finito"),
        (chain(seg((0.8 + FLY_W, 0.0), (FLY_W + 0.2, 15.5)),
               bez((FLY_W + 0.2, 15.5), (FLY_W + 0.2, 18.5), (1.5, 19.5), (0.0, 19.6))), "hint",
         "impuntura a mano J (solo sinistro)"),
    ]
    pc.notch(0, length(seg(f["CFw"], (c, 0.0))))
    pc.notch(0, length(seg(f["CFw"], (c + PLEAT, 0.0))))
    pc.notch(5, length(f["inseam"]) - (Y_KNEE - Y_CR) * 1.0, 1, from_end=False)
    pc.notch(6, length(cut_at_y(f["crotch"], 19.6)[0]), 1, from_end=True)   # fine della patta
    pc.notes = ["Laterale a giorno fino al risvolto", "Prolungamento risvolto: 2 × 4 + 4 cm"]
    pc.label_at = (c, 34.0)
    return pc, dict(fag=fag, above=above, p_top=p_top, p_side=p_side, side_ext=side_ext, ins_ext=ins_ext,
                    plain=plain, opening=opening)


# ── dietro ───────────────────────────────────────────────────────────────────

def back_geometry(side_drop=0.0, waist_adj=0.0):
    b = {}
    b["CBw"] = (3.0, -2.5)
    b["CBh"] = (0.0, Y_HIP)
    b["CR"] = (-EXT_B, Y_CR + BACK_CR_DROP)
    crease = (HIP_B - EXT_B) / 2 + 0.5
    b["crease"] = crease
    cb_up = unit(sub(b["CBw"], b["CBh"]))
    perp = unit((-cb_up[1], cb_up[0]))
    if perp[0] < 0:
        perp = (-perp[0], -perp[1])
    width = WAIST_Q + 1.0 + DART + waist_adj
    side_w0 = (b["CBw"][0] + width - 0.3, 0.0)
    side0 = leg_side(side_w0, HIP_B, crease + KNEE_B / 2, crease + HEM_B / 2)
    # il punto vita laterale scende di side_drop: pareggia la laterale a giorno con il davanti
    side = to_y(offset(side0, SIDE_SHIFT), side_drop)
    side, _ = cut_at_y(side, L)
    b["side"] = side
    # la cintura dietro arriva al nuovo punto laterale
    sw = side[0]
    b["waist"] = bez(b["CBw"], add(b["CBw"], mul(perp, 8.0)), (sw[0] - 8.0, sw[1] - 0.3), sw)
    b["inseam"] = leg_inseam(b["CR"], crease - KNEE_B / 2, crease - HEM_B / 2)
    b["crotch"] = bez(b["CBh"], add(b["CBh"], mul((-cb_up[0], -cb_up[1]), 3.0)), (-3.5, Y_CR + 0.6), b["CR"])
    b["cb"] = seg(b["CBh"], b["CBw"])
    return b


def make_back(b):
    side = b["side"]
    fag, plain = cut_at_y(side, L - TURNUP)
    side_slope = (side[-1][0] - side[-2][0]) / (side[-1][1] - side[-2][1])
    in_slope = (b["inseam"][1][0] - b["inseam"][0][0]) / (b["inseam"][1][1] - b["inseam"][0][1])
    side_ext = turnup(side[-1][0], side_slope)
    ins_ext = turnup(b["inseam"][0][0], in_slope)
    pc = Piece(2, "Dietro", "TESSUTO", "Tagliare 2 (in coppia)",
               [Edge(b["waist"], SA, name="cintura"),
                Edge(fag, FAG_SA, "fag", "laterale a giorno", FAG_GAP),
                Edge(chain(plain, side_ext[1:]), SA, name="laterale risvolto"),
                Edge(seg(side_ext[-1], ins_ext[-1]), 0.0, "hem", "orlo"),
                Edge(chain(rev(ins_ext), b["inseam"][1:]), SA, name="interno gamba"),
                Edge(rev(b["crotch"]), 1.0, name="cavallo", sa_end=2.5),
                Edge(b["cb"], 2.5, name="centro dietro (riserva)", sa_end=4.0)],
               ((b["crease"], 18.0), (b["crease"], L - 8.0)), code=CODE)
    # pince al centro della cintura, perpendicolare
    wl = length(b["waist"])
    mid, t = point_at(b["waist"], wl * 0.42)
    down = unit((-t[1], t[0]))
    if down[1] < 0:
        down = (-down[0], -down[1])
    tip = add(mid, mul(down, 9.0))
    a = add(mid, mul(t, -DART / 2))
    c = add(mid, mul(t, DART / 2))
    pc.lines += [([a, tip, c], "place", "pince 2 cm")]
    pc.notch(0, wl * 0.42 - DART / 2)
    pc.notch(0, wl * 0.42 + DART / 2)
    # tasca a filetto (solo dietro destro): parallela alla cintura, 7 cm sotto, 14 cm
    pk_c = add(mid, mul(down, 7.0))
    p0, p1 = add(pk_c, mul(t, -7.0)), add(pk_c, mul(t, 7.0))
    pc.lines += [([p0, p1], "place", "tasca a filetto 14 cm (solo destro)"),
                 ([add(p0, mul(down, -0.5)), add(p1, mul(down, -0.5)), add(p1, mul(down, 0.5)),
                   add(p0, mul(down, 0.5)), add(p0, mul(down, -0.5))], "hint", "")]
    pc.drills += [add(p0, mul(t, 0.3)), add(p1, mul(t, -0.3)), add(pk_c, mul(down, 1.9))]
    L_ = L
    pc.lines += [
        (seg((x_at_y(b["inseam"], L_), L_), (side[-1][0], L_)), "fold", "fondo finito"),
        (seg((ins_ext[1][0], L_ + TURNUP), (side_ext[1][0], L_ + TURNUP)), "fold", "piega risvolto"),
        (seg((ins_ext[2][0], L_ + 2 * TURNUP), (side_ext[2][0], L_ + 2 * TURNUP)), "fold", "piega risvolto"),
    ]
    pc.notch(4, length(b["inseam"]) - (Y_KNEE - Y_CR), 1)
    pc.notes = ["Centro dietro: riserva da 4 cm (cintura) a 1 cm (cavallo)", "Fori: tasca e bottone"]
    pc.label_at = (b["crease"], 40.0)
    return pc, dict(fag=fag, side_ext=side_ext)


# ── piccoli pezzi ────────────────────────────────────────────────────────────

def make_pocket_facing(f, fr):
    sw = f["side"][0]
    x_in = fr["p_top"][0] - 3.5
    side_part, _ = cut_at_y(f["side"], POCKET_LOW + 4.0)
    inner = bez(side_part[-1], (side_part[-1][0] - 4.0, POCKET_LOW + 4.5), (x_in, 10.0), (x_in, 0.0))
    pc = Piece(6, "Sottopunta tasca", "TESSUTO", "Tagliare 2 (in coppia)",
               [Edge(seg((x_in, 0.0), sw), SA, name="cintura"),
                Edge(side_part, FAG_SA, "fag", "laterale a giorno", FAG_GAP),
                Edge(inner, SA, name="sul sacco")],
               ((x_in + 2.5, 3.0), (x_in + 2.5, 12.0)), code=CODE)
    pc.notch(1, POCKET_LOW)
    pc.label_at = (x_in + 4.0, 8.0)
    return pc


def make_side_bag(f, fr):
    sw = f["side"][0]
    x_in = fr["p_top"][0] - 6.0
    side_part, _ = cut_at_y(f["side"], 30.0)
    bottom = bez(side_part[-1], (side_part[-1][0] - 2.0, 33.5), (x_in + 2.0, 33.5), (x_in, 28.0))
    pc = Piece(13, "Sacco tasca laterale", "TASCHE", "Tagliare 4 (2 coppie)",
               [Edge(seg((x_in, 0.0), sw), SA, name="cintura"),
                Edge(side_part, SA, name="laterale"),
                Edge(bottom, SA, name="fondo"),
                Edge(seg((x_in, 28.0), (x_in, 0.0)), SA, name="interno")],
               ((x_in + 3.0, 4.0), (x_in + 3.0, 24.0)), code=CODE)
    pc.lines.append((fr["opening"], "place", "apertura tasca"))
    pc.label_at = (x_in + 5.5, 12.0)
    return pc


def make_knee_lining(f):
    sw = f["side"][0]
    side_part, _ = cut_at_y(f["side"], Y_KNEE + 5.0)
    ins_part = cut_at_y(rev(f["inseam"]), Y_KNEE + 5.0)[0]
    pc = Piece(11, "Fodera ginocchio", "FODERA", "Tagliare 2 (in coppia)",
               [Edge(seg(f["CFw"], sw), SA, name="cintura"),
                Edge(side_part, SA, name="laterale"),
                Edge(seg(side_part[-1], ins_part[-1]), SA, "hem", "fondo libero"),
                Edge(rev(ins_part), SA, name="interno gamba"),
                Edge(rev(f["crotch"]), SA, name="cavallo"),
                Edge(rev(f["cf"]), SA, name="centro davanti")],
               ((f["crease"], 10.0), (f["crease"], 50.0)), code=CODE)
    pc.notes = ["Fondo rifinito, libero"]
    pc.label_at = (f["crease"], 28.0)
    return pc


def fly_pieces():
    patta = Piece(7, "Patta", "TESSUTO", "Tagliare 1",
                  [Edge(seg((0, 0), (5.0, 0)), SA), Edge(seg((5.0, 0), (5.0, 16.0)), SA),
                   Edge(bez((5.0, 16.0), (5.0, 20.0), (2.0, 21.0), (0.0, 21.0)), SA),
                   Edge(seg((0.0, 21.0), (0, 0)), SA)],
                  ((2.5, 3.0), (2.5, 15.0)), code=CODE, notes=["Teletta"])
    patta.label_at = (2.5, 7.0)
    sotto = Piece(8, "Sottopatta", "TESSUTO", "Tagliare 1",
                  [Edge(seg((0, 0), (10.0, 0)), SA), Edge(seg((10.0, 0), (10.0, 18.0)), SA),
                   Edge(bez((10.0, 18.0), (10.0, 21.5), (7.0, 22.0), (5.0, 22.0)), SA),
                   Edge(chain(seg((5.0, 22.0), (0.0, 22.0)), seg((0.0, 22.0), (0, 0))), SA)],
                  ((7.5, 3.0), (7.5, 15.0)), code=CODE, notes=["Piegare a metà in lunghezza"])
    sotto.lines.append((seg((5.0, 0.0), (5.0, 22.0)), "fold", "piega"))
    sotto.label_at = (5.0, 6.0)
    return patta, sotto


def band_piece(num, name, cut, length_net, height_net, cb_reserve=None, ext=0.0, fold_mid=False, notes=()):
    w = length_net + ext
    pts = [(0, 0), (w, 0), (w, height_net), (0, height_net)]
    left_sa = cb_reserve if cb_reserve is not None else SA
    pc = Piece(num, name, "TESSUTO", cut,
               [Edge(seg(pts[0], pts[1]), SA), Edge(seg(pts[1], pts[2]), SA),
                Edge(seg(pts[2], pts[3]), SA), Edge(seg(pts[3], pts[0]), left_sa)],
               ((w * 0.3, height_net / 2 + (1.0 if fold_mid else 0)), (w * 0.7, height_net / 2 + (1.0 if fold_mid else 0))),
               code=CODE, notes=list(notes))
    if fold_mid:
        pc.lines.append((seg((0, height_net / 2), (w, height_net / 2)), "fold", "piega"))
    if ext:
        pc.lines.append((seg((length_net, 0), (length_net, height_net)), "hint", "centro davanti"))
    pc.label_at = (w / 2, height_net * 0.3)
    return pc


# ── tutti i pezzi ────────────────────────────────────────────────────────────

def build():
    f = front_geometry()
    front, fr = make_front(f)
    # pareggia le laterali a giorno (nessun agio possibile) e la vita in estensione (42 cm)
    front_side = length(cut_at_y(f["side"], L - TURNUP)[0])
    front_waist = length(seg(f["CFw"], f["side"][0])) - PLEAT
    drop, wadj = 0.0, 0.0
    for _ in range(6):
        lo, hi = -2.0, 4.0
        for _ in range(50):
            drop = (lo + hi) / 2
            back_side = length(cut_at_y(back_geometry(drop, wadj)["side"], L - TURNUP)[0])
            if back_side > front_side:
                lo = drop
            else:
                hi = drop
        b = back_geometry(drop, wadj)
        wadj += 2 * WAIST_Q - front_waist - (length(b["waist"]) - DART)
    b = back_geometry(drop, wadj)
    back, br = make_back(b)

    back_waist = length(b["waist"]) - DART
    elastic = 2 * (WAIST_RELAXED_HALF - front_waist)
    band_l = band_piece(3, "Cintura davanti sinistra", "Tagliare 1", front_waist, WB_H,
                        notes=["Interno in gros-grain antiscivolo"])
    band_r = band_piece(4, "Cintura davanti destra", "Tagliare 1", front_waist, WB_H, ext=4.0,
                        notes=["Con estensione 4 cm per gancio e bottone"])
    band_b = band_piece(5, "Cintura dietro", "Tagliare 2 (in coppia)", back_waist, 2 * WB_H, cb_reserve=4.0,
                        fold_mid=True, notes=["Elastico 3 cm interno, lungo %.1f cm (tutto il dietro)" % elastic,
                                              "Centro dietro: riserva 4 cm"])
    facing = make_pocket_facing(f, fr)
    patta, sotto = fly_pieces()
    jets = rect_piece(9, "Filetti tasca dietro", "TESSUTO", "Tagliare 2", 18.0, 4.0, sa=0.0, grain="h", code=CODE,
                      notes=["Misure al taglio, teletta"])
    pfac = rect_piece(10, "Fondo tasca dietro", "TESSUTO", "Tagliare 1", 18.0, 6.0, sa=0.0, grain="h", code=CODE,
                      notes=["Misure al taglio"])
    knee = make_knee_lining(f)
    side_len = length(cut_at_y(f["side"], L - TURNUP)[0])
    strip = rect_piece(12, "Striscia sotto giunzione", "FODERA", "Tagliare 2 in sbieco", 3.0, side_len + 2.0,
                       sa=0.0, code=CODE, notes=["Al taglio, in sbieco"])
    bag = make_side_bag(f, fr)
    bbag = rect_piece(14, "Sacco tasca dietro", "TASCHE", "Tagliare 1", 18.0, 36.0, sa=0.0, code=CODE,
                      notes=["Al taglio; piegare a metà"])
    for r in (jets, pfac, strip, bbag):
        x0, y0, x1, y1 = bbox(r.seam())
        r.label_at = ((x0 + x1) / 2, y0 + min(4.0, (y1 - y0) * 0.3))
    pieces = [front, back, band_l, band_r, band_b, facing, patta, sotto, jets, pfac, knee, strip, bag, bbag]
    for pc in pieces:
        pc.code = CODE
    return pieces, dict(f=f, b=b, fr=fr, br=br, front_waist=front_waist, back_waist=back_waist,
                        elastic=elastic, side_drop=drop, waist_adj=wadj, front=front, back=back)


def verify(info):
    f, b = info["f"], info["b"]
    rows, checks = [], []

    def row(name, spec, val, note=""):
        rows.append((name, spec, val, note))

    rows_y = Y_HIP
    hip = (x_at_y(f["side"], rows_y) - 0.0) + (x_at_y(b["side"], rows_y) - 0.0)
    row("A · 1/2 vita a riposo", 39.0, WAIST_RELAXED_HALF, "con l'elastico dietro")
    row("B · 1/2 vita in estensione", 42.0, info["front_waist"] + info["back_waist"])
    row("C · 1/2 bacino (18 cm sotto il bordo cintura)", 53.0, hip)
    front_rise = WB_H + length(f["cf"]) + length(f["crotch"])
    back_rise = WB_H + length(b["cb"]) + length(b["crotch"])
    row("D · Cavallo davanti, cintura inclusa", 28.0, front_rise, "aggiornato dal cartamodello")
    row("E · Cavallo dietro, cintura inclusa", 39.0, back_rise, "aggiornato dal cartamodello")
    inseam_f = length(f["inseam"])
    row("F · Interno gamba (al fondo finito)", 76.0, inseam_f)
    outseam = WB_H + length(f["side"])
    row("G · Esterno gamba, cintura inclusa", 104.0, outseam, "aggiornato dal cartamodello")
    y = Y_CR + 2.5
    thigh = ((x_at_y(f["side"], y) - x_at_y(f["inseam"], y)) + (x_at_y(b["side"], y) - x_at_y(b["inseam"], y))) / 2
    row("H · 1/2 coscia", 33.0, thigh, "aggiornato dal cartamodello")
    knee = ((x_at_y(f["side"], Y_KNEE) - x_at_y(f["inseam"], Y_KNEE)) + (x_at_y(b["side"], Y_KNEE) - x_at_y(b["inseam"], Y_KNEE))) / 2
    row("I · 1/2 ginocchio", 23.0, knee)
    hem = ((f["side"][-1][0] - f["inseam"][0][0]) + (b["side"][-1][0] - b["inseam"][0][0])) / 2
    row("J · 1/2 fondo", 19.0, hem)
    row("M · Apertura tasca laterale", 17.0, length(info["fr"]["opening"]))

    fs = length(cut_at_y(f["side"], L - TURNUP)[0])
    bs = length(cut_at_y(b["side"], L - TURNUP)[0])
    checks.append(("Laterale a giorno davanti = dietro (nessun agio)", fs, bs, abs(fs - bs) < 0.1, ""))
    ib = length(b["inseam"])
    checks.append(("Interno gamba dietro − davanti", ib, inseam_f, abs(ib - inseam_f) <= 0.8,
                   "%.2f cm da distribuire sulla coscia" % (ib - inseam_f)))
    checks.append(("Cintura davanti (senza pince) + dietro (senza pince) = 1/2 vita in estensione",
                   info["front_waist"] + info["back_waist"], 42.0,
                   abs(info["front_waist"] + info["back_waist"] - 42.0) < 1.0, ""))
    return rows, checks


def write_report(rows, checks, info, marker, n_pages, grid, path):
    lines = ["# Verifica misure — cartamodello Pantalone della Festa (B01-PF), taglia 3", "",
             "_Generato da `brand/strumenti/cartamodello_pantalone.py`. Misure sulla linea di cucitura._", "",
             "## Misure del capo finito ricavate dal cartamodello", "",
             "| Punto di misura | Scheda tecnica | Cartamodello | Nota |", "|---|---|---|---|"]
    for name, spec, val, note in rows:
        lines.append(f"| {name} | {spec:.1f} | {val:.1f} | {note} |")
    lines += ["", "## Controllo delle cuciture", "", "| Controllo | A | B | Esito | Nota |", "|---|---|---|---|---|"]
    for name, a, b, ok, note in checks:
        lines.append(f"| {name} | {a:.2f} | {b:.2f} | {'OK' if ok else 'DA RIVEDERE'} | {note} |")
    lines += ["", "## Dati di costruzione", "",
              f"- Cucitura laterale spostata di {SIDE_SHIFT:.0f} cm verso il davanti; punto vita laterale del dietro abbassato di {info['side_drop']:.2f} cm per pareggiare le laterali a giorno (nessun agio possibile)",
              f"- Elastico della cintura dietro: 3 cm di altezza, {info['elastic']:.1f} cm di lunghezza",
              f"- Risvolto {TURNUP:.0f} cm: prolungamento {TURNUP_EXT:.0f} cm sotto il fondo finito, con i fianchi specchiati a ogni piega",
              "", "## Stima consumi", "",
              "Due stime: per superficie dei pezzi (con un'efficienza di piazzamento dell'80%) e con un "
              "piazzamento automatico a scaffali, che non incastra i pezzi ed è per eccesso. "
              "Il consumo vero si ricava dal piazzamento del laboratorio.", "",
              "| Materiale | Altezza tessuto | Stima per superficie (efficienza 80%) | Piazzamento a scaffali (per eccesso) |",
              "|---|---|---|---|"]
    for mat, (w, Lm, La) in marker.items():
        lines.append(f"| {mat} | {w:.0f} cm | {La / 100:.2f} m | {Lm / 100:.2f} m |")
    lines += ["", "## PDF A4", "",
              f"- Griglia {grid[0]} righe × {grid[1]} colonne; pagine da stampare: **{n_pages}**.",
              "- Stampare al 100% (scala reale), controllare il quadrato di 10 cm sulla copertina.", ""]
    Path(path).write_text("\n".join(lines), encoding="utf-8")


def marker_estimate(pieces):
    widths = {"TESSUTO": 145.0, "FODERA": 135.0, "TASCHE": 110.0}
    res = {}
    for mat, w in widths.items():
        items = []
        for pc in pieces:
            if pc.material != mat:
                continue
            q = next((int(t) for t in pc.cut.split() if t.isdigit()), 1)
            for k in range(q):
                items.append(pc if k % 2 == 0 else pc.transformed(lambda p: (-p[0], p[1])))
        if items:
            _, Lm = layout(items, w, gap=1.0, margin=1.0)
            tot = sum(abs(area(pc.cut_line())) for pc in items)
            res[mat] = (w, Lm, tot / (w * 0.80))
    return res


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    pieces, info = build()
    rows, checks = verify(info)
    W = 112.0
    placed, H = layout(pieces, W, gap=4.0, margin=3.0)
    title = "Pantalone della Festa · B01-PF · cartamodello taglia 3"
    export_svg(placed, W, H, OUT / "cartamodello-pantalone-t3.svg", title)
    export_pdf_plotter(placed, W, H, OUT / "cartamodello-pantalone-t3-plotter.pdf", title)
    export_dxf(placed, OUT / "cartamodello-pantalone-t3.dxf")
    cover = [
        "Collezione 01 — Borgata. Margini di cucitura INCLUSI (1 cm salvo dove indicato).",
        "Centro dietro: riserva da 4 cm in cintura a 1 cm sul cavallo · cintura dietro: riserva 4 cm al centro.",
        "Risvolto 4 cm: prolungamento 12 cm (2 x 4 + 4 di orlo) con i fianchi specchiati; pezzi rettangolari al taglio.",
        "Linea continua = taglio · tratteggio grigio = cucitura · tratto rosso = piega della giunzione a giorno (vuoto 6 mm).",
        "Tratto blu = pieghe (fondo finito, risvolto, cinture). Tacche = segni di montaggio. Fori = tasca dietro e bottone.",
        "Elastico cintura dietro: 3 cm di altezza, %.1f cm di lunghezza." % info["elastic"],
    ]
    piece_rows = [f"{pc.num:>2}. {pc.name} — {pc.material} — {pc.cut}" for pc in sorted(pieces, key=lambda p: p.num)]
    n_pages, rn, cn = export_pdf_tiles(placed, W, H, OUT / "cartamodello-pantalone-t3-A4.pdf", title, cover, piece_rows)
    marker = marker_estimate(pieces)
    write_report(rows, checks, info, marker, n_pages, (rn, cn), OUT / "verifica-misure.md")
    print(f"pezzi: {len(pieces)} · tavola {W:.0f} x {H:.0f} cm · pagine A4: {n_pages} ({rn}x{cn})")
    for name, spec, val, note in rows:
        print(f"  {name}: scheda {spec} → cartamodello {val:.2f} {note}")
    for name, a, b2, ok, note in checks:
        print(f"  [{'OK' if ok else '!!'}] {name}: {a:.2f} / {b2:.2f} {note}")
    print("  consumi (superficie / scaffali):", {k: (round(v[2] / 100, 2), round(v[1] / 100, 2)) for k, v in marker.items()})


if __name__ == "__main__":
    main()
