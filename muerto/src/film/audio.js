import { SFX } from './sfx.js';

/**
 * One clock for picture and sound. Film time t = ctx.currentTime - origin.
 * Cues are { t, name, args } entries pointing at functions in sfx.js.
 * The song is scheduled at schedule.songStart. Seeking rebuilds the schedule from that point.
 */
export class AudioEngine {
  constructor() {
    this.cues = [];
    this.song = null; // AudioBuffer
    this.songStart = 0;
    this.ctx = null;
    this.bus = null;
    this.origin = 0;
    this.playing = false;
    this.muted = false;
  }

  setCues(cues, songStart) {
    this.cues = cues.slice().sort((a, b) => a.t - b.t);
    this.songStart = songStart;
  }

  async loadSong(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Song not found: ${url} (${res.status})`);
    const data = await res.arrayBuffer();
    const tmp = new OfflineAudioContext(2, 44100, 44100);
    this.song = await tmp.decodeAudioData(data);
    return this.song.duration;
  }

  ensureContext() {
    if (!this.ctx) this.ctx = new AudioContext({ latencyHint: 'playback' });
    return this.ctx;
  }

  /** Schedule everything from film time `from` and start the clock. Must follow a user gesture the first time. */
  async play(from = 0) {
    const ctx = this.ensureContext();
    await ctx.resume();
    this.stopSources();
    const bus = ctx.createGain();
    bus.gain.value = this.muted ? 0 : 1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 3;
    bus.connect(comp).connect(ctx.destination);
    this.bus = bus;
    this.origin = ctx.currentTime + 0.06 - from;
    this.schedule(ctx, bus, this.origin, from);
    this.playing = true;
  }

  schedule(ctx, out, origin, from) {
    for (const cue of this.cues) {
      if (cue.t < from - 0.02) continue;
      const fn = SFX[cue.name];
      if (fn) fn(ctx, out, origin + cue.t, ...(cue.args ?? []));
    }
    if (this.song) {
      const src = ctx.createBufferSource();
      src.buffer = this.song;
      src.connect(out);
      const offset = Math.max(0, from - this.songStart);
      if (offset < this.song.duration) {
        src.start(origin + this.songStart + offset, offset);
        this.songSource = src;
      }
    }
  }

  stopSources() {
    if (this.bus) {
      const old = this.bus;
      old.gain.setTargetAtTime(0, this.ctx.currentTime, 0.015);
      setTimeout(() => old.disconnect(), 120);
    }
    try {
      this.songSource?.stop();
    } catch {
      /* already stopped */
    }
    this.songSource = null;
    this.bus = null;
  }

  pause() {
    this.stopSources();
    this.playing = false;
  }

  setMuted(m) {
    this.muted = m;
    if (this.bus) this.bus.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
  }

  now() {
    return this.ctx ? this.ctx.currentTime - this.origin : 0;
  }

  /** Render the full soundtrack offline (export). Returns an AudioBuffer. */
  async renderOffline(duration) {
    const sr = 48000;
    const ctx = new OfflineAudioContext(2, Math.ceil(duration * sr), sr);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 3;
    comp.connect(ctx.destination);
    this.schedule(ctx, comp, 0, 0);
    return ctx.startRendering();
  }
}

/** 16-bit PCM WAV encoder. */
export function encodeWav(buffer) {
  const ch = buffer.numberOfChannels;
  const len = buffer.length;
  const out = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const w = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  out.setUint32(4, 36 + len * ch * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, ch, true);
  out.setUint32(24, buffer.sampleRate, true);
  out.setUint32(28, buffer.sampleRate * ch * 2, true);
  out.setUint16(32, ch * 2, true);
  out.setUint16(34, 16, true);
  w(36, 'data');
  out.setUint32(40, len * ch * 2, true);
  const chans = [...Array(ch)].map((_, i) => buffer.getChannelData(i));
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      out.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return new Uint8Array(out.buffer);
}
