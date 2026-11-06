"""Cartamodello della Giacca della Festa (B01-GF), taglia base 3.

Costruito dalle misure della scheda tecnica. Genera nella cartella
brand/03-collezione-01-borgata/giacca-della-festa/cartamodello/:
  - cartamodello-giacca-t3-A4.pdf       pagine A4 1:1 da affiancare (con quadrato di controllo)
  - cartamodello-giacca-t3-plotter.pdf  foglio unico 1:1 per plotter
  - cartamodello-giacca-t3.dxf          DXF R12 (mm), livelli in stile AAMA
  - cartamodello-giacca-t3.svg          tavola 1:1 (mm)
  - verifica-misure.md                  misure ricavate dal cartamodello e controlli delle cuciture

Uso: python3 brand/strumenti/cartamodello_giacca.py
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cartamodello_lib import (Edge, Piece, add, area, bbox, bez, chain, clip_below, dist, export_dxf,  # noqa: E402
                              export_pdf_plotter, export_pdf_tiles, export_svg, layout, length, lerp,
                              mirror_x, mul, offset, point_at, rect_piece, rev, rounded_rect, seg, sub,
                              unit)

OUT = Path(__file__).resolve().parents[1] / "03-collezione-01-borgata" / "giacca-della-festa" / "cartamodello"
CODE = "B01-GF"

# ── misure di costruzione, taglia 3 (cm) ─────────────────────────────────────
NECK_W = 9.0            # mezza larghezza scollo (da centro a punto collo-spalla)
BACK_NECK_D = 2.2       # profondità scollo dietro
FRONT_NECK_D = 8.0      # profondità scollo davanti
HALF_SHOULDER = 23.5    # metà larghezza spalle (C = 47)
BACK_SH_DROP = 4.4      # inclinazione spalla dietro
FRONT_SH_ANGLE = 23.0   # inclinazione spalla davanti (gradi)
BACK_CHEST_Y = 27.5     # linea del torace dal punto collo-spalla, dietro
FRONT_BALANCE = 0.8     # il davanti è più lungo del dietro (bilanciamento)
HALF_CHEST_BACK = 29.5
HALF_CHEST_FRONT = 28.5  # A = 29.5 + 28.5 = 58
BACK_BODY = 63.0        # corpo dal collo dietro alla cucitura della fascia (B = 63 + 5 = 68)
CB_SHAPE = 0.5          # rientro del centro dietro in vita e in fondo
BAND_H = 5.0
COLLAR_H = 5.5
ZIP_HALF = 0.3          # metà catena della zip n. 5: il bordo davanti finisce a 3 mm dal centro
FAG_GAP = 0.3           # metà del vuoto della giunzione a giorno (vuoto visibile 6 mm)
SLEEVE_LEN = 64.0
BICEP = 41.7            # all'altezza del sottomanica (E = 20,5 misurato 2,5 cm sotto)
WRIST = 27.0
SLEEVE_PITCH = 1.0      # il polso avanza di 1 cm rispetto alla testa manica
ELBOW_EASE = 0.5        # agio al gomito sul sottomanica dietro
CAP_EASE_F, CAP_EASE_B = 1.0, 1.5   # agio testa manica (spalla camicia), davanti / dietro
VENT_LEN = 10.0
VENT_EXT = 4.0
SLEEVE_HEM = 4.0
CB_RESERVE = 2.5
POCKET_OPEN = 16.0
FACING_W = 6.0
BAND_RELAXED_HALF = 55.0

SA = 1.0
FAG_SA = 1.0 - FAG_GAP   # il taglio sta 1 cm oltre la piega, cioè 0,7 oltre la linea nominale


def rad(d):
    return math.radians(d)


# ── corpo ────────────────────────────────────────────────────────────────────

def body_points():
    g = {}
    # dietro (x dal centro dietro, y dal punto collo-spalla)
    g["CBN"] = (0.0, BACK_NECK_D)
    g["HPS_b"] = (NECK_W, 0.0)
    g["SP_b"] = (HALF_SHOULDER, BACK_SH_DROP)
    g["UA_b"] = (HALF_CHEST_BACK, BACK_CHEST_Y)
    g["HEM_b"] = BACK_NECK_D + BACK_BODY
    sh_b = unit(sub(g["SP_b"], g["HPS_b"]))
    g["perp_b"] = (-sh_b[1], sh_b[0])
    # davanti (x dal centro davanti, y dal punto collo-spalla)
    g["HPS_f"] = (NECK_W, 0.0)
    sh_len = dist(g["HPS_b"], g["SP_b"])
    a = rad(FRONT_SH_ANGLE)
    g["SP_f"] = (NECK_W + sh_len * math.cos(a), sh_len * math.sin(a))
    g["perp_f"] = (-math.sin(a), math.cos(a))
    g["CFN"] = (ZIP_HALF, FRONT_NECK_D)
    g["UA_f"] = (HALF_CHEST_FRONT, BACK_CHEST_Y + FRONT_BALANCE)
    g["HEM_f"] = g["HEM_b"] + FRONT_BALANCE
    return g


def back_curves(g):
    c = {}
    c["neck"] = bez(g["CBN"], (3.5, BACK_NECK_D), add(g["HPS_b"], mul(g["perp_b"], 2.0)), g["HPS_b"])
    c["shoulder"] = seg(g["HPS_b"], g["SP_b"])
    c["arm"] = bez(g["SP_b"], add(g["SP_b"], mul(g["perp_b"], 7.0)), (g["UA_b"][0] - 4.5, g["UA_b"][1]), g["UA_b"])
    c["side"] = seg(g["UA_b"], (HALF_CHEST_BACK, g["HEM_b"]))
    c["hem"] = seg((HALF_CHEST_BACK, g["HEM_b"]), (CB_SHAPE, g["HEM_b"]))
    c["cb"] = chain(seg((CB_SHAPE, g["HEM_b"]), (CB_SHAPE, 44.0)), seg((CB_SHAPE, 44.0), (0.0, 18.0)),
                    seg((0.0, 18.0), g["CBN"]))
    return c


def front_curves(g):
    c = {}
    c["neck"] = bez(g["CFN"], (4.9, FRONT_NECK_D), add(g["HPS_f"], mul(g["perp_f"], 3.5)), g["HPS_f"])
    c["shoulder"] = seg(g["HPS_f"], g["SP_f"])
    c["arm"] = bez(g["SP_f"], add(g["SP_f"], mul(g["perp_f"], 6.0)), (g["UA_f"][0] - 5.0, g["UA_f"][1]), g["UA_f"])
    c["side"] = seg(g["UA_f"], (HALF_CHEST_FRONT, g["HEM_f"]))
    c["hem"] = seg((HALF_CHEST_FRONT, g["HEM_f"]), (ZIP_HALF, g["HEM_f"]))
    c["edge"] = seg((ZIP_HALF, g["HEM_f"]), g["CFN"])
    return c


def pocket_line(g):
    d = (0.335, 0.942)
    bottom_y = g["HEM_f"] - 3.0
    top = (11.0, bottom_y - POCKET_OPEN * d[1])
    bottom = (11.0 + POCKET_OPEN * d[0], bottom_y)
    return top, bottom, d


def make_back(g, c):
    pc = Piece(2, "Dietro", "TESSUTO", "Tagliare 2 (in coppia)",
               [Edge(c["neck"], SA, name="scollo"),
                Edge(c["shoulder"], FAG_SA, "fag", "spalla", FAG_GAP),
                Edge(c["arm"], SA, name="giro manica"),
                Edge(c["side"], SA, name="fianco"),
                Edge(c["hem"], SA, name="fondo"),
                Edge(c["cb"], CB_RESERVE, name="centro dietro")],
               ((12.0, 22.0), (12.0, 55.0)), code=CODE)
    pc.notch(2, 9.0, 2, from_end=True)          # giro manica, doppia
    pc.notch(3, 18.0)                            # fianco
    pc.notch(5, length(c["cb"]) - (44.0 - BACK_NECK_D), 1, from_end=False)
    pc.notch(4, 7.0)                             # fondo: riferimento fascia
    pc.notes = ["Centro dietro: margine di riserva 2,5 cm",
                "Spalla: giunzione a giorno (piega rossa)"]
    pc.label_at = (15.0, 34.0)
    return pc


def make_front(g, c):
    top, bottom, d = pocket_line(g)
    jets = [offset([top, bottom], o) for o in (-0.5, 0.5)]
    pc = Piece(1, "Davanti", "TESSUTO", "Tagliare 2 (in coppia)",
               [Edge(c["neck"], SA, name="scollo"),
                Edge(c["shoulder"], FAG_SA, "fag", "spalla", FAG_GAP),
                Edge(c["arm"], SA, name="giro manica"),
                Edge(c["side"], SA, name="fianco"),
                Edge(c["hem"], SA, name="fondo"),
                Edge(c["edge"], SA, name="bordo zip")],
               ((7.0, 14.0), (7.0, 44.0)), code=CODE)
    pc.notch(2, 8.0, 1, from_end=True)
    pc.notch(3, 18.0)
    pc.lines += [([top, bottom], "place", "tasca a doppio filetto 16 cm"),
                 (chain(jets[0], rev(jets[1]), [jets[0][0]]), "hint", "")]
    pc.drills += [add(top, mul(d, 0.3)), add(bottom, mul(d, -0.3))]
    pc.notes = ["Bordo davanti: cucitura zip a 3 mm dal centro"]
    pc.label_at = (16.0, 34.0)
    return pc


# ── facings ──────────────────────────────────────────────────────────────────

def make_front_facing(g, c):
    sh_dir = unit(sub(g["SP_f"], g["HPS_f"]))
    f_sh = add(g["HPS_f"], mul(sh_dir, 4.0))
    x_in = ZIP_HALF + FACING_W
    inner = chain(bez(f_sh, add(f_sh, mul(g["perp_f"], 6.0)), (x_in, 14.0), (x_in, 22.0)),
                  seg((x_in, 22.0), (x_in, g["HEM_f"])))
    pc = Piece(6, "Paramontura davanti", "TESSUTO", "Tagliare 2 (in coppia)",
               [Edge(c["neck"], SA, name="scollo"),
                Edge(seg(g["HPS_f"], f_sh), SA, name="spalla"),
                Edge(inner, SA, name="bordo fodera"),
                Edge(seg((x_in, g["HEM_f"]), (ZIP_HALF, g["HEM_f"])), SA, name="fondo"),
                Edge(c["edge"], SA, name="bordo zip")],
               ((3.3, 18.0), (3.3, 52.0)), code=CODE)
    pc.notes = ["Teletta su tutto il pezzo"]
    pc.label_at = (3.4, 30.0)
    return pc, inner, f_sh


def make_back_facing(g, c):
    sh_dir = unit(sub(g["SP_b"], g["HPS_b"]))
    f_sh = add(g["HPS_b"], mul(sh_dir, 4.0))
    low_y = BACK_NECK_D + 5.0
    lower = bez(f_sh, add(f_sh, mul(g["perp_b"], 3.0)), (4.0, low_y), (0.0, low_y))
    pc = Piece(7, "Paramontura collo dietro", "TESSUTO", "Tagliare 1 su piega",
               [Edge(c["neck"], SA, name="scollo"),
                Edge(seg(g["HPS_b"], f_sh), SA, name="spalla"),
                Edge(lower, SA, name="bordo fodera"),
                Edge(seg((0.0, low_y), g["CBN"]), 0.0, "fold", "piega centro dietro")],
               ((5.0, 3.6), (9.0, 3.6)), code=CODE)
    pc.notes = ["Teletta; catenella al centro"]
    pc.label_at = (5.5, 9.2)
    return pc, lower, f_sh


# ── collo ────────────────────────────────────────────────────────────────────

def collar_lower(target, rise=1.0):
    lo, hi = target * 0.8, target * 1.05
    for _ in range(60):
        X = (lo + hi) / 2
        pts = bez((0.0, 0.0), (X * 0.5, 0.0), (X * 0.82, -0.15 * rise), (X, -rise))
        if length(pts) > target:
            hi = X
        else:
            lo = X
    return pts


def make_collar(num, name, material, half_neck, back_neck_len):
    lower = collar_lower(half_neck)
    end = lower[-1]
    t = unit(sub(lower[-1], lower[-2]))
    up = (t[1], -t[0])                       # perpendicolare verso l'alto
    top_end = add(end, mul(up, COLLAR_H))
    upper = offset(lower, COLLAR_H)
    upper[-1] = top_end
    pc = Piece(num, name, material, "Tagliare 1 su piega",
               [Edge(lower, SA, name="cucitura scollo"),
                Edge(seg(end, top_end), SA, name="bordo zip"),
                Edge(rev(upper), SA, name="bordo superiore"),
                Edge(seg(upper[0], (0.0, 0.0)), 0.0, "fold", "piega centro dietro")],
               ((4.0, -COLLAR_H / 2), (12.0, -COLLAR_H / 2)), code=CODE)
    pc.notch(0, back_neck_len)                # punto collo-spalla
    pc.label_at = (half_neck * 0.55, -COLLAR_H * 0.62)
    pc.notes = ["Teletta" if material == "TESSUTO" else "Bordo inferiore rifinito a mano"]
    return pc


# ── manica ───────────────────────────────────────────────────────────────────

def cap_curves(h, wf, wb):
    front = bez((0.0, 0.0), (-0.36 * wf, 0.0), (-wf + 0.46 * wf, h), (-wf, h))
    back = bez((0.0, 0.0), (0.38 * wb, 0.0), (wb - 0.36 * wb, h), (wb, h))
    return front, back


def solve_cap(ah_f, ah_b):
    """Altezza testa e divisione del bicipite perché l'agio sia CAP_EASE_F / CAP_EASE_B."""
    tf, tb = ah_f + CAP_EASE_F, ah_b + CAP_EASE_B
    h, wf = 15.0, BICEP / 2
    for _ in range(80):
        lo, hi = 8.0, 24.0
        for _ in range(60):
            h = (lo + hi) / 2
            f, b = cap_curves(h, wf, BICEP - wf)
            if length(f) + length(b) > tf + tb:
                hi = h
            else:
                lo = h
        f, b = cap_curves(h, wf, BICEP - wf)
        err = (length(f) - tf) - (length(b) - tb)
        if abs(err) < 1e-4:
            break
        wf -= err * 0.5
    return h, wf, BICEP - wf


