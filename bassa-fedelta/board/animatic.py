"""
The animatic of BASSA FEDELTÀ: the storyboard in time, 4:3. Paintings at 8 a second (each held for three
frames of 24), the paint boiling between three hands; every shot rendered from its 3D scene as it moves.
Slow camera moves, subtitles on the picture, a temp sound track (suono.py).

    python3 animatic.py make [ids...]     render the 3D and paint every drawing   → build/anim/, build/animatic/
    python3 animatic.py cut               composite, sound, encode                → out/animatic/
    python3 animatic.py export            a light copy to send around             → out/animatic/
"""
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor
from functools import lru_cache

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import make
import pittura
from shots import ACTS, RUNTIME, SHOTS

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
ANIM = os.path.join(ROOT, 'build', 'anim')
DRAW = os.path.join(ROOT, 'build', 'animatic')
OUT = os.path.join(ROOT, 'out', 'animatic')
INTER = '/usr/share/fonts/opentype/inter/'

FPS = 24
DRAW_FPS = 8
W, H = 1440, 1080
BOIL = 3
# the 3D is rendered 8 times a second where things move, 4 where life is only breathing; the title is a card
RFPS = {'02': 4, '04': 4, '05': 4, '06': 4, '07': 4, '11': 4, '13': 4, '14': 4}
CARD = {'16'}
ACT_STARTS = {next(s['id'] for s in SHOTS if s['act'] == a[0]) for a in ACTS[1:]}
DUR = {s['id']: s['dur'] for s in SHOTS}


def renders(sid):
    rf = RFPS.get(sid, 8)
    return DUR[sid], rf, max(1, round(DUR[sid] * rf))


def render(sid):
    """Render a shot's 3D frame by frame (unless it is already there)."""
    secs, fps, n = renders(sid)
    d = os.path.join(ANIM, sid)
    if os.path.exists(os.path.join(d, 'meta.json')) and len([f for f in os.listdir(d) if f.endswith('-color.png')]) >= n:
        return
    subprocess.run(['rm', '-rf', d])
    subprocess.run(['node', os.path.join(ROOT, 'engine3d', 'anim.mjs'), ANIM, sid, str(secs), str(fps)], check=True)


# ── painting ─────────────────────────────────────────────────────────────────────────────────────

