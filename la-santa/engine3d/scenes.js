// The shots of SEX ON LA SANTA: puppet sets at human scale. Metres; puppets face +z unless turned.
import { THREE, W, H, boxMesh, plane, clay, nextId } from '/a-parte/engine3d/stage.js';
import { puppet, SAYF, ZOHRA, GINO, PIPPO, SIT, felt } from './puppet.js';
import * as K from './props.js';
import { SHOTS } from './shots.js';

import { D, cam, shadowed, tex, rng, santissimoFront, barInterior, caruggio, porto } from './sets.js';

// ── a puppet portrait, against black, as in the photo of the puppet ──
async function portrait() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#050506');
  const p = puppet(SAYF);
  p.pose({ ...SIT, torso: [-0.05, 0.25, 0.04], neck: [0.05, -0.25, 0], head: [0.04, -0.1, 0.05], shoulderR: [0.3, 0, -0.2], elbowR: [-1.2, 0, 0.1] });
  p.look(0.25, 0.05);
  p.mouth(0.12);
  s.add(p.root);
  const key = new THREE.SpotLight('#fff4e8', 40, 10, 0.5, 0.6, 1.5);
  key.position.set(1.4, 2.2, 2.2);
  key.target.position.set(0, 0.6, 0);
  shadowed(key);
  s.add(key, key.target);
  const fill = new THREE.DirectionalLight('#c8d4ff', 0.6);
  fill.position.set(-2, 1, 2);
  s.add(fill);
  const rim = new THREE.DirectionalLight('#ffffff', 1.2);
  rim.position.set(-1, 2, -2);
  s.add(rim);
  s.add(new THREE.HemisphereLight('#ffffff', '#222222', 0.25));
  return { scene: s, camera: cam(30, [0.25, 0.85, 2.2], [0.0, 0.62, 0]), far: 20 };
}

// ── the head close, three-quarters, to hold against the photo ──
async function head(opts = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#050506');
  const p = puppet(SAYF);
  p.root.rotation.y = -0.35;
  p.pose({ torso: [-0.04, 0, 0.03], neck: [0.04, 0.2, 0], head: [0.05, 0.12, 0.04] });
  p.look(0.15, 0.02);
  p.mouth(opts.mouth ?? 0.1);
  s.add(p.root);
  const key = new THREE.SpotLight('#fff1e2', 14, 10, 0.5, 0.8, 1.5);
  key.position.set(-1.0, 1.9, 2.0);
  key.target.position.set(0, 0.7, 0);
  shadowed(key);
  s.add(key, key.target);
  const fill = new THREE.DirectionalLight('#dfe6ff', 0.7);
  fill.position.set(2, 0.8, 2);
  s.add(fill);
  const rim = new THREE.DirectionalLight('#ffffff', 1.4);
  rim.position.set(1, 2, -2);
  s.add(rim);
  s.add(new THREE.HemisphereLight('#ffffff', '#222222', 0.35));
  return { scene: s, camera: cam(24, [0.05, 0.8, 1.75], [0.0, 0.68, 0]), far: 20 };
}

// 02 · Sayf on the bench outside his bar
async function s02(opts = {}) {
  const s = new THREE.Scene();
  const { wz } = santissimoFront(s);
  const p = puppet(SAYF);
  p.root.position.set(-0.85, 0.47, wz + 0.38);
  p.root.rotation.y = D(4);
  p.pose({ ...SIT, torso: [-0.2, 0.08, 0.05], neck: [0.12, -0.2, 0], head: [0.06, -0.22, 0.08],
    shoulderL: [0.25, 0.3, 0.95], elbowL: [-0.9, 0.2, 0.1], wristL: [0.3, 0, 0.3], shoulderR: [0.35, 0, -0.2], elbowR: [-1.0, 0, 0.1], hipL: [-1.4, 0.15, 0.1], hipR: [-1.4, -0.2, -0.06] });
  p.look(0.12, 0.02);
  p.lids(0.38);
  p.mouth(opts.mouth ?? 0.3);
  s.add(p.root);
  const key = new THREE.SpotLight('#ffdcb4', 9, 6, 0.42, 0.85, 1.5);
  key.position.set(0.6, 1.95, 0.9);
  key.target.position.set(-0.85, 1.1, wz + 0.35);
  shadowed(key);
  s.add(key, key.target);
  const rim = new THREE.SpotLight('#9fb0ff', 7, 6, 0.4, 0.8, 1.5);
  rim.position.set(-2.4, 2.3, wz + 0.2);
  rim.target.position.set(-0.85, 1.15, wz + 0.4);
  s.add(rim, rim.target);
  return { scene: s, camera: cam(40, [-1.75, 0.92, 1.1], [-0.35, 1.45, wz]), far: 30 };
}

// the facade of the Santissimo, wide, at night
async function facade() {
  const s = new THREE.Scene();
  const { wz } = santissimoFront(s);
  const p = puppet(SAYF);
  p.root.position.set(-0.85, 0.47, wz + 0.38);
  p.root.rotation.y = D(10);
  p.pose({ ...SIT, torso: [-0.2, 0.08, 0.05], neck: [0.12, -0.08, 0], shoulderL: [0.25, 0.3, 0.95], elbowL: [-0.9, 0.2, 0.1] });
  s.add(p.root);
  return { scene: s, camera: cam(40, [0.4, 1.45, 4.6], [0.25, 1.75, wz]), far: 30 };
}

