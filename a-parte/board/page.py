"""
Build the storyboard page: every panel with its number, time, framing, lens, camera height, action,
lines (Italian, English beneath) and sound; a colour script of the whole film across the top.

    python3 page.py            → out/web/index.html, out/web/img/*.jpg, out/web/img/colorscript.jpg
"""
import html
import json
import math
import os

import cv2
import numpy as np

from shots import ACTS, RUNTIME, SHOTS

HERE = os.path.dirname(os.path.abspath(__file__))
BOARD = os.path.join(HERE, '..', 'out', 'board')
PASSES = os.path.join(HERE, '..', 'build', 'passes')
WEB = os.path.join(HERE, '..', 'out', 'web')

MOVES = {'hold': 'fissa', 'push': 'lento carrello avanti', 'pull': 'lento carrello indietro', 'tilt': 'panoramica verticale', 'pan': 'panoramica'}


def tc(sec):
    return f'{int(sec // 60)}:{int(sec % 60):02d}'


def lens(meta):
    """Full-frame equivalent focal length, from the vertical field of view of a 2.39:1 frame."""
    c = meta.get('cam')
    if not c:
        return None
    half_w = math.tan(math.radians(c['fov']) / 2) * c['aspect']
    return 18 / half_w


def web_images():
    os.makedirs(os.path.join(WEB, 'img'), exist_ok=True)
    for s in SHOTS:
        im = cv2.imread(os.path.join(BOARD, f's-{s["id"]}.jpg'))
        im = cv2.resize(im, (1440, 603), interpolation=cv2.INTER_AREA)
        cv2.imwrite(os.path.join(WEB, 'img', f's-{s["id"]}.jpg'), im, [cv2.IMWRITE_JPEG_QUALITY, 82, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])


