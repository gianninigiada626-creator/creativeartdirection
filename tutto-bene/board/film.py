"""FIN QUI TUTTO BENE, the film: five seconds of a fall from the fiftieth floor, opened up to four minutes. Every
shot rendered in 3D and painted eight times a second with the A PARTE painter, in black and white silver with
one red; the time cards typed on black as in La Haine; two slots for the real squares, to be cut in later.

    python3 film.py carte                the paper in the world: receipt, letter, the billboard's frames  → build/film/
    python3 film.py render [ids...]      render the 3D of the shots                                       → build/anim/s<id>/
    python3 film.py paint [ids...]       paint every drawing of the shots                                 → build/dipinti/<id>/
    python3 film.py cut [t0 t1]          composite, cards, subtitles, sound, encode                       → out/tutto-bene.mp4
    python3 film.py list                 the shots, their times, the total
"""
import os
import subprocess
import sys
import zlib
from functools import lru_cache
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

import pittura

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ANIM = os.path.join(ROOT, 'build', 'anim')
FILM = os.path.join(ROOT, 'build', 'film')
DRAW = os.path.join(ROOT, 'build', 'dipinti')
OUT = os.path.join(ROOT, 'out')
WORKERS = int(os.environ.get('WORKERS', 4))

FPS, DRAW_FPS = 24, 8
W, H = 1920, 1038   # 1.85:1, the whole frame


def L(a, b, it, en):
    return (a, b, it, en)


VOCI = os.path.join(ROOT, 'build', 'voci')   # the recorded voices (not in git): odio, agente, operatore, ragazzo, poesia


def V(name, at, src_from=0.0, src_to=None, tempo=1.0, fx=None, gain=0.82):
    """A recorded voice: file `name` from src_from to src_to (seconds), at time `at` of the shot."""
    return dict(name=name, at=at, src=(src_from, src_to), tempo=tempo, fx=fx, gain=gain)


