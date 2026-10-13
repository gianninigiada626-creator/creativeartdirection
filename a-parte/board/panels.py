"""
The storyboard panels of A PARTE, one function per shot. Each returns an RGB image (2.39:1).
Ages have their own light: childhood sepia, adolescence blue-grey, adulthood sodium and neon,
the dawn a cold grey that warms. The red figure is the only saturated thing.
"""
import math

import numpy as np

from engine import Canvas, Cam, box, rig, grey_figure, red_figure, RED

W, H = 1920, 804
SEPIA = (1.0, 0.93, 0.8)
COLD = (0.86, 0.92, 1.0)
SODIUM = (1.0, 0.82, 0.58)
DAWN = (0.9, 0.92, 0.98)


def floor_lines(cv, cam, xs, z0, z1, a=0.35, w=1):
    for x in xs:
        cv.line(cam.p(x, 0, z0), cam.p(x, 0, z1), a=a, w=w, passes=1)


def figure_at(cv, cam, x, y, z, height_m, pose, red=False, kid=False, side=1.0, **k):
    s = cam.scale(x, y, z)
    J = rig(cam.p(x, y, z), height_m * s, pose, kid=kid, side=side)
    if red:
        return red_figure(cv, J, seed=k.pop('seed', None))
    return grey_figure(cv, J, **k)


# ── PROLOGUE ──
def p02_parcheggio(beam=0.55):
    """Totale fisso: la colonna, il pavimento, le strisce. Seduto contro la colonna, una sagoma rossa."""
    cv = Canvas(W, H, seed=2)
    cam = Cam(pos=(-0.2, 1.3, 0), yaw=6, pitch=-11, fov=60)
    # the dark deck beyond the kerb, the night above it
    horizon = cam.p(0, 0, 9)[1]
    cv.wash(cv.poly_mask([(0, 0), (W, 0), (W, horizon + 6), (0, horizon + 6)], 3), 0.82, grain=0.3)
    cv.hatch(cv.poly_mask([(0, 0), (W, 0), (W, horizon), (0, horizon)], 2), angle=12, spacing=5, a=0.35)
    # pale parking stripes on the dark asphalt
    for x in [-7, -4.6, -2.2, 0.2]:
        cv.line(cam.p(x, 0, 9.5), cam.p(x - 1.2, 0, 15), a=0.25, w=2, passes=1)
    cv.light(cv.poly_mask([cam.p(-9, 0, 9.4), cam.p(3, 0, 9.4), cam.p(3, 0, 9.6), cam.p(-9, 0, 9.6)], 1), (0.85, 0.78, 0.5), 0.18)
    # the kerb and the concrete apron with its joints
    cv.line(cam.p(-9, 0, 8.6), cam.p(4, 0, 8.6), a=0.8, w=2)
    cv.line(cam.p(-9, 0.12, 8.5), cam.p(4, 0.12, 8.5), a=0.5, w=1)
    floor_lines(cv, cam, [-4.5, -1.5], 1.0, 8.5, a=0.3)
    for z in [3.2, 6.0]:
        cv.line(cam.p(-9, 0, z), cam.p(0.6, 0, z), a=0.25, passes=1)
    cv.wash(cv.poly_mask([(0, horizon + 6), (W, horizon + 6), (W, H), (0, H)], 2), 0.12, grain=0.6, scale=90)
    # the pillar: lit front, darker side, rubbed with graphite
    P = box(cv, cam, 0.55, 2.1, 0, 3.6, 4.8, 6.3, faces={'front': 0.42, 'left': 0.25}, w=2.2, a=0.85)
    fm = cv.poly_mask([P['a'], P['b'], P['c'], P['d']], 1)
    cv.hatch(fm, angle=95, spacing=6, a=0.18)
    # headlights sweep across the floor from the left
    if beam > 0:
        bm = cv.poly_mask([(0, H * 0.48), (0, H * 0.92), (W * 0.62, H * 0.86), (W * 0.62, H * 0.6)], 60)
        cv.light(bm * beam, (1.0, 0.94, 0.78), 0.55)
    # contact shadow, then the figure: against the pillar, legs out
    sx, sy = cam.p(-0.4, 0, 5.4)
    cv.wash(cv.ellipse_mask((sx, sy + 8), (cam.scale(-0.4, 0, 5.4) * 1.0, 10), 0, 8), 0.3)
    figure_at(cv, cam, 0.25, 0.14, 5.45, 1.78, 'sitfloor', red=True, side=-1, seed=3)
    cv.tint(SODIUM, 0.35)
    return cv.render(vignette=0.4)


