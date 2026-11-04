"""Generates the City People library (12 archetypes) and small animation strips as SVG <symbol>s.
Flat concrete-grey figures, thin uniform ink line, ~7.4 heads, realistic proportions (contrast with PRT).
Ground at y=640, 3.284 units per cm (same scale as the PRT plates)."""
INK, GREY, DARK, PAPER, BURG = "#171717", "#8A8D8B", "#6E716F", "#E8E4DB", "#8C1748"
U = 3.284
LW = 1.6

def f(v):
    return f"{v:.1f}"

class Fig:
    def __init__(self, w, height_cm, cx=None):
        self.w = w; self.H = height_cm * U; self.cx = cx if cx is not None else w / 2
        self.top = 640 - self.H; self.hh = self.H / 7.4
        self.back, self.body, self.front, self.face = [], [], [], []
    # anatomy landmarks
    def y(self, heads):
        return self.top + heads * self.hh
    def path(self, d, fill=GREY, layer="body", sw=LW, extra=""):
        getattr(self, layer).append(f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"{extra}/>')
    def line(self, d, layer="front", sw=LW, col=INK, extra=""):
        getattr(self, layer).append(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-linecap="round"{extra}/>')
    def ell(self, cx, cy, rx, ry, fill=GREY, layer="body", sw=LW):
        getattr(self, layer).append(f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}" stroke="{INK}" stroke-width="{sw}"/>')
    def head(self, dx=0, tilt=0, hair=None, face=True):
        cx, hh = self.cx + dx, self.hh
        cy = self.top + hh / 2
        self.ell(cx, cy, hh * 0.39, hh * 0.5)
        if hair == "bun":
            self.ell(cx, self.top + hh * 0.05, hh * 0.22, hh * 0.18, fill=DARK)
            self.path(f"M{f(cx-hh*.39)},{f(cy-hh*.05)} C{f(cx-hh*.4)},{f(cy-hh*.55)} {f(cx+hh*.4)},{f(cy-hh*.55)} {f(cx+hh*.39)},{f(cy-hh*.05)} C{f(cx+hh*.2)},{f(cy-hh*.25)} {f(cx-hh*.2)},{f(cy-hh*.25)} {f(cx-hh*.39)},{f(cy-hh*.05)} Z", fill=DARK)
        elif hair == "long":
            self.path(f"M{f(cx-hh*.42)},{f(cy+hh*.55)} C{f(cx-hh*.5)},{f(cy-hh*.6)} {f(cx+hh*.5)},{f(cy-hh*.6)} {f(cx+hh*.42)},{f(cy+hh*.55)} L{f(cx+hh*.3)},{f(cy+hh*.5)} C{f(cx+hh*.3)},{f(cy-hh*.1)} {f(cx-hh*.3)},{f(cy-hh*.1)} {f(cx-hh*.3)},{f(cy+hh*.5)} Z", fill=DARK)
        elif hair == "short":
            self.path(f"M{f(cx-hh*.39)},{f(cy-hh*.02)} C{f(cx-hh*.42)},{f(cy-hh*.62)} {f(cx+hh*.42)},{f(cy-hh*.62)} {f(cx+hh*.39)},{f(cy-hh*.02)} C{f(cx+hh*.25)},{f(cy-hh*.3)} {f(cx-hh*.25)},{f(cy-hh*.3)} {f(cx-hh*.39)},{f(cy-hh*.02)} Z", fill=DARK)
        if face:
            self.face.append(f'<circle cx="{f(cx-hh*.14)}" cy="{f(cy+hh*.02)}" r="1.3" fill="{INK}"/><circle cx="{f(cx+hh*.14)}" cy="{f(cy+hh*.02)}" r="1.3" fill="{INK}"/>')
            self.face.append(f'<path d="M{f(cx)},{f(cy+hh*.08)} L{f(cx-hh*.03)},{f(cy+hh*.2)} M{f(cx-hh*.1)},{f(cy+hh*.3)} L{f(cx+hh*.1)},{f(cy+hh*.3)}" fill="none" stroke="{INK}" stroke-width="1.1" stroke-linecap="round"/>')
        return cx, cy
    def cap(self, dx=0, kind="cap"):
        cx, hh = self.cx + dx, self.hh; cy = self.top + hh / 2
        if kind == "cap":       # baseball cap, brim forward
            self.path(f"M{f(cx-hh*.4)},{f(cy-hh*.12)} C{f(cx-hh*.42)},{f(cy-hh*.62)} {f(cx+hh*.42)},{f(cy-hh*.62)} {f(cx+hh*.4)},{f(cy-hh*.12)} Z", fill=DARK)
            self.path(f"M{f(cx-hh*.46)},{f(cy-hh*.12)} L{f(cx+hh*.46)},{f(cy-hh*.12)} L{f(cx+hh*.4)},{f(cy-hh*.02)} L{f(cx-hh*.4)},{f(cy-hh*.02)} Z", fill=DARK)
        elif kind == "flat":    # flat cap
            self.path(f"M{f(cx-hh*.42)},{f(cy-hh*.1)} C{f(cx-hh*.42)},{f(cy-hh*.6)} {f(cx+hh*.42)},{f(cy-hh*.6)} {f(cx+hh*.44)},{f(cy-hh*.18)} L{f(cx+hh*.55)},{f(cy-hh*.08)} C{f(cx+hh*.2)},{f(cy-hh*.02)} {f(cx-hh*.2)},{f(cy-hh*.02)} {f(cx-hh*.42)},{f(cy-hh*.1)} Z", fill=DARK)
        elif kind == "helmet":  # rider helmet
            self.path(f"M{f(cx-hh*.46)},{f(cy+hh*.02)} C{f(cx-hh*.5)},{f(cy-hh*.72)} {f(cx+hh*.5)},{f(cy-hh*.72)} {f(cx+hh*.46)},{f(cy+hh*.02)} L{f(cx+hh*.3)},{f(cy-hh*.08)} L{f(cx-hh*.3)},{f(cy-hh*.08)} Z", fill=DARK)
        elif kind == "peak":    # ticket inspector peaked cap
            self.path(f"M{f(cx-hh*.44)},{f(cy-hh*.2)} L{f(cx-hh*.38)},{f(cy-hh*.6)} L{f(cx+hh*.38)},{f(cy-hh*.6)} L{f(cx+hh*.44)},{f(cy-hh*.2)} Z", fill=DARK)
            self.path(f"M{f(cx-hh*.46)},{f(cy-hh*.2)} L{f(cx+hh*.46)},{f(cy-hh*.2)} L{f(cx+hh*.3)},{f(cy-hh*.06)} L{f(cx-hh*.3)},{f(cy-hh*.06)} Z", fill=INK)
        elif kind == "scarf":   # headscarf
            self.path(f"M{f(cx-hh*.44)},{f(cy+hh*.3)} C{f(cx-hh*.5)},{f(cy-hh*.66)} {f(cx+hh*.5)},{f(cy-hh*.66)} {f(cx+hh*.44)},{f(cy+hh*.3)} L{f(cx+hh*.32)},{f(cy+hh*.12)} C{f(cx+hh*.3)},{f(cy-hh*.3)} {f(cx-hh*.3)},{f(cy-hh*.3)} {f(cx-hh*.32)},{f(cy+hh*.12)} Z", fill=DARK)
    def torso(self, sw, hw, top_h=1.15, hip_h=3.3, fill=GREY, hem_h=None, flare=0):
        cx = self.cx; y0, y1 = self.y(top_h), self.y(hip_h if hem_h is None else hem_h)
        self.path(f"M{f(cx-sw*self.hh/2+6)},{f(y0)} C{f(cx-sw*self.hh/2)},{f(y0+2)} {f(cx-sw*self.hh/2-2)},{f(y0+10)} {f(cx-sw*self.hh/2)},{f(y0+20)} "
                  f"L{f(cx-hw*self.hh/2-flare)},{f(y1)} L{f(cx+hw*self.hh/2+flare)},{f(y1)} L{f(cx+sw*self.hh/2)},{f(y0+20)} "
                  f"C{f(cx+sw*self.hh/2+2)},{f(y0+10)} {f(cx+sw*self.hh/2)},{f(y0+2)} {f(cx+sw*self.hh/2-6)},{f(y0)} Z", fill=fill)
        self.path(f"M{f(cx-self.hh*.12)},{f(self.y(0.95))} L{f(cx-self.hh*.12)},{f(y0+2)} L{f(cx+self.hh*.12)},{f(y0+2)} L{f(cx+self.hh*.12)},{f(self.y(0.95))} Z", fill=GREY, layer="back")
    def arm(self, side, sw, end=None, wid=0.36, layer="body"):
        """side -1 left / +1 right of the image. end = (x, y) of the hand, default hanging."""
        hh, cx = self.hh, self.cx
        sx, sy = cx + side * (sw * hh / 2 - 3), self.y(1.32)
        ex, ey = end if end else (sx + side * 4, self.y(3.45))
        w = wid * hh / 2
        import math
        ang = math.atan2(ey - sy, ex - sx); nx, ny = -math.sin(ang) * w, math.cos(ang) * w
        self.path(f"M{f(sx+nx)},{f(sy+ny)} L{f(ex+nx)},{f(ey+ny)} L{f(ex-nx)},{f(ey-ny)} L{f(sx-nx)},{f(sy-ny)} Z", layer=layer)
        self.ell(ex + (ex - sx) * 0.04, ey + (ey - sy) * 0.04, hh * .17, hh * .2, fill=GREY, layer=layer)
        return ex, ey
    def legs(self, gap=0.08, wid=0.5, hip_h=3.3, foot=True, fill=GREY, skirt_to=None):
        hh, cx = self.hh, self.cx
        y0 = self.y(hip_h) - 4
        for s in (-1, 1):
            x0 = cx + s * (gap * hh + wid * hh / 2)
            self.path(f"M{f(x0-wid*hh/2)},{f(y0)} L{f(x0+wid*hh/2)},{f(y0)} L{f(x0+wid*hh/2-1)},{f(632)} L{f(x0-wid*hh/2+1)},{f(632)} Z", fill=fill, layer="back")
            if foot:
                self.ell(x0 + s * 3, 635, wid * hh * 0.62, 5.5, fill=DARK, layer="back")
    def svg(self, sid, face=True, extra_back="", extra_front=""):
        parts = self.back + [extra_back] + self.body + self.front + (self.face if face else []) + [extra_front]
        return f'<symbol id="{sid}" viewBox="0 0 {f(self.w)} 660">' + "".join(parts) + "</symbol>"

def P(d, fill=GREY, sw=LW):
    return f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"/>'

out = []
labels = []

# 01 writer with backpack and cans
g = Fig(150, 172)
g.path(f"M{f(g.cx-g.hh*1.0)},{f(g.y(1.25))} L{f(g.cx+g.hh*1.0)},{f(g.y(1.25))} L{f(g.cx+g.hh*.92)},{f(g.y(2.9))} L{f(g.cx-g.hh*.92)},{f(g.y(2.9))} Z", fill=DARK, layer="back")
g.legs(wid=.6); g.torso(1.75, 1.5, hip_h=3.4)
g.line(f"M{f(g.cx-g.hh*.5)},{f(g.y(1.2))} L{f(g.cx-g.hh*.55)},{f(g.y(2.6))} M{f(g.cx+g.hh*.5)},{f(g.y(1.2))} L{f(g.cx+g.hh*.55)},{f(g.y(2.6))}", sw=2.4)
g.arm(-1, 1.75); ex, ey = g.arm(1, 1.75, end=(g.cx + g.hh * 1.1, g.y(3.1)))
g.front.append(P(f"M{f(ex-4)},{f(ey-6)} L{f(ex+5)},{f(ey-6)} L{f(ex+5)},{f(ey+22)} L{f(ex-4)},{f(ey+22)} Z", fill="#777A79"))
g.front.append(P(f"M{f(ex-3)},{f(ey-10)} L{f(ex+4)},{f(ey-10)} L{f(ex+4)},{f(ey-6)} L{f(ex-3)},{f(ey-6)} Z", fill=INK))
g.head(); g.cap()
out.append(g.svg("cp01")); labels.append(("cp01", 150, "Writer con zaino e bombolette"))

# 02 elderly woman with shopping trolley
def signora(sid, face=True):
    g = Fig(170, 155, cx=70)
    g.legs(wid=.45, gap=.06)
    g.torso(1.75, 2.2, hip_h=3.2, hem_h=5.0, fill=GREY, flare=4)
    g.line(f"M{f(g.cx)},{f(g.y(1.3))} L{f(g.cx)},{f(g.y(4.9))}", sw=1.2)
    g.arm(-1, 1.75)
    ex, ey = g.arm(1, 1.75, end=(g.cx + g.hh * 1.45, g.y(3.3)))
    tx = ex + 10
    trolley = (P(f"M{f(tx-2)},{f(ey-6)} L{f(tx+18)},{f(ey-6)}", fill="none", sw=2.4) +
               P(f"M{f(tx+16)},{f(ey-6)} L{f(tx+16)},{f(600)}", fill="none", sw=2.4) +
               P(f"M{f(tx-6)},{f(ey+30)} L{f(tx+24)},{f(ey+30)} L{f(tx+22)},{f(606)} L{f(tx-4)},{f(606)} Z", fill="#66594E") +
               f'<circle cx="{f(tx+2)}" cy="630" r="9" fill="{INK}"/><circle cx="{f(tx+20)}" cy="630" r="9" fill="{INK}"/>')
    g.head(hair="bun", face=face); g.cap(kind="scarf")
    return g.svg(sid, face=face, extra_front=trolley)
out.append(signora("cp02")); labels.append(("cp02", 170, "Signora col carrello"))
out.append(signora("cp02nf", face=False))

# 03 commuter in windbreaker, bag across body, headphones
g = Fig(140, 178)
g.legs(wid=.52); g.torso(1.8, 1.45, hip_h=3.45, hem_h=3.6)
g.line(f"M{f(g.cx-g.hh*.75)},{f(g.y(1.25))} L{f(g.cx+g.hh*.7)},{f(g.y(3.2))}", sw=2.4)
g.front.append(P(f"M{f(g.cx+g.hh*.55)},{f(g.y(3.0))} L{f(g.cx+g.hh*1.05)},{f(g.y(3.0))} L{f(g.cx+g.hh*1.05)},{f(g.y(3.7))} L{f(g.cx+g.hh*.55)},{f(g.y(3.7))} Z", fill=DARK))
g.arm(-1, 1.8); g.arm(1, 1.8, layer="back")
cx, cy = g.head(hair="short")
g.front.append(f'<path d="M{f(cx-g.hh*.42)},{f(cy)} C{f(cx-g.hh*.46)},{f(cy-g.hh*.75)} {f(cx+g.hh*.46)},{f(cy-g.hh*.75)} {f(cx+g.hh*.42)},{f(cy)}" fill="none" stroke="{INK}" stroke-width="2.6"/>'
               f'<rect x="{f(cx-g.hh*.5)}" y="{f(cy-6)}" width="7" height="13" rx="3" fill="{INK}"/><rect x="{f(cx+g.hh*.5-7)}" y="{f(cy-6)}" width="7" height="13" rx="3" fill="{INK}"/>')
out.append(g.svg("cp03")); labels.append(("cp03", 140, "Pendolare in giacca a vento"))

# 04 kid on a scooter
g = Fig(150, 132, cx=62)
g.legs(wid=.55, foot=True); g.torso(1.7, 1.5, hip_h=3.3)
ex, ey = g.arm(1, 1.7, end=(g.cx + g.hh * 1.5, g.y(2.7)))
g.arm(-1, 1.7)
g.back.append(P(f"M{f(g.cx-g.hh*1.1)},626 L{f(g.cx+g.hh*1.7)},626 L{f(g.cx+g.hh*1.7)},632 L{f(g.cx-g.hh*1.1)},632 Z", fill=INK) +
              f'<circle cx="{f(g.cx-g.hh*1.0)}" cy="636" r="5" fill="{INK}"/><circle cx="{f(g.cx+g.hh*1.62)}" cy="636" r="5" fill="{INK}"/>')
g.front.append(P(f"M{f(g.cx+g.hh*1.62)},628 L{f(ex+4)},{f(ey-4)}", fill="none", sw=3) + P(f"M{f(ex-8)},{f(ey-4)} L{f(ex+14)},{f(ey-4)}", fill="none", sw=3))
g.head(hair="short"); g.cap()
out.append(g.svg("cp04")); labels.append(("cp04", 150, "Ragazzino sul monopattino"))

# 05 café owner pulling down a shutter with a hook pole
g = Fig(140, 175)
g.legs(wid=.5); g.torso(1.75, 1.5, hip_h=3.4)
g.path(f"M{f(g.cx-g.hh*.55)},{f(g.y(2.0))} L{f(g.cx+g.hh*.55)},{f(g.y(2.0))} L{f(g.cx+g.hh*.6)},{f(g.y(4.6))} L{f(g.cx-g.hh*.6)},{f(g.y(4.6))} Z", fill=PAPER, layer="front")
g.arm(-1, 1.75)
ex, ey = g.arm(1, 1.75, end=(g.cx + g.hh * .9, g.y(0.4)))
g.front.append(P(f"M{f(ex)},{f(ey+10)} L{f(ex+6)},{f(g.top-60)}", fill="none", sw=2.4) + P(f"M{f(ex+6)},{f(g.top-60)} C{f(ex+14)},{f(g.top-62)} {f(ex+14)},{f(g.top-52)} {f(ex+8)},{f(g.top-50)}", fill="none", sw=2.4))
g.head(hair="short")
out.append(g.svg("cp05")); labels.append(("cp05", 140, "Barista che abbassa la serranda"))

# 06 delivery rider with thermal cube backpack and helmet
g = Fig(150, 176)
g.back.append(P(f"M{f(g.cx-g.hh*1.15)},{f(g.y(0.7))} L{f(g.cx+g.hh*1.15)},{f(g.y(0.7))} L{f(g.cx+g.hh*1.15)},{f(g.y(3.0))} L{f(g.cx-g.hh*1.15)},{f(g.y(3.0))} Z", fill="#66594E"))
g.legs(wid=.52); g.torso(1.8, 1.45, hip_h=3.4)
g.arm(-1, 1.8); g.arm(1, 1.8)
g.head(); g.cap(kind="helmet")
out.append(g.svg("cp06")); labels.append(("cp06", 150, "Rider con lo zaino termico"))

# 07 old man on a bench (seated)
g = Fig(170, 170, cx=82)
seat = 520
g.top = seat - g.hh * 3.25
g.back.append(P(f"M10,{seat-60} L160,{seat-60} L160,{seat-48} L10,{seat-48} Z", fill="#66594E") + P(f"M10,{seat} L160,{seat} L160,{seat+12} L10,{seat+12} Z", fill="#66594E") +
              P(f"M22,{seat+12} L30,{seat+12} L30,640 L22,640 Z", fill=INK) + P(f"M140,{seat+12} L148,{seat+12} L148,640 L140,640 Z", fill=INK))
g.torso(1.8, 1.6, hip_h=3.25)
for s in (-1, 1):
    x0 = g.cx + s * g.hh * .38
    g.path(f"M{f(x0-g.hh*.3)},{seat} L{f(x0+g.hh*.3)},{seat} L{f(x0+g.hh*.28)},632 L{f(x0-g.hh*.28)},632 Z")
    g.ell(x0 + s * 3, 635, g.hh * .32, 5.5, fill=DARK)
    g.path(f"M{f(x0-g.hh*.36)},{seat-8} L{f(x0+g.hh*.36)},{seat-8} L{f(x0+g.hh*.34)},{seat+16} L{f(x0-g.hh*.34)},{seat+16} Z")
g.arm(-1, 1.8, end=(g.cx - g.hh * .2, seat - 14)); g.arm(1, 1.8, end=(g.cx + g.hh * .2, seat - 14))
g.front.append(P(f"M{f(g.cx)},{seat-20} L{f(g.cx+4)},638", fill="none", sw=3))
g.head(); g.cap(kind="flat")
out.append(g.svg("cp07")); labels.append(("cp07", 170, "Anziano sulla panchina"))

# 08 two girls sitting on a low wall
def girl(cx, hair, legsdx=0):
    g = Fig(220, 162, cx=cx)
    seat = 548
    g.top = seat - g.hh * 3.25
    g.torso(1.55, 1.5, hip_h=3.25)
    for s in (-1, 1):
        x0 = g.cx + s * g.hh * .34 + legsdx
        g.path(f"M{f(x0-g.hh*.26)},{seat-6} L{f(x0+g.hh*.26)},{seat-6} L{f(x0+g.hh*.24)},{seat+70} L{f(x0-g.hh*.24)},{seat+70} Z")
        g.ell(x0 + s * 2, seat + 74, g.hh * .28, 5, fill=DARK)
    g.arm(-1, 1.55, end=(g.cx - g.hh * .85, seat - 4)); g.arm(1, 1.55, end=(g.cx + g.hh * .85, seat - 4))
    g.head(hair=hair)
    return g
wall = P("M0,548 L220,548 L220,640 L0,640 Z", fill="#777A79") + '<path d="M0,560 H220 M0,588 H220 M0,616 H220 M40,548 V560 M110,548 V560 M180,548 V560 M75,560 V588 M145,560 V588 M40,588 V616 M110,588 V616 M180,588 V616" stroke="#171717" stroke-opacity=".35" stroke-width="1"/>'
g1, g2 = girl(68, "long"), girl(152, "bun")
out.append('<symbol id="cp08" viewBox="0 0 220 660">' + wall + "".join(g1.back + g1.body + g1.front + g1.face + g2.back + g2.body + g2.front + g2.face) + "</symbol>")
labels.append(("cp08", 220, "Due ragazze sul muretto"))

# 09 construction worker holding a helmet
g = Fig(140, 180)
g.legs(wid=.56); g.torso(1.9, 1.55, hip_h=3.4, hem_h=3.5)
g.line(f"M{f(g.cx-g.hh*.9)},{f(g.y(2.4))} L{f(g.cx+g.hh*.9)},{f(g.y(2.4))}", sw=4, col=PAPER)
g.arm(-1, 1.9); ex, ey = g.arm(1, 1.9)
g.front.append(P(f"M{f(ex-16)},{f(ey+14)} C{f(ex-16)},{f(ey-12)} {f(ex+16)},{f(ey-12)} {f(ex+16)},{f(ey+14)} Z", fill=PAPER) + P(f"M{f(ex-20)},{f(ey+14)} L{f(ex+20)},{f(ey+14)}", fill="none", sw=2.4))
g.head(hair="short")
out.append(g.svg("cp09")); labels.append(("cp09", 140, "Operaio col casco in mano"))

# 10 young man smoking on a balcony, leaning on the railing
g = Fig(160, 175)
g.top += 18
g.legs(wid=.5); g.torso(1.75, 1.5, hip_h=3.4)
g.arm(-1, 1.75, end=(g.cx - g.hh * .55, 470)); ex, ey = g.arm(1, 1.75, end=(g.cx + g.hh * .6, 468))
cx, cy = g.head(dx=0, hair="short")
rail = (P("M0,474 L160,474 L160,482 L0,482 Z", fill=INK) + "".join(P(f"M{x},482 L{x+4},482 L{x+4},640 L{x},640 Z", fill=INK) for x in range(8, 160, 18)) +
        P("M0,630 L160,630 L160,640 L0,640 Z", fill="#777A79"))
smoke = f'<path d="M{f(ex+4)},{f(ey-8)} C{f(ex+16)},{f(ey-30)} {f(ex-2)},{f(ey-48)} {f(ex+12)},{f(ey-70)} C{f(ex+22)},{f(ey-86)} {f(ex+8)},{f(ey-100)} {f(ex+18)},{f(ey-116)}" fill="none" stroke="{PAPER}" stroke-width="3" stroke-linecap="round" opacity=".9"/>'
out.append(g.svg("cp10", extra_front=rail + smoke)); labels.append(("cp10", 160, "Ragazzo che fuma sul balcone"))

# 11 woman hanging laundry
g = Fig(190, 165, cx=70)
lineY = g.y(-0.3)
g.legs(wid=.45, gap=.06); g.torso(1.6, 1.9, hip_h=3.2, hem_h=4.9, flare=3)
g.arm(-1, 1.6, end=(g.cx - g.hh * .5, lineY + 6)); g.arm(1, 1.6, end=(g.cx + g.hh * .7, lineY + 6))
g.head(hair="bun")
laundry = (f'<path d="M0,{f(lineY)} L190,{f(lineY+4)}" stroke="{INK}" stroke-width="1.4"/>' +
           P(f"M{f(g.cx+g.hh*.55)},{f(lineY+1)} L182,{f(lineY+4)} L180,{f(lineY+150)} L{f(g.cx+g.hh*.6)},{f(lineY+142)} Z", fill=PAPER) +
           f'<path d="M{f(g.cx+g.hh*.9)},{f(lineY-3)} v8 M150,{f(lineY-2)} v8" stroke="{INK}" stroke-width="2.4"/>')
out.append(g.svg("cp11", extra_front=laundry)); labels.append(("cp11", 190, "Donna che stende i panni"))

# 12 metro ticket inspector
g = Fig(140, 182)
g.legs(wid=.52, fill=DARK); g.torso(1.85, 1.5, hip_h=3.4, hem_h=3.55, fill=DARK)
g.line(f"M{f(g.cx-g.hh*.92)},{f(g.y(2.2))} L{f(g.cx+g.hh*.92)},{f(g.y(2.2))}", sw=3, col=PAPER)
g.arm(-1, 1.85)
ex, ey = g.arm(1, 1.85, end=(g.cx + g.hh * .55, g.y(2.6)))
g.front.append(P(f"M{f(ex-12)},{f(ey-16)} L{f(ex+10)},{f(ey-16)} L{f(ex+10)},{f(ey+12)} L{f(ex-12)},{f(ey+12)} Z", fill=INK) + f'<rect x="{f(ex-9)}" y="{f(ey-13)}" width="16" height="12" fill="{PAPER}"/>')
g.head(); g.cap(kind="peak")
out.append(g.svg("cp12")); labels.append(("cp12", 140, "Controllore della metro"))

# ── Witness head-turn: 6 drawings, from looking away (profile-ish) to facing the protagonist ──
import math
for i, ang in enumerate([-75, -58, -42, -27, -13, 0]):
    a = math.radians(ang); cx, cy = 80, 104
    dx = 17 * math.sin(a)
    near = 8.5; far = max(2.0, 8.5 * math.cos(a) ** 1.4)
    body = (f'<ellipse cx="80" cy="104" rx="21" ry="30" fill="#777A79"/>'
            f'<path d="M72,128 L88,128 L88,150 L72,150 Z" fill="#777A79"/>'
            f'<path d="M48,150 C52,140 108,140 112,150 L112,160 L48,160 Z" fill="#777A79"/>')
    ear = f'<ellipse cx="{f(80 + 21 * math.cos(a) * 0.95)}" cy="108" rx="{f(4.5 * abs(math.sin(a)) + 1)}" ry="7" fill="#6E716F"/>' if ang < -5 else ""
    capx = dx * 0.7
    capd = f"M{f(56+capx)},84 C{f(56+capx)},66 {f(104+capx)},64 {f(106+capx)},80 L{f(118+dx*1.1)},88 C{f(100+capx)},94 {f(66+capx)},94 {f(50+capx)},90 Z"
    lx, rx_ = cx - 9.5 * math.cos(a) + dx, cx + 9.5 * math.cos(a) + dx
    glasses = (f'<ellipse cx="{f(lx)}" cy="106" rx="{f(far)}" ry="8.5" fill="#E8E4DB" stroke="#171717" stroke-width="2.2"/>'
               f'<ellipse cx="{f(rx_)}" cy="106" rx="{f(near if ang > -60 else near*0.92)}" ry="8.5" fill="#E8E4DB" stroke="#171717" stroke-width="2.2"/>'
               f'<path d="M{f(lx+far)},106 L{f(rx_-near)},106" stroke="#171717" stroke-width="2"/>')
    out.append(f'<symbol id="wt{i+1}" viewBox="40 58 84 104">{body}{ear}<path d="{capd}" fill="#5E6160"/>{glasses}</symbol>')

open(__import__("sys").argv[1], "w").write("\n".join(out))
import json
json.dump(labels, open(__import__("sys").argv[2], "w"))
print(len(out), "symbols")
