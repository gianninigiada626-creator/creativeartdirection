"""
A temp sound track for the animatic of BASSA FEDELTÀ, synthesized: the places (a living room with the game
on, the market, the stairwell's echo, cicadas, a train overhead, the wind, the port), a few events in sync
with the pictures, and the tape: a dusty beat at 88 to the minute, the music on Rocco's cassette, heard
through headphones, through a boombox, and at last through a car's speakers.
Not the film's sound: a guide for timing and mood. The music is yours.
"""
import os
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(HERE, '..', '..', 'a-parte', 'board'))
from sound import SR, band, metal, murmur, put, reverb, shaped, slow, tick, tt, white  # noqa: E402

BPM = 88
BEAT = 60 / BPM


# ── the tape ─────────────────────────────────────────────────────────────────────────────────────
def _kick():
    t = tt(0.45)
    return (np.sin(2 * np.pi * (46 + 70 * np.exp(-t / 0.025)) * t) * np.exp(-t / 0.2)).astype(np.float32)


def _snare():
    t = tt(0.3)
    y = band(white(0.3), 900, 6500) * np.exp(-t / 0.11) * 0.8 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.6
    return reverb(y.astype(np.float32), 0.5, 0.25)


def _hat(open_=False):
    t = tt(0.25 if open_ else 0.06)
    return (band(white(len(t) / SR), 6500, 13000) * np.exp(-t / (0.12 if open_ else 0.02)) * 0.35).astype(np.float32)


def _keys(freqs, sec):
    """A worn electric piano: a few sines, a slow tremolo, a long fade."""
    t = tt(sec)
    y = sum(np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.4) for f in freqs)
    y = y * (1 + 0.25 * np.sin(2 * np.pi * 4.5 * t)) * np.exp(-t / 2.2) * np.minimum(1, t / 0.01)
    return (y / len(freqs)).astype(np.float32)


# A minor, round and round: Am7, Fmaj7, Cmaj7, G6
CHORDS = [[220.0, 261.6, 329.6, 392.0], [174.6, 220.0, 261.6, 329.6], [130.8, 196.0, 246.9, 329.6], [196.0, 246.9, 293.7, 329.6]]
ROOTS = [55.0, 43.65, 65.4, 49.0]


def tape(sec, intro=0.0):
    """The beat on the cassette, copied too many times: wow and flutter, saturation, no top end, hiss."""
    n = int(sec * SR)
    y = np.zeros(n + SR, np.float32)
    step = BEAT / 4
    k = 0
    while k * step < sec:
        swing = 0.18 * step if k % 2 else 0.0
        at = k * step + swing
        p = k % 16
        if p in (0, 7, 10):
            put(y, _kick() * 0.95, at)
        if p in (4, 12):
            put(y, _snare() * 0.7, at)
        if p % 2 == 0:
            put(y, _hat(p == 14) * (0.8 if p % 4 else 0.5), at)
        k += 1
    bar = BEAT * 4
    for b in range(int(sec / bar) + 1):
        c = b % 4
        put(y, _keys(CHORDS[c], bar * 1.2) * 0.35, b * bar)
        t = tt(BEAT * 1.6)
        for at in (0, BEAT * 1.75, BEAT * 2.5):
            bass = np.tanh(2.5 * np.sin(2 * np.pi * ROOTS[c] * t)) * np.exp(-t / 0.5) * 0.45
            put(y, bass.astype(np.float32), b * bar + at)
    y = y[:n]
    # the tape: the speed wanders, the sound saturates, the top is gone, the hiss is always there
    t = np.arange(n) / SR
    warp = t + 0.0025 * np.sin(2 * np.pi * 0.45 * t) + 0.0005 * np.sin(2 * np.pi * 6.3 * t)
    y = np.interp(np.clip(warp, 0, t[-1]), t, y).astype(np.float32)
    y = np.tanh(1.6 * y / (np.abs(y).max() + 1e-9)).astype(np.float32)
    y = band(y, 35, 4800)
    y += 0.05 * band(white(sec), 2000, 12000)
    if intro:
        y *= np.clip(t / intro, 0, 1).astype(np.float32)
    return y


