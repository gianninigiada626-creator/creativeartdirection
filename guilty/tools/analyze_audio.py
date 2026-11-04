"""Structural analysis of the supplied track (tempo, bars, energy, sections).
Usage: python3 -I analyze_audio.py <audio> <out.json>"""
import sys, json
import numpy as np
import librosa

path, out = sys.argv[1], sys.argv[2]
y, sr = librosa.load(path, sr=22050, mono=True)
dur = len(y) / sr

# end of music (trailing silence)
rms_full = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
t_rms = librosa.times_like(rms_full, sr=sr, hop_length=512)
db = librosa.amplitude_to_db(rms_full, ref=np.max)
active = np.where(db > -45)[0]
music_start, music_end = float(t_rms[active[0]]), float(t_rms[active[-1]])

hop = 512
y_h, y_p = librosa.effects.hpss(y)
oenv = librosa.onset.onset_strength(y=y_p, sr=sr, hop_length=hop)
tempo, beats = librosa.beat.beat_track(onset_envelope=oenv, sr=sr, hop_length=hop, start_bpm=90, units='frames')
tempo = float(np.atleast_1d(tempo)[0])
beat_t = librosa.frames_to_time(beats, sr=sr, hop_length=hop)

# downbeat phase: choose the beat offset (0-3) whose beats carry most low-frequency onset energy
S = np.abs(librosa.stft(y_p, hop_length=hop))
freqs = librosa.fft_frequencies(sr=sr)
low = S[freqs < 150].sum(axis=0)
low_on = np.maximum(0, np.diff(low, prepend=low[0]))
scores = [low_on[beats[k::4]].mean() for k in range(4)]
phase = int(np.argmax(scores))
bar_frames = beats[phase::4]
bar_t = librosa.frames_to_time(bar_frames, sr=sr, hop_length=hop)

# per-bar features
def seg_mean(sig, frames):
    vals = []
    for i in range(len(frames) - 1):
        a, b = frames[i], frames[i + 1]
        vals.append(float(np.mean(sig[a:b])) if b > a else 0.0)
    return vals

rms_h = librosa.feature.rms(y=y_h, hop_length=hop)[0]
rms_p = librosa.feature.rms(y=y_p, hop_length=hop)[0]
rms_a = librosa.feature.rms(y=y, hop_length=hop)[0]
cent = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop)[0]
low_band = S[freqs < 150].mean(axis=0)
bars = []
fa = seg_mean(rms_a, bar_frames); fp = seg_mean(rms_p, bar_frames); fh = seg_mean(rms_h, bar_frames)
fc = seg_mean(cent, bar_frames); fl = seg_mean(low_band, bar_frames)
for i in range(len(bar_frames) - 1):
    bars.append({"i": i + 1, "t": round(float(bar_t[i]), 2), "rms": fa[i], "perc": fp[i], "harm": fh[i], "cent": fc[i], "low": fl[i]})

# section boundaries from beat-synchronous chroma + mfcc self-similarity
chroma = librosa.feature.chroma_cqt(y=y_h, sr=sr, hop_length=hop)
mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=hop)
feat = np.vstack([librosa.util.normalize(chroma, axis=0), librosa.util.normalize(mfcc[1:], axis=1) * 0.5])
sync = librosa.util.sync(feat, bar_frames, aggregate=np.median)
results = {}
for k in (6, 8, 10, 12):
    try:
        bnd = librosa.segment.agglomerative(sync, k)
        results[str(k)] = [round(float(bar_t[min(b, len(bar_t) - 1)]), 2) for b in bnd]
    except Exception as e:  # noqa
        results[str(k)] = str(e)

# checkerboard novelty on bar-level self-similarity
X = librosa.util.normalize(sync, axis=0)
SSM = X.T @ X
n = SSM.shape[0]
def novelty(K):
    g = np.outer(np.r_[-np.ones(K), np.ones(K)], np.r_[-np.ones(K), np.ones(K)])
    nov = np.zeros(n)
    P = np.pad(SSM, K, mode='edge')
    for i in range(n):
        nov[i] = np.sum(P[i:i + 2 * K, i:i + 2 * K] * g)
    return nov
nov = novelty(4)
nov = (nov - nov.min()) / (np.ptp(nov) + 1e-9)
peaks = [i for i in range(2, n - 2) if nov[i] == max(nov[i - 2:i + 3]) and nov[i] > 0.35]

# recurrence labelling: cluster bars into section types
from sklearn.cluster import AgglomerativeClustering  # librosa depends on scikit-learn
labels = AgglomerativeClustering(n_clusters=4).fit_predict(X.T).tolist()

json.dump({
    "duration": dur, "music_start": music_start, "music_end": music_end,
    "tempo": tempo, "n_beats": int(len(beats)), "first_beat": float(beat_t[0]),
    "beat_period": float(np.median(np.diff(beat_t))), "downbeat_phase": phase,
    "bar_times": [round(float(t), 3) for t in bar_t], "bars": bars,
    "agglomerative": results, "novelty": [round(float(v), 3) for v in nov],
    "novelty_peaks_bar": peaks, "novelty_peaks_t": [round(float(bar_t[p]), 2) for p in peaks],
    "bar_labels": labels,
}, open(out, "w"), indent=1)
print("tempo", tempo, "bars", len(bar_t), "music", music_start, music_end)
print("novelty peaks", [round(float(bar_t[p]), 1) for p in peaks])
print("agglo", results)
