"""The cut of SEX ON LA SANTA: every rendered frame gets the look, the shots are laid on the song,
the split screen is put together, the title card closes it, and the song goes under it all.

  python3 montaggio.py post [shot ...]   the look on every frame rendered so far (four at a time)
  python3 montaggio.py cut               the film, with the song: out/sex-on-la-santa.mp4
"""
import glob
import json
import os
import subprocess
import sys
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

cv2.setNumThreads(1)
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ANIM = os.path.join(ROOT, 'build', 'anim')
LOOK = os.path.join(ROOT, 'build', 'look')
CUTD = os.path.join(ROOT, 'build', 'cut')
SONG = os.path.join(ROOT, 'build', 'src', 'sex-on-la-santa.mp3')
OUT = os.path.join(ROOT, 'out')
FPS = 12
CUT = [['s01'], ['s02'], ['s03'], ['s04'], ['s05'], ['s06'], ['s07'], ['s08'], ['s09'], ['s10'], ['s10a', 's10b', 's10c', 's10d'],
       ['s11'], ['s12'], ['s13'], ['s14'], ['s15'], ['s16'], ['s17'], ['s18'], ['s19'], ['s20'], ['s21'], ['s22'], ['s23'], ['s24']]
sys.path.insert(0, HERE)
import look  # noqa: E402


def meta(shot):
    return json.load(open(os.path.join(ANIM, shot, 'meta.json')))


def post_one(job):
    shot, i, far, stop = job
    src = os.path.join(ANIM, shot, f'f{i:04d}')
    out = os.path.join(LOOK, shot, f'f{i:04d}.jpg')
    if os.path.exists(out):
        return
    color, depth = look.load_pair(src + '-color.png', src + '-depth.png', far)
    focus = None
    if os.path.exists(src + '-focus.txt'):
        focus = float(open(src + '-focus.txt').read())
    look.finish(color, depth, out + '.tmp.jpg', focus=focus, stop=stop, seed=i)
    os.replace(out + '.tmp.jpg', out)


def post(shots):
    jobs = []
    for shot in shots or sorted(os.listdir(ANIM)):
        if not os.path.exists(os.path.join(ANIM, shot, 'meta.json')):
            continue
        m = meta(shot)
        os.makedirs(os.path.join(LOOK, shot), exist_ok=True)
        for f in sorted(glob.glob(os.path.join(ANIM, shot, 'f*-depth.png'))):
            i = int(os.path.basename(f)[1:5])
            if not os.path.exists(os.path.join(LOOK, shot, f'f{i:04d}.jpg')):
                jobs.append((shot, i, m['far'], m.get('stop', 1.5)))
    print('post', len(jobs), 'frames', flush=True)
    with Pool(int(os.environ.get("WORKERS", "4"))) as p:
        for n, _ in enumerate(p.imap_unordered(post_one, jobs, chunksize=2)):
            if n % 50 == 0:
                print(n, flush=True)


def font(name, size):
    return ImageFont.truetype(os.path.join(ROOT, 'build', 'fonts', name), size)


def title_card(w, h, a):
    """SAYF, and the title in the bar's script, on black."""
    img = Image.new('RGB', (w, h), (0, 0, 0))
    d = ImageDraw.Draw(img)
    c1 = tuple(int(v * a) for v in (242, 236, 222))
    c2 = tuple(int(v * a) for v in (255, 90, 138))
    f1, f2 = font('Anton.ttf', int(h * 0.09)), font('Lobster.ttf', int(h * 0.16))
    d.text((w / 2, h * 0.36), 'S A Y F', font=f1, fill=c1, anchor='mm')
    d.text((w / 2, h * 0.56), 'Sex on La Santa', font=f2, fill=c2, anchor='mm')
    return np.array(img)[:, :, ::-1]


def frame_of(shot, T, m):
    i = int(round((T - m['t0']) * m['fps']))
    i = max(0, min(m['n'] - 1, i))
    p = os.path.join(LOOK, shot, f'f{i:04d}.jpg')
    if not os.path.exists(p):
        # fall back to the nearest frame we have
        have = sorted(glob.glob(os.path.join(LOOK, shot, 'f*.jpg')))
        if not have:
            return None
        p = min(have, key=lambda q: abs(int(os.path.basename(q)[1:5]) - i))
    return cv2.imread(p)


def cut():
    os.makedirs(CUTD, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    metas = {s: meta(s) for e in CUT for s in e if os.path.exists(os.path.join(ANIM, s, 'meta.json'))}
    w, h = next(iter(metas.values()))['w'], next(iter(metas.values()))['h']
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', SONG]).decode())
    n = int(dur * FPS)
    for f in glob.glob(os.path.join(CUTD, '*.jpg')):
        os.remove(f)
    last = np.zeros((h, w, 3), np.uint8)
    for j in range(n):
        T = j / FPS
        entry = None
        for e in CUT:
            m = metas.get(e[0])
            if m and m['t0'] - 1e-6 <= T < m['t0'] + m['dur'] - 1e-6:
                entry = e
        img = None
        if entry and len(entry) == 1:
            img = frame_of(entry[0], T, metas[entry[0]])
        elif entry:
            # the split screen: four quarters in a cream frame, as on television
            img = np.full((h, w, 3), (196, 226, 236), np.uint8)
            b = max(6, h // 90)
            qw, qh = (w - 3 * b) // 2, (h - 3 * b) // 2
            for q, s in enumerate(entry):
                fr = frame_of(s, T, metas[s])
                if fr is None:
                    continue
                x, y = b + (q % 2) * (qw + b), b + (q // 2) * (qh + b)
                img[y:y + qh, x:x + qw] = cv2.resize(fr, (qw, qh), interpolation=cv2.INTER_AREA)
        if T >= 95.15:
            img = title_card(w, h, min(1.0, (T - 95.15) / 0.4))
        if img is None:
            img = last
        last = img
        cv2.imwrite(os.path.join(CUTD, f'c{j:05d}.jpg'), img, [cv2.IMWRITE_JPEG_QUALITY, 94])
    out = os.path.join(OUT, 'sex-on-la-santa.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', os.path.join(CUTD, 'c%05d.jpg'), '-i', SONG,
                    '-r', '24', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-tune', 'grain', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], check=True)
    print(out)


if __name__ == '__main__':
    if sys.argv[1] == 'post':
        post(sys.argv[2:])
    elif sys.argv[1] == 'cut':
        cut()
