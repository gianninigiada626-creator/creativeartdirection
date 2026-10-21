// The song's clock for the shots: where we are in the bar, how open the mouth is (from the voice),
// and small motions that every puppet does to the beat.
const voce = await fetch('/la-santa/build/voce.json').then((r) => r.json()).catch(() => ({ fps: 24, mouth: [], sing: [] }));

export const BEAT = 0.5805, BAR = BEAT * 4, DOWN = 1.95;
/** The time a bar starts (bar 0 is the first downbeat, at 1.95 s). */
export const barT = (b) => DOWN + b * BAR;
/** Where T falls: bar index, beat index in the bar, phase 0..1 in the beat. */
export function grid(T) {
  const b = (T - DOWN) / BEAT;
  const beat = Math.floor(b);
  return { bar: Math.floor(beat / 4), beat: ((beat % 4) + 4) % 4, n: beat, phase: b - beat };
}
/** A kick on every beat: 1 on the beat, falling off fast. */
export const pulse = (T, sharp = 7) => Math.exp(-grid(T).phase * sharp);
/** A swing that goes one way on one beat and back on the next. */
export const swing = (T) => {
  const g = grid(T);
  return Math.sin((g.n + g.phase) * Math.PI);
};
/** The voice: how open the singer's mouth is at T (0..1), with an optional gain. */
export function mouthAt(T, gain = 1) {
  const f = T * voce.fps, i = Math.floor(f), a = voce.mouth[i] ?? 0, b = voce.mouth[i + 1] ?? a;
  return Math.min(1, (a + (b - a) * (f - i)) * gain);
}
export const singing = (T) => (voce.sing[Math.floor(T * voce.fps)] ?? 0) > 0;
/** A blink now and then: 1 when shut. Each puppet blinks on its own seed. */
export function blink(T, seed = 0) {
  const p = 3.1 + (seed % 5) * 0.37;
  const ph = ((T + seed * 1.7) % p + p) % p;
  return ph < 0.13 ? Math.sin((ph / 0.13) * Math.PI) : 0;
}
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const ease = (v) => {
  v = clamp01(v);
  return v * v * (3 - 2 * v);
};
/** Spring-in from 0 to 1 with an overshoot, as a puppet pops up into frame. */
export function pop(v) {
  v = clamp01(v);
  return 1 - Math.exp(-6 * v) * Math.cos(9 * v);
}
export const lerp = (a, b, t) => a + (b - a) * t;
export const mixPose = (a, b, t) => {
  const o = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] ?? [0, 0, 0], y = b[k] ?? [0, 0, 0];
    o[k] = x.map((v, i) => lerp(v, y[i], t));
  }
  return o;
};
