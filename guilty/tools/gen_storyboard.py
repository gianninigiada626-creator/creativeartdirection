"""Builds the Phase 3 page body: music timeline, re-aligned chapters, the friend's tag, 38 storyboard cards."""
import json, sys, html
sys.path.insert(0, sys.argv[1])
from sb_shots import SECTIONS, CHAPTERS, SHOTS
import sb_panels

ana = json.load(open(sys.argv[2]))
bt = ana["bar_times"]; END = 204.92; FILE_END = 209.04
def bar_t(b):  # 1-based bar start
    if b <= 1: return 0.0
    if b - 1 < len(bt): return bt[b - 1]
    return END
def tc(t):
    fr = round(t * 24); m, rem = divmod(fr, 24 * 60); s, f = divmod(rem, 24)
    return f"{m:02d}:{s:02d}:{f:02d}"
def esc(s): return html.escape(s, quote=False)

for s in SHOTS:
    s["t0"] = s.get("t0", bar_t(s.get("b0", 1)))
    s["t1"] = s.get("t1", bar_t(s.get("b1", 69)))
    s["dur"] = s["t1"] - s["t0"]
chap = {c[0]: c for c in CHAPTERS}

DEFS5 = '''<svg class="defs defs5" width="0" height="0" aria-hidden="true" focusable="false"><defs>
<filter id="softBlur"><feGaussianBlur stdDeviation="1.4"/></filter>
<pattern id="facadeWin" width="44" height="40" patternUnits="userSpaceOnUse"><rect width="44" height="40" fill="#777A79"/><rect x="9" y="8" width="26" height="22" fill="#3E4852" stroke="#171717" stroke-width="1.4"/><path d="M9,11 H35 M9,14 H35 M9,17 H35" stroke="#171717" stroke-width=".8"/></pattern>
<pattern id="facadeNight" width="88" height="40" patternUnits="userSpaceOnUse"><rect width="88" height="40" fill="#4C4F4E"/><rect x="9" y="8" width="26" height="22" fill="#E8E4DB" stroke="#171717" stroke-width="1.4" opacity=".85"/><rect x="53" y="8" width="26" height="22" fill="#22272B" stroke="#171717" stroke-width="1.4"/></pattern>
<pattern id="facadeBal" width="66" height="44" patternUnits="userSpaceOnUse"><rect width="66" height="44" fill="#777A79"/><rect x="10" y="6" width="22" height="30" fill="#3E4852" stroke="#171717" stroke-width="1.4"/><path d="M4,24 H62 M4,36 H62 M10,24 V36 M20,24 V36 M30,24 V36 M40,24 V36 M50,24 V36 M60,24 V36" stroke="#171717" stroke-width="1.4"/><rect x="40" y="10" width="12" height="12" fill="#E8E4DB" stroke="#171717" stroke-width=".8"/></pattern>
<symbol id="tagM" viewBox="0 0 130 90" overflow="visible">
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <g stroke="#171717" stroke-width="9" opacity=".35"><path d="M10,62 C8,30 22,14 30,24 C36,32 26,48 18,56 L44,22 L40,62"/><path d="M50,60 C48,36 60,26 66,34 C70,40 62,50 54,52 C66,52 72,58 70,66"/><path d="M78,26 L80,62 C86,48 96,44 98,56"/><path d="M104,30 C120,24 122,44 108,48 C120,50 124,62 110,66"/><path d="M6,78 C40,72 84,74 120,68 M112,62 L122,68 L112,76"/></g>
    <g stroke="#8C1748" stroke-width="6"><path d="M10,62 C8,30 22,14 30,24 C36,32 26,48 18,56 L44,22 L40,62"/><path d="M50,60 C48,36 60,26 66,34 C70,40 62,50 54,52 C66,52 72,58 70,66"/><path d="M78,26 L80,62 C86,48 96,44 98,56"/><path d="M104,30 C120,24 122,44 108,48 C120,50 124,62 110,66"/><path d="M6,78 C40,72 84,74 120,68 M112,62 L122,68 L112,76"/></g>
  </g>
  <g fill="#8C1748"><circle cx="34" cy="10" r="3.2"/><circle cx="96" cy="14" r="2.6"/><circle cx="60" cy="16" r="1.8"/></g>
</symbol>
</defs></svg>
'''

