"""Storyboard panels (960×540) composed from the approved asset library (symbols in the page defs)."""
import math
INK, PAP, HI, CON, CEM, BRN, DEEP, BURG, GRY = "#171717", "#D6D0C4", "#E8E4DB", "#777A79", "#687783", "#66594E", "#3E4852", "#8C1748", "#8A8D8B"

def F(v): return f"{v:.1f}"

# ── rig (port of the page's RIG) ──
NEUTRAL = dict(torso=0, head=0, flip=False, nS=-4, nE=-6, nW=0, fS=2, fE=-4, fW=0, nH=-3, nK=3, nA=0, fH=4, fK=2, fA=-6, hand='r_hand')
POSES = {
 'walk': dict(torso=6, head=-4, nS=16, nE=-14, nW=4, fS=-18, fE=-18, fW=0, nH=-24, nK=4, nA=10, fH=22, fK=10, fA=-10),
 'hands': dict(torso=12, head=26, nS=-40, nE=-70, nW=20, fS=-34, fE=-72, fW=16, nH=-3, nK=3, nA=0, fH=4, fK=2, fA=-6),
 'run': dict(torso=18, head=-14, nS=44, nE=-78, nW=0, fS=-52, fE=-80, fW=0, nH=-58, nK=72, nA=-8, fH=34, fK=48, fA=8),
 'tag': dict(torso=2, head=-10, nS=-70, nE=-30, nW=0, fS=6, fE=-10, fW=0, nH=-14, nK=8, nA=6, fH=14, fK=4, fA=-18, hand='r_handCan'),
 'kneel': dict(torso=26, head=30, nS=-16, nE=-14, nW=0, fS=-10, fE=-12, fW=0, nH=10, nK=80, nA=0, fH=-70, fK=72, fA=-2),
 'sit': dict(torso=4, head=8, nS=-18, nE=-46, nW=12, fS=-14, fE=-48, fW=10, nH=-86, nK=86, nA=-2, fH=-80, fK=82, fA=-4),
 'stand': dict(),
 'fall': dict(torso=-38, head=-20, nS=-150, nE=-20, nW=0, fS=-130, fE=-30, fW=0, nH=-40, nK=40, nA=0, fH=-14, fK=50, fA=0),
 'dbl': dict(torso=-4, head=34, nS=10, nE=16, nW=24, fS=-6, fE=14, fW=10, nH=-2, nK=-16, nA=18, fH=6, fK=-14, fA=8),
 'dblHand': dict(torso=-2, head=30, nS=-64, nE=18, nW=30, fS=-6, fE=14, fW=10, nH=-2, nK=-16, nA=18, fH=6, fK=-14, fA=8),
 'hand': dict(torso=0, head=4, nS=-60, nE=-10, nW=0, fS=2, fE=-4),
}
def full(p):
    o = dict(NEUTRAL); o.update(p); return o
def rot(x, y, d):
    r = math.radians(d); c, s = math.cos(r), math.sin(r); return (x * c - y * s, x * s + y * c)
def leg_low(h, k, a):
    pts = [rot(px, py, h) for px, py in ((-38, -26), (34, -26), (-34, 128), (32, 128))]
    knee = rot(0, 120, h); cum = h + k
    pts += [(knee[0] + q[0], knee[1] + q[1]) for q in (rot(px, py, cum) for px, py in ((-33, -10), (32, -10), (-40, 94), (40, 94)))]
    sh = rot(0, 88, cum); ank = (knee[0] + sh[0], knee[1] + sh[1]); cum += a
    pts += [(ank[0] + q[0], ank[1] + q[1]) for q in (rot(px, py, cum) for px, py in ((-42, 32), (74, 32), (-42, 18), (74, 18)))]
    return max(p[1] for p in pts)
def T(x, y, r): return f"translate({x} {y}) rotate({r})"
def rig_markup(p, x0=120):
    a = full(POSES[p] if isinstance(p, str) else p)
    low = max(leg_low(a['nH'], a['nK'], a['nA']), leg_low(a['fH'], a['fK'], a['fA']))
    hipY = 640 - low
    def arm(s, e, w, hand): return f'<g transform="{T(8,-222,s)}"><use href="#r_uarm"/><g transform="{T(0,120,e)}"><use href="#r_farm"/><g transform="{T(0,100,w)}"><use href="#{hand}"/></g></g></g>'
    def leg(h, k, an): return f'<g transform="rotate({h})"><use href="#r_thigh"/><g transform="{T(0,120,k)}"><use href="#r_shin"/><g transform="{T(0,88,an)}"><use href="#r_foot"/></g></g></g>'
    head = f'<g transform="{T(30,-240,a["head"])}"><use href="#r_head"/></g>'
    return (f'<g transform="translate({x0} {F(hipY)})">'
            f'<g transform="rotate({a["torso"]})">{arm(a["fS"],a["fE"],a["fW"],"r_handFar")}</g>{leg(a["fH"],a["fK"],a["fA"])}'
            f'<g transform="rotate({a["torso"]})"><use href="#r_torso"/></g>{leg(a["nH"],a["nK"],a["nA"])}'
            f'<g transform="rotate({a["torso"]})">{head}{arm(a["nS"],a["nE"],a["nW"],a["hand"])}</g></g>')

