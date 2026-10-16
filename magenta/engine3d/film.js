// The shots of MAGENTA in motion. Each builder returns { scene, camera, far, update(k, t), screens, figure }:
// update is called with k = 0..1 across the shot and t in seconds. Shot numbers are the découpage's (REGIA.md).
import { THREE, boxMesh, plane, clay, nextId, D, cam, grey, canvasTex, beam, shaft, clamp01, ease, mixAims, ARMS, emissive, hold, shadowed, sky } from './kit.js';
import { pianoPietralata, facing, elio, adaOld, sea, room, bed, nightstand, armchair, daylight, stanza, visita, laboratorio, proiezione, alba } from './scenes.js';

const set = (o, a) => {
  o.aimNow = { ...o.baseAims, ...a };
  o.aimAll(o.aimNow);
};
/** 0 → 1 → 0 between a and b, eased at both ends. */
const bell = (t, a, b) => Math.sin(Math.PI * clamp01((t - a) / (b - a))) ** 2;
const ramp = (t, a, b) => ease(clamp01((t - a) / (b - a)));
const lerp = (a, b, u) => a + (b - a) * u;
const lerp3 = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);

// ── PANE DURO, sc. 41, ripr. 3: the take itself, ninety-six frames ──────────────────────────────────
// frame 0–12 the slate in front of the lens, in a hand white with chalk; 30 the boy's shadow comes into the
// bottom of the picture; 71 the girl turns, not to the lens but just beside it, to him; then the gesture.
export const TAKE = 4;
const CAM62 = [0.15, 1.3, 0.6];
const NINO = [-0.75, 0, 0.75];
const ADA62 = [1.0, 0, -3.1];

function slate() {
  // a clapperboard, chalk on black: PANE DURO, the scene, the take; the striped sticks on a hinge
  const t = canvasTex(512, 400, (c, w, h) => {
    c.fillStyle = '#1b1c1e';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(235,232,222,0.85)';
    c.lineWidth = 4;
    c.strokeRect(14, 14, w - 28, h - 28);
    c.beginPath();
    c.moveTo(14, 150); c.lineTo(w - 14, 150);
    c.moveTo(14, 290); c.lineTo(w - 14, 290);
    c.moveTo(w / 2, 150); c.lineTo(w / 2, 290);
    c.stroke();
    c.fillStyle = 'rgba(238,235,226,0.92)';
    c.font = 'bold 74px "Comic Sans MS", "Chalkboard", cursive';
    c.textAlign = 'center';
    c.fillText('PANE DURO', w / 2, 112);
    c.font = '30px sans-serif';
    c.fillText('SCENA', w / 4, 186);
    c.fillText('RIPRESA', (3 * w) / 4, 186);
    c.font = 'bold 84px "Comic Sans MS", "Chalkboard", cursive';
    c.fillText('41', w / 4, 270);
    c.fillText('3', (3 * w) / 4, 270);
    c.font = '34px "Comic Sans MS", cursive';
    c.fillText('PIETRALATA  ·  12 - 3 - 62', w / 2, 352);
  });
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.25, 0.012), [clay('#1b1c1e'), clay('#1b1c1e'), clay('#1b1c1e'), clay('#1b1c1e'), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }), clay('#1b1c1e')]);
  g.add(board);
  const stripes = canvasTex(256, 32, (c, w, h) => {
    for (let i = 0; i < 9; i++) {
      c.fillStyle = i % 2 ? '#f0ece4' : '#18181a';
      c.beginPath();
      c.moveTo(i * 32 - 16, h); c.lineTo(i * 32 + 16, 0); c.lineTo(i * 32 + 48, 0); c.lineTo(i * 32 + 16, h);
      c.fill();
    }
  });
  const stickMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.8 });
  const fixed = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.014), stickMat);
  fixed.position.set(0, 0.145, 0);
  g.add(fixed);
  const hinge = new THREE.Group();
  hinge.position.set(-0.16, 0.168, 0);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.014), stickMat);
  arm.position.set(0.16, 0.02, 0);
  hinge.add(arm);
  g.add(hinge);
  // the hand that holds it, from the left: a young hand white with chalk dust, a rolled-up sleeve
  const chalk = clay('#e9e5dc');
  const hand = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.085, 0.026), chalk);
  hand.add(palm);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0082, 0.045, 4, 8), chalk);
    f.rotation.z = Math.PI / 2;
    f.position.set(0.058, 0.03 - i * 0.019, 0.011);
    hand.add(f);
  }
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.045, 4, 8), chalk);
  thumb.rotation.z = 0.6;
  thumb.position.set(0.035, 0.06, 0.012);
  hand.add(thumb);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.6, 14), clay('#9a9488'));
  sleeve.rotation.z = Math.PI / 2 - 0.25;
  sleeve.position.set(-0.33, -0.07, -0.02);
  hand.add(sleeve);
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.08, 12), chalk);
  wrist.rotation.z = Math.PI / 2 - 0.25;
  wrist.position.set(-0.06, -0.012, 0);
  hand.add(wrist);
  hand.position.set(-0.19, -0.02, 0.01);
  g.add(hand);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  g.userData.id = nextId();
  g.userData.hinge = hinge;
  return g;
}

