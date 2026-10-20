"""A temp sound track for FIN QUI TUTTO BENE, synthesized: the wind at the fiftieth floor and the rush of the fall;
each floor its own sound, cut when we leave it (the vacuum cleaner, the call centre, the tap, the notification,
the coins, the prayer, the police radio); the typewriter of the time cards; the speaker on the sill; the chant
and the bass drum of the march growing under the last floors; the cut to silence, a breath, then the square.
Not the film's sound: a guide for timing and mood. The voices are to be recorded (VOCI.md).

    python3 suono.py      → build/suono.wav
"""
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'a-parte', 'board'))
import sound as S  # noqa: E402  (A PARTE's generators)

import film  # noqa: E402

SR = S.SR
OUT = os.path.join(film.ROOT, 'build', 'suono.wav')
tt = S.tt


def env_ends(y, a=0.02, b=0.02):
    n = len(y)
    e = np.ones(n, np.float32)
    na, nb = max(1, int(a * SR)), max(1, int(b * SR))
    e[:na] = np.linspace(0, 1, na)
    e[-nb:] = np.minimum(e[-nb:], np.linspace(1, 0, nb))
    return y * e


def city(sec, seed=0):
    """The city far below: traffic as a low sea, a horn now and then."""
    y = 0.25 * S.band(S.shaped(sec, 1.6, 30, 600), 40, 500) * S.slow(sec, 0.15, 0.3, seed)
    r = np.random.default_rng(seed)
    at = r.uniform(1, 4)
    while at < sec:
        f = r.uniform(330, 470)
        h = np.sin(2 * np.pi * f * tt(0.5)) + 0.4 * np.sin(4 * np.pi * f * tt(0.5))
        S.put(y, S.band((h * np.minimum(1, tt(0.5) / 0.03) * np.exp(-tt(0.5) / 0.35)).astype(np.float32), 200, 1500) * 0.03, at)
        at += r.uniform(3, 8)
    return y


def creak(seed=0):
    r = np.random.default_rng(seed)
    n = 0.6
    t = tt(n)
    f = r.uniform(180, 320) * (1 + 0.2 * np.sin(2 * np.pi * 3 * t))
    y = np.sin(np.cumsum(2 * np.pi * f / SR)) * np.clip(np.sin(np.pi * t / n), 0, 1) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 37 * t)))
    return S.band(y.astype(np.float32), 150, 2500) * 0.12


def rush(sec, seed=0, up=1.0):
    """The air past a falling body: a roar that rises, a flutter in it."""
    t = tt(sec)
    a = S.band(S.shaped(sec, 0.8, 100, 6000), 120, 5000)
    flutter = 1 + 0.25 * np.sin(2 * np.pi * (6 + 3 * t / sec) * t)
    rise = (0.6 + 0.4 * t / sec) * up
    return (a * flutter * rise * 0.55).astype(np.float32) + S.wind(sec, 1.2, seed) * 0.6


def whoosh(sec=0.7, muffled=True):
    t = tt(sec)
    e = np.sin(np.pi * t / sec) ** 2
    y = S.band(S.white(sec), 80, 900 if muffled else 4000) * e
    return (y * 0.7).astype(np.float32)


def vacuum(sec):
    t = tt(sec)
    m = S.engine(sec, 190) * 0.3 + S.band(S.white(sec), 500, 5000) * 0.18
    return (m * (0.9 + 0.1 * np.sin(2 * np.pi * 0.37 * t))).astype(np.float32)


def callcentre(sec, seed=0):
    y = sum(S.murmur(sec, 220, 2600, 4 + k, seed + k) for k in range(4)) * 0.35 + S.room(sec, seed)
    r = np.random.default_rng(seed)
    for at in r.uniform(0, sec, int(sec * 9)):
        S.put(y, S.tick(0.02) * r.uniform(0.05, 0.15), at)
    return S.reverb(y, 0.5, 0.2)


def tap(sec, seed=0):
    y = S.band(S.shaped(sec, 0.5, 600, 9000), 900, 7000) * 0.25 * S.slow(sec, 6, 0.15, seed)
    return S.reverb(y + S.room(sec, seed), 0.6, 0.35)


def ping():
    y = np.zeros(int(0.5 * SR), np.float32)
    for k, f in enumerate((1318.5, 1760.0)):
        t = tt(0.25)
        S.put(y, (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.08)).astype(np.float32) * 0.25, k * 0.11)
    return y


