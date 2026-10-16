"""The page of MAGENTA: the faded frame on a dark screen, the film in a few paragraphs, the style frames, the
screenplay set as a screenplay (Courier, the English subtitles under each line), the director's notes.

    python3 pagina.py   → out/web/index.html, out/web/img/*.jpg
"""
import html
import os
import re

import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WEB = os.path.join(ROOT, 'out', 'web')
STYLE = os.path.join(ROOT, 'out', 'style')

# the style frames: file, chapter, panel, caption, reference
FRAMES = [
    ('03-sbiadito', 'Prologo', '03', "Pane duro, 1962, come esce dalla scatola. Il ciano e il giallo sono svaniti, resta il magenta. "
     "Il formato di allora, 1.37, dentro il quadro largo di oggi.", 'Pasolini, <i>Accattone</i>'),
    ('09-stanza', 'II · Ada', '09', "La stanza di Ada a Ostia, a novanta centimetri da terra. Tutto lavato, il mare d'inverno dietro il vetro.",
     'Antonioni, <i>Il deserto rosso</i>; Ozu, <i>Viaggio a Tokyo</i>'),
    ('18-visita', 'III · Novantasei fotogrammi', '18', "«Lei è gentile. Viene tutti i giorni.» Più di metà di Ada è già magenta. "
     "Il colore se ne va dalle mani e dai piedi, il volto per ultimo.", 'Ozu, le stanze vuote'),
    ('19-laboratorio', 'III · Novantasei fotogrammi', '19', "La notte del verde. Sul monitor il vestito torna smeraldo, e la sua luce riempie il laboratorio.",
     'Hitchcock, <i>La donna che visse due volte</i>'),
    ('28-proiezione', "V · L'anello", '28', "Il proiettore si accende e Ada è tutta magenta. Sul muro, la ragazza in verde: il colore che le manca. "
     "Elio la guarda guardare.", 'Powell e Pressburger, <i>Scarpette rosse</i>; Kuleshov'),
    ('33-alba', 'Epilogo', '33', "Ostia all'alba, verso il mare: la fascia rosa sopra l'ombra della Terra. "
     "«Il magenta non esiste. Ma all'alba il cielo lo fa da solo.»", 'Tarkovskij, <i>Lo specchio</i>; Pasolini a Ostia'),
    ('34-restaurato', 'Ultima inquadratura', '34', "Il fotogramma restaurato: il verde smeraldo, il cielo, il sole sulle facce. "
     "La ragazza si gira e guarda noi.", 'Pasolini, lo sguardo in macchina'),
]


def esc(t):
    return html.escape(t, quote=False)


def inline(t):
    t = esc(t)
    t = re.sub(r'\*\*\*(.+?)\*\*\*', r'<strong><i>\1</i></strong>', t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<i>\1</i>', t)
    return t


def blocks(lines):
    """Markdown, the little of it these two files use: headings, paragraphs, lists, tables, rules, quotes."""
    out, i = [], 0
    while i < len(lines):
        ln = lines[i].rstrip('\n')
        if not ln.strip():
            i += 1
            continue
        if ln.startswith('#'):
            n = len(ln) - len(ln.lstrip('#'))
            out.append(('h', n, ln[n:].strip()))
            i += 1
        elif ln.strip() == '---':
            out.append(('hr',))
            i += 1
        elif ln.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'-+', c) for c in cells):
                    rows.append(cells)
                i += 1
            out.append(('table', rows))
        elif re.match(r'(- |\d+\. )', ln):
            ordered = bool(re.match(r'\d+\. ', ln))
            items = []
            while i < len(lines) and (re.match(r'(- |\d+\. )', lines[i]) or (lines[i].startswith('  ') and lines[i].strip())):
                if re.match(r'(- |\d+\. )', lines[i]):
                    items.append(re.sub(r'^(- |\d+\. )', '', lines[i].rstrip('\n')))
                else:
                    items[-1] += ' ' + lines[i].strip()
                i += 1
            out.append(('list', ordered, items))
        elif ln.startswith('>'):
            q = []
            while i < len(lines) and lines[i].startswith('>'):
                q.append(lines[i][1:].strip())
                i += 1
            out.append(('quote', q))
        else:
            p = []
            while i < len(lines) and lines[i].strip() and not re.match(r'(#|>|\||- |\d+\. |---)', lines[i]):
                p.append(lines[i].strip())
                i += 1
            out.append(('p', ' '.join(p)))
    return out


