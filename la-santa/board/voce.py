"""Where the voice is, syllable by syllable: the mouth of the puppet follows it.

The rap sits in the middle of the stereo picture and in the speech band; the beat is wide or low.
So: the mid channel, minus what the side channel shares with it, band-passed to the speech band,
its loudness as an envelope, and the onsets of syllables on it. Written per frame of a 24 fps grid:

  python3 voce.py <song.mp3> <out.json>
"""
import json
import sys

import librosa
import numpy as np
import scipy.signal as sg

FPS = 24


def main(src, out):
    y, sr = librosa.load(src, sr=22050, mono=False)
    if y.ndim == 1:
        y = np.stack([y, y])
    mid, side = (y[0] + y[1]) / 2, (y[0] - y[1]) / 2
    # the harmonic part of the mid: the voice and the pads, not the drums
    S = librosa.stft(mid, n_fft=1024, hop_length=256)
    H, P = librosa.decompose.hpss(S, margin=(1.0, 2.0))
    Ss = np.abs(librosa.stft(side, n_fft=1024, hop_length=256))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=1024)
    band = (freqs > 280) & (freqs < 3800)
    # what is in the middle and not on the sides
    voice = np.clip(np.abs(H[band]) - 0.7 * Ss[band], 0, None)
    env = voice.sum(axis=0)
    t = librosa.frames_to_time(np.arange(env.size), sr=sr, hop_length=256)
    # syllables: the rises of the envelope
    on = librosa.onset.onset_strength(S=librosa.amplitude_to_db(voice + 1e-6), sr=sr, hop_length=256)
    # to the frame grid
    dur = len(mid) / sr
    n = int(dur * FPS)
    grid = np.arange(n) / FPS
    e = np.interp(grid, t, env)
    o = np.interp(grid, t, on[: t.size] if on.size >= t.size else np.pad(on, (0, t.size - on.size)))
    e = sg.savgol_filter(e, 5, 2)
    lo, hi = np.percentile(e, 20), np.percentile(e, 97)
    e = np.clip((e - lo) / (hi - lo), 0, 1)
    o = np.clip(o / (np.percentile(o, 98) + 1e-6), 0, 1)
    # a mouth: open with the loudness, snapping open on each syllable, closing between them
    mouth = np.zeros(n)
    m = 0.0
    for i in range(n):
        target = e[i] * (0.55 + 0.45 * o[i])
        m = target if target > m else m * 0.55 + target * 0.45
        mouth[i] = m
    # where he is singing at all (for the shots that cut away from him)
    sing = sg.medfilt((e > 0.18).astype(float), 13)
    json.dump({'fps': FPS, 'dur': dur, 'mouth': [round(float(v), 3) for v in mouth], 'sing': [int(v) for v in sing]}, open(out, 'w'))
    print('frames', n, 'singing', round(float(sing.mean()) * 100), '%')


if __name__ == '__main__':
    main(*sys.argv[1:3])
