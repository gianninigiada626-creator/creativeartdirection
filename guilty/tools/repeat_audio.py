"""Find repeated 4/8-bar blocks (hooks) and vocal-band activity per bar.
Usage: python3 -I repeat_audio.py <audio> <analysis.json> <out.json>"""
import sys, json
import numpy as np
import librosa

path, ana, out = sys.argv[1:4]
d = json.load(open(ana))
y, sr = librosa.load(path, sr=22050, mono=True)
hop = 512
y_h, y_p = librosa.effects.hpss(y, margin=2.0)
bar_t = np.array(d["bar_times"])
beat_period = d["beat_period"]
# beat grid (4 per bar)
beats_t = np.concatenate([bar_t[i] + np.arange(4) * (bar_t[i + 1] - bar_t[i]) / 4 for i in range(len(bar_t) - 1)])
bf = librosa.time_to_frames(beats_t, sr=sr, hop_length=hop)

mf = librosa.feature.mfcc(y=y_h, sr=sr, n_mfcc=20, hop_length=hop)[1:]
mf = (mf - mf.mean(axis=1, keepdims=True)) / (mf.std(axis=1, keepdims=True) + 1e-9)
ch = librosa.feature.chroma_cqt(y=y_h, sr=sr, hop_length=hop)
ch = (ch - ch.mean(axis=1, keepdims=True)) / (ch.std(axis=1, keepdims=True) + 1e-9)
F = np.vstack([mf, ch * 0.7])
B = librosa.util.sync(F, bf, aggregate=np.mean)[:, :len(beats_t)]
B = B / (np.linalg.norm(B, axis=0, keepdims=True) + 1e-9)
S = B.T @ B  # beat-level similarity
nbar = len(bar_t) - 1
def block_score(i, j, L):  # bars i..i+L vs j..j+L along diagonal
    a, b = i * 4, j * 4
    n = L * 4
    if a + n > S.shape[0] or b + n > S.shape[0]:
        return np.nan
    return float(np.mean([S[a + k, b + k] for k in range(n)]))
res = {}
for L in (4, 8):
    M = np.full((nbar, nbar), np.nan)
    for i in range(nbar):
        for j in range(i + L, nbar):
            M[i, j] = block_score(i, j, L)
    flat = [(M[i, j], i + 1, j + 1) for i in range(nbar) for j in range(nbar) if not np.isnan(M[i, j])]
    flat.sort(reverse=True)
    base = np.nanmedian(M)
    res[str(L)] = {"median": float(base), "top": [(round(s, 3), i, j) for s, i, j in flat[:25]]}

# vocal-band activity: harmonic energy 250-3500 Hz with the 2-bar loop removed (difference from loop average)
Sh = np.abs(librosa.stft(y_h, hop_length=hop))
fr = librosa.fft_frequencies(sr=sr)
band = Sh[(fr > 250) & (fr < 3500)].sum(axis=0)
bar_frames = librosa.time_to_frames(bar_t, sr=sr, hop_length=hop)
vb = [float(np.mean(band[bar_frames[i]:bar_frames[i + 1]])) for i in range(nbar)]
flat_sp = librosa.feature.spectral_flatness(y=y_h, hop_length=hop)[0]
fl = [float(np.mean(flat_sp[bar_frames[i]:bar_frames[i + 1]])) for i in range(nbar)]
json.dump({"repeat": res, "vocal_band": vb, "flatness": fl}, open(out, "w"), indent=1)
for L in ("4", "8"):
    print("L", L, "median", round(res[L]["median"], 3))
    for s, i, j in res[L]["top"][:15]:
        print("   ", s, "bars", i, "->", j, "t", round(bar_t[i - 1], 1), round(bar_t[j - 1], 1))
v = np.array(vb); v = v / v.max()
print("vocal band per bar:", " ".join(f"{k+1}:{x:.2f}" for k, x in enumerate(v)))