def _paint(job):
    sid, r, seed, out = job
    if os.path.exists(out):
        return out
    if sid in CARD:
        meta = json.load(open(os.path.join(make.PASSES, f'{sid}-meta.json')))
        img = pittura.paint(make.PASSES, sid, seed=seed, far=meta['far'], look=make.LOOK[sid])
        img = make.letter(img, 'BASSA FEDELTÀ', 190, (720, 330), seed=16)
    else:
        d = os.path.join(ANIM, sid)
        meta = json.load(open(os.path.join(d, 'meta.json')))
        img = pittura.paint(d, f'f{r:04d}', seed=seed, far=meta['far'], look=make.LOOK[sid])
    cv2.imwrite(out, cv2.cvtColor((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 92])
    return out


def jobs_for(sid):
    d = os.path.join(DRAW, sid)
    os.makedirs(d, exist_ok=True)
    if sid in CARD:
        return [(sid, 0, 1 + b, os.path.join(d, f'b{b}.jpg')) for b in range(BOIL)]
    secs, fps, n = renders(sid)
    out = []
    for i in range(int(DUR[sid] * DRAW_FPS)):
        r = min(n - 1, int(i * fps / DRAW_FPS))
        # the paint boils: three hands take turns, each its own strokes and its own wobble
        out.append((sid, r, 1 + i % BOIL + int(sid) * 10, os.path.join(d, f'a{i:04d}.jpg')))
    return out


def make_all(ids, procs=3):
    """Render shot after shot; paint each one while the next renders."""
    ids = ids or [s['id'] for s in SHOTS]
    with ProcessPoolExecutor(procs) as pool:
        futures = []
        for sid in ids:
            if sid not in CARD:
                render(sid)
                print('rendered', sid, flush=True)
            futures += [pool.submit(_paint, j) for j in jobs_for(sid)]
        for k, f in enumerate(futures):
            f.result()
            if k % 100 == 0:
                print('painted', k, '/', len(futures), flush=True)
    print('done', len(futures), flush=True)


# ── subtitles ────────────────────────────────────────────────────────────────────────────────────

def _split(it, en, limit=58):
    """Long lines become several subtitles, sentence by sentence, the English split the same way."""
    if len(it) <= limit:
        return [(it, en)]
    si = re.split(r'(?<=[.?!:])\s+', it)
    se = re.split(r'(?<=[.?!:])\s+', en)
    if len(si) != len(se):
        return [(it, en)]
    out, cur_i, cur_e = [], [], []
    for a, b in zip(si, se):
        if cur_i and len(' '.join(cur_i + [a])) > limit:
            out.append((' '.join(cur_i), ' '.join(cur_e)))
            cur_i, cur_e = [], []
        cur_i.append(a)
        cur_e.append(b)
    out.append((' '.join(cur_i), ' '.join(cur_e)))
    return out


def line_plan():
    """Every spoken line in film seconds: start, end (the recorded take's length when there is one, else an
    estimate), its clip name as in VOCI.md, and its subtitle parts."""
    try:
        import voci
        durs = voci.durations()
    except ImportError:
        durs = {}
    plan, t0 = [], 0.0
    for s in SHOTS:
        items, n = [], {}
        for line in s['lines']:
            who, it, en = line[:3]
            at = line[3] if len(line) > 3 else 0.7
            n[who] = n.get(who, 0) + 1
            name = f"{s['id']}_{who.lower()}_{n[who]:02d}"
            parts = _split(it, en)
            est = sum(max(1.4, len(x) / 14.0 + 0.5) for x, _ in parts) + 0.3 * (len(parts) - 1)
            items.append(dict(who=who, name=name, parts=parts, d=durs.get(name, est), at=at))
        t = 0.0
        for i in items:
            t = max(t, i['at'])
            i['start'] = t0 + t
            i['end'] = i['start'] + i['d']
            t += i['d'] + 0.3
            plan.append(i)
        t0 += s['dur']
    return plan


def subtitle_events():
    """[(start, end, who, it, en)] in film seconds: each line's parts spread over its spoken time by length."""
    ev = []
    for p in line_plan():
        total = sum(len(x) for x, _ in p['parts'])
        t = p['start']
        for x, y in p['parts']:
            share = p['d'] * len(x) / total
            ev.append([t, t + max(share, 1.2) + 0.35, p['who'], x, y])
            t += share
    ev.sort(key=lambda e: e[0])
    for a, b in zip(ev, ev[1:]):
        a[1] = min(a[1], b[0] - 0.05)
    return [tuple(e) for e in ev]


@lru_cache(maxsize=8)
def _font(name, size):
    return ImageFont.truetype(os.path.join(INTER, name), size)


@lru_cache(maxsize=64)
def subtitle_image(who, it, en):
    """One subtitle on the picture: Italian above in white, English beneath, a soft dark band behind them."""
    bh = 190
    im = Image.new('RGBA', (W, bh), (0, 0, 0, 0))
    band = np.zeros((bh, W, 4), np.uint8)
    band[..., 3] = (np.linspace(0, 1, bh) ** 1.4 * 170).astype(np.uint8)[:, None]
    im = Image.fromarray(band, 'RGBA')
    d = ImageDraw.Draw(im)
    f_it = _font('Inter-SemiBold.otf' if who != 'VO' else 'Inter-MediumItalic.otf', 38)
    f_en = _font('Inter-Italic.otf', 25)
    f_who = _font('Inter-Bold.otf', 19)
    label = '' if who == 'VO' else who.upper()
    wi = d.textlength(it, font=f_it)
    x = (W - wi) / 2
    for dx, dy in ((2, 2), (-1, 1), (1, -1)):
        d.text((x + dx, 118 + dy), it, font=f_it, fill=(0, 0, 0, 200), anchor='ls')
    if label:
        d.text((x - 14, 118), label, font=f_who, fill=(232, 196, 64, 255), anchor='rs')
    d.text((x, 118), it, font=f_it, fill=(246, 242, 234, 255), anchor='ls')
    d.text((W / 2 + 1, 160 + 1), en, font=f_en, fill=(0, 0, 0, 200), anchor='ms')
    d.text((W / 2, 160), en, font=f_en, fill=(200, 196, 188, 255), anchor='ms')
    return np.asarray(im)


def over(dst, rgba):
    a = rgba[..., 3:4].astype(np.float32) / 255
    dst[:] = (dst * (1 - a) + rgba[..., :3] * a).astype(np.uint8)


# ── picture ──────────────────────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=48)
def load(path):
    return cv2.cvtColor(cv2.imread(path), cv2.COLOR_BGR2RGB)


def drawing(sid, t):
    d = os.path.join(DRAW, sid)
    k = int(t * DRAW_FPS)
    if sid in CARD:
        return load(os.path.join(d, f'b{k % BOIL}.jpg'))
    return load(os.path.join(d, f'a{min(k, int(DUR[sid] * DRAW_FPS) - 1):04d}.jpg'))


def camera(img, s, t):
    kind, *a = s['move']
    if kind == 'hold':
        return img
    u = t / s['dur']
    u = u * u * (3 - 2 * u)
    h, w = img.shape[:2]
    if kind in ('push', 'pull'):
        z = 1 + a[0] * (u if kind == 'push' else 1 - u)
        M = cv2.getRotationMatrix2D((w / 2, h / 2), 0, z)
    else:
        z = 1 + abs(a[0]) + 0.01
        dx = (u - 0.5) * a[0] * w if kind == 'pan' else 0
        dy = (u - 0.5) * a[0] * h if kind == 'tilt' else 0
        M = cv2.getRotationMatrix2D((w / 2, h / 2), 0, z)
        M[0, 2] -= dx
        M[1, 2] -= dy
    return cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def fade_at(i, starts):
    """Picture level at frame i: out of black at the start, a dip to black into each act, the end into black."""
    t = i / FPS
    lv = 1.0
    lv = min(lv, t / 1.2)
    lv = min(lv, (RUNTIME - t) / 1.5)
    for s in SHOTS:
        a = starts[s['id']]
        if s['id'] in ACT_STARTS:
            lv = min(lv, max(0.0, (t - a) / 0.6) if t >= a else max(0.0, (a - t) / 0.6))
        if s['id'] == '12':
            # the television goes off into the dark, and the present comes out of it slowly
            end = a + s['dur']
            if a + 3.0 <= t < end:
                lv = min(lv, max(0.0, 1 - (t - a - 3.0) / 2.0))
    return float(np.clip(lv, 0, 1))


def cut(name='bassa-fedelta-animatic', audio=True, span=None):
    os.makedirs(OUT, exist_ok=True)
    starts, t = {}, 0
    for s in SHOTS:
        starts[s['id']] = t
        t += s['dur']
    events = subtitle_events()
    json.dump(events, open(os.path.join(OUT, 'subtitles.json'), 'w'), ensure_ascii=False, indent=1)
    wav = os.path.join(OUT, 'temp-sound.wav')
    if audio:
        import suono
        suono.build(wav, starts, voices=line_plan())
    video = os.path.join(OUT, f'{name}.mp4')
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-']
    if audio:
        cmd += ['-i', wav, '-c:a', 'aac', '-b:a', '192k']
    cmd += ['-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-shortest', video]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    first, last = (int(span[0] * FPS), int(span[1] * FPS)) if span else (0, int(RUNTIME * FPS))
    for i in range(first, last):
        t = i / FPS
        s = next(x for x in SHOTS if starts[x['id']] <= t < starts[x['id']] + x['dur'])
        lt = t - starts[s['id']]
        frame = camera(drawing(s['id'], lt), s, lt).copy()
        lv = fade_at(i, starts)
        if lv < 1:
            frame = (frame.astype(np.float32) * lv).astype(np.uint8)
        for a, b, who, it, en in events:
            if a <= t < b:
                sub = subtitle_image(who, it, en)
                k = min(1.0, (t - a) / 0.2, (b - t) / 0.2)
                if k < 1:
                    sub = sub.copy()
                    sub[..., 3] = (sub[..., 3] * k).astype(np.uint8)
                over(frame[H - sub.shape[0]:], sub)
        enc.stdin.write(frame.tobytes())
        if i % (FPS * 30) == 0:
            print('cut', f'{int(t // 60)}:{int(t % 60):02d}', flush=True)
    enc.stdin.close()
    enc.wait()
    print('ok', video)
    return video


def export(master=None, limit_mb=28.5):
    """A copy to send: 960×720, two passes, under the size a message can carry."""
    master = master or os.path.join(OUT, 'bassa-fedelta-animatic.mp4')
    out = os.path.join(OUT, 'bassa-fedelta-animatic-720.mp4')
    kbps = int(limit_mb * 8e6 / RUNTIME / 1000 * 0.95) - 128
    log = os.path.join(OUT, 'pass')
    base = ['ffmpeg', '-y', '-loglevel', 'error', '-i', master, '-vf', 'scale=960:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow',
            '-b:v', f'{kbps}k', '-maxrate', f'{int(kbps * 1.6)}k', '-bufsize', f'{kbps * 3}k', '-pix_fmt', 'yuv420p', '-passlogfile', log]
    subprocess.run(base + ['-pass', '1', '-an', '-f', 'mp4', '/dev/null'], check=True)
    subprocess.run(base + ['-pass', '2', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out], check=True)
    print(out, f'{os.path.getsize(out) / 1e6:.1f} MB', f'{kbps} kbps')


if __name__ == '__main__':
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == 'make':
        make_all(args)
    elif cmd == 'cut':
        span = (float(args[1]), float(args[2])) if args[:1] == ['--span'] else None
        cut('preview' if span else 'bassa-fedelta-animatic', audio='--no-audio' not in args and not span, span=span)
    elif cmd == 'export':
        export()