def prose(bs, top=1):
    h = []
    for b in bs:
        if b[0] == 'h':
            lvl = min(6, b[1] - top + 2)
            h.append(f'<h{lvl}>{inline(b[2])}</h{lvl}>')
        elif b[0] == 'p':
            h.append(f'<p>{inline(b[1])}</p>')
        elif b[0] == 'list':
            tag = 'ol' if b[1] else 'ul'
            h.append(f'<{tag}>' + ''.join(f'<li>{inline(x)}</li>' for x in b[2]) + f'</{tag}>')
        elif b[0] == 'table':
            head, *rows = b[1]
            many = ' class="many"' if len(head) >= 6 else ''
            h.append(f'<div class="tablewrap"><table{many}><thead><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in head) + '</tr></thead><tbody>'
                     + ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in rows) + '</tbody></table></div>')
        elif b[0] == 'quote':
            h.append('<blockquote>' + inline(' '.join(b[1])) + '</blockquote>')
    return '\n'.join(h)


def line(speaker, it, en):
    return (f'<div class="line"><div class="who">{esc(speaker)}</div><p class="it">{inline(it)}</p>'
            + (f'<p class="en">{inline(en)}</p>' if en else '') + '</div>')


def screenplay(lines):
    """The screenplay as a screenplay: chapters, scene headings, action, and each line with its subtitle."""
    h, i = [], 0
    while i < len(lines):
        ln = lines[i].rstrip('\n')
        s = ln.strip()
        if not s:
            i += 1
            continue
        if s.startswith('### '):
            h.append(f'<h3 class="chapter">{inline(s[4:])}</h3>')
            i += 1
        elif re.match(r'\*\*\d+\. ', s):
            m = re.match(r'\*\*(\d+)\. (.+)\*\*$', s)
            h.append(f'<h4 class="slug"><span class="num">{m.group(1)}</span>{inline(m.group(2))}</h4>')
            i += 1
        elif s.startswith('>'):
            q = []
            while i < len(lines) and lines[i].startswith('>'):
                q.append(lines[i][1:].strip())
                i += 1
            k = next((j for j, x in enumerate(q) if x.startswith('*')), len(q))
            it, en = ' '.join(q[:k]), ' '.join(q[k:]).strip('*')
            m = re.match(r'([A-ZÀ-Ü ]+): (.+)', it)
            h.append(line(m.group(1), m.group(2), en) if m else f'<p>{inline(it)}</p>')
        elif re.match(r'\*\*[A-ZÀ-Ü ]+:\*\* ', s):
            m = re.match(r'\*\*([A-ZÀ-Ü ]+):\*\* (.+)', s)
            en = ''
            i += 1
            if i < len(lines) and lines[i].strip().startswith('*') and not lines[i].strip().startswith('**'):
                en = lines[i].strip().strip('*')
                i += 1
            h.append(line(m.group(1), m.group(2), en))
        else:
            p = []
            while i < len(lines) and lines[i].strip() and not re.match(r'(###|>|\*\*\d+\. |\*\*[A-ZÀ-Ü ]+:\*\*)', lines[i].strip()):
                p.append(lines[i].strip())
                i += 1
            t = ' '.join(p)
            cls = ' class="end"' if t == 'MAGENTA' else ''
            h.append(f'<p{cls}>{inline(t)}</p>')
    return '\n'.join(h)


