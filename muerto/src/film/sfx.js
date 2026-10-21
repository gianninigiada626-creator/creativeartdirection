// Synthesised foley. Every function takes (ctx, out, when) and works on both a live AudioContext
// and an OfflineAudioContext, so the exported video carries exactly what the browser plays.

const noiseCache = new WeakMap();

function noise(ctx) {
  let buf = noiseCache.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let seed = 1337;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 16807) % 2147483647;
      d[i] = (seed / 2147483647) * 2 - 1;
    }
    noiseCache.set(ctx, buf);
  }
  return buf;
}

function noiseSource(ctx, when, dur, offset = 0) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  src.loop = true;
  src.start(when, offset % 1.9, dur + 0.1);
  return src;
}

function env(ctx, when, { a = 0.005, h = 0, r = 0.1, peak = 1 }) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(peak, when + a);
  g.gain.setValueAtTime(peak, when + a + h);
  g.gain.exponentialRampToValueAtTime(0.0001, when + a + h + r);
  return g;
}

function filtered(ctx, type, freq, q = 1) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

/** Short plastic/metal click. */
export function click(ctx, out, when, { freq = 3200, gain = 0.5, decay = 0.035 } = {}) {
  const src = noiseSource(ctx, when, decay + 0.02, when * 7.3);
  const bp = filtered(ctx, 'bandpass', freq, 3);
  const g = env(ctx, when, { a: 0.001, r: decay, peak: gain });
  src.connect(bp).connect(g).connect(out);
}

/** Low body thump under a click. */
export function thump(ctx, out, when, { freq = 90, gain = 0.6, decay = 0.09 } = {}) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq * 1.8, when);
  o.frequency.exponentialRampToValueAtTime(freq, when + 0.04);
  const g = env(ctx, when, { a: 0.002, r: decay, peak: gain });
  o.connect(g).connect(out);
  o.start(when);
  o.stop(when + decay + 0.05);
}

/** Front-panel button. */
export function button(ctx, out, when) {
  click(ctx, out, when, { freq: 2400, gain: 0.35, decay: 0.02 });
  click(ctx, out, when + 0.07, { freq: 1800, gain: 0.25, decay: 0.025 });
}

/** Tray motor: geared whine with a plastic rattle, ending in a latch clack. */
export function trayMotor(ctx, out, when, dur = 1) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(70, when);
  o.frequency.linearRampToValueAtTime(96, when + dur * 0.3);
  o.frequency.linearRampToValueAtTime(88, when + dur);
  const lp = filtered(ctx, 'lowpass', 700, 2);
  const g = env(ctx, when, { a: 0.04, h: dur - 0.1, r: 0.06, peak: 0.22 });
  o.connect(lp).connect(g).connect(out);
  o.start(when);
  o.stop(when + dur + 0.1);

  const gear = noiseSource(ctx, when, dur, when * 3.1);
  const bp = filtered(ctx, 'bandpass', 1400, 6);
  const am = ctx.createGain();
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 38;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.5;
  lfo.connect(lfoDepth).connect(am.gain);
  am.gain.value = 0.5;
  const g2 = env(ctx, when, { a: 0.05, h: dur - 0.12, r: 0.06, peak: 0.28 });
  gear.connect(bp).connect(am).connect(g2).connect(out);
  lfo.start(when);
  lfo.stop(when + dur + 0.1);

  click(ctx, out, when + dur, { freq: 2600, gain: 0.7, decay: 0.05 });
  thump(ctx, out, when + dur, { freq: 110, gain: 0.5 });
}

/** Disc dropping into the tray: two light plastic ticks and a short resonance. */
export function discDrop(ctx, out, when) {
  click(ctx, out, when, { freq: 4200, gain: 0.45, decay: 0.03 });
  click(ctx, out, when + 0.045, { freq: 3600, gain: 0.3, decay: 0.04 });
  const o = ctx.createOscillator();
  o.frequency.value = 1730;
  const g = env(ctx, when, { a: 0.002, r: 0.18, peak: 0.05 });
  o.connect(g).connect(out);
  o.start(when);
  o.stop(when + 0.25);
}

/** Spindle spin-up: a rising whine and a whoosh of air. */
export function spinUp(ctx, out, when, dur = 2.4) {
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(120, when);
  o.frequency.exponentialRampToValueAtTime(1350, when + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.05, when + dur * 0.4);
  g.gain.setValueAtTime(0.05, when + dur);
  g.gain.exponentialRampToValueAtTime(0.012, when + dur + 1.5);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur + 6);
  o.connect(g).connect(out);
  o.start(when);
  o.stop(when + dur + 6.2);

  const air = noiseSource(ctx, when, dur + 6, when * 1.7);
  const lp = filtered(ctx, 'lowpass', 300, 0.7);
  lp.frequency.setValueAtTime(200, when);
  lp.frequency.exponentialRampToValueAtTime(2200, when + dur);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.0001, when);
  g2.gain.exponentialRampToValueAtTime(0.09, when + dur);
  g2.gain.exponentialRampToValueAtTime(0.03, when + dur + 1.5);
  g2.gain.exponentialRampToValueAtTime(0.0001, when + dur + 6);
  air.connect(lp).connect(g2).connect(out);
}

