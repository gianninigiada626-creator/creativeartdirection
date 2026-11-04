"""GUILTY · shot animation. Each shot function gets (t, d, fi): local seconds, shot duration, local frame index,
and returns SVG markup in the 960×540 stage space. Built on the approved asset library (VD-03/04) and the
storyboard compositions (VD-05). Cadences: protagonist on twos (12 fps), Double on ones (24), crowd on threes (8),
Memory on fours (6), Witness held."""
import math, random, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))
import sb_panels as S
from sb_panels import (INK, PAP, HI, CON, CEM, BRN, DEEP, BURG, GRY, F, R, Pth, place, rig, head, sky, building, shutters,
                       skyline, roof, tech_room, tiles_wall, rig_markup, POSES)

def q(t, fps): return math.floor(t * fps + 1e-6) / fps
def ease(p): p = min(1, max(0, p)); return p * p * (3 - 2 * p)
def lerp(a, b, p): return a + (b - a) * p
def clamp(x, a=0, b=1): return max(a, min(b, x))
def cam(markup, zoom=1, cx=480, cy=270, dx=0, dy=0, rot=0):
    return f'<g transform="translate({F(480+dx)} {F(270+dy)}) rotate({F(rot)}) scale({zoom:.4f}) translate({F(-cx)} {F(-cy)})">{markup}</g>'
def zoomat(markup, z, px=480, py=270, dx=0, dy=0):
    return f'<g transform="translate({F(px+dx)} {F(py+dy)}) scale({z:.4f}) translate({F(-px)} {F(-py)})">{markup}</g>'
def tr(markup, x=0, y=0, s=1, r=0, ox=0, oy=0):
    return f'<g transform="translate({F(x)} {F(y)}) translate({F(ox)} {F(oy)}) rotate({F(r)}) scale({s:.4f}) translate({F(-ox)} {F(-oy)})">{markup}</g>'
def op(markup, o): return f'<g opacity="{o:.3f}">{markup}</g>'

# ── cycles ──
def walk_pose(ph):
    T = 2 * math.pi; s, c = math.sin(T * ph), math.cos(T * ph)
    def leg(sv, cv):
        h = -22 * sv; k = 6 + 40 * max(0, cv); foot = h * 1.1 if h > 0 else h * .4
        return h, k, foot - (h + k)
    n, f = leg(s, c), leg(-s, -c); bob = math.cos(2 * T * ph)
    return dict(torso=6 + 1.5 * bob, head=-6 - 1.5 * bob, nS=16 * s, nE=-10 + 10 * min(0, s), nW=6 * math.sin(T * (ph - .1)),
                fS=-16 * s, fE=-10 + 10 * min(0, -s), fW=-6 * math.sin(T * (ph - .1)), nH=n[0], nK=n[1], nA=n[2], fH=f[0], fK=f[1], fA=f[2])
def run_pose(ph):
    T = 2 * math.pi; s, c = math.sin(T * ph), math.cos(T * ph)
    def leg(sv, cv):
        h = -46 * sv; k = 18 + 70 * max(0, cv); foot = h * .6
        return h, k, foot - (h + k)
    n, f = leg(s, c), leg(-s, -c)
    return dict(torso=18, head=-14, nS=44 * s, nE=-78, nW=0, fS=-44 * s, fE=-80, fW=0, nH=n[0], nK=n[1], nA=n[2], fH=f[0], fK=f[1], fA=f[2])
def blend_pose(a, b, p):
    A = dict(S.NEUTRAL); A.update(POSES[a] if isinstance(a, str) else a)
    B = dict(S.NEUTRAL); B.update(POSES[b] if isinstance(b, str) else b)
    return {k: (lerp(A[k], B[k], p) if isinstance(A[k], (int, float)) and not isinstance(A[k], bool) else B[k]) for k in A}
def rigp(pose, x, ground, h, flip=False, filt=None, rotd=0):
    s = h / 600; sx = -s if flip else s
    f = f' filter="url(#{filt})"' if filt else ""
    r = f" rotate({F(rotd)})" if rotd else ""
    return f'<g transform="translate({F(x)} {F(ground)}){r} scale({F(sx)} {F(s)}) translate(-120 -640)"><g{f}>{rig_markup(pose)}</g></g>'
def bob(t, fps=12, amp=3, period=.743):
    tq = q(t, fps); return amp * abs(math.sin(math.pi * tq / period))
def crowd_walker(sym, w, x0, ground, h, t, speed, flip=False, filt=None, phase=0):
    tq = q(t, 8); x = x0 + speed * tq; b = 2.5 * abs(math.sin(math.pi * (tq + phase) / .62))
    return place(sym, x, ground - b, h, w=w, flip=flip, filt=filt)
def birds(t, seed, n, x0, y0, spread, vx, vy):
    rnd = random.Random(seed); out = ""
    for i in range(n):
        bx = x0 + rnd.uniform(-spread, spread) + vx * t * rnd.uniform(.7, 1.3); by = y0 + rnd.uniform(-spread / 2, spread / 2) + vy * t * rnd.uniform(.7, 1.3)
        flap = 6 if (int(q(t, 12) * 12) + i) % 2 else 2
        out += Pth(f"M{F(bx-9)},{F(by-flap)} L{F(bx)},{F(by)} L{F(bx+9)},{F(by-flap)}", sw=2.4)
    return out
def particles(t, seed, n, box, vel, col=INK, rmin=1.5, rmax=4, life=None, fps=24):
    rnd = random.Random(seed); x0, y0, x1, y1 = box; out = ""; tq = q(t, fps)
    for i in range(n):
        px = rnd.uniform(x0, x1); py = rnd.uniform(y0, y1); r = rnd.uniform(rmin, rmax); k = rnd.uniform(.6, 1.4)
        xx = px + vel[0] * tq * k; yy = py + vel[1] * tq * k
        if life:
            yy = y0 + ((yy - y0) % (y1 - y0 + 40))
        out += f'<circle cx="{F(xx)}" cy="{F(yy)}" r="{F(r)}" fill="{col}"/>'
    return out