def frames():
    os.makedirs(os.path.join(WEB, 'img'), exist_ok=True)
    out = []
    for f, chap, n, cap, ref in FRAMES:
        im = cv2.imread(os.path.join(STYLE, f + '.jpg'))
        cv2.imwrite(os.path.join(WEB, 'img', f + '.jpg'), im, [cv2.IMWRITE_JPEG_QUALITY, 86, cv2.IMWRITE_JPEG_PROGRESSIVE, 1])
        out.append(f'''<figure class="frame">
  <div class="screen"><img src="img/{f}.jpg" width="1920" height="804" alt="Tavola {n}: {html.escape(re.sub('<[^>]+>', '', cap), quote=True)}" loading="lazy"></div>
  <figcaption><span class="tav">Tavola {n}</span><span class="chap">{esc(chap)}</span><span class="cap">{esc(cap)}</span><span class="ref">{ref}</span></figcaption>
</figure>''')
    return '\n'.join(out)


def main():
    sc = open(os.path.join(ROOT, 'SCENEGGIATURA.md')).read().split('\n')
    k = next(i for i, x in enumerate(sc) if x.startswith('## Sceneggiatura'))
    pre = blocks(sc[1:k])
    pre = [b for b in pre if not (b[0] == 'p' and b[1].startswith('*Cortometraggio'))]
    logline = next(b[1] for j, b in enumerate(pre) if b[0] == 'p' and pre[j - 1][0] == 'h' and pre[j - 1][2] == 'Logline')
    intro = [b for b in pre if b[0] != 'hr' and not (b[0] == 'h' and b[2] == 'Logline') and not (b[0] == 'p' and b[1] == logline)]
    note = next(x for x in sc[k + 1:] if x.strip())
    script = screenplay(sc[k + 1:][sc[k + 1:].index(note) + 1:])
    rg = open(os.path.join(ROOT, 'REGIA.md')).read().split('\n')
    regia = prose(blocks(rg[1:]))
    page = TEMPLATE.format(logline=inline(logline), intro=prose(intro), frames=frames(), note=inline(note), script=script, regia=regia)
    os.makedirs(WEB, exist_ok=True)
    open(os.path.join(WEB, 'index.html'), 'w').write(page)
    print(os.path.join(WEB, 'index.html'))