# ── I · SIX ──
def p06_aula():
    """Dal fondo dell'aula. «Ci siamo tutti?» — un braccio rosso si alza, la maestra si gira."""
    cv = Canvas(W, H, seed=6)
    cam = Cam(pos=(0.6, 1.05, -0.6), yaw=-4, pitch=-2, fov=62)
    L, R, D, C = -4.0, 4.0, 9.0, 3.2
    # walls
    back = [cam.p(L, 0, D), cam.p(R, 0, D), cam.p(R, C, D), cam.p(L, C, D)]
    left = [cam.p(L, 0, -1), cam.p(L, 0, D), cam.p(L, C, D), cam.p(L, C, -1)]
    right = [cam.p(R, 0, -1), cam.p(R, 0, D), cam.p(R, C, D), cam.p(R, C, -1)]
    ceil = [cam.p(L, C, -1), cam.p(R, C, -1), cam.p(R, C, D), cam.p(L, C, D)]
    cv.wash(cv.poly_mask(right, 1), 0.28)
    cv.wash(cv.poly_mask(ceil, 1), 0.2)
    cv.wash(cv.poly_mask(back, 1), 0.12)
    for poly in (back, left, right):
        cv.stroke(poly, closed=True, a=0.6, w=1.6)
    # windows on the left wall: bright, the light lies on the floor in long panes
    for z0 in [0.5, 3.2, 5.9]:
        win = [cam.p(L, 1.0, z0), cam.p(L, 1.0, z0 + 1.8), cam.p(L, 2.7, z0 + 1.8), cam.p(L, 2.7, z0)]
        cv.stroke(win, closed=True, a=0.7, w=1.8)
        cv.line(cam.p(L, 1.85, z0), cam.p(L, 1.85, z0 + 1.8), a=0.5)
        cv.light(cv.poly_mask(win, 2), (1, 0.97, 0.88), 0.35)
        pane = [cam.p(L, 0, z0 + 0.6), cam.p(L, 0, z0 + 2.4), cam.p(L + 3.2, 0, z0 + 3.4), cam.p(L + 3.2, 0, z0 + 1.6)]
        cv.light(cv.poly_mask(pane, 18), (1, 0.93, 0.78), 0.22)
    # blackboard and the teacher writing on it, back to the class
    bb = [cam.p(-2.2, 1.0, D - 0.02), cam.p(2.2, 1.0, D - 0.02), cam.p(2.2, 2.3, D - 0.02), cam.p(-2.2, 2.3, D - 0.02)]
    cv.wash(cv.poly_mask(bb, 1), 0.75)
    cv.stroke(bb, closed=True, a=0.9, w=2)
    for i, txt_y in enumerate([1.95, 1.7, 1.45]):
        x0 = -1.8 + i * 0.1
        cv.line(cam.p(x0, txt_y, D - 0.03), cam.p(x0 + 1.4 - i * 0.3, txt_y, D - 0.03), a=0.0)
        cv.light(cv.poly_mask([cam.p(x0, txt_y, D - 0.03), cam.p(x0 + 1.4 - i * 0.3, txt_y, D - 0.03), cam.p(x0 + 1.4 - i * 0.3, txt_y + 0.04, D - 0.03), cam.p(x0, txt_y + 0.04, D - 0.03)], 0.6), (1, 1, 1), 0.5)
    figure_at(cv, cam, 0.9, 0.98, D - 0.5, 1.68, dict(torso=-3, head=-8, ls=8, le=4, rs=-150, re=-10), tone=0.3, facing='back', hair=0.9, coat=True)
    # desks and children, seen from behind
    rows = [2.4, 3.9, 5.4, 6.9]
    cols = [-2.7, -0.9, 0.9, 2.7]
    rng = np.random.default_rng(3)
    order = []
    for z in rows:
        for x in cols:
            order.append((z, x))
    for z, x in sorted(order, key=lambda q: -q[0]):
        if (z, x) == (2.4, 2.7):
            continue  # his desk, drawn last
        box(cv, cam, x - 0.38, x + 0.38, 0.62, 0.7, z, z + 0.48, faces={'top': 0.1, 'front': 0.25}, w=1.3, a=0.6)
        figure_at(cv, cam, x + rng.uniform(-0.06, 0.06), 0.42, z - 0.25, 1.18, 'sitchair', kid=True, tone=0.18 + rng.uniform(0, 0.12),
                  facing='back', hair=0.5 + rng.uniform(0, 0.4))
    # the last row, right: his desk; one red arm up
    box(cv, cam, 2.32, 3.08, 0.62, 0.7, 2.4, 2.88, faces={'top': 0.1, 'front': 0.25}, w=1.4, a=0.7)
    figure_at(cv, cam, 2.72, 0.42, 2.15, 1.18, dict(torso=-2, head=-4, ls=14, le=60, rs=-176, re=-4, lh=90, lk=-90, rh=86, rk=-88), red=True, kid=True, seed=6)
    cv.tint(SEPIA, 0.6)
    return cv.render(vignette=0.32)