def ink_wipe(p, seed=11, close=True):
    """ink diffusion: blots grow to cover (close) or shrink to reveal."""
    rnd = random.Random(seed); out = ""; k = ease(p if close else 1 - p)
    for i in range(14):
        x, y = rnd.uniform(-40, 1000), rnd.uniform(-40, 580); r0 = rnd.uniform(80, 260)
        out += f'<circle cx="{F(x)}" cy="{F(y)}" r="{F(r0 * k * 1.6)}" fill="{INK}"/>'
    return out
def stain_stage_overlay(stage):
    """front hanging hand (handA coords) stain at a given stage, used by the vector figures."""
    if stage <= 1: return '<use href="#stainA"/>'
    fingers = '<path d="M24,440 C22,456 22,466 25,476"/><path d="M36,442 C35,460 36,474 38,486"/><path d="M48,442 C48,460 49,474 51,484"/><path d="M60,440 C61,454 61,464 60,474"/>'
    palm = '<path d="M14,404 L64,404 C70,418 70,434 66,446 L18,446 C12,434 12,418 14,404 Z" fill="#8C1748"/>' if stage >= 3 else ""
    return palm + f'<g fill="none" stroke="#8C1748" stroke-linecap="round" stroke-width="9.5">{fingers}<path d="M64,412 C74,420 77,434 71,448" stroke-width="11.5"/></g>'
def prt_front(x, ground, h, stage=1, filt=None, rot=0):
    s = h / 600
    f = f' filter="url(#{filt})"' if filt else ""
    return (f'<g transform="translate({F(x)} {F(ground)}) rotate({F(rot)}) scale({F(s)}) translate(-130 -640)"><g{f}><use href="#figA" width="260" height="660"/>'
            f'<path d="M96,152 L107,152 L133,233 L126,239 Z" fill="#171717"/><path d="M164,152 L153,152 L127,233 L134,239 Z" fill="#171717"/>'
            f'<path d="M102,156 L129,234 M158,156 L131,234" fill="none" stroke="#D6D0C4" stroke-width="1.6" opacity=".9"/>'
            f'<path d="M113,146 C111,172 110,198 111,224 M147,146 C149,180 151,216 152,252" fill="none" stroke="#D6D0C4" stroke-width="2.6"/>'
            f'<rect x="108" y="222" width="6" height="11" rx="1.5" fill="#D6D0C4"/><rect x="149" y="250" width="6" height="11" rx="1.5" fill="#D6D0C4"/>'
            f'{stain_stage_overlay(stage)}</g></g>')

SHOTS = {}
def shot(n):
    def deco(fn): SHOTS[n] = fn; return fn
    return deco

# ═════════ PROLOGO ═════════
@shot(1)
def _(t, d, fi):
    p = ease(t / d)
    o = sky("sunset")
    o += f'<g transform="translate(0 {F(lerp(150, 0, p))})">'
    for (x, tp, w) in ((60, 210, 320), (420, 250, 300), (760, 190, 160)):
        o += building(x, tp, w, 470)
    o += R(0, 470, 960, 120, "#B9B2A5") + R(380, 470, 380, 40, "#CFC9BD", 2) + Pth("M390,480 H750", sw=1.4)
    for i, (sym, x, w, sp) in enumerate((("cp02", 300, 260, 6), ("cp04", 560, 250, 14), ("cp05", 720, 240, 0), ("cp03", 860, 250, -8))):
        o += crowd_walker(sym, w, x, 522, 46, t, sp, phase=i * .2)
    o += "</g>"
    o += birds(t, 3, 7, 520, 300 + lerp(150, 0, p), 60, 60, -40)
    fy = lerp(0, -170, p)
    o += f'<g transform="translate(0 {F(fy)})">' + R(-20, -200, 1000, 270, INK) + Pth("M40,70 V20 M30,30 H50 M200,70 V10 M190,22 H210 M880,70 V24 M520,70 V30 M510,40 H530", stroke=PAP, sw=3) + "</g>"
    return o
@shot(2)
def _(t, d, fi):
    p = t / d; bx = lerp(-70, 70, p)
    o = sky("sunset") + f'<g transform="translate({F(bx)} 0)">' + building(-120, 120, 1200, 400) + R(-120, 330, 1200, 70, CON, 2) + shutters(-100, 336, 15, w=70, h=62, tag_i=3)
    o += R(-120, 400, 1200, 140, "#B9B2A5") + Pth("M-120,400 H1080", sw=3) + R(-120, 400, 1200, 140, "url(#dotInk)", extra=' opacity=".12"') + "</g>"
    for i, (sym, x, w) in enumerate((("cp02", 560, 260), ("cp03", 740, 250), ("cp04", 120, 250), ("cp01", 900, 250), ("cp11", -80, 270))):
        o += crowd_walker(sym, w, x + bx, 500, 150, t, 34, phase=i * .3)
    o += f'<path d="M300,522 L560,512 L580,532 L300,540 Z" fill="{INK}" opacity=".28"/>'
    o += rigp(walk_pose((q(t, 12) / 1.333) % 1), 330, 520, 230, flip=True)
    return o
@shot(3)
def _(t, d, fi):
    land = ease(min(1, t / .17)); lift = 0 if t < 2.4 else ease((t - 2.4) / .5)
    o = R(0, 0, 960, 540, "#B9B2A5") + R(0, 0, 960, 540, "url(#dotInk)", extra=' opacity=".2"') + R(0, 0, 960, 150, "#9C968A") + Pth("M0,150 H960", sw=2)
    o += Pth("M0,330 L960,300 M0,430 L960,410", sw=1.4, extra=' opacity=".35"')
    # far leg passing in the background (on twos)
    tq = q(t, 12); fx = lerp(-160, 260, clamp((tq - .4) / 1.6))
    o += f'<g transform="translate({F(fx)} 0)">' + Pth("M60,-20 L150,-20 L160,170 L50,170 Z", fill=INK, stroke=INK, sw=3) + f'<g transform="translate(105 230) scale(1.5) translate(-79 -640)"><use href="#shoeA"/></g></g>'
    y = lerp(-140, 0, land) - lift * 60
    o += f'<g transform="translate(0 {F(y)})">'
    o += f'<ellipse cx="520" cy="548" rx="{F(lerp(120, 230, land))}" ry="18" fill="{INK}" opacity=".35"/>'
    o += Pth("M392,-220 L652,-220 L668,330 L380,330 Z", fill=INK, stroke=INK, sw=4)
    o += Pth("M392,250 C470,268 590,268 664,250 M388,296 C470,314 590,314 666,296", stroke=PAP, sw=3)
    o += Pth("M560,-200 L574,240", stroke=PAP, sw=2, extra=' opacity=".7"')
    o += '<g transform="translate(520 560) scale(4.2) translate(-79 -640)"><use href="#shoeA"/></g></g>'
    if t > .15:
        k = clamp((t - .15) / 1.2); rnd = random.Random(4)
        for i in range(18):
            a = rnd.uniform(math.pi * .9, math.pi * 2.1); rr = 40 + 170 * ease(k) * rnd.uniform(.5, 1.2)
            o += f'<circle cx="{F(520 + math.cos(a)*rr*1.7)}" cy="{F(520 + math.sin(a)*rr*.3)}" r="{F(lerp(10, 2, k) * rnd.uniform(.6, 1.2))}" fill="{PAP}" stroke="{INK}" stroke-width="1" opacity="{F(1-k)}"/>'
    return o
