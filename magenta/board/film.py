"""MAGENTA, the film: every shot rendered in 3D, painted eight times a second with the A PARTE painter, cut
with a temp sound track and the subtitles in the black bars.

    python3 film.py presa                paint the 1962 take in each of its looks   → build/film/<seq>-<look>/f####.jpg
    python3 film.py render [ids...]      render the 3D of the shots                 → build/anim/s<id>/
    python3 film.py paint [ids...]       paint every drawing of the shots           → build/dipinti/<id>/a####.jpg
    python3 film.py cut                  composite, subtitles, sound, encode        → out/magenta.mp4
    python3 film.py list                 the shots, their times, the total
"""
import json
import os
import subprocess
import sys
from functools import lru_cache
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import pittura

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ANIM = os.path.join(ROOT, 'build', 'anim')
FILM = os.path.join(ROOT, 'build', 'film')
DRAW = os.path.join(ROOT, 'build', 'dipinti')
OUT = os.path.join(ROOT, 'out')
WORKERS = int(os.environ.get('WORKERS', 4))

FPS, DRAW_FPS = 24, 8
W, H, PIC_H = 1920, 1080, 804
BAR = (H - PIC_H) // 2
ACAD = int(round(PIC_H * 1.37))

# ── the take: 96 frames, rendered at 8 a second (32 drawings, each three frames of the take) ──────
TAKE_LOOKS = {'presa': ['sbiadito', 'restauro1', 'restauro2', 'eastman'], 'presaCu': ['sbiadito', 'eastman']}
HOLD = [('presa', 'eastman', 31), ('presaCu', 'eastman', 31)]   # held at the end: painted three times, so it breathes


def take_frame(seq, look, i, var=0):
    return os.path.join(FILM, f'{seq}-{look}', f'f{i:04d}' + ('' if not var else f'-{var}') + '.jpg')


def loop(start=5, speed=1.0):
    """The take going round as a loop, from `start` (after the slate)."""
    return lambda t: start + int(t * DRAW_FPS * speed) % (32 - start)


def steps(keys):
    """Frame by frame: (time, drawing) pairs, each held until the next."""
    def f(t):
        d = keys[0][1]
        for tk, dk in keys:
            if t >= tk:
                d = dk
        return d
    return f


# ── the shots ───────────────────────────────────────────────────────────────────────────────────
# kind: '3d' (rendered and painted), 'take' (the 1962 film on the whole screen, 1.37), 'insert' (the take on
# the restorer's monitor, with its frame counter), 'card'. lines: (start, end, Italian, English).
def L(a, b, it, en):
    return (a, b, it, en)