# ── placement helpers ──
def place(sym, x, ground, h, w=260, cxu=None, flip=False, filt=None, extra=""):
    """symbol with ground at y=640 in its own units, figure ~600 units tall → h px."""
    s = h / 600; cxu = w / 2 if cxu is None else cxu
    sx = -s if flip else s
    f = f' filter="url(#{filt})"' if filt else ""
    return f'<g transform="translate({F(x)} {F(ground)}) scale({F(sx)} {F(s)}) translate({F(-cxu)} -640){extra}"><use href="#{sym}" width="{w}" height="660"{f}/></g>'
def rig(pose, x, ground, h, flip=False, filt=None, rotd=0):
    s = h / 600; sx = -s if flip else s
    f = f' filter="url(#{filt})"' if filt else ""
    r = f" rotate({rotd})" if rotd else ""
    return f'<g transform="translate({F(x)} {F(ground)}){r} scale({F(sx)} {F(s)}) translate(-120 -640)"><g{f}>{rig_markup(pose)}</g></g>'
def head(sym, x, y, w, vb_h=152, filt=None, vbw=120):
    h = w * vb_h / vbw; f = f' filter="url(#{filt})"' if filt else ""
    return f'<use href="#{sym}" x="{F(x - w/2)}" y="{F(y)}" width="{F(w)}" height="{F(h)}"{f}/>'
def R(x, y, w, h, fill, sw=0, extra=""):
    st = f' stroke="{INK}" stroke-width="{sw}"' if sw else ""
    return f'<rect x="{F(x)}" y="{F(y)}" width="{F(w)}" height="{F(h)}" fill="{fill}"{st}{extra}/>'
