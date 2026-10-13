import * as THREE from 'three';
import gsap from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GradeShader, PaintShader, createGradeParams } from './post.js';
import { AudioEngine } from './audio.js';
import { buildStudioEnvironment } from './environment.js';
import { paintedCanvas } from '../textures/canvasTex.js';

/**
 * The film is a pure function of time. Everything visible is set by:
 *   1. one paused GSAP master timeline (tl.seek(t)), and
 *   2. each act's update(t) for procedural motion (walk cycles, spinning, HUD clock).
 * Playback reads t from the audio clock; export calls seek(t) frame by frame.
 */
export class Film {
  constructor({ canvas, overlay, exportMode = false, fps = 24 }) {
    this.canvas = canvas;
    this.overlay = overlay;
    this.exportMode = exportMode;
    this.fps = fps;
    this.grade = createGradeParams();
    this.bloom = { strength: 0, radius: 0.5, threshold: 0.9 };
    this.paint = { radius: 0, step: 1.25, amount: 1 }; // Kuwahara: 0 = off
    this.tl = gsap.timeline({ paused: true });
    this.audio = new AudioEngine();
    this.acts = [];
    this.time = 0;
    this.playing = false;
    this.listeners = new Set();
  }

  async init({ acts, schedule }) {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      preserveDrawingBuffer: this.exportMode,
      powerPreference: 'high-performance',
    });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setClearColor(0x000000, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = renderer;
    if (this.exportMode) window.__THREE = THREE;
    this.env = buildStudioEnvironment(renderer);

    const composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1920, 1080), 0, 0.5, 0.9);
    this.gradePass = new ShaderPass(GradeShader);
    const paper = new THREE.CanvasTexture(paintedCanvas());
    paper.minFilter = THREE.LinearFilter;
    this.gradePass.uniforms.tPaper.value = paper;
    composer.addPass(this.renderPass);
    composer.addPass(this.bloomPass);
    composer.addPass(new OutputPass());
    this.paintPass = new ShaderPass(PaintShader);
    composer.addPass(this.paintPass);
    composer.addPass(this.gradePass);
    this.composer = composer;

    const veil = (cls) => {
      const el = document.createElement('div');
      el.className = `veil ${cls}`;
      this.overlay.appendChild(el);
      return el;
    };
    this.veils = { overlay: this.overlay, white: veil('veil--white'), black: veil('veil--black') };
    this.schedule = schedule;
    this.duration = schedule.end;
    this.acts = acts;
    for (const act of acts) {
      const t0 = performance.now();
      await act.build(this);
      console.info(`[MUERTO] built ${act.name} in ${Math.round(performance.now() - t0)} ms`);
    }
    for (const act of acts) act.choreograph(this.tl, schedule, this);
    this.tl.set({}, {}, schedule.end);
    // Initialise every tween's start values in chronological order, so random seeks stay correct.
    this.tl.seek(schedule.end, true).seek(0, true);

    this.audio.setCues(
      acts.flatMap((a) => a.cues?.(schedule) ?? []),
      schedule.songStart,
    );
    for (const act of acts) await act.warmup?.(this);
  }

  actAt(t) {
    for (const act of this.acts) if (t >= act.start && t < act.end) return act;
    return this.acts[t < 0 ? 0 : this.acts.length - 1];
  }

  setSize(width, height, dpr = 1) {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(width, height);
    this.gradePass.uniforms.uRes.value = [width * dpr, height * dpr];
    this.paintPass.uniforms.uRes.value = [width * dpr, height * dpr];
    this.paintScale = (height * dpr) / 1080; // brush size follows the output resolution
    for (const act of this.acts) {
      act.camera.aspect = width / height;
      act.camera.updateProjectionMatrix();
    }
    this.overlay.style.setProperty('--u', `${width / 100}px`);
    this.render();
  }

  seek(t) {
    this.time = Math.max(0, Math.min(t, this.duration));
    this.tl.seek(this.time, true);
    const act = this.actAt(this.time);
    for (const a of this.acts) a.setActive?.(a === act);
    this.renderer.toneMappingExposure = 1;
    // each act restores its own static look, so jumping between acts never inherits a stale grade
    if (act.look) Object.assign(this.grade, act.look);
    if (act.bloomLook) Object.assign(this.bloom, act.bloomLook);
    this.paint.radius = 0;
    act.update(this.time, this);
    this.renderPass.scene = act.scene;
    this.renderPass.camera = act.camera;
    this.render();
    this.listeners.forEach((fn) => fn(this.time));
  }

  render() {
    const g = this.grade;
    const u = this.gradePass.uniforms;
    u.uFrame.value = Math.floor(this.time * this.fps);
    u.uMono.value = g.mono;
    u.uKeepRed.value = g.keepRed;
    u.uPaper.value = g.paper;
    u.uBars.value = g.bars;
    u.uTint.value = g.tint;
    u.uContrast.value = g.contrast;
    u.uGrain.value = g.grain;
    u.uVignette.value = g.vignette;
    u.uScan.value = g.scan;
    u.uTv.value = g.tv;
    u.uWhite.value = g.white;
    u.uFade.value = g.fade;
    this.bloomPass.strength = this.bloom.strength;
    this.bloomPass.radius = this.bloom.radius;
    this.bloomPass.threshold = this.bloom.threshold;
    this.bloomPass.enabled = this.bloom.strength > 0.001;
    const pu = this.paintPass.uniforms;
    pu.uRadius.value = this.paint.radius;
    pu.uStep.value = this.paint.step * (this.paintScale ?? 1);
    pu.uAmount.value = this.paint.amount;
    this.paintPass.enabled = this.paint.radius > 0.5;
    this.composer.render();
    // the DOM layers share the same fade, flash and cinema bars
    const v = this.veils;
    if (v) {
      v.black.style.opacity = g.fade;
      v.white.style.opacity = g.white;
      v.overlay.style.setProperty('--bars', g.bars);
      v.overlay.classList.toggle('is-crt-off', g.tv < 0.98);
    }
  }

  // ── playback ──
  async play() {
    if (this.time >= this.duration - 0.05) this.time = 0;
    await this.audio.play(this.time);
    this.playing = true;
    this.emitState();
    const loop = () => {
      if (!this.playing) return;
      const t = this.audio.now();
      if (t >= this.duration) {
        this.seek(this.duration);
        this.pause();
        return;
      }
      this.seek(t);
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.audio.pause();
    this.emitState();
  }

  async jump(t) {
    const wasPlaying = this.playing;
    if (wasPlaying) this.pause();
    this.seek(t);
    if (wasPlaying) await this.play();
  }

  onTime(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emitState() {
    this.overlay.dispatchEvent(new CustomEvent('filmstate', { detail: { playing: this.playing } }));
  }
}