def sleeve_points(h, wf, wb):
    s = {}
    s["CT"] = (0.0, 0.0)
    s["FB"], s["BB"] = (-wf, h), (wb, h)
    u = unit((-SLEEVE_PITCH, SLEEVE_LEN))
    s["u"] = u
    s["n_f"] = (-u[1], u[0])      # verso il davanti (-x)
    s["n_b"] = (u[1], -u[0])      # verso il dietro (+x)
    s["Wc"] = mul(u, SLEEVE_LEN)
    # inclinazione del fondo manica scelta perché il sottomanica dietro sia più lungo solo di ELBOW_EASE
    lo, hi = -0.35, 0.35
    for _ in range(60):
        phi = (lo + hi) / 2
        c, sn = math.cos(phi), math.sin(phi)
        e = (s["n_b"][0] * c - s["n_b"][1] * sn, s["n_b"][0] * sn + s["n_b"][1] * c)
        wf_pt = add(s["Wc"], mul(e, -WRIST / 2))
        wb_pt = add(s["Wc"], mul(e, WRIST / 2))
        diff = dist(s["BB"], wb_pt) - dist(s["FB"], wf_pt)
        if diff > ELBOW_EASE:
            hi = phi
        else:
            lo = phi
    s["Wf"], s["Wb"], s["e_wrist"] = wf_pt, wb_pt, e
    s["V"] = mul(u, SLEEVE_LEN - VENT_LEN)
    return s


