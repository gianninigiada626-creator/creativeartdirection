"""
The animatic of A PARTE: the storyboard in time. Drawings at 8 per second (each held for three frames
of 24), the graphite line boiling between three hands; the shots that move are rendered frame by frame
from their 3D scenes. Slow camera moves, letterbox bars with the subtitles in them, the shot number in the
top bar, a temp sound track.

    python3 animatic.py draw [ids...]     stylize every drawing the film needs   → build/animatic/<id>/
    python3 animatic.py cut               composite, sound, encode                → out/animatic/
"""
import json
import os
import re
import subprocess
import sys
from functools import lru_cache
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import make
from shots import ACTS, RUNTIME, SHOTS
from stylize import stylize

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
ANIM = os.path.join(ROOT, 'build', 'anim')
DRAW = os.path.join(ROOT, 'build', 'animatic')
OUT = os.path.join(ROOT, 'out', 'animatic')
FONTS = os.path.join(ROOT, 'build', 'fonts')

FPS = 24
DRAW_FPS = 8
W, H = 1920, 1080
PIC_H = 804
BAR = (H - PIC_H) // 2
BOIL = 3

# every shot moves now. The 3D is rendered at 8 frames a second where things move, at 4 where life is only
# breathing, once for the photograph; it is always painted 8 times a second, so the paint itself never stops.
RFPS = {'10': 4, '12': 0, '16': 4, '18': 4, '19': 4, '20': 4, '25': 4, '26': 4, '27': 4}
CARD = {'04', '28'}
FIRST_LINE = {'01': 4.0, '02': 3.0, '03': 3.0, '10': 3.0, '14': 6.2, '16': 5.0, '19': 4.0, '23': 4.0, '24': 4.0, '26': 6.0, '27': 6.0}
ACT_STARTS = {next(s['id'] for s in SHOTS if s['act'] == a[0]) for a in ACTS[1:]}
DUR = {s['id']: s['dur'] for s in SHOTS}


def renders(sid):
    """(seconds, fps, frames) of the 3D render behind a shot."""
    rf = RFPS.get(sid, 8)
    if rf == 0:
        return 1, 1, 1
    return DUR[sid], rf, max(1, round(DUR[sid] * rf))


def render(ids):
    """Render each shot's 3D frame by frame (skipping what is already there)."""
    for s in SHOTS:
        sid = s['id']
        if sid in CARD or (ids and sid not in ids):
            continue
        secs, fps, n = renders(sid)
        d = os.path.join(ANIM, sid)
        if os.path.exists(os.path.join(d, 'meta.json')) and len([f for f in os.listdir(d) if f.endswith('-color.png')]) >= n:
            print('have', sid, flush=True)
            continue
        subprocess.run(['rm', '-rf', d])
        subprocess.run(['node', os.path.join(ROOT, 'engine3d', 'anim.mjs'), ANIM, sid, str(secs), str(fps)], check=True)


# ── drawing ──────────────────────────────────────────────────────────────────────────────────────