def hiss(sec, level=0.05):
    return level * band(white(sec), 1500, 12000) * slow(sec, 0.3, 0.1, 5)


def ratchet(sec, rate=13):
    """A Bic turning a reel: the plastic ticking, the tape whispering through."""
    y = 0.05 * band(white(sec), 900, 5000) * slow(sec, 0.5, 0.3, 3)
    r = np.random.default_rng(4)
    at = 0.0
    while at < sec:
        put(y, tick(0.03) * r.uniform(0.25, 0.45), at)
        at += 1 / rate * r.uniform(0.85, 1.15)
    return y


def clack(level=0.8):
    """A cassette button, a cassette going in: plastic on plastic."""
    t = tt(0.12)
    y = band(white(0.12), 400, 5000) * np.exp(-t / 0.012) + 0.4 * np.sin(2 * np.pi * 900 * t) * np.exp(-t / 0.02)
    return (y * level).astype(np.float32)


# ── places ───────────────────────────────────────────────────────────────────────────────────────
def room(sec, seed=0, level=0.06):
    return level * shaped(sec, 1, 80, 3000) * slow(sec, 0.2, 0.15, seed)


def traffic(sec, seed=0, level=0.12):
    return level * band(shaped(sec, 1.8, 30, 900), 40, 800) * slow(sec, 0.15, 0.4, seed)


def stadium(sec, roar_at=None, seed=0):
    """A football match on a small television: the crowd's sea, a roar on the goal."""
    y = 0.12 * band(shaped(sec, 1, 300, 3500), 400, 3000) * slow(sec, 0.5, 0.3, seed)
    y += murmur(sec, 300, 2200, 5, seed + 1) * 0.08
    if roar_at is not None:
        t = tt(sec)
        swell = np.clip((t - roar_at) / 0.3, 0, 1) * np.exp(-np.clip(t - roar_at - 0.3, 0, None) / 3.5)
        y += 0.6 * band(white(sec), 300, 4000) * swell
    return band(y, 200, 5000)


def moped(sec, at, dur=4.0, away=True):
    """A tuned moped going by: its two-stroke whine rising and falling."""
    y = np.zeros(int(sec * SR), np.float32)
    t = tt(dur)
    f = 95 + 40 * np.sin(np.pi * t / dur) * (1 if not away else np.exp(-t / dur))
    ph = np.cumsum(2 * np.pi * f / SR)
    s = sum(np.sin(k * ph) / k for k in range(1, 7)).astype(np.float32)
    s = band(s, 80, 3000) * np.sin(np.pi * t / dur) ** 2 * 0.25
    put(y, s, at)
    return y


def cicadas(sec, seed=0):
    t = tt(sec)
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 38 * t) * slow(sec, 0.4, 0.5, seed)
    return 0.05 * band(white(sec), 4200, 7500) * am


def train(sec, peak, seed=0):
    t = tt(sec)
    env = np.exp(-((t - peak) / 2.6) ** 2)
    rumble = 0.5 * band(shaped(sec, 2, 25, 400), 30, 300) * env
    clacks = np.zeros_like(t)
    at = peak - 4.0
    while at < peak + 4.0:
        for dt, seed_ in ((0.0, 2), (0.18, 3)):
            c = metal(0.25, seed_) * 0.5
            c[:int(0.04 * SR)] += tick(0.04)
            put(clacks, c.astype(np.float32) * 0.3, at + dt)
        at += 1.1
    return (rumble + clacks * env).astype(np.float32)