def make_sleeves(h, wf, wb):
    s = sleeve_points(h, wf, wb)
    front_cap, back_cap = cap_curves(h, wf, wb)
    u, nf, nb = s["u"], s["n_f"], s["n_b"]
    over_top = seg(s["CT"], s["V"])

    # manica davanti: estensione dello spacco verso il dietro (si ripiega sulla linea dello spacco)
    ext_top = add(add(s["V"], mul(nb, VENT_EXT)), mul(u, 0.0))
    ext_bot = add(s["Wc"], mul(s["e_wrist"], VENT_EXT))
    front = Piece(3, "Manica davanti", "TESSUTO", "Tagliare 2 (in coppia)",
                  [Edge(over_top, FAG_SA, "fag", "cucitura superiore", FAG_GAP),
                   Edge(seg(s["V"], ext_top), 0.0, name="estensione spacco"),
                   Edge(seg(ext_top, ext_bot), 0.0, name="estensione spacco"),
                   Edge(seg(ext_bot, s["Wf"]), SLEEVE_HEM, "hem", "orlo"),
                   Edge(seg(s["Wf"], s["FB"]), SA, name="sottomanica"),
                   Edge(rev(front_cap), SA, name="testa manica")],
                  ((-wf * 0.45, h + 2.0), (-wf * 0.42, h + 34.0)), code=CODE)
    front.lines.append((seg(s["V"], s["Wc"]), "fold", "piega spacco"))
    front.lines.append((seg(add(s["Wf"], mul(u, -0.0)), ext_bot), "hint", "orlo finito"))
    # asole: 4, perpendicolari allo spacco, da 0,8 cm dal bordo verso il davanti
    for k in range(4):
        c0 = add(s["Wc"], mul(u, -(3.0 + 1.8 * k)))
        a = add(c0, mul(nf, 0.8))
        b = add(c0, mul(nf, 2.4))
        front.lines.append(([a, b], "place", "asola" if k == 0 else ""))
    front.notch(5, 8.0, 1, from_end=False)       # dal punto sottomanica lungo la testa
    front.notch(4, 20.0, 1, from_end=True)
    front.notch(4, 34.0, 1, from_end=True)
    front.notes = ["Testa: agio %.1f cm, arricciare tra le tacche" % CAP_EASE_F]
    front.label_at = (-wf * 0.47, h + 12.0)

    under_f = length(seg(s["Wf"], s["FB"]))
    under_b = length(seg(s["BB"], s["Wb"]))
    elbow_ease = under_b - under_f

    und_top = add(s["V"], mul(nf, VENT_EXT))
    und_bot = add(s["Wc"], mul(s["e_wrist"], -VENT_EXT))
    back = Piece(4, "Manica dietro", "TESSUTO", "Tagliare 2 (in coppia)",
                 [Edge(back_cap, SA, name="testa manica"),
                  Edge(seg(s["BB"], s["Wb"]), SA, name="sottomanica"),
                  Edge(seg(s["Wb"], und_bot), SLEEVE_HEM, "hem", "orlo"),
                  Edge(seg(und_bot, und_top), 0.0, name="sottopunta spacco"),
                  Edge(seg(und_top, s["V"]), 0.0, name="sottopunta spacco"),
                  Edge(rev(over_top), FAG_SA, "fag", "cucitura superiore", FAG_GAP)],
                 ((wb * 0.48, h + 2.0), (wb * 0.40, h + 34.0)), code=CODE)
    for k in range(4):
        c0 = add(add(s["Wc"], mul(u, -(3.0 + 1.8 * k))), mul(nf, 1.6))
        back.drills.append(c0)
    back.notch(0, 9.0, 2, from_end=True)
    back.notch(1, 20.0)
    back.notch(1, 34.0 + elbow_ease)
    back.notes = ["Testa: agio %.1f cm" % CAP_EASE_B, "Gomito: agio %.1f cm tra le tacche" % elbow_ease,
                  "Fori = bottoni (4)"]
    back.label_at = (wb * 0.5, h + 12.0)
    return front, back, s, elbow_ease, (front_cap, back_cap)