def coins(a, b, seed=0):
    r = np.random.default_rng(seed)
    y = np.zeros(int((b - a + 0.5) * SR), np.float32)
    for at in np.sort(r.uniform(0, b - a, 9)):
        S.put(y, S.metal(0.35, int(r.integers(1000))) * np.exp(-tt(0.35) / 0.06) * 0.3, at)
    return y


def hum_voice(sec, f0=110, seed=0):
    """A man praying under his breath: a low hummed line, the words not heard."""
    t = tt(sec)
    f = f0 * (1 + 0.04 * (S.slow(sec, 1.2, 1, seed) - 1))
    ph = np.cumsum(2 * np.pi * f / SR)
    v = sum(a * np.sin(k * ph) for k, a in [(1, 1), (2, 0.5), (3, 0.3), (4, 0.15)])
    am = np.clip(S.slow(sec, 2.5, 1.0, seed + 3) - 0.3, 0, None)
    return S.band((v * am).astype(np.float32), 90, 1400) * 0.12


def radio(sec, seed=0):
    r = np.random.default_rng(seed)
    y = S.room(sec, seed) * 0.8
    at = 0.2
    while at < sec:
        d = r.uniform(0.4, 1.0)
        burst = S.band(S.white(d), 400, 2800) * 0.12 * S.slow(d, 8, 0.8, int(r.integers(99)))
        S.put(y, burst, at)
        S.put(y, (np.sin(2 * np.pi * 1200 * tt(0.06)) * 0.08).astype(np.float32), at + d)
        at += d + r.uniform(0.3, 0.9)
    return S.reverb(y, 0.7, 0.3)


def snare():
    t = tt(0.25)
    return (S.band(S.white(0.25), 900, 7000) * np.exp(-t / 0.05) * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.03) * 0.5).astype(np.float32)