/** The take, from the camera of 1962. opts.cu: the girl enlarged, as on the restorer's monitor (the same lens position, a long focal). */
async function presa(opts = {}) {
  const s = new THREE.Scene();
  const { ada, banner: bn } = await pianoPietralata(s, { camPos: CAM62, sun: [-10, 17, 70], sunI: 3.2, hemiI: 0.7 });
  // the boy: off the picture, beside the camera; only his shadow on the mud will come in
  const nino = await grey('teen', 'stand', { pos: [-2.6, 0, 0.75], rotY: facing([-2.6, 0, 0.75], ADA62), seed: 41, wear: { top: '#d6d0c2', bottom: '#4a4a4c', skin: '#e6e2d8', hair: '#2a1d16' } });
  s.add(nino);
  const sl = slate();
  s.add(sl);
  const toCrowd = facing(ADA62, [-9, 0, ADA62[2] - 1.5]);
  const toNino = facing(ADA62, NINO);
  const REST = { Spine: [0.1, 1, 0], Head: [0.08, 1, 0.08], RightArm: [-0.12, -1, 0.02], RightForeArm: [-0.04, -1, 0.12], RightHand: [0, -1, 0.1] };
  const EAR = { ...REST, RightArm: [-0.6, 0.08, 0.22], RightForeArm: [0.5, 1, -0.4], RightHand: [0.25, 0.85, -0.6], Head: [-0.12, 1, 0.08] };
  const update = (k, t) => {
    const f = (t % TAKE) * 24;
    // the slate: held, the sticks clap at 6, it leaves to the left by 12
    sl.visible = f < 13;
    const out = ramp(f, 7, 12.5);
    sl.position.set(lerp(0.14, -1.1, out) + 0.004 * Math.sin(f * 1.7), lerp(1.16, 0.95, out), -0.75);
    sl.rotation.set(0, 0.05, lerp(0.03, 0.3, out));
    sl.userData.hinge.rotation.z = lerp(0.42, 0, ramp(f, 4.5, 6.2));
    // the boy walks back to his place beside the camera: his shadow enters at 30
    const w = ramp(f, 22, 36);
    nino.position.set(lerp(-2.6, NINO[0], w), 0, NINO[2]);
    // the procession goes by: only its standard is seen
    bn.position.set(lerp(-0.4, -3.6, t / TAKE), 0, -9.4);
    bn.rotation.z = 0.04 * Math.sin(t * 2.3);
    // the girl watches it, then at 71 turns to the boy; at 78 two fingers take her hair behind her ear
    const turn = ramp(f, 71, 80);
    ada.rotation.y = D(lerp(toCrowd, toNino, turn));
    set(ada, mixAims(REST, EAR, bell(f, 79, 95)));
  };
  update(0, opts.t ?? 3.6);
  const camera = opts.cu ? cam(7.5, CAM62, [ADA62[0] + 0.02, 1.47, ADA62[2]]) : cam(32, CAM62, [0.15, 0.75, -10]);
  return { scene: s, camera, far: 400, update };
}
// ── small things ──────────────────────────────────────────────────────────────────────────────────
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
/** A quad that only says where something will be laid in after painting (a frame of the film). */
function slot(w, h, pos, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#2a1a22' }));
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.userData.id = nextId();
  return m;
}
/** A white cotton glove, a hand alone: palm, four fingers, a thumb, a cuff. Palm down, fingers toward +x. */
function glove() {
  const g = new THREE.Group();
  const w = clay('#f1efe8');
  g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.024, 0.08), w), {}));
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.05, 4, 8), w);
    f.rotation.z = Math.PI / 2;
    f.position.set(0.07, 0, -0.03 + i * 0.02);
    g.add(f);
  }
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.04, 4, 8), w);
  th.rotation.set(Math.PI / 2, 0, 0.7);
  th.position.set(0.03, 0, 0.055);
  g.add(th);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.25, 14), clay('#2e3238'));
  cuff.rotation.z = Math.PI / 2;
  cuff.position.set(-0.16, 0.005, 0);
  g.add(cuff);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  g.userData.id = nextId();
  return g;
}
/** A film reel, its spokes visible so we see it turn. Its axis is x. */
function reel(r = 0.17) {
  const t = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#5a5e62';
    c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#16161a';
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(w / 2, h / 2);
      c.arc(w / 2, h / 2, w * 0.42, (i * 2 * Math.PI) / 3 + 0.3, (i * 2 * Math.PI) / 3 + 1.4);
      c.fill();
    }
    c.fillStyle = '#2a2224';
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#8a8e92';
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.06, 0, Math.PI * 2); c.fill();
  });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.02, 40), [clay('#4a4e52'), new THREE.MeshStandardMaterial({ map: t }), new THREE.MeshStandardMaterial({ map: t })]);
  m.rotation.z = Math.PI / 2;
  const g = new THREE.Group();
  g.add(m);
  g.userData.id = nextId();
  return g;
}
/** The projector of the last scenes: a body, the lens, two reels on their arms. Lens toward -z. */
function projector() {
  const g = new THREE.Group();
  g.add(boxMesh(0.24, 0.22, 0.38, '#2a2a2e', [0, 0, 0]));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.12, 20), clay('#141416'));
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0.11, -0.25);
  g.add(lens);
  g.add(beam([0, 0.22, 0.08], [0, 0.42, 0.18], 0.025, '#2a2a2e'));
  g.add(beam([0, 0.22, -0.08], [0, 0.42, -0.18], 0.025, '#2a2a2e'));
  const a = reel(0.16), b = reel(0.16);
  a.position.set(0, 0.44, 0.2);
  b.position.set(0, 0.44, -0.2);
  g.add(a, b);
  g.userData.id = nextId();
  g.userData.reels = [a, b];
  return g;
}
/** Dust in a beam: specks that drift, bright where the light is. */
function dust(from, to, r1, n = 160, seed = 5) {
  const R = rng(seed);
  const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to);
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: '#fffaf0' });
  const specks = [];
  for (let i = 0; i < n; i++) {
    const u = 0.08 + R() * 0.8;
    const c = A.clone().lerp(B, u);
    const rr = r1 * u * Math.sqrt(R());
    const a = R() * Math.PI * 2;
    const base = c.add(new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, 0));
    const m = new THREE.Mesh(new THREE.SphereGeometry((0.0025 + R() * 0.0035) * (n > 200 ? 1.8 : 1), 6, 4), mat);
    m.position.copy(base);
    m.userData.id = nextId();
    g.add(m);
    specks.push({ m, base, ph: R() * 6.28, sp: 0.2 + R() * 0.5 });
  }
  g.tick = (t) => {
    for (const p of specks) p.m.position.set(p.base.x + 0.03 * Math.sin(t * p.sp + p.ph), p.base.y + 0.02 * Math.sin(t * p.sp * 1.3 + p.ph * 2) - 0.004 * t, p.base.z);
  };
  return g;
}
function boneAt(o, name) {
  o.updateMatrixWorld(true);
  return o.bones[name].getWorldPosition(new THREE.Vector3());
}
/** A camera on someone's face: `dist` in front of it (along where the body faces), `side` to their left. */
function faceOn(o, dist, fov, { dy = 0, side = 0, aimDy = 0, bone = 'Head', up = 0.07 } = {}) {
  const h = boneAt(o, bone);
  h.y += up;
  const yaw = o.rotation.y;
  const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const l = new THREE.Vector3(f.z, 0, -f.x);
  const p = h.clone().addScaledVector(f, dist).addScaledVector(l, side);
  p.y += dy;
  return cam(fov, p.toArray(), [h.x, h.y + aimDy, h.z]);
}
/** Seated, hands in the lap (both arms), so a gesture can come out of the pose and go back to it. */
const LAP = { LeftArm: [0.15, -1, 0.35], LeftForeArm: [-0.1, -0.15, 1], RightArm: [-0.15, -1, 0.35], RightForeArm: [0.1, -0.15, 1] };
/** Two fingers take the hair behind the ear (the right hand). */
const EAR_SIT = { RightArm: [-0.5, -0.2, 0.6], RightForeArm: [0.6, 0.8, -0.4], RightHand: [0.3, 0.5, -0.8], Head: [-0.12, 1, 0.12] };