# ── timeline chart (measured energy per bar) ──
bars = ana["bars"]
rms = [b["rms"] for b in bars]; mx = max(rms)
W, X0, X1 = 1000, 40, 990
def X(t): return X0 + (X1 - X0) * t / FILE_END
tl = [f'<svg viewBox="0 0 {W} 336" id="tl-svg" role="img" aria-label="Struttura del brano: sezioni, energia per battuta, capitoli e shot">']
tl.append('<text x="40" y="14" font-size="12" class="note">Energia RMS per battuta (misurata sul file)</text>')
for i, b in enumerate(bars):
    t0 = b["t"]; t1 = bars[i + 1]["t"] if i + 1 < len(bars) else 201.6
    h = 58 * rms[i] / mx
    tl.append(f'<rect x="{X(t0):.1f}" y="{112 - h:.1f}" width="{max(1, X(t1) - X(t0) - 1.2):.1f}" height="{h:.1f}" fill="#777A79"/>')
tl.append(f'<line x1="{X0}" y1="112" x2="{X1}" y2="112" stroke="#171717" stroke-width="1.4"/>')
sec_cols = {"Intro": "#CFC9BD", "Strofa 1": "#B9B2A5", "Ritornello 1": "#171717", "Strofa 2": "#B9B2A5", "Ritornello 2": "#171717", "Chiusura": "#CFC9BD"}
for name, b0, b1 in SECTIONS:
    t0, t1 = bar_t(b0), (bar_t(b1 + 1) if name != "Chiusura" else END)
    dark = sec_cols[name] == "#171717"
    tl.append(f'<rect x="{X(t0):.1f}" y="122" width="{X(t1) - X(t0) - 2:.1f}" height="32" fill="{sec_cols[name]}" stroke="#171717" stroke-width="1.4"/>')
    short = name.replace('Ritornello', 'Rit.')
    tl.append(f'<text x="{X(t0) + 5:.1f}" y="143" font-size="12" font-weight="500" fill="{"#E8E4DB" if dark else "#171717"}">{short} · {b1 - b0 + 1}</text>')
tl.append(f'<rect x="{X(END):.1f}" y="122" width="{X(FILE_END) - X(END):.1f}" height="32" fill="none" stroke="#171717" stroke-width="1" stroke-dasharray="3 3"/>')
for cid, name, b0, b1, g, env in CHAPTERS:
    t0, t1 = bar_t(b0), (bar_t(b1 + 1) if cid != "E" else END)
    col = "#8C1748" if cid == "C" else "#171717"
    tl.append(f'<rect x="{X(t0):.1f}" y="164" width="{X(t1) - X(t0) - 2:.1f}" height="26" fill="none" stroke="{col}" stroke-width="2"/>')
    tl.append(f'<text x="{X(t0) + 5:.1f}" y="182" font-size="12" font-weight="500" fill="{col}">{cid}</text>')
    tl.append(f'<rect x="{X(t0):.1f}" y="{246 - g * .4:.1f}" width="{X(t1) - X(t0) - 2:.1f}" height="{g * .4:.1f}" fill="{col}" opacity=".85"/>')
    tl.append(f'<text x="{X(t0) + 4:.1f}" y="{241 - g * .4:.1f}" font-size="10.5">{g}</text>')
tl.append('<text x="0" y="182" font-size="10.5" class="note">cap.</text><text x="0" y="236" font-size="10.5" class="note">colpa</text><text x="0" y="143" font-size="10.5" class="note">sez.</text>')
for s in SHOTS:
    x0, x1 = X(s["t0"]), X(s["t1"])
    tl.append(f'<a href="#s{s["n"]:02d}"><rect x="{x0:.1f}" y="256" width="{max(2, x1 - x0 - 1.5):.1f}" height="22" fill="#E8E4DB" stroke="#171717" stroke-width="1.2"/>'
              f'<text x="{(x0 + x1) / 2:.1f}" y="271" font-size="9.5" text-anchor="middle">{s["n"]}</text></a>')
tl.append('<text x="0" y="271" font-size="10.5" class="note">shot</text>')
for t, lab in ((0, "0:00"), (11.59, "0:11"), (83.08, "1:23"), (106.72, "1:46"), (154.20, "2:34"), (177.86, "2:57"), (204.92, "3:24")):
    tl.append(f'<line x1="{X(t):.1f}" y1="116" x2="{X(t):.1f}" y2="292" stroke="#171717" stroke-width=".6" opacity=".35"/><text x="{X(t):.1f}" y="306" font-size="10.5" text-anchor="{"end" if t > 200 else "middle"}">{lab}</text>')