def cassa(sec, bpm=92, wet=0.25):
    """The speaker on the sill: a beat of the banlieue, a bass, a chord that comes back (temp)."""
    y = np.zeros(int(sec * SR) + SR, np.float32)
    beat = 60 / bpm
    k = 0
    while k * beat / 2 < sec:
        at = k * beat / 2
        step = k % 8
        if step in (0, 3, 5):
            S.put(y, S.kick(0.4), at, 0.9)
        if step in (2, 6):
            S.put(y, snare(), at, 0.7)
        S.put(y, S.tick(0.04), at, 0.25 if step % 2 else 0.4)
        k += 1
    t = tt(sec + 1)
    bar = (t // (beat * 4)).astype(int) % 2
    bass = np.sin(2 * np.pi * np.where(bar == 0, 49.0, 41.2) * t) * 0.3 * (0.6 + 0.4 * (np.sin(np.pi * (t % beat) / beat) ** 2))
    y += bass.astype(np.float32)
    # a minor chord stab on every bar
    k = 0
    while k * beat * 4 < sec:
        for f in (196.0, 233.08, 293.66):
            S.put(y, S.piano(f, 1.6, 0.35)[: int(1.6 * SR)], k * beat * 4 + beat * 1.5)
        k += 1
    return S.reverb(y[: int(sec * SR)], 1.1, wet)


# ── the chant: «fin qui tutto bene», a crowd of voices on a march beat ─────────────────────────────
VOWELS = {'i': (300, 2300), 'u': (320, 850), 'o': (500, 900), 'e': (450, 1950)}
SYLL = [('f', 'i'), ('k', 'i'), ('t', 'u'), ('t', 'o'), ('b', 'e'), ('n', 'e')]


def syllable(cons, vow, dur, f0, seed):
    r = np.random.default_rng(seed)
    t = tt(dur)
    f = f0 * (1 + 0.01 * r.standard_normal()) * (1 - 0.06 * t / dur)
    ph = np.cumsum(2 * np.pi * f / SR)
    saw = sum(np.sin(k * ph) / k for k in range(1, 18)).astype(np.float32)
    F1, F2 = VOWELS[vow]
    v = S.band(saw, F1 * 0.7, F1 * 1.3) + 0.6 * S.band(saw, F2 * 0.8, F2 * 1.2)
    e = np.minimum(1, t / 0.03) * np.clip((dur - t) / 0.08, 0, 1)
    y = v * e
    if cons in 'fkt':
        n = int(0.05 * SR)
        c = S.band(S.white(0.05), 1500 if cons == 'f' else 2500, 8000) * np.exp(-tt(0.05) / 0.015)
        y = np.concatenate([c * (0.5 if cons == 'f' else 0.8), y])[: len(t) + n]
    return y.astype(np.float32)


def chant(sec, bpm=100, voices=18, seed=0, accel=0.0, drum=1.0, claps=1.0):
    """The six syllables on a bar of 4/4 (fin qui | tut to | be ne | rest), many voices a little apart in time
    and pitch; the bass drum on the first three beats, the hands on the fourth."""
    y = np.zeros(int((sec + 2) * SR), np.float32)
    r = np.random.default_rng(seed)
    t, bar = 0.0, 0
    while t < sec:
        b = 60 / (bpm * (1 + accel * t / sec))
        for k, (c, v) in enumerate(SYLL):
            at = t + k * b / 2
            for j in range(voices):
                S.put(y, syllable(c, v, b / 2 * 0.9, r.uniform(100, 230), int(r.integers(1 << 30))), at + r.normal(0, 0.02), 0.5 / np.sqrt(voices))
        for k in range(3):
            S.put(y, S.thud(55, 0.6, 0.15), t + k * b, 0.9 * drum)
        for _ in range(12):
            S.put(y, S.band(S.white(0.06), 800, 5000) * np.exp(-tt(0.06) / 0.012), t + 3 * b + r.normal(0, 0.012), 0.12 * claps)
        t += 4 * b
        bar += 1
    return S.reverb(y[: int(sec * SR)], 1.6, 0.35)


def crowd(sec, seed=0):
    y = sum(S.murmur(sec, 200, 3000, 3 + k * 0.7, seed + k) for k in range(6)) * 0.3
    return y + 0.25 * S.band(S.shaped(sec, 1.2, 100, 4000), 150, 3500) * S.slow(sec, 0.4, 0.3, seed)


def spray(sec):
    return (S.band(S.white(sec), 2500, 11000) * 0.3 * np.minimum(1, tt(sec) / 0.05) * np.clip((sec - tt(sec)) / 0.05, 0, 1)).astype(np.float32)


def rattle(sec, seed=0):
    y = np.zeros(int(sec * SR), np.float32)
    r = np.random.default_rng(seed)
    at = 0.0
    while at < sec:
        S.put(y, S.metal(0.08, int(r.integers(999))) * np.exp(-tt(0.08) / 0.015) * 0.5, at)
        at += 0.085 + r.normal(0, 0.01)
    return y


def typewriter(n, cps, seed=0):
    r = np.random.default_rng(seed)
    y = np.zeros(int((n / cps + 0.5) * SR), np.float32)
    for i in range(n):
        at = i / cps + abs(r.normal(0, 0.006))
        S.put(y, S.tick(0.05), at, r.uniform(0.5, 0.8))
        S.put(y, S.thud(140, 0.08, 0.6), at, 0.25)
    return y


AMB = {
    'vento_lontano': lambda sec, s: S.wind(sec, 0.6, s) + city(sec, s) * 0.6,
    'tetto': lambda sec, s: S.wind(sec, 1.5, s) + city(sec, s),
    'caduta': lambda sec, s: rush(sec, s),
    'attico': lambda sec, s: S.room(sec, s) * 0.5 + city(sec, s) * 0.15,
    'aspirapolvere': lambda sec, s: vacuum(sec) + S.room(sec, s),
    'callcenter': lambda sec, s: callcentre(sec, s),
    'stanza': lambda sec, s: S.room(sec, s) + S.fridge(sec) * 0.3,
    'lavandino': lambda sec, s: tap(sec, s),
    'scale': lambda sec, s: S.reverb(S.room(sec, s) + city(sec, s) * 0.2, 1.4, 0.5),
    'tv_muta': lambda sec, s: S.fridge(sec) + S.band(S.white(sec), 5000, 11000) * 0.008,
    'cucina': lambda sec, s: S.room(sec, s) + S.fridge(sec) * 0.6,
    'sospeso': lambda sec, s: (np.sin(2 * np.pi * 55 * tt(sec)) * 0.03 + np.sin(2 * np.pi * 82.4 * tt(sec)) * 0.015).astype(np.float32) * S.slow(sec, 0.1, 0.3, s) + S.wind(sec, 0.12, s),
    'preghiera': lambda sec, s: S.room(sec, s) + hum_voice(sec, 105, s),
    'cortile': lambda sec, s: S.room(sec, s) * 0.5,
    'sfratto': lambda sec, s: radio(sec, s),
    'coro': lambda sec, s: rush(sec, s, 1.2) * 0.7,
    'piazza': lambda sec, s: crowd(sec, s) * 0.9 + S.band(S.white(sec), 2000, 8000) * 0.04,
    'piazza_vera': lambda sec, s: crowd(sec, s) * 0.5,
}


def build():
    tl, total = film.timeline()
    mix = np.zeros(int((total + 3) * SR), np.float32)
    at = {s['id']: st for st, s in tl}
    for k, (st, s) in enumerate(tl):
        sec, sid = s['dur'], s['id']
        # each place its own sound, cut clean when we leave it (a few ms, no fade across the cut)
        if s.get('amb'):
            a = env_ends(AMB[s['amb']](sec, k + 1), 0.01, 0.01)
            S.put(mix, a, st)
        if s.get('drop') is not None:
            S.put(mix, whoosh(), st + s['drop'] - 0.15, 0.8)
        if s.get('gust'):
            g = S.wind(2.0, 3.0, 9) * np.sin(np.pi * tt(2.0) / 2.0) ** 2
            S.put(mix, g, st + s['gust'])
        if s.get('ping') is not None:
            S.put(mix, ping(), st + s['ping'])
        if s.get('coins'):
            S.put(mix, coins(*s['coins'], seed=k), st + s['coins'][0])
        if s.get('pen') is not None:
            S.put(mix, S.tick(0.05), st + s['pen'], 0.6)
            S.put(mix, S.thud(400, 0.1, 0.5), st + s['pen'], 0.2)
        if s.get('run') is not None:
            for i in range(8):
                S.put(mix, S.thud(90, 0.12, 0.3) * 0.25, st + s['run'] + i * 0.16)
        if s.get('card') == 'ora':
            S.put(mix, typewriter(len(s['text']), film.ORA_CPS, k), st + 0.15, 0.8)
        if sid == '02':
            S.put(mix, typewriter(len('FIN QUI TUTTO BENE'), 14, 2), st + 0.2, 0.8)
        if sid == '23a':
            # the speaker on the sill: the music comes up and fills the courtyard, then stops with the cut
            m = cassa(at['24'] - (st + s['cassa']))
            m = env_ends(m, 0.05, 0.01)
            S.put(mix, m, st + s['cassa'], 0.9)
        if sid == '28':
            S.put(mix, rattle(0.8, 3), st + 1.1, 0.6)
            for t0, t1, _, _ in film.N_STROKES:
                S.put(mix, spray(t1 - t0), st + t0, 0.8)
        if sid == '30':
            # the cut to black: only his voice (to be recorded), then silence; one breath; then many; then the
            # square, for real, rising into the end titles
            S.put(mix, S.breath(2.2) * 1.6, st + 9.2)
            for j in range(10):
                S.put(mix, S.breath(2.2) * 0.35, st + 10.2 + j * 0.11)
            sq = env_ends(crowd(sec - 11.0, 31) * 0.8, 1.0, 0.01)
            S.put(mix, sq, st + 11.0)
    # the march, growing under the last floors: from 06:12:03 to the black
    a, b = at['c4'], at['30']
    m = chant(b - a, 100, 16, 3, accel=0.18)
    t = tt(b - a)
    grow = np.clip((t / (at['26'] - a)) ** 1.6, 0.05, 1.0) * 0.85 + np.clip((t - (at['27'] - a)) / 1.0, 0, 1) * 0.35
    S.put(mix, (m * grow).astype(np.float32), a)
    # the end titles: the square goes on under them, then the dedication in silence
    e = at['31']
    sq = chant(26.0, 104, 22, 11) * 0.8
    sq = env_ends(sq, 0.01, 3.0)
    S.put(mix, sq, e)
    mix = mix[: int(total * SR)]
    # the hard cut to black: nothing at all under the last two lines
    c = int(at['30'] * SR)
    mix[c:c + int(9.2 * SR)] = 0
    mix /= np.abs(mix).max() + 1e-9
    mix *= 0.72
    st = np.stack([mix, np.roll(mix, int(0.0007 * SR))], axis=1)
    pcm = (np.clip(st, -1, 1) * 32767).astype(np.int16)
    with wave.open(OUT, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(OUT, f'{total:.1f}s')


if __name__ == '__main__':
    build()