def make_sleeve_lining(h, wf, wb, s):
    wf2, wb2 = wf + 0.5, wb + 0.5
    fcap, bcap = cap_curves(h, wf2, wb2)
    L = SLEEVE_LEN - 2.5 + 1.0
    u, nf, nb = s["u"], s["n_f"], s["n_b"]
    wc = mul(u, L)
    wf_pt = add(wc, mul(nf, WRIST / 2 + 0.5))
    wb_pt = add(wc, mul(nb, WRIST / 2 + 0.5))
    pc = Piece(18, "Fodera manica", "FODERA", "Tagliare 2 (in coppia)",
               [Edge(bcap, SA, name="testa dietro"),
                Edge(seg((wb2, h), wb_pt), SA, name="sottomanica dietro"),
                Edge(seg(wb_pt, wf_pt), SA, name="fondo"),
                Edge(seg(wf_pt, (-wf2, h)), SA, name="sottomanica davanti"),
                Edge(rev(fcap), SA, name="testa davanti")],
               ((0.0, h + 4.0), (0.0, h + 36.0)), code=CODE)
    pc.notch(0, 9.0, 2, from_end=True)
    pc.notch(4, 8.0)
    pc.notch(4, length(fcap), 1)                  # sommità = cucitura spalla
    pc.notes = ["Più lunga di 1 cm: piega di agio al polso"]
    pc.label_at = (0.0, h + 14.0)
    return pc