# ── the shots ───────────────────────────────────────────────────────────────────────────────────
# kind: '3d' (rendered and painted) or 'card'. drop: when the red goes past the window (for the sound).
SHOTS = [
    # PROLOGO
    # the voice of La Haine (the Italian dub) tells the story in the black; it comes back in the fall, and at the end
    dict(id='01', dur=22, kind='card', card='nero', amb='vento_lontano', voice=[V('odio', 1.2, 0.0, 19.6)], lines=[
        L(1.8, 6.8, "Questa è la storia di un uomo che cade da un palazzo di cinquanta piani.", 'This is the story of a man who falls from a fifty-storey building.'),
        L(7.2, 11.9, "Mano a mano che, cadendo, passa da un piano all'altro, il tizio, per farsi coraggio, si ripete:", 'As he falls past one floor after another, the guy keeps telling himself, to keep his nerve:'),
        L(12.9, 14.4, 'Fino a qui tutto bene.', 'So far so good.'),
        L(15.1, 16.7, 'Fino a qui tutto bene.', 'So far so good.'),
        L(17.7, 20.6, 'Fino a qui tutto bene.', 'So far so good.')]),
    dict(id='02', dur=4, kind='card', card='titolo'),
    dict(id='03', dur=30, kind='card', card='archivio', label='LE PIAZZE DI QUESTI MESI', amb='piazza_vera'),
    # 06:11:58 · IL TETTO
    dict(id='c1', dur=1.6, kind='card', card='ora', text='06:11:58'),
    dict(id='04', dur=8.4, kind='3d', fps=8, look='argento', amb='tetto'),
    dict(id='05', dur=7, kind='3d', fps=8, look='argento', amb='tetto'),
    dict(id='06', dur=2, kind='3d', fps=8, look='argento', amb='tetto'),
    dict(id='07', dur=6, kind='3d', fps=8, look='argento', amb='tetto', gust=4.6),
    dict(id='08', dur=4, kind='3d', fps=8, look='argento', amb='tetto'),
    # 06:12:00 · LA CADUTA
    dict(id='c2', dur=1.6, kind='card', card='ora', text='06:12:00'),
    dict(id='09', dur=4.4, kind='3d', fps=8, look='argento', amb='caduta', voice=[V('odio', 1.3, 11.55, 13.15)], lines=[L(1.5, 3.2, 'Fino a qui tutto bene.', 'So far so good.')]),
    dict(id='10', dur=6, kind='3d', fps=8, look='interni', amb='attico', drop=3.4, voice=[V('agente', 0.3, fx='stanza')], lines=[
        L(0.3, 3.6, 'Classe A. Vista libera fino alle montagne.', 'Energy class A. Clear view all the way to the mountains.')]),
    dict(id='11', dur=4, kind='3d', fps=8, look='interni', amb='aspirapolvere', drop=2.2),
    dict(id='12', dur=4, kind='3d', fps=8, look='interni', amb='callcenter', drop=2.0, voice=[V('operatore', 0.1, tempo=1.12)], lines=[
        L(0.1, 3.9, "Buongiorno, la chiamo per un'offerta che non può rifiutare.", "Good morning, I'm calling about an offer you can't refuse.")]),
    dict(id='13', dur=2.5, kind='3d', fps=8, look='argento', amb='caduta', voice=[V('odio', 0.3, 13.75, 15.45)], lines=[L(0.5, 2.3, 'Fino a qui tutto bene.', 'So far so good.')]),
    dict(id='14', dur=5, kind='3d', fps=8, look='interni', amb='stanza', drop=1.6),
    dict(id='15', dur=8, kind='3d', fps=8, look='interni', amb='lavandino', drop=5.2, voice=[V('ragazzo', 2.7, fx='bagno')], lines=[
        L(0.3, 2.5, 'Mi servono cento euro in più. Al mese.', 'I need a hundred euros more. A month.'),
        L(2.7, 5.9, 'Mi servono. Dici a me? Dici a me?', 'I need them. You talking to me? You talking to me?')]),
    dict(id='16', dur=3.5, kind='3d', fps=8, look='interni', amb='scale', drop=1.3, ping=0.4),
    dict(id='17', dur=3.5, kind='3d', fps=8, look='interni', amb='tv_muta', drop=1.4),
    dict(id='18', dur=5, kind='3d', fps=8, look='interni', amb='cucina', drop=3.3, coins=(0.2, 1.4)),
    # 06:12:02 · SOSPESO
    dict(id='c3', dur=1.6, kind='card', card='ora', text='06:12:02'),
    # the man speaks once, when time stops: close, dry, an Italian learnt elsewhere
    dict(id='19', dur=34.5, kind='3d', fps=4, look='sospeso', amb='sospeso', voice=[V('poesia', 2.0, gain=1.0)], lines=[
        L(2.0, 5.4, 'Ho costruito i piani che non abiterò.', 'I built the floors I will never live on.'),
        L(5.7, 8.0, 'Ho messo il vetro dove guarderanno gli altri,', 'I put in the glass the others will look through,'),
        L(8.3, 11.2, 'il marmo dove cammineranno i figli degli altri.', "the marble the others' children will walk on."),
        L(12.3, 17.0, "Il cemento, come il pane, ha l'odore di chi lo impasta e non lo mangia.", 'Cement, like bread, smells of the hands that knead it and never eat it.'),
        L(17.7, 21.7, 'Città, ti conosco dal basso.', 'City, I know you from below.'),
        L(22.0, 26.9, "Ti ho vista dai ponteggi all'alba, quando i ricchi dormono e i poveri sono già stanchi.", "I've seen you from the scaffolding at dawn, when the rich are asleep and the poor are already tired."),
        L(27.3, 32.4, 'Non chiedo di non cadere. Chiedo che qualcuno, laggiù, alzi la testa.', "I'm not asking not to fall. I'm asking that someone, down there, lift their head.")]),
    # 06:12:03 · CHI GUARDA
    dict(id='c4', dur=1.3, kind='card', card='ora', text='06:12:03'),
    dict(id='20', dur=2.3, kind='3d', fps=8, look='argento', amb='caduta', voice=[V('odio', 0.2, 11.55, 13.15)], lines=[L(0.4, 2.1, 'Fino a qui tutto bene.', 'So far so good.')]),
    dict(id='21', dur=3, kind='3d', fps=8, look='interni', amb='cucina', drop=0.9, run=1.5),
    dict(id='22', dur=3, kind='3d', fps=8, look='interni', amb='preghiera', drop=1.0),
    dict(id='23a', dur=3, kind='3d', fps=8, look='interni', amb='stanza', drop=1.1, cassa=0.8),
    dict(id='23b', dur=6, kind='3d', fps=8, look='argento', amb='cortile'),
    dict(id='24', dur=2, kind='3d', fps=8, look='interni', amb='cucina', drop=0.5, pen=1.0),
    dict(id='25', dur=3, kind='3d', fps=8, look='interni', amb='sfratto', drop=0.9),
    dict(id='26', dur=3, kind='3d', fps=8, look='argento', amb='coro', voice=[V('odio', 0.05, 16.35, 19.6)], lines=[L(0.3, 2.95, 'Fino a qui tutto bene.', 'So far so good.')]),
    # 06:12:05 · L'ATTERRAGGIO
    dict(id='c5', dur=1.1, kind='card', card='ora', text='06:12:05'),
    dict(id='27', dur=10.5, kind='3d', fps=8, look='argento', amb='piazza'),
    dict(id='28', dur=6, kind='3d', fps=8, look='argento', amb='piazza', spray=True, screens={'cartellone': 'cartellone'}),
    dict(id='29', dur=3, kind='3d', fps=8, look='argento', amb='piazza'),
    dict(id='30', dur=12, kind='card', card='nero', voice=[V('odio', 1.4, 20.0, 25.8)], lines=[
        L(1.8, 7.0, "Il problema non è la caduta, ma l'atterraggio.", "The problem isn't the fall. It's the landing.")]),
    dict(id='31', dur=31, kind='card', card='titoli', amb='piazza_vera'),
]
for _s in SHOTS:
    if _s['id'] == '14':
        _s['screens'] = {'ricevuta': 'ricevuta'}
    if _s['id'] == '21':
        _s['screens'] = {'lettera': 'lettera'}
