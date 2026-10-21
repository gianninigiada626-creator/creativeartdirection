"""
A temp sound track for the animatic, synthesized: the room tone of every place (concrete, a fridge,
rain, a party through the floor, the sea), a few events in sync with the drawings (headlights' engine,
the ball against the wall, the bus doors, the metro joints) and the film's one piano note.
Not the film's sound: a guide for timing and mood, so the animatic isn't watched in silence.
"""
import wave

import numpy as np

SR = 48000
RNG = np.random.default_rng(11)


# ── generators ──
def white(sec):
    return RNG.standard_normal(int(sec * SR)).astype(np.float32)


def shaped(sec, alpha=1.0, lo=20, hi=20000):
    """Noise with a 1/f^alpha spectrum, band-limited with soft edges (pink: 1, brown: 2)."""
    n = max(2, int(sec * SR))
    spec = np.fft.rfft(RNG.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = 1
    g = f ** (-alpha / 2)
    g *= 1 / (1 + (lo / f) ** 4) / (1 + (f / hi) ** 4)
    x = np.fft.irfft(spec * g, n).astype(np.float32)
    return x / (np.abs(x).max() + 1e-9)


def band(x, lo, hi):
    n = len(x)
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR) + 1e-3
    spec *= 1 / (1 + (lo / f) ** 4) / (1 + (f / hi) ** 4)
    return np.fft.irfft(spec, n).astype(np.float32)


def tt(sec):
    return np.arange(int(sec * SR), dtype=np.float32) / SR


def slow(sec, rate, depth, seed=0):
    """A slow random swell, 1 ± depth."""
    r = np.random.default_rng(seed)
    k = max(4, int(sec * rate) + 4)
    pts = r.uniform(-1, 1, k)
    x = np.interp(np.linspace(0, k - 3, int(sec * SR)), np.arange(k), pts)
    return (1 + depth * x).astype(np.float32)


def put(dst, src, at, gain=1.0):
    i = int(at * SR)
    if i >= len(dst) or i + len(src) <= 0:
        return
    a, b = max(0, i), min(len(dst), i + len(src))
    dst[a:b] += src[a - i:b - i] * gain


def reverb(x, rt=1.2, wet=0.35, seed=3):
    n = int(rt * SR)
    ir = np.random.default_rng(seed).standard_normal(n).astype(np.float32) * np.exp(-6.9 * np.arange(n) / n).astype(np.float32)
    ir = band(ir, 200, 7000)
    ir /= np.sqrt((ir ** 2).sum()) + 1e-9
    m = len(x) + n
    y = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:len(x)].astype(np.float32)
    return x * (1 - wet) + y * wet


# ── events ──
def piano(note=293.66, sec=7.0, vel=1.0):
    t = tt(sec)
    y = np.zeros_like(t)
    for n in range(1, 13):
        f = n * note * np.sqrt(1 + 0.0004 * n * n)
        tau = 4.2 / (1 + 0.55 * n)
        y += (1 / n ** 1.25) * np.sin(2 * np.pi * f * t + n) * np.exp(-t / tau)
    y *= np.minimum(1, t / 0.004)
    h = band(white(0.05), 200, 3000) * np.exp(-tt(0.05) / 0.008) * 0.3
    y[:len(h)] += h
    return reverb(y / np.abs(y).max() * vel, 2.4, 0.4)


def thud(f=85, sec=0.35, click=0.3):
    t = tt(sec)
    y = np.sin(2 * np.pi * f * t * (1 - 0.25 * t)) * np.exp(-t / 0.07)
    y += click * band(white(sec), 300, 3000) * np.exp(-t / 0.01)
    return y.astype(np.float32)


def tick(sec=0.05):
    t = tt(sec)
    return (band(white(sec), 1500, 9000) * np.exp(-t / 0.006)).astype(np.float32)


def engine(sec, f0=38, shape=None):
    t = tt(sec)
    jitter = slow(sec, 3, 0.04, 9)
    ph = np.cumsum(2 * np.pi * f0 * jitter / SR)
    y = sum(np.sin(k * ph) / k for k in range(1, 9))
    y = band(y.astype(np.float32), 25, 400) + 0.2 * band(white(sec), 60, 500)
    return y * (shape(t) if shape else 1)