# ── fodere del corpo ─────────────────────────────────────────────────────────

def make_front_lining(g, c, facing_inner, f_sh):
    ease = 0.5
    ua = (g["UA_f"][0] + ease, g["UA_f"][1])
    arm = bez(g["SP_f"], add(g["SP_f"], mul(g["perp_f"], 6.0)), (ua[0] - 5.0, ua[1]), ua)
    hem_y = g["HEM_f"] + 1.0
    x_in = facing_inner[-1][0]
    inner = chain(facing_inner[:-1], [(x_in, hem_y)])
    pc = Piece(16, "Fodera davanti", "FODERA", "Tagliare 2 (in coppia)",
               [Edge(seg(f_sh, g["SP_f"]), SA, name="spalla"),
                Edge(arm, SA, name="giro manica"),
                Edge(seg(ua, (ua[0], hem_y)), SA, name="fianco"),
                Edge(seg((ua[0], hem_y), (x_in, hem_y)), SA, name="fondo"),
                Edge(rev(inner), SA, name="cucitura paramontura")],
               ((18.0, 20.0), (18.0, 52.0)), code=CODE)
    pc.notch(1, 8.0, 1, from_end=True)
    pc.notch(2, 18.0)
    y_p = 23.0
    pc.lines.append(([(x_in + 2.0, y_p), (x_in + 15.0, y_p)], "place", "tasca interna 13 cm (solo sinistro)"))
    pc.drills += [(x_in + 2.3, y_p), (x_in + 14.7, y_p)]
    pc.notes = ["1 cm più lunga: piega di agio sul fondo", "Fianco: +0,5 cm di agio"]
    pc.label_at = (18.0, 36.0)
    return pc


def make_back_lining(g, c, facing_lower, f_sh):
    pleat = 1.0
    low_y = facing_lower[-1][1]
    ua = g["UA_b"]
    side_end = (ua[0] + 0.5, ua[1] + 8.0)
    hem = bez(side_end, (20.0, side_end[1]), (8.0, 24.0), (-pleat, 24.0))
    pc = Piece(17, "Fodera dietro (farfalla)", "FODERA", "Tagliare 1 su piega",
               [Edge(chain(seg((-pleat, low_y), (0.0, low_y)), rev(facing_lower)), SA, name="cucitura paramontura"),
                Edge(seg(f_sh, g["SP_b"]), SA, name="spalla"),
                Edge(back_curves(g)["arm"], SA, name="giro manica"),
                Edge(seg(ua, side_end), SA, name="fianco"),
                Edge(hem, 2.0, "hem", "orlo libero"),
                Edge(seg((-pleat, 24.0), (-pleat, low_y)), 0.0, "fold", "piega centro dietro")],
               ((10.0, 12.0), (10.0, 22.0)), code=CODE)
    pc.notch(2, 9.0, 2, from_end=True)
    pc.lines.append((seg((0.0, low_y), (0.0, 24.0)), "hint", "centro dietro: piega di agio 1 cm"))
    pc.notes = ["Orlo libero 2 cm, cuciture del dietro a sbieco"]
    pc.label_at = (14.0, 15.5)
    return pc


# ── tasche ───────────────────────────────────────────────────────────────────

def make_pocket_bag(g):
    top, bottom, d = pocket_line(g)
    inward = (-d[1], d[0])          # perpendicolare verso il centro davanti
    a = add(top, mul(d, -2.0))
    b = add(bottom, mul(d, 2.0))
    depth = 11.0
    k = 3.0
    pts = chain(seg(a, b),
                seg(b, add(b, mul(inward, depth - k))),
                bez(add(b, mul(inward, depth - k)), add(b, mul(inward, depth)), add(b, mul(inward, depth)),
                    add(add(b, mul(inward, depth)), mul(d, -k))),
                seg(add(add(b, mul(inward, depth)), mul(d, -k)), add(add(a, mul(inward, depth)), mul(d, k))),
                bez(add(add(a, mul(inward, depth)), mul(d, k)), add(a, mul(inward, depth)), add(a, mul(inward, depth)),
                    add(a, mul(inward, depth - k))),
                seg(add(a, mul(inward, depth - k)), a))
    pts = clip_below(pts[:-1], g["HEM_f"] - 0.5)
    pc = Piece(22, "Sacco tasca", "TASCHE", "Tagliare 4 (2 coppie)",
               [Edge(chain(pts, [pts[0]]), SA, name="contorno")],
               (add(a, mul(inward, 4.0)), add(b, mul(inward, 4.0))), code=CODE)
    pc.lines.append(([top, bottom], "place", "apertura tasca"))
    pc.notes = ["Il fondo entra nella cucitura della fascia"]
    pc.label_at = add(lerp(a, b, 0.5), mul(inward, 6.5))
    return pc


