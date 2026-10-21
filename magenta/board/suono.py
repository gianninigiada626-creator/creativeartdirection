"""A temp sound track for MAGENTA, synthesized: the projector (twenty-four beats a second, the film's heart),
the room tone of each place (the cold store's compressor, the lab's fans, the care home's fridge and the sea
behind the glass, the rain, the road), a click for every frame Elio steps through, Oksana's lullaby hummed,
and an organ on the end titles. Not the film's sound: a guide for timing and mood. The voices are to be
recorded (VOCI.md); until then the lines are in the subtitles.

    python3 suono.py      → build/suono.wav
"""
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'a-parte', 'board'))
import sound as S  # noqa: E402  (A PARTE's generators: noise, bands, reverb, room tones)

import film  # noqa: E402

SR = S.SR
OUT = os.path.join(film.ROOT, 'build', 'suono.wav')


def tt(sec):
    return S.tt(sec)


def projector(sec, rate=24.0, start=None, stop=None, seed=0):
    """The projector: the claw pulling down a frame twenty-four times a second, the motor, the fan."""
    n = int(sec * SR)
    y = np.zeros(n, np.float32)
    clk = S.band(S.white(0.03), 900, 6000) * np.exp(-tt(0.03) / 0.004)
    clk2 = S.band(S.white(0.03), 300, 2000) * np.exp(-tt(0.03) / 0.008) * 0.6
    t, k = 0.0, 0
    r = np.random.default_rng(seed)
    while t < sec:
        f = rate
        if start is not None and t < start:
            f = max(2.0, rate * (t / start) ** 0.7)
        if stop is not None and t > sec - stop:
            f = max(1.5, rate * ((sec - t) / stop) ** 1.2)
        S.put(y, clk * (0.8 + 0.2 * r.random()), t, 0.5)
        S.put(y, clk2, t + 0.012, 0.35)
        t += 1.0 / f
        k += 1
    env = np.ones(n, np.float32)
    if start is not None:
        env = np.minimum(1, tt(sec) / max(0.1, start)).astype(np.float32)
    if stop is not None:
        env = env * np.clip((sec - tt(sec)) / stop, 0, 1).astype(np.float32)
    motor = S.engine(sec, f0=50) * 0.12 * env
    fan = S.band(S.white(sec), 200, 3000) * 0.05 * env
    return y + motor + fan


def hum(sec, f0=60, seed=0):
    t = tt(sec)
    y = sum(np.sin(2 * np.pi * f0 * k * t) / k ** 1.5 for k in range(1, 6)).astype(np.float32)
    return y * S.slow(sec, 0.2, 0.15, seed)


def sea_behind_glass(sec, seed=0):
    return S.band(S.sea(sec, seed), 40, 700) * 0.5


def hummed(notes, bpm=66, seed=1):
    """A woman humming softly: a voice-like tone, a little vibrato, breathing between phrases."""
    beat = 60.0 / bpm
    total = sum(d for _, d in notes) * beat + 1.0
    y = np.zeros(int(total * SR), np.float32)
    t = 0.0
    for f, d in notes:
        dur = d * beat
        if f:
            tl = tt(dur * 1.05)
            vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * tl) * np.minimum(1, tl / 0.3)
            ph = np.cumsum(2 * np.pi * f * vib / SR)
            v = sum(a * np.sin(k * ph) for k, a in [(1, 1.0), (2, 0.45), (3, 0.22), (4, 0.1)]).astype(np.float32)
            env = np.minimum(1, tl / 0.08) * np.minimum(1, (dur * 1.05 - tl) / 0.15)
            S.put(y, S.band(v * env, 180, 2600), t, 0.6)
        t += dur
    return S.reverb(y, 1.6, 0.35)


def lullaby():
    # a slow minor tune in the manner of the old Ukrainian lullabies (temp, not the real melody)
    A3, B3, C4, D4, E4, F4, G4, A4 = 220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0
    phrase1 = [(E4, 1), (A4, 1), (A4, 1), (G4, 0.5), (F4, 0.5), (E4, 2), (0, 0.5),
               (D4, 1), (F4, 1), (E4, 1), (D4, 0.5), (C4, 0.5), (B3, 2), (0, 0.5)]
    phrase2 = [(C4, 1), (E4, 1), (D4, 1), (C4, 0.5), (B3, 0.5), (A3, 2.5), (0, 1)]
    return hummed(phrase1 + phrase2 + phrase1[:7] + phrase2)