# ── EPILOGUE ──
def p23_alba(sun=0.55):
    """Il sole sorge dello stesso rosso di lui. Due rossi, soli, nel grigio."""
    cv = Canvas(W, H, seed=23, paper=np.float32([0.93, 0.925, 0.91]))
    cam = Cam(pos=(0, 1.2, 0), yaw=0, pitch=0, fov=52)
    hz = cam.p(0, 0, 4000)[1]
    # sky: a soft graphite gradient, lighter at the horizon
    sky = cv.poly_mask([(0, 0), (W, 0), (W, hz), (0, hz)], 1)
    grad = np.clip(1 - cv.yy / hz, 0, 1)
    cv.wash(sky * grad, 0.32, grain=0.4, scale=200)
    # the sea: long horizontal pencil strokes, tighter towards the horizon
    y = hz + 3
    k = 0
    while y < H:
        gap = 2.5 + (y - hz) * 0.06
        for _ in range(3):
            x0 = cv.rng.uniform(-200, W)
            L = cv.rng.uniform(80, 520) * (0.4 + (y - hz) / (H - hz))
            cv.line((x0, y), (x0 + L, y + cv.rng.uniform(-1, 1)), a=0.22 + 0.2 * (y - hz) / (H - hz), w=1, passes=1, jitter=0.4)
        y += gap
        k += 1
    sea = cv.poly_mask([(0, hz), (W, hz), (W, H), (0, H)], 1)
    cv.wash(sea, 0.22, grain=0.5, scale=120)
    # the sun, half out of the water: the same red as him
    sx = W * 0.64
    r = 34
    sun_m = cv.ellipse_mask((sx, hz + r * (1 - sun) * 2 - r * 0.0), (r, r), 0, 0.8) * (cv.yy < hz + 1)
    cv.red = np.maximum(cv.red, sun_m)
    # its path on the water: broken red-grey strokes would compete; keep it pale and warm
    path = cv.poly_mask([(sx - 30, hz + 2), (sx + 30, hz + 2), (sx + 160, H), (sx - 160, H)], 25)
    cv.light(path, (1.0, 0.85, 0.75), 0.12)
    cv.line((0, hz), (W, hz), a=0.55, w=1, passes=2)
    # the breakwater: a concrete tongue into the sea, from the bottom left
    pier = [cam.p(-6, 0.4, 2), cam.p(-1.2, 0.4, 2), cam.p(0.2, 0.4, 30), cam.p(-1.6, 0.4, 30)]
    pier_side = [cam.p(-1.2, 0.4, 2), cam.p(0.2, 0.4, 30), cam.p(0.2, -0.3, 30), cam.p(-1.2, -0.3, 2)]
    cv.wash(cv.poly_mask(pier, 1), 0.18)
    cv.wash(cv.poly_mask(pier_side, 1), 0.5)
    cv.stroke(pier, closed=True, a=0.7, w=1.8)
    cv.stroke(pier_side, closed=True, a=0.6, w=1.4)
    for z in [5, 9, 14, 21]:
        cv.line(cam.p(-6, 0.4, z), cam.p(-1.2 + z * 0.05, 0.4, z), a=0.25, passes=1)
    # him, at the end of the pier, legs over the water's edge
    figure_at(cv, cam, -0.75, 0.48, 18, 1.78, 'sitfloor', red=True, side=1, seed=23)
    cv.tint(DAWN, 0.5)
    cv.tint((1.0, 0.94, 0.9), 0.4, cv.poly_mask([(0, hz * 0.4), (W, hz * 0.4), (W, hz + 40), (0, hz + 40)], 80))
    return cv.render(vignette=0.22, red_color=RED)


PANELS = {
    '02': p02_parcheggio,
    '06': p06_aula,
    '23': p23_alba,
}