BY_ID = {s['id']: s for s in SHOTS}


def timeline():
    t, out = 0.0, []
    for s in SHOTS:
        out.append((t, s))
        t += s['dur']
    return out, t


# ── the paper in the world ──────────────────────────────────────────────────────────────────────
FONT_SANS = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
FONT_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_DV = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_ITAL = '/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf'
FONT_TYPE = '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf'
FONT_MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
RED = (219, 26, 18)


@lru_cache(maxsize=None)
def font(path, size):
    return ImageFont.truetype(path, size)


def ricevuta():
    im = Image.new('RGB', (500, 300), (242, 239, 230))
    d = ImageDraw.Draw(im)
    d.text((30, 26), 'RICEVUTA N. 0412', font=font(FONT_MONO, 26), fill=(60, 60, 60))
    d.text((30, 90), 'POSTO LETTO', font=font(FONT_MONO, 52), fill=(20, 20, 20))
    d.text((30, 170), '700,00 €', font=font(FONT_MONO, 64), fill=(20, 20, 20))
    d.text((30, 255), 'OTTOBRE · IN CONTANTI', font=font(FONT_MONO, 22), fill=(80, 80, 80))
    im.save(os.path.join(FILM, 'ricevuta.jpg'), quality=94)


def lettera():
    im = Image.new('RGB', (420, 600), (242, 239, 230))
    d = ImageDraw.Draw(im)
    d.text((34, 40), 'OGGETTO:', font=font(FONT_DV, 22), fill=(60, 60, 60))
    d.text((34, 76), 'LICENZIAMENTO', font=font(FONT_BOLD, 40), fill=(20, 20, 20))
    d.text((34, 126), 'COLLETTIVO', font=font(FONT_BOLD, 40), fill=(20, 20, 20))
    r = np.random.default_rng(4)
    for y in range(210, 540, 24):
        d.rectangle([34, y, 34 + int(250 + r.random() * 100), y + 6], fill=(90, 90, 90))
    im.save(os.path.join(FILM, 'lettera.jpg'), quality=94)