for t, lab, y in ((154.20, "basso interrotto", 30), (186.78, "batteria più leggera", 44)):
    tl.append(f'<path d="M{X(t):.1f},{y - 4} V112" stroke="#8C1748" stroke-width="1.6"/><text x="{X(t) - 4:.1f}" y="{y}" font-size="10.5" text-anchor="end" fill="#8C1748">{lab}</text>')
tl.append('<text x="40" y="328" font-size="10.5" class="note">80,7 BPM · battuta 2,97 s · 68 battute · musica fino a 3:24,92, poi 4,1 s di silenzio</text></svg>')

# ── chapter table ──
rows = []
for cid, name, b0, b1, g, env in CHAPTERS:
    t0, t1 = bar_t(b0), (bar_t(b1 + 1) if cid != "E" else END)
    sec = next(n for n, a, b in SECTIONS if a <= b0 <= b)
    shots = [s["n"] for s in SHOTS if s["ch"] == cid]
    rows.append(f'<tr><td>{esc(name)}</td><td>{sec}</td><td class="m">{b0}–{b1}</td><td class="m">{tc(t0)} → {tc(t1)}</td><td class="m">{g}</td><td>{env}</td><td class="m">{shots[0]}–{shots[-1]}</td></tr>')

# ── storyboard cards ──
cards = []
for cid, name, b0, b1, g, env in CHAPTERS:
    cards.append(f'<h3 class="chap" id="ch-{cid}"><span>{cid}</span>{esc(name)}<em>Colpa {g}</em></h3>')
    for s in [x for x in SHOTS if x["ch"] == cid]:
        bars_lab = f'batt. {s["b0"]}–{s["b1"] - 1}' if "b0" in s and "b1" in s and s["b1"] <= 68 else ("batt. 67–68 + coda" if s["n"] == 37 else "silenzio finale")
        tech_rows = [("Inquadratura", s["size"]), ("Angolo", s["angle"]), ("Lente", s["lens"]), ("Camera", s["cam"]), ("Soggetto", s["subj"]), ("Ambiente", s["envm"]),
                     ("Luce", s["light"]), ("Palette", s["pal"]), ("2D / 3D", s["tech"]), ("VFX", s["vfx"]), ("Compositing", s["comp"]), ("Transizione", s["trans"])]
        tech = "".join(f"<div><dt>{k}</dt><dd>{esc(v)}</dd></div>" for k, v in tech_rows)
        cards.append(f'''<article class="shot" id="s{s["n"]:02d}">
  <div class="sh-head"><span class="sh-n">{s["n"]:02d}</span><span class="sh-tc">{tc(s["t0"])} → {tc(s["t1"])}</span><span class="sh-d">{s["dur"]:.2f} s · {round(s["dur"]*24)} fotogrammi</span><span class="sh-b">{bars_lab}</span><span class="sh-sz">{esc(s["size"])}</span></div>
  <div class="sh-body">
    <figure class="panel">{sb_panels.render(s["n"])}</figure>
    <div class="sh-text">
      <p class="sh-purpose">{esc(s["purpose"])}</p>
      <dl class="kv sh-story"><dt>Cosa si vede</dt><dd>{esc(s["visual"])}</dd><dt>Azione</dt><dd>{esc(s["action"])}</dd><dt>Musica</dt><dd>{esc(s["sync"])}</dd><dt>Keyframe</dt><dd>{esc(s["key"])}</dd><dt>Continuità</dt><dd>{esc(s["cont"])}</dd></dl>
    </div>
  </div>
  <dl class="sh-tech">{tech}</dl>
</article>''')

open(sys.argv[3], "w").write(DEFS5)
out = {"timeline": "".join(tl), "chapters": "".join(rows), "cards": "\n".join(cards), "n": len(SHOTS),
       "total": FILE_END, "avg": sum(s["dur"] for s in SHOTS[:-1]) / (len(SHOTS) - 1)}
json.dump(out, open(sys.argv[4], "w"))
print(len(SHOTS), "shots; avg", round(out["avg"], 2), "s")
