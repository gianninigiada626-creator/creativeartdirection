"""
The voices: the recorded takes cut to their lines, treated for the place each is spoken in, and timed into
the animatic. The narration is one long take; it is cut where the alignment found each line (vo_split.json).

    python3 voices.py        → build/voci/clips/<line>.wav and durations.json

Sources live in build/voci/src (never in git): voce_narrante, madre, padre, maestra, bambini, fotografo,
lui (both of his lines, the rehearsal at the bus stop and, after a breath, "Ci sono."), amico, capo.
"""
import json
import os
import re
import subprocess
import wave

import numpy as np

import sound

HERE = os.path.dirname(os.path.abspath(__file__))
VOCI = os.path.join(HERE, '..', 'build', 'voci')
SRC = os.path.join(VOCI, 'src')
CLIPS = os.path.join(VOCI, 'clips')
SR = sound.SR

# line → (source, (start, end) in the source or None for the whole take)
CUTS = {
    '05_madre_01': ('madre', None),
    '05_padre_01': ('padre', None),
    '07_maestra_01': ('maestra', None),
    '07_bambini_01': ('bambini', None),
    '12_fotografo_01': ('fotografo', None),
    '13_lui_01': ('lui', (0.0, 4.4)),
    '15_amico_01': ('amico', None),
    '18_capo_01': ('capo', None),
    '26_lui_01': ('lui', (4.9, None)),
}

# how each voice sits in its place: tempo (narration a touch slower), pauses stretched, room, distance, level
TREAT = {
    'vo': dict(tempo=0.94, pauses=1.5, gain=1.0),
    'madre': dict(room=(0.5, 0.22), lowpass=5200, gain=0.55),
    'padre': dict(room=(0.4, 0.14), gain=0.8),
    'maestra': dict(room=(0.8, 0.28), gain=0.85),
    'bambini': dict(chorus=True, room=(0.8, 0.3), gain=0.75),
    'fotografo': dict(room=(1.3, 0.32), gain=0.85),
    'lui': dict(gain=0.75),
    'amico': dict(room=(0.9, 0.3), gain=0.85),
    'capo': dict(room=(0.5, 0.18), gain=0.8),
}


def load(path, start=0.0, end=None):
    args = ['ffmpeg', '-v', 'error', '-ss', str(start)]
    if end is not None:
        args += ['-t', str(end - start)]
    args += ['-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(args, capture_output=True, check=True).stdout, np.float32).copy()


def ff(x, filt):
    """Run a float signal through an ffmpeg audio filter."""
    p = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', filt, '-f', 'f32le', '-'],
                       input=x.astype(np.float32).tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.float32).copy()


def envelope(x, ms=10):
    hop = int(SR * ms / 1000)
    n = len(x) // hop
    return np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1)), hop


def trim(x, keep=0.06):
    e, hop = envelope(x)
    on = np.nonzero(e > e.max() * 0.03)[0]
    if not len(on):
        return x
    a = max(0, on[0] * hop - int(keep * SR))
    b = min(len(x), (on[-1] + 1) * hop + int(keep * SR * 3))
    return x[a:b]


def stretch_pauses(x, factor):
    """Longer silences between sentences: what a narrator who takes his time would leave."""
    e, hop = envelope(x)
    quiet = e < e.max() * 0.03
    out, last, i = [], 0, 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if (j - i) * hop >= 0.22 * SR and i > 0 and j < len(quiet):
                mid = (i + j) // 2 * hop
                out.append(x[last:mid])
                out.append(np.zeros(int((j - i) * hop * (factor - 1)), np.float32))
                last = mid
            i = j
        else:
            i += 1
    out.append(x[last:])
    return np.concatenate(out)