/** The care home room, built for a shot: Ada's chair, the bed, the nightstand; who is where. */
async function casa({ night = false, rain = false, chair = [1.1, -3.55, -35], ada = { pose: 'sitChair', pos: [1.08, 0.1, -3.62], rot: -35 }, el = null, bedAt = [-1.62, -2.55, 0], blanket, stand = [-1.75, -4.15] } = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(night ? '#06080c' : '#c8d0d0');
  const rm = await room(s, { night, rain });
  if (chair) s.add(armchair(...chair));
  if (bedAt) s.add(bed(...bedAt, blanket));
  if (stand) s.add(nightstand(...stand));
  if (!night) s.add(emissive(0.55, 0.34, 0.05, [2.17, 2.05, -1.2], 0.7, '#9fb4c8'));
  const a = ada ? await adaOld(ada.pose, { pos: ada.pos, rotY: ada.rot, expr: ada.expr ?? 'neutral', aim: ada.aim }) : null;
  if (a) s.add(a);
  const e = el ? await elio(el.pose, { pos: el.pos, rotY: el.rot, expr: el.expr ?? 'neutral', aim: el.aim, wear: el.wear }) : null;
  if (e) s.add(e);
  if (!night) daylight(s, { rain });
  return { s, ada: a, el: e, rm };
}

// ── PROLOGO ───────────────────────────────────────────────────────────────────────────────────────
/** 01 · the beam in the dark, full of dust; the reels turn. */
async function s01() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#000000');
  const pr = projector();
  pr.position.set(0, 1.0, 0);
  s.add(pr);
  const lens = [0, 1.11, -0.31];
  const to = [-0.4, 1.55, -7];
  s.add(shaft(lens, to, 0.02, 1.1, '#fffaf0', 0.42));
  s.add(shaft(lens, to, 0.01, 0.45, '#ffffff', 0.22));
  s.add(dust(lens, to, 1.0, 260));
  s.add(emissive(0.07, 0.07, 0.01, [0, 1.11, -0.315], 3.5, '#ffffff'));
  const lamp = new THREE.PointLight('#fff2d8', 1.2, 2.5, 1.5);
  lamp.position.set(0.3, 1.1, 0.1);
  s.add(lamp);
  s.add(new THREE.HemisphereLight('#2a2a2a', '#000', 0.25));
  const update = (k, t) => pr.userData.reels.forEach((r, i) => (r.rotation.x = -t * (i ? 2.6 : 1.9)));
  return { scene: s, camera: cam(34, [2.2, 1.3, -1.6], [0.05, 1.3, -2.45]), far: 30, update };
}

// ── I · LE BOBINE ─────────────────────────────────────────────────────────────────────────────────
function cansTex(seed, label = null) {
  const t = canvasTex(1024, 128, (c, w, h) => {
    const R = rng(seed);
    c.fillStyle = '#20242a';
    c.fillRect(0, 0, w, h);
    for (let x = 6; x < w - 60; x += 64 + R() * 6) {
      const rust = R() < 0.25;
      c.fillStyle = rust ? '#6a4a34' : ['#7a8088', '#666c74', '#8a8e94'][Math.floor(R() * 3)];
      c.beginPath(); c.arc(x + 30, h * 0.55, 29, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 3;
      c.beginPath(); c.arc(x + 30, h * 0.55, 22, 0, Math.PI * 2); c.stroke();
      c.fillStyle = 'rgba(235,228,205,0.85)';
      c.fillRect(x + 14, h * 0.55 - 6, 32, 12);
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
/** The archive's cold store: two runs of steel shelving down a long corridor, cans seen end on. */
function archivio(s, len = 46) {
  s.background = new THREE.Color('#05070c');
  s.fog = new THREE.Fog('#05070c', 8, 42);
  s.add(plane(4, len + 10, '#3a3e44', [0, 0, -len / 2]));
  s.add(plane(4, len + 10, '#202428', [0, 3.2, -len / 2], Math.PI / 2));
  for (const side of [-1, 1]) {
    for (let l = 0; l < 6; l++) {
      const tex = cansTex(7 + l * 3 + (side > 0 ? 50 : 0));
      tex.repeat.set(len / 3.6, 1);
      const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.3 });
      const steel = clay('#2a2e34');
      const mats = side < 0 ? [front, steel, steel, steel, steel, steel] : [steel, front, steel, steel, steel, steel];
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, len), mats);
      m.position.set(side * 1.3, 0.3 + l * 0.48, -len / 2);
      m.receiveShadow = true;
      m.userData.id = nextId();
      s.add(m);
    }
    for (let z = 0; z > -len; z -= 1.8) s.add(beam([side * 1.06, 0, z], [side * 1.06, 3.0, z], 0.04, '#3a4048'));
  }
  // the tubes: cold light every few metres
  for (let z = -1; z > -len; z -= 4) {
    s.add(emissive(0.06, 0.04, 1.4, [0, 3.12, z], 1.6, '#c8dcff'));
    if (z > -26) {
      const l = new THREE.PointLight('#a8c4ff', 3.2, 9, 1.6);
      l.position.set(0, 2.9, z);
      s.add(l);
    }
  }
  s.add(new THREE.HemisphereLight('#6a84b0', '#0a0c10', 0.5));
}
function trolley(cans = 12) {
  const g = new THREE.Group();
  g.add(boxMesh(0.55, 0.03, 0.8, '#5a5e64', [0, 0.32, 0]));
  g.add(boxMesh(0.55, 0.03, 0.8, '#5a5e64', [0, 0.72, 0]));
  for (const [x, z] of [[-0.25, -0.38], [0.25, -0.38], [-0.25, 0.38], [0.25, 0.38]]) {
    g.add(beam([x, 0.1, z], [x, 0.75, z], 0.025, '#4a4e54'));
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 14), clay('#1a1a1a'));
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.05, z);
    g.add(w);
  }
  g.add(beam([-0.27, 0.95, 0.42], [0.27, 0.95, 0.42], 0.03, '#4a4e54'));
  for (const x of [-0.27, 0.27]) g.add(beam([x, 0.72, 0.4], [x, 0.95, 0.42], 0.025, '#4a4e54'));
  for (let i = 0; i < cans; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.055, 22), clay(['#7a5a3e', '#6a4a30', '#8a6a48'][i % 3]));
    c.position.set(i % 2 ? 0.1 : -0.1, 0.76 + Math.floor(i / 2) * 0.058, (i % 4 < 2 ? -0.18 : 0.16));
    g.add(c);
  }
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  g.userData.id = nextId();
  return g;
}
/** 05 · the cold store, a slow dolly in; far down the corridor Elio pushes the trolley of rusty cans. */
async function s05() {
  const s = new THREE.Scene();
  archivio(s);
  const PUSH = { LeftArm: [0.2, -0.55, 0.8], LeftForeArm: [0.05, -0.1, 1], RightArm: [-0.2, -0.55, 0.8], RightForeArm: [-0.05, -0.1, 1] };
  const el = await elio('walk', { pos: [0.1, 0, -8], rotY: 180, rate: 0.55, aim: PUSH, gloves: true });
  s.add(el);
  const tr = trolley();
  tr.rotation.y = Math.PI;
  s.add(tr);
  const camera = cam(40, [0, 1.6, 3], [0, 1.45, -40]);
  const update = (k, t) => {
    const z = -8 - 0.45 * t;
    el.position.z = z;
    tr.position.set(0.1, 0, z - 0.75);
    camera.position.z = 3 - 4.5 * ease(k);
    camera.lookAt(0, 1.45, -40);
  };
  return { scene: s, camera, far: 60, update };
}
/** 06 · straight down on the light table: the pink film, a gloved hand with the loupe; it scrolls, stops, goes back three frames. */
async function s06() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#f6f2ec');
  s.add(emissive(1.2, 0.01, 0.8, [0, -0.006, 0], 1.25, '#fff8f0'));
  const strip = new THREE.Group();
  const base = canvasTex(1024, 64, (c, w, h) => {
    c.fillStyle = '#9a3a68';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#f8eef2';
    for (let x = 4; x < w; x += 16) {
      c.fillRect(x, 3, 8, 7);
      c.fillRect(x, h - 10, 8, 7);
    }
  });
  base.wrapS = THREE.RepeatWrapping;
  base.repeat.set(4, 1);
  const film = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.035), new THREE.MeshBasicMaterial({ map: base }));
  film.rotation.x = -Math.PI / 2;
  film.userData.id = nextId();
  strip.add(film);
  const screens = [];
  for (let i = 0; i < 40; i++) {
    const q = slot(0.0249, 0.0182, [-0.5 + i * 0.0266, 0.0005, 0], [-Math.PI / 2, 0, 0]);
    strip.add(q);
    screens.push({ name: `striscia${i}`, mode: 'monitor', mesh: q });
  }
  s.add(strip);
  const loupe = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.03, 32, 1, true), clay('#18181a'));
  ring.material.side = THREE.DoubleSide;
  ring.position.y = 0.015;
  loupe.add(ring);
  const gl = glove();
  gl.rotation.set(0, Math.PI / 2 + 0.25, 0);
  gl.position.set(0.016, 0.03, 0.128);
  loupe.add(gl);
  loupe.userData.id = nextId();
  s.add(loupe);
  s.add(new THREE.HemisphereLight('#ffffff', '#e8e0e4', 1.3));
  const key = shadowed(new THREE.DirectionalLight('#ffffff', 0.8), 1024, 0.4);
  key.position.set(0.2, 1, 0.3);
  s.add(key, key.target);
  const update = (k, t) => {
    // scroll right to left, stop, then three frames back
    const x = -0.3 * ramp(t, 0, 6.5) + 3 * 0.0266 * ramp(t, 8, 9.2);
    strip.position.x = 0.35 + x;
    loupe.position.set(0.004 * Math.sin(t * 0.7), 0, 0.002);
  };
  update(0, 0);
  return { scene: s, camera: cam(13, [0, 0.42, 0.012], [0, 0, 0]), far: 5, update, screens };
}

