"""The page of MAGENTA: the faded frame on a dark screen, the film in a few paragraphs, the style frames, the
screenplay set as a screenplay (Courier, the English subtitles under each line), the director's notes.

    python3 pagina.py   → out/web/index.html, out/web/img/*.jpg
"""
import html
import json
import os
import re
import subprocess

import cv2

import film

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


FILM_MP4 = os.path.join(ROOT, 'out', 'magenta.mp4')
# the chapters the page plays, by shot: each under 65 seconds, so at 1.6 Mbit/s each file stays under 15 MB
CHAPTERS = [('Prologo', 'Il proiettore', '01', '04'), ('I · Le bobine', "L'archivio, il tavolo luminoso", '05', '07'),
            ('II · Ada', 'Hai mai fatto del cinema?', '08', '10'), ('II · Ada', 'Le mani bianche', '11', '13'),
            ('III · Novantasei fotogrammi', 'Il ciano', '14', '16'), ('III · Novantasei fotogrammi', 'Il giallo, il verde', '17', '19'),
            ('III · Novantasei fotogrammi', 'La strada, la notte', '20', '22'), ('IV · Il ciak', 'Fotogramma per fotogramma', '23', '25'),
            ("V · L'anello", 'Il proiettore si accende', '26', '27'), ("V · L'anello", 'Chi sta guardando?', '28', '28'),
            ("V · L'anello", 'Nino', '29', '30'), ('Epilogo', 'Il letto vuoto, la scatola', '31', '32'), ('Epilogo', "L'alba", '33', '35')]
VBIT = 1600   # kbit/s, the chapters
WBIT = 1300   # kbit/s, the whole film


def enc(src, out, t0=None, t1=None, kbit=1600):
    """1280×720, two passes at a set bitrate: the size is known before the file exists."""
    cut = ['-ss', f'{t0:.3f}', '-to', f'{t1:.3f}'] if t0 is not None else []
    log = os.path.join(ROOT, 'build', 'x264-pass')
    common = ['-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-b:v', f'{kbit}k', '-pix_fmt', 'yuv420p', '-passlogfile', log]
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *cut, '-i', src, *common, '-pass', '1', '-an', '-f', 'mp4', '/dev/null'], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *cut, '-i', src, *common, '-pass', '2', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out], check=True)


def tc(sec):
    return f'{int(sec // 60)}:{int(round(sec % 60)):02d}'


def media():
    """The film for the page: chapters that play (1280×720, each under 15 MB), and the whole film in byte pieces for the download."""
    if not os.path.exists(FILM_MP4):
        return [], [], 0
    tl, total = film.timeline()
    start = {s['id']: st for st, s in tl}
    end = {s['id']: st + s['dur'] for st, s in tl}
    vdir, fdir = os.path.join(WEB, 'video'), os.path.join(WEB, 'film')
    os.makedirs(vdir, exist_ok=True)
    os.makedirs(fdir, exist_ok=True)
    chapters = []
    for i, (name, sub, a, b) in enumerate(CHAPTERS):
        t0, t1 = start[a], min(end[b], total)
        out = os.path.join(vdir, f'capitolo-{i + 1}.mp4')
        if not os.path.exists(out):
            enc(FILM_MP4, out, t0, t1, VBIT)
        chapters.append(dict(src=f'video/capitolo-{i + 1}.mp4', file=f'magenta-{i + 1}.mp4', name=name, sub=sub, start=tc(t0), dur=tc(t1 - t0), size=os.path.getsize(out)))
        print('chapter', i + 1, os.path.getsize(out), flush=True)
    whole = os.path.join(ROOT, 'build', 'magenta-720p.mp4')
    if not os.path.exists(whole):
        enc(FILM_MP4, whole, kbit=WBIT)
    for f in os.listdir(fdir):
        os.remove(os.path.join(fdir, f))
    data = open(whole, 'rb').read()
    step = 14_500_000
    pieces = []
    for k in range(0, len(data), step):
        p = f'film/pezzo-{k // step + 1}.mp4'
        open(os.path.join(WEB, p), 'wb').write(data[k:k + step])
        pieces.append(p)
    return chapters, pieces, len(data)


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
    chapters, pieces, size = media()
    _, total = film.timeline()
    if chapters:
        btns = ''.join(f'<button type="button" class="ch" data-i="{i}"><b>{esc(c["name"])}</b><span>{esc(c["sub"])}</span><small>{c["start"]} · {c["dur"]}</small></button>' for i, c in enumerate(chapters))
        player = PLAYER.replace('%BTNS%', btns).replace('%SRCS%', json.dumps([c['src'] for c in chapters]))
        mb = lambda n: f'{n / 1e6:.0f}'
        downloads = DOWNLOADS.replace('%WHOLE%', json.dumps(dict(file='MAGENTA.mp4', pieces=pieces))).replace('%SIZE%', f'{mb(size)} MB').replace('%DUR%', tc(total))
    else:
        player = '<img src="img/03-sbiadito.jpg" width="1920" height="804" alt="Pane duro, 1962: la spianata di Pietralata in un fotogramma sbiadito, tutto rosa.">'
        downloads = ''
    page = TEMPLATE.format(logline=inline(logline), intro=prose(intro), frames=frames(), note=inline(note), script=script, regia=regia,
                           player=player, downloads=downloads, minutes=tc(total))
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