# the billboard: the V of VOSTRO painted over with an N, in red (the strokes match the boy's arm in the 3D:
# N_STROKES in engine3d/film.js, in billboard pixels)
N_STROKES = [(2.0, 2.8, (236, 384), (236, 236)), (2.8, 3.7, (236, 236), (330, 384)), (3.7, 4.5, (330, 384), (330, 236))]


def cartellone_base():
    im = Image.new('RGB', (1600, 600), (242, 240, 234))
    d = ImageDraw.Draw(im)
    f = font(FONT_BOLD, 150)
    d.text((70, 210), 'IL FUTURO', font=f, fill=(26, 26, 28), anchor='ls')
    d.text((70, 380), 'È VOSTRO', font=f, fill=(26, 26, 28), anchor='ls')
    d.text((74, 520), 'RESIDENZE AURORA · ATTICI IN CLASSE A', font=font(FONT_DV, 46), fill=(26, 26, 28), anchor='ls')
    d.rectangle([1180, 40, 1520, 560], fill=(154, 162, 170))
    for y in range(60, 540, 26):
        d.rectangle([1200, y, 1500, y + 14], fill=(200, 204, 210))
    return np.asarray(im).astype(np.float32) / 255


def spray(base, t, seed=5):
    """Red spray paint along the strokes drawn by time t: a soft core, the overspray, the drips."""
    h, w = base.shape[:2]
    m = np.zeros((h, w), np.float32)
    r = np.random.default_rng(seed)
    drips = []
    for k, (t0, t1, a, b) in enumerate(N_STROKES):
        if t <= t0:
            break
        u = min(1.0, (t - t0) / (t1 - t0))
        n = int(60 * u) + 1
        for i in range(n):
            q = i / 60
            x = a[0] + (b[0] - a[0]) * q
            y = a[1] + (b[1] - a[1]) * q
            cv2.circle(m, (int(x + r.normal(0, 1.2)), int(y + r.normal(0, 1.2))), int(15 + r.normal(0, 1.5)), 1.0, -1, cv2.LINE_AA)
        # where the can stopped, the paint runs down
        if u >= 1:
            for _ in range(3):
                drips.append((b[0] + r.normal(0, 12), max(a[1], b[1]) - r.random() * 140, t1, 20 + r.random() * 60))
    for x, y, td, ln in drips:
        grow = min(1.0, max(0.0, (t - td) / 1.2))
        if grow > 0:
            cv2.line(m, (int(x), int(y)), (int(x), int(y + ln * grow)), 1.0, 3, cv2.LINE_AA)
            cv2.circle(m, (int(x), int(y + ln * grow)), 3, 1.0, -1, cv2.LINE_AA)
    core = cv2.GaussianBlur(m, (0, 0), 1.6)
    over = cv2.GaussianBlur(m, (0, 0), 9) * 0.35
    speck = (r.random((h, w)) < 0.02).astype(np.float32) * cv2.GaussianBlur(m, (0, 0), 22) * 2
    a = np.clip(core + over + speck, 0, 1)[..., None]
    return base * (1 - a) + np.float32(RED) / 255 * a


def cartellone_path(t):
    """The billboard as it is at time t of shot 28 (one picture per drawing)."""
    i = int(round(t * DRAW_FPS))
    return os.path.join(FILM, 'cartellone', f'a{i:04d}.jpg')