# ── tutti i pezzi ────────────────────────────────────────────────────────────

def build():
    g = body_points()
    bc, fc = back_curves(g), front_curves(g)
    back = make_back(g, bc)
    front = make_front(g, fc)
    ffac, ffac_inner, ffac_sh = make_front_facing(g, fc)
    bfac, bfac_lower, bfac_sh = make_back_facing(g, bc)

    ah_f, ah_b = length(fc["arm"]), length(bc["arm"])
    h, wf, wb = solve_cap(ah_f, ah_b)
    sl_f, sl_b, s, elbow_ease, caps = make_sleeves(h, wf, wb)

    neck_b, neck_f = length(bc["neck"]), length(fc["neck"])
    half_neck = neck_b + neck_f
    collar = make_collar(5, "Collo esterno", "TESSUTO", half_neck, neck_b)
    collar_in = make_collar(15, "Collo interno", "MELTON", half_neck, neck_b)

    band_f_len = HALF_CHEST_FRONT - ZIP_HALF
    band_b_len = HALF_CHEST_BACK - CB_SHAPE
    band_f = rect_piece(8, "Fascia fondo davanti", "TESSUTO", "Tagliare 2 (in coppia)", band_f_len, 2 * BAND_H,
                        grain="h", code=CODE, notes=["Piegare a metà; teletta sulla metà esterna"])
    band_f.lines.append((seg((0, BAND_H), (band_f_len, BAND_H)), "fold", "piega"))
    band_b = rect_piece(9, "Fascia fondo dietro", "TESSUTO", "Tagliare 1 su piega", band_b_len, 2 * BAND_H,
                        grain="h", code=CODE, fold_left=True,
                        notes=["Elastico 4 cm all'interno, lungo %.1f cm (tutto il dietro)"
                               % (2 * (BAND_RELAXED_HALF - band_f_len))])
    band_b.lines.append((seg((0, BAND_H), (band_b_len, BAND_H)), "fold", "piega"))
    for b in (band_f, band_b):
        b.label_at = (b.edges[0].pts[1][0] / 2, BAND_H - 1.6)

    jets = rect_piece(10, "Filetti tasca", "TESSUTO", "Tagliare 4", 20.0, 4.0, sa=0.0, grain="h", code=CODE,
                      notes=["Misure al taglio, teletta"])
    pfac = rect_piece(11, "Fondo tasca", "TESSUTO", "Tagliare 2", 20.0, 6.0, sa=0.0, grain="h", code=CODE,
                      notes=["Misure al taglio"])
    ijets = rect_piece(12, "Filetti tasca interna", "TESSUTO", "Tagliare 2", 17.0, 4.0, sa=0.0, grain="h",
                       code=CODE, notes=["Misure al taglio"])
    garage = rect_piece(13, "Garage zip", "TESSUTO", "Tagliare 1", 5.0, 7.0, sa=0.0, code=CODE,
                        notes=["Al taglio; piegare a metà"])
    loop = rect_piece(14, "Catenella", "TESSUTO", "Tagliare 1", 2.5, 10.0, sa=0.0, code=CODE,
                      notes=["Al taglio"])
    for r in (jets, pfac, ijets, garage, loop):
        x0, y0, x1, y1 = bbox(r.seam())
        r.label_at = ((x0 + x1) / 2, y0 + (y1 - y0) * 0.3)

    flin = make_front_lining(g, fc, ffac_inner, ffac_sh)
    blin = make_back_lining(g, bc, bfac_lower, bfac_sh)
    slin = make_sleeve_lining(h, wf, wb, s)
    sh_len = length(bc["shoulder"])
    strip_sh = rect_piece(19, "Striscia sotto giunzione spalla", "FODERA", "Tagliare 2", 3.0, sh_len + 2.0, sa=0.0,
                          code=CODE, notes=["Al taglio"])
    strip_sl = rect_piece(20, "Striscia sotto giunzione manica", "FODERA", "Tagliare 2", 3.0,
                          SLEEVE_LEN - VENT_LEN + 2.0, sa=0.0, code=CODE, notes=["Al taglio"])
    ibag = rect_piece(21, "Sacco tasca interna", "FODERA", "Tagliare 2", 16.0, 18.0, sa=0.0, code=CODE,
                      notes=["Al taglio"])
    for r in (strip_sh, strip_sl, ibag):
        x0, y0, x1, y1 = bbox(r.seam())
        r.label_at = ((x0 + x1) / 2, y0 + 4.0)
    bag = make_pocket_bag(g)

    pieces = [front, back, sl_f, sl_b, collar, ffac, bfac, band_f, band_b, jets, pfac, ijets, garage, loop,
              collar_in, flin, blin, slin, strip_sh, strip_sl, ibag, bag]
    info = dict(g=g, bc=bc, fc=fc, h=h, wf=wf, wb=wb, s=s, elbow_ease=elbow_ease, caps=caps,
                ah_f=ah_f, ah_b=ah_b, neck_b=neck_b, neck_f=neck_f, half_neck=half_neck,
                band_f_len=band_f_len, band_b_len=band_b_len, ffac_inner=ffac_inner, bfac_lower=bfac_lower,
                pieces=dict(front=front, back=back, sl_f=sl_f, sl_b=sl_b, collar=collar, ffac=ffac,
                            bfac=bfac, flin=flin, blin=blin, slin=slin))
    return pieces, info