/* the film: the player on the dark screen, the chapters under it like reels */
.player video {{ display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; background: #000; }}
.chapters {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(9.6rem, 1fr)); gap: .5rem; margin-top: .9rem; }}
.ch {{ display: grid; gap: .15rem; text-align: left; padding: .65rem .75rem; background: transparent; color: var(--screen-ink); border: 1px solid #3a2f36; cursor: pointer; font: 400 .8rem/1.3 var(--label); }}
.ch b {{ font-weight: 600; letter-spacing: .08em; text-transform: uppercase; font-size: .72rem; }}
.ch small {{ color: #8f8389; font-variant-numeric: tabular-nums; }}
.ch[aria-current="true"] {{ border-color: #ff4fa8; color: #fff; }}
.ch:hover, .ch:focus-visible {{ border-color: #ff4fa8; outline: none; }}
.player .hint {{ margin: .8rem 0 0; font: 400 .8rem/1.5 var(--label); color: #8f8389; letter-spacing: .03em; }}
.downloads .dl {{ display: inline-grid; gap: .2rem; padding: .8rem 1rem; border: 1px solid var(--magenta); background: transparent; color: var(--ink); cursor: pointer; font: 400 .9rem/1.3 var(--label); text-align: left; }}
.downloads .dl b {{ letter-spacing: .1em; text-transform: uppercase; font-size: .78rem; }}
.downloads .dl small {{ color: var(--muted); font-variant-numeric: tabular-nums; }}
.downloads .dl[data-state="busy"] {{ opacity: .7; cursor: progress; }}
.dl-note {{ min-height: 1.4em; margin: .8rem 0 0; font: 400 .85rem/1.4 var(--label); color: var(--muted); }}
.dl-only {{ display: none; }}
:root[data-dl] .dl-only {{ display: block; }}

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
    {player}
    <div class="title">
      <h1>MAGENTA</h1>
      <div class="meta">Cortometraggio d'animazione · {minutes} · 2.39:1 e 1.37:1 · italiano, sottotitoli inglesi</div>
      <p class="logline">{logline}</p>
    </div>
  </div>
</header>

<nav aria-label="Sezioni"><div class="wrap"><ul>
  <li><a href="#film">Il film</a></li>
  <li><a href="#scarica">Scarica</a></li>
  <li><a href="#immagini">Le immagini</a></li>
  <li><a href="#sceneggiatura">Sceneggiatura</a></li>
  <li><a href="#regia">Regia e fotografia</a></li>
</ul></div></nav>

<main>
<section id="film"><div class="wrap prose">
  <p class="eyebrow">Il film</p>
  {intro}
</div></section>

{downloads}

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


PLAYER = r'''<div class="player">
      <video id="film" controls playsinline preload="metadata" poster="img/03-sbiadito.jpg"></video>
      <div class="chapters" role="group" aria-label="Capitoli">%BTNS%</div>
      <p class="hint">Primo montaggio. Le voci non sono ancora registrate: le battute sono nei sottotitoli, il suono è provvisorio. I capitoli si susseguono da soli.</p>
    </div>
    <script>
    (() => {
      const srcs = %SRCS%;
      const v = document.getElementById('film');
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

DOWNLOADS = r'''<section class="downloads dl-only" id="scarica" aria-labelledby="dl-h"><div class="wrap">
  <p class="eyebrow" id="dl-h">Scarica</p>
  <p>Il film intero, 1280×720, con i sottotitoli e il suono provvisorio. Un unico file mp4.</p>
  <button type="button" class="dl" id="dl-whole"><b>MAGENTA</b><small>%DUR% · mp4 · %SIZE%</small></button>
  <p class="dl-note" id="dl-note" role="status" aria-live="polite"></p>
</div></section>
<script>
(() => {
  const WHOLE = %WHOLE%;
  const note = document.getElementById('dl-note');
  const btn = document.getElementById('dl-whole');
  const say = (t) => { note.textContent = t; };
  let cap = null;
  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('downloads').then((c) => { cap = c; if (c) document.documentElement.dataset.dl = 'cap'; }, () => {});
  }
  const MSG = {
    declined: 'Download annullato.',
    rate_limited: "C'è già una richiesta di download aperta: confermala o chiudila, poi riprova.",
    too_large: 'File troppo grande per questo dispositivo: guarda il film qui sopra, capitolo per capitolo.',
  };
  const small = btn.querySelector('small');
  const was = small.textContent;
  btn.addEventListener('click', async () => {
    if (!cap || btn.dataset.state === 'busy') return;
    btn.dataset.state = 'busy';
    say('');
    try {
      // the film travels in pieces; joined back in order they are the original file, byte for byte
      const parts = [];
      for (const src of WHOLE.pieces) {
        small.textContent = `scarico ${Math.round(parts.length / WHOLE.pieces.length * 100)}%…`;
        const r = await fetch(src);
        if (!r.ok) throw new Error(String(r.status));
        parts.push(await r.blob());
      }
      small.textContent = 'pronto';
      await cap.save({ filename: WHOLE.file, data: new Blob(parts, { type: 'video/mp4' }) });
      say(`${WHOLE.file}: fatto.`);
    } catch (e) {
      const code = e && e.code;
      say(MSG[code] || (code ? 'Il download non è disponibile qui.' : 'Non sono riuscito a preparare il file: riprova.'));
    } finally {
      delete btn.dataset.state;
      small.textContent = was;
    }
  });
})();
</script>'''


if __name__ == '__main__':
    main()