// 03 · close on Sayf singing to us, the bar warm behind him
async function s03(opts = {}) {
  const s = new THREE.Scene();
  const { wz } = santissimoFront(s);
  const p = puppet(SAYF);
  p.root.position.set(-0.85, 0.47, wz + 0.38);
  p.root.rotation.y = D(-8);
  p.pose({ ...SIT, torso: [-0.16, -0.05, 0.04], neck: [0.1, -0.12, 0.02], head: [0.0, -0.18, 0.08],
    shoulderL: [0.25, 0.3, 0.95], elbowL: [-0.9, 0.2, 0.1], shoulderR: [0.2, 0, -0.15], elbowR: [-0.9, 0, 0.1] });
  p.look(-0.05, 0.05);
  p.lids(opts.lids ?? 0.36);
  p.mouth(opts.mouth ?? 0.6);
  s.add(p.root);
  const key = new THREE.SpotLight('#ffe2c4', 5, 5, 0.35, 0.9, 1.5);
  key.position.set(-1.7, 1.85, 0.4);
  key.target.position.set(-0.85, 1.2, wz + 0.3);
  shadowed(key);
  s.add(key, key.target);
  // the bar behind him rims his shoulder and the twists
  const rim = new THREE.SpotLight('#ffa860', 10, 4, 0.5, 0.8, 1.5);
  rim.position.set(0.3, 1.7, wz - 0.1);
  rim.target.position.set(-0.85, 1.2, wz + 0.3);
  s.add(rim, rim.target);
  return { scene: s, camera: cam(30, [-1.45, 1.22, 0.55], [-0.62, 1.2, wz + 0.05]), far: 30 };
}

// the cast, side by side, for a look at them
async function cast(opts = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#14100e');
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: '#3a2a22', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  s.add(ground);
  const xs = [-1.5, -0.5, 0.5, 1.5];
  [GINO, ZOHRA, SAYF, PIPPO].forEach((C, i) => {
    const p = puppet(C);
    p.root.position.set(xs[i], 0.93 * (C.scale ?? 1), 0);
    p.pose({ shoulderL: [0, 0, 0.12], shoulderR: [0, 0, -0.12], head: [0, -xs[i] * 0.12, 0] });
    p.mouth(opts.mouth ?? 0.15);
    s.add(p.root);
  });
  const key = new THREE.SpotLight('#fff1e2', 30, 12, 0.6, 0.8, 1.4);
  key.position.set(-1.5, 3.2, 3.5);
  key.target.position.set(0, 1.0, 0);
  shadowed(key);
  s.add(key, key.target);
  s.add(new THREE.HemisphereLight('#c8d4ff', '#2a2018', 0.9));
  const rim = new THREE.DirectionalLight('#ffd8b0', 1.5);
  rim.position.set(2, 3, -3);
  s.add(rim);
  return { scene: s, camera: cam(30, [0, 1.25, 5.2], [0, 1.1, 0]), far: 20 };
}

// the rest of the cast on a table
async function props(opts = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#14100e');
  const table = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 1.4), new THREE.MeshStandardMaterial({ color: '#5a3820', roughness: 0.7 }));
  table.position.set(0, -0.025, 0);
  table.receiveShadow = true;
  s.add(table);
  const g = K.seagull();
  g.root.position.set(-1.2, 0, 0);
  g.root.rotation.y = 0.5;
  g.mouth(0.5);
  g.P.shades.visible = true;
  s.add(g.root);
  ['#3d2a12', '#1f3a20', '#5a1810'].forEach((c, i) => {
    const b = K.singer(c, '#efe2bc');
    b.root.position.set(-0.6 + i * 0.13, 0, -0.2);
    b.mouth(i * 0.4);
    s.add(b.root);
  });
  ['basilico', 'limone', 'menta', 'fiori', 'harissa'].forEach((k, i) => {
    const it = K.ingredient(k);
    it.root.position.set(-0.15 + i * 0.22, 0, 0.1);
    it.mouth(0.4);
    s.add(it.root);
  });
  const c = K.cocktail(1.4);
  c.root.position.set(1.0, 0, 0.1);
  s.add(c.root);
  for (let i = 0; i < 2; i++) {
    const q = K.cube();
    q.root.position.set(1.25 + i * 0.1, 0.035, 0.2);
    q.mouth(0.5);
    s.add(q.root);
  }
  const sh = K.shaker();
  sh.position.set(1.5, 0, -0.1);
  s.add(sh);
  const f = K.focaccia();
  f.root.position.set(0.6, 0, -0.35);
  f.bites(2);
  s.add(f.root);
  const key = new THREE.SpotLight('#fff1e2', 20, 10, 0.7, 0.8, 1.4);
  key.position.set(-1, 2.5, 2.5);
  key.target.position.set(0, 0, 0);
  shadowed(key);
  s.add(key, key.target);
  s.add(new THREE.HemisphereLight('#c8d4ff', '#2a2018', 0.8));
  return { scene: s, camera: cam(28, [0, 0.9, 3.2], [0.1, 0.12, 0]), far: 20 };
}

// a look at each set, empty
async function setBar() {
  const s = new THREE.Scene();
  barInterior(s);
  const p = puppet(SAYF);
  p.root.position.set(0, 0.93, -0.65);
  p.mouth(0.4);
  s.add(p.root);
  return { scene: s, camera: cam(40, [0.3, 1.45, 3.2], [0, 1.4, -0.6]), far: 30 };
}
async function setCaruggio() {
  const s = new THREE.Scene();
  await caruggio(s);
  return { scene: s, camera: cam(50, [0.3, 1.6, 4.5], [0, 3.2, -10]), far: 60 };
}
async function setPorto() {
  const s = new THREE.Scene();
  porto(s);
  return { scene: s, camera: cam(42, [-4, 2.2, 9], [0, 6, -20]), far: 600 };
}

export const SCENES = { portrait, head, facade, cast, props, setBar, setCaruggio, setPorto, ...SHOTS };