def spray(sec, bursts):
    y = np.zeros(int(sec * SR), np.float32)
    for a, b in bursts:
        d = b - a
        s = band(white(d), 3000, 11000) * np.sin(np.pi * tt(d) / d) ** 0.3 * 0.18
        put(y, s, a)
    return y


def swallows(sec, seed=0):
    y = np.zeros(int(sec * SR), np.float32)
    r = np.random.default_rng(seed)
    for at in r.uniform(0, sec, int(sec * 1.5)):
        d = r.uniform(0.08, 0.16)
        t = tt(d)
        f = r.uniform(3500, 6000) * (1 + 0.4 * t / d)
        put(y, (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) * 0.05).astype(np.float32), at)
    return y


def wind(sec, seed=0, level=0.4):
    return level * band(shaped(sec, 1, 80, 2000), 100, 1500) * slow(sec, 0.25, 0.7, seed)


def flaps(sec, seed=0):
    y = np.zeros(int(sec * SR), np.float32)
    r = np.random.default_rng(seed)
    at = 0.5
    while at < sec:
        d = r.uniform(0.15, 0.4)
        put(y, band(white(d), 200, 2500) * np.exp(-tt(d) / (d / 3)) * r.uniform(0.08, 0.2), at)
        at += r.uniform(0.6, 2.2)
    return y


def heels(sec, seed=0):
    y = np.zeros(int(sec * SR), np.float32)
    r = np.random.default_rng(seed)
    at = r.uniform(0.5, 2)
    while at < sec:
        for k in range(r.integers(3, 7)):
            put(y, tick(0.05) * 0.25, at + k * 0.42)
        at += r.uniform(3, 6)
    return y


def clinks(sec, n, seed=0):
    y = np.zeros(int(sec * SR), np.float32)
    r = np.random.default_rng(seed)
    for at in r.uniform(0.3, sec - 0.5, n):
        put(y, metal(0.6, int(r.integers(0, 50))) * 0.12, at)
    return y


def market(sec, seed=0):
    y = murmur(sec, 250, 2600, 5, seed) * 0.3 + murmur(sec, 300, 2000, 3, seed + 1) * 0.2 + room(sec, seed, 0.08)
    return reverb(y, 0.8, 0.15) + traffic(sec, seed, 0.06)


def stairs_hits(sec, until):
    y = np.zeros(int(sec * SR), np.float32)
    at = 0.2
    while at < until:
        put(y, metal(0.5, 7) * 0.4, at)
        at += BEAT
    return y


