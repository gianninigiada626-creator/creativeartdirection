"""
The storyboard page of BASSA FEDELTÀ, laid out like the insert of a cassette: the acts are the sides of the
tape (Lato A, Lato B, and the hidden track at the end), the panels its tracks, each with its time and length.
The animatic plays at the top when it exists, with its chapters and the files to take away.

    python3 page.py            → out/web/index.html, out/web/img/*.jpg
"""
import html
import json
import os

import cv2
import numpy as np

from shots import ACTS, RUNTIME, SHOTS

HERE = os.path.dirname(os.path.abspath(__file__))
BOARD = os.path.join(HERE, '..', 'out', 'board')
WEB = os.path.join(HERE, '..', 'out', 'web')

SIDES = {'96': ('Lato A', '1996'), '99': ('Lato B', '1999'), 'oggi': ('Traccia nascosta', 'Oggi')}


def tc(sec):
    return f'{int(sec // 60)}:{int(sec % 60):02d}'


def dur(sec):
    return f'{int(sec // 60)}′{int(sec % 60):02d}″'


def esc(t):
    return html.escape(t, quote=True)


def mb(path):
    return f'{os.path.getsize(path) / 1e6:.1f} MB'.replace('.', ',')


def web_images():
    os.makedirs(os.path.join(WEB, 'img'), exist_ok=True)
    for s in SHOTS:
        im = cv2.imread(os.path.join(BOARD, f'{s["id"]}.jpg'))
        im = cv2.resize(im, (1200, 900), interpolation=cv2.INTER_AREA)
        cv2.imwrite(os.path.join(WEB, 'img', f'{s["id"]}.jpg'), im, [cv2.IMWRITE_JPEG_QUALITY, 82, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])