def chorus(x):
    """One child becomes a class: the same shout, pitched and timed a little differently, five times."""
    out = np.zeros(len(x) + SR // 5, np.float32)
    for semis, delay, g in [(0, 0, 1.0), (2.5, 0.035, 0.8), (4.5, 0.06, 0.7), (-1.5, 0.02, 0.75), (6.5, 0.09, 0.55), (1.0, 0.12, 0.6)]:
        k = 2 ** (semis / 12)
        y = ff(x, f'asetrate={int(SR * k)},aresample={SR},atempo={1 / k:.4f}')
        d = int(delay * SR)
        out[d:d + len(y)] += y[:len(out) - d] * g
    return out


def treat(x, who):
    T = TREAT[who]
    x = trim(x)
    if T.get('tempo'):
        x = ff(x, f'atempo={T["tempo"]}')
    if T.get('pauses'):
        x = stretch_pauses(x, T['pauses'])
    if T.get('chorus'):
        x = chorus(x)
    x = sound.band(x, 70, T.get('lowpass', 16000))
    if T.get('room'):
        rt, wet = T['room']
        x = sound.reverb(np.concatenate([x, np.zeros(int(rt * SR), np.float32)]), rt, wet)
    x = x / (np.abs(x).max() + 1e-9) * 0.9 * T['gain']
    return x.astype(np.float32)


def vo_names():
    names = []
    for line in open(os.path.join(HERE, '..', 'VOCI.md')):
        m = re.match(r'\| `(\d\d_vo_\d\d)`', line)
        if m:
            names.append(m.group(1))
    return names


def prepare():
    os.makedirs(CLIPS, exist_ok=True)
    durs = {}

    def save(name, x):
        with wave.open(os.path.join(CLIPS, f'{name}.wav'), 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
        durs[name] = round(len(x) / SR, 3)

    split = json.load(open(os.path.join(VOCI, 'vo_split.json')))
    names = vo_names()
    assert len(split) == len(names), (len(split), len(names))
    vo = os.path.join(SRC, 'voce_narrante.mp3')
    for name, (a, b) in zip(names, split):
        save(name, treat(load(vo, max(0, a - 0.05), b + 0.15), 'vo'))
    for name, (src, span) in CUTS.items():
        path = os.path.join(SRC, f'{src}.mp3')
        if not os.path.exists(path):
            continue
        x = load(path, *(span or (0.0, None)))
        save(name, treat(x, name.split('_')[1]))
    json.dump(durs, open(os.path.join(CLIPS, 'durations.json'), 'w'), indent=1)
    return durs


def durations():
    p = os.path.join(CLIPS, 'durations.json')
    return json.load(open(p)) if os.path.exists(p) else {}


def level(x):
    """Loudness of a take while it is speaking (the silences between words left out), in dB."""
    e, _ = envelope(x)
    on = e[e > e.max() * 0.1]
    return 20 * np.log10(np.sqrt((on ** 2).mean()) + 1e-9) if len(on) else -120.0


def limit(x, ceil):
    """A gentle peak limiter: a loud consonant is held under the ceiling instead of turning the whole film down."""
    blk = SR // 200
    n = len(x) // blk + 1
    pad = np.concatenate([np.abs(x), np.zeros(n * blk - len(x), np.float32)])
    g = np.minimum(1.0, ceil / (pad.reshape(n, blk).max(1) + 1e-9))
    g = np.minimum(g, np.minimum(np.roll(g, 1), np.roll(g, -1)))
    for i in range(1, n):
        g[i] = min(g[i], g[i - 1] + (1 - g[i - 1]) * 0.08)
    return (x * np.interp(np.arange(len(x)), np.arange(n) * blk + blk / 2, g)).astype(np.float32)


def track(plan, total, bed=None):
    """All the voices on one track, and the gain the bed (room tone and music) should duck to underneath them.

    The narration is levelled line to line so the narrator never drifts nearer or further; the characters keep
    the distance their treatment gives them. Under each line the bed sinks at least 6 dB, and deeper where the
    place is loud (rain, the party), so every line sits about 14 dB clear of what is around it."""
    v = np.zeros(int(total * SR), np.float32)
    takes = {}
    for p in plan:
        path = os.path.join(CLIPS, f'{p["name"]}.wav')
        if os.path.exists(path):
            with wave.open(path) as w:
                takes[p['name']] = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32) / 32767
    vo = [level(x) for k, x in takes.items() if '_vo_' in k]
    ref = float(np.median(vo)) if vo else 0.0
    for p in plan:
        x = takes.get(p['name'])
        if x is None:
            continue
        if '_vo_' in p['name']:
            x = x * 10 ** (np.clip(ref - level(x), -4, 4) / 20)
        sound.put(v, x, p['start'])
    v = limit(v, 0.9)
    hop = SR // 100
    target = np.ones(len(v) // hop + 1, np.float32)
    for p in plan:
        if p['name'] not in takes:
            continue
        duck = -6.0
        if bed is not None:
            a, b = int(p['start'] * SR), int(p['end'] * SR)
            room = 20 * np.log10(np.sqrt((bed[a:b] ** 2).mean()) + 1e-9)
            duck = float(np.clip(level(v[a:b]) - 14 - room, -15, -6))
        i, j = int((p['start'] - 0.25) * 100), int((p['end'] + 0.15) * 100)
        target[max(0, i):j] = np.minimum(target[max(0, i):j], 10 ** (duck / 20))
    # quick down before the first word, slow back up after the last
    g = np.empty_like(target)
    cur = 1.0
    for i, tg in enumerate(target):
        cur += (tg - cur) * (0.25 if tg < cur else 0.025)
        g[i] = cur
    gain = np.repeat(g, hop)[:len(v)]
    return v, gain.astype(np.float32)


if __name__ == '__main__':
    d = prepare()
    for k, v in d.items():
        print(k, v)
