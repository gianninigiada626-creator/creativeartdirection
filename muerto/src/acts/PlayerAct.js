import * as THREE from 'three';
import { Act } from './Act.js';
import { DECK, createPlayer } from '../objects/player.js';
import { createDisc } from '../objects/disc.js';
import { ALBUM, ARTIST, TRACKS } from '../data/album.js';

const pad = (n) => String(Math.max(0, Math.floor(n))).padStart(2, '0');

/** ACT II — the disc goes into an old CD deck: tray, spin-up, laser seek, the display counts in the song. */
export class PlayerAct extends Act {
  constructor(s) {
    super('player', { start: s.player, end: s.game });
    this.look = { sat: 1, split: 0, scratch: 0, mono: 0, keepRed: 0, paper: 0, bars: 0, tv: 1, scan: 0, grain: 0.06, vignette: 0.55, contrast: 1.05, tint: [1, 1, 1] };
    this.s = s;
    this.cam = { x: 6.5, y: 4.8, z: 10.5, tx: -0.4, ty: 0.9, tz: 2.2 };
    this.m = { tray: 0, discY: 6, discTilt: 0.5, discSpin: 0, openBtn: 0, playBtn: 0 };
  }

  async build(film) {
    const scene = this.scene;
    scene.environment = film.env;
    scene.environmentIntensity = 0.35;
    scene.fog = new THREE.Fog(0x050403, 14, 30);

    const p = await createPlayer();
    this.p = p;
    scene.add(p.group);

    // the same disc, reusing the label printed in Act I
    const discAct = film.acts.find((a) => a.name === 'disc');
    this.disc = createDisc({ labelTexture: discAct.disc.children[0].material.map });
    this.disc.traverse((o) => (o.castShadow = true));
    scene.add(this.disc);

    const table = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 30),
      new THREE.MeshStandardMaterial({ map: p.woodTexture, roughness: 0.55, metalness: 0 }),
    );
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.1;
    table.receiveShadow = true;
    scene.add(table);

    const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), new THREE.MeshStandardMaterial({ color: 0x17120e, roughness: 1 }));
    wall.position.set(0, 8, -8);
    scene.add(wall);

    // a warm desk lamp from the upper left, a cold rim from behind
    const key = new THREE.SpotLight(0xffd9a8, 140, 40, 0.55, 0.7, 1.4);
    key.position.set(-7, 9, 6);
    key.target.position.set(-0.5, 0.5, 1.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    const rim = new THREE.DirectionalLight(0x9fb4ff, 1.1);
    rim.position.set(6, 5, -8);
    scene.add(key, key.target, rim, new THREE.AmbientLight(0xffe2c0, 0.08));
  }

  choreograph(tl, s, film) {
    const t0 = s.player;
    const g = film.grade;
    const b = film.bloom;
    const { cam, m } = this;
    const T = s.songStart;
    tl.fromTo(g, { fade: 1, mono: 0, keepRed: 0, paper: 0, bars: 0, grain: 0.06, vignette: 0.55, white: 0, tv: 1, scan: 0, contrast: 1.05 }, { fade: 0, duration: 1, ease: 'power1.out' }, t0)
      .fromTo(b, { strength: 0.45, threshold: 0.82, radius: 0.5 }, { strength: 0.6, threshold: 0.82, radius: 0.5, duration: 1 }, t0)
      .fromTo(cam, { x: 6.5, y: 4.8, z: 10.5, tx: -0.4, ty: 0.9, tz: 2.2 }, { x: 4.6, y: 3.9, z: 9, duration: 2.6, ease: 'sine.inOut' }, t0)
      // OPEN/CLOSE
      .fromTo(m, { openBtn: 0 }, { openBtn: 1, duration: 0.08, yoyo: true, repeat: 1 }, t0 + 1.2)
      .fromTo(m, { tray: 0 }, { tray: 1, duration: 1.0, ease: 'power1.inOut' }, t0 + 1.35)
      // the disc is lowered in by an unseen hand
      .to(cam, { x: 2.2, y: 4.6, z: 8.2, tx: DECK.TRAY_X, ty: 1, tz: 3.4, duration: 2.6, ease: 'power2.inOut' }, t0 + 2.4)
      .fromTo(m, { discY: 6, discTilt: 0.55 }, { discY: DECK.TRAY_Y + 0.03, discTilt: 0, duration: 1.6, ease: 'power2.out' }, t0 + 2.5)
      .fromTo(m, { openBtn: 0 }, { openBtn: 1, duration: 0.08, yoyo: true, repeat: 1, immediateRender: false }, t0 + 4.45)
      .to(m, { tray: 0, duration: 1.0, ease: 'power1.inOut' }, t0 + 4.6)
      // reading: slide along the panel to the display
      .to(cam, { x: 3.4, y: 2.1, z: 6.4, tx: 1.2, ty: 1.0, tz: 2.5, duration: 4.5, ease: 'power2.inOut' }, t0 + 5.6)
      .fromTo(m, { discSpin: 0 }, { discSpin: 1, duration: 2.4, ease: 'power2.in' }, t0 + 6.0)
      .to(cam, { x: DECK.DISPLAY.x + 0.25, y: 1.25, z: 4.2, tx: DECK.DISPLAY.x, ty: DECK.DISPLAY.y, tz: DECK.FRONT, duration: 4, ease: 'power2.inOut' }, t0 + 10.2)
      // the song starts: push into the phosphor
      .to(cam, { x: DECK.DISPLAY.x + 0.2, y: DECK.DISPLAY.y + 0.02, z: DECK.FRONT + 0.32, tx: DECK.DISPLAY.x + 0.2, ty: DECK.DISPLAY.y, duration: s.game - T - 0.2, ease: 'power3.in' }, T)
      .to(b, { strength: 2.6, threshold: 0.2, radius: 0.9, duration: s.game - T, ease: 'power2.in' }, T)
      .to(g, { white: 1, duration: 0.5, ease: 'power2.in' }, s.game - 0.5);
  }

  cues(s) {
    const t0 = s.player;
    return [
      { t: t0, name: 'roomTone', args: [s.game - t0, { gain: 0.05 }] },
      { t: t0 + 1.2, name: 'button' },
      { t: t0 + 1.35, name: 'trayMotor', args: [1.0] },
      { t: t0 + 4.1, name: 'discDrop' },
      { t: t0 + 4.45, name: 'button' },
      { t: t0 + 4.6, name: 'trayMotor', args: [1.0] },
      { t: t0 + 6.0, name: 'spinUp', args: [2.4] },
      { t: t0 + 6.6, name: 'laserSeek', args: [s.songStart - t0 - 7.2] },
      { t: s.songStart - 0.4, name: 'click', args: [{ freq: 2200, gain: 0.25, decay: 0.03 }] },
    ];
  }

  displayAt(t) {
    const s = this.s;
    const l = t - this.start;
    const blink = Math.floor(t * 2.5) % 2 === 0;
    if (l < 1.2) return { main: blink ? ' NO DISC' : '', indicators: {} };
    if (l < 2.4) return { main: '  OPEN', indicators: {} };
    if (l < 4.6) return { main: blink ? '  OPEN' : '', indicators: {} };
    if (l < 5.6) return { main: ' CLOSE', indicators: {} };
    if (t < s.songStart - 4.2) return { main: blink ? 'READING' : 'READING.', indicators: { CD: true } };
    if (t < s.songStart - 1.6) {
      // scroll the title across the grid
      const text = `      ${ARTIST} - ${ALBUM}      `;
      const k = Math.floor((t - (s.songStart - 4.2)) * 7) % (text.length - 10);
      return { main: text.slice(k, k + 11), indicators: { CD: true } };
    }
    if (t < s.songStart) return { main: `${pad(TRACKS.length)} TRK 47:21`, indicators: { CD: true, TRACK: true } };
    const e = t - s.songStart;
    return { main: `01   ${pad(e / 60)}:${pad(e % 60)}`, indicators: { CD: true, TRACK: true, MIN: true, SEC: true, 'PLAY ▶': true } };
  }

  update(t) {
    const { cam, m, p } = this;
    this.camera.position.set(cam.x, cam.y, cam.z);
    this.camera.lookAt(cam.tx, cam.ty, cam.tz);

    p.tray.position.z = DECK.FRONT + m.tray * DECK.TRAY_TRAVEL;
    p.buttons.open.position.z = DECK.FRONT + 0.04 - m.openBtn * 0.035;

    // the disc sits on the tray platter once it lands; before that it hangs above it
    const platterZ = p.tray.position.z - 1.3;
    const landed = m.discY <= DECK.TRAY_Y + 0.031;
    this.disc.position.set(DECK.TRAY_X, m.discY, landed ? platterZ : DECK.FRONT + DECK.TRAY_TRAVEL - 1.3);
    // spin: integrate an eased speed so the label accelerates believably
    const spinStart = this.start + 6.0;
    const sp = t > spinStart ? Math.min(1, (t - spinStart) / 2.4) : 0;
    const angle = t > spinStart ? (t - spinStart) * sp * 34 : 0;
    this.disc.rotation.set(-Math.PI / 2 + m.discTilt, 0, angle);
    this.disc.visible = !(landed && m.tray < 0.02 && t > spinStart);

    p.display.draw(this.displayAt(t));
  }
}