def color_script(width=2400, height=150):
    """Each shot a band as wide as its duration: the middle of its panel, squeezed. The film's light, in one strip."""
    strip = np.zeros((height, width, 3), np.uint8)
    x = 0.0
    for s in SHOTS:
        w = s['dur'] / RUNTIME * width
        x0, x1 = int(round(x)), int(round(x + w))
        im = cv2.imread(os.path.join(BOARD, f's-{s["id"]}.jpg'))
        h, iw = im.shape[:2]
        # a slice of the panel around its own centre of interest: where he is, if he is there
        crop_w = int(h * max(x1 - x0, 1) / height * 2.2)
        cx = iw // 2
        red = (im[..., 2] > 170) & (im[..., 1] < 80) & (im[..., 0] < 80)
        if red.sum() > 50:
            cx = int(np.nonzero(red)[1].mean())
        a = int(np.clip(cx - crop_w // 2, 0, iw - crop_w))
        band = cv2.resize(im[:, a:a + crop_w], (max(x1 - x0, 1), height), interpolation=cv2.INTER_AREA)
        strip[:, x0:x1] = band[:, :x1 - x0]
        x += w
    cv2.imwrite(os.path.join(WEB, 'img', 'colorscript.jpg'), strip, [cv2.IMWRITE_JPEG_QUALITY, 84])


def esc(t):
    return html.escape(t, quote=True)


def panel_html(s, start):
    meta_p = os.path.join(PASSES, f'{s["id"]}-meta.json')
    meta = json.load(open(meta_p)) if os.path.exists(meta_p) else {}
    f = lens(meta)
    tech = [s['shot'].upper()]
    if f:
        tech.append(f'≈ {f:.0f} mm')
        tech.append(f'camera a {meta["cam"]["pos"][1]:.2f} m'.replace('.', ','))
    tech.append(MOVES[s['move'][0]])
    lines = []
    for line in s['lines']:
        who, it, en = line[:3]
        cls = 'line lui' if who == 'LUI' else ('line vo' if who == 'VO' else 'line')
        label = 'voce narrante' if who == 'VO' else who.lower()
        lines.append(f'<div class="{cls}"><span class="who">{esc(label)}</span><p class="it">{esc(it)}</p><p class="en">{esc(en)}</p></div>')
    if not s['lines']:
        lines.append('<div class="line none"><span class="who">nessuna battuta</span></div>')
    return f'''
<article class="panel" id="t{s["id"]}">
  <figure><img src="img/s-{s["id"]}.jpg" alt="Tavola {s["id"]}: {esc(s["action"][:120])}" loading="lazy" width="1440" height="603"></figure>
  <div class="cap">
    <div class="num"><span class="n">{s["id"]}</span><span class="t">{tc(start)}</span><span class="d">{s["dur"]}″</span></div>
    <div class="body">
      <p class="tech">{" · ".join(esc(t) for t in tech)}</p>
      <h3 class="slug">{esc(s["slug"])}</h3>
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
    # the colour script, with a link over each band
    links, x = [], 0.0
    for s in SHOTS:
        w = s['dur'] / RUNTIME * 100
        links.append(f'<a href="#t{s["id"]}" style="left:{x:.3f}%;width:{w:.3f}%" title="{s["id"]} · {tc(starts[s["id"]])}"><span>{s["id"]}</span></a>')
        x += w
    act_marks, x = [], 0.0
    for key, num, name, _, _ in ACTS:
        d = sum(s['dur'] for s in SHOTS if s['act'] == key)
        act_marks.append(f'<span style="left:{x:.3f}%;width:{d / RUNTIME * 100:.3f}%">{esc(num)}</span>')
        x += d / RUNTIME * 100
    roll = [s['id'] for s in SHOTS if any('Ci siamo tutti' in line[1] for line in s['lines'])]
    sections = []
    for key, num, name, tint, light in ACTS:
        shots = [s for s in SHOTS if s['act'] == key]
        d = sum(s['dur'] for s in shots)
        sections.append(f'''
<section class="act" id="{key}">
  <header class="act-head">
    <p class="act-num">{esc(num)}</p>
    <h2>{esc(name)}</h2>
    <p class="act-meta">{len(shots)} tavole · {tc(d)} · luce: {esc(light)}</p>
  </header>
  <div class="grid">{"".join(panel_html(s, starts[s["id"]]) for s in shots)}</div>
</section>''')
    chapters = []
    vdir = os.path.join(WEB, 'video')
    t = 0
    for i, (key, num, name, _, _) in enumerate(ACTS):
        d = sum(s['dur'] for s in SHOTS if s['act'] == key)
        if os.path.exists(os.path.join(vdir, f'animatic-{i + 1}.mp4')):
            chapters.append(dict(src=f'video/animatic-{i + 1}.mp4', num=num, name=name, start=tc(t), dur=tc(d)))
        t += d
    player = ''
    if len(chapters) == len(ACTS):
        btns = ''.join(f'<button type="button" class="ch" data-i="{i}" id="ch{i}"><span class="ch-num">{esc(c["num"])}</span><span class="ch-name">{esc(c["name"])}</span><span class="ch-t">{c["start"]} · {c["dur"]}</span></button>' for i, c in enumerate(chapters))
        player = PLAYER.replace('%BTNS%', btns).replace('%SRCS%', json.dumps([c['src'] for c in chapters]))
    page = TEMPLATE.replace('%PLAYER%', player).replace('%COLORSCRIPT_LINKS%', ''.join(links)).replace('%ACT_MARKS%', ''.join(act_marks)) \
        .replace('%SECTIONS%', ''.join(sections)).replace('%RUNTIME%', tc(RUNTIME)).replace('%N%', str(len(SHOTS))) \
        .replace('%ROLL%', ' · '.join(f'<a href="#t{r}">{r}</a>' for r in roll))
    with open(os.path.join(WEB, 'index.html'), 'w') as fh:
        fh.write(page)


TEMPLATE = r'''<meta charset="utf-8">
<title>A PARTE Storyboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Layout: a director's board on drawing paper. Panels two across, the caption set beside the
   panel number like a slate; a colour script of the whole film along the top. */
:root {
  --paper: #e9e7e2;
  --sheet: #f3f1ec;
  --graphite: #1f1e1c;
  --pencil: #6a6660;
  --rule: #cdc8c0;
  --red: #d42a1f;
  --display: "Cormorant Garamond", "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  --sans: "Instrument Sans", "Helvetica Neue", Arial, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #161615; --sheet: #1e1d1b; --graphite: #e7e3dc; --pencil: #9b968e; --rule: #33312e; --red: #ea3b2f;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --paper: #161615; --sheet: #1e1d1b; --graphite: #e7e3dc; --pencil: #9b968e; --rule: #33312e; --red: #ea3b2f;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body {
  background: var(--paper); color: var(--graphite);
  font: 400 15px/1.55 var(--sans);
  padding-inline: clamp(16px, 4vw, 56px); padding-block: 0 72px;
}
a { color: inherit; }
a:focus-visible { outline: 2px solid var(--red); outline-offset: 3px; }
.wrap { max-width: 1480px; margin: 0 auto; }

/* ── title ── */
.title { padding-block: clamp(40px, 8vw, 96px) 28px; display: grid; gap: 28px; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); align-items: end; border-bottom: 1px solid var(--rule); }
.title h1 { margin: 0; font: 500 clamp(56px, 9vw, 128px)/0.9 var(--display); letter-spacing: 0.16em; text-wrap: balance; }
.title h1 .dot { color: var(--red); }
.title .aside { margin: 10px 0 0; font: italic 400 clamp(20px, 2.2vw, 28px)/1 var(--display); color: var(--pencil); letter-spacing: 0.08em; }
.logline { margin: 0; font: 400 clamp(19px, 1.8vw, 24px)/1.35 var(--display); max-width: 36ch; text-wrap: pretty; }
.facts { display: flex; flex-wrap: wrap; gap: 6px 22px; margin: 18px 0 0; padding: 0; list-style: none; font: 500 11.5px/1.4 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--pencil); }
.facts b { color: var(--graphite); font-weight: 500; }