# ── verifica ─────────────────────────────────────────────────────────────────

def verify(info):
    g, bc, fc, s = info["g"], info["bc"], info["fc"], info["s"]
    rows = []

    def row(name, spec, val, note=""):
        rows.append((name, spec, val, note))

    half_chest = (HALF_CHEST_FRONT - ZIP_HALF) + ZIP_HALF + HALF_CHEST_BACK
    row("A · 1/2 torace", 58.0, half_chest)
    row("B · Lunghezza centro dietro", 68.0, g["HEM_b"] - BACK_NECK_D + BAND_H)
    row("C · Larghezza spalle", 47.0, 2 * HALF_SHOULDER)
    row("D · Lunghezza manica dal punto spalla", 64.0, SLEEVE_LEN)
    # bicipite 2,5 cm sotto la linea del giro manica
    y = info["h"] + 2.5
    def x_at(p, q, yy):
        return p[0] + (q[0] - p[0]) * (yy - p[1]) / (q[1] - p[1])
    bic = x_at(s["BB"], s["Wb"], y) - x_at(s["FB"], s["Wf"], y)
    row("E · 1/2 bicipite", 20.5, bic / 2)
    row("F · 1/2 fondo manica", 13.5, WRIST / 2)
    row("G · Giro manica in linea retta (davanti)", 25.0, dist(g["SP_f"], g["UA_f"]), "aggiornato dal cartamodello")
    row("H · 1/2 fondo a riposo", 55.0, BAND_RELAXED_HALF)
    row("I · 1/2 fondo in estensione", 58.0, info["band_f_len"] + ZIP_HALF + info["band_b_len"], "aggiornato dal cartamodello")
    row("L · Lunghezza collo lungo la cucitura", 47.0, 2 * info["half_neck"], "aggiornato dal cartamodello")
    row("M · Lunghezza zip", 66.5, (g["HEM_f"] - FRONT_NECK_D) + BAND_H + COLLAR_H, "aggiornato dal cartamodello")
    row("S · Profondità scollo davanti", 8.0, FRONT_NECK_D)
    row("T · Larghezza scollo", 18.0, 2 * NECK_W)

    checks = []

    def chk(name, a, b, tol=0.15, note=""):
        checks.append((name, a, b, abs(a - b) <= tol, note))

    chk("Spalla dietro = spalla davanti (giunzione a giorno, nessun agio)", length(bc["shoulder"]), length(fc["shoulder"]))
    chk("Fianco dietro = fianco davanti", length(bc["side"]), length(fc["side"]))
    caps = info["caps"]
    checks.append(("Testa manica davanti − giro manica davanti (agio)", length(caps[0]), info["ah_f"],
                   abs(length(caps[0]) - info["ah_f"] - CAP_EASE_F) < 0.05, "agio %.2f cm" % (length(caps[0]) - info["ah_f"])))
    checks.append(("Testa manica dietro − giro manica dietro (agio)", length(caps[1]), info["ah_b"],
                   abs(length(caps[1]) - info["ah_b"] - CAP_EASE_B) < 0.05, "agio %.2f cm" % (length(caps[1]) - info["ah_b"])))
    under_f = dist(s["FB"], s["Wf"])
    under_b = dist(s["BB"], s["Wb"])
    checks.append(("Sottomanica dietro − davanti (agio al gomito)", under_b, under_f, 0 <= under_b - under_f <= 0.7,
                   "agio %.2f cm" % (under_b - under_f)))
    collar_len = length(info["pieces"]["collar"].edges[0].pts)
    chk("Collo (bordo inferiore) = mezzo scollo", collar_len, info["half_neck"])
    chk("Fascia davanti = fondo davanti", info["band_f_len"], length(fc["hem"]))
    chk("Fascia dietro = fondo dietro", info["band_b_len"], length(bc["hem"]))
    ffac_edge = length(info["pieces"]["ffac"].edges[-1].pts)
    chk("Paramontura = bordo davanti", ffac_edge, length(fc["edge"]))
    flin_edge = length(info["pieces"]["flin"].edges[-1].pts)
    ffac_inner = length(info["ffac_inner"])
    chk("Fodera davanti = bordo paramontura (+1 cm di agio in fondo)", flin_edge - 1.0, ffac_inner)
    return rows, checks