// ── II · ADA ──────────────────────────────────────────────────────────────────────────────────────
/** 08 · the match cut: her two old fingers, the same gesture; her profile against the winter sea. */
async function s08() {
  const { s, ada } = await casa({ chair: [0.95, -3.95, 90], ada: { pose: 'sitChair', pos: [0.92, 0.1, -3.98], rot: 90, aim: LAP } });
  const update = (k, t) => set(ada, mixAims({ ...ada.baseAims, ...LAP }, EAR_SIT, bell(t + 1.1, 0, 3.6)));
  update(0, 0);
  const h = boneAt(ada, 'Head');
  return { scene: s, camera: cam(20, [h.x + 0.3, h.y + 0.08, h.z + 1.3], [h.x + 0.12, h.y + 0.02, h.z]), far: 3000, update, figure: { obj: ada, fade: 0 } };
}
/** 09 · the room from the door, at the height of someone sitting. */
async function s09() {
  const sc = await stanza({ fade: 0 });
  const { ada, el } = sc.cast;
  const update = (k, t) => {
    // he turns his hands over; she looks at him, then at the sea
    set(el, mixAims(el.baseAims, { RightForeArm: [0.25, 0.1, 1], Head: [0, 1, 0.15] }, bell(t, 2, 9)));
    ada.rotation.y = D(-35 - 55 * bell(t, 18, 32));
  };
  return { ...sc, update };
}
/** 10 · Ada's profile, looking at the sea. */
async function s10() {
  const { s, ada } = await casa({ chair: [0.95, -3.95, -90], ada: { pose: 'sitChair', pos: [0.92, 0.1, -3.98], rot: -90 } });
  const update = (k, t) => set(ada, mixAims(ada.baseAims, { Head: [0.0, 1, 0.22] }, bell(t, 6, 14)));
  update(0, 0);
  const h = boneAt(ada, 'Head');
  return { scene: s, camera: cam(22, [h.x - 0.1, h.y + 0.02, -2.35], [h.x - 0.1, h.y + 0.02, -4.6]), far: 3000, update, figure: { obj: ada, fade: 0 } };
}
function spoon() {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.027, 14, 10), clay('#d8d8d4'));
  bowl.scale.set(1, 0.35, 1.4);
  bowl.position.set(0, 0, 0.07);
  g.add(bowl);
  g.add(beam([0, 0, -0.08], [0, 0, 0.05], 0.008, '#c8c8c4'));
  g.userData.id = nextId();
  return g;
}
/** 11 · the spoon in her hand, looked at like a new word. */
async function s11() {
  const { s, ada } = await casa({ ada: { pose: 'sitChair', pos: [1.08, 0.1, -3.62], rot: -35, aim: LAP } });
  const sp = spoon();
  s.add(sp);
  const LOOK = { RightArm: [-0.1, -0.8, 0.6], RightForeArm: [0.35, 0.55, 1], RightHand: [0.2, 0.4, 1], Head: [0, 0.85, 0.5] };
  const update = (k, t) => {
    set(ada, mixAims({ ...ada.baseAims, ...LAP }, LOOK, ramp(t, 0.5, 2.5)));
    hold(ada, sp, 'Right', [0, 0.06, 0.02]);
    sp.rotation.set(-1.15, 0.35, 0);
  };
  update(0, 3);
  const hp = boneAt(ada, 'RightHand');
  return { scene: s, camera: cam(18, [hp.x - 0.5, hp.y + 0.12, hp.z + 0.62], [hp.x, hp.y + 0.03, hp.z]), far: 3000, update, figure: { obj: ada, fade: 0 } };
}
/** 12 · Ada, frontal: «Tuo padre aveva le mani bianche.» The colour has left her fingertips. */
async function s12(opts = {}) {
  const { s, ada } = await casa({ ada: { pose: 'sitChair', pos: [1.08, 0.1, -3.62], rot: -35, aim: LAP } });
  const EAR = opts.ear ?? EAR_SIT;
  const update = (k, t) => set(ada, mixAims({ ...ada.baseAims, ...LAP }, EAR, bell(t, 5.5, 9.5)));
  update(0, 0);
  return { scene: s, camera: faceOn(ada, 1.3, 17, { up: 0.02, aimDy: 0.0 }), far: 3000, update, figure: { obj: ada, fade: 0.08 } };
}
/** 13 · a pillow shot: the corridor, nobody; the trolley of medicines; the sea at the end. */
async function s13() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#d0d6d4');
  const L = 16, W = 1.2, Ht = 2.8;
  s.add(plane(W * 2, L, '#bcb8ae', [0, 0, -L / 2]));
  s.add(plane(W * 2, L, '#e4e3dd', [0, Ht, -L / 2], Math.PI / 2));
  for (const k of [-1, 1]) {
    const w = plane(L, Ht, '#a9b6a4', [k * W, Ht / 2, -L / 2], 0);
    w.rotation.y = -k * Math.PI / 2;
    s.add(w);
    s.add(beam([k * (W - 0.05), 0.9, 0], [k * (W - 0.05), 0.9, -L + 0.5], 0.04, '#d8d6cc'));
    for (let z = -2; z > -L + 2; z -= 3.4) s.add(boxMesh(0.06, 2.1, 0.95, '#c9c2b0', [k * (W - 0.02), 0, z]));
  }
  // the window at the end, the sea in it
  s.add(boxMesh(W * 2, 0.9, 0.1, '#a9b6a4', [0, 0, -L]));
  s.add(boxMesh(W * 2, Ht - 2.3, 0.1, '#a9b6a4', [0, 2.3, -L]));
  s.add(boxMesh(0.06, 1.4, 0.1, '#efeee8', [0, 0.9, -L + 0.02]));
  s.add(sky([[-0.1, '#9fa8a8'], [0.0, '#d4d8d4'], [0.15, '#c8d0d0'], [1, '#aebcc2']]));
  s.add(sea('#7c8e92', -1.5, 0.35));
  // the trolley of medicines against the wall
  const t = new THREE.Group();
  t.add(boxMesh(0.5, 0.9, 0.45, '#d8dcdc', [0, 0.1, 0]));
  for (let i = 0; i < 3; i++) t.add(boxMesh(0.46, 0.02, 0.02, '#8a9aa4', [0, 0.35 + i * 0.25, 0.235]));
  t.add(boxMesh(0.3, 0.2, 0.25, '#e8e8e4', [0, 1.0, 0]));
  t.position.set(-0.8, 0, -6.5);
  t.userData.id = nextId();
  s.add(t);
  s.add(new THREE.HemisphereLight('#e2e8e2', '#8a8a80', 1.6));
  for (let z = -2; z > -L; z -= 4) s.add(emissive(0.5, 0.03, 0.5, [0, Ht - 0.02, z], 1.3, '#f0f4f0'));
  const sun = shadowed(new THREE.DirectionalLight('#f2f4f2', 1.6), 2048, 10);
  sun.position.set(2, 6, -30);
  sun.target.position.set(0, 0, -8);
  s.add(sun, sun.target);
  return { scene: s, camera: cam(34, [0.25, 1.1, -0.2], [0.05, 1.1, -16]), far: 3000 };
}