def murmur(sec, lo=250, hi=2500, rate=4.0, seed=1):
    """Voices too far to understand: band noise chopped into syllables."""
    am = np.clip(slow(sec, rate, 1.0, seed) - 0.6, 0, None) * slow(sec, 0.3, 0.5, seed + 1)
    return band(white(sec), lo, hi) * am


def metal(sec=1.2, seed=0):
    r = np.random.default_rng(seed)
    t = tt(sec)
    y = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / r.uniform(0.15, 0.5)) for f in r.uniform(300, 2600, 7))
    return (y / 7).astype(np.float32)


def kick(sec=0.4):
    t = tt(sec)
    return (np.sin(2 * np.pi * (48 + 60 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.18)).astype(np.float32)


# ── places ──
def garage(sec, drips=True, seed=0):
    y = 0.25 * shaped(sec, 2, 20, 160) + 0.05 * shaped(sec, 1, 200, 4000)
    t = tt(sec)
    y += 0.04 * np.sin(2 * np.pi * 100 * t) + 0.015 * np.sin(2 * np.pi * 200 * t)
    if drips:
        r = np.random.default_rng(seed)
        at = r.uniform(1.0, 4.0)
        while at < sec:
            d = np.sin(2 * np.pi * (1900 - 600 * tt(0.12)) * tt(0.12)) * np.exp(-tt(0.12) / 0.02)
            put(y, d.astype(np.float32) * 0.25, at)
            at += r.uniform(2.5, 6.0)
    return reverb(y, 1.6, 0.45)


def room(sec, seed=0):
    return 0.08 * shaped(sec, 1, 80, 3000) * slow(sec, 0.2, 0.15, seed)


def fridge(sec):
    t = tt(sec)
    return 0.05 * (np.sin(2 * np.pi * 50 * t) + 0.5 * np.sin(2 * np.pi * 100 * t) + 0.25 * np.sin(2 * np.pi * 150 * t)) + room(sec)


def wind(sec, strength=1.0, seed=0):
    return strength * 0.35 * band(shaped(sec, 1, 100, 2000), 120, 1600) * slow(sec, 0.25, 0.6, seed)


def rain(sec, seed=0):
    y = 0.3 * band(shaped(sec, 0.6, 300, 12000), 400, 10000)
    r = np.random.default_rng(seed)
    for at in r.uniform(0, sec, int(sec * 25)):
        put(y, tick(0.03) * r.uniform(0.05, 0.25), at)
    return y


def sea(sec, seed=0):
    t = tt(sec)
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / 7.3 + seed) ** 2
    return (0.4 * band(shaped(sec, 1.4, 60, 6000), 80, 5000) * swell + 0.06 * band(white(sec), 3000, 9000) * swell).astype(np.float32)