SHOTS = [
    # PROLOGO
    dict(id='01', dur=12, kind='3d', fps=8, look='nitrato', amb='proiettore'),
    dict(id='02', dur=6, kind='card', card='coda', amb='proiettore'),
    dict(id='03', dur=36, kind='take', seq='presa', look='sbiadito', frames=loop(5), grain=True, amb='proiettore', lines=[
        L(3, 7.5, 'Il magenta non esiste.', "Magenta doesn't exist."),
        L(9, 14.5, "Non è nell'arcobaleno. Non c'è una luce che sia magenta.", "It isn't in the rainbow. There is no light that is magenta."),
        L(16.5, 21.5, "Quando all'occhio arrivano il rosso e il blu, e manca il verde che sta in mezzo,", 'When the eye gets red and blue, and the green between them is missing,'),
        L(21.7, 26.5, 'il cervello chiude il cerchio da solo. Inventa un colore.', 'the brain closes the circle on its own. It invents a colour.'),
        L(28.5, 34, 'Il magenta è quello che vediamo al posto di quello che manca.', "Magenta is what we see in place of what's missing.")]),
    dict(id='04', dur=6, kind='card', card='titolo'),
    # I · LE BOBINE
    dict(id='05', dur=24, kind='3d', fps=8, look='imbibizione', amb='archivio', lines=[
        L(3, 7.5, 'Ogni tanto, quando chiude un magazzino, arrivano scatole come queste.', 'Every now and then, when a warehouse closes, boxes like these arrive.'),
        L(7.7, 10.8, 'Film che nessuno ha mai visto.', 'Films nobody has ever seen.'),
        L(13, 17.5, "Sanno di aceto. È la pellicola che si mangia da sola.", "They smell of vinegar. It's the film eating itself."),
        L(17.7, 21.5, "La chiamiamo sindrome dell'aceto.", 'We call it vinegar syndrome.')]),
    dict(id='06', dur=12, kind='3d', fps=8, look='tavolo', amb='laboratorio', screens={f'striscia{i}': ('presa', 'sbiadito', (lambda i: lambda t: (3 + i) % 32)(i)) for i in range(40)}),
    dict(id='07', dur=6, kind='insert', seq='presaCu', look='sbiadito', frames=lambda t: min(28, 10 + int(max(0, t - 0.5) * 8 * 0.42)), amb='laboratorio'),
    # II · ADA
    dict(id='08', dur=8, kind='3d', fps=8, look='deserto', fade=0, amb='stanza'),
    dict(id='09', dur=30, kind='3d', fps=4, look='deserto', fade=0, amb='stanza', lines=[
        L(2, 5.5, 'Mamma. Hai mai fatto del cinema?', 'Mum. Were you ever in the movies?'),
        L(7, 8.8, 'Io?', 'Me?'),
        L(10, 15.5, 'Al cinema ci andavamo la domenica. Il cinema lo facevano gli altri.', 'We went to the movies on Sundays. Making them was for other people.'),
        L(18, 21.5, 'Pietralata. Nel sessantadue.', 'Pietralata. In sixty-two.')]),
    dict(id='10', dur=16, kind='3d', fps=4, look='deserto', fade=0, amb='stanza', lines=[
        L(2.5, 6.5, "A Pietralata c'era solo fango.", 'In Pietralata there was nothing but mud.'),
        L(7, 13.5, "Le scarpe buone le portavamo in mano fino alla fermata, e le mettevamo sull'autobus.", 'We carried our good shoes in our hands to the bus stop, and put them on in the bus.')]),
    dict(id='11', dur=7, kind='3d', fps=8, look='deserto', fade=0, amb='stanza', lines=[
        L(0.5, 5, 'Passami… quella cosa. Per il brodo.', 'Pass me… that thing. For the broth.')]),
    dict(id='12', dur=20, kind='3d', fps=8, look='deserto', fade=0, amb='stanza', lines=[
        L(0.5, 4.5, "E papà? C'era anche lui, a Pietralata?", 'And Dad? Was he in Pietralata too?'),
        L(10.5, 15.5, 'Tuo padre aveva le mani bianche. Bianche di gesso.', 'Your father had white hands. White with chalk.'),
        L(16.5, 20, "È l'unica cosa che mi abbia mai detto di lui. In cinquantotto anni.", "It's the only thing she ever told me about him. In fifty-eight years.")]),
    dict(id='13', dur=8, kind='3d', fps=2, look='deserto', amb='corridoio', lines=[
        L(1, 6, 'Da bambino pensavo che facesse il muratore. O il maestro.', 'As a boy I thought he was a bricklayer. Or a teacher.')]),
    # III · NOVANTASEI FOTOGRAMMI
    dict(id='14', dur=30, kind='3d', fps=4, look='buio', amb='laboratorio', screens={'griglia': 'griglia'}, lines=[
        L(2, 6.5, 'La pellicola a colori è fatta di tre strati. Giallo, magenta, ciano.', 'Colour film is made of three layers. Yellow, magenta, cyan.'),
        L(8, 13, 'Col tempo il ciano se ne va per primo. Poi il giallo. Resta il magenta.', 'In time the cyan goes first. Then the yellow. The magenta stays.'),
        L(15, 19, "Restaurare vuol dire rimettere quello che se n'è andato.", 'Restoring means putting back what has gone.'),
        L(19.2, 22.5, 'Uno strato alla volta. Un fotogramma alla volta.', 'One layer at a time. One frame at a time.'),
        L(24.5, 28.5, 'Quattro secondi. Novantasei fotogrammi.', 'Four seconds. Ninety-six frames.')]),
    dict(id='15', dur=10, kind='insert', seq='presa', look='restauro1', frames=loop(5), tint=(0.75, 0.95, 1.0), amb='laboratorio'),
    dict(id='16', dur=22, kind='3d', fps=4, look='deserto', fade=0.33, amb='stanza', lines=[
        L(3, 5.5, 'Grazie, Franco.', 'Thank you, Franco.'),
        L(7.5, 12, 'Sono Elio, mamma. Franco era tuo fratello.', "It's Elio, Mum. Franco was your brother."),
        L(15, 17.5, 'Lo so.', 'I know.')]),
    dict(id='17', dur=8, kind='insert', seq='presa', look='restauro2', frames=loop(5), tint=(1.0, 0.95, 0.75), amb='laboratorio'),
    dict(id='18', dur=18, kind='3d', fps=8, look='deserto_pioggia', fade=0.6, amb='pioggia', lines=[
        L(4, 8.5, 'Lei è gentile. Viene tutti i giorni.', "You're very kind, sir. You come every day.")]),
    dict(id='19', dur=20, kind='3d', fps=8, look='verde', amb='laboratorio', screens={'verde': ('presaCu', 'eastman', lambda t: 24 + int(t * 4) % 8)}, lines=[
        L(4, 7, 'Il vestito era verde.', 'The dress was green.'),
        L(9, 13, 'Il verde è proprio il colore che manca al magenta.', 'Green is exactly the colour that magenta is missing.'),
        L(13.2, 17, "Era lì sotto da sessant'anni.", 'It had been under there for sixty years.')]),
    dict(id='20', dur=25, kind='3d', fps=8, look='sodio', amb='auto', lines=[
        L(2, 7, "I medici dicono che la memoria si svuota all'indietro, dall'ultimo giorno.", 'The doctors say memory empties out backwards, from the last day.'),
        L(7.2, 12, "Prima se ne va ieri. Poi i figli. Per ultima, l'infanzia.", 'First yesterday goes. Then the children. Childhood goes last.'),
        L(14.5, 18, "Io andavo nell'altro senso.", 'I was going the other way.'),
        L(18.2, 23.5, 'Ogni notte un fotogramma più vicino a lei, a diciannove anni.', 'Every night one frame closer to her, at nineteen.')]),
    dict(id='21', dur=16, kind='3d', fps=4, look='notte', fade=0.85, amb='notte', lines=[
        L(2, 7, '♪ Oi, khodyt son kolo vikon…', '♪ Sleep walks by the windows…'),
        L(8.5, 13.5, '♪ a dremota kolo plota…', '♪ and slumber by the fence…')]),
    dict(id='22', dur=8, kind='3d', fps=8, look='notte', fade=0.85, amb='notte'),
    # IV · IL CIAK
    dict(id='23', dur=12, kind='insert', seq='presa', look='sbiadito', frames=steps([(0, 0), (2.2, 1), (4.0, 2), (5.6, 3), (7.2, 4), (8.6, 5), (10.0, 6)]), amb='laboratorio', lines=[
        L(1, 5.5, "Prima di ogni ripresa c'è il ciak.", "Before every take there's the clapperboard."),
        L(6, 10.5, 'Al montaggio si taglia. Nessuno lo vede mai.', 'In the edit it gets cut. Nobody ever sees it.')]),
    dict(id='24', dur=16, kind='insert', seq='presa', look='sbiadito', frames=steps([(0, 8), (1.2, 9), (2.4, 10), (5.0, 12), (5.25, 14), (5.5, 16), (5.75, 18), (6.0, 20), (6.25, 22), (7.6, 23), (9.0, 24), (10.6, 25), (12.0, 26)]), amb='laboratorio'),
    dict(id='25', dur=26, kind='3d', fps=8, look='buio', amb='laboratorio', screens={'riflesso': ('presaCu', 'eastman', lambda t: 31)}, lines=[
        L(2, 5, 'Mani bianche di gesso.', 'Hands white with chalk.'),
        L(6.5, 9.5, 'Non faceva il muratore.', "He wasn't a bricklayer."),
        L(9.7, 14, 'Scriveva sul ciak il numero delle riprese. Col gesso.', 'He wrote the take numbers on the clapperboard. In chalk.'),
        L(16, 20, 'Lei non guardava la macchina da presa. Guardava lui.', "She wasn't looking at the camera. She was looking at him."),
        L(21.5, 25.5, 'Io comincio lì. Nella parte che si taglia.', "That's where I begin. In the part that gets cut.")]),
    # V · L'ANELLO
    dict(id='26', dur=12, kind='3d', fps=8, look='tavolo', amb='laboratorio', screens={f'anello{i}': ('presa', 'eastman', (lambda i: lambda t: (5 + i) % 32)(i)) for i in range(24)}, lines=[
        L(1.5, 6, 'Li ho stampati su pellicola e li ho chiusi ad anello.', 'I printed them on film and closed them into a loop.'),
        L(6.2, 9.5, 'Perché girassero senza fine.', 'So they would turn without end.')]),
    dict(id='27', dur=20, kind='3d', fps=4, look='technicolor', fade=1, amb='proiettore', screens={'restaurato': ('presa', 'eastman', loop(5))}),
    dict(id='28', dur=40, kind='3d', fps=4, look='technicolor', fade=1, amb='proiettore', screens={'restaurato': ('presa', 'eastman', loop(5))}, lines=[
        L(6, 9, 'Che bella ragazza.', 'What a beautiful girl.'),
        L(12, 15, 'Chi sta guardando?', "Who's she looking at?"),
        L(19, 23.5, 'Un ragazzo. Con le mani bianche.', 'A boy. With white hands.')]),
    dict(id='29', dur=14, kind='3d', fps=4, look='technicolor', fade=0, amb='proiettore', screens={'restaurato': ('presa', 'eastman', loop(5))}, lines=[
        L(3, 5.5, 'Nino.', 'Nino.'),
        L(9, 12, 'Ciao, Ada.', 'Hello, Ada.')]),
    dict(id='30', dur=25, kind='3d', fps=4, look='technicolor', fade=0, amb='proiettore'),
    # EPILOGO
    dict(id='31', dur=15, kind='3d', fps=4, look='mattino', amb='mattino'),
    dict(id='32', dur=12, kind='3d', fps=8, look='imbibizione', amb='archivio', screens={'etichetta': 'etichetta'}),
    dict(id='33', dur=35, kind='3d', fps=8, look='alba', amb='mare', lines=[
        L(8, 12, 'Il magenta non esiste.', "Magenta doesn't exist."),
        L(16, 20.5, "Ma all'alba, quando la luce arriva da tutte e due le parti del giorno,", 'But at dawn, when the light comes from both sides of the day,'),
        L(20.7, 25, 'il cielo lo fa da solo.', 'the sky makes it on its own.')]),
    dict(id='34', dur=8, kind='take', seq='presa', look='eastman', frames=lambda t: min(31, 8 + int(t * 8)), overlap=2.5, amb='proiettore'),
    dict(id='35', dur=16, kind='card', card='fine'),
]
BY_ID = {s['id']: s for s in SHOTS}


