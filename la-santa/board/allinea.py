"""Lay the lyrics on the song without a speech model: count the syllables of each line, count the
syllables the voice actually attacks (onsets in the speech band of the mid channel), and find the
line starts on the eighth-note grid that make the two counts agree best, with breaths allowed between.

  python3 allinea.py <song.mp3> <testo.txt> <out.json>
"""
import json
import re
import sys

import librosa
import numpy as np

BPM_BEAT, DOWN = 0.5805, 1.95


def syllables(line):
    n = 0
    for w in re.findall(r"[\wàèéìòù']+", line.lower()):
        if w.isdigit():
            n += {'1': 3, '9': 2}.get(w, 2)  # "uno", "nove"
            continue
        if len(w) <= 2 and w.upper() == w.upper() and not re.search('[aeiouàèéìòù]', w):
            n += len(w)  # letters spelled out: L, S
            continue
        n += max(1, len(re.findall(r'[aeiouyàèéìòù]+', w)))
    return n


def main(src, txt, out):
    lines = [l.strip() for l in open(txt) if l.strip()]
    syl = np.array([syllables(l) for l in lines], float)
    y, sr = librosa.load(src, sr=22050, mono=False)
    mid, side = (y[0] + y[1]) / 2, (y[0] - y[1]) / 2
    S = librosa.stft(mid, n_fft=1024, hop_length=256)
    H, _ = librosa.decompose.hpss(S, margin=(1.0, 2.0))
    Ss = np.abs(librosa.stft(side, n_fft=1024, hop_length=256))
    f = librosa.fft_frequencies(sr=sr, n_fft=1024)
    band = (f > 280) & (f < 3800)
    voice = np.clip(np.abs(H[band]) - 0.7 * Ss[band], 0, None)
    env = voice.sum(0)
    env = env / np.percentile(env, 97)
    on = librosa.onset.onset_strength(S=librosa.amplitude_to_db(voice + 1e-6), sr=sr, hop_length=256)
    pk = librosa.onset.onset_detect(onset_envelope=on, sr=sr, hop_length=256, units='frames', backtrack=False, delta=0.25, wait=2)
    pk = pk[env[np.minimum(pk, env.size - 1)] > 0.12]
    ot = librosa.frames_to_time(pk, sr=sr, hop_length=256)
    # the eighth-note grid over the part with voice
    step = BPM_BEAT / 2
    grid = DOWN + step * np.arange(int((10.0 - DOWN) / step), int((95.0 - DOWN) / step) + 1)
    G = grid.size
    cnt = np.searchsorted(ot, grid)  # onsets before each grid point
    c = lambda a, b: cnt[b] - cnt[a]
    alpha = c(0, G - 1) / syl.sum()
    L = len(lines)
    INF = 1e18
    # a rapper starts a line on the bar, or a beat or an eighth before it; never inside the break (bar 26)
    pos = np.round((grid - DOWN) / step).astype(int) % 8
    startc = np.where(np.isin(pos, [0, 7, 6]), 0.0, 0.9)
    barno = np.floor((grid - DOWN) / (8 * step) + 1e-6)
    startc[barno == 26] = 50.0
    MAXD, MAXG = 20, 12
    cost = np.full((L + 1, G), INF)
    back = np.zeros((L + 1, G, 2), int)
    cost[0, :] = 0.0
    # nothing should start before the voice comes in: a start later than the first grid costs nothing,
    # but the onsets skipped before the first line are charged
    for j in range(G):
        cost[0, j] = 0.6 * c(0, j) + startc[j]
    for i in range(L):
        exp_n = alpha * syl[i]
        exp_d = syl[i] * 0.16 + 0.3
        for j in range(G):
            if cost[i, j] >= INF:
                continue
            for k in range(j + 2, min(G, j + MAXD + 1)):
                n = c(j, k)
                d = grid[k] - grid[j]
                lc = (n - exp_n) ** 2 / (exp_n + 2) + 0.8 * ((d - exp_d) / exp_d) ** 2
                for g in range(0, MAXG + 1):
                    k2 = k + g
                    if k2 >= G:
                        break
                    gc = 0.0 if g == 0 else 0.15 + 1.2 * c(k, k2)
                    v = cost[i, j] + lc + gc + startc[k2]
                    if v < cost[i + 1, k2]:
                        cost[i + 1, k2] = v
                        back[i + 1, k2] = (j, k)
    # the last line ends by the end of the voice: charge the onsets left after it
    tail = np.array([cost[L, j] + 0.6 * c(j, G - 1) for j in range(G)])
    j = int(np.argmin(tail))
    spans = []
    for i in range(L, 0, -1):
        s, e = back[i, j]
        spans.append((float(grid[s]), float(grid[e])))
        j = s
    spans.reverse()
    res = [{'line': l, 'start': round(s, 3), 'end': round(e, 3), 'bar': round((s - DOWN) / (4 * BPM_BEAT), 2)} for l, (s, e) in zip(lines, spans)]
    json.dump(res, open(out, 'w'), ensure_ascii=False, indent=1)
    for r in res:
        print(f"{r['start']:6.2f}-{r['end']:6.2f}  bar {r['bar']:5.2f}  {r['line']}")


if __name__ == '__main__':
    main(*sys.argv[1:4])