@shot(4)
def _(t, d, fi):
    p = t / d; z = lerp(1.07, 1.0, ease(p))
    bg = sky("dusk") + building(0, 40, 960, 330, kind="bal") + R(0, 330, 960, 210, "#CFC9BD") + Pth("M0,330 H960", sw=3)
    bg += Pth("M640,300 H960 M660,300 V250 M720,300 V250 M780,300 V250 M840,300 V250 M900,300 V250 M640,250 H960", sw=2)
    bg += place("cp07", 120, 360, 120, w=240, filt="softBlur") + crowd_walker("cp11", 270, 820, 360, 120, t, -6, filt="softBlur")
    o = cam(bg, z)
    b = bob(t, amp=5); sway = 1.2 * math.sin(math.pi * q(t, 12) / .743)
    o += prt_front(480, 690 - b, 560, rot=sway)
    return o
@shot(5)
def _(t, d, fi):
    p = t / d; panx = lerp(0, -40, ease(p))
    g = R(-40, 0, 1040, 540, "#CFC9BD") + R(-40, 0, 1040, 540, "url(#dotInk)", extra=' opacity=".08"')
    g += Pth("M300,120 L760,90 L820,330 L360,370 Z", fill="#B9B2A5", sw=2) + Pth("M560,105 L590,350", sw=1.4) + f'<ellipse cx="575" cy="228" rx="40" ry="26" fill="none" stroke="{INK}" stroke-width="1.4"/>'
    for (x, y) in ((360, 190), (690, 160), (720, 300)): g += f'<circle cx="{x}" cy="{y}" r="9" fill="{GRY}" stroke="{INK}" stroke-width="2"/>'
    tq = q(t, 12); px, py = lerp(400, 600, tq / d), lerp(330, 250, tq / d); st = 1.5 * math.sin(math.pi * tq / .743)
    g += f'<path d="M{F(px)},{F(py+10)} L{F(px+170)},{F(py+40)}" stroke="{INK}" stroke-width="14" opacity=".3" stroke-linecap="round"/>'
    g += f'<ellipse cx="{F(px)}" cy="{F(py+10+st)}" rx="20" ry="13" fill="{INK}"/><circle cx="{F(px)}" cy="{F(py)}" r="12" fill="{INK}"/>'
    o = f'<g transform="translate({F(panx)} 0)">{g}</g>'
    o += "".join(R(x, 330, 16, 210, INK, extra=' opacity=".92"') for x in range(0, 960, 70)) + R(0, 320, 960, 22, INK)
    o += f'<circle cx="80" cy="470" r="70" fill="{HI}" stroke="{INK}" stroke-width="10" opacity=".85"/>'
    return o
@shot(6)
def _(t, d, fi):
    z = lerp(1.0, 1.06, t / d)
    g = R(0, 0, 960, 540, "#9AA2A6") + building(0, 0, 960, 540, kind="win", fill=CON, shade=False) + R(0, 0, 960, 540, DEEP, extra=' opacity=".45"')
    g += place("figWitness2", 480, 1500, 1300, w=240)
    g += R(0, 400, 960, 18, INK) + "".join(R(x, 418, 12, 122, INK) for x in range(10, 960, 60))
    g += Pth("M70,400 C60,360 90,340 80,300 M110,400 C120,350 100,330 116,290 M840,400 C850,360 820,340 834,300", stroke=BRN, sw=4)
    return cam(g, z, 480, 270)
@shot(7)
def _(t, d, fi):
    o = sky("dusk") + building(0, 0, 960, 340, kind="bal") + R(0, 340, 960, 200, "#CFC9BD") + Pth("M0,340 H960", sw=3)
    o += R(690, 70, 90, 50, DEEP, 3) + Pth("M690,100 H780 M700,100 V120 M720,100 V120 M740,100 V120 M760,100 V120", sw=2)
    turned = t >= 2.95
    o += place("figA_turn" if turned else "figA_rear", 380, 620, 500)
    if t > d - .5: o += ink_wipe((t - (d - .5)) / .5, 21)
    return o

# ═════════ CAP. II ═════════
def night_roof(skyy=380, roofy=430, par=0):
    return sky("night") + f'<g transform="translate({F(par*.3)} 0)">' + skyline(skyy, col="#22272B") + "</g>" + f'<g transform="translate({F(par)} 0)">' + roof(roofy) + "</g>"
@shot(8)
def _(t, d, fi):
    p = ease(t / d); dy = lerp(0, 40, p)
    o = f'<g transform="translate(0 {F(dy*.3)})">' + sky("night") + skyline(380, col="#22272B") + "</g>"
    o += f'<g transform="translate(0 {F(dy)})">' + roof(430) + tech_room(560, 430, tag=False) + R(650, 300, 48, 130, HI, 2) + R(650, 300, 48, 130, "url(#dotInk)", extra=' opacity=".2"')
    tq = q(t, 12)
    if tq < 3.0: o += rigp(walk_pose((tq / 1.333) % 1), lerp(640, 720, tq / 3), 440, 150)
    else: o += rigp("stand", 720, 440, 150)
    o += "</g>"
    if t < .5: o += ink_wipe(t / .5, 21, close=False)
    return o