def color_script(width=2400, height=120):
    """Each panel a band as wide as its duration: a slice of its middle. The film's light, in one strip."""
    strip = np.zeros((height, width, 3), np.uint8)
    x = 0.0
    for s in SHOTS:
        w = s['dur'] / RUNTIME * width
        x0, x1 = int(round(x)), int(round(x + w))
        im = cv2.imread(os.path.join(BOARD, f'{s["id"]}.jpg'))
        h, iw = im.shape[:2]
        cw = int(h * max(x1 - x0, 1) / height)
        a = max(0, min(iw - cw, iw // 2 - cw // 2))
        band = cv2.resize(im[:, a:a + cw], (max(x1 - x0, 1), height), interpolation=cv2.INTER_AREA)
        strip[:, x0:x1] = band[:, :x1 - x0]
        x += w
    cv2.imwrite(os.path.join(WEB, 'img', 'colorscript.jpg'), strip, [cv2.IMWRITE_JPEG_QUALITY, 84])


def panel_html(s, start):
    lines = []
    for line in s['lines']:
        who, it, en = line[:3]
        cls = 'line vo' if who == 'VO' else 'line'
        label = 'voce narrante' if who == 'VO' else who.lower()
        lines.append(f'<div class="{cls}"><span class="who">{esc(label)}</span><p class="it">{esc(it)}</p><p class="en">{esc(en)}</p></div>')
    if not s['lines']:
        lines.append('<div class="line none"><span class="who">senza parole</span></div>')
    return f'''
<article class="panel" id="t{s["id"]}">
  <figure><img src="img/{s["id"]}.jpg" alt="Tavola {s["id"]}: {esc(s["action"][:120])}" loading="lazy" width="1200" height="900"></figure>
  <div class="cap">
    <div class="num"><span class="n">{s["id"]}</span><span class="t">{tc(start)}</span><span class="d">{dur(s["dur"])}</span></div>
    <div class="body">
      <p class="tech">{esc(s["slug"])} · {esc(s["shot"])}</p>
      <p class="action">{esc(s["action"])}</p>
      {"".join(lines)}
      <p class="sound"><span>suono</span> {esc(s["sound"])}</p>
    </div>
  </div>
</article>'''


def build():
    web_images()
    color_script()
    starts, t = {}, 0
    for s in SHOTS:
        starts[s['id']] = t
        t += s['dur']
    links, x = [], 0.0
    for s in SHOTS:
        w = s['dur'] / RUNTIME * 100
        links.append(f'<a href="#t{s["id"]}" style="left:{x:.3f}%;width:{w:.3f}%" title="{s["id"]} · {tc(starts[s["id"]])}"><span>{s["id"]}</span></a>')
        x += w
    marks, x = [], 0.0
    for key, *_ in ACTS:
        d = sum(s['dur'] for s in SHOTS if s['act'] == key)
        marks.append(f'<span style="left:{x:.3f}%;width:{d / RUNTIME * 100:.3f}%">{esc(SIDES[key][0])}</span>')
        x += d / RUNTIME * 100
    sections = []
    for key, num, name, tint, light in ACTS:
        shots = [s for s in SHOTS if s['act'] == key]
        d = sum(s['dur'] for s in shots)
        side, year = SIDES[key]
        sections.append(f'''
<section class="act" id="lato-{key}">
  <header class="act-head">
    <p class="side">{esc(side)}</p>
    <h2>{esc(year)}</h2>
    <p class="act-meta">{len(shots)} tavole · {dur(d)} · luce: {esc(light)}</p>
  </header>
  <div class="grid">{"".join(panel_html(s, starts[s["id"]]) for s in shots)}</div>
</section>''')
    # the animatic and the files, when they exist
    vdir = os.path.join(WEB, 'video')
    chapters, t = [], 0
    for i, (key, num, name, *_) in enumerate(ACTS):
        d = sum(s['dur'] for s in SHOTS if s['act'] == key)
        src = f'video/capitolo-{i + 1}.mp4'
        if os.path.exists(os.path.join(WEB, src)):
            chapters.append(dict(src=src, file=f'bassa-fedelta-{i + 1}-{key}.mp4', side=SIDES[key][0], name=SIDES[key][1], start=tc(t), dur=tc(d)))
        t += d
    player = downloads = ''
    if len(chapters) == len(ACTS):
        btns = ''.join(f'<button type="button" class="ch" data-i="{i}"><span class="ch-side">{esc(c["side"])}</span><span class="ch-name">{esc(c["name"])}</span><span class="ch-t">{c["start"]} · {c["dur"]}</span></button>' for i, c in enumerate(chapters))
        player = PLAYER.replace('%BTNS%', btns).replace('%SRCS%', json.dumps([c['src'] for c in chapters]))
        fdir = os.path.join(WEB, 'film')
        pieces = sorted((f for f in os.listdir(fdir) if f.startswith('pezzo-')), key=lambda f: int(f[6:-4])) if os.path.isdir(fdir) else []
        if pieces:
            size = sum(os.path.getsize(os.path.join(fdir, f)) for f in pieces)
            ch = ''.join(f'<a class="dl" href="{c["src"]}" download="{c["file"]}"><b>{esc(c["side"])} · {esc(c["name"])}</b><small>{c["start"]} · {c["dur"]} · {mb(os.path.join(WEB, c["src"]))}</small></a>' for c in chapters)
            whole = dict(file='bassa-fedelta-animatic.mp4', pieces=[f'film/{f}' for f in pieces])
            downloads = DOWNLOADS.replace('%CH%', ch).replace('%WHOLE%', json.dumps(whole)).replace('%RUNTIME%', tc(RUNTIME)).replace('%SIZE%', f'{size / 1e6:.0f} MB')
    page = TEMPLATE.replace('%PLAYER%', player + downloads).replace('%LINKS%', ''.join(links)).replace('%MARKS%', ''.join(marks)) \
        .replace('%SECTIONS%', ''.join(sections)).replace('%RUNTIME%', dur(RUNTIME)).replace('%N%', str(len(SHOTS)))
    with open(os.path.join(WEB, 'index.html'), 'w') as fh:
        fh.write(page)


TEMPLATE = r'''<title>Bassa Fedeltà</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:ital,wght@0,400;0,500;0,600;1,400&family=Permanent+Marker&family=Space+Mono:wght@400;700&display=swap">
<style>
/* Layout: the insert of a cassette opened flat. A loud title on the spine, the film's colour as a strip of
   tape, then the tracklist: the acts are the sides of the tape, the panels its tracks, two across. */
:root {
  --bg: #ece4d4;
  --card: #e2d8c4;
  --ink: #1e1530;
  --muted: #625775;
  --rule: #cbbfa8;
  --hot: #c42b1f;
  --mark: #e9c12a;
  --mark-ink: #1e1530;
  --display: "Anton", "Arial Narrow", Impact, sans-serif;
  --body: "Archivo", "Helvetica Neue", Arial, sans-serif;
  --hand: "Permanent Marker", "Comic Sans MS", cursive;
  --mono: "Space Mono", ui-monospace, Menlo, monospace;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #150f20; --card: #1f182e; --ink: #efe7d8; --muted: #a497b8; --rule: #362b4c; --hot: #ec4a39; --mark: #e9c12a; --mark-ink: #150f20;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #150f20; --card: #1f182e; --ink: #efe7d8; --muted: #a497b8; --rule: #362b4c; --hot: #ec4a39; --mark: #e9c12a; --mark-ink: #150f20;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body {
  background: var(--bg); color: var(--ink);
  font: 400 15.5px/1.55 var(--body);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));
  padding-block: 0 72px;
}
a { color: inherit; }
a:focus-visible, button:focus-visible { outline: 2px solid var(--hot); outline-offset: 3px; }
.wrap { max-width: 1380px; margin: 0 auto; }

/* ── title ── */
.title { padding-block: clamp(32px, 6vw, 72px) 28px; display: grid; gap: 28px 40px; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); align-items: end; }
.eyebrow { margin: 0 0 14px; font: 700 11.5px/1.3 var(--mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.title h1 { margin: 0; font: 400 clamp(64px, 11vw, 168px)/0.86 var(--display); letter-spacing: 0.005em; text-transform: uppercase; text-wrap: balance; }
.title h1 em { font-style: normal; color: var(--hot); }
.tagline { margin: 18px 0 0; font: 400 clamp(20px, 2.2vw, 28px)/1.2 var(--hand); color: var(--ink); max-width: 26ch; transform: rotate(-1.2deg); transform-origin: left; }
.tagline mark { background: var(--mark); color: var(--mark-ink); padding: 0 0.2em; }
.hero { margin: 0; display: grid; gap: 10px; }
.hero img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 3; max-width: 100%; box-shadow: 0 1px 0 var(--rule); }
.hero figcaption { font: 400 12px/1.4 var(--mono); color: var(--muted); }
.logline { margin: 0; max-width: 60ch; font-size: 17px; line-height: 1.5; text-wrap: pretty; }
.facts { display: flex; flex-wrap: wrap; gap: 6px 22px; margin: 16px 0 0; padding: 0; list-style: none; font: 700 11.5px/1.4 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.facts b { color: var(--ink); font-weight: 700; }

/* ── the strip of tape ── */
.script { margin-block: 26px 10px; }
.script-head { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; font: 700 11px/1 var(--mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
.strip { position: relative; aspect-ratio: 20 / 1; max-width: 100%; background: center / 100% 100% no-repeat url("img/colorscript.jpg"); border-radius: 2px; }
.strip a { position: absolute; top: 0; bottom: 0; border-right: 1px solid rgba(0, 0, 0, 0.25); text-decoration: none; }
.strip a span { position: absolute; left: 0; right: 0; top: calc(100% + 6px); text-align: center; font: 400 10px/1 var(--mono); color: var(--muted); }
.strip a:hover, .strip a:focus-visible { box-shadow: inset 0 0 0 2px var(--mark); }
.sides { position: relative; height: 24px; margin-top: 24px; border-top: 1px solid var(--rule); }
.sides span { position: absolute; top: 6px; font: 700 10.5px/1 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); padding-left: 4px; border-left: 1px solid var(--rule); height: 16px; white-space: nowrap; overflow: hidden; }

/* ── notes ── */
.notes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; padding-block: 34px; border-block: 1px solid var(--rule); margin-top: 26px; }
.notes h3 { margin: 0 0 8px; font: 400 15px/1.1 var(--hand); color: var(--hot); }
.notes p { margin: 0; max-width: 46ch; text-wrap: pretty; }

/* ── the sides and their tracks ── */
.act { padding-top: 60px; }
.act-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: baseline; gap: 18px; padding-bottom: 16px; border-bottom: 3px solid var(--ink); margin-bottom: 30px; }
.side { margin: 0; font: 400 17px/1 var(--hand); color: var(--hot); transform: rotate(-2deg); }
.act-head h2 { margin: 0; font: 400 clamp(40px, 5vw, 64px)/0.95 var(--display); text-transform: uppercase; }
.act-meta { margin: 0; font: 400 12px/1.3 var(--mono); color: var(--muted); text-align: right; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 56px 40px; }
.panel { min-width: 0; display: grid; gap: 14px; align-content: start; }
.panel figure { margin: 0; }
.panel img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 3; max-width: 100%; }
.cap { display: grid; grid-template-columns: 4.4em minmax(0, 1fr); gap: 16px; }
.num { display: grid; gap: 4px; align-content: start; font: 400 12px/1 var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }
.num .n { font: 400 40px/0.9 var(--display); color: var(--ink); }
.body { min-width: 0; display: grid; gap: 10px; }
.tech { margin: 0; font: 700 11px/1.45 var(--mono); letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.action { margin: 0; max-width: 64ch; text-wrap: pretty; }
.line { display: grid; gap: 2px; padding-left: 14px; border-left: 3px solid var(--rule); }
.line .who { font: 700 10.5px/1.4 var(--mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.line .it { margin: 0; font: 600 18px/1.35 var(--body); text-wrap: pretty; }
.line.vo .it { font-style: italic; font-weight: 500; }
.line.vo { border-left-color: var(--mark); }
.line .en { margin: 0; font: italic 400 14.5px/1.4 var(--body); color: var(--muted); }
.line.none { border-left-style: dashed; }
.sound { margin: 0; font-size: 13.5px; color: var(--muted); }
.sound span { font: 700 10.5px/1 var(--mono); letter-spacing: 0.12em; text-transform: uppercase; margin-right: 6px; }

/* ── animatic and files ── */
.animatic { margin-top: 30px; display: grid; grid-template-columns: minmax(0, 1fr) 15rem; gap: 18px 28px; }
.label { margin: 0 0 8px; font: 700 11px/1 var(--mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.screen { background: #0d0a14; aspect-ratio: 4 / 3; width: 100%; max-width: 100%; }
.screen video { display: block; width: 100%; height: 100%; }
.chapters { display: grid; gap: 6px; align-content: start; }
.ch { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2px; text-align: left; background: transparent; color: var(--ink); border: 0; border-top: 1px solid var(--rule); padding: 10px 2px; cursor: pointer; font: inherit; }
.ch:hover { background: var(--card); }
.ch-side { font: 400 14px/1.1 var(--hand); color: var(--muted); }
.ch-name { font: 400 26px/1 var(--display); text-transform: uppercase; }
.ch-t { font: 400 11px/1.3 var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }
.ch[aria-current="true"] .ch-name { color: var(--hot); }
.ch[aria-current="true"] { border-top: 3px solid var(--hot); }
.animatic .hint { grid-column: 1 / -1; margin: 0; font-size: 13.5px; color: var(--muted); max-width: 80ch; }
html:not([data-dl]) .dl-only { display: none !important; }
.downloads { margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--rule); display: grid; grid-template-columns: 15rem minmax(0, 1fr); gap: 18px 28px; }
.dl-intro p { margin: 0; font-size: 13.5px; color: var(--muted); max-width: 34ch; }
.dl-groups { display: grid; gap: 18px; min-width: 0; }
.dl-row { display: flex; flex-wrap: wrap; gap: 8px; }
.dl { display: inline-grid; gap: 3px; padding: 9px 12px 8px; border: 1px solid var(--rule); border-radius: 2px; background: transparent; color: var(--ink); text-decoration: none; text-align: left; font: inherit; cursor: pointer; }
.dl b { font: 400 20px/1.05 var(--display); text-transform: uppercase; font-weight: 400; }
.dl small { font: 400 10.5px/1.3 var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }
.dl:hover { background: var(--card); border-color: var(--muted); }
.dl.whole { border: 2px solid var(--ink); }
.dl[data-state="busy"] { border-color: var(--hot); cursor: progress; }
.dl[data-state="busy"] small { color: var(--hot); }
.dl-note { margin: 0; min-height: 1.4em; font: 400 12px/1.4 var(--mono); color: var(--muted); }
footer { margin-top: 72px; padding-top: 22px; border-top: 1px solid var(--rule); font: 400 12px/1.6 var(--mono); color: var(--muted); display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }

@media (max-width: 1000px) {
  .grid { grid-template-columns: minmax(0, 1fr); }
  .title, .notes, .animatic, .downloads { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .cap { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .num { grid-auto-flow: column; justify-content: start; gap: 12px; align-items: baseline; }
  .act-head { grid-template-columns: minmax(0, 1fr); gap: 6px; }
  .act-meta { text-align: left; }
  .strip a span { display: none; }
  .strip { aspect-ratio: 9 / 1; }
  .sides span { font-size: 9px; }
  .dl { flex: 1 1 100%; }
}
@media (prefers-reduced-motion: no-preference) {
  .strip a, .dl, .ch { transition: background-color 120ms ease, box-shadow 120ms ease; }
}
</style>

<div class="wrap">
  <header class="title">
    <div>
      <p class="eyebrow">Cortometraggio d'animazione · storyboard</p>
      <h1>Bassa fedel<em>tà</em></h1>
      <p class="tagline">Ci dicevano che era roba bassa. <mark>Noi ci siamo cresciuti dentro.</mark></p>
    </div>
    <div>
      <figure class="hero">
        <img src="img/02.jpg" alt="Il salotto: Saimon, Bebo e Tyson sul divano rosso guardano verso di noi." width="1200" height="900">
        <figcaption>Tavola 02 · il salotto, 1996. La camera è il televisore.</figcaption>
      </figure>
    </div>
  </header>
  <p class="logline">Due ragazzi di periferia e un dobermann vestito come loro, un salotto con la console sopra una scatola di cartone, una cassetta copiata così tante volte che fruscia più di quanto suoni. Vent'anni dopo quel salotto è appeso in una galleria. Un elogio della cultura bassa: quella che si poteva toccare.</p>
  <ul class="facts">
    <li>storyboard · <b>%N% tavole</b></li>
    <li>durata · <b>%RUNTIME%</b></li>
    <li>formato · <b>4 : 3</b></li>
    <li>lingua · <b>italiano, sott. inglesi</b></li>
  </ul>

  <section class="script" aria-label="Colour script">
    <div class="script-head"><span>Il nastro: ogni banda dura quanto la sua tavola</span><span>0:00 — %RUNTIME%</span></div>
    <div class="strip">%LINKS%</div>
    <div class="sides">%MARKS%</div>
  </section>

  %PLAYER%

  <section class="notes">
    <div>
      <h3>Il motivo</h3>
      <p>La cassetta di Rocco, copia di una copia di una copia. Si riavvolge con la Bic nella prima tavola e suona nell'ultima, vent'anni dopo, nello stereo di una macchina ferma al porto.</p>
    </div>
    <div>
      <h3>La pittura</h3>
      <p>Spessa, a spatola, graffiata. Ombre viola, contorni neri tirati a mano, righe bianche, rosse e gialle trascinate nel colore fresco. Le stanze sono piene: la cultura bassa è fatta di oggetti.</p>
    </div>
    <div>
      <h3>Il muro</h3>
      <p>All'inizio la cultura alta sta appesa al muro del salotto: i fiori della nonna, in cornice. Alla fine è il salotto a stare appeso, in una galleria. Stessa cornice, il mondo rovesciato.</p>
    </div>
  </section>

  %SECTIONS%

  <footer><span>BASSA FEDELTÀ · storyboard · tavole dipinte su scene 3D</span><span>un elogio della cultura bassa</span></footer>
</div>
'''

PLAYER = r'''<section class="animatic" aria-label="Animatic">
    <div>
      <p class="label">Animatic · 8 dipinti al secondo · suono provvisorio</p>
      <div class="screen"><video id="anim" controls playsinline preload="metadata" poster="img/01.jpg"></video></div>
    </div>
    <div class="chapters"><p class="label">Capitoli</p>%BTNS%</div>
    <p class="hint">I capitoli si susseguono da soli. Le battute sono nei sottotitoli; la base è provvisoria, la musica è tua.</p>
  </section>
  <script>
  (() => {
    const srcs = %SRCS%;
    const v = document.getElementById('anim');
    const btns = [...document.querySelectorAll('.ch')];
    let cur = 0;
    const go = (i, play) => {
      cur = i;
      v.src = srcs[i];
      btns.forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
      if (play) v.play().catch(() => {});
    };
    btns.forEach((b, i) => b.addEventListener('click', () => go(i, true)));
    v.addEventListener('ended', () => { if (cur + 1 < srcs.length) go(cur + 1, true); });
    go(0, false);
  })();
  </script>'''

DOWNLOADS = r'''<section class="downloads dl-only" id="scarica" aria-labelledby="dl-h">
    <div class="dl-intro">
      <p class="label" id="dl-h">Scarica</p>
      <p>960×720, con sottotitoli e suono provvisorio. Il film intero è un unico file mp4.</p>
    </div>
    <div class="dl-groups">
      <div>
        <p class="label">Tutto intero</p>
        <div class="dl-row">
          <button type="button" class="dl whole" id="dl-whole"><b>Bassa fedeltà · il film intero</b><small>%RUNTIME% · mp4 · %SIZE%</small></button>
        </div>
      </div>
      <div>
        <p class="label">Un lato alla volta</p>
        <div class="dl-row">%CH%</div>
      </div>
      <p class="dl-note" id="dl-note" role="status" aria-live="polite"></p>
    </div>
  </section>
  <script>
  (() => {
    const WHOLE = %WHOLE%;
    const note = document.getElementById('dl-note');
    const say = (t) => { note.textContent = t; };
    const framed = window.top !== window;
    let cap = null;
    const ready = (c) => {
      cap = c;
      if (c) document.documentElement.dataset.dl = 'cap';
      else if (!framed) document.documentElement.dataset.dl = 'link';
    };
    if (window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then(ready, () => ready(null));
    else ready(null);
    const MSG = {
      declined: 'Download annullato.',
      rate_limited: 'C\'è già una richiesta di download aperta: confermala o chiudila, poi riprova.',
      too_large: 'File troppo grande per questo dispositivo: scarica un lato alla volta.',
    };
    async function give(name, blob) {
      if (!cap) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 60000);
        return true;
      }
      try { await cap.save({ filename: name, data: blob }); return true; }
      catch (e) {
        const code = e && e.code;
        say(MSG[code] || 'Il download non è disponibile qui.');
        if (!MSG[code]) document.documentElement.removeAttribute('data-dl');
        return false;
      }
    }
    const busy = (el, on, text) => {
      const sm = el.querySelector('small');
      if (on) { el.dataset.state = 'busy'; if (sm) { sm.dataset.was = sm.dataset.was || sm.textContent; sm.textContent = text; } }
      else { delete el.dataset.state; if (sm && sm.dataset.was) sm.textContent = sm.dataset.was; }
    };
    const get = async (src) => { const r = await fetch(src); if (!r.ok) throw new Error(r.status); return r.blob(); };
    document.addEventListener('click', async (ev) => {
      const el = ev.target.closest('.dl');
      if (!el) return;
      const whole = el.id === 'dl-whole';
      if (!whole && !cap) return;
      ev.preventDefault();
      if (el.dataset.state === 'busy') return;
      say('');
      try {
        let name, blob;
        if (whole) {
          // the film travels in pieces; joined back in order they are the original file, byte for byte
          const parts = [];
          for (const src of WHOLE.pieces) {
            busy(el, true, `scarico ${Math.round(parts.length / WHOLE.pieces.length * 100)}%…`);
            parts.push(await get(src));
          }
          name = WHOLE.file;
          blob = new Blob(parts, { type: 'video/mp4' });
        } else {
          busy(el, true, 'preparo…');
          name = el.getAttribute('download');
          blob = await get(el.getAttribute('href'));
        }
        busy(el, true, 'pronto');
        if (await give(name, blob)) say(`${name}: fatto.`);
      } catch (e) {
        say('Non sono riuscito a preparare il file: riprova.');
      } finally {
        busy(el, false);
      }
    });
  })();
  </script>'''

if __name__ == '__main__':
    build()
    print('ok', os.path.join(WEB, 'index.html'))