/** Laser sled seeking: irregular ticks and short servo buzzes. */
export function laserSeek(ctx, out, when, dur = 3.5) {
  let t = when;
  let i = 0;
  while (t < when + dur) {
    const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    click(ctx, out, t, { freq: 5200 + r * 2000, gain: 0.18 + r * 0.15, decay: 0.008 });
    if (i % 5 === 2) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(380 + r * 300, t);
      o.frequency.linearRampToValueAtTime(220, t + 0.09);
      const lp = filtered(ctx, 'lowpass', 1800, 1);
      const g = env(ctx, t, { a: 0.003, h: 0.05, r: 0.04, peak: 0.035 });
      o.connect(lp).connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.12);
    }
    t += 0.05 + r * 0.22;
    i++;
  }
}

/** Dark room tone: sub drone with breathing noise. */
export function roomTone(ctx, out, when, dur, { gain = 0.08 } = {}) {
  const o = ctx.createOscillator();
  o.frequency.value = 49;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 2);
  g.gain.setValueAtTime(gain, when + dur - 1.5);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g).connect(out);
  o.start(when);
  o.stop(when + dur + 0.1);

  const n = noiseSource(ctx, when, dur, when);
  const lp = filtered(ctx, 'lowpass', 420, 0.5);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.0001, when);
  g2.gain.exponentialRampToValueAtTime(gain * 0.5, when + 2);
  g2.gain.setValueAtTime(gain * 0.5, when + dur - 1.5);
  g2.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  n.connect(lp).connect(g2).connect(out);
}

/** Air whoosh, for the disc flip and camera moves. */
export function whoosh(ctx, out, when, dur = 0.9, { gain = 0.18 } = {}) {
  const n = noiseSource(ctx, when, dur, when * 2.3);
  const bp = filtered(ctx, 'bandpass', 400, 1.2);
  bp.frequency.setValueAtTime(300, when);
  bp.frequency.exponentialRampToValueAtTime(2400, when + dur * 0.55);
  bp.frequency.exponentialRampToValueAtTime(500, when + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  n.connect(bp).connect(g).connect(out);
}

/** CRT power: static burst and the flyback whine. */
export function crt(ctx, out, when, { on = true } = {}) {
  const n = noiseSource(ctx, when, 0.5, when * 5.1);
  const hp = filtered(ctx, 'highpass', 1500, 0.7);
  const g = env(ctx, when, { a: 0.005, h: on ? 0.08 : 0.02, r: on ? 0.35 : 0.2, peak: 0.16 });
  n.connect(hp).connect(g).connect(out);
  const o = ctx.createOscillator();
  o.frequency.value = on ? 7800 : 6400;
  const g2 = env(ctx, when, { a: 0.01, h: 0.2, r: 0.6, peak: 0.012 });
  o.connect(g2).connect(out);
  o.start(when);
  o.stop(when + 1);
  thump(ctx, out, when, { freq: 60, gain: 0.35, decay: 0.2 });
}

/** Scissors snip. */
export function snip(ctx, out, when) {
  click(ctx, out, when, { freq: 6500, gain: 0.25, decay: 0.012 });
  click(ctx, out, when + 0.018, { freq: 4800, gain: 0.18, decay: 0.02 });
}

/** Paper rustle (newspaper). */
export function rustle(ctx, out, when, dur = 0.5) {
  const n = noiseSource(ctx, when, dur, when * 4.4);
  const bp = filtered(ctx, 'bandpass', 3000, 0.8);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  for (let k = 0; k < 6; k++) {
    const tk = when + (k / 6) * dur;
    g.gain.exponentialRampToValueAtTime(0.12 + (k % 2) * 0.08, tk + 0.02);
    g.gain.exponentialRampToValueAtTime(0.01, tk + dur / 6);
  }
  n.connect(bp).connect(g).connect(out);
}

/** Shop door bell. */
export function bell(ctx, out, when) {
  [1318, 1975, 2637].forEach((f, k) => {
    const o = ctx.createOscillator();
    o.frequency.value = f;
    const g = env(ctx, when + k * 0.01, { a: 0.002, r: 1.2 - k * 0.3, peak: 0.08 / (k + 1) });
    o.connect(g).connect(out);
    o.start(when);
    o.stop(when + 1.4);
  });
  click(ctx, out, when + 0.15, { freq: 2000, gain: 0.2 });
}

/** One footstep on a hard floor. */
export function step(ctx, out, when, { gain = 0.22 } = {}) {
  thump(ctx, out, when, { freq: 70, gain: gain * 1.2, decay: 0.06 });
  click(ctx, out, when + 0.004, { freq: 1100, gain: gain * 0.6, decay: 0.03 });
}

/** V8 idle-to-cruise rumble. */
export function engine(ctx, out, when, dur = 10, { gain = 0.09 } = {}) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(38, when);
  o.frequency.linearRampToValueAtTime(62, when + Math.min(3, dur * 0.3));
  o.frequency.setValueAtTime(62, when + dur - 2.5);
  o.frequency.linearRampToValueAtTime(36, when + dur);
  const lp = filtered(ctx, 'lowpass', 260, 1.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.6);
  g.gain.setValueAtTime(gain, when + dur - 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(lp).connect(g).connect(out);
  o.start(when);
  o.stop(when + dur + 0.1);
}

/** Hydraulic pump hiss and clunk. */
export function hydraulic(ctx, out, when) {
  const n = noiseSource(ctx, when, 0.35, when * 3.3);
  const bp = filtered(ctx, 'bandpass', 2600, 0.9);
  const g = env(ctx, when, { a: 0.01, h: 0.08, r: 0.22, peak: 0.16 });
  n.connect(bp).connect(g).connect(out);
  thump(ctx, out, when + 0.02, { freq: 55, gain: 0.5, decay: 0.18 });
  click(ctx, out, when + 0.03, { freq: 900, gain: 0.25, decay: 0.05 });
}

/** Iron gate creak. */
export function creak(ctx, out, when, dur = 1.6) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(140, when);
  o.frequency.linearRampToValueAtTime(95, when + dur * 0.4);
  o.frequency.linearRampToValueAtTime(170, when + dur);
  const am = ctx.createGain();
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 23;
  const depth = ctx.createGain();
  depth.gain.value = 0.6;
  lfo.connect(depth).connect(am.gain);
  am.gain.value = 0.5;
  const bp = filtered(ctx, 'bandpass', 900, 4);
  const g = env(ctx, when, { a: 0.1, h: dur - 0.3, r: 0.2, peak: 0.12 });
  o.connect(bp).connect(am).connect(g).connect(out);
  o.start(when);
  o.stop(when + dur + 0.1);
  lfo.start(when);
  lfo.stop(when + dur + 0.1);
}