@shot(9)
def _(t, d, fi):
    p = t / d; z = 1 + .04 * ease(clamp((t - 3.5) / 2.4))
    g = sky("night") + tech_room(0, 540, w=960, h=520) + R(0, 470, 960, 70, "#2E3338") + '<use href="#tagM" x="70" y="80" width="460" height="317"/>'
    g += place("figA_34", 690, 790, 700)
    k = ease(clamp(q(t, 12) / 1.4)); g += f'<use href="#obj1" x="560" y="{F(lerp(420, 300, k))}" width="120" height="120"/>'
    return zoomat(g, z, 300, 240)
@shot(10)
def _(t, d, fi):
    p = t / d; orb = lerp(-70, 70, ease(p))
    o = sky("night") + f'<g transform="translate({F(orb*.25)} 0)">' + skyline(360, col="#22272B") + "</g>"
    o += f'<g transform="translate({F(orb*.6)} 0)">' + R(-300, 414, 1560, 26, CON, 2) + R(-300, 440, 1560, 100, "#2E3338") + roof(440) + tech_room(300, 440, w=360, h=260) + "</g>"
    if t >= 2.92:
        tq6 = q(t, 6); j = random.Random(int(tq6 * 6))
        o += f'<g transform="translate({F(orb + j.uniform(-1.5, 1.5))} {F(j.uniform(-1, 1))})" opacity="{F(.82 + j.uniform(-.1, .1))}">' + place("figMemory3", 300, 470, 230, w=240, filt="toBurgPlate")
        o += particles(tq6, int(tq6 * 6), 10, (350, 330, 400, 380), (30, -10), col=BURG, rmin=1.5, rmax=3.5) + "</g>"
    o += f'<g transform="translate({F(orb*1.1)} 0)">' + place("figA2", 740, 480, 230) + "</g>"
    return o
@shot(11)
def _(t, d, fi):
    z = 1 + .08 * (t / d)
    g = R(0, 0, 960, 540, DEEP) + R(0, 0, 960, 540, "url(#dotPaper)", extra=' opacity=".1"') + R(0, 0, 420, 540, "#2E3338")
    burst = [i * 1.486 for i in range(4)]
    live = any(0 <= t - b < .9 for b in burst)
    g += f'<use href="#tagM" x="20" y="120" width="420" height="290" opacity="{F(.85 + (.15 if live else 0))}"/>'
    g += Pth("M690,620 C700,560 730,500 760,430 L860,452 C840,520 830,580 830,620 Z", fill=INK, stroke=INK, sw=4) + Pth("M752,446 L866,470", stroke=PAP, sw=3)
    g += '<g transform="translate(790 440) rotate(180) scale(4.6)"><use href="#r_handCan"/></g>'
    for i, b in enumerate(burst):
        if 0 <= t - b < .9:
            k = (t - b) / .9
            g += f'<path d="M600,312 L{F(lerp(560, 300, ease(k)))},{F(lerp(300, 200, ease(k)))} L{F(lerp(560, 300, ease(k)))},{F(lerp(330, 380, ease(k)))} Z" fill="{BURG}" opacity="{F(.28*(1-k))}"/>'
    for i, b in enumerate(burst):
        if 0 <= t - b < 1.2:
            k = (t - b) / 1.2; rnd = random.Random(30 + i)
            for j in range(26):
                a = rnd.uniform(math.pi * .88, math.pi * 1.12); rr = 20 + 300 * k * rnd.uniform(.5, 1.1)
                g += f'<circle cx="{F(600 + math.cos(a)*rr)}" cy="{F(312 + math.sin(a)*rr*.5)}" r="{F(rnd.uniform(2, 7)*(1-k*.5))}" fill="{BURG}" opacity="{F(1-k)}"/>'
    o = zoomat(g, z, 520, 270)
    if t > d - .5: o += ink_wipe((t - (d - .5)) / .5, 41)
    return o

# ═════════ CAP. III ═════════
def street_night(dx=0):
    o = sky("night") + building(-60 + dx, 60, 1080, 420, night=True) + R(-60 + dx, 360, 1080, 60, CON, 2) + shutters(-20 + dx, 366, 13, w=70, h=56, tag_i=2) + R(-60, 420, 1080, 160, "#3A3F44")
    for lx in (220, 700):
        o += f'<circle cx="{lx+dx}" cy="160" r="70" fill="#F2EEE6" opacity=".25"/><circle cx="{lx+dx}" cy="160" r="16" fill="#F2EEE6" stroke="{INK}" stroke-width="3"/>'
    return o
@shot(12)
def _(t, d, fi):
    tq = q(t, 12); k = ease(clamp(tq / 1.6)); b = 0 if k >= 1 else bob(t, amp=4)
    o = street_night() + place("figA_rear", lerp(90, 250, k), 520 - b, 270)
    o = f'<g transform="rotate(4 480 270) translate(480 270) scale(1.1) translate(-480 -270)">{o}</g>'
    if t < .5: o += ink_wipe(t / .5, 41, close=False)
    return o
@shot(13)
def _(t, d, fi):
    k = clamp(t / d); L = lerp(.28, 1.0, ease(k))
    o = R(0, 0, 960, 540, INK) + R(0, 0, 960, 540, "url(#dotPaper)", extra=' opacity=".08"')
    o += '<use href="#handOpen" x="160" y="40" width="360" height="420" transform="scale(-1 1) translate(-680 0)"/><use href="#handOpen" x="480" y="40" width="360" height="420"/>'
    paths = ["M24,40 C26,50 28,60 32,72", "M45,24 C45,38 45,52 45,68", "M59,16 C59,34 59,50 59,68", "M79,26 C77,38 75,52 73,68"]
    o += '<g transform="translate(480 40) scale(3)"><g fill="none" stroke="#8C1748" stroke-linecap="round" stroke-width="12.5">'
    o += "".join(f'<path d="{pp}" pathLength="1" stroke-dasharray="{L:.3f} 1"/>' for pp in paths) + "</g></g>"
    return o