def write_report(rows, checks, info, marker, n_pages, grid, path):
    lines = ["# Verifica misure — cartamodello Giacca della Festa (B01-GF), taglia 3", "",
             "_Generato da `brand/strumenti/cartamodello_giacca.py`. Le misure sono calcolate sulla linea di cucitura._", "",
             "## Misure del capo finito ricavate dal cartamodello", "",
             "| Punto di misura | Scheda tecnica | Cartamodello | Nota |", "|---|---|---|---|"]
    for name, spec, val, note in rows:
        lines.append(f"| {name} | {spec:.1f} | {val:.1f} | {note} |")
    lines += ["", "## Controllo delle cuciture", "",
              "| Controllo | A | B | Esito | Nota |", "|---|---|---|---|---|"]
    for name, a, b, ok, note in checks:
        lines.append(f"| {name} | {a:.2f} | {b:.2f} | {'OK' if ok else 'DA RIVEDERE'} | {note} |")
    lines += ["", "## Dati di costruzione", "",
              f"- Giro manica: davanti {info['ah_f']:.1f} cm, dietro {info['ah_b']:.1f} cm, totale {info['ah_f'] + info['ah_b']:.1f} cm (per lato)",
              f"- Altezza testa manica: {info['h']:.1f} cm; bicipite diviso {info['wf']:.1f} (davanti) + {info['wb']:.1f} (dietro)",
              f"- Agio testa manica: {CAP_EASE_F + CAP_EASE_B:.1f} cm per manica, spalla camicia senza imbottitura",
              f"- Scollo: dietro {info['neck_b']:.1f} cm + davanti {info['neck_f']:.1f} cm per lato",
              "", "## Stima consumi", "",
              "Due stime: per superficie dei pezzi (con un'efficienza di piazzamento dell'80%) e con un "
              "piazzamento automatico a scaffali, che non incastra i pezzi ed è per eccesso. "
              "Il consumo vero si ricava dal piazzamento del laboratorio.", "",
              "| Materiale | Altezza tessuto | Stima per superficie (efficienza 80%) | Piazzamento a scaffali (per eccesso) |",
              "|---|---|---|---|"]
    for mat, (w, L, La) in marker.items():
        lines.append(f"| {mat} | {w:.0f} cm | {La / 100:.2f} m | {L / 100:.2f} m |")
    lines += ["", "## PDF A4", "",
              f"- Griglia {grid[0]} righe × {grid[1]} colonne; pagine da stampare: **{n_pages}** (le pagine vuote non sono incluse).",
              "- Stampare al 100% (scala reale), controllare il quadrato di 10 cm sulla copertina.", ""]
    Path(path).write_text("\n".join(lines), encoding="utf-8")


def marker_estimate(pieces):
    widths = {"TESSUTO": 145.0, "FODERA": 135.0, "MELTON": 145.0, "TASCHE": 110.0}
    res = {}
    for mat, w in widths.items():
        items = []
        for pc in pieces:
            if pc.material != mat:
                continue
            q = 1
            for tok in pc.cut.split():
                if tok.isdigit():
                    q = int(tok)
                    break
            for k in range(q):
                items.append(pc if k % 2 == 0 else pc.transformed(lambda p: (-p[0], p[1])))
        if items:
            _, L = layout(items, w, gap=1.0, margin=1.0)
            tot = sum(abs(area(pc.cut_line())) for pc in items)
            res[mat] = (w, L, tot / (w * 0.80))
    return res


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    pieces, info = build()
    rows, checks = verify(info)
    placed, H = layout(pieces, 112.0, gap=4.0, margin=3.0)
    title = "Giacca della Festa · B01-GF · cartamodello taglia 3"
    export_svg(placed, 112.0, H, OUT / "cartamodello-giacca-t3.svg", title)
    export_pdf_plotter(placed, 112.0, H, OUT / "cartamodello-giacca-t3-plotter.pdf", title)
    export_dxf(placed, OUT / "cartamodello-giacca-t3.dxf")
    cover = [
        "Collezione 01 — Borgata. Margini di cucitura INCLUSI (1 cm salvo dove indicato).",
        "Centro dietro 2,5 cm (riserva) · orlo manica 4 cm · orlo fodera farfalla 2 cm · pezzi rettangolari: misure al taglio.",
        "Linea continua = taglio · tratteggio grigio = cucitura · tratto rosso = piega della giunzione a giorno (vuoto 6 mm).",
        "Tratto blu = piega (pezzi su piega, spacco manica, fascia). Tacche = segni di montaggio. Fori = tasche e bottoni.",
        "Teletta: paramonture, collo esterno, metà esterna delle fasce, filetti, strisce di 2 cm lungo i bordi a giorno.",
        "Elastico fascia dietro: 4 cm di altezza, %.1f cm di lunghezza." % (2 * (BAND_RELAXED_HALF - info["band_f_len"])),
    ]
    piece_rows = [f"{pc.num:>2}. {pc.name} — {pc.material} — {pc.cut}" for pc in sorted(pieces, key=lambda p: p.num)]
    n_pages, rows_n, cols_n = export_pdf_tiles(placed, 112.0, H, OUT / "cartamodello-giacca-t3-A4.pdf", title,
                                               cover, piece_rows)
    marker = marker_estimate(pieces)
    write_report(rows, checks, info, marker, n_pages, (rows_n, cols_n), OUT / "verifica-misure.md")
    print(f"pezzi: {len(pieces)} · tavola {112} x {H:.0f} cm · pagine A4: {n_pages} ({rows_n}x{cols_n})")
    for name, spec, val, note in rows:
        print(f"  {name}: scheda {spec} → cartamodello {val:.2f} {note}")
    for name, a, b, ok, note in checks:
        print(f"  [{'OK' if ok else '!!'}] {name}: {a:.2f} / {b:.2f} {note}")
    print("  consumi (superficie / scaffali):", {k: (round(v[2] / 100, 2), round(v[1] / 100, 2)) for k, v in marker.items()})


if __name__ == "__main__":
    main()