TEMPLATE = '''<title>MAGENTA</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@400;600&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,600;1,6..96,400&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Spectral:ital,wght@0,400;0,500;1,400&display=swap">
<style>
/* Layout: one column read like a print; the frames run wide on a screen that stays dark; the screenplay is a typed page */
:root {{
  --ground: #f0ebee;       /* a faded print */
  --ink: #221b20;
  --muted: #6c5f67;
  --line: #d8ccd3;
  --page: #faf8f9;         /* the screenplay's paper */
  --magenta: #b3126e;      /* the colour that isn't there */
  --screen: #0e0c0e;       /* the projection: dark in both themes */
  --screen-ink: #d9cfd4;
  --display: "Bodoni Moda", "Didot", "Bodoni 72", Georgia, serif;
  --body: "Spectral", Georgia, "Times New Roman", serif;
  --type: "Courier Prime", "Courier New", Courier, monospace;
  --label: "Archivo Narrow", "Arial Narrow", "Helvetica Neue", Arial, sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --ground: #141114; --ink: #ebe3e7; --muted: #a2939b; --line: #2f282d; --page: #1b171a; --magenta: #ff5aae; color-scheme: dark;
}} }}
:root[data-theme="dark"] {{ --ground: #141114; --ink: #ebe3e7; --muted: #a2939b; --line: #2f282d; --page: #1b171a; --magenta: #ff5aae; color-scheme: dark; }}

* {{ box-sizing: border-box; }}
body {{ background: var(--ground); color: var(--ink); font: 400 1.0625rem/1.65 var(--body); }}
.wrap {{ max-width: 46rem; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }}
.wide {{ max-width: 76rem; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }}
h2, h3, h4 {{ text-wrap: balance; }}

/* the opening: the frame as it came out of the can, and the title small, in magenta, as the script asks */
.hero {{ background: var(--screen); color: var(--screen-ink); padding-block: clamp(1.5rem, 5vw, 4rem) clamp(2rem, 5vw, 3.5rem); }}
.hero img {{ display: block; width: 100%; height: auto; }}
.hero .title {{ display: grid; gap: .9rem; justify-items: center; text-align: center; margin-top: clamp(1.5rem, 4vw, 2.75rem); }}
.hero h1 {{ margin: 0; font: 400 clamp(1rem, 2.4vw, 1.35rem)/1 var(--label); letter-spacing: .6em; padding-left: .6em; color: #ff4fa8; }}
.hero .meta {{ font: 400 .8rem/1.4 var(--label); letter-spacing: .12em; text-transform: uppercase; color: #9a8d94; }}
.hero .logline {{ max-width: 40rem; margin: .4rem auto 0; font: 400 clamp(1.15rem, 2.6vw, 1.5rem)/1.45 var(--display); }}

nav {{ border-bottom: 1px solid var(--line); }}
nav ul {{ list-style: none; margin: 0; padding: .9rem 0; display: flex; flex-wrap: wrap; gap: .4rem 1.6rem; justify-content: center; font: 600 .78rem/1 var(--label); letter-spacing: .14em; text-transform: uppercase; }}
nav a {{ color: var(--muted); text-decoration: none; }}
nav a:hover, nav a:focus-visible {{ color: var(--magenta); }}
a:focus-visible {{ outline: 2px solid var(--magenta); outline-offset: 3px; }}

section {{ padding-block: clamp(2.5rem, 6vw, 4.5rem); }}
section + section {{ border-top: 1px solid var(--line); }}
.eyebrow {{ font: 600 .75rem/1 var(--label); letter-spacing: .18em; text-transform: uppercase; color: var(--magenta); margin: 0 0 .8rem; }}
h2 {{ font: 400 clamp(1.9rem, 4.5vw, 2.6rem)/1.15 var(--display); margin: 0 0 1.5rem; }}
.prose h3 {{ font: 400 1.45rem/1.25 var(--display); margin: 2.4rem 0 .7rem; }}
.prose h4 {{ font: 600 .8rem/1.2 var(--label); letter-spacing: .14em; text-transform: uppercase; color: var(--muted); margin: 2rem 0 .6rem; }}
.prose p, .prose li {{ margin: 0 0 1rem; }}
.prose ul, .prose ol {{ padding-left: 1.2rem; margin: 0 0 1.2rem; }}
.prose li::marker {{ color: var(--magenta); }}
.prose strong {{ font-weight: 500; }}
.tablewrap {{ overflow-x: auto; margin: 0 0 1.6rem; border-top: 1px solid var(--ink); }}
table {{ border-collapse: collapse; width: 100%; font: 400 .9rem/1.45 var(--body); }}
th {{ font: 600 .7rem/1.3 var(--label); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); text-align: left; padding: .6rem .7rem .5rem 0; border-bottom: 1px solid var(--line); vertical-align: bottom; }}
td {{ padding: .55rem .7rem .55rem 0; border-bottom: 1px solid var(--line); vertical-align: top; }}
td:first-child {{ font-variant-numeric: tabular-nums; }}
table.many {{ min-width: 56rem; }}

/* the frames: projected, one under the other, with the panel's line from the découpage */
.frames {{ display: grid; gap: clamp(2rem, 5vw, 3.5rem); }}
.frame {{ margin: 0; }}
.screen {{ background: var(--screen); padding: clamp(.4rem, 1.2vw, .9rem); }}
.screen img {{ display: block; width: 100%; height: auto; max-width: 100%; }}
.frame figcaption {{ display: grid; grid-template-columns: 7.5rem 1fr; gap: .2rem 1.4rem; padding-top: .9rem; max-width: 60rem; }}
.frame .tav {{ font: 600 .75rem/1.5 var(--label); letter-spacing: .16em; text-transform: uppercase; color: var(--magenta); font-variant-numeric: tabular-nums; }}
.frame .chap {{ font: 600 .75rem/1.5 var(--label); letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }}
.frame .cap {{ grid-column: 2; font: 400 1.05rem/1.5 var(--body); }}
.frame .ref {{ grid-column: 2; font: italic 400 .9rem/1.4 var(--body); color: var(--muted); }}
.frame .ref i {{ font-style: normal; }}

/* the screenplay, typed: Courier, scene headings in capitals, each line with its subtitle under it */
.script {{ background: var(--page); border: 1px solid var(--line); padding: clamp(1.25rem, 5vw, 3.5rem) clamp(1rem, 6vw, 4.5rem); font: 400 1rem/1.55 var(--type); }}
.script .note {{ color: var(--muted); font-size: .9rem; margin: 0 0 2rem; }}
.script h3.chapter {{ font: 700 1rem/1.4 var(--type); text-align: center; letter-spacing: .08em; margin: 3rem 0 1.6rem; }}
.script h3.chapter:first-of-type {{ margin-top: 1rem; }}
.script h4.slug {{ font: 700 1rem/1.45 var(--type); text-transform: uppercase; margin: 2rem 0 .8rem; display: flex; gap: 1rem; }}
.script h4.slug .num {{ color: var(--magenta); min-width: 2ch; font-variant-numeric: tabular-nums; }}
.script h4.slug i {{ text-transform: none; }}
.script p {{ margin: 0 0 1rem; }}
.script .line {{ margin: 0 auto 1.1rem; max-width: 34ch; }}
.script .who {{ text-align: center; text-transform: uppercase; margin-bottom: .1rem; }}
.script .line .it {{ margin: 0; }}
.script .line .en {{ margin: .15rem 0 0; font: italic 400 .86rem/1.45 var(--body); color: var(--muted); }}
.script .end {{ text-align: center; color: var(--magenta); letter-spacing: .5em; padding-left: .5em; margin-top: 2.5rem; }}

footer {{ border-top: 1px solid var(--line); padding-block: 2rem 3rem; font: 400 .8rem/1.6 var(--label); letter-spacing: .06em; color: var(--muted); text-align: center; }}

@media (max-width: 34rem) {{
  .frame figcaption {{ grid-template-columns: 1fr; }}
  .frame .cap, .frame .ref {{ grid-column: 1; }}
  .script .line {{ max-width: none; }}
}}
@media (prefers-reduced-motion: reduce) {{ * {{ scroll-behavior: auto !important; }} }}
html {{ scroll-behavior: smooth; }}
</style>

<header class="hero">
  <div class="wide">
    <img src="img/03-sbiadito.jpg" width="1920" height="804" alt="Pane duro, 1962: la spianata di Pietralata in un fotogramma sbiadito, tutto rosa. Una ragazza in un angolo guarda in macchina.">
    <div class="title">
      <h1>MAGENTA</h1>
      <div class="meta">Cortometraggio d'animazione · circa 11 minuti · 2.39:1 e 1.37:1 · italiano, sottotitoli inglesi</div>
      <p class="logline">{logline}</p>
    </div>
  </div>
</header>

<nav aria-label="Sezioni"><div class="wrap"><ul>
  <li><a href="#film">Il film</a></li>
  <li><a href="#immagini">Le immagini</a></li>
  <li><a href="#sceneggiatura">Sceneggiatura</a></li>
  <li><a href="#regia">Regia e fotografia</a></li>
</ul></div></nav>

<main>
<section id="film"><div class="wrap prose">
  <p class="eyebrow">Il film</p>
  {intro}
</div></section>

<section id="immagini"><div class="wide">
  <div class="wrap" style="padding-left:0;padding-right:0;margin-left:0">
    <p class="eyebrow">Le immagini</p>
    <h2>Sette tavole dipinte</h2>
    <p class="prose">Lo stesso pittorico di <i>A parte</i>: scene in 3D con corpi in posa, dipinte a olio a pennellate vorticose. Cambia la luce: ogni capitolo ha il colore di un'epoca del cinema.</p>
  </div>
  <div class="frames">
{frames}
  </div>
</div></section>

<section id="sceneggiatura"><div class="wrap">
  <p class="eyebrow">Sceneggiatura</p>
  <h2>Ventotto scene</h2>
  <div class="script">
    <p class="note">{note}</p>
{script}
  </div>
</div></section>

<section id="regia"><div class="wrap prose wide-table">
  <p class="eyebrow">Regia e fotografia</p>
  <h2>La grammatica di quattro secondi</h2>
  {regia}
</div></section>
</main>

<footer><div class="wrap">MAGENTA · soggetto, sceneggiatura, regia e fotografia · stile pittorico di <i>A parte</i></div></footer>
'''

if __name__ == '__main__':
    main()