/** A short minor chord stab with a bright attack, for the mission card. */
export function stab(ctx, out, when) {
  [220, 261.6, 329.6, 440].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 3 ? 'triangle' : 'square';
    o.frequency.value = f;
    const lp = filtered(ctx, 'lowpass', 2400, 0.7);
    const g = env(ctx, when, { a: 0.008, h: 0.25, r: 1.1, peak: 0.035 });
    o.connect(lp).connect(g).connect(out);
    o.start(when);
    o.stop(when + 1.5);
  });
  thump(ctx, out, when, { freq: 55, gain: 0.5, decay: 0.4 });
}

/** Liquid pour. */
export function pour(ctx, out, when, dur = 0.9) {
  const n = noiseSource(ctx, when, dur, when * 6.1);
  const bp = filtered(ctx, 'bandpass', 1100, 2);
  bp.frequency.setValueAtTime(700, when);
  bp.frequency.linearRampToValueAtTime(1600, when + dur);
  const g = env(ctx, when, { a: 0.05, h: dur - 0.15, r: 0.1, peak: 0.12 });
  n.connect(bp).connect(g).connect(out);
}

/** Lighter: wheel scratch and the flame catching. */
export function lighter(ctx, out, when) {
  click(ctx, out, when, { freq: 5200, gain: 0.3, decay: 0.03 });
  const n = noiseSource(ctx, when + 0.04, 0.5, when * 2.7);
  const lp = filtered(ctx, 'lowpass', 900, 0.8);
  const g = env(ctx, when + 0.04, { a: 0.03, h: 0.2, r: 0.3, peak: 0.08 });
  n.connect(lp).connect(g).connect(out);
}

/** Car door. */
export function door(ctx, out, when) {
  thump(ctx, out, when, { freq: 75, gain: 0.6, decay: 0.15 });
  click(ctx, out, when + 0.01, { freq: 1500, gain: 0.35, decay: 0.06 });
}

export const SFX = { click, thump, button, trayMotor, discDrop, spinUp, laserSeek, roomTone, whoosh, crt, snip, rustle, bell, step, engine, hydraulic, creak, stab, pour, lighter, door };