def party(sec, bpm=118, until=None):
    y = np.zeros(int(sec * SR), np.float32)
    beat = 60 / bpm
    k = 0
    while k * beat < sec:
        put(y, kick() * 0.9, k * beat)
        k += 1
    t = tt(sec)
    bass = np.sin(2 * np.pi * np.where((t // (beat * 4)) % 2 == 0, 55, 73.4) * t) * 0.35
    y += bass.astype(np.float32)
    y = band(y, 30, 260)  # through the floor
    crowd = murmur(sec, 300, 2200, 6, 4) * 0.35
    if until:
        crowd *= np.clip((until - t) / 1.0, 0, 1)
    return reverb(y + crowd, 0.9, 0.3)


def breath(sec):
    t = tt(sec)
    env = np.clip(np.sin(2 * np.pi * t / 4.2), 0, None) ** 2
    return 0.25 * band(white(sec), 300, 1800) * env


# ── the film ──
def shot_audio(sid, sec):
    t = tt(sec)
    y = np.zeros(int(sec * SR), np.float32)
    if sid == '01':
        y += garage(sec, seed=1)
        y += 0.16 * engine(sec, shape=lambda t: np.clip((t - 0.5) / 3, 0, 1) * np.clip((11 - t) / 4, 0, 1))
    elif sid == '02':
        y += garage(sec, seed=2) + 0.1 * engine(sec, shape=lambda t: np.clip((7 - t) / 7, 0, 1))
    elif sid == '03':
        y += garage(sec, seed=3) + 0.17 * engine(sec, 42, lambda t: np.clip((t - 0.6) / 1, 0, 1) * np.clip((11 - t) / 6, 0, 1))
        put(y, band(white(0.6), 1800, 4500) * np.exp(-tt(0.6) / 0.15) * 0.15, 1.4)
    elif sid == '05':
        y += fridge(sec) + 0.25 * murmur(sec, 400, 2600, 4.5, 5) + 0.06 * band(murmur(sec, 2000, 9000, 8, 6), 3000, 9000)
        r = np.random.default_rng(5)
        for at in r.uniform(1, sec - 1, 9):
            put(y, metal(0.25, int(at * 10)) * 0.12, at)
    elif sid == '06':
        y += fridge(sec)
        put(y, band(white(7), 1500, 8000) * slow(7, 9, 0.9, 7) * 0.06, 2.5)
    elif sid == '07':
        y += room(sec, 7) + 0.12 * murmur(sec, 500, 3000, 7, 8)
        for k in range(6):
            put(y, band(white(0.25), 2500, 7000) * 0.08, 0.3 + k * 0.32)
        put(y, 0.4 * band(murmur(0.8, 600, 3000, 14, 9), 600, 3000), 2.6)
    elif sid == '08':
        y += wind(sec, 0.8, 8) + 0.25 * murmur(sec, 400, 3000, 7, 10) * np.clip((6 - t) / 3, 0.2, 1)
        r = np.random.default_rng(8)
        for at in np.sort(r.uniform(0.4, 6, 50)):
            put(y, band(tick(0.04), 100, 1500) * 0.6 * max(0, 1 - at / 6), at)
    elif sid == '09':
        y += wind(sec, 0.5, 9)
        k = 0
        while k * 1.6 < sec:
            put(y, reverb(thud(95, 0.4, 0.5), 0.5, 0.25) * 0.9, k * 1.6 + 0.51)
            put(y, thud(70, 0.35, 0.3) * 0.6, k * 1.6 + 0.99)
            k += 1
    elif sid == '10':
        y += 0.3 * band(shaped(sec, 2, 30, 500), 30, 400) * slow(sec, 0.15, 0.5, 10) + 0.08 * murmur(sec, 300, 1800, 5, 11)
    elif sid == '11':
        y += 0.4 * murmur(sec, 300, 3000, 6, 12) + 0.3 * murmur(sec, 250, 2400, 5, 13) + room(sec)
        bell = np.sin(2 * np.pi * 1000 * tt(1.6)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 22 * tt(1.6)))) * np.minimum(1, (1.6 - tt(1.6)) / 0.2)
        put(y, bell.astype(np.float32) * 0.18, 0.3)
        for at in (3.4, 7.9, 12.2):
            put(y, metal(1.0, int(at)) * 0.25, at)
    elif sid == '12':
        y += room(sec, 12) + 0.15 * murmur(sec, 400, 2800, 6, 14)
        whine = np.sin(2 * np.pi * np.cumsum(3000 + 4000 * tt(1.3) / 1.3) / SR) * 0.03
        put(y, whine.astype(np.float32), 0.6)
        put(y, tick(0.06) * 0.5, 2.1)
    elif sid == '13':
        y += rain(sec, 13)
        put(y, band(white(3), 300, 3000) * np.sin(np.pi * tt(3) / 3) * 0.2, 8)
    elif sid == '14':
        y += rain(sec, 14)
        put(y, band(white(0.8), 2000, 9000) * np.exp(-tt(0.8) / 0.25) * 0.4, 0.4)
        y += 0.16 * engine(sec, 33, lambda t: np.clip((t - 1.2) / 1.5, 0, 1) * np.clip((9.5 - t) / 5, 0, 1))
    elif sid == '15':
        y += 0.5 * party(sec, until=10.5)
    elif sid == '16':
        y += wind(sec, 1.1, 16) + 0.35 * band(party(sec), 30, 160) * np.clip((10 - t) / 6, 0, 1)
    elif sid == '17':
        y += 0.5 * band(shaped(sec, 2, 20, 300), 25, 250) + room(sec, 17)
        at = 0.3
        while at < sec:
            put(y, band(thud(140, 0.15, 0.8), 80, 3000) * 0.35, at)
            put(y, band(thud(140, 0.15, 0.8), 80, 3000) * 0.3, at + 0.16)
            at += 1.15
        chime = np.concatenate([np.sin(2 * np.pi * 660 * tt(0.45)), np.sin(2 * np.pi * 550 * tt(0.7))]) * 0.12
        put(y, reverb(chime.astype(np.float32), 0.8, 0.4), 10)
    elif sid == '18':
        y += 0.15 * shaped(sec, 1, 60, 700) + 0.02 * np.sin(2 * np.pi * 120 * t)
    elif sid in ('19', '22'):
        y += garage(sec, seed=int(sid))
    elif sid == '20':
        y += garage(sec, False, 20)
        r = np.random.default_rng(20)
        at = 0.5
        while at < sec:
            put(y, tick(0.04) * 0.25, at)
            at += r.uniform(0.4, 1.3)
    elif sid == '21':
        y += garage(sec, False, 21)
        beat = 0.6
        k = 0
        while k * beat < sec:
            put(y, band(kick(0.2), 900, 4000) * 0.15, k * beat)
            put(y, tick(0.03) * 0.06, k * beat + beat / 2)
            k += 1
    elif sid == '23':
        y += garage(sec, seed=23)
        r = np.random.default_rng(23)
        at = 0.5
        while at < sec:
            put(y, tick(0.04) * 0.12, at)
            at += r.uniform(0.5, 1.4)
        k = 0
        while k * 0.6 < sec:
            put(y, band(kick(0.2), 900, 4000) * 0.06, k * 0.6)
            k += 1
    elif sid in ('24', '25', '27'):
        y += sea(sec, int(sid))
        if sid == '24':
            at = 0.6
            while at < sec:
                put(y, band(thud(160, 0.12, 1.0), 200, 5000) * 0.12, at)
                at += 0.82
    elif sid == '26':
        y += 0.5 * sea(sec, 26) + breath(sec)
    return y


PIANO = [('04', 0.8, 1.0), ('07', 12.5, 0.6), ('16', 6.0, 0.7), ('23', 10.0, 0.6), ('25', 2.0, 0.9)] + \
        [('27', 1.0 + 4.0 * k, 0.85 - 0.08 * k) for k in range(5)] + [('28', 1.0, 0.4)]


def build(path, starts, voices=None):
    from shots import RUNTIME, SHOTS
    total = int(RUNTIME * SR)
    mix = np.zeros(total, np.float32)
    for s in SHOTS:
        a = shot_audio(s['id'], s['dur'] + 0.3)
        f = int(0.15 * SR)
        a[:f] *= np.linspace(0, 1, f)
        a[-f:] *= np.linspace(1, 0, f)
        put(mix, a * 0.5, starts[s['id']] - 0.15)
    note = piano()
    for sid, at, vel in PIANO:
        put(mix, note * 0.2 * vel, starts[sid] + at)
    # the very beginning and the very end come out of and go into silence
    t = np.arange(total) / SR
    mix *= np.clip(t / 2.0, 0, 1) * np.clip((RUNTIME - t) / 1.5, 0, 1)
    if voices:
        # the voices in front; the place and the music sink under them
        import voices as V
        mix /= np.abs(mix).max() / 0.6
        v, gain = V.track(voices, RUNTIME, bed=mix)
        mix = mix * gain[:len(mix)] + v[:len(mix)]
    mix /= max(1.0, np.abs(mix).max() / 0.95)
    if not voices:
        mix /= np.abs(mix).max() / 0.89
    st = np.stack([mix, np.roll(mix, int(0.0007 * SR))], 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767).astype('<i2').tobytes())
    return path
