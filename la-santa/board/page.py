"""The page of SEX ON LA SANTA, dressed as the Baretto Santissimo: the awning across the top, the animatic
on the screen, and the 24 shots written up like the bar's menu board, with the time where the price would be.

    python3 page.py   → out/web/index.html, out/web/img/*.jpg (and video/, film/ when the cut exists)
"""
import html
import json
import os
import re
import subprocess

import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WEB = os.path.join(ROOT, 'out', 'web')
LOOK = os.path.join(ROOT, 'build', 'look')
ANIM = os.path.join(ROOT, 'build', 'anim')
FILM = os.path.join(ROOT, 'out', 'sex-on-la-santa.mp4')
CHAPTERS = [('Intro e Parte A', 'Il caruggio, il bancone', 0.0, 48.39), ('Parte B e stacco', 'Il ballo, il buio', 48.39, 64.64), ('Finale', 'La processione', 64.64, None)]


def esc(t):
    return html.escape(t, quote=True)


def md(t):
    # the screenplay's **bold** and «quotes», as HTML
    return re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', esc(t))


def tc(sec):
    return f'{int(sec // 60)}:{int(sec % 60):02d}'


def screenplay():
    """The shot tables of SCENEGGIATURA.md, by section."""
    sections, cur = [], None
    for line in open(os.path.join(ROOT, 'SCENEGGIATURA.md')):
        m = re.match(r'### (.+?) · (.+?) \((.+)\)', line)
        if m:
            cur = dict(part=m.group(1), name=m.group(2), span=m.group(3), shots=[])
            sections.append(cur)
            continue
        m = re.match(r'\| (\d\d) \| (.+?) \| (.+?) \| (.+?) \| (.+) \|$', line.strip())
        if m and cur:
            cur['shots'].append(dict(n=m.group(1), time=m.group(2), bars=m.group(3), cue=m.group(4), what=m.group(5)))
    return sections


def still(n):
    """A frame from the middle of the shot, for its line on the menu."""
    shot = f's{n}'
    os.makedirs(os.path.join(WEB, 'img'), exist_ok=True)
    out = os.path.join(WEB, 'img', f'{shot}.jpg')
    fr = sorted(f for f in os.listdir(os.path.join(LOOK, shot))) if os.path.isdir(os.path.join(LOOK, shot)) else []
    if not fr:
        return None
    pick = {'s16': 0.55, 's24': 0.1, 's01': 0.85, 's02': 0.15, 's11': 0.95, 's12': 0.75, 's15': 0.8, 's18': 0.9, 's22': 0.85}.get(shot, 0.55)
    im = cv2.imread(os.path.join(LOOK, shot, fr[min(len(fr) - 1, int(len(fr) * pick))]))
    im = cv2.resize(im, (640, 360), interpolation=cv2.INTER_AREA)
    cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 84, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
    return f'img/{shot}.jpg'


def media():
    """Cut the film into chapters that play on the page (each under 15 MB) and into byte pieces for the download."""
    if not os.path.exists(FILM):
        return [], [], 0
    vdir, fdir = os.path.join(WEB, 'video'), os.path.join(WEB, 'film')
    os.makedirs(vdir, exist_ok=True)
    os.makedirs(fdir, exist_ok=True)
    total = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', FILM]).decode())
    chapters = []
    for i, (name, sub, a, b) in enumerate(CHAPTERS):
        b = total if b is None else b
        out = os.path.join(vdir, f'capitolo-{i + 1}.mp4')
        crf = 28
        while True:
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-i', FILM, '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-tune', 'grain',
                            '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out], check=True)
            if os.path.getsize(out) < 14.5e6 or crf > 36:
                break
            crf += 1
        chapters.append(dict(src=f'video/capitolo-{i + 1}.mp4', file=f'sex-on-la-santa-{i + 1}.mp4', name=name, sub=sub, start=tc(a), dur=tc(b - a), size=os.path.getsize(out)))
    for f in os.listdir(fdir):
        os.remove(os.path.join(fdir, f))
    data = open(FILM, 'rb').read()
    step = 14_500_000
    pieces = []
    for k in range(0, len(data), step):
        p = f'film/pezzo-{k // step + 1}.mp4'
        open(os.path.join(WEB, p), 'wb').write(data[k:k + step])
        pieces.append(p)
    return chapters, pieces, len(data)