# ── the film ─────────────────────────────────────────────────────────────────────────────────────
def shot_audio(sid, sec):
    n = int(sec * SR)
    z = np.zeros(n, np.float32)
    if sid == '01':
        y = room(sec)
        r = ratchet(8.8)
        put(y, r, 0.6)
        put(y, clack(0.7), 9.6)
        return y + hiss(sec, 0.02)
    if sid == '02':
        y = room(sec, 2) + stadium(sec, None, 2) * 0.6 + moped(sec, 8.5, 5.0, False)
        r = np.random.default_rng(2)
        for at in r.uniform(0.2, sec, 40):
            put(y, tick(0.02) * 0.08, at)
        return y
    if sid == '03':
        return room(sec, 3) + stadium(sec, 0.4, 3) * 0.8
    if sid == '04':
        y = market(sec, 4)
        r = np.random.default_rng(4)
        for at in np.sort(r.uniform(1.5, 10, 9)):
            put(y, metal(0.3, int(r.integers(0, 30))) * 0.12, at)
        return y
    if sid == '05':
        radio = band(tape(sec), 400, 2600) * 0.12
        return traffic(sec, 5) + moped(sec, -1.0, 4.5, True) + reverb(radio, 0.6, 0.3) + room(sec, 5, 0.03)
    if sid == '06':
        leak = band(tape(sec, 1.0), 900, 5000) * 0.22
        y = room(sec, 6, 0.03) + leak + hiss(sec, 0.015)
        r = np.random.default_rng(6)
        at = 2.0
        while at < sec - 1:
            d = r.uniform(0.2, 0.6)
            put(y, band(white(d), 2000, 8000) * 0.03, at)
            at += r.uniform(0.4, 1.4)
        return y
    if sid == '07':
        y = stairs_hits(sec, 4.4) + room(sec, 7, 0.04)
        put(y, band(white(0.8), 200, 2000) * np.exp(-tt(0.8) / 0.3) * 0.15, 4.3)  # the door
        return reverb(y, 2.2, 0.5)
    if sid == '08':
        box = band(tape(sec), 150, 5000) * 0.8
        return reverb(box, 0.4, 0.15) + cicadas(sec, 8) + traffic(sec, 8, 0.05)
    if sid == '09':
        return spray(sec, [(0.8, 2.6), (4.0, 5.4), (8.2, 10.0)]) + train(sec, 6.5, 9) + traffic(sec, 9, 0.05)
    if sid == '10':
        tv = murmur(sec, 300, 2500, 5, 10) * 0.12
        return swallows(sec, 10) * 2.0 + tv + traffic(sec, 10, 0.1)
    if sid == '11':
        return wind(sec, 11, 0.28) + flaps(sec, 11) * 0.8
    if sid == '12':
        y = np.zeros(n, np.float32)
        put(y, clack(0.9), 0.2)
        t = tt(sec)
        whine = 0.02 * np.sin(2 * np.pi * 7800 * t) * np.exp(-t / 1.2)
        y += whine.astype(np.float32)
        y += 0.03 * band(white(sec), 500, 4000) * np.clip((t - 2.5) / 1.5, 0, 1) * np.clip((sec - t) / 1.5, 0, 1)
        return y
    if sid == '13':
        y = murmur(sec, 250, 3000, 6, 13) * 0.25 + murmur(sec, 300, 2400, 4, 14) * 0.18 + clinks(sec, 5, 13) + heels(sec, 13)
        return reverb(y, 1.8, 0.35)
    if sid == '14':
        return market(sec, 14)
    if sid == '15':
        t = tt(sec)
        y = 0.08 * band(shaped(sec, 2, 30, 200), 35, 180) + 0.012 * np.sin(2 * np.pi * 100 * t)
        put(y, clack(0.8), 2.6)
        put(y, hiss(sec - 2.6, 0.05), 2.6)
        return y.astype(np.float32)  # the tape itself is laid in one piece by build()
    if sid == '16':
        y = np.zeros(n, np.float32)
        put(y, clack(0.9), 6.5)
        return y
    return z


def build(path, starts, voices=None):
    from shots import RUNTIME, SHOTS
    total = int(RUNTIME * SR)
    mix = np.zeros(total, np.float32)
    for s in SHOTS:
        a = shot_audio(s['id'], s['dur'] + 0.3)
        f = int(0.12 * SR)
        a[:f] *= np.linspace(0, 1, f)
        a[-f:] *= np.linspace(1, 0, f)
        put(mix, a, starts[s['id']] - 0.12)
    # the tape plays on across the cut from the car to the title: one take, no seam, until it runs out
    a, b = starts['15'] + 5.0, starts['16'] + 6.5
    put(mix, tape(b - a, 0.8) * 0.8, a)
    t = np.arange(total) / SR
    mix *= np.clip(t / 1.0, 0, 1) * np.clip((RUNTIME - t) / 0.8, 0, 1)
    if voices:
        try:
            import voci
            mix /= np.abs(mix).max() / 0.6
            v, gain = voci.track(voices, RUNTIME, bed=mix)
            mix = mix * gain[:len(mix)] + v[:len(mix)]
        except ImportError:
            pass
    mix /= np.abs(mix).max() / 0.92
    st = np.stack([mix, np.roll(mix, int(0.0007 * SR))], 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(st, -1, 1) * 32767).astype('<i2').tobytes())
    return path