@shot(14)
def _(t, d, fi):
    def pose(tt):
        tq = q(tt, 12); return 5 * math.sin(2 * math.pi * tq / 2.97), 10 * math.sin(2 * math.pi * tq / 5.9)
    o = R(0, 0, 960, 540, "#3A3F44") + R(60, 40, 840, 420, "#2A2F33", 4) + R(60, 40, 840, 420, "url(#dotPaper)", extra=' opacity=".07"')
    o += Pth("M60,460 H900", sw=6) + Pth("M120,60 L300,420 M560,60 L740,420", stroke="#F2EEE6", sw=2, extra=' opacity=".25"')
    o += crowd_walker("cp02nf", 260, 60, 500, 230, t, 30) + crowd_walker("cp10", 240, 900, 500, 230, t, -24, phase=.4)
    r0, x0 = pose(t); r1, x1 = pose(t - 2 / 24)
    o += prt_front(360 + x0, 520, 330, stage=2, rot=r0)
    o += op(f'<g transform="translate(580 0) scale(-1 1) translate(-580 0)">{prt_front(580 - x1, 506, 300, stage=2, rot=-r1)}</g>', .55)
    return o
@shot(15)
def _(t, d, fi):
    p = ease(t / d); z = lerp(1.0, 1.28, p)
    g = sky("night") + Pth("M0,120 L380,250 L380,330 L0,540 Z", fill="#5E6160", sw=2) + Pth("M960,120 L580,250 L580,330 L960,540 Z", fill="#5E6160", sw=2)
    g += Pth("M0,540 L380,330 L580,330 L960,540 Z", fill="#3A3F44", sw=2) + R(440, 260, 80, 70, INK, 2) + Pth("M452,276 H508 M452,290 H508 M452,304 H508", stroke=PAP, sw=2)
    for (sym, x, w, h, gg) in (("cp01", 160, 250, 210, 470), ("cp12", 800, 250, 210, 470), ("cp06", 300, 250, 130, 395), ("cp09", 660, 280, 140, 395), ("cp11", 90, 270, 260, 540)):
        g += place(sym, x, gg, h, w=w, filt="toGreyDk")
    o = zoomat(g, z, 480, 300)
    tq = q(t, 12); bb = 4 * abs(math.sin(math.pi * tq / .5)); sw = 1.5 * math.sin(math.pi * tq / .5)
    o += f'<g transform="rotate({F(sw)} 480 {F(lerp(500, 440, p))})">' + place("figA_rear", 480, lerp(500, 440, p) - bb, lerp(250, 150, p)) + "</g>"
    return o

# ═════════ CAP. IV ═════════
@shot(16)
def _(t, d, fi):
    k = (t / d); z = 1 + .35 * k; rot = 6 * k
    g = R(-200, -200, 1360, 940, PAP) + R(-200, -200, 1360, 940, "url(#tiles)")
    for i in range(9):
        s = 1.25 - i * .13; w, h = 900 * s, 500 * s
        g += Pth(f"M{F(480-w/2)},{F(270-h/2)} H{F(480+w/2)} V{F(270+h/2)} H{F(480-w/2)} Z", fill=("#B9B2A5" if i % 2 else "#CFC9BD"), sw=3)
        for kk in range(1, 6): g += Pth(f"M{F(480-w/2 + kk*w/12)},{F(270+h/2)} V{F(270+h/2 - h*.06)}", sw=1.4)
    o = cam(g, z, 480, 270, rot=rot)
    o += place("figA_rear", 480, 330 + lerp(0, -10, k), 90 * (1 - .2 * k))
    return o
@shot(17)
def _(t, d, fi):
    off = (t * 52) % 40
    o = tiles_wall(0, 540) + R(0, 0, 960, 540, "url(#dotInk)", extra=f' opacity="{F(.06 + .1 * t / d)}"') + Pth("M-20,80 L980,520 L980,560 L-20,140 Z", fill="#5E6160", sw=3)
    o += "".join(Pth(f"M{F(x - off)},{F(80 + (x - off + 20)*0.44)} L{F(x - off)},{F(140 + (x - off + 20)*0.44)}", sw=1.6) for x in range(0, 1040, 40))
    o += Pth("M-20,40 L980,480", sw=8) + Pth("M-20,40 L980,480", stroke=PAP, sw=2, extra=' stroke-dasharray="4 4"')
    o += rigp(blend_pose("stand", dict(torso=3, head=10), .5), 480, 350 + bob(t, amp=1.5), 260)
    return o
@shot(18)
def _(t, d, fi):
    p = ease(t / d); z = lerp(1.0, 1.4, p)
    g = R(0, 0, 960, 540, PAP) + Pth("M0,0 L330,180 L630,180 L960,0 Z", fill="#CFC9BD", sw=2) + Pth("M0,540 L330,360 L630,360 L960,540 Z", fill="#B9B2A5", sw=2)
    g += Pth("M0,0 L330,180 L330,360 L0,540 Z", fill="url(#tiles)", sw=2) + Pth("M960,0 L630,180 L630,360 L960,540 Z", fill="url(#tiles)", sw=2)
    g += R(330, 180, 300, 180, DEEP, 2) + Pth("M380,220 C420,180 540,180 580,220 C600,260 560,320 480,320 C400,320 360,260 380,220 Z", fill="#2E3338", stroke=PAP, sw=2)
    g += Pth("M370,330 H590 M400,330 V300 M440,330 V300 M520,330 V300 M560,330 V300", sw=3)
    flick = random.Random(int(t * 24)).random() < .12
    g += R(380, 30, 200, 10, "#8A8D8B" if flick else "#E8E4DB", 2)
    o = cam(g, z, 480, 270)
    burst = (int(t * 24) % 24) < 4
    tq = t if burst else q(t, 12)
    o += rigp(run_pose((tq / .55) % 1), 470, 500, 300)
    return o
@shot(19)
def _(t, d, fi):
    o = '<use href="#platform" width="960" height="540"/>' + place("figWitness2", 500, 300, 150, w=240)
    x = lerp(-1700, 1100, t / d); cars = ""
    for c in range(4):
        cx = x + c * 640
        cars += R(cx, 300, 620, 140, INK, 3) + "".join(R(cx + 30 + i * 120, 320, 80, 50, "#F2EEE6", 2, extra=' opacity=".9"') for i in range(5))
        cars += f'<use href="#tagM" x="{F(cx+40)}" y="380" width="80" height="55" opacity=".5"/>'
    o += cars + particles(t, 9, 14, (0, 380, 960, 520), (90, -30), col=HI, rmin=2, rmax=5)
    o += place("figA_rear", 780, 600, 330)
    return o