/* ── colour script ── */
.script { margin-block: 30px 10px; }
.script-head { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; font: 500 11.5px/1 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--pencil); margin-bottom: 10px; }
.strip { position: relative; aspect-ratio: 16 / 1; max-width: 100%; background: center / 100% 100% no-repeat url("img/colorscript.jpg"); border-radius: 2px; }
.strip a { position: absolute; top: 0; bottom: 0; border-right: 1px solid rgba(0, 0, 0, 0.18); text-decoration: none; }
.strip a span { position: absolute; left: 0; right: 0; top: calc(100% + 6px); text-align: center; font: 400 9.5px/1 var(--mono); color: var(--pencil); }
.strip a:hover, .strip a:focus-visible { box-shadow: inset 0 0 0 2px var(--graphite); }
.acts { position: relative; height: 22px; margin-top: 22px; border-top: 1px solid var(--rule); }
.acts span { position: absolute; top: 6px; font: 500 10.5px/1 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--pencil); padding-left: 4px; border-left: 1px solid var(--rule); height: 16px; white-space: nowrap; overflow: hidden; }

/* ── notes ── */
.notes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; padding-block: 34px; border-bottom: 1px solid var(--rule); }
.notes h4 { margin: 0 0 8px; font: 500 11.5px/1 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--pencil); }
.notes p { margin: 0; max-width: 46ch; text-wrap: pretty; }
.notes .roll { font: 500 italic 22px/1.2 var(--display); }
.notes .roll a { font: 500 12px/1 var(--mono); font-style: normal; text-decoration: none; border-bottom: 1px solid var(--rule); }
.notes .red { color: var(--red); }

/* ── acts and panels ── */
.act { padding-top: 64px; }
.act-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: baseline; gap: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--graphite); margin-bottom: 30px; }
.act-num { margin: 0; font: 500 13px/1 var(--mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--pencil); min-width: 5.5em; }
.act-head h2 { margin: 0; font: 500 clamp(30px, 3.6vw, 46px)/1 var(--display); letter-spacing: 0.02em; }
.act-meta { margin: 0; font: 400 12px/1.3 var(--mono); color: var(--pencil); text-align: right; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 56px 40px; }
.panel { min-width: 0; display: grid; gap: 14px; align-content: start; }
.panel figure { margin: 0; background: var(--sheet); padding: 6px; box-shadow: 0 1px 0 var(--rule); }
.panel img { display: block; width: 100%; height: auto; aspect-ratio: 1440 / 603; }
.cap { display: grid; grid-template-columns: 4.6em minmax(0, 1fr); gap: 16px; }
.num { display: grid; gap: 4px; align-content: start; font: 400 12px/1 var(--mono); color: var(--pencil); font-variant-numeric: tabular-nums; }
.num .n { font: 500 30px/1 var(--display); color: var(--graphite); letter-spacing: 0.02em; }
.body { min-width: 0; display: grid; gap: 10px; }
.tech { margin: 0; font: 500 11px/1.45 var(--mono); letter-spacing: 0.06em; text-transform: uppercase; color: var(--pencil); }
.slug { margin: 0; font: 600 13px/1.35 var(--sans); letter-spacing: 0.06em; text-transform: uppercase; }
.action { margin: 0; max-width: 64ch; text-wrap: pretty; }
.line { display: grid; gap: 2px; padding-left: 14px; border-left: 1px solid var(--rule); }
.line .who { font: 500 10.5px/1.4 var(--mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--pencil); }
.line .it { margin: 0; font: 500 21px/1.3 var(--display); text-wrap: pretty; }
.line.vo .it { font-style: italic; }
.line .en { margin: 0; font: italic 400 16px/1.35 var(--display); color: var(--pencil); }
.line.lui { border-left-color: var(--red); }
.line.lui .it, .line.lui .who { color: var(--red); }
.line.none { border-left-style: dashed; }
.sound { margin: 0; font-size: 13.5px; color: var(--pencil); }
.sound span { font: 500 10.5px/1 var(--mono); letter-spacing: 0.12em; text-transform: uppercase; margin-right: 6px; }
/* ── animatic ── */
.animatic { margin-top: 34px; display: grid; grid-template-columns: minmax(0, 1fr) 15.5rem; gap: 18px 28px; }
.animatic h4, .notes h4 { margin: 0 0 8px; font: 500 11.5px/1 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--pencil); }
.screen { background: #0d0d0c; aspect-ratio: 16 / 9; width: 100%; max-width: 100%; }
.screen video { display: block; width: 100%; height: 100%; }
.chapters { display: grid; gap: 6px; align-content: start; }
.ch { display: grid; grid-template-columns: 4.2em minmax(0, 1fr); gap: 2px 8px; text-align: left; background: transparent; color: var(--graphite); border: 0; border-top: 1px solid var(--rule); padding: 10px 2px; cursor: pointer; font: inherit; }
.ch:hover { background: var(--sheet); }
.ch-num { font: 500 11px/1.4 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--pencil); grid-row: span 2; padding-top: 3px; }
.ch-name { font: 500 21px/1.1 var(--display); }
.ch-t { font: 400 11px/1.3 var(--mono); color: var(--pencil); font-variant-numeric: tabular-nums; }
.ch[aria-current="true"] .ch-name { color: var(--red); }
.ch[aria-current="true"] { border-top-color: var(--red); }
.animatic .hint { grid-column: 1 / -1; margin: 0; font-size: 13.5px; color: var(--pencil); max-width: 80ch; }
footer { margin-top: 72px; padding-top: 22px; border-top: 1px solid var(--rule); font: 400 12px/1.6 var(--mono); color: var(--pencil); display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }

