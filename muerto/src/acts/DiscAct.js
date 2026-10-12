import * as THREE from 'three';
import { Act } from './Act.js';
import { createDisc } from '../objects/disc.js';
import { drawDiscLabel } from '../textures/discLabel.js';
import { dustTexture } from '../textures/dust.js';
import { paintPortrait } from '../textures/portrait.js';
import { texture, tryImage } from '../textures/util.js';
import { ALBUM, ARTIST, LABEL } from '../data/album.js';

/** ACT I — the disc in the void, then a 2000s game loading screen. */
export class DiscAct extends Act {
  constructor(s) {
    super('disc', { start: s.disc, end: s.player });
    this.look = { mono: 0, keepRed: 0, paper: 0, bars: 0, tv: 1, white: 0, scan: 0, grain: 0.07, vignette: 0.6, contrast: 1, tint: [1, 1, 1] };
    this.bloomLook = { threshold: 0.9, radius: 0.5 };
    this.cam = { x: -0.16, y: 0.31, z: 0.5, tx: -0.18, ty: 0.28, tz: 0 };
    this.d = { rx: -0.1, ry: 0.22, x: 0, y: 0, z: 0, flip: 0 };
    this.light = { env: 0, spin: -1.2, key: 0 };
  }

  async build(film) {
    const portrait = (await tryImage('assets/portrait.jpg')) ?? (await tryImage('assets/portrait.png')) ?? paintPortrait();
    this.portrait = portrait;
    const label = texture(await drawDiscLabel(portrait), { aniso: 16 });

    const scene = this.scene;
    scene.environment = film.env;
    this.disc = createDisc({ labelTexture: label });
    scene.add(this.disc);

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 9),
      new THREE.MeshBasicMaterial({ map: dustTexture(), color: 0x9a9a9a }),
    );
    back.position.z = -5;
    scene.add(back);
    this.back = back;

    this.key = new THREE.SpotLight(0xfff1e0, 0, 20, 0.5, 0.6, 1.2);
    this.key.position.set(-3, 3, 4);
    scene.add(this.key, this.key.target);
    scene.add(new THREE.AmbientLight(0xffffff, 0.04));

    this.buildOverlay(film);
  }

  buildOverlay(film) {
    const L = this.createLayer(film, 'act-disc');
    L.innerHTML = `
      <p class="presents">${LABEL} presenta</p>
      <div class="loading">
        <div class="game-logo">
          <span class="game-logo__artist">${ARTIST}</span>
          <span class="game-logo__album" data-text="${ALBUM}">${ALBUM}</span>
        </div>
        <div class="loading__bar"><i></i></div>
      </div>`;
    this.el = {
      presents: L.querySelector('.presents'),
      loading: L.querySelector('.loading'),
      logo: L.querySelector('.game-logo'),
      bar: L.querySelector('.loading__bar i'),
    };
  }

  choreograph(tl, s, film) {
    const t0 = s.disc;
    const g = film.grade;
    const { cam, d, light, el } = this;
    tl.fromTo(g, { fade: 1, mono: 0, keepRed: 0, paper: 0, bars: 0, grain: 0.07, vignette: 0.6, tv: 1, white: 0, scan: 0, contrast: 1 }, { fade: 0, duration: 1.8, ease: 'power1.inOut' }, t0)
      .fromTo(film.bloom, { strength: 0, threshold: 0.9, radius: 0.5 }, { strength: 0.25, duration: 2 }, t0)
      .fromTo(light, { env: 0, spin: -1.4, key: 0 }, { env: 0.7, key: 9, duration: 3.2, ease: 'power2.inOut' }, t0 + 0.3)
      .to(light, { spin: 0.9, duration: 9, ease: 'sine.inOut' }, t0 + 0.3)
      // macro: from the red eyes, drifting across the painted sky and palms
      .fromTo(cam, { x: -0.16, y: 0.31, z: 0.5, tx: -0.18, ty: 0.28 }, { x: 0.32, y: 0.36, z: 0.62, tx: 0.36, ty: 0.3, duration: 3.6, ease: 'sine.inOut' }, t0)
      // pull back to the whole disc
      .to(cam, { x: 0.5, y: 0.35, z: 3.4, tx: 0, ty: 0, duration: 3.4, ease: 'power3.inOut' }, t0 + 3.8)
      .fromTo(d, { rx: -0.1, ry: 0.22 }, { rx: -0.32, ry: -0.35, duration: 3.6, ease: 'power2.inOut' }, t0 + 3.8)
      .to(light, { env: 1.1, key: 6, duration: 1.2 }, t0 + 7.2)
      // flip to the data side and back: the rainbow
      .to(d, { flip: Math.PI, duration: 1.5, ease: 'power3.inOut' }, t0 + 7.5)
      .to(d, { flip: Math.PI * 2, duration: 1.4, ease: 'power3.inOut' }, t0 + 9.1)
      // the loading screen
      .to(d, { x: 1.45, z: -0.6, rx: -0.15, ry: -0.5, duration: 2, ease: 'power3.inOut' }, t0 + 9.6)
      .to(cam, { x: 0.2, y: 0.1, z: 3.6, duration: 2.4, ease: 'power2.inOut' }, t0 + 9.6)
      .fromTo(el.presents, { autoAlpha: 0, letterSpacing: '0.6em' }, { autoAlpha: 1, letterSpacing: '0.9em', duration: 1.2 }, t0 + 1.2)
      .to(el.presents, { autoAlpha: 0, duration: 0.6 }, t0 + 3.6)
      .fromTo(el.loading, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, t0 + 10.1)
      .fromTo(el.logo, { y: 30, scale: 1.08 }, { y: 0, scale: 1, duration: 0.8, ease: 'back.out(2)' }, t0 + 10.1)
      .fromTo(el.bar, { scaleX: 0 }, { scaleX: 1, duration: 2, ease: 'steps(14)' }, t0 + 10.3)
      .to(g, { fade: 1, duration: 0.55, ease: 'power2.in' }, s.player - 0.6);
  }

  cues(s) {
    const t0 = s.disc;
    return [
      { t: t0, name: 'roomTone', args: [s.player - t0 + 0.5, { gain: 0.07 }] },
      { t: t0 + 0.15, name: 'thump', args: [{ freq: 45, gain: 0.5, decay: 0.6 }] },
      { t: t0 + 3.9, name: 'whoosh', args: [1.6, { gain: 0.08 }] },
      { t: t0 + 7.55, name: 'whoosh', args: [1.2, { gain: 0.16 }] },
      { t: t0 + 9.15, name: 'whoosh', args: [1.1, { gain: 0.14 }] },
      { t: t0 + 10.1, name: 'thump', args: [{ freq: 70, gain: 0.45, decay: 0.25 }] },
      { t: t0 + 12.3, name: 'click', args: [{ freq: 1600, gain: 0.3, decay: 0.08 }] },
    ];
  }

  update(t) {
    const { cam, d, light } = this;
    this.camera.position.set(cam.x, cam.y, cam.z);
    this.camera.lookAt(cam.tx, cam.ty, cam.tz);
    this.disc.position.set(d.x, d.y, d.z);
    this.disc.rotation.set(d.rx, d.ry + d.flip, (t - this.start) * 0.05);
    this.scene.environmentIntensity = light.env;
    this.scene.environmentRotation.set(0.2, light.spin, 0);
    this.key.intensity = light.key;
    this.key.target.position.set(d.x, d.y, d.z);
  }
}