def build():
    os.makedirs(WEB, exist_ok=True)
    secs = screenplay()
    chapters, pieces, size = media()
    menu = []
    for sec in secs:
        items = []
        for s in sec['shots']:
            img = still(s['n'])
            cue = s['cue'].strip('«»() ')
            is_quote = s['cue'].startswith('«')
            items.append(f'''
      <li class="dish">
        {f'<img src="{img}" alt="Inquadratura {s["n"]}" loading="lazy" width="640" height="360">' if img else '<div class="noimg"></div>'}
        <div class="dish-body">
          <p class="dish-head"><span class="num">{s["n"]}</span><span class="cue{' quote' if is_quote else ''}">{esc(cue)}</span><span class="dots" aria-hidden="true"></span><span class="price">{esc(s["time"])}</span></p>
          <p class="what">{md(s["what"])}</p>
          <p class="bars">battute {esc(s["bars"])}</p>
        </div>
      </li>''')
        menu.append(f'''
    <section class="course" id="{esc(sec["part"].lower().replace(" ", "-"))}">
      <header><h2>{esc(sec["part"])}</h2><p>{esc(sec["name"])} · {esc(sec["span"])}</p></header>
      <ul>{"".join(items)}</ul>
    </section>''')
    player = downloads = ''
    if chapters:
        btns = ''.join(f'<button type="button" class="ch" data-i="{i}"><b>{esc(c["name"])}</b><span>{esc(c["sub"])}</span><small>{c["start"]} · {c["dur"]}</small></button>' for i, c in enumerate(chapters))
        player = PLAYER.replace('%BTNS%', btns).replace('%SRCS%', json.dumps([c['src'] for c in chapters]))
        mb = lambda n: f'{n / 1e6:.1f}'.replace('.', ',')
        ch = ''.join(f'<a class="dl" href="{c["src"]}" download="{c["file"]}"><b>{esc(c["name"])}</b><small>{c["start"]} · {c["dur"]} · {mb(c["size"])} MB</small></a>' for c in chapters)
        whole = dict(file='sayf-sex-on-la-santa-animatic.mp4', pieces=pieces)
        downloads = DOWNLOADS.replace('%CH%', ch).replace('%WHOLE%', json.dumps(whole)).replace('%SIZE%', f'{size / 1e6:.0f} MB')
    page = TEMPLATE.replace('%PLAYER%', player).replace('%DOWNLOADS%', downloads).replace('%MENU%', ''.join(menu))
    open(os.path.join(WEB, 'index.html'), 'w').write(page)
    print('ok', os.path.join(WEB, 'index.html'))