// ── III · NOVANTASEI FOTOGRAMMI ───────────────────────────────────────────────────────────────────
/** 14 · the lab in the dark; his face in the monitor's pink light; on the screen the frames in rows. */
async function s14() {
  const sc = await laboratorio({ light: '#e05a9e', screen: 'griglia' });
  return { ...sc, camera: cam(34, [1.7, 1.75, 1.7], [-0.15, 1.0, -1.8]) };
}
/** 16 · two figures at the window, from behind: «Grazie, Franco.» */
async function s16() {
  const { s, ada, el } = await casa({ chair: null, ada: { pose: 'stand', pos: [1.05, 0, -4.05], rot: 175 }, el: { pose: 'stand', pos: [0.38, 0, -3.85], rot: 160 } });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.09, 16), clay('#efede6'));
  s.add(cup);
  const CUP = { LeftArm: [0.15, -1, 0.5], LeftForeArm: [-0.3, 0.2, 1], RightArm: [-0.15, -1, 0.5], RightForeArm: [0.3, 0.2, 1] };
  const update = (k, t) => {
    set(ada, mixAims(ada.baseAims, CUP, 1));
    hold(ada, cup, 'Both', [0, 0.03, 0]);
    cup.rotation.set(0, 0, 0);
    // he turns to her when she calls him by her brother's name
    el.rotation.y = D(160 + 25 * ramp(t, 4, 6));
  };
  update(0, 0);
  return { scene: s, camera: cam(30, [0.62, 1.25, 0.55], [0.72, 1.3, -4.6]), far: 3000, update, figure: { obj: ada, fade: 0.33 } };
}
/** 18 · rain on the glass; Ada in bed, half of her already gone. */
async function s18() {
  const sc = await visita({ fade: 0.6 });
  const update = (k, t) => {
    if (sc.cast.rain) sc.cast.rain.offset.y = t * 0.9;
  };
  return { ...sc, update };
}
/** 19 · the night of green: a slow dolly in to the monitor, the dress gone back to emerald. */
async function s19() {
  const sc = await laboratorio({ screen: 'verde' });
  const camera = sc.camera;
  const update = (k, t) => {
    camera.position.set(...lerp3([0.85, 1.52, 0.75], [0.32, 1.32, -0.55], ease(k)));
    camera.lookAt(0.1, 1.2, -1.8);
  };
  return { ...sc, update };
}
/** 20 · driving to Ostia at night: the street lamps slide over the windscreen, sodium orange. Handheld. */
async function s20() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#05060a');
  s.fog = new THREE.Fog('#0a0a10', 20, 160);
  s.add(plane(14, 400, '#1a1a1e', [0, 0, -150]));
  for (const x of [-3.2, 3.2]) s.add(boxMesh(0.12, 0.02, 400, '#8a8a80', [x, 0, -150]));
  const lamps = [];
  for (let i = 0; i < 18; i++) {
    const g = new THREE.Group();
    g.add(beam([0, 0, 0], [0, 7, 0], 0.14, '#3a3a3c'));
    g.add(beam([0, 7, 0], [-1.8, 7.3, 0], 0.1, '#3a3a3c'));
    g.add(emissive(0.7, 0.18, 0.4, [-1.8, 7.2, 0], 4.5, '#ffa040'));
    g.position.set(4.6, 0, -i * 15);
    g.userData.id = nextId();
    s.add(g);
    lamps.push(g);
  }
  const lights = [0, 1, 2].map(() => {
    const l = new THREE.PointLight('#ff9030', 14, 26, 1.4);
    s.add(l);
    return l;
  });
  // the car around us: dashboard, the pillars, the wheel; Elio driving, from the back seat
  const car = new THREE.Group();
  car.add(boxMesh(1.5, 0.3, 0.6, '#121214', [0, 0.75, -0.9]));
  for (const x of [-0.72, 0.72]) car.add(beam([x, 1.0, -1.05], [x * 0.92, 1.45, -0.45], 0.07, '#141416'));
  car.add(boxMesh(1.45, 0.06, 1.2, '#141416', [0, 1.45, 0.15]));
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.018, 8, 32), clay('#1a1a1c'));
  wheel.position.set(-0.38, 1.05, -0.6);
  wheel.rotation.x = -0.35;
  car.add(wheel);
  car.add(boxMesh(0.55, 0.65, 0.12, '#1c1c20', [-0.38, 0.45, 0.25]));
  car.add(boxMesh(0.55, 0.65, 0.12, '#1c1c20', [0.38, 0.45, 0.25]));
  car.userData.id = nextId();
  s.add(car);
  // the lamps' reflections sliding down the glass
  const streaks = [0, 1].map(() => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.025), new THREE.MeshBasicMaterial({ color: '#ffb060', transparent: true, opacity: 0.8 }));
    m.rotation.x = -0.6;
    m.userData.id = nextId();
    m.userData.colorOnly = true;
    s.add(m);
    return m;
  });
  const DRIVE = { LeftArm: [0.25, -0.5, 0.8], LeftForeArm: [-0.05, 0.25, 1], RightArm: [-0.25, -0.5, 0.8], RightForeArm: [0.05, 0.25, 1], Head: [0, 1, 0.05] };
  const el = await elio('sitChair', { pos: [-0.38, 0.32, -0.1], rotY: 180, aim: DRIVE, wear: { top: '#24262c' } });
  s.add(el);
  s.add(new THREE.HemisphereLight('#2a3048', '#050505', 0.45));
  const camera = cam(40, [0.38, 1.2, 0.62], [-0.15, 1.15, -8]);
  const update = (k, t) => {
    const v = 16;
    lamps.forEach((g, i) => (g.position.z = ((i * 15 + v * t) % 270) - 256 + 14));
    // the nearest three lamps light the inside of the car as they pass
    const near = lamps.map((g) => g.position.z).sort((a, b) => b - a).slice(0, 3);
    lights.forEach((l, i) => l.position.set(2.8, 6.5, near[i]));
    streaks.forEach((m, i) => {
      const u = ((v * t) / 15 + i * 0.5) % 1;
      m.position.set(0.15 + 0.2 * i, 1.42 - 0.38 * u, -0.5 - 0.32 * u);
    });
    const h = (f, a) => a * (Math.sin(t * f) + 0.6 * Math.sin(t * f * 2.3 + 1) + 0.3 * Math.sin(t * f * 5.1 + 2));
    camera.position.set(0.38 + h(1.1, 0.008), 1.2 + h(1.7, 0.006), 0.62);
    camera.lookAt(-0.15 + h(0.9, 0.05), 1.15 + h(1.3, 0.03), -8);
  };
  return { scene: s, camera, far: 300, update };
}
/** The night room: Ada asleep, the second bed, the door ajar onto the sodium of the corridor. */
async function notte({ oksana = true } = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#05070a');
  await room(s, { night: true });
  s.add(bed(0.75, -3.0, 0, '#9a9a8a'));
  s.add(bed(-1.25, -3.0, 0, '#c8c4b8'));
  s.add(nightstand(1.75, -3.9, false));
  // Ada lying on her back, her head on the pillow; her right hand up by her ear
  const lie = new THREE.Group();
  const ada = await adaOld('stand', { pos: [0, 0, 0], rotY: 0, expr: 'tired', aim: { RightArm: [-0.55, 0.75, -0.1], RightForeArm: [0.6, 0.6, -0.4], RightHand: [0.5, 0.3, -0.6], Neck: [0, 1, 0.05], Head: [0, 1, 0.1], Spine2: [0, 1, 0] } });
  lie.add(ada);
  lie.rotation.x = -Math.PI / 2;
  lie.position.set(0.75, 0.72, -1.9);
  s.add(lie);
  // a white sheet over her to the chest
  const sheetM = boxMesh(0.9, 0.06, 1.15, '#d8d6cc', [0.75, 0.7, -2.35]);
  s.add(sheetM);
  let ok = null;
  if (oksana) {
    ok = await grey('woman', 'stand', { pos: [-0.55, 0, -2.6], rotY: -90, seed: 61, expr: 'neutral', wear: { top: '#9fbccc', bottom: '#9fbccc', hair: '#c9a46a', skin: '#ecc8a8', shoes: '#e8e8e4' } });
    s.add(ok);
  }
  // the corridor's sodium through the door left ajar, a long blade on the floor
  const door = new THREE.SpotLight('#ff9a40', 5, 12, 0.2, 0.5, 1.2);
  door.position.set(-2.1, 2.1, 1.2);
  door.target.position.set(-0.3, 0, -2.2);
  door.castShadow = true;
  s.add(door, door.target);
  s.add(new THREE.HemisphereLight('#203048', '#05060a', 0.55));
  const moon = new THREE.DirectionalLight('#6a84b8', 0.6);
  moon.position.set(1, 5, -12);
  s.add(moon);
  return { s, ada, ok };
}
/** 21 · Oksana makes the empty bed and sings; Ada asleep. */
async function s21() {
  const { s, ada, ok } = await notte();
  const BEND = { Spine: [0, 1, 0.55], Spine1: [0, 1, 0.45], Neck: [0, 1, 0.3] };
  const update = (k, t) => {
    const sweep = 0.5 + 0.5 * Math.sin(t * 1.3);
    set(ok, mixAims(ok.baseAims, { ...BEND, LeftArm: [0.25, -0.6, 0.8], LeftForeArm: [0.1 + 0.3 * sweep, -0.4, 1], RightArm: [-0.25, -0.6, 0.8], RightForeArm: [-0.1 - 0.3 * sweep, -0.4, 1] }, 0.6 + 0.4 * bell(t % 6, 0, 6)));
  };
  return { scene: s, camera: cam(30, [0.2, 1.05, 1.2], [-0.1, 0.9, -3.6]), far: 3000, update, figure: { obj: ada, fade: 0.85 } };
}
/** 22 · her two fingers move in her sleep, putting back hair that isn't there. */
async function s22() {
  const { s, ada } = await notte({ oksana: false });
  const f1 = ['RightHandIndex1', 'RightHandMiddle1'];
  const update = (k, t) => {
    const u = bell(t % 2.6, 0.2, 2.2);
    const a = {};
    for (const b of f1) a[b] = [0.2 - 0.5 * u, 0.6, -0.6 - 0.4 * u];
    set(ada, a);
  };
  update(0, 1);
  const hp = boneAt(ada, 'RightHand');
  return { scene: s, camera: cam(20, [hp.x - 0.55, hp.y + 0.45, hp.z + 0.55], [hp.x, hp.y, hp.z]), far: 3000, update, figure: { obj: ada, fade: 0.85 } };
}