def Pth(d, fill="none", stroke=INK, sw=3, extra=""):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"{extra}/>'
def arrow(x1, y1, x2, y2, label=None, lx=None, ly=None):
    a = math.atan2(y2 - y1, x2 - x1); L = 16
    p1 = (x2 - L * math.cos(a - .5), y2 - L * math.sin(a - .5)); p2 = (x2 - L * math.cos(a + .5), y2 - L * math.sin(a + .5))
    out = (f'<g class="ann"><path d="M{F(x1)},{F(y1)} L{F(x2)},{F(y2)}" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>'
           f'<path d="M{F(x1)},{F(y1)} L{F(x2)},{F(y2)}" stroke="#F2EEE6" stroke-width="4" stroke-linecap="round"/>'
           f'<path d="M{F(x2)},{F(y2)} L{F(p1[0])},{F(p1[1])} L{F(p2[0])},{F(p2[1])} Z" fill="#F2EEE6" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
    if label:
        lx = (x1 + x2) / 2 if lx is None else lx; ly = (y1 + y2) / 2 - 16 if ly is None else ly
        out += f'<g><rect x="{F(lx - len(label)*5.2 - 8)}" y="{F(ly - 15)}" width="{F(len(label)*10.4 + 16)}" height="22" fill="#F2EEE6" stroke="{INK}" stroke-width="2"/><text x="{F(lx)}" y="{F(ly+1)}" text-anchor="middle" font-size="14" font-weight="500" font-family="IBM Plex Mono, monospace" fill="{INK}">{label}</text></g>'
    return out + "</g>"
def letterbox():
    return f'<path d="M0,69 H960 M0,471 H960" stroke="{INK}" stroke-width="1.4" stroke-dasharray="10 8" opacity=".45"/>'

# ── backgrounds ──
def sky(kind):
    if kind == "sunset":
        return R(0, 0, 960, 540, HI) + R(0, 0, 960, 150, "url(#dotInk)", extra=' opacity=".18"') + f'<circle cx="120" cy="300" r="64" fill="#F2EEE6" stroke="{INK}" stroke-width="3"/>'
    if kind == "night":
        return R(0, 0, 960, 540, DEEP) + R(0, 0, 960, 540, "url(#dotPaper)", extra=' opacity=".12"') + f'<circle cx="760" cy="120" r="62" fill="url(#dotPaper)" stroke="{PAP}" stroke-width="2"/>'
    if kind == "dawn":
        return R(0, 0, 960, 540, "#EEEAE1") + R(0, 330, 960, 210, "url(#dotInk)", extra=' opacity=".1"') + f'<circle cx="840" cy="330" r="56" fill="#F2EEE6" stroke="{INK}" stroke-width="3"/>'
    if kind == "dusk":
        return R(0, 0, 960, 540, "#B9C0C4") + R(0, 0, 960, 200, "url(#dotInk)", extra=' opacity=".2"')
    return R(0, 0, 960, 540, PAP)
def building(x, top, w, ground, kind="win", fill=CON, night=False, shade=True):
    pat = {"win": "facadeWin", "bal": "facadeBal", "night": "facadeNight"}[("night" if night else kind)]
    out = R(x, top, w, ground - top, fill, 3) + R(x, top, w, ground - top, f"url(#{pat})")
    if shade: out += R(x + w * .62, top, w * .38, ground - top, "url(#dotInk)", extra=' opacity=".35"')
    return out
def shutters(x, y, n, w=70, h=70, tag_i=None):
    out = ""
    for i in range(n):
        out += R(x + i * (w + 8), y, w, h, "url(#slats)", 2.4)
        if tag_i is not None and i == tag_i:
            out += f'<use href="#tagM" x="{F(x + i*(w+8) + 4)}" y="{F(y + 12)}" width="{F(w-8)}" height="{F((w-8)*0.69)}"/>'
    return out
def skyline(y, col=INK, lit=True):
    d = f"M0,{y} L0,{y-60} L60,{y-60} L60,{y-110} L120,{y-110} L120,{y-70} L190,{y-70} L190,{y-140} L250,{y-140} L250,{y-90} L330,{y-90} L330,{y-120} L400,{y-120} L400,{y-60} L470,{y-60} L470,{y-150} L520,{y-150} L520,{y-80} L600,{y-80} L600,{y-130} L660,{y-130} L660,{y-70} L740,{y-70} L740,{y-100} L820,{y-100} L820,{y-60} L900,{y-60} L900,{y-120} L960,{y-120} L960,{y} Z"
    out = Pth(d, fill=col, stroke=col, sw=1)
    if lit:
        import random
        rnd = random.Random(7)
        for _ in range(60):
            xx = rnd.randint(4, 950); yy = rnd.randint(y - 140, y - 8)
            out += R(xx, yy, 5, 4, PAP, extra=' opacity=".7"')
    return out
def roof(ground, night=True, tag=True, antennas=True):
    out = R(0, ground, 960, 540 - ground, "#2E3338" if night else "#B9B2A5") + Pth(f"M0,{ground} H960", sw=4)
    out += R(0, ground - 26, 960, 26, CON, 2) + R(0, ground - 26, 960, 26, "url(#dotInk)", extra=' opacity=".3"')
    if antennas:
        for ax in (90, 300, 640):
            out += Pth(f"M{ax},{ground-26} V{ground-150} M{ax-20},{ground-130} H{ax+20} M{ax-14},{ground-112} H{ax+14}", sw=3)
        out += Pth(f"M300,{ground-140} C340,{ground-120} 380,{ground-118} 420,{ground-130}", sw=1.6)
        out += f'<use href="#obj4" x="330" y="{ground-150}" width="70" height="70"/>'
    return out
def tech_room(x, ground, w=230, h=170, tag=True):
    out = R(x, ground - h, w, h, DEEP, 3) + R(x, ground - h, w, h, "url(#dotPaper)", extra=' opacity=".18"') + R(x + w - 70, ground - 120, 48, 120, INK, 2)
    if tag:
        tw = w - 100 if w > 160 else w * 0.6
        out += f'<use href="#tagM" x="{F(x+(14 if w > 160 else w*0.08))}" y="{F(ground-h+(30 if w > 160 else h*0.12))}" width="{F(tw)}" height="{F(tw*0.69)}"/>'
    return out
def tiles_wall(top, bottom):
    return R(0, top, 960, bottom - top, "url(#tiles)") + R(0, top, 960, bottom - top, "url(#dotInk)", extra=' opacity=".08"')

PANELS = {}
def panel(n):
    def deco(fn): PANELS[n] = fn; return fn
    return deco

@panel(1)
def _():
    o = sky("sunset")
    for (x, t, w) in ((60, 210, 320), (420, 250, 300), (760, 190, 160)):
        o += building(x, t, w, 470)
    o += R(0, 470, 960, 70, "#B9B2A5") + R(380, 470, 380, 40, "#CFC9BD", 2)
    o += Pth("M390,480 H750", sw=1.4) + R(500, 476, 140, 30, "none", 2)
    for (s, x, w) in (("cp02", 300, 260), ("cp04", 560, 250), ("cp05", 720, 240), ("cp03", 860, 250)):
        o += place(s, x, 520, 46, w=w)
    o += R(-20, 0, 1000, 70, INK) + Pth("M40,70 V20 M30,30 H50 M200,70 V10 M190,22 H210 M880,70 V24", stroke=PAP, sw=3)
    o += arrow(900, 110, 900, 300, "GRU ↓", 820, 210)
    return o
@panel(2)
def _():
    o = sky("sunset") + building(0, 120, 960, 400, kind="win") + R(0, 330, 960, 70, CON, 2) + shutters(20, 336, 12, w=70, h=62, tag_i=1)
    o += R(0, 400, 960, 140, "#B9B2A5") + Pth("M0,400 H960", sw=3)
    o += R(0, 400, 960, 140, "url(#dotInk)", extra=' opacity=".12"')
    o += f'<path d="M330,520 L620,510 L640,530 L330,540 Z" fill="{INK}" opacity=".3"/>'
    for (s, x, w, fl) in (("cp02", 610, 260, False), ("cp03", 760, 250, False), ("cp04", 140, 250, False), ("cp01", 880, 250, False)):
        o += place(s, x, 500, 150, w=w, flip=fl)
    o += rig("walk", 330, 520, 230, flip=True)
    o += arrow(480, 120, 300, 120, "CARRELLO ←") + arrow(640, 470, 760, 470) + arrow(60, 470, 180, 470)
    return o
@panel(3)
def _():
    o = R(0, 0, 960, 540, "#B9B2A5") + R(0, 0, 960, 540, "url(#dotInk)", extra=' opacity=".2"') + R(0, 0, 960, 120, "#9C968A")
    o += f'<g transform="translate(520 560) scale(4.2) translate(-79 -640)"><use href="#shoeA"/></g>'
    o += R(540, 0, 340, 230, INK) + Pth("M560,180 C620,200 720,200 860,180 M570,140 C640,160 720,160 850,140", stroke=PAP, sw=3)
    o += "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{PAP}" opacity=".8"/>' for x, y, r in ((420, 470, 9), (450, 440, 6), (380, 500, 7), (930, 470, 8), (900, 430, 5)))
    return o
@panel(4)
def _():
    o = sky("dusk") + building(0, 40, 960, 330, kind="bal") + R(0, 330, 960, 210, "#CFC9BD") + Pth("M0,330 H960", sw=3)
    o += Pth("M640,300 H960 M660,300 V250 M720,300 V250 M780,300 V250 M840,300 V250 M900,300 V250 M640,250 H960", sw=2)
    for (s, x, w) in (("cp07", 120, 240), ("cp11", 800, 270)):
        o += place(s, x, 360, 120, w=w, filt="softBlur")
    o += place("figA2", 480, 690, 560)
    o += arrow(480, 120, 480, 40, "CARRELLO INDIETRO", 480, 106)
    return o
@panel(5)
def _():
    o = R(0, 0, 960, 540, "#CFC9BD") + R(0, 0, 960, 540, "url(#dotInk)", extra=' opacity=".08"')
    o += Pth("M300,120 L760,90 L820,330 L360,370 Z", fill="#B9B2A5", sw=2) + Pth("M560,105 L590,350", sw=1.4) + f'<ellipse cx="575" cy="228" rx="40" ry="26" fill="none" stroke="{INK}" stroke-width="1.4"/>'
    o += f'<ellipse cx="470" cy="300" rx="20" ry="13" fill="{INK}"/><circle cx="470" cy="290" r="12" fill="{INK}"/><path d="M470,300 L640,330" stroke="{INK}" stroke-width="14" opacity=".35" stroke-linecap="round"/>'
    for (x, y) in ((360, 190), (690, 160), (720, 300)):
        o += f'<circle cx="{x}" cy="{y}" r="9" fill="{GRY}" stroke="{INK}" stroke-width="2"/>'
    o += "".join(R(x, 330, 16, 210, INK, extra=' opacity=".9"') for x in range(0, 960, 70)) + R(0, 320, 960, 22, INK)
    o += f'<circle cx="80" cy="470" r="70" fill="{HI}" stroke="{INK}" stroke-width="10" opacity=".85"/>'
    o += arrow(420, 220, 560, 200, "PAN")
    return o
@panel(6)
def _():
    o = R(0, 0, 960, 540, "#9AA2A6") + building(0, 0, 960, 540, kind="win", fill=CON, shade=False) + R(0, 0, 960, 540, "#3E4852", extra=' opacity=".45"')
    o += place("figWitness2", 480, 1500, 1300, w=240)
    o += R(0, 400, 960, 18, INK) + "".join(R(x, 418, 12, 122, INK) for x in range(10, 960, 60))
    o += Pth("M70,400 C60,360 90,340 80,300 M110,400 C120,350 100,330 116,290 M840,400 C850,360 820,340 834,300", stroke=BRN, sw=4)
    o += arrow(820, 120, 760, 160, "PUSH-IN")
    return o
@panel(7)
def _():
    o = sky("dusk") + building(0, 0, 960, 340, kind="bal") + R(0, 340, 960, 200, "#CFC9BD") + Pth("M0,340 H960", sw=3)
    o += R(690, 70, 90, 50, "#3E4852", 3) + Pth("M690,100 H780 M700,100 V120 M720,100 V120 M740,100 V120 M760,100 V120", sw=2)
    o += f'<text x="735" y="60" text-anchor="middle" font-size="14" font-family="IBM Plex Mono, monospace" fill="{INK}">balcone vuoto</text>'
    o += place("figA_turn", 380, 620, 500)
    return o
@panel(8)
def _():
    o = sky("night") + skyline(380, col="#22272B") + roof(430) + tech_room(560, 430, tag=False)
    o += R(650, 300, 48, 130, HI, 2) + R(650, 300, 48, 130, "url(#dotInk)", extra=' opacity=".2"')
    o += place("figA2", 640, 440, 150)
    o += arrow(160, 470, 160, 330, "GRU ↑", 160, 470)
    return o
@panel(9)
def _():
    o = sky("night") + tech_room(0, 540, w=960, h=520) + R(0, 470, 960, 70, "#2E3338")
    o += f'<use href="#tagM" x="70" y="80" width="460" height="317"/>'
    o += place("figA_34", 700, 760, 700)
    o += f'<use href="#obj1" x="560" y="300" width="120" height="120"/>'
    return o
@panel(10)
def _():
    o = sky("night") + skyline(360, col="#22272B") + roof(440) + tech_room(300, 440, w=360, h=260)
    o += place("figMemory3", 300, 470, 230, w=240, filt="toBurgPlate")
    o += place("figA2", 760, 480, 230)
    o += Pth("M140,500 C260,540 640,540 840,500", stroke="#F2EEE6", sw=4, extra=' stroke-dasharray="14 10"') + arrow(800, 505, 860, 490, "ORBITA 30°", 700, 470)
    return o
@panel(11)
def _():
    o = R(0, 0, 960, 540, DEEP) + R(0, 0, 960, 540, "url(#dotPaper)", extra=' opacity=".1"') + R(0, 0, 420, 540, "#2E3338")
    o += f'<use href="#tagM" x="20" y="120" width="420" height="290"/>'
    o += f'<g transform="translate(620 300) rotate(-90) scale(4.6)"><use href="#r_handCan"/></g>'
    o += "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{BURG}"/>' for x, y, r in ((420, 160, 7), (380, 200, 5), (450, 230, 6), (360, 140, 4), (400, 250, 4), (340, 190, 6), (470, 190, 3)))
    o += arrow(900, 420, 820, 360, "AVVICINAMENTO")
    return o
@panel(12)
def _():
    o = f'<g transform="rotate(4 480 270)">' + sky("night") + building(-40, 60, 1040, 420, night=True) + R(-40, 360, 1040, 60, CON, 2)
    o += shutters(0, 366, 12, w=70, h=56, tag_i=1) + R(-40, 420, 1040, 160, "#3A3F44")
    for lx in (220, 700):
        o += f'<circle cx="{lx}" cy="160" r="70" fill="#F2EEE6" opacity=".25"/><circle cx="{lx}" cy="160" r="16" fill="#F2EEE6" stroke="{INK}" stroke-width="3"/>'
    o += place("figA_rear", 230, 520, 270) + "</g>"
    return o
@panel(13)
def _():
    o = R(0, 0, 960, 540, INK) + R(0, 0, 960, 540, "url(#dotPaper)", extra=' opacity=".08"')
    o += f'<use href="#handOpen" x="160" y="40" width="360" height="420" transform="scale(-1 1) translate(-680 0)"/>'
    o += f'<use href="#handOpen" x="480" y="40" width="360" height="420"/>'
    o += f'<g transform="translate(480 40) scale(3)"><g fill="none" stroke="{BURG}" stroke-linecap="round" stroke-width="12.5"><path d="M32,72 C28,60 26,50 24,40"/><path d="M45,68 C45,52 45,38 45,24"/><path d="M59,68 C59,50 59,34 59,16"/><path d="M73,68 C75,52 77,38 79,26"/></g></g>'
    return o
@panel(14)
def _():
    o = R(0, 0, 960, 540, "#3A3F44") + R(60, 40, 840, 420, "#2A2F33", 4) + R(60, 40, 840, 420, "url(#dotPaper)", extra=' opacity=".07"')
    o += Pth("M60,460 H900", sw=6) + Pth("M120,60 L300,420 M560,60 L740,420", stroke="#F2EEE6", sw=2, extra=' opacity=".25"')
    o += place("cp02nf", 120, 500, 230, w=260) + place("cp10", 850, 500, 230, w=240)
    o += place("figA2", 360, 520, 330)
    o += f'<g opacity=".55">{place("figA2", 580, 506, 300, flip=True)}</g>'
    o += f'<text x="580" y="90" text-anchor="middle" font-size="15" font-family="IBM Plex Mono, monospace" fill="#F2EEE6">riflesso · +2 fotogrammi</text>'
    return o
@panel(15)
def _():
    o = sky("night") + Pth("M0,120 L380,250 L380,330 L0,540 Z", fill="#5E6160", sw=2) + Pth("M960,120 L580,250 L580,330 L960,540 Z", fill="#5E6160", sw=2)
    o += Pth("M0,540 L380,330 L580,330 L960,540 Z", fill="#3A3F44", sw=2) + R(440, 260, 80, 70, INK, 2) + Pth("M452,276 H508 M452,290 H508 M452,304 H508", stroke=PAP, sw=2)
    for (s, x, w, h, g) in (("cp01", 160, 250, 210, 470), ("cp12", 800, 250, 210, 470), ("cp06", 300, 250, 130, 395), ("cp09", 660, 280, 140, 395), ("cp11", 90, 270, 260, 540)):
        o += place(s, x, g, h, w=w, filt="toGreyDk")
    o += rig("walk", 480, 470, 200)
    o += arrow(480, 120, 480, 220, "DOLLY ZOOM", 480, 110)
    return o
@panel(16)
def _():
    o = R(0, 0, 960, 540, PAP) + R(0, 0, 960, 540, "url(#tiles)")
    for i in range(7):
        s = 1 - i * .13; cx, cy = 480, 270; w, h = 900 * s, 500 * s
        o += Pth(f"M{F(cx-w/2)},{F(cy-h/2)} H{F(cx+w/2)} V{F(cy+h/2)} H{F(cx-w/2)} Z", fill=("#B9B2A5" if i % 2 else "#CFC9BD"), sw=3)
        for k in range(1, 6):
            o += Pth(f"M{F(cx-w/2 + k*w/12)},{F(cy+h/2)} V{F(cy+h/2 - h*.06)}", sw=1.4)
    o += place("figA_rear", 480, 330, 90)
    return o
@panel(17)
def _():
    o = tiles_wall(0, 540) + Pth("M-20,80 L980,520 L980,560 L-20,140 Z", fill="#5E6160", sw=3)
    o += "".join(Pth(f"M{x},{F(80 + (x+20)*0.44)} L{x},{F(140 + (x+20)*0.44)}", sw=1.6) for x in range(0, 960, 40))
    o += Pth("M-20,40 L980,480", sw=8) + Pth("M-20,40 L980,480", stroke=PAP, sw=2, extra=' stroke-dasharray="4 4"')
    o += rig("stand", 480, 350, 260, rotd=0)
    o += arrow(220, 230, 340, 290, "SEGUE IN DISCESA", 260, 210)
    return o
@panel(18)
def _():
    o = R(0, 0, 960, 540, PAP) + Pth("M0,0 L330,180 L630,180 L960,0 Z", fill="#CFC9BD", sw=2) + Pth("M0,540 L330,360 L630,360 L960,540 Z", fill="#B9B2A5", sw=2)
    o += Pth("M0,0 L330,180 L330,360 L0,540 Z", fill="url(#tiles)", sw=2) + Pth("M960,0 L630,180 L630,360 L960,540 Z", fill="url(#tiles)", sw=2)
    o += R(330, 180, 300, 180, DEEP, 2) + Pth("M380,220 C420,180 540,180 580,220 C600,260 560,320 480,320 C400,320 360,260 380,220 Z", fill="#2E3338", stroke=PAP, sw=2)
    o += Pth("M370,330 H590 M400,330 V300 M440,330 V300 M520,330 V300 M560,330 V300", sw=3)
    o += rig("run", 470, 500, 300)
    o += R(380, 30, 200, 10, "#8A8D8B", 2) + arrow(480, 470, 480, 410, "DOLLY ZOOM", 640, 470)
    return o
@panel(19)
def _():
    o = f'<use href="#platform" width="960" height="540"/>'
    o += place("figWitness2", 500, 300, 150, w=240)
    o += R(-10, 300, 600, 140, INK, 3) + "".join(R(20 + i * 120, 320, 80, 50, "#F2EEE6", 2, extra=' opacity=".9"') for i in range(5))
    o += R(590, 300, 400, 140, INK, 3) + R(610, 320, 80, 50, "#F2EEE6", 2)
    o += place("figA_rear", 780, 600, 330)
    o += arrow(560, 470, 280, 470, "TRENO →←", 420, 500)
    return o
@panel(20)
def _():
    o = R(0, 0, 960, 540, INK) + head("headA", 480, -330, 900)
    o += "".join(Pth(f"M{x},0 L{x-60},540", stroke="#F2EEE6", sw=1.4, extra=' opacity=".25"') for x in (120, 300, 760))
    return o
@panel(21)
def _():
    o = R(0, 0, 960, 540, "#9AA2A6") + Pth("M0,40 L960,0 L960,140 L0,160 Z", fill="#CFC9BD", sw=2) + Pth("M0,400 L960,430 L960,540 L0,540 Z", fill="#5E6160", sw=2)
    o += Pth("M520,170 L900,150 L900,330 L520,340 Z", fill="#22272B", sw=4) + Pth("M140,170 L460,180 L460,340 L140,350 Z", fill="#22272B", sw=4)
    o += Pth("M500,30 V430 M930,10 V440", sw=8) + Pth("M500,30 V430 M930,10 V440", stroke=PAP, sw=2, extra=' opacity=".6"')
    o += R(120, 340, 380, 30, BRN, 3) + R(120, 300, 380, 44, BRN, 3)
    o += f'<g opacity=".7">{place("figWitness2", 700, 360, 190, w=240)}</g>'
    o += rig("sit", 300, 470, 260)
    return o
@panel(22)
def _():
    o = R(0, 0, 960, 540, "#9AA2A6") + Pth("M500,40 L940,40 L940,500 L500,500 Z", fill="#22272B", sw=5)
    o += f'<g transform="translate(260 560) scale(1.05) translate(-120 -640)">{rig_markup("sit")}</g>'
    o += f'<g opacity=".95"><g transform="translate(760 520) scale(-.9 .9) translate(-120 -640)"><g filter="url(#toNeg)">{rig_markup(dict(POSES["sit"], head=-22))}</g></g></g>'
    return o
@panel(23)
def _():
    o = R(0, 0, 960, 540, "#9AA2A6") + Pth("M0,40 L960,0 L960,140 L0,160 Z", fill="#CFC9BD", sw=2) + Pth("M0,400 L960,430 L960,540 L0,540 Z", fill="#5E6160", sw=2)
    for i, (x0, s) in enumerate(((540, 1), (640, .7), (710, .5), (760, .35))):
        o += Pth(f"M{x0},{F(170+ (1-s)*60)} L{F(x0+ 360*s)},{F(160+(1-s)*60)} L{F(x0+360*s)},{F(160+(1-s)*60 + 180*s)} L{x0},{F(170+(1-s)*60+180*s)} Z", fill="#22272B", sw=3)
    o += place("figA2", 680, 520, 320, filt="toNeg")
    o += rig("stand", 240, 520, 330)
    o += Pth("M560,180 C600,260 580,360 620,440", stroke=PAP, sw=3, extra=' stroke-dasharray="6 6"')
    return o
@panel(24)
def _():
    o = R(0, 0, 960, 540, "#E2DDD2") + R(0, 380, 960, 160, "#B9B2A5")
    o += place("figA2", 640, 470, 330, filt="toNeg")
    o += f'<g transform="translate(860 470) matrix(1 0 -1.1 -0.22 0 0) translate(-860 -470)">{place("figA2", 640, 470, 330, filt="shadowInk")}</g>'
    o += place("figA_rear", 230, 700, 640)
    return o
@panel(25)
def _():
    o = f'<g transform="rotate(8 480 270)">' + R(-80, -80, 1120, 700, PAP)
    import random
    rnd = random.Random(3)
    for k in range(9):
        x0 = rnd.randint(-60, 860); y0 = rnd.randint(-40, 480); s = rnd.choice([.5, .7, 1.0])
        d = f"M{x0},{y0}" + "".join(f" h{F(30*s)} v{F(-22*s)}" for _ in range(6))
        o += Pth(d, sw=3)
    o += Pth("M120,420 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30", sw=5)
    o += Pth("M120,420 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30 h40 v-30 L440,420 Z", fill="#B9B2A5", stroke="none")
    o += rig("run", 260, 330, 120) + f'<g transform="translate(400 210) scale(-.2 .2) translate(-120 -640)"><g filter="url(#toNeg)">{rig_markup("walk")}</g></g>'
    o += "</g>" + R(0, 0, 960, 540, "url(#dotInk)", extra=' opacity=".12"')
    return o
@panel(26)
def _():
    o = R(0, 0, 960, 540, "#EEEAE1") + R(0, 400, 960, 140, "#CFC9BD")
    o += f'<g transform="translate(300 470) matrix(1 0 -1.0 -0.2 0 0) translate(-300 -470)">{place("figA2", 300, 470, 340, filt="shadowInk")}</g>'
    o += f'<g transform="translate(660 470) matrix(1 0 1.0 -0.2 0 0) translate(-660 -470)">{place("figA2", 660, 470, 340, filt="shadowInk")}</g>'
    o += rig("hand", 300, 470, 340) + f'<g transform="translate(660 470) scale(-.567 .567) translate(-120 -640)"><g filter="url(#toNeg)">{rig_markup("dblHand")}</g></g>'
    return o
@panel(27)
def _():
    o = R(0, 0, 960, 540, "#EEEAE1")
    o += f'<g transform="translate(60 -1140) scale(3.2)"><use href="#handA"/><path d="M14,404 L64,404 C70,418 70,434 66,446 L18,446 C12,434 12,418 14,404 Z" fill="{BURG}"/><g fill="none" stroke="{BURG}" stroke-linecap="round" stroke-width="9.5"><path d="M24,440 C22,456 22,466 25,476"/><path d="M36,442 C35,460 36,474 38,486"/><path d="M48,442 C48,460 49,474 51,484"/><path d="M60,440 C61,454 61,464 60,474"/><path d="M64,412 C74,420 77,434 71,448" stroke-width="11.5"/></g></g>'
    o += f'<g transform="translate(900 -1140) scale(-3.2 3.2)"><use href="#handA" filter="url(#toNeg)"/></g>'
    o += R(0, 0, 960, 120, "#171717") + R(0, 0, 400, 140, INK) + R(560, 0, 400, 140, "#E2DDD2", 3)
    return o
@panel(28)
def _():
    o = R(0, 0, 960, 540, "#F2EEE6")
    for i in range(8):
        s = 1 - i * .12; w, h = 480 * s, 540 * s
        lx, rx = 480 - w, 480 + w
        o += R(lx, 270 - h / 2, 70 * s, h, "url(#slats)", 2) + R(rx - 70 * s, 270 - h / 2, 70 * s, h, "url(#slats)", 2)
        o += f'<use href="#tagM" x="{F(lx)}" y="{F(270 - h*0.2)}" width="{F(70*s)}" height="{F(48*s)}"/><use href="#tagM" x="{F(rx-70*s)}" y="{F(270 - h*0.2)}" width="{F(70*s)}" height="{F(48*s)}"/>'
    o += rig("fall", 480, 380, 200, rotd=-30)
    o += arrow(480, 500, 480, 440, "CADUTA", 600, 500)
    return o
@panel(29)
def _():
    o = R(0, 0, 960, 540, INK)
    blocks = [(60, 200, 200, 260, -6), (290, 140, 180, 300, 4), (500, 220, 240, 200, -3), (770, 120, 160, 330, 7), (360, 400, 220, 90, 10)]
    for (x, y, w, h, r) in blocks:
        o += f'<g transform="rotate({r} {x+w/2} {y+h/2})">' + building(x, y, w, y + h, shade=True) + "</g>"
    o += Pth("M0,470 L120,460 L200,500 L300,470 L420,510 L520,480 L640,520 L760,470 L900,500 L960,480", stroke=BURG, sw=10)
    o += Pth("M270,0 L285,140 M480,0 L470,210 M760,0 L780,110 M470,330 L500,400", stroke=BURG, sw=6)
    return o
@panel(30)
def _():
    o = R(0, 0, 960, 540, INK) + Pth("M200,440 L760,420 L820,500 L160,520 Z", fill="#CFC9BD", sw=3) + Pth("M200,440 L160,520", stroke=BURG, sw=6)
    o += rig("kneel", 470, 470, 260)
    for (sym, x, y, w, r) in (("obj1", 160, 120, 120, -12), ("obj2", 720, 110, 110, 18), ("obj3", 80, 300, 110, 8), ("obj4", 760, 280, 120, -6), ("obj5", 420, 60, 110, 10)):
        o += f'<g transform="rotate({r} {x+w/2} {y+w/2})"><use href="#{sym}" x="{x}" y="{y}" width="{w}" height="{w}"/></g>'
    o += "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{PAP}" opacity=".6"/>' for x, y, r in ((300, 200, 3), (620, 260, 4), (540, 120, 2), (880, 420, 3), (120, 450, 2)))
    o += Pth("M0,0 L180,540", stroke=BURG, sw=8, extra=' opacity=".9"')
    return o
@panel(31)
def _():
    o = R(0, 0, 960, 540, INK) + Pth("M0,540 L960,500", stroke=BURG, sw=14) + f'<circle cx="480" cy="250" r="300" fill="{BURG}" opacity=".18"/>'
    o += head("wt2_6", 480, 20, 520)
    o += R(0, 500, 960, 40, "#5E6160", 2)
    return o
@panel(32)
def _():
    o = R(0, 0, 960, 540, PAP) + Pth("M520,0 L470,120 L540,200 L460,320 L520,420 L470,540 L960,540 L960,0 Z", fill=INK, stroke="none")
    o += Pth("M520,0 L470,120 L540,200 L460,320 L520,420 L470,540", stroke="#F2EEE6", sw=6)
    o += rig("kneel", 260, 470, 250)
    o += f'<g opacity=".8">{place("figA2", 720, 480, 280, filt="toNeg")}</g>' + "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{HI}"/>' for x, y, r in ((780, 180, 6), (820, 140, 4), (850, 220, 5), (870, 110, 3), (800, 90, 4), (900, 170, 3)))
    o += place("figMemory3", 400, 480, 220, w=240, filt="toBurgPlate")
    return o
@panel(33)
def _():
    o = R(0, 0, 960, 540, "#F2EEE6")
    import random
    rnd = random.Random(5)
    for _ in range(90):
        x, y, r = rnd.randint(0, 960), rnd.randint(0, 540), rnd.choice([1.5, 2, 3, 4])
        o += f'<circle cx="{x}" cy="{y}" r="{r}" fill="{INK}" opacity=".7"/>'
    return o
@panel(34)
def _():
    o = sky("dawn") + skyline(400, col="#5E6160", lit=False) + roof(430, night=False) + tech_room(40, 430, w=200, h=150)
    o += f'<g transform="translate(520 404) scale(.42) translate(-120 -640)">{rig_markup("sit")}</g>'
    return o
@panel(35)
def _():
    o = sky("dawn") + R(0, 380, 960, 160, CON) + f'<g transform="translate(480 1090) scale(1.6) translate(-130 -640)"><use href="#figA_rearBody" width="260" height="660" filter="url(#toInk)"/></g>'
    o += head("headA_open", 480, 40, 300)
    o += f'<g transform="translate(330 300) scale(1.3) translate(-40 -404)"><use href="#handA"/><use href="#stainA"/></g>'
    o += arrow(480, 40, 480, 130, "CAPPUCCIO GIÙ", 650, 70)
    return o
@panel(36)
def _():
    return sky("dawn") + R(0, 420, 960, 120, CON) + head("headA_open", 480, -60, 600)
@panel(37)
def _():
    o = sky("dawn")
    for (x, t, w) in ((40, 250, 300), (380, 280, 280), (700, 230, 220)):
        o += building(x, t, w, 500, shade=False) + R(x + w * .0, t, w * .35, 500 - t, "url(#dotInk)", extra=' opacity=".3"')
    o += R(0, 500, 960, 40, "#B9B2A5") + R(60, 220, 260, 30, CON, 2) + tech_room(120, 222, w=90, h=50)
    o += f'<g transform="translate(250 220) scale(.12) translate(-120 -640)">{rig_markup("sit")}</g>'
    o += arrow(780, 160, 860, 80, "GRU ↑ INDIETRO", 760, 60)
    return o
@panel(38)
def _():
    return (R(0, 0, 960, 540, PAP) + f'<text x="480" y="300" text-anchor="middle" font-size="150" font-weight="900" font-family="Big Shoulders Display, Impact, sans-serif" fill="{INK}">GUILTY</text>'
            + f'<text x="480" y="350" text-anchor="middle" font-size="24" font-family="IBM Plex Mono, monospace" fill="{INK}" letter-spacing="6">NOYZ NARCOS</text>'
            + f'<use href="#tagM" x="420" y="380" width="120" height="83"/>')

def render(n):
    body = PANELS[n]()
    return f'<svg viewBox="0 0 960 540" role="img" aria-label="Shot {n}">{body}{letterbox()}</svg>'