def _draw(job):
    sid, r, seed, out = job
    if os.path.exists(out):
        return out
    if sid in CARD:
        img = make.draw(sid, seed)
    else:
        img = make.draw(sid, seed, passdir=os.path.join(ANIM, sid), frame=f'f{r:04d}')
    cv2.imwrite(out, cv2.cvtColor((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 92])
    return out


def draw(ids, procs=4):
    jobs = []
    for s in SHOTS:
        sid = s['id']
        if ids and sid not in ids:
            continue
        d = os.path.join(DRAW, sid)
        os.makedirs(d, exist_ok=True)
        if sid in CARD:
            jobs += [(sid, 0, 1 + b, os.path.join(d, f'b{b}.jpg')) for b in range(BOIL)]
            continue
        secs, fps, n = renders(sid)
        for i in range(int(s['dur'] * DRAW_FPS)):
            r = min(n - 1, int(i * fps / DRAW_FPS)) if n > 1 else 0
            jobs.append((sid, r, 1 + i % BOIL, os.path.join(d, f'a{i:04d}.jpg')))
    with Pool(procs) as p:
        for k, _ in enumerate(p.imap_unordered(_draw, jobs, chunksize=2)):
            if k % 50 == 0:
                print('drawn', k, '/', len(jobs), flush=True)
    print('drawings done', len(jobs), flush=True)


# ── subtitles ────────────────────────────────────────────────────────────────────────────────────

def _split(it, en, limit=64):
    """Long lines become several subtitles, sentence by sentence, the English split the same way."""
    if len(it) <= limit:
        return [(it, en)]
    si = re.split(r'(?<=[.?!])\s+', it)
    se = re.split(r'(?<=[.?!])\s+', en)
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


def subtitle_events():
    """[(start, end, who, it, en)] in film seconds."""
    ev, t0 = [], 0.0
    for s in SHOTS:
        items = []
        for line in s['lines']:
            who, it, en = line[:3]
            at = line[3] if len(line) > 3 else None
            it = re.sub(r'\([^)]*\)\s*', '', it).strip()
            en = re.sub(r'\([^)]*\)\s*', '', en).strip()
            for j, (a, b) in enumerate(_split(it, en)):
                items.append((who, a, b, max(1.7, len(a) / 13.0 + 0.6), at if j == 0 else None))
        if items and any(x[4] is not None for x in items):
            # lines tied to the action: each starts at its moment, or right after the one before
            t = 0.0
            for who, a, b, d, at in items:
                t = max(t, at if at is not None else t)
                ev.append((t0 + t, t0 + min(t + d, s['dur'] - 0.2), who, a, b))
                t += d + 0.35
        elif items:
            items = [x[:4] for x in items]
            start = FIRST_LINE.get(s['id'], 0.7)
            gap = 0.35
            need = sum(d for *_, d in items) + gap * (len(items) - 1)
            room = s['dur'] - start - 0.4
            if need > room:
                start = max(0.4, s['dur'] - 0.4 - need)
                room = s['dur'] - start - 0.4
            k = min(1.0, room / need)
            t = start
            for who, a, b, d in items:
                ev.append((t0 + t, t0 + t + d * k, who, a, b))
                t += (d + gap) * k
        t0 += s['dur']
    return ev


def _font(name, size, weight=None):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    if weight:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


@lru_cache(maxsize=64)
def subtitle_image(who, it, en):
    """The bottom bar with one subtitle: Italian above, English beneath. His own words are red."""
    im = Image.new('RGBA', (W, BAR), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    vo = who == 'VO'
    f_it = _font('CormorantGaramond-Italic[wght].ttf' if vo else 'CormorantGaramond[wght].ttf', 40, 500)
    f_en = _font('CormorantGaramond-Italic[wght].ttf', 26, 400)
    f_who = _font('CormorantGaramond[wght].ttf', 22, 600)
    col = (226, 58, 46, 255) if who == 'LUI' else (236, 232, 224, 255)
    label = '' if vo else who.upper()
    wi = d.textlength(it, font=f_it)
    wl = d.textlength(label + '   ', font=f_who) if label else 0
    x = (W - wi) / 2
    if label:
        d.text((x - wl, 52), label, font=f_who, fill=(150, 145, 136, 255), anchor='ls')
    d.text((x, 52), it, font=f_it, fill=col, anchor='ls')
    d.text((W / 2, 94), en, font=f_en, fill=(150, 145, 136, 255), anchor='ms')
    return np.asarray(im)


@lru_cache(maxsize=40)
def slate(sid, t):
    im = Image.new('RGBA', (W, BAR), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = _font('CormorantGaramond[wght].ttf', 24, 500)
    d.text((48, BAR - 34), 'A PARTE  ·  animatic', font=f, fill=(120, 116, 109, 255), anchor='ls')
    d.text((W - 48, BAR - 34), f'tavola {sid}   ·   {int(t // 60)}:{int(t % 60):02d}', font=f, fill=(120, 116, 109, 255), anchor='rs', features=['lnum'])
    return np.asarray(im)


def over(dst, rgba):
    a = rgba[..., 3:4].astype(np.float32) / 255
    dst[:] = (dst * (1 - a) + rgba[..., :3] * a).astype(np.uint8)


# ── picture ──────────────────────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=48)
def load(path):
    im = cv2.imread(path)
    return cv2.cvtColor(im, cv2.COLOR_BGR2RGB)


def drawing(sid, t):
    """The drawing on screen at t seconds into shot sid."""
    d = os.path.join(DRAW, sid)
    k = int(t * DRAW_FPS)
    if sid in CARD:
        return load(os.path.join(d, f'b{k % BOIL}.jpg'))
    return load(os.path.join(d, f'a{min(k, int(DUR[sid] * DRAW_FPS) - 1):04d}.jpg'))


@lru_cache(maxsize=40)
def focus(sid):
    """Where a push-in aims: at him, if he is in the panel, else the middle."""
    im = drawing(sid, 0)
    red = (im[..., 0] > 170) & (im[..., 1] < 80) & (im[..., 2] < 80)
    if red.sum() > 200:
        ys, xs = np.nonzero(red)
        return float(xs.mean()), float(ys.mean())
    return im.shape[1] / 2, im.shape[0] / 2


def camera(img, s, t):
    kind, *a = s['move']
    if kind == 'hold':
        return img
    u = t / s['dur']
    u = u * u * (3 - 2 * u)
    h, w = img.shape[:2]
    fx, fy = focus(s['id'])
    if kind in ('push', 'pull'):
        z = 1 + a[0] * (u if kind == 'push' else 1 - u)
        cx, cy = w / 2 + (fx - w / 2) * (z - 1) / max(a[0], 1e-6) * 0.6, h / 2 + (fy - h / 2) * (z - 1) / max(a[0], 1e-6) * 0.6
        dx, dy = 0.0, 0.0
    else:
        z = 1 + abs(a[0]) * 2
        cx, cy = w / 2, h / 2
        dx = (u - 0.5) * a[0] * w if kind == 'pan' else 0.0
        dy = (u - 0.5) * a[0] * h if kind == 'tilt' else 0.0
    M = np.float32([[z, 0, (1 - z) * cx - dx * z], [0, z, (1 - z) * cy - dy * z]])
    # keep the frame covered
    M[0, 2] = min(0, max(M[0, 2], w - w * z))
    M[1, 2] = min(0, max(M[1, 2], h - h * z))
    return cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def fade_at(i, starts):
    """Picture brightness: fades from black at the start, around the title, between acts, to black at the end."""
    t = i / FPS
    lv = 1.0
    for s in SHOTS:
        a, b = starts[s['id']], starts[s['id']] + s['dur']
        if not (a <= t < b):
            continue
        lt, rt = t - a, b - t
        sid = s['id']
        if sid == '01':
            lv = min(lv, lt / 2.5)
        if sid in ACT_STARTS or sid in ('04', '28'):
            lv = min(lv, lt / (1.0 if sid in ('04', '28') else 0.5))
        nxt = SHOTS[SHOTS.index(s) + 1]['id'] if s is not SHOTS[-1] else None
        if nxt in ACT_STARTS:
            lv = min(lv, rt / 0.35)
        if sid == '03' or sid == '04':
            lv = min(lv, rt / (0.6 if sid == '03' else 1.0))
        if sid == '27':
            lv = min(lv, rt / 2.5)
        if sid == '28':
            lv = min(lv, rt / 2.0)
    return float(np.clip(lv, 0, 1))


def cut(out_name='a-parte-animatic', audio=True, span=None):
    os.makedirs(OUT, exist_ok=True)
    starts, t = {}, 0
    for s in SHOTS:
        starts[s['id']] = t
        t += s['dur']
    events = subtitle_events()
    with open(os.path.join(OUT, 'subtitles.json'), 'w') as fh:
        json.dump(events, fh, ensure_ascii=False, indent=1)
    wav = os.path.join(OUT, 'temp-sound.wav')
    if audio:
        import sound
        sound.build(wav, starts)
    video = os.path.join(OUT, f'{out_name}.mp4')
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-']
    if audio:
        cmd += ['-i', wav, '-c:a', 'aac', '-b:a', '192k']
    cmd += ['-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-shortest', video]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    total = RUNTIME * FPS
    first, last = (int(span[0] * FPS), int(span[1] * FPS)) if span else (0, total)
    bg = np.full((H, W, 3), 13, np.uint8)
    for i in range(first, last):
        t = i / FPS
        s = next(x for x in SHOTS if starts[x['id']] <= t < starts[x['id']] + x['dur'])
        lt = t - starts[s['id']]
        pic = camera(drawing(s['id'], lt), s, lt)
        lv = fade_at(i, starts)
        frame = bg.copy()
        frame[BAR:BAR + PIC_H] = (pic.astype(np.float32) * lv + 13 * (1 - lv)).astype(np.uint8) if lv < 1 else pic
        over(frame[:BAR], slate(s['id'], int(t)))
        for a, b, who, it, en in events:
            if a <= t < b:
                sub = subtitle_image(who, it, en)
                # a short fade in and out on each subtitle
                k = min(1.0, (t - a) / 0.25, (b - t) / 0.25)
                if k < 1:
                    sub = sub.copy()
                    sub[..., 3] = (sub[..., 3] * k).astype(np.uint8)
                over(frame[BAR + PIC_H:], sub)
        enc.stdin.write(frame.tobytes())
        if i % (FPS * 30) == 0:
            print('cut', f'{int(t // 60)}:{int(t % 60):02d}', flush=True)
    enc.stdin.close()
    enc.wait()
    print('ok', video)
    return video


def chapters(master=None, limit_mb=14.2):
    """One file per act for the storyboard page (each under the page's per-file limit), two-pass."""
    master = master or os.path.join(OUT, 'a-parte-animatic.mp4')
    vdir = os.path.join(ROOT, 'out', 'web', 'video')
    os.makedirs(vdir, exist_ok=True)
    t = 0
    for i, (key, *_) in enumerate(ACTS):
        d = sum(s['dur'] for s in SHOTS if s['act'] == key)
        kbps = int(limit_mb * 8e6 / d / 1000 * 0.94) - 96
        out = os.path.join(vdir, f'animatic-{i + 1}.mp4')
        log = os.path.join(OUT, f'pass-{i}')
        base = ['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(t), '-t', str(d), '-i', master,
                '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-b:v', f'{kbps}k',
                '-maxrate', f'{int(kbps * 1.6)}k', '-bufsize', f'{kbps * 3}k', '-pix_fmt', 'yuv420p', '-passlogfile', log]
        subprocess.run(base + ['-pass', '1', '-an', '-f', 'mp4', '/dev/null'], check=True)
        subprocess.run(base + ['-pass', '2', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', out], check=True)
        print(key, f'{os.path.getsize(out) / 1e6:.1f} MB', f'{kbps} kbps')
        t += d


def share(master=None):
    """A lighter copy of the whole animatic to send around."""
    master = master or os.path.join(OUT, 'a-parte-animatic.mp4')
    out = os.path.join(OUT, 'a-parte-animatic-720p.mp4')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', master, '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264',
                    '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out], check=True)
    print(out, f'{os.path.getsize(out) / 1e6:.1f} MB')


if __name__ == '__main__':
    if sys.argv[1] == 'render':
        render(sys.argv[2:])
    elif sys.argv[1] == 'draw':
        procs = 4
        args = sys.argv[2:]
        if args and args[0].startswith('-j'):
            procs, args = int(args[0][2:]), args[1:]
        draw(args, procs)
    elif sys.argv[1] == 'cut':
        span = None
        if '--span' in sys.argv:
            k = sys.argv.index('--span')
            span = (float(sys.argv[k + 1]), float(sys.argv[k + 2]))
        cut('preview' if span else 'a-parte-animatic', audio='--no-audio' not in sys.argv and not span, span=span)
    elif sys.argv[1] == 'export':
        chapters()
        share()