// ── IV · IL CIAK ──────────────────────────────────────────────────────────────────────────────────
/** 25 · his first close-up; the girl's face settles on his in the glass. A dolly back with a zoom in: Vertigo. */
async function s25() {
  const sc = await laboratorio({ light: '#e8f0e0', screen: 'verde' });
  sc.cast.mon.visible = false;
  sc.cast.screen.visible = false;
  const back = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 0.3), [clay('#1a1c1e'), clay('#1a1c1e'), clay('#1a1c1e'), clay('#1a1c1e'), clay('#1a1c1e'), clay('#1a1c1e')]);
  back.position.set(0, 1.3, 1.6);
  back.userData.id = nextId();
  sc.scene.add(back);
  for (let l = 0; l < 5; l++) {
    const tx = cansTex(70 + l);
    tx.repeat.set(2, 1);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.42), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6, metalness: 0.3 }));
    sh.rotation.y = Math.PI;
    sh.position.set(0, 0.35 + l * 0.48, 1.44);
    sh.userData.id = nextId();
    sc.scene.add(sh);
  }
  const fill = new THREE.PointLight('#e8f0e0', 2.2, 5, 1.4);
  fill.position.set(0.1, 1.5, -1.6);
  sc.scene.add(fill);
  const face = boneAt(sc.cast.el, 'Head').toArray();
  face[1] += 0.07;
  const ghost = slot(0.36 * 1.37, 0.36, [face[0], face[1] + 0.02, face[2] - 0.06], [0, Math.PI, 0]);
  ghost.visible = false;
  sc.scene.add(ghost);
  const camera = cam(40, [0.08, 1.33, -1.5], face);
  const update = (k, t) => {
    const d = lerp(0.55, 1.75, ease(k));
    camera.position.set(face[0], face[1] + 0.02, face[2] - d);
    camera.fov = (2 * Math.atan(0.42 / (2 * d)) * 180) / Math.PI;
    camera.lookAt(...face);
  };
  update(0, 0);
  return { ...sc, camera, update, screens: [{ name: 'riflesso', mode: 'ghost', mesh: ghost, always: true }] };
}