def organ(sec):
    """An organ, slowly: a chorale-like progression in D minor, four voices (a temp for the Bach chorale)."""
    def hz(m):
        return 440.0 * 2 ** ((m - 69) / 12)
    chords = [(50, 57, 62, 65), (46, 58, 62, 65), (43, 55, 62, 67), (45, 57, 61, 64),
              (50, 57, 62, 65), (48, 55, 60, 64), (45, 52, 61, 64), (50, 57, 62, 66)]
    per = sec / len(chords)
    y = np.zeros(int(sec * SR) + SR, np.float32)
    for i, ch in enumerate(chords):
        tl = tt(per * 1.08)
        env = np.minimum(1, tl / 0.12) * np.minimum(1, (per * 1.08 - tl) / 0.25)
        v = np.zeros_like(tl)
        for m in ch:
            f = hz(m)
            for k, a in [(1, 1.0), (2, 0.5), (3, 0.3), (4, 0.22), (6, 0.12), (8, 0.08)]:
                v += a * np.sin(2 * np.pi * f * k * tl * (1 + 0.0007 * k))
        S.put(y, (v * env * 0.06).astype(np.float32), i * per)
    return S.reverb(y, 3.2, 0.5)[: int(sec * SR)]


def ambience(name, sec, seed):
    if name == 'proiettore':
        return projector(sec, seed=seed) * 0.8
    if name == 'archivio':
        return hum(sec, 50, seed) * 0.08 + S.band(S.white(sec), 80, 1200) * 0.05
    if name == 'laboratorio':
        return S.band(S.white(sec), 150, 2400) * 0.06 + hum(sec, 100, seed) * 0.02
    if name == 'stanza':
        return S.room(sec, seed) * 0.6 + hum(sec, 50, seed) * 0.03 + sea_behind_glass(sec, seed) * 0.5
    if name == 'corridoio':
        return S.room(sec, seed) * 0.5 + hum(sec, 50, seed) * 0.06
    if name == 'pioggia':
        return S.rain(sec, seed) * 0.6 + S.room(sec, seed) * 0.3
    if name == 'auto':
        return S.engine(sec, 32) * 0.18 + S.band(S.white(sec), 60, 900) * 0.12
    if name == 'notte':
        return S.room(sec, seed) * 0.35 + sea_behind_glass(sec, seed) * 0.4
    if name == 'mattino':
        return S.room(sec, seed) * 0.5 + sea_behind_glass(sec, seed) * 0.6
    if name == 'mare':
        return S.sea(sec, seed) * 0.7 + S.wind(sec, 0.4, seed) * 0.2
    return np.zeros(int(sec * SR), np.float32)


def build():
    tl, total = film.timeline()
    mix = np.zeros(int((total + 2) * SR), np.float32)
    fade = int(0.25 * SR)
    for k, (st, s) in enumerate(tl):
        sec = s['dur']
        sid = s['id']
        a = ambience(None if sid in ('01', '34') else s.get('amb'), sec + 0.25, k)
        if len(a):
            a = a.copy()
            a[:fade] *= np.linspace(0, 1, fade)
            a[-fade:] *= np.linspace(1, 0, fade)
            S.put(mix, a, st)
        if sid == '01':
            # the arc strikes
            S.put(mix, projector(sec + 0.25, start=3.0, seed=1) * 0.5, st)
            S.put(mix, S.thud(60, 0.5, 0.8) * 0.8, st + 2.6)
            S.put(mix, S.band(S.white(0.4), 2000, 9000) * np.exp(-tt(0.4) / 0.05) * 0.4, st + 2.6)
        if s['kind'] == 'insert' and s.get('frames'):
            # a click for every frame stepped through
            prev = None
            for i in range(int(sec * 24)):
                f = s['frames'](i / 24)
                if f != prev and prev is not None:
                    S.put(mix, S.tick() * 0.5, st + i / 24)
                prev = f
        if sid == '21':
            S.put(mix, lullaby() * 0.55, st + 1.5)
        if sid == '34':
            # the projector slows down and stops on the last black
            S.put(mix, projector(sec + 3, stop=4.0, seed=34) * 0.8, st)
        if sid == '35':
            S.put(mix, organ(sec - 1.0) * 0.9, st + 1.0)
    mix /= np.abs(mix).max() + 1e-9
    mix *= 0.7
    st = np.stack([mix, np.roll(mix, int(0.0007 * SR))], axis=1)
    pcm = (np.clip(st[: int(total * SR)], -1, 1) * 32767).astype(np.int16)
    with wave.open(OUT, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(OUT, f'{total:.1f}s')


if __name__ == '__main__':
    build()