def carte():
    os.makedirs(os.path.join(FILM, 'cartellone'), exist_ok=True)
    ricevuta()
    lettera()
    base = cartellone_base()
    for i in range(int(BY_ID['28']['dur'] * DRAW_FPS) + 1):
        t = i / DRAW_FPS
        img = spray(base, t)
        cv2.imwrite(cartellone_path(t), cv2.cvtColor((img * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 93])
    print('carte', flush=True)


def screen_paths(s, t):
    out = {}
    for name, src in (s.get('screens') or {}).items():
        out[name] = cartellone_path(t) if src == 'cartellone' else os.path.join(FILM, f'{src}.jpg')
    return out


# ── the 3D shots: render, paint ─────────────────────────────────────────────────────────────────
def renders(s):
    return max(1, round(s['dur'] * s['fps'])), s['fps']


def render(ids):
    for s in SHOTS:
        if s['kind'] != '3d' or (ids and s['id'] not in ids):
            continue
        n, fps = renders(s)
        d = os.path.join(ANIM, 's' + s['id'])
        if os.path.exists(os.path.join(d, 'meta.json')) and len([f for f in os.listdir(d) if f.endswith('-color.png')]) >= n:
            print('have', s['id'], flush=True)
            continue
        subprocess.run(['rm', '-rf', d])
        subprocess.run(['node', os.path.join(ROOT, 'engine3d', 'anim.mjs'), ANIM, 's' + s['id'], str(s['dur']), str(fps)], check=True)


@lru_cache(maxsize=None)
def exposure(sid):
    """The floors are lit by different lamps: bring each one's first frame to the same middle grey."""
    s = BY_ID[sid]
    if s['look'] != 'interni':
        return 1.0
    im = cv2.imread(os.path.join(ANIM, 's' + sid, 'f0000-color.png'))
    y = float((im[..., ::-1].astype(np.float32) / 255 @ pittura.LUMA).mean())
    return float(np.clip(0.33 / max(y, 1e-3), 0.62, 1.25))


def _paint(job):
    sid, i = job
    s = BY_ID[sid]
    out = os.path.join(DRAW, sid, f'a{i:04d}.jpg')
    if os.path.exists(out):
        return out
    n, fps = renders(s)
    r = min(n - 1, int(i * fps / DRAW_FPS))
    look = s['look']
    ex = exposure(sid)
    if ex != 1.0:
        L = dict(pittura.LOOKS[look])
        L['gain'] = L['gain'] * ex
        pittura.LOOKS[f'{look}@{sid}'] = L
        look = f'{look}@{sid}'
    grain = zlib.crc32(f'{sid}-{i}'.encode())
    img = pittura.painting(os.path.join(ANIM, 's' + sid), f'f{r:04d}', look, seed=1 + i % 3, screens=screen_paths(s, i / DRAW_FPS), grain=grain)
    pittura.save(img, out)
    return out


def paint(ids):
    jobs = []
    for s in SHOTS:
        if s['kind'] != '3d' or (ids and s['id'] not in ids):
            continue
        os.makedirs(os.path.join(DRAW, s['id']), exist_ok=True)
        jobs += [(s['id'], i) for i in range(int(round(s['dur'] * DRAW_FPS)))]
    jobs = [j for j in jobs if not os.path.exists(os.path.join(DRAW, j[0], f'a{j[1]:04d}.jpg'))]
    if os.environ.get('REVERSE'):
        jobs = jobs[::-1]
    print('to paint', len(jobs), flush=True)
    with Pool(WORKERS) as p:
        for k, _ in enumerate(p.imap_unordered(_paint, jobs, chunksize=2)):
            if k % 40 == 0:
                print('painted', k, '/', len(jobs), flush=True)
    print('paintings done', len(jobs), flush=True)


# ── the cut ─────────────────────────────────────────────────────────────────────────────────────
@lru_cache(maxsize=64)
def load(path):
    im = cv2.imread(path)
    return None if im is None else cv2.cvtColor(im, cv2.COLOR_BGR2RGB)


def typed(d, txt, t, cps, xy, f, fill, anchor='mm'):
    """Text as a typewriter writes it: one character every 1/cps seconds."""
    n = max(0, min(len(txt), int(t * cps)))
    full = d.textbbox(xy, txt, font=f, anchor=anchor)
    if n:
        d.text((full[0], xy[1]), txt[:n], font=f, fill=fill, anchor='lm')
    return n


ORA_CPS = 9.0


def card(s, t, j):
    pil = Image.new('RGB', (W, H), (0, 0, 0))
    d = ImageDraw.Draw(pil)
    c = s['card']
    if c == 'ora':
        # the time, typed in white on black, as the hours of La Haine
        typed(d, s['text'], t - 0.15, ORA_CPS, (W / 2, H / 2), font(FONT_TYPE, 64), (236, 236, 232))
    elif c == 'titolo':
        typed(d, 'FIN QUI TUTTO BENE', t - 0.2, 14, (W / 2, H / 2 - 10), font(FONT_TYPE, 70), (240, 240, 236))
        if t > 2.0:
            a = min(1, (t - 2.0) / 0.6)
            g = int(150 * a)
            d.text((W / 2, H / 2 + 62), 'SO FAR, SO GOOD', font=font(FONT_TYPE, 26), fill=(g, g, g), anchor='mm')
    elif c == 'archivio':
        # the slot for the real squares: an editor's placeholder, timed
        g = (70, 70, 70)
        d.rectangle([60, 50, W - 60, H - 50], outline=g, width=2)
        d.text((W / 2, H / 2 - 40), 'ARCHIVIO', font=font(FONT_TYPE, 44), fill=(170, 170, 166), anchor='mm')
        d.text((W / 2, H / 2 + 16), s.get('label', ''), font=font(FONT_TYPE, 26), fill=(120, 120, 118), anchor='mm')
        d.text((W / 2, H / 2 + 56), 'materiale reale, da montare', font=font(FONT_TYPE, 22), fill=(90, 90, 88), anchor='mm')
        sec = int(t)
        d.text((W - 90, H - 80), f'00:{sec:02d} / 00:{int(s["dur"]):02d}', font=font(FONT_TYPE, 22), fill=(110, 110, 108), anchor='rm')
    elif c == 'titoli':
        return titoli(pil, d, s, t)
    return np.asarray(pil)


CREDITS = [
    (0.5, 5.5, ['FIN QUI TUTTO BENE', 'SO FAR, SO GOOD']),
    (6.0, 11.0, ['La frase è di «L\'odio» (La Haine)', 'di Mathieu Kassovitz, 1995. Un omaggio.']),
    (11.5, 16.5, ['I versi della voce sono originali,', 'alla maniera delle poesie civili di Pier Paolo Pasolini.']),
    (17.0, 21.5, ['Dopo Bruegel, «Paesaggio con la caduta di Icaro».']),
    (22.0, 26.0, ['Dipinto con il pittore di A PARTE', 'Voci, musica e suono provvisori']),
]


def titoli(pil, d, s, t):
    """The end titles over the slot for the real footage; last, the dedication alone."""
    d.text((80, 70), 'ARCHIVIO SOTTO I TITOLI · materiale reale, da montare', font=font(FONT_TYPE, 18), fill=(70, 70, 68))
    for a, b, rows in CREDITS:
        if a <= t < b:
            al = max(0, min(1, (t - a) / 0.6, (b - t) / 0.6))
            y = H / 2 - (len(rows) - 1) * 26
            for k, r in enumerate(rows):
                big = k == 0 and rows[0].isupper()
                f = font(FONT_TYPE, 44 if big else 30)
                g = int((236 if big else 200) * al)
                d.text((W / 2, y), r, font=f, fill=(g, g, g), anchor='mm')
                y += 60 if big else 46
    if t >= 26.5:
        al = max(0, min(1, (t - 26.5) / 0.8, (s['dur'] - t) / 0.8))
        g = int(240 * al)
        d.rectangle([0, 0, W, H], fill=(0, 0, 0))
        d.text((W / 2, H / 2 - 30), 'A CHI CADE OGNI GIORNO.', font=font(FONT_TYPE, 46), fill=(g, g, g), anchor='mm')
        d.text((W / 2, H / 2 + 34), 'E A CHI È SOTTO.', font=font(FONT_TYPE, 46), fill=(g, g, g), anchor='mm')
    return np.asarray(pil)


def picture(s, t, j):
    i = int(t * DRAW_FPS)
    if s['kind'] == '3d':
        n = int(round(s['dur'] * DRAW_FPS))
        img = load(os.path.join(DRAW, s['id'], f'a{min(i, n - 1):04d}.jpg'))
        if img is None:
            return np.zeros((H, W, 3), np.uint8)
        # the light of the print trembles a little
        return np.clip(img.astype(np.float32) * (0.97 + 0.05 * np.random.default_rng(j).random()), 0, 255).astype(np.uint8)
    return card(s, t, j)


def subtitles(frame, s, t):
    for a, b, it, en in s.get('lines', []):
        if a <= t < b:
            al = min(1, (t - a) / 0.15, (b - t) / 0.15)
            pil = Image.fromarray(frame)
            # a soft dark bed under the words, so they read on white walls as on black
            bed = Image.new('L', (W, H), 0)
            bd = ImageDraw.Draw(bed)
            f1, f2 = font(FONT_SANS, 36), font(FONT_ITAL, 27)
            y0 = H - 128
            w1 = bd.textlength(it, font=f1)
            w2 = bd.textlength(en, font=f2)
            bd.rectangle([(W - max(w1, w2)) / 2 - 30, y0 - 14, (W + max(w1, w2)) / 2 + 30, y0 + 92], fill=int(140 * al))
            bed = bed.filter(ImageFilter.GaussianBlur(22))
            pil = Image.composite(Image.new('RGB', (W, H), (0, 0, 0)), pil, bed)
            d = ImageDraw.Draw(pil)
            d.text(((W - w1) / 2, y0), it, font=f1, fill=tuple(int(c * al) for c in (244, 242, 236)), stroke_width=1, stroke_fill=(0, 0, 0))
            d.text(((W - w2) / 2, y0 + 50), en, font=f2, fill=tuple(int(c * al) for c in (214, 212, 207)), stroke_width=1, stroke_fill=(0, 0, 0))
            return np.asarray(pil)
    return frame


def frame_at(T, tl, j):
    live = [(st, s) for st, s in tl if st <= T < st + s['dur']]
    if not live:
        return np.zeros((H, W, 3), np.uint8)
    st, s = live[-1]
    return subtitles(picture(s, T - st, j), s, T - st)


def cut(t0=0.0, t1=None, out=None):
    tl, total = timeline()
    t1 = total if t1 is None else t1
    os.makedirs(OUT, exist_ok=True)
    out = out or os.path.join(OUT, 'tutto-bene.mp4')
    audio = os.path.join(ROOT, 'build', 'suono.wav')
    if os.path.exists(audio) and t1 - t0 > 1:
        a_in = ['-ss', f'{t0:.3f}', '-t', f'{t1 - t0:.3f}', '-i', audio]
    else:
        a_in = ['-f', 'lavfi', '-t', f'{t1 - t0:.3f}', '-i', 'anullsrc=r=48000:cl=stereo']
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', *a_in,
           '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-tune', 'grain', '-pix_fmt', 'yuv420p',
           '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n = int(round((t1 - t0) * FPS))
    for k in range(n):
        j = int(round(t0 * FPS)) + k
        p.stdin.write(frame_at(j / FPS, tl, j).tobytes())
        if k % 480 == 0:
            print('cut', f'{j / FPS:.0f}s', '/', f'{t1:.0f}s', flush=True)
    p.stdin.close()
    p.wait()
    print(out, flush=True)


def listing():
    tl, total = timeline()
    for st, s in tl:
        print(f"{s['id']:>3}  {int(st // 60)}:{st % 60:04.1f}  {s['dur']:>5}s  {s['kind']:<5} {s.get('look', s.get('card', ''))}")
    print(f'total {int(total // 60)}:{total % 60:04.1f}')
    n3 = sum(round(s['dur'] * DRAW_FPS) for s in SHOTS if s['kind'] == '3d')
    nr = sum(renders(s)[0] for s in SHOTS if s['kind'] == '3d')
    print('paintings', n3, ' renders', nr)


if __name__ == '__main__':
    cmd, args = (sys.argv[1] if len(sys.argv) > 1 else ''), sys.argv[2:]
    if cmd == 'carte':
        carte()
    elif cmd == 'render':
        render(args)
    elif cmd == 'paint':
        paint(args)
    elif cmd == 'cut':
        cut(*(float(a) for a in args[:2])) if args else cut()
    elif cmd == 'list':
        listing()
    else:
        print(__doc__)