def timeline():
    """Each shot's start on the film; a shot with `overlap` begins that much before the last one ends (the dissolve)."""
    t, out = 0.0, []
    for s in SHOTS:
        start = t - s.get('overlap', 0)
        out.append((start, s))
        t = start + s['dur']
    return out, t


# ── the 1962 take, painted ──────────────────────────────────────────────────────────────────────
def _paint_take(job):
    seq, look, i, var = job
    out = take_frame(seq, look, i, var)
    if os.path.exists(out):
        return out
    img = pittura.painting(os.path.join(ANIM, seq), f'f{i:04d}', look, seed=3 + i % 3 + 10 * var)
    pittura.save(pittura.crop_academy(img), out)
    return out


def presa():
    jobs = []
    for seq, looks in TAKE_LOOKS.items():
        n = len([f for f in os.listdir(os.path.join(ANIM, seq)) if f.endswith('-color.png')])
        for look in looks:
            os.makedirs(os.path.join(FILM, f'{seq}-{look}'), exist_ok=True)
            jobs += [(seq, look, i, 0) for i in range(n)]
    jobs += [(seq, look, i, v) for seq, look, i in HOLD for v in (1, 2)]
    with Pool(WORKERS) as p:
        for k, _ in enumerate(p.imap_unordered(_paint_take, jobs)):
            if k % 32 == 0:
                print('take', k, '/', len(jobs), flush=True)
    griglia()
    print('take painted', len(jobs), flush=True)