@shot(20)
def _(t, d, fi):
    if t > d - 3 / 24: return R(0, 0, 960, 540, INK)
    o = R(0, 0, 960, 540, INK) + head("headA", 480, -330, 900)
    rnd = random.Random(int(t * 24)); dim = rnd.random() < .18
    if dim: o += R(0, 0, 960, 540, INK, extra=' opacity=".55"')
    return o

# ═════════ CAP. V ═════════
def train_interior():
    o = R(0, 0, 960, 540, "#9AA2A6") + Pth("M0,40 L960,0 L960,140 L0,160 Z", fill="#CFC9BD", sw=2) + Pth("M0,400 L960,430 L960,540 L0,540 Z", fill="#5E6160", sw=2)
    o += Pth("M520,170 L900,150 L900,330 L520,340 Z", fill="#22272B", sw=4) + Pth("M140,170 L460,180 L460,340 L140,350 Z", fill="#22272B", sw=4)
    o += Pth("M500,30 V430 M930,10 V440", sw=8) + Pth("M500,30 V430 M930,10 V440", stroke=PAP, sw=2, extra=' opacity=".6"')
    o += R(120, 300, 380, 50, BRN, 3) + R(120, 372, 380, 30, BRN, 3)
    return o
@shot(21)
def _(t, d, fi):
    sway = .5 * math.sin(2 * math.pi * t / 5.94)
    o = train_interior() + op(place("figWitness2", 700, 360, 190, w=240), .7) + rigp("sit", 300, 470, 260)
    return f'<g transform="rotate({F(sway)} 480 540)">{o}</g>'
@shot(22)
def _(t, d, fi):
    k = ease(clamp((t - .6) / 2.2))
    o = R(0, 0, 960, 540, "#9AA2A6") + Pth("M500,40 L940,40 L940,500 L500,500 Z", fill="#22272B", sw=5)
    o += R(-20, 210, 470, 260, BRN, 4) + R(-20, 300, 470, 6, INK) + R(-20, 470, 500, 90, "#5E6160", 4) + R(-20, 446, 500, 34, BRN, 4)
    o += f'<g transform="translate(260 560) scale(1.05) translate(-120 -640)">{rig_markup("sit")}</g>'
    pose = dict(POSES["sit"]); pose["head"] = lerp(8, -34, k); pose["torso"] = lerp(4, -4, k)
    o += f'<g opacity=".95"><g transform="translate(760 520) scale(-.9 .9) translate(-120 -640)"><g filter="url(#fxDouble)">{rig_markup(pose)}</g></g></g>'
    return o
@shot(23)
def _(t, d, fi):
    k = ease(clamp((t - .5) / 2.0)); up = t >= 2.0
    o = R(0, 0, 960, 540, "#9AA2A6") + Pth("M0,40 L960,0 L960,140 L0,160 Z", fill="#CFC9BD", sw=2) + Pth("M0,400 L960,430 L960,540 L0,540 Z", fill="#5E6160", sw=2)
    for (x0, s) in ((540, 1), (640, .7), (710, .5), (760, .35)):
        o += Pth(f"M{x0},{F(170+(1-s)*60)} L{F(x0+360*s)},{F(160+(1-s)*60)} L{F(x0+360*s)},{F(160+(1-s)*60 + 180*s)} L{x0},{F(170+(1-s)*60+180*s)} Z", fill="#22272B", sw=3)
    o += op(f'<g transform="translate({F(lerp(60, 0, k))} {F(lerp(-60, 0, k))}) scale({lerp(.8, 1, k):.3f})" transform-origin="680 520">' + place("figA2", 680, 520, 320, filt="fxDouble") + "</g>", lerp(.5, 1, k))
    o += rigp("stand" if up else "sit", 240, 520, 330)
    return o
@shot(24)
def _(t, d, fi):
    tilt = lerp(0, 14, ease(t / d))
    o = R(0, 0, 960, 540, "#E2DDD2") + R(0, 380, 960, 160, "#B9B2A5")
    o += f'<g transform="translate(860 470) matrix(1 0 -1.1 -0.22 0 0) translate(-860 -470)">{place("figA2", 640, 470, 330, filt="shadowInk")}</g>'
    o += f'<g transform="rotate({F(tilt)} 640 220)">{place("figA2", 640, 470, 330, filt="fxDouble")}</g>'
    o += place("figA_rear", 230, 700, 640)
    return o
@shot(25)
def _(t, d, fi):
    rot = lerp(8, 12, t / d); rnd = random.Random(3)
    g = R(-120, -120, 1200, 780, PAP)
    for kk in range(9):
        x0 = rnd.randint(-60, 860); y0 = rnd.randint(-40, 480); s = rnd.choice([.5, .7, 1.0])
        g += Pth(f"M{x0},{y0}" + "".join(f" h{F(30*s)} v{F(-22*s)}" for _ in range(6)), sw=3)
    g += Pth("M120,420 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30 L440,420 Z", fill="#B9B2A5", stroke="none")
    g += Pth("M120,420 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30", sw=5)
    k = t / d
    g += rigp(run_pose((q(t, 12) / .55) % 1), lerp(170, 330, k), lerp(410, 300, k), 120)
    g += f'<g transform="translate({F(lerp(430, 300, k))} {F(lerp(190, 280, k))}) scale(-.2 .2) translate(-120 -640)"><g filter="url(#fxDouble)">{rig_markup(walk_pose((t / 1.333) % 1))}</g></g>'
    return f'<g transform="rotate({F(rot)} 480 270)">{g}</g>' + R(0, 0, 960, 540, "url(#dotInk)", extra=' opacity=".12"')
@shot(26)
def _(t, d, fi):
    k = ease(clamp(t / 2.2)); kd = ease(clamp(t / 2.0)) * 1.08
    o = R(0, 0, 960, 540, "#EEEAE1") + R(0, 400, 960, 140, "#CFC9BD")
    o += f'<g transform="translate(300 470) matrix(1 0 -1.0 -0.2 0 0) translate(-300 -470)">{place("figA2", 300, 470, 340, filt="shadowInk")}</g>'
    o += f'<g transform="translate(660 470) matrix(1 0 1.0 -0.2 0 0) translate(-660 -470)">{place("figA2", 660, 470, 340, filt="shadowInk")}</g>'
    o += rigp(blend_pose("stand", "hand", k), 300, 470, 340)
    o += f'<g transform="translate(660 470) scale(-.567 .567) translate(-120 -640)"><g filter="url(#fxDouble)">{rig_markup(blend_pose("dbl", "dblHand", kd))}</g></g>'
    return o