// ── V · L'ANELLO ──────────────────────────────────────────────────────────────────────────────────
/** 26 · straight down: the loop of film closed with tape, the gloved fingers pressing it. */
async function s26() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#f6f2ec');
  s.add(emissive(1.2, 0.01, 0.8, [0, -0.006, 0], 1.25, '#fff8f0'));
  const R = 0.11, n = 24;
  const screens = [];
  const ringT = canvasTex(1024, 64, (c, w, h) => {
    c.fillStyle = '#6a5a3a';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#f8eef2';
    for (let x = 4; x < w; x += 22) {
      c.fillRect(x, 4, 9, 8);
      c.fillRect(x, h - 12, 9, 8);
    }
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(R - 0.0085, R + 0.0085, 96), new THREE.MeshBasicMaterial({ map: ringT, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.userData.id = nextId();
  s.add(ring);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const q = slot(0.0125, 0.0091, [Math.cos(a) * R, 0.0006, Math.sin(a) * R], [-Math.PI / 2, 0, -a + Math.PI / 2]);
    s.add(q);
    screens.push({ name: `anello${i}`, mode: 'monitor', mesh: q });
  }
  const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.022), new THREE.MeshBasicMaterial({ color: '#f4f0d8', transparent: true, opacity: 0.55 }));
  tape.rotation.x = -Math.PI / 2;
  tape.position.set(R, 0.0012, 0);
  tape.userData.id = nextId();
  s.add(tape);
  const gl = glove();
  gl.rotation.set(0, Math.PI, 0);
  s.add(gl);
  s.add(new THREE.HemisphereLight('#ffffff', '#e8e0e4', 1.3));
  const update = (k, t) => {
    const press = bell(t, 2, 6) + bell(t, 7, 10);
    gl.position.set(R + 0.1, 0.03 - 0.02 * press, 0.005);
  };
  update(0, 0);
  return { scene: s, camera: cam(14, [0.04, 1.15, 0.012], [0.04, 0, 0]), far: 5, update, screens };
}
/** 27 · the room in the dark from the door: the beam, the dust, Pietralata in colour on the wall. */
async function s27() {
  const sc = await proiezione({ fade: 1 });
  sc.scene.add(dust(sc.cast.lens.toArray(), [0.0, 1.62, -3.85], 0.8, 140, 9));
  return { ...sc, camera: cam(36, [-1.4, 1.55, 3.6], [0.35, 1.25, -3.9]) };
}
/** 28 · three in one frame, forty seconds: Ada in bed, Elio, and between them the girl on the wall. */
async function s28() {
  const sc = await proiezione({ fade: 1 });
  const { ada } = sc.cast;
  sc.scene.add(dust(sc.cast.lens.toArray(), [0.0, 1.62, -3.85], 0.8, 120, 11));
  const update = (k, t) => {
    // she turns to him, looks at the white gloves, at his face; then the gesture
    ada.rotation.y = D(lerp(-118, -92, ramp(t, 27, 30)));
    set(ada, mixAims(ada.baseAims, EAR_SIT, bell(t, 32.5, 37)));
  };
  return { ...sc, update };
}
/** 29 · Ada, frontal, in the colours of 1962 thrown back off the wall: «Nino.» No magenta. */
async function s29() {
  const sc = await proiezione({ fade: 0 });
  const { ada } = sc.cast;
  ada.rotation.y = D(-92);
  const key = new THREE.SpotLight('#ffe2b0', 6, 6, 0.6, 0.6, 1.4);
  key.position.set(0.6, 1.8, -2.6);
  key.target.position.set(1.95, 1.3, -0.9);
  sc.scene.add(key, key.target);
  return { ...sc, camera: faceOn(ada, 1.25, 16, { up: 0.02 }), update: (k, t) => set(ada, mixAims(ada.baseAims, { Head: [-0.05, 1, 0.1] }, bell(t, 1, 8))) };
}
/** 30 · the Pietà: she sits on the edge of the bed, he on the floor with his head against her knees, her hand in his hair; the beam paints them. */
async function s30() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#04060a');
  s.add(plane(7, 7, '#3a3c38', [0, 0, -1.0]));
  s.add(plane(7, 3, '#a9b6a4', [0, 1.5, -3.2], 0));
  const lw = plane(7, 3, '#a9b6a4', [-2.6, 1.5, -0.5], 0);
  lw.rotation.y = Math.PI / 2;
  s.add(lw);
  s.add(bed(0, -2.25, 90, '#2f6a4a'));
  const ada = await adaOld('sitChair', { pos: [0.02, 0.26, -1.78], rotY: 0, expr: 'smile', aim: { LeftArm: [0.25, -0.55, 0.8], LeftForeArm: [0.25, -0.75, 0.6], LeftHand: [0.1, -0.8, 0.5], RightArm: [-0.15, -1, 0.35], RightForeArm: [0.1, -0.15, 1], Head: [0.1, 0.85, 0.5], Neck: [0, 1, 0.3] } });
  s.add(ada);
  const el = await elio('sitFloor', { pos: [0.28, 0.0, -1.05], rotY: 8, gloves: true, expr: 'sad', aim: { Spine: [-0.15, 1, -0.45], Spine1: [-0.2, 1, -0.35], Neck: [-0.4, 0.9, -0.1], Head: [-0.55, 0.75, 0.05], LeftArm: [0.25, -1, 0.1], RightArm: [-0.25, -1, 0.05] } });
  s.add(el);
  // the projector on the nightstand at the right: across them, to the wall at the left; the 1962 picture on their bodies
  s.add(nightstand(1.35, 0.1, false));
  const tex = await new THREE.TextureLoader().loadAsync('/magenta/build/film/presa-eastman/f0028.jpg');
  tex.colorSpace = THREE.SRGBColorSpace;
  const lensP = [1.25, 1.0, 0.15];
  const aim = [-0.15, 0.78, -1.75];
  const sp = new THREE.SpotLight('#ffffff', 40, 10, 0.36, 0.05, 1.0);
  sp.position.set(...lensP);
  sp.target.position.set(...aim);
  sp.map = tex;
  sp.castShadow = true;
  sp.shadow.mapSize.set(1024, 1024);
  s.add(sp, sp.target);
  s.add(shaft(lensP, aim, 0.02, 0.8, '#f4f0e6', 0.07));
  s.add(dust(lensP, aim, 0.7, 90, 13));
  const pr = projector();
  pr.rotation.y = Math.atan2(lensP[0] - aim[0], lensP[2] - aim[2]);
  pr.position.set(1.35, 0.62 + 0.3, 0.3);
  pr.scale.setScalar(0.8);
  s.add(pr);
  s.add(new THREE.HemisphereLight('#1a3a4a', '#08060a', 0.4));
  const update = (k, t) => pr.userData.reels.forEach((r, i) => (r.rotation.x = -t * (i ? 2.6 : 1.9)));
  return { scene: s, camera: cam(30, [0.05, 0.98, 0.55], [0.12, 0.8, -1.7]), far: 30, update, figure: { obj: ada, fade: 0 } };
}