TEMPLATE = r'''<title>Sex on La Santa</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lobster&family=Anton&family=Alegreya+Sans:ital,wght@0,400;0,500;0,700;1,400;1,500&display=swap">
<style>
/* Layout: the bar's front. The awning across the top, the screen under it, then the menu board: one course per part of the song. */
:root {
  --awning: #efe2bc;      /* the cream canvas */
  --ink: #5e1416;         /* the burgundy of the lettering and the board */
  --flame: #c4261c;       /* the S of the house */
  --door: #1d4a3a;        /* the green of the door */
  --wall: #f6efe0;        /* the page, a paler cream */
  --pink: #e8466e;        /* the cocktail: the only pink */
  --text: #2c1a14;
  --muted: #7a5a48;
  --rule: rgba(94, 20, 22, 0.22);
  --board: #5e1416;
  --board-text: #f2e6c6;
  --screen: #120c0a;
  --script: 'Lobster', 'Brush Script MT', cursive;
  --sign: 'Anton', 'Impact', 'Arial Narrow', sans-serif;
  --body: 'Alegreya Sans', 'Gill Sans', 'Trebuchet MS', sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --awning: #e6d7aa; --ink: #f0dcb0; --flame: #e2483c; --door: #2f6a54; --wall: #160f10; --pink: #ff6f93;
    --text: #efe2c8; --muted: #b8a088; --rule: rgba(240, 220, 176, 0.18); --board: #2a0c0e; --board-text: #f2e6c6; --screen: #000;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --awning: #e6d7aa; --ink: #f0dcb0; --flame: #e2483c; --door: #2f6a54; --wall: #160f10; --pink: #ff6f93;
  --text: #efe2c8; --muted: #b8a088; --rule: rgba(240, 220, 176, 0.18); --board: #2a0c0e; --board-text: #f2e6c6; --screen: #000;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body { background: var(--wall); color: var(--text); font: 400 1.0625rem/1.55 var(--body); }
.wrap { max-width: 72rem; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }

/* the awning: cream canvas, a scalloped hem, the name in the bar's script */
.awning { background: var(--awning); color: #5e1416; position: relative; padding-block: 28px 44px; }
.awning::after { content: ''; position: absolute; left: 0; right: 0; bottom: -17px; height: 18px;
  background: radial-gradient(circle at 50% 0, var(--awning) 17px, transparent 18px) 0 0 / 36px 18px repeat-x; }
.awning .wrap { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px 28px; align-items: center; }
.flame { width: clamp(64px, 9vw, 96px); height: auto; grid-row: span 2; }
.eyebrow { font: 400 0.95rem/1 var(--sign); letter-spacing: 0.5em; text-transform: uppercase; margin: 0; }
h1 { font: 400 clamp(2.8rem, 8vw, 5.6rem)/1 var(--script); margin: 0; text-wrap: balance; }
h1 em { font-style: normal; color: #c4261c; }
.facts { grid-column: 2; display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 4px 0 0; padding: 0; list-style: none; font-size: 0.95rem; color: #6e4a3a; }
.facts li { font-variant-numeric: tabular-nums; }

main { padding-block: 56px 40px; display: grid; gap: 56px; }
.label { font: 400 0.8rem/1 var(--sign); letter-spacing: 0.32em; text-transform: uppercase; color: var(--muted); margin: 0 0 12px; }

/* the screen and its chapters */
.animatic { display: grid; grid-template-columns: minmax(0, 1fr) 17rem; gap: 20px 28px; align-items: start; }
.screen { background: var(--screen); aspect-ratio: 16 / 9; max-width: 100%; border: 10px solid var(--door); border-radius: 4px; overflow: hidden; }
.screen video { display: block; width: 100%; height: 100%; }
.chapters { display: grid; gap: 10px; }
.ch { display: grid; gap: 2px; text-align: left; font: inherit; color: var(--text); background: transparent; border: 1px solid var(--rule); border-radius: 3px; padding: 12px 14px; cursor: pointer; }
.ch b { font: 400 1.35rem/1.1 var(--script); color: var(--ink); }
.ch span { font-size: 0.95rem; }
.ch small { color: var(--muted); font-variant-numeric: tabular-nums; }
.ch[aria-current="true"] { border-color: var(--pink); box-shadow: inset 4px 0 0 var(--pink); }
.ch:focus-visible, .dl:focus-visible { outline: 2px solid var(--pink); outline-offset: 2px; }
.hint { grid-column: 1 / -1; margin: 0; color: var(--muted); font-size: 0.95rem; max-width: 62ch; }

/* downloads */
.downloads { display: grid; grid-template-columns: 17rem minmax(0, 1fr); gap: 12px 28px; border-top: 1px solid var(--rule); padding-top: 24px; }
.downloads p { margin: 0; max-width: 52ch; }
.dl-row { display: flex; flex-wrap: wrap; gap: 10px; }
.dl { display: grid; gap: 2px; text-decoration: none; text-align: left; font: inherit; color: var(--text); background: transparent; border: 1px solid var(--rule); border-radius: 3px; padding: 10px 14px; cursor: pointer; min-width: 0; }
.dl b { font-weight: 700; }
.dl small { color: var(--muted); font-variant-numeric: tabular-nums; }
.dl.whole { border-color: var(--ink); }
.dl[data-state="busy"] { opacity: 0.7; }
.dl-note { color: var(--muted); min-height: 1.5em; }
.dl-groups { display: grid; gap: 16px; min-width: 0; }
/* where the page cannot hand over a file, the chapters' links do nothing: show only what works */
:root:not([data-dl]) .dl-only { display: none; }
:root[data-dl="link"] a.dl { pointer-events: auto; }

/* the menu board: one course per part of the song, the time where the price would be */
.board { background: var(--board); color: var(--board-text); border-radius: 6px; padding-block: 40px; }
.board > .wrap { display: grid; gap: 44px; }
.board-head { display: grid; gap: 6px; text-align: center; }
.board-head h2 { font: 400 clamp(2.4rem, 6vw, 3.6rem)/1 var(--script); margin: 0; color: var(--board-text); }
.board-head p { margin: 0; color: color-mix(in srgb, var(--board-text) 72%, transparent); }
.sun { width: 120px; height: 40px; margin: 6px auto 0; display: block; }
.course header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 16px; border-bottom: 2px solid color-mix(in srgb, var(--board-text) 60%, transparent); padding-bottom: 6px; margin-bottom: 18px; }
.course h2 { font: 400 2rem/1.1 var(--script); margin: 0; }
.course header p { margin: 0; font: 400 0.82rem/1 var(--sign); letter-spacing: 0.24em; text-transform: uppercase; color: color-mix(in srgb, var(--board-text) 70%, transparent); }
.course ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 22px; }
.dish { display: grid; grid-template-columns: 13rem minmax(0, 1fr); gap: 18px; align-items: start; }
.dish img, .noimg { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 2px; border: 3px solid var(--board-text); background: #000; }
.dish-body { min-width: 0; }
.dish-head { display: flex; align-items: baseline; gap: 10px; margin: 0 0 4px; }
.num { font: 400 0.95rem/1 var(--sign); letter-spacing: 0.08em; color: color-mix(in srgb, var(--board-text) 65%, transparent); }
.cue { font: 500 1.08rem/1.3 var(--body); min-width: 0; }
.cue.quote { font-style: italic; }
.cue.quote::before { content: '«'; } .cue.quote::after { content: '»'; }
.dots { flex: 1; min-width: 1.5rem; border-bottom: 2px dotted color-mix(in srgb, var(--board-text) 45%, transparent); transform: translateY(-4px); }
.price { font-variant-numeric: tabular-nums; white-space: nowrap; font-weight: 500; }
.what { margin: 0; max-width: 66ch; color: color-mix(in srgb, var(--board-text) 88%, transparent); }
.what strong { color: var(--board-text); }
.bars { margin: 4px 0 0; font-size: 0.85rem; color: color-mix(in srgb, var(--board-text) 60%, transparent); font-variant-numeric: tabular-nums; }

.notes { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 24px 36px; }
.notes h3 { font: 400 1.5rem/1.1 var(--script); color: var(--ink); margin: 0 0 6px; }
.notes p { margin: 0; max-width: 60ch; }
footer { border-top: 1px solid var(--rule); padding-block: 20px 36px; color: var(--muted); font-size: 0.9rem; display: flex; flex-wrap: wrap; gap: 8px 24px; justify-content: space-between; }

@media (max-width: 760px) {
  .animatic, .downloads { grid-template-columns: minmax(0, 1fr); }
  .dish { grid-template-columns: minmax(0, 1fr); }
  .awning .wrap { grid-template-columns: minmax(0, 1fr); }
  .flame { grid-row: auto; width: 64px; }
  .facts { grid-column: 1; }
  .board { border-radius: 0; }
}
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
</style>

<header class="awning">
  <div class="wrap">
    <svg class="flame" viewBox="0 0 100 120" role="img" aria-label="La fiamma del Santissimo">
      <path d="M50 4 C58 22 82 32 80 64 C78 98 22 98 20 64 C18 44 34 34 44 22 C45 32 50 36 53 28 Z" fill="#c4261c"/>
      <text x="50" y="86" text-anchor="middle" font-family="Lobster, cursive" font-size="54" fill="#efe2bc">S</text>
    </svg>
    <p class="eyebrow">Sayf · il Baretto Santissimo</p>
    <h1>Sex on <em>La Santa</em></h1>
    <ul class="facts">
      <li>videoclip in stile Muppet</li><li>1′37″ · 103 bpm</li><li>24 inquadrature</li><li>Genova · Tunisi</li>
    </ul>
  </div>
</header>

<div class="wrap">
<main>
  %PLAYER%
  %DOWNLOADS%

  <section class="notes" aria-label="L'idea">
    <div>
      <h3>Il cocktail della casa</h3>
      <p>Notte nei caruggi. Al Santissimo, Sayf prepara il Sex on La Santa con basilico e limone di Genova, menta e fiori d'arancio di Tunisi, un filo di harissa sul bordo. Chi lo beve non sta più fermo: il bar diventa uno show di varietà, poi il caruggio, poi il porto.</p>
    </div>
    <div>
      <h3>Tutto a tempo</h3>
      <p>Ogni stacco cade sul primo tempo di una battuta. Le bocche dei pupazzi si aprono sulle sillabe vere della voce, ricavate dalla traccia, e ogni gag cade sulla sua frase.</p>
    </div>
    <div>
      <h3>Fatto a mano</h3>
      <p>Feltro, pile, lana e palline da ping-pong. Sayf resta calmo, palpebre a metà, mentre attorno a lui succede di tutto. Il cocktail è l'unico rosa del film.</p>
    </div>
  </section>
</main>
</div>

<section class="board" aria-labelledby="menu-h">
  <div class="wrap">
    <div class="board-head">
      <h2 id="menu-h">Il menù</h2>
      <p>Le inquadrature, parte per parte. Al posto del prezzo, il momento del pezzo.</p>
      <svg class="sun" viewBox="0 0 120 40" aria-hidden="true">
        <g stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none">
          <line x1="60" y1="18" x2="60" y2="2"/><line x1="44" y1="21" x2="36" y2="7"/><line x1="76" y1="21" x2="84" y2="7"/>
          <line x1="32" y1="28" x2="17" y2="20"/><line x1="88" y1="28" x2="103" y2="20"/><line x1="27" y1="38" x2="10" y2="35"/><line x1="93" y1="38" x2="110" y2="35"/>
        </g>
        <path d="M42 40 A18 18 0 0 1 78 40 Z" fill="currentColor"/>
      </svg>
    </div>
    %MENU%
  </div>
</section>

<div class="wrap">
  <footer><span>SAYF · SEX ON LA SANTA · animatic · pupazzi 3D a 12 fotogrammi al secondo</span><span>Il logo sulla tuta resta fuori finché il marchio non dice di sì.</span></footer>
</div>
'''

PLAYER = r'''<section class="animatic" aria-label="Animatic">
    <div>
      <p class="label">Animatic · con la traccia</p>
      <div class="screen"><video id="anim" controls playsinline preload="metadata" poster="img/s03.jpg"></video></div>
    </div>
    <div class="chapters"><p class="label">Capitoli</p>%BTNS%</div>
    <p class="hint">I capitoli si susseguono da soli. I tempi dei versi sono ricavati dalla voce: dove una frase cade mezza battuta più in là, si corregge in montaggio.</p>
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
    <div>
      <p class="label" id="dl-h">Scarica</p>
      <p>1280×720, con la traccia. Il film intero è un unico file mp4.</p>
    </div>
    <div class="dl-groups">
      <div class="dl-row">
        <button type="button" class="dl whole" id="dl-whole"><b>Il film intero</b><small>1′37″ · mp4 · %SIZE%</small></button>
      </div>
      <div class="dl-row">%CH%</div>
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
      too_large: 'File troppo grande per questo dispositivo: scarica un capitolo alla volta.',
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