@shot(27)
def _(t, d, fi):
    k = ease(clamp(t / (d * .85))); tq = q(t, 12); tr_ = 1.2 * math.sin(tq * 31)
    hand_l = (f'<use href="#handA"/><path d="M14,404 L64,404 C70,418 70,434 66,446 L18,446 C12,434 12,418 14,404 Z" fill="{BURG}"/><g fill="none" stroke="{BURG}" stroke-linecap="round" stroke-width="9.5">'
              '<path d="M24,440 C22,456 22,466 25,476"/><path d="M36,442 C35,460 36,474 38,486"/><path d="M48,442 C48,460 49,474 51,484"/><path d="M60,440 C61,454 61,464 60,474"/><path d="M64,412 C74,420 77,434 71,448" stroke-width="11.5"/></g>')
    hl = lerp(-170, 222, k); hr = lerp(1130, 738, k)
    o = R(0, 0, 960, 540, "#EEEAE1") + R(0, 420, 960, 120, "url(#dotInk)", extra=' opacity=".08"')
    o += f'<g transform="translate({F(hl)} {F(-1140 + tr_)}) scale(3.2)">{hand_l}</g>' + R(hl + 26, -20, 196, 176, INK)
    o += f'<g transform="translate({F(hr)} {F(-1140 - tr_)}) scale(-3.2 3.2)"><use href="#handA" filter="url(#fxDouble)"/></g>' + R(hr - 222, -20, 196, 176, "#E2DDD2", 3)
    if t > d * .8:
        kk = clamp((t - d * .8) / (d * .2))
        o += f'<circle cx="480" cy="{F(-1140 + 470*3.2)}" r="{F(8 + 90*kk)}" fill="none" stroke="{BURG}" stroke-width="{F(6*(1-kk)+1)}" opacity="{F(1-kk)}"/>'
    return o
@shot(28)
def _(t, d, fi):
    p = ease(t / d); z = lerp(1.7, 1.0, p)
    g = R(-400, -300, 1760, 1140, "#F2EEE6")
    for i in range(8):
        s = 1 - i * .12; w, h = 480 * s, 540 * s; lx, rx = 480 - w, 480 + w
        g += R(lx, 270 - h / 2, 70 * s, h, "url(#slats)", 2) + R(rx - 70 * s, 270 - h / 2, 70 * s, h, "url(#slats)", 2)
        g += f'<use href="#tagM" x="{F(lx)}" y="{F(270 - h*0.2)}" width="{F(70*s)}" height="{F(48*s)}"/><use href="#tagM" x="{F(rx-70*s)}" y="{F(270 - h*0.2)}" width="{F(70*s)}" height="{F(48*s)}"/>'
    o = cam(g, z, 480, 270)
    o += rigp("fall", 480, lerp(360, 400, p), lerp(260, 140, p), rotd=lerp(-10, -50, p))
    return o

# ═════════ CLIMAX ═════════
BLOCKS = [(60, 200, 200, 260, -6, (-60, -40)), (290, 140, 180, 300, 4, (-20, -70)), (500, 220, 240, 200, -3, (30, -30)), (770, 120, 160, 330, 7, (70, -50)), (360, 400, 220, 90, 10, (0, 60))]
def collapse_bg(k, extra=1.0):
    o = R(0, 0, 960, 540, INK)
    for (x, y, w, h, r, (vx, vy)) in BLOCKS:
        o += f'<g transform="translate({F(vx*k*extra)} {F(vy*k*extra)}) rotate({F(r*k*extra)} {x+w/2} {y+h/2})">' + building(x, y, w, y + h, shade=True) + "</g>"
    return o
@shot(29)
def _(t, d, fi):
    k = ease(clamp(t / d))
    o = collapse_bg(k)
    L = lerp(.05, 1, k)
    o += f'<path d="M0,470 L120,460 L200,500 L300,470 L420,510 L520,480 L640,520 L760,470 L900,500 L960,480" fill="none" stroke="{BURG}" stroke-width="{F(lerp(3, 12, k))}" pathLength="1" stroke-dasharray="{L:.3f} 1"/>'
    o += f'<path d="M270,0 L285,140 M480,0 L470,210 M760,0 L780,110 M470,330 L500,400" fill="none" stroke="{BURG}" stroke-width="{F(lerp(2, 7, k))}" opacity="{F(k)}"/>'
    o += particles(t, 13, 40, (0, 0, 960, 540), (0, -30), col=PAP, rmin=1, rmax=3)
    return o
@shot(30)
def _(t, d, fi):
    land = 2.77; k = ease(clamp(t / land)); up = lerp(30, -20, t / d)
    o = R(0, 0, 960, 540, INK) + f'<g transform="translate(0 {F(up)})">' + Pth("M200,440 L760,420 L820,500 L160,520 Z", fill="#CFC9BD", sw=3) + Pth("M200,440 L160,520", stroke=BURG, sw=6) + "</g>"
    fall_y = lerp(-260, 0, k * k)
    o += rigp("kneel" if t >= land else "fall", 470, 470 + fall_y + up, 260, rotd=0 if t >= land else -20, filt="rimPap")
    for i, (sym, x, y, w, r) in enumerate((("obj1", 160, 120, 120, -12), ("obj2", 720, 110, 110, 18), ("obj3", 80, 300, 110, 8), ("obj4", 760, 280, 120, -6), ("obj5", 420, 60, 110, 10))):
        a = t * .25 + i; ox, oy = 18 * math.cos(a), 12 * math.sin(a)
        o += f'<g transform="translate({F(ox)} {F(oy)}) rotate({F(r + t*6*(1 if i%2 else -1))} {x+w/2} {y+w/2})"><use href="#{sym}" x="{x}" y="{y}" width="{w}" height="{w}"/></g>'
    o += particles(t, 17, 30, (0, 0, 960, 540), (0, -24), col=PAP, rmin=1, rmax=3) + Pth("M0,0 L180,540", stroke=BURG, sw=8, extra=' opacity=".9"')
    return o