def griglia():
    """The frames of the take in rows on the monitor, pink: a contact sheet."""
    out = os.path.join(FILM, 'griglia.jpg')
    cw, ch = 1600, 900
    sheet = np.full((ch, cw, 3), 18, np.uint8)
    cols, rows = 6, 4
    tw = (cw - 40) // cols - 12
    th = int(tw / 1.37)
    for k in range(cols * rows):
        img = cv2.imread(take_frame('presa', 'sbiadito', (3 + k) % 32))
        x = 20 + (k % cols) * (tw + 12)
        y = 60 + (k // cols) * (th + 30)
        sheet[y:y + th, x:x + tw] = cv2.resize(img, (tw, th), interpolation=cv2.INTER_AREA)
        cv2.putText(sheet, f'{3 * ((3 + k) % 32):03d}', (x, y + th + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (150, 120, 140), 1, cv2.LINE_AA)
    cv2.imwrite(out, sheet, [cv2.IMWRITE_JPEG_QUALITY, 92])


# ── the 3D shots: render, paint ─────────────────────────────────────────────────────────────────
def renders(s):
    """(frames, fps) of a shot's 3D render."""
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


def screen_paths(s, t):
    out = {}
    for name, src in (s.get('screens') or {}).items():
        if src in ('griglia', 'etichetta'):
            out[name] = os.path.join(FILM, f'{src}.jpg')
        else:
            seq, look, f = src
            out[name] = take_frame(seq, look, f(t) % 32)
    return out


def _paint(job):
    sid, i = job
    s = BY_ID[sid]
    out = os.path.join(DRAW, sid, f'a{i:04d}.jpg')
    if os.path.exists(out):
        return out
    n, fps = renders(s)
    r = min(n - 1, int(i * fps / DRAW_FPS))
    t = i / DRAW_FPS
    img = pittura.painting(os.path.join(ANIM, 's' + sid), f'f{r:04d}', s['look'], seed=1 + i % 3, fade=s.get('fade'), screens=screen_paths(s, t))
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
        # a second painter, from the end of the film backwards, to meet the first one in the middle
        jobs = jobs[::-1]
    print('to paint', len(jobs), flush=True)
    with Pool(WORKERS) as p:
        for k, _ in enumerate(p.imap_unordered(_paint, jobs, chunksize=2)):
            if k % 40 == 0:
                print('painted', k, '/', len(jobs), flush=True)
    print('paintings done', len(jobs), flush=True)


def posa(ids):
    """Lay the 1962 film onto paintings that were painted with only the white of the beam where it falls
    (the picture's quad was hidden from the render): the corners come from a still of the same static camera."""
    for sid in ids:
        s = BY_ID[sid]
        meta = json.load(open(os.path.join(ROOT, 'build', 'test', f's{sid}-meta.json')))
        n = int(round(s['dur'] * DRAW_FPS))
        for i in range(n):
            path = os.path.join(DRAW, sid, f'a{i:04d}.jpg')
            img = cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
            srcs = screen_paths(s, i / DRAW_FPS)
            for sc in meta['screens']:
                if sc.get('corners') and sc['name'] in srcs:
                    pic = cv2.cvtColor(cv2.imread(srcs[sc['name']]), cv2.COLOR_BGR2RGB).astype(np.float32) / 255
                    img = pittura.lay_in(img, pic, sc['corners'], 'over')
            pittura.save(img, path)
        print('laid in', sid, n, flush=True)


# ── the cut ─────────────────────────────────────────────────────────────────────────────────────
FONT_SANS = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
FONT_ITAL = '/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf'
FONT_MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
MAGENTA = (214, 23, 122)


@lru_cache(maxsize=None)
def font(path, size):
    return ImageFont.truetype(path, size)


@lru_cache(maxsize=64)
def load(path):
    im = cv2.imread(path)
    return None if im is None else cv2.cvtColor(im, cv2.COLOR_BGR2RGB)


def academy_on_black(img):
    pic = np.zeros((PIC_H, W, 3), np.uint8)
    x0 = (W - ACAD) // 2
    pic[:, x0:x0 + ACAD] = cv2.resize(img, (ACAD, PIC_H), interpolation=cv2.INTER_AREA) if img.shape[:2] != (PIC_H, ACAD) else img
    return pic


RNG = np.random.default_rng(7)


def film_damage(pic, j):
    """An old print going through the gate: the light trembles, dust, a scratch."""
    r = np.random.default_rng(j)
    out = pic.astype(np.float32) * (0.96 + 0.06 * r.random())
    x0 = (W - ACAD) // 2
    for _ in range(r.integers(0, 4)):
        x, y = int(x0 + r.random() * ACAD), int(r.random() * PIC_H)
        cv2.circle(out, (x, y), int(1 + r.random() * 3), (20, 15, 18) if r.random() < 0.6 else (235, 225, 230), -1)
    if r.random() < 0.3:
        x = int(x0 + r.random() * ACAD)
        cv2.line(out, (x, 0), (x + int(r.normal(0, 4)), PIC_H), (225, 215, 220), 1)
    return np.clip(out, 0, 255).astype(np.uint8)


def monitor(img, s, t, idx):
    """The take on the restorer's monitor: the picture, its glow, the counter of frames."""
    pic = academy_on_black(img).astype(np.float32)
    tint = np.float32(s.get('tint', (1, 1, 1)))
    x0 = (W - ACAD) // 2
    pic[:, :x0] = 0
    pic *= tint
    lines = np.ones((PIC_H, 1, 1), np.float32)
    lines[::3] = 0.93
    pic *= lines
    pil = Image.fromarray(np.clip(pic, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(pil)
    f = font(FONT_MONO, 22)
    d.text((x0 + ACAD + 24, PIC_H - 92), 'PANE DURO', font=f, fill=(150, 150, 150))
    d.text((x0 + ACAD + 24, PIC_H - 64), 'SC 41  RIPR 3', font=f, fill=(150, 150, 150))
    d.text((x0 + ACAD + 24, PIC_H - 36), f'F {3 * idx:03d} / 096', font=f, fill=(225, 225, 225))
    return np.asarray(pil)


def card(s, t, j):
    pil = Image.new('RGB', (W, PIC_H), (0, 0, 0))
    d = ImageDraw.Draw(pil)
    if s['card'] == 'titolo':
        f = font(FONT_SANS, 30)
        txt = '  '.join('MAGENTA')
        a = min(1, t / 1.2, (s['dur'] - t) / 0.8)
        col = tuple(int(c * max(0, a)) for c in MAGENTA)
        w = d.textlength(txt, font=f)
        d.text(((W - w) / 2, PIC_H / 2 - 18), txt, font=f, fill=col)
    elif s['card'] == 'coda':
        # the leader counting down in its 1.37 window; on 2, a white frame, and the cut
        x0 = (W - ACAD) // 2
        n = 8 - int(t)
        win = Image.new('RGB', (ACAD, PIC_H), (240, 236, 228) if n <= 2 else (118, 116, 112))
        if n > 2:
            dw = ImageDraw.Draw(win)
            cx, cy, R = ACAD // 2, PIC_H // 2, 330
            frac = t % 1
            dw.pieslice([cx - 900, cy - 900, cx + 900, cy + 900], -90, -90 + 360 * frac, fill=(70, 68, 66))
            dw.line([0, cy, ACAD, cy], fill=(30, 30, 30), width=3)
            dw.line([cx, 0, cx, PIC_H], fill=(30, 30, 30), width=3)
            for rr in (R, R - 30):
                dw.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=(235, 232, 225), width=6)
            f = font(FONT_SANS, 330)
            w = dw.textlength(str(n), font=f)
            dw.text((cx - w / 2, cy - 200), str(n), font=f, fill=(20, 20, 20))
        pil.paste(win, (x0, 0))
        return film_damage(np.asarray(pil), j)
    elif s['card'] == 'fine':
        if t < 7:
            f = font(FONT_SANS, 30)
            txt = '  '.join('MAGENTA')
            a = min(1, t / 1.5, (7 - t) / 1.0)
            col = tuple(int(c * max(0, a)) for c in MAGENTA)
            w = d.textlength(txt, font=f)
            d.text(((W - w) / 2, PIC_H / 2 - 18), txt, font=f, fill=col)
        else:
            a = min(1, (t - 7) / 1.0, (s['dur'] - t) / 1.0)
            col = tuple(int(200 * max(0, a)) for _ in range(3))
            rows = ['Pane duro (1962) è un film che non è mai esistito.', '',
                    'Oi khodyt son kolo vikon — ninna nanna tradizionale ucraina', '',
                    'Voci, musica e suono provvisori', '',
                    'Dipinto con il pittore di A PARTE']
            f = font(FONT_SANS, 26)
            y = PIC_H / 2 - len(rows) * 19
            for r in rows:
                w = d.textlength(r, font=f)
                d.text(((W - w) / 2, y), r, font=f, fill=col)
                y += 38
    return np.asarray(pil)


def picture(s, t, j):
    """The picture of a shot at its own time t (1920×804)."""
    i = int(t * DRAW_FPS)
    if s['kind'] == '3d':
        n = int(round(s['dur'] * DRAW_FPS))
        img = load(os.path.join(DRAW, s['id'], f'a{min(i, n - 1):04d}.jpg'))
        if img is None:
            return np.zeros((PIC_H, W, 3), np.uint8)
        if s['look'] == 'nitrato':
            img = np.clip(img.astype(np.float32) * (0.93 + 0.1 * np.random.default_rng(j).random()), 0, 255).astype(np.uint8)
        return img
    if s['kind'] in ('take', 'insert'):
        idx = s['frames'](t)
        var = 0
        if (s['seq'], s['look'], idx) in HOLD and s['frames'](max(0, t - 0.4)) == idx:
            var = i % 3
        img = load(take_frame(s['seq'], s['look'], idx, var)) if var else load(take_frame(s['seq'], s['look'], idx))
        if img is None:
            img = load(take_frame(s['seq'], s['look'], idx))
        if s['kind'] == 'insert':
            return monitor(img, s, t, idx)
        pic = academy_on_black(img)
        return film_damage(pic, j) if s.get('grain') else pic
    return card(s, t, j)


def subtitles(frame, s, t):
    for a, b, it, en in s.get('lines', []):
        if a <= t < b:
            al = min(1, (t - a) / 0.15, (b - t) / 0.15)
            pil = Image.fromarray(frame)
            d = ImageDraw.Draw(pil)
            f1, f2 = font(FONT_SANS, 34), font(FONT_ITAL, 25)
            y0 = BAR + PIC_H + 22
            w1 = d.textlength(it, font=f1)
            d.text(((W - w1) / 2, y0), it, font=f1, fill=tuple(int(c * al) for c in (240, 238, 232)))
            w2 = d.textlength(en, font=f2)
            d.text(((W - w2) / 2, y0 + 48), en, font=f2, fill=tuple(int(c * al) for c in (165, 160, 160)))
            return np.asarray(pil)
    return frame


def frame_at(T, tl, j):
    """The film's frame at time T: the picture of the shot in play (or two, in the dissolve), the bars, the subtitles."""
    live = [(st, s) for st, s in tl if st <= T < st + s['dur']]
    frame = np.zeros((H, W, 3), np.uint8)
    if not live:
        return frame
    st, s = live[-1]
    pic = picture(s, T - st, j)
    if len(live) > 1 and s.get('overlap'):
        st0, s0 = live[0]
        u = (T - st) / s['overlap']
        pic = (picture(s0, T - st0, j).astype(np.float32) * (1 - u) + pic.astype(np.float32) * u).astype(np.uint8)
        frame[BAR:BAR + PIC_H] = pic
        return subtitles(frame, s0, T - st0)
    frame[BAR:BAR + PIC_H] = pic
    return subtitles(frame, s, T - st)


def cut(t0=0.0, t1=None, out=None):
    tl, total = timeline()
    t1 = total if t1 is None else t1
    os.makedirs(OUT, exist_ok=True)
    out = out or os.path.join(OUT, 'magenta.mp4')
    audio = os.path.join(ROOT, 'build', 'suono.wav')
    if os.path.exists(audio) and t1 - t0 > 1:
        a_in = ['-ss', f'{t0:.3f}', '-t', f'{t1 - t0:.3f}', '-i', audio]
    else:
        a_in = ['-f', 'lavfi', '-t', f'{t1 - t0:.3f}', '-i', 'anullsrc=r=48000:cl=stereo']
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', *a_in,
           '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-tune', 'grain', '-pix_fmt', 'yuv420p',
           '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out]
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
        print(f"{s['id']}  {int(st // 60)}:{st % 60:04.1f}  {s['dur']:>4}s  {s['kind']:<6} {s.get('look', s.get('card', ''))}")
    print(f'total {int(total // 60)}:{total % 60:04.1f}')
    n3 = sum(round(s['dur'] * DRAW_FPS) for s in SHOTS if s['kind'] == '3d')
    nr = sum(renders(s)[0] for s in SHOTS if s['kind'] == '3d')
    print('paintings', n3, ' renders', nr)


if __name__ == '__main__':
    cmd, args = (sys.argv[1] if len(sys.argv) > 1 else ''), sys.argv[2:]
    if cmd == 'presa':
        presa()
    elif cmd == 'render':
        render(args)
    elif cmd == 'paint':
        paint(args)
    elif cmd == 'cut':
        cut(*(float(a) for a in args[:2])) if args else cut()
    elif cmd == 'posa':
        posa(args)
    elif cmd == 'list':
        listing()
    else:
        print(__doc__)