@media (max-width: 1040px) {
  .grid { grid-template-columns: minmax(0, 1fr); }
  .title, .notes, .animatic { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .cap { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .num { grid-auto-flow: column; justify-content: start; gap: 12px; align-items: baseline; }
  .act-head { grid-template-columns: minmax(0, 1fr); gap: 6px; }
  .act-meta { text-align: left; }
  .strip a span { display: none; }
  .strip { aspect-ratio: 8 / 1; }
  .acts span { font-size: 9px; }
  .line .it { font-size: 19px; }
}
@media (prefers-reduced-motion: no-preference) {
  .strip a { transition: box-shadow 120ms ease; }
}
</style>

<div class="wrap">
  <header class="title">
    <div>
      <h1>A PARTE<span class="dot">.</span></h1>
      <p class="aside">aside</p>
    </div>
    <div>
      <p class="logline">Un bambino rosso, che nessuno vede, cresce in un mondo grigio che guarda sempre altrove. Da adulto scopre che chi non è visto è l'unico che vede tutto.</p>
      <ul class="facts">
        <li>storyboard · <b>%N% tavole</b></li>
        <li>durata · <b>%RUNTIME%</b></li>
        <li>formato · <b>2,39 : 1</b></li>
        <li>lingua · <b>italiano, sott. inglesi</b></li>
      </ul>
    </div>
  </header>

  <section class="script" aria-label="Colour script">
    <div class="script-head"><span>Colour script: ogni banda dura quanto la sua inquadratura</span><span>0:00 — %RUNTIME%</span></div>
    <div class="strip">%COLORSCRIPT_LINKS%</div>
    <div class="acts">%ACT_MARKS%</div>
  </section>

  %PLAYER%

  <section class="notes">
    <div>
      <h4>Il motivo</h4>
      <p class="roll">«Ci siamo tutti?» %ROLL% → <a href="#t26">26</a> <span class="red">«Ci sono.»</span></p>
      <p>La stessa domanda a ogni età. Ogni volta lui è lì e nessuno lo conta. Alla fine risponde lui.</p>
    </div>
    <div>
      <h4>Il rosso</h4>
      <p>Lui è una sagoma rossa piena: niente pennellate, niente ombra, niente volto. Gli altri hanno volti ed espressioni dipinti. Il rosso compare solo altre tre volte: il pastello (06), i fanali (03), il sole (25).</p>
    </div>
    <div>
      <h4>La camera</h4>
      <p>Ferma, osservativa, da documentario. L'altezza della camera cresce con lui: 0,98 m nell'aula, 1,40 m nella sala riunioni, la stessa inquadratura. Nessun suo primo piano fino alla tavola 26.</p>
    </div>
  </section>

  %SECTIONS%

  <footer><span>A PARTE · storyboard · tavole dipinte a pennellate su scene 3D</span><span>ispirazione: Spolu sami (D. Cam Van Nguyen, 2018)</span></footer>
</div>
'''

PLAYER = r'''<section class="animatic" aria-label="Animatic">
    <div>
      <h4>Animatic · 8 dipinti al secondo · voci registrate, ambienti provvisori</h4>
      <div class="screen"><video id="anim" controls playsinline preload="metadata" poster="img/s-04.jpg"></video></div>
    </div>
    <div class="chapters"><h4>Capitoli</h4>%BTNS%</div>
    <p class="hint">I capitoli si susseguono da soli. Voce narrante e dialoghi sono quelli registrati; i sottotitoli, nella banda nera sotto l'immagine, seguono le registrazioni. Ambienti e musica sono ancora provvisori.</p>
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

if __name__ == '__main__':
    build()
    print('ok', os.path.join(WEB, 'index.html'))