// ── EPILOGO ───────────────────────────────────────────────────────────────────────────────────────
/** 31 · the empty bed seen from its foot, foreshortened; Oksana folds the green blanket. Morning. */
async function s31() {
  const { s } = await casa({ ada: null, bedAt: [0.5, -2.95, 0, '#efede6'], chair: [1.4, -3.9, 200], stand: [1.5, -2.4] });
  const ok = await grey('woman', 'stand', { pos: [1.55, 0, -3.15], rotY: -60, seed: 61, wear: { top: '#9fbccc', bottom: '#9fbccc', hair: '#c9a46a', skin: '#ecc8a8', shoes: '#e8e8e4' } });
  s.add(ok);
  const blanket = boxMesh(0.42, 0.05, 0.3, '#2f6a4a');
  s.add(blanket);
  const FOLD = { LeftArm: [0.2, -0.6, 0.8], LeftForeArm: [-0.25, 0.1, 1], RightArm: [-0.2, -0.6, 0.8], RightForeArm: [0.25, 0.1, 1], Head: [0, 0.9, 0.4] };
  const update = (k, t) => {
    set(ok, mixAims(ok.baseAims, FOLD, 0.7 + 0.3 * Math.sin(t * 0.9)));
    hold(ok, blanket, 'Both', [0, -0.02, 0]);
    blanket.rotation.set(0, D(-60), 0);
  };
  update(0, 0);
  return { scene: s, camera: cam(30, [0.5, 1.02, -1.25], [0.62, 0.68, -4.6]), far: 3000, update };
}
/** 32 · the shelf; the new can with its label; a gloved hand pushes it into its place. */
async function s32() {
  const s = new THREE.Scene();
  archivio(s, 20);
  const lab = canvasTex(512, 128, (c, w, h) => {
    c.fillStyle = '#e8e0c8';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#2a2a3a';
    c.font = 'bold 36px "Comic Sans MS", cursive';
    c.textAlign = 'center';
    c.fillText('PANE DURO — 41 — 3', w / 2, 52);
    c.font = '38px "Comic Sans MS", cursive';
    c.fillText('ADA E NINO', w / 2, 102);
  });
  const can = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 32), clay('#9aa0a6'));
  body.rotation.z = Math.PI / 2;
  can.add(body);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.075), new THREE.MeshStandardMaterial({ map: lab }));
  label.rotation.y = Math.PI / 2;
  label.position.set(0.032, 0.02, 0);
  can.add(label);
  can.userData.id = nextId();
  s.add(can);
  const gl = glove();
  gl.rotation.set(0, Math.PI, 0);
  s.add(gl);
  const screens = [{ name: 'etichetta', mode: 'paper', mesh: label }];
  const update = (k, t) => {
    const x = lerp(-0.85, -1.03, ramp(t, 2, 6));
    can.position.set(x, 1.73, -6);
    gl.position.set(x + 0.13, 1.73 - 0.1, -6 + 0.02);
    gl.visible = t < 8;
  };
  update(0, 0);
  return { scene: s, camera: cam(22, [0.2, 1.75, -4.9], [-1.05, 1.68, -6.1]), far: 40, update, screens };
}
/** 33 · Ostia at dawn: Elio small at the edge of the sea; the camera pulls slowly back. */
async function s33() {
  const sc = await alba();
  const camera = sc.camera;
  let wv = null;
  sc.scene.traverse((o) => o.material?.normalMap && (wv = o.material.normalMap));
  const update = (k, t) => {
    camera.position.set(...lerp3([1.2, 1.0, -6.5], [1.5, 1.05, 4.0], ease(k)));
    camera.lookAt(0.3, 10, -120);
    if (wv) wv.offset.set(0.004 * t, 0.012 * t);
  };
  return { ...sc, update };
}

export const SHOTS = {
  presa,
  presaCu: (o = {}) => presa({ ...o, cu: true }),
  s01, s05, s06, s08, s09, s10, s11, s12, s13, s14, s16, s18, s19, s20, s21, s22, s25, s26, s27, s28, s29, s30, s31, s32, s33,
};