@shot(31)
def _(t, d, fi):
    start = 2.45
    i = 1 if t < start else min(6, 1 + int((t - start) / (4 / 24)) + 1)
    o = R(0, 0, 960, 540, INK) + Pth("M0,540 L960,500", stroke=BURG, sw=14) + f'<circle cx="480" cy="250" r="{F(300 + 10*math.sin(t*2))}" fill="{BURG}" opacity=".18"/>'
    o += head(f"wt2_{i}", 480, -40, 430) + R(0, 506, 960, 40, "#5E6160", 2)
    return o
@shot(32)
def _(t, d, fi):
    k = ease(t / d); dx = lerp(0, 110, k)
    o = R(0, 0, 960, 540, PAP)
    tear = f"M{F(520-dx)},0 L{F(470-dx)},120 L{F(540-dx)},200 L{F(460-dx)},320 L{F(520-dx)},420 L{F(470-dx)},540 L960,540 L960,0 Z"
    o += Pth(tear, fill=INK, stroke="none") + Pth(f"M{F(520-dx)},0 L{F(470-dx)},120 L{F(540-dx)},200 L{F(460-dx)},320 L{F(520-dx)},420 L{F(470-dx)},540", stroke="#F2EEE6", sw=6)
    o += rigp("kneel", 230, 470, 250)
    o += op(place("figA2", 760, 480, 280, filt="fxDouble"), 1 - k) + particles(t, 23, 40, (680, 120, 860, 480), (40, -60), col=HI, rmin=1.5, rmax=5)
    tq6 = q(t, 6)
    o += place("figMemory3", lerp(120, 560, tq6 / d), 480, 220, w=240, filt="toBurgPlate")
    return o
@shot(33)
def _(t, d, fi):
    k = t / d; o = R(0, 0, 960, 540, "#F2EEE6")
    rnd = random.Random(5)
    for _ in range(int(lerp(140, 30, k))):
        x, y0, r = rnd.uniform(0, 960), rnd.uniform(-540, 540), rnd.choice([1.5, 2, 3, 4])
        y = (y0 + 260 * t) % 600 - 30
        o += f'<circle cx="{F(x)}" cy="{F(y)}" r="{F(r)}" fill="{INK}" opacity="{F(.75*(1-k*.6))}"/>'
    return o

# ═════════ EPILOGO ═════════
def dawn_sky(sun_y):
    return R(0, 0, 960, 540, "#EEEAE1") + R(0, 330, 960, 210, "url(#dotInk)", extra=' opacity=".1"') + f'<circle cx="840" cy="{F(sun_y)}" r="56" fill="#F2EEE6" stroke="{INK}" stroke-width="3"/>'
@shot(34)
def _(t, d, fi):
    o = dawn_sky(lerp(380, 330, ease(t / d))) + skyline(400, col="#5E6160", lit=False) + roof(430, night=False) + tech_room(40, 430, w=200, h=150)
    br = 1 + .006 * math.sin(2 * math.pi * q(t, 12) / 2.97)
    o += f'<g transform="translate(520 452) scale({.42*br:.4f}) translate(-120 -640)">{rig_markup("sit")}</g>'
    return o
@shot(35)
def _(t, d, fi):
    drop = 2.97; k = ease(clamp((t - drop) / .45)); hands_up = ease(clamp(q(t, 12) / drop))
    o = dawn_sky(320) + R(0, 380, 960, 160, CON) + '<g transform="translate(480 1090) scale(1.6) translate(-130 -640)"><use href="#figA_rearBody" width="260" height="660" filter="url(#toInk)"/></g>'
    if t < drop:
        o += head("headA", 480, 60, 300)
    else:
        o += head("headA_open", 480, 40, 300)
        o += f'<g transform="translate(0 {F(lerp(0, 150, k))})" opacity="{F(1-k)}"><path d="M352,250 C340,150 370,70 480,48 C590,70 620,150 608,250 Z" fill="{INK}"/></g>'
    hy = lerp(330, 150, hands_up) if t < drop else lerp(150, 330, k)
    o += f'<g transform="translate(330 {F(hy)}) scale(1.3) translate(-40 -404)"><use href="#handA"/>{stain_stage_overlay(2)}</g>'
    o += f'<g transform="translate(630 {F(hy)}) scale(-1.3 1.3) translate(-40 -404)"><use href="#handA"/></g>'
    return o
@shot(36)
def _(t, d, fi):
    z = 1 + .02 * t / d
    return zoomat(dawn_sky(320) + R(0, 420, 960, 120, CON) + head("headA_open", 480, -70, 600), z, 480, 260)
@shot(37)
def _(t, d, fi):
    p = ease(t / d); z = lerp(2.6, 1.0, p); cy = lerp(230, 270, p); cx = lerp(220, 480, p)
    g = dawn_sky(300)
    for (x, tp, w) in ((40, 250, 300), (380, 280, 280), (700, 230, 220)):
        g += building(x, tp, w, 500, shade=False) + R(x, tp, w * .35, 500 - tp, "url(#dotInk)", extra=' opacity=".3"')
    g += R(0, 500, 960, 40, "#B9B2A5") + R(60, 220, 260, 30, CON, 2) + R(110, 168, 96, 54, DEEP, 2) + R(178, 186, 18, 36, INK, 1.5) + '<use href="#tagM" x="114" y="176" width="58" height="40"/>'
    g += f'<g transform="translate(262 232) scale(.12) translate(-120 -640)">{rig_markup("sit")}</g>'
    for i, (sym, x, w, sp) in enumerate((("cp02", 360, 260, 8), ("cp04", 560, 250, 16), ("cp03", 820, 250, -10))):
        g += crowd_walker(sym, w, x, 528, 34, t, sp, phase=i * .3)
    return cam(g, z, cx, cy)
@shot(38)
def _(t, d, fi):
    k = ease(clamp(t / 1.0))
    return (R(0, 0, 960, 540, PAP) + op(f'<text x="480" y="300" text-anchor="middle" font-size="150" font-weight="900" font-family="Big Shoulders Display, Impact, sans-serif" fill="{INK}">GUILTY</text>'
            f'<text x="480" y="350" text-anchor="middle" font-size="24" font-family="IBM Plex Mono, monospace" fill="{INK}" letter-spacing="6">NOYZ NARCOS</text>'
            '<use href="#tagM" x="420" y="380" width="120" height="83"/>', k))
