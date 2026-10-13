// The shots of A PARTE as 3D scenes. Units are metres; characters face +z unless turned (rotY).
import { THREE, person, posed, boxMesh, plane, clay, PROTAGONIST, REDPROP, nextId } from './stage.js';
import { posetest } from './posetest.js';

const D = THREE.MathUtils.degToRad;

function cam(fov, pos, target, far = 2000) {
  const c = new THREE.PerspectiveCamera(fov, 1920 / 804, 0.05, far);
  c.position.set(...pos);
  c.lookAt(...target);
  return c;
}

function shadowed(light, size = 2048, area = 12) {
  light.castShadow = true;
  light.shadow.mapSize.set(size, size);
  if (light.shadow.camera.isOrthographicCamera) Object.assign(light.shadow.camera, { left: -area, right: area, top: area, bottom: -area, far: 400 });
  light.shadow.bias = -0.0005;
  light.shadow.radius = 4;
  return light;
}

// ── people ──
/** The protagonist: the red one. As a man the light passes through him; as a child he still had a shadow. */
async function him(pose, opts = {}) {
  const clip = ['walk', 'idle', 'run'].includes(pose);
  const o = clip ? await person('Xbot', { clip: pose, ...opts, id: PROTAGONIST }) : await posed('Xbot', pose, { ...opts, id: PROTAGONIST });
  o.traverse((m) => m.isMesh && (m.castShadow = !!opts.shadow));
  return o;
}

const ARMS = {
  phone: { LeftArm: [0.25, -1, 0.35], LeftForeArm: [-0.35, 0.45, 1], RightArm: [-0.25, -1, 0.35], RightForeArm: [0.35, 0.45, 1], Neck: [0, 1, 0.4], Head: [0, 0.6, 1] },
  ear: { RightArm: [-0.3, -0.4, 0.2], RightForeArm: [0.25, 1, 0.1], Head: [0.15, 1, 0.15] },
  newspaper: { LeftArm: [0.25, -1, 0.6], LeftForeArm: [0.05, 0.55, 1], RightArm: [-0.25, -1, 0.6], RightForeArm: [-0.05, 0.55, 1] },
  bar: { RightArm: [-0.12, 1, 0.05], RightForeArm: [-0.05, 1, 0.02] },
  raise: { LeftArm: [0.12, 1, -0.05], LeftForeArm: [0.05, 1, 0] },
  throw: { RightArm: [-0.2, 0.7, 0.7], RightForeArm: [-0.1, 0.9, 0.5], LeftArm: [0.4, -0.3, 0.8], LeftForeArm: [0.2, 0, 1] },
  point: { RightArm: [-0.15, 0.15, 1], RightForeArm: [-0.1, 0.2, 1] },
  cry: { Spine: [0, 1, 0.45], Spine1: [0, 1, 0.4], Neck: [0, 0.5, 1], Head: [0, -0.2, 1], LeftArm: [0.2, -0.6, 0.8], LeftForeArm: [-0.4, 0.8, 0.5], RightArm: [-0.2, -0.6, 0.8], RightForeArm: [0.4, 0.8, 0.5] },
  dance2: { Spine: [-0.1, 1, -0.05], LeftArm: [0.5, 1, 0.2], LeftForeArm: [0.1, 1, 0.1], RightArm: [-0.5, 1, 0.2], RightForeArm: [-0.1, 1, 0.1], Head: [0, 1, -0.3], RightUpLeg: [-0.1, -1, 0.2], RightLeg: [0, -1, -0.25] },
  dance: { Spine: [0.15, 1, -0.1], LeftArm: [0.9, 0.8, 0.1], LeftForeArm: [0.3, 1, 0.2], RightArm: [-0.7, -0.4, 0.4], RightForeArm: [-0.2, 0.6, 0.8], LeftUpLeg: [0.2, -1, 0.15], LeftLeg: [0, -1, -0.3], Head: [0.3, 1, 0] },
  headphones: { Neck: [0, 1, 0.3], Head: [0, 0.8, 0.7] },
};

/** Grey people. kind: 'man' (no hat), 'oldman' (hat and beard), 'woman', 'girl', 'boy', 'teen', 'teengirl', 'grown' (mannequin adult with hair). */
async function grey(kind, pose, opts = {}) {
  const k = {
    man: ['readyplayer.me', { hide: ['Wolf3D_Headwear', 'Wolf3D_Beard'] }],
    beard: ['readyplayer.me', { hide: ['Wolf3D_Headwear'] }],
    oldman: ['readyplayer.me', {}],
    woman: ['Michelle', { trimHead: { r: 0.55 }, bob: 0.38, bobShape: [0.5, 0.44, -0.1, 1.1] }],
    girl: ['HVGirl', { scale: 0.052 }],
    teengirl: ['HVGirl', { scale: 0.066 }],
    boy: ['Xbot', { kid: true, scale: 0.62, hair: 0.34 }],
    teen: ['Xbot', { scale: 0.92, hair: 0.3 }],
    grown: ['Xbot', { hair: 0.32 }],
  }[kind];
  const [name, base] = k;
  const o = { ...base, ...opts, aim: { ...(ARMS[opts.arms] ?? {}), ...(opts.aim ?? {}) } };
  if (['walk', 'run', 'idle', 'hvwalk', 'samba', 'hvidle'].includes(pose)) return person(name, { ...o, clip: pose });
  return posed(name, pose, o);
}

// ── motion, for the animatic ──
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => x * x * (3 - 2 * x);
const easeIn = (x) => x * x;
/** Blend two sets of aims bone by bone (directions are normalised by aim()). */
function mixAims(a, b, u) {
  const o = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const p = a[k] ?? b[k], q = b[k] ?? a[k];
    o[k] = p.map((v, i) => v + (q[i] - v) * u);
  }
  return o;
}
const mirror = (a) => Object.fromEntries(Object.entries(a).map(([k, v]) => [k.replace(/^Left/, 'TMP').replace(/^Right/, 'Left').replace(/^TMP/, 'Right'), [-v[0], v[1], v[2]]]));
/** Point along a parabola from a to b, lifted by `lift` at the middle. */
function arc(a, b, u, lift) {
  return a.map((v, i) => v + (b[i] - v) * u + (i === 1 ? 4 * lift * u * (1 - u) : 0));
}

// ── small props ──
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function sheet(w, h, tex, pos, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.receiveShadow = true;
  m.userData.id = nextId();
  return m;
}

function emissive(w, h, d, pos, v = 1.6) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: new THREE.Color(v, v * 0.95, v * 0.85) }));
  m.position.set(...pos);
  m.userData.id = nextId();
  return m;
}

/** A thin bar between two points (pillars of a car's greenhouse, poles, rails). */
function beam(a, b, t = 0.06, tone = 0.3) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = new THREE.Mesh(new THREE.BoxGeometry(t, A.distanceTo(B), t), clay(tone));
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Put a prop in someone's hands: the right one, the left one, or between both. Faces the head. */
function hold(o, mesh, side = 'Right', off = [0, 0, 0]) {
  o.updateMatrixWorld(true);
  const palm = (sd) => {
    const p = o.bones[`${sd}Hand`].getWorldPosition(new THREE.Vector3());
    const f = o.bones[`${sd}HandMiddle1`];
    return f ? p.lerp(f.getWorldPosition(new THREE.Vector3()), 0.5) : p;
  };
  const p = side === 'Both' ? palm('Left').add(palm('Right')).multiplyScalar(0.5) : palm(side);
  mesh.position.copy(p).add(new THREE.Vector3(...off));
  mesh.lookAt(o.bones.Head.getWorldPosition(new THREE.Vector3()));
  mesh.userData.id ??= nextId();
  return mesh;
}

function phone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.012), clay(0.15));
  g.add(body);
  g.add(Object.assign(emissive(0.065, 0.135, 0.002, [0, -0.0675, 0.007], 2.2), { userData: {} }));
  return g;
}

/** A car: a pressed body with wheel arches, an open greenhouse (no glass, so we can see in), seats, a wheel. Front is +z. */
function car(x, z, rotY = 0, tone = 0.4, tail = false) {
  const g = new THREE.Group();
  const sh = new THREE.Shape();
  sh.moveTo(-2.15, 0.32);
  sh.lineTo(-2.15, 0.82);
  sh.lineTo(-2.02, 0.92);
  sh.lineTo(-1.55, 0.97);
  sh.lineTo(1.25, 0.97);
  sh.lineTo(2.0, 0.84);
  sh.lineTo(2.15, 0.66);
  sh.lineTo(2.15, 0.32);
  sh.lineTo(1.78, 0.32);
  sh.absarc(1.35, 0.32, 0.43, 0, Math.PI, false);
  sh.lineTo(-0.92, 0.32);
  sh.absarc(-1.35, 0.32, 0.43, 0, Math.PI, false);
  sh.lineTo(-2.15, 0.32);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 1.7, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 16 });
  geo.translate(0, 0, -0.85);
  const body = new THREE.Mesh(geo, clay(tone));
  body.rotation.y = -Math.PI / 2;
  body.castShadow = body.receiveShadow = true;
  g.add(body);
  // the greenhouse: roof and pillars only
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 1.35), clay(tone));
  roof.position.set(0, 1.42, -0.3);
  roof.castShadow = true;
  g.add(roof);
  for (const sx of [-0.74, 0.74]) {
    g.add(beam([sx, 0.97, 1.25], [sx * 0.97, 1.42, 0.37], 0.07, tone));
    g.add(beam([sx, 0.97, -0.25], [sx * 0.97, 1.42, -0.25], 0.08, tone));
    g.add(beam([sx, 0.97, -1.55], [sx * 0.97, 1.42, -0.97], 0.12, tone));
  }
  // inside: dashboard, seats, the wheel on the left (front is +z, so the car's left is +x)
  g.add(boxMesh(1.55, 0.2, 0.35, tone * 0.6, [0, 0.82, 0.95]));
  for (const sx of [-0.4, 0.4]) {
    g.add(boxMesh(0.52, 0.12, 0.5, 0.22, [sx, 0.4, -0.05]));
    const back = boxMesh(0.52, 0.62, 0.12, 0.22, [sx, 0.48, -0.35]);
    back.rotation.x = -0.18;
    g.add(back);
  }
  g.add(boxMesh(1.4, 0.12, 0.5, 0.22, [0, 0.4, -1.1]));
  g.add(boxMesh(1.4, 0.55, 0.12, 0.22, [0, 0.5, -1.38]));
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 8, 28), clay(0.12));
  wheel.position.set(0.4, 0.95, 0.55);
  wheel.rotation.x = -0.45;
  g.add(wheel);
  for (const [x2, z2] of [[-0.8, 1.35], [0.8, 1.35], [-0.8, -1.35], [0.8, -1.35]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 24), clay(0.1));
    w.rotation.z = Math.PI / 2;
    w.position.set(x2, 0.33, z2);
    w.castShadow = true;
    g.add(w);
  }
  for (const sx of [-0.6, 0.6]) g.add(boxMesh(0.32, 0.1, 0.04, 0.95, [sx, 0.7, 2.17]));
  if (tail) {
    for (const sx of [-0.62, 0.62]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      t.position.set(sx, 0.8, -2.19);
      t.userData.id = REDPROP;
      g.add(t);
    }
  }
  g.position.set(x, 0, z);
  g.rotation.y = D(rotY);
  g.userData.id = nextId();
  return g;
}

/** The number 7: long body, a dark band of windows, doors, the number lit at the front (front is +x). */
function busBody(tone = 0.62) {
  const g = new THREE.Group();
  g.add(boxMesh(11, 2.55, 2.5, tone, [0, 0.42, 0]));
  g.add(boxMesh(11, 0.1, 2.4, tone * 0.8, [0, 2.97, 0]));
  for (let i = 0; i < 7; i++) g.add(boxMesh(1.3, 1.0, 2.54, 0.16, [-4.6 + i * 1.45, 1.55, 0]));
  g.add(boxMesh(0.06, 1.5, 2.3, 0.16, [5.49, 1.15, 0]));
  for (const dx of [3.9, -0.6]) g.add(boxMesh(1.1, 2.15, 2.53, tone * 0.75, [dx, 0.45, 0]));
  const sign = sheet(0.9, 0.3, canvasTex(240, 80, (x, w, h) => {
    x.fillStyle = '#111';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#fff';
    x.font = 'bold 64px sans-serif';
    x.fillText('7', 20, 64);
    x.font = 'bold 30px sans-serif';
    x.fillText('CENTRO', 70, 54);
  }), [5.53, 2.6, 0], [0, Math.PI / 2, 0]);
  g.add(sign);
  for (const [x2, z2] of [[3.6, 1.15], [3.6, -1.15], [-3.4, 1.15], [-3.4, -1.15]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 24), clay(0.1));
    w.rotation.x = Math.PI / 2;
    w.position.set(x2, 0.5, z2);
    g.add(w);
  }
  return g;
}

function buildings(s, z0, n, seed = 1, lit = 0.25) {
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) {
    const w = 8 + rnd() * 14;
    const h = 10 + rnd() * 40;
    const x = -90 + i * 13 + rnd() * 6;
    const z = z0 - rnd() * 40;
    s.add(boxMesh(w, h, 10, 0.25, [x, -20, z]));
    for (let fy = 0; fy < h / 3.2 - 1; fy++) {
      for (let fx = 0; fx < w / 3 - 1; fx++) {
        if (rnd() < lit) s.add(emissive(1.2, 1.4, 0.1, [x - w / 2 + 2 + fx * 3, -20 + 2 + fy * 3.2, z + 5.06], 1.2 + rnd()));
      }
    }
  }
}

// ── PROLOGUE · the car park ──
const GARAGE_PILLARS = [[-9.6, -4.5], [-9.6, -10.5], [-9.6, -16.5], [-9.6, -22.5], [-3.6, -16.5], [2.4, -16.5], [7, -8]];
// what he sees, later: a woman in her car, a guard dancing, a boy counting the pillars
const WOMAN_CAR = { x: -4.2, z: -8.6, rotY: 72 };
const GUARD = [-0.8, -12.8];
const BOY = [-7.9, -4.2];
async function garageSet({ beam = 1, ambient = 0.55, lamp = 26 } = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.03, 0.03, 0.035);
  const apron = plane(14, 9, 0.8, [0, 0, 1.6]);
  s.add(apron);
  s.add(boxMesh(14, 0.12, 0.25, 0.7, [0, 0, -2.85]));
  const deck = plane(60, 40, 0.3, [0, -0.12, -22]);
  s.add(deck);
  for (let i = -6; i <= 3; i++) {
    const line = plane(0.12, 4.8, 1.0, [i * 2.6 - 1.2, -0.115, -6.4]);
    line.rotation.z = D(8);
    line.userData.id = deck.userData.id;
    s.add(line);
  }
  const bayEnd = plane(24, 0.12, 1.0, [-2, -0.115, -3.9]);
  bayEnd.userData.id = deck.userData.id;
  s.add(bayEnd);
  for (const x of [-4.2, -1.0]) {
    const j = plane(0.035, 9, 0.5, [x, 0.002, 1.6]);
    j.userData.id = apron.userData.id;
    s.add(j);
  }
  for (const z of [-0.6, 2.4]) {
    const j = plane(14, 0.035, 0.5, [0, 0.002, z]);
    j.userData.id = apron.userData.id;
    s.add(j);
  }
  // the pillar he leans on, and others further out on the deck
  s.add(boxMesh(1.3, 4.2, 1.3, 0.66, [1.2, 0, -0.35]));
  for (const [x, z] of GARAGE_PILLARS) s.add(boxMesh(1.2, 4.2, 1.2, 0.5, [x, -0.12, z]));
  s.add(new THREE.HemisphereLight(0xdde3ea, 0x2a2622, ambient));
  const l = shadowed(new THREE.PointLight(0xfff2dc, lamp, 16, 1.6), 1024);
  l.position.set(-1.6, 3.6, 3.2);
  s.add(l);
  if (beam) {
    const spot = shadowed(new THREE.SpotLight(0xfff0d0, 260 * beam, 30, D(16), 0.55, 1.4), 2048);
    spot.position.set(-11, 0.75, -1.2);
    spot.target.position.set(2, 0.4, 0.2);
    s.add(spot, spot.target);
    s.userData.beam = spot;
  }
  return s;
}

const HIM_AT_PILLAR = { pos: [0.3, 0, -0.25], rotY: -90 };

async function p01() {
  const s = await garageSet({ beam: 1.3, ambient: 0.05, lamp: 0 });
  s.add(await him('sitFloor', HIM_AT_PILLAR));
  const spot = s.userData.beam, I = spot.intensity;
  const update = (k, t) => {
    const u = ease(clamp01((t - 1.5) / 7));
    spot.intensity = I * clamp01((t - 1) / 1.2);
    spot.position.set(-11, 0.75, -9 + 7.8 * u);
    spot.target.position.set(2, 0.4, -9 + 9.2 * u);
  };
  return { scene: s, camera: cam(40, [-1.35, 1.5, 3.9], [0.05, 0.55, -0.55]), far: 80, update };
}

async function p02() {
  const s = await garageSet();
  s.add(await him('sitFloor', HIM_AT_PILLAR));
  const spot = s.userData.beam, I = spot.intensity;
  const update = (k, t) => {
    const u = ease(clamp01((t - 3) / 8));
    spot.position.set(-11, 0.75, -1.2 + 5 * u);
    spot.target.position.set(2, 0.4, 0.2 + 7 * u);
    spot.intensity = I * (1 - clamp01((t - 10) / 3));
  };
  return { scene: s, camera: cam(40, [-1.35, 1.5, 3.9], [0.05, 0.55, -0.55]), far: 80, update };
}

async function p03() {
  const s = await garageSet({ beam: 0 });
  s.add(await him('sitFloor', HIM_AT_PILLAR));
  const c = car(-2.4, -7.2, 172, 0.34, true);
  s.add(c);
  const update = (k, t) => {
    const u = clamp01((t - 1) / 9);
    c.position.z = -6.4 - 14 * easeIn(u);
    c.position.x = -2.4 + 0.9 * easeIn(u);
  };
  return { scene: s, camera: cam(30, [-2.6, 0.75, 2.2], [-0.4, 0.55, -4]), far: 80, update };
}

// ── I · SIX · the kitchen ──
async function kitchen() {
  // the table runs away from us: he sits at the far end, facing the camera, his chin at the tablecloth
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.2, 0.2, 0.22);
  s.add(plane(10, 9, 0.62, [0, 0, -1]));
  s.add(plane(10, 3, 0.8, [0, 1.5, -4.2], 0));
  const lw = plane(9, 3, 0.76, [-2.6, 1.5, -1], 0);
  lw.rotation.y = Math.PI / 2;
  s.add(lw);
  const rw = plane(9, 3, 0.76, [2.8, 1.5, -1], 0);
  rw.rotation.y = -Math.PI / 2;
  s.add(rw);
  // window at the back, evening; cupboards and the fridge on the left
  s.add(emissive(1.4, 1.1, 0.05, [1.3, 1.45, -4.17], 0.75));
  s.add(boxMesh(1.55, 0.06, 0.14, 0.5, [1.3, 0.88, -4.12]));
  s.add(boxMesh(0.04, 1.1, 0.06, 0.4, [1.3, 0.9, -4.15]));
  s.add(boxMesh(1.8, 0.9, 0.6, 0.7, [-1.4, 0, -3.9]));
  s.add(boxMesh(1.8, 0.7, 0.35, 0.72, [-1.4, 1.6, -4.0]));
  s.add(boxMesh(0.7, 1.8, 0.65, 0.86, [-2.2, 0, -3.0]));
  // the table, the chairs, the salt
  const T = { z0: -2.75, z1: -0.25, y: 0.74 };
  s.add(boxMesh(1.0, 0.05, T.z1 - T.z0, 0.9, [0, T.y, (T.z0 + T.z1) / 2]));
  for (const [x, z] of [[-0.44, T.z0 + 0.06], [0.44, T.z0 + 0.06], [-0.44, T.z1 - 0.06], [0.44, T.z1 - 0.06]]) s.add(boxMesh(0.05, T.y, 0.05, 0.5, [x, 0, z]));
  const chair = (x, z, rot) => {
    const g = new THREE.Group();
    g.add(boxMesh(0.42, 0.04, 0.42, 0.45, [0, 0.44, 0]));
    g.add(boxMesh(0.42, 0.5, 0.04, 0.45, [0, 0.46, -0.2]));
    for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) g.add(boxMesh(0.03, 0.44, 0.03, 0.4, [dx, 0, dz]));
    g.position.set(x, 0, z);
    g.rotation.y = D(rot);
    g.userData.id = nextId();
    return g;
  };
  s.add(chair(-0.78, -1.15, 90), chair(0.78, -1.85, -90), chair(0, T.z0 - 0.3, 0));
  s.add(boxMesh(0.36, 0.14, 0.36, 0.55, [0, 0.46, T.z0 - 0.3]));
  const salt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.09, 12), clay(0.95));
  salt.position.set(0.08, T.y + 0.07, -1.5);
  salt.userData.id = nextId();
  s.add(salt);
  for (const [x, z] of [[-0.25, -1.15], [0.25, -1.85], [0, -2.45]]) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.02, 24), clay(0.95));
    plate.position.set(x, T.y + 0.035, z);
    plate.userData.id = nextId();
    s.add(plate);
  }
  // the lamp over the table
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.24, 24, 1, true), clay(0.3, { side: THREE.DoubleSide }));
  shade.position.set(0, 1.9, -1.5);
  shade.userData.id = nextId();
  s.add(shade);
  s.add(beam([0, 2.02, -1.5], [0, 3, -1.5], 0.012, 0.2));
  s.add(emissive(0.08, 0.08, 0.08, [0, 1.8, -1.5], 3));
  const bulb = shadowed(new THREE.PointLight(0xffe2b8, 10, 7, 1.5), 1024);
  bulb.position.set(0, 1.74, -1.5);
  s.add(bulb);
  s.add(new THREE.HemisphereLight(0xbfc8d6, 0x3a3430, 0.55));
  // father behind his paper (left), sister in her headphones (right), mother at the window on the phone
  const dad = await grey('beard', 'sitChair', { pos: [-0.78, 0.0, -1.15], rotY: 90, arms: 'newspaper', tone: 0.5 });
  s.add(dad);
  const paper = sheet(0.56, 0.4, canvasTex(256, 180, (x, w, h) => {
    x.fillStyle = '#ddd';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#555';
    for (let i = 0; i < 9; i++) x.fillRect(12, 34 + i * 16, w / 2 - 20, 6), x.fillRect(w / 2 + 8, 34 + i * 16, w / 2 - 20, 6);
    x.font = 'bold 26px serif';
    x.fillText('CRONACA', 14, 26);
  }), [0, 0, 0]);
  paper.material.side = THREE.DoubleSide;
  s.add(hold(dad, paper, 'Both', [0.04, 0.08, 0]));
  s.add(await grey('woman', 'sitChair', { pos: [0.78, 0.0, -1.85], rotY: -90, scale: 0.86, arms: 'headphones', tone: 0.68, trimHead: { r: 0.75 }, bob: 0.3, bobShape: [0.46, 0.42, -0.12, 1.1] }));
  const mum = await grey('woman', 'stand', { pos: [1.35, 0, -3.65], rotY: 160, arms: 'ear', tone: 0.6 });
  s.add(mum);
  s.add(hold(mum, phone(), 'Right'));
  s.add(await him('sitChair', { pos: [0, 0.4, T.z0 - 0.3], rotY: 0, kid: true, scale: 0.6, aim: { Head: [0, 1, 0.05], LeftArm: [0.2, -0.5, 0.8], LeftForeArm: [0, 0.05, 1] } }));
  return { scene: s, camera: cam(40, [0.05, 1.0, 2.5], [0, 0.88, -2.4]), far: 30 };
}


// ── the fridge ──
async function fridge() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.3, 0.3, 0.3);
  s.add(plane(6, 4, 0.7, [0, 0, 0]));
  s.add(plane(6, 3, 0.75, [0, 1.5, -0.4], 0));
  s.add(boxMesh(0.7, 1.8, 0.65, 0.9, [0, 0, 0]));
  s.add(boxMesh(0.7, 0.012, 0.66, 0.6, [0, 1.25, 0]));
  s.add(boxMesh(0.03, 0.5, 0.04, 0.4, [0.28, 0.95, 0.34]));
  s.add(boxMesh(1.4, 0.9, 0.6, 0.66, [1.08, 0, -0.05]));
  const drawn = (label, fn) => canvasTex(256, 330, (x, w, h) => {
    x.fillStyle = '#f2f2f0';
    x.fillRect(0, 0, w, h);
    x.strokeStyle = '#666';
    x.lineWidth = 5;
    fn(x, w, h);
    x.fillStyle = '#333';
    x.font = 'bold 34px sans-serif';
    x.fillText(label, 20, h - 24);
  });
  const sheets = [
    [drawn('BRAVA!', (x) => { x.beginPath(); x.arc(70, 70, 40, 0, 7); x.stroke(); x.strokeRect(70, 150, 120, 100); x.beginPath(); x.moveTo(60, 150); x.lineTo(130, 100); x.lineTo(200, 150); x.stroke(); }), [-0.15, 1.42, 0.33], -0.05],
    [drawn('10 e lode', (x) => { for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(30, 40 + i * 35); x.lineTo(220, 40 + i * 35); x.stroke(); } }), [0.15, 1.38, 0.33], 0.06],
    [drawn('BRAVA!', (x) => { x.beginPath(); x.ellipse(128, 120, 70, 50, 0, 0, 7); x.stroke(); }), [-0.1, 0.98, 0.33], 0.03],
  ];
  for (const [t, p, r] of sheets) {
    s.add(sheet(0.24, 0.31, t, p, [0, 0, r]));
    const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16), clay(0.25));
    mag.rotation.x = Math.PI / 2;
    mag.position.set(p[0], p[1] + 0.12, 0.345);
    mag.userData.id = nextId();
    s.add(mag);
  }
  // his drawing: a red crayon boy, no magnet, slipping off the edge of the door into the gap
  const g = new THREE.Group();
  g.add(sheet(0.24, 0.31, drawn('', () => {}), [0, 0, 0]));
  const red = (w, h, x, y, r = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.004), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    m.position.set(x, y, 0.004);
    m.rotation.z = r;
    m.userData.id = REDPROP;
    g.add(m);
  };
  red(0.07, 0.07, 0, 0.075);
  red(0.022, 0.1, 0, -0.005);
  red(0.02, 0.085, -0.03, -0.085, 0.35);
  red(0.02, 0.085, 0.03, -0.085, -0.35);
  red(0.11, 0.02, 0, 0.02);
  g.position.set(0.33, 0.78, 0.335);
  g.rotation.set(0, 0, -0.55);
  s.add(g);
  const update = (k, t) => {
    const u = clamp01((t - 2.5) / 7);
    g.position.set(0.3 + 0.06 * u, 0.98 - 1.05 * easeIn(u), 0.335);
    g.rotation.z = -0.3 - 0.55 * ease(u);
  };
  s.add(new THREE.HemisphereLight(0xffffff, 0x777066, 1.1));
  const l = shadowed(new THREE.DirectionalLight(0xffeedd, 1.6), 1024, 3);
  l.position.set(-2, 3, 3);
  s.add(l);
  return { scene: s, camera: cam(36, [0.12, 1.08, 1.85], [0.12, 1.02, 0]), far: 20, update };
}


// ── the classroom (and, twenty years later, the meeting room) ──
async function room(s, { Wd = 8, Dp = 10, Ht = 3.3, wallTone = 0.82 } = {}) {
  const L = -Wd / 2, R = Wd / 2, B = -Dp + 1.5, F = 1.5;
  s.add(plane(Wd, Dp, 0.7, [0, 0, (B + F) / 2]));
  s.add(plane(Wd, Dp, 0.86, [0, Ht, (B + F) / 2], Math.PI / 2));
  s.add(plane(Wd, Ht, wallTone, [0, Ht / 2, B], 0));
  const rw = plane(Dp, Ht, wallTone - 0.02, [R, Ht / 2, (B + F) / 2], 0);
  rw.rotation.y = -Math.PI / 2;
  s.add(rw);
  const wins = [[-6.6, -4.8], [-4.0, -2.2], [-1.4, 0.4]];
  const wallId = nextId();
  const seg = (z0, z1, y0, y1) => s.add(boxMesh(0.2, y1 - y0, z1 - z0, wallTone, [L - 0.1, y0, (z0 + z1) / 2], wallId));
  seg(B, F, 0, 0.95);
  seg(B, F, 2.75, Ht);
  let z = B;
  for (const [a, b] of wins) {
    seg(z, a, 0.95, 2.75);
    z = b;
  }
  seg(z, F, 0.95, 2.75);
  for (const [a, b] of wins) s.add(boxMesh(0.06, 1.8, 0.06, 0.6, [L - 0.05, 0.95, (a + b) / 2], wallId));
  return { L, R, B, F, Ht };
}

async function child(i, pose, opts) {
  if (i % 2) return grey('girl', pose, { ...opts, scale: 0.052 * (0.95 + (i % 3) * 0.04) });
  return grey('boy', pose, { ...opts, scale: 0.6 + (i % 3) * 0.03, hair: 0.3 + (i % 4) * 0.08 });
}

async function aula() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.9, 0.9, 0.88);
  const { B } = await room(s);
  s.add(boxMesh(4.2, 1.2, 0.06, 0.18, [0.3, 1.0, B + 0.03]));
  s.add(boxMesh(1.6, 0.78, 0.7, 0.55, [-1.6, 0, B + 1.6]));
  const rows = [-0.4, -1.9, -3.4, -4.9];
  const cols = [-2.6, -0.85, 0.9, 2.65];
  let k = 0;
  for (const rz of rows) {
    for (const cx of cols) {
      s.add(boxMesh(0.7, 0.04, 0.5, 0.62, [cx, 0.7, rz - 0.45]));
      for (const [dx, dz] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) s.add(boxMesh(0.03, 0.7, 0.03, 0.5, [cx + dx, 0, rz - 0.45 + dz]));
      s.add(boxMesh(0.36, 0.04, 0.34, 0.55, [cx, 0.4, rz + 0.12]));
      for (const [dx, dz] of [[-0.15, -0.13], [0.15, -0.13], [-0.15, 0.13], [0.15, 0.13]]) s.add(boxMesh(0.025, 0.4, 0.025, 0.5, [cx + dx, 0, rz + 0.12 + dz]));
      if (rz === -0.4 && cx === 0.9) continue;
      s.add(await child(k++, 'sitChair', { pos: [cx, 0.03, rz + 0.12], rotY: 180, tone: 0.62 + (k % 3) * 0.07 }));
    }
  }
  s.add(await grey('woman', 'stand', { pos: [0.6, 0, B + 0.75], rotY: 180, aim: { RightArm: [-0.3, 0.7, 0.6], RightForeArm: [-0.1, 0.9, 0.4] }, tone: 0.55 }));
  s.add(await him('sitChair', { pos: [0.9, 0.03, -0.28], rotY: 180, kid: true, scale: 0.64, aim: ARMS.raise }));
  s.add(new THREE.HemisphereLight(0xf6f2ea, 0x9a9288, 1.7));
  const sun = shadowed(new THREE.DirectionalLight(0xfff1d6, 3.2), 2048, 9);
  sun.position.set(-9, 6.5, -1.5);
  sun.target.position.set(1, 0, -2.5);
  s.add(sun, sun.target);
  return { scene: s, camera: cam(54, [-0.2, 0.98, 1.6], [0.5, 0.95, -6]), far: 40 };
}

async function riunione() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.9, 0.9, 0.9);
  const { B } = await room(s, { wallTone: 0.86 });
  s.add(boxMesh(3.6, 1.3, 0.04, 0.95, [0.3, 0.9, B + 0.03]));
  s.add(boxMesh(1.5, 0.05, 6.2, 0.55, [0.4, 0.74, -3.6]));
  s.add(boxMesh(0.12, 0.74, 5.6, 0.45, [0.4, 0, -3.6]));
  const kinds = ['man', 'woman', 'grown', 'beard', 'woman', 'man', 'grown', 'woman'];
  let k = 0;
  for (const z of [-1.4, -2.9, -4.4, -5.9]) {
    for (const side of [-1, 1]) {
      if (z === -1.4 && side === 1) continue; // his place, the end of the table
      s.add(boxMesh(0.48, 0.45, 0.48, 0.35, [0.4 + side * 1.05, 0, z]));
      s.add(await grey(kinds[k++ % kinds.length], 'sitChair', { pos: [0.4 + side * 1.05, 0.03, z], rotY: side > 0 ? -90 : 90, tone: 0.55 + (k % 3) * 0.07 }));
    }
  }
  s.add(await grey('man', 'stand', { pos: [1.4, 0, B + 1.1], rotY: 0, aim: ARMS.point, tone: 0.5 }));
  s.add(boxMesh(0.48, 0.45, 0.48, 0.35, [1.45, 0, -1.4]));
  s.add(await him('sitChair', { pos: [1.45, 0.03, -1.4], rotY: -90 }));
  s.add(new THREE.HemisphereLight(0xeef3f0, 0x8a908c, 1.8));
  for (const z of [-2, -5]) {
    s.add(emissive(1.4, 0.04, 0.3, [0.4, 3.26, z], 2));
    const l = new THREE.PointLight(0xeef6ee, 6, 8, 1.4);
    l.position.set(0.4, 3.0, z);
    s.add(l);
  }
  const sun = shadowed(new THREE.DirectionalLight(0xf2f4f0, 1.6), 2048, 9);
  sun.position.set(-9, 6.5, -1.5);
  sun.target.position.set(1, 0, -2.5);
  s.add(sun, sun.target);
  return { scene: s, camera: cam(54, [-0.2, 1.4, 1.6], [0.5, 1.15, -6]), far: 40 };
}

// ── the playground, the wall ──
async function cortile() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.86, 0.86, 0.84);
  s.add(plane(80, 80, 0.62, [0, 0, -10]));
  const line = plane(30, 0.14, 0.98, [0, 0.003, 0]);
  s.add(line);
  s.add(boxMesh(40, 7, 1, 0.75, [0, 0, -26]));
  for (let i = 0; i < 9; i++) s.add(boxMesh(2, 1.6, 0.1, 0.35, [-16 + i * 4, 3.5, -25.45]));
  // the goal at the far end, the others running towards it
  s.add(boxMesh(0.1, 2, 0.1, 0.9, [-1.8, 0, -18]));
  s.add(boxMesh(0.1, 2, 0.1, 0.9, [1.8, 0, -18]));
  s.add(boxMesh(3.7, 0.1, 0.1, 0.9, [0, 2, -18]));
  const runners = [[-2.5, -6, 0.1], [-1, -7.5, 0.35], [0.6, -5.5, 0.6], [2, -8, 0.2], [-3.4, -9, 0.5], [1.2, -10, 0.8], [3.2, -6.8, 0.45], [-0.2, -9.6, 0.15]];
  let k = 0;
  const kids = [];
  for (const [x, z, t] of runners) {
    const girl = k++ % 2;
    const o = girl ? await grey('girl', 'hvwalk', { pos: [x, 0, z], rotY: 180 + (x * -3), t: t * 1.2 }) : await grey('boy', 'run', { pos: [x, 0, z], rotY: 180 + x * -3, t });
    kids.push({ o, x, z0: -0.4 - (k % 4) * 0.7, t0: t, v: girl ? 1.6 : 3.0, delay: 0.4 + (k % 3) * 0.35 });
    s.add(o);
  }
  const me = await him('idle', { pos: [-2.6, 0, 0.1], rotY: 160, kid: true, scale: 0.6, shadow: true });
  s.add(me);
  const update = (kk, t) => {
    for (const c of kids) {
      const run = Math.max(0, t - c.delay);
      c.o.position.z = Math.max(-17.5, c.z0 - c.v * run);
      c.o.position.x = c.x * (0.4 + 0.6 * clamp01(run / 3)) - 0.6;
      c.o.mixer?.setTime(c.t0 + t);
    }
    me.mixer?.setTime(t * 0.8);
  };
  s.add(new THREE.HemisphereLight(0xf2f0ea, 0x8a8478, 1.5));
  const sun = shadowed(new THREE.DirectionalLight(0xfff1d6, 2.6), 4096, 25);
  sun.position.set(14, 18, 10);
  s.add(sun);
  return { scene: s, camera: cam(40, [-0.6, 2.6, 7.0], [-0.9, 0.2, -8]), far: 120, update };
}

async function muro() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.86, 0.86, 0.84);
  s.add(plane(40, 40, 0.62, [0, 0, 0]));
  s.add(boxMesh(20, 4, 0.5, 0.82, [0, 0, -3]));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), clay(0.6));
  ball.position.set(0.3, 1.6, -1.6);
  ball.castShadow = true;
  ball.userData.id = nextId();
  s.add(ball);
  const me = await him('stand', { pos: [-0.2, 0, 0], rotY: 170, kid: true, scale: 0.6, shadow: true, aim: ARMS.throw });
  s.add(me);
  const REST = { RightArm: [-0.2, -1, 0.15], RightForeArm: [-0.1, -0.7, 0.6], LeftArm: [0.2, -1, 0.15], LeftForeArm: [0.1, -0.7, 0.6] };
  const CATCH = { RightArm: [-0.15, -0.25, 1], RightForeArm: [-0.05, 0.15, 1], LeftArm: [0.15, -0.25, 1], LeftForeArm: [0.05, 0.15, 1] };
  const H = [-0.12, 1.12, -0.32], Wl = [0.12, 1.45, -2.64], G = [0.2, 0.11, -1.25];
  const update = (k, t) => {
    const p = (t % 1.6) / 1.6;
    const pos = p < 0.32 ? arc(H, Wl, p / 0.32, 0.25) : p < 0.62 ? arc(Wl, G, (p - 0.32) / 0.3, 0.1) : arc(G, H, (p - 0.62) / 0.38, 0.45);
    ball.position.set(...pos);
    const a = p < 0.14 ? mixAims(ARMS.throw, REST, p / 0.14) : p < 0.78 ? REST : mixAims(REST, CATCH, (p - 0.78) / 0.22);
    me.aimAll(a);
  };
  s.add(new THREE.HemisphereLight(0xf2f0ea, 0x8a8478, 1.2));
  const sun = shadowed(new THREE.DirectionalLight(0xffe9c8, 3.4), 2048, 6);
  sun.position.set(-4, 2.2, 6);
  sun.target.position.set(0, 0.8, -3);
  s.add(sun, sun.target);
  return { scene: s, camera: cam(40, [2.3, 1.0, 3.6], [-0.4, 1.0, -2.6]), far: 60, update };
}

// ── his room at night ──
async function cameretta() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.02, 0.025, 0.04);
  s.add(plane(7, 7, 0.4, [0, 0, 0.5]));
  s.add(plane(7, 7, 0.35, [0, 2.7, 0.5], Math.PI / 2));
  const wallId = nextId();
  const seg = (x, y, w, h) => s.add(boxMesh(w, h, 0.2, 0.42, [x, y, -2], wallId));
  seg(-2.45, 0, 3.3, 2.7);
  seg(2.45, 0, 3.3, 2.7);
  seg(0, 0, 1.6, 0.9);
  seg(0, 2.25, 1.6, 0.45);
  s.add(boxMesh(0.05, 1.35, 0.06, 0.3, [0, 0.9, -1.95], wallId));
  s.add(boxMesh(1.6, 0.05, 0.3, 0.45, [0, 0.88, -1.85], wallId));
  for (const x of [-3.2, 3.2]) {
    const w = plane(5, 2.7, 0.4, [x, 1.35, 0.5], 0);
    w.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    s.add(w);
  }
  // the bed, the blanket thrown back, a lamp-less night table
  s.add(boxMesh(1.0, 0.42, 2.0, 0.5, [-2.4, 0, -0.6]));
  s.add(boxMesh(0.95, 0.12, 1.2, 0.62, [-2.4, 0.42, -0.25]));
  s.add(boxMesh(0.8, 0.12, 0.4, 0.75, [-2.4, 0.42, -1.35]));
  s.add(boxMesh(0.45, 0.5, 0.4, 0.45, [-1.6, 0, -1.6]));
  buildings(s, -60, 16, 7, 0.22);
  s.add(await him('stand', { pos: [0.05, 0, -1.6], rotY: 180, kid: true, scale: 0.6, shadow: true, aim: { RightArm: [-0.2, 0.25, 1], RightForeArm: [-0.05, 0.7, 1], Head: [0, 1, 0.15] } }));
  s.add(new THREE.HemisphereLight(0x8090b0, 0x101010, 0.25));
  const moon = shadowed(new THREE.DirectionalLight(0xb8c6e8, 2.2), 2048, 6);
  moon.position.set(-3, 9, -14);
  moon.target.position.set(0.3, 0, 0.5);
  s.add(moon, moon.target);
  return { scene: s, camera: cam(46, [1.0, 1.15, 2.6], [-0.15, 1.0, -3]), far: 200 };
}


// ── II · FIFTEEN ──
async function corridoio({ anim = false } = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.85, 0.87, 0.9);
  s.add(plane(4, 40, 0.68, [0, 0, -15]));
  s.add(plane(4, 40, 0.84, [0, 3, -15], Math.PI / 2));
  for (const side of [-1, 1]) {
    const wl = plane(40, 3, 0.8, [side * 2, 1.5, -15], 0);
    wl.rotation.y = -side * Math.PI / 2;
    s.add(wl);
    for (let i = 0; i < 26; i++) s.add(boxMesh(0.4, 1.9, 0.5, 0.6 + (i % 2) * 0.06, [side * 1.73, 0, 2 - i * 0.6]));
  }
  for (let i = 0; i < 7; i++) s.add(emissive(0.6, 0.04, 1.2, [0, 2.97, -i * 5], 2.2));
  const kinds = ['teen', 'teengirl', 'teen', 'teengirl', 'teen', 'teen', 'teengirl', 'teen', 'teengirl', 'teen', 'teen', 'teengirl'];
  const crowd = [];
  for (let i = 0; i < kinds.length; i++) {
    const z = -2.5 - i * 1.6 - (i % 3) * 0.4;
    const x = anim ? ((i * 0.37) % 1.5) - 1.15 : ((i * 0.37) % 1.6) - 0.8; // in the animatic they leave him a lane by the lockers
    const clip = kinds[i] === 'teengirl' ? 'hvwalk' : 'walk';
    const o = await grey(kinds[i], clip, { pos: [x, 0, z], rotY: 0, t: (i * 0.23) % 1, tone: 0.55 + (i % 3) * 0.08 });
    crowd.push({ o, z, t0: (i * 0.23) % 1 });
    s.add(o);
  }
  const me = await him('walk', { pos: [0.55, 0, -6.2], rotY: 180, scale: 0.94, t: 0.4 });
  s.add(me);
  const update = (k, t) => {
    for (const c of crowd) {
      let z = c.z + 1.2 * t;
      while (z > 0.6) z -= 22; // they leave the frame before they reach the lens
      c.o.position.z = z;
      c.o.mixer?.setTime(c.t0 + t);
    }
    me.position.z = -2.6 - 0.36 * t;
    me.position.x = 1.0 + 0.08 * Math.sin(t * 0.7);
    me.mixer?.setTime(0.4 + t * 0.45);
  };
  s.add(new THREE.HemisphereLight(0xeef2f8, 0x8a8e96, 1.8));
  for (let i = 0; i < 4; i++) {
    const l = new THREE.PointLight(0xf4f8ff, 5, 9, 1.4);
    l.position.set(0, 2.7, -i * 7);
    s.add(l);
  }
  return { scene: s, camera: cam(42, [0.2, 1.55, 3.2], [0, 1.2, -20]), far: 60, update };
}

async function foto() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.78, 0.78, 0.8);
  s.add(plane(20, 20, 0.6, [0, 0, 0]));
  s.add(plane(20, 6, 0.75, [0, 3, -3], 0));
  s.add(boxMesh(6.5, 0.45, 0.5, 0.45, [0, 0, -0.2]));
  s.add(boxMesh(7, 0.3, 0.9, 0.5, [0, 0, -1.9]));
  const kinds = ['teen', 'teengirl'];
  let k = 0;
  for (let i = 0; i < 7; i++) s.add(await grey(kinds[k++ % 2], 'sitChair', { pos: [-2.7 + i * 0.9, 0.0, -0.2], rotY: 0, tone: 0.6 + (k % 3) * 0.06 }));
  for (let i = 0; i < 8; i++) s.add(await grey(kinds[k++ % 2], 'stand', { pos: [-3.1 + i * 0.88, 0, -1.0], rotY: 0, tone: 0.6 + (k % 3) * 0.06 }));
  for (let i = 0; i < 8; i++) s.add(await grey(kinds[k++ % 2], 'stand', { pos: [-3.0 + i * 0.86, 0.3, -1.9], rotY: 0, tone: 0.6 + (k % 3) * 0.06 }));
  s.add(await him('stand', { pos: [3.75, 0.3, -1.9], rotY: -8, scale: 0.94 }));
  s.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.6));
  const flash = shadowed(new THREE.DirectionalLight(0xffffff, 2.2), 2048, 8);
  flash.position.set(0, 3, 10);
  s.add(flash);
  // framed like the print it becomes: the right edge of the photo will cut through him
  return { scene: s, camera: cam(24, [1.2, 1.3, 5.6], [1.2, 1.0, -1]), far: 40 };
}

async function fermata() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.74, 0.76, 0.8);
  s.fog = new THREE.Fog(0xbcc2ca, 15, 90);
  s.add(plane(80, 80, 0.5, [0, -0.15, -20]));
  s.add(boxMesh(80, 0.15, 4, 0.66, [0, -0.15, 1]));
  // the shelter
  for (const x of [-1.2, 1.4]) s.add(boxMesh(0.08, 2.4, 0.08, 0.35, [x, 0, 1.8]));
  s.add(boxMesh(3, 0.08, 1.6, 0.4, [0.1, 2.4, 1.2]));
  s.add(boxMesh(2.4, 0.05, 0.4, 0.4, [0.1, 0.45, 1.75]));
  s.add(boxMesh(0.06, 2.6, 0.06, 0.3, [2.4, 0, -0.6]));
  s.add(boxMesh(0.5, 0.5, 0.04, 0.85, [2.4, 2.3, -0.6]));
  buildings(s, -30, 14, 3, 0.05);
  // the girl with her umbrella; him, three metres off, rehearsing
  s.add(await grey('teengirl', 'stand', { pos: [0.4, 0, 0.7], rotY: 200, aim: { RightArm: [-0.25, -0.2, 0.6], RightForeArm: [-0.1, 1, 0.3] } }));
  const umb = new THREE.Group();
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.28, 16, 1, true), clay(0.32, { side: THREE.DoubleSide }));
  canopy.position.y = 1.95;
  umb.add(canopy);
  umb.add(boxMesh(0.02, 0.8, 0.02, 0.2, [0, 1.15, 0]));
  umb.position.set(0.32, 0, 0.8);
  umb.userData.id = nextId();
  s.add(umb);
  s.add(await him('stand', { pos: [-2.6, 0, 0.6], rotY: 150, scale: 0.94 }));
  s.add(new THREE.HemisphereLight(0xd8dde6, 0x5a5e66, 1.6));
  const sky = shadowed(new THREE.DirectionalLight(0xe8eef6, 0.8), 2048, 10);
  sky.position.set(-3, 10, 6);
  s.add(sky);
  return { scene: s, camera: cam(40, [-0.6, 1.5, 7.2], [-0.8, 1.1, 0]), far: 120 };
}

async function bus() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.74, 0.76, 0.8);
  s.fog = new THREE.Fog(0xbcc2ca, 15, 90);
  s.add(plane(80, 80, 0.5, [0, -0.15, -20]));
  s.add(boxMesh(80, 0.15, 4, 0.66, [0, -0.15, 1.6]));
  // the shelter she was under, empty now; the 7 pulling away
  for (const x of [-1.2, 1.4]) s.add(boxMesh(0.08, 2.4, 0.08, 0.35, [x, 0, 2.6]));
  s.add(boxMesh(3, 0.08, 1.4, 0.4, [0.1, 2.4, 2.1]));
  const b = busBody();
  b.position.set(6.5, 0, -1.5);
  b.rotation.y = D(-4);
  b.userData.id = nextId();
  s.add(b);
  const update = (k, t) => {
    const u = clamp01((t - 1.5) / 7.5);
    b.position.x = 2.4 + 30 * easeIn(u);
  };
  s.add(await him('stand', { pos: [-0.6, 0, 1.6], rotY: 100, scale: 0.94 }));
  buildings(s, -30, 14, 5, 0.05);
  s.add(new THREE.HemisphereLight(0xd8dde6, 0x5a5e66, 1.6));
  const sky = shadowed(new THREE.DirectionalLight(0xe8eef6, 0.8), 2048, 12);
  sky.position.set(-3, 10, 6);
  s.add(sky);
  return { scene: s, camera: cam(40, [-5.8, 1.5, 7.4], [1.5, 1.2, -1]), far: 120, update };
}


async function festa() {
  // he leans on the wall in the dark; the light only finds the ones who are dancing
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.02, 0.02, 0.03);
  s.add(plane(14, 12, 0.35, [0, 0, -3]));
  s.add(plane(14, 12, 0.2, [0, 3.2, -3], Math.PI / 2));
  s.add(plane(14, 3.2, 0.4, [0, 1.6, -7], 0));
  const lw = plane(12, 3.2, 0.42, [-5, 1.6, -3], 0);
  lw.rotation.y = Math.PI / 2;
  s.add(lw);
  const dancers = [
    ['woman', 'samba', 0.2, [-1.2, -3.0]], ['teengirl', 'hvwalk', 0.5, [0.6, -4.4]], ['teen', 'dance', 0, [-2.4, -4.6]],
    ['woman', 'samba', 1.4, [1.4, -2.2]], ['teen', 'dance2', 0, [-0.3, -5.6]], ['teengirl', 'hvwalk', 0.1, [2.5, -4.0]],
    ['teen', 'dance', 0, [0.2, -1.4]], ['woman', 'samba', 2.3, [-2.6, -2.0]], ['teen', 'dance2', 0, [1.9, -5.8]],
  ];
  let k = 0;
  const moving = [];
  for (const [kind, pose, t, [x, z]] of dancers) {
    const opts = { pos: [x, 0, z], rotY: 40 + k++ * 67, t, tone: 0.62 };
    if (pose === 'dance' || pose === 'dance2') Object.assign(opts, { arms: pose });
    const o = await grey(kind, pose.startsWith('dance') ? 'stand' : pose, opts);
    moving.push({ o, t0: t, pose, ph: k * 0.7, r0: o.rotation.y });
    s.add(o);
  }
  const update = (kk, t) => {
    for (const m of moving) {
      if (m.o.mixer) m.o.mixer.setTime(m.t0 + t);
      else {
        const u = 0.5 + 0.5 * Math.sin((t / 0.55) * Math.PI + m.ph);
        m.o.aimAll(mixAims(ARMS.dance, mirror(ARMS.dance2), u));
      }
      m.o.rotation.y = m.r0 + 0.25 * Math.sin(t * 1.3 + m.ph);
    }
  };
  s.add(await him('lean', { pos: [-4.62, 0, -1.4], rotY: 90, scale: 0.94 }));
  s.add(new THREE.HemisphereLight(0x404050, 0x101010, 0.22));
  for (const [c, x, z] of [[0xffd2e8, -1.4, -2.6], [0xd2e8ff, 1.6, -4.6], [0xfff0c0, 0.2, -1.6], [0xe0ffe0, -1.0, -5.2]]) {
    const l = shadowed(new THREE.SpotLight(c, 110, 14, D(26), 0.6, 1.2), 1024);
    l.position.set(x, 3.1, z + 0.6);
    l.target.position.set(x, 0, z);
    s.add(l, l.target);
  }
  return { scene: s, camera: cam(42, [1.8, 1.55, 1.6], [-3.2, 1.05, -3.6]), far: 40, update };
}


async function tetto() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.02, 0.025, 0.045);
  s.add(boxMesh(12, 0.3, 10, 0.42, [0, -0.3, 0]));
  s.add(boxMesh(12, 0.6, 0.2, 0.4, [0, 0, -5]));
  s.add(boxMesh(0.9, 1.4, 0.9, 0.45, [1.4, 0, -1.2]));
  buildings(s, -40, 18, 11, 0.28);
  for (let i = 0; i < 60; i++) {
    const st = emissive(0.25, 0.25, 0.25, [-120 + ((i * 37) % 240), 30 + ((i * 53) % 60), -180], 1.4);
    s.add(st);
  }
  s.add(await him('sitFloor', { pos: [0.75, 0, -1.25], rotY: -100, scale: 0.94 }));
  s.add(new THREE.HemisphereLight(0x6070a0, 0x101010, 0.35));
  const moon = shadowed(new THREE.DirectionalLight(0xb8c6e8, 1.0), 2048, 8);
  moon.position.set(-6, 10, 4);
  s.add(moon);
  return { scene: s, camera: cam(42, [-3.4, 1.6, 2.6], [1.0, 0.2, -6]), far: 300 };
}

// ── III · THIRTY ──
async function metro() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.1, 0.1, 0.12);
  s.add(plane(3, 24, 0.55, [0, 0, -8]));
  s.add(plane(3, 24, 0.8, [0, 2.3, -8], Math.PI / 2));
  for (const side of [-1, 1]) {
    const wl = plane(24, 2.3, 0.7, [side * 1.5, 1.15, -8], 0);
    wl.rotation.y = -side * Math.PI / 2;
    s.add(wl);
    for (let i = 0; i < 5; i++) s.add(emissive(0.03, 0.7, 1.4, [side * 1.48, 1.45, -1 - i * 4], 0.5));
    s.add(boxMesh(0.45, 0.45, 20, 0.5, [side * 1.27, 0, -8]));
    s.add(boxMesh(0.03, 0.03, 22, 0.8, [side * 0.55, 2.0, -8]));
  }
  for (let i = 0; i < 5; i++) s.add(boxMesh(0.04, 2.3, 0.04, 0.85, [0, 0, -2 - i * 4]));
  for (let i = 0; i < 6; i++) s.add(emissive(0.2, 0.03, 3.4, [0, 2.29, -i * 4], 2));
  // every face lit by its own small screen
  const people = [['man', -0.6, -2.2, 90], ['woman', 0.6, -3.6, -100], ['grown', -0.4, -5, 70], ['beard', 0.55, -6.4, -80], ['woman', -0.5, -8, 95], ['man', 0.5, -9.5, -90], ['grown', 0.2, -11, 180]];
  for (const [k, x, z, r] of people) {
    const o = await grey(k, 'stand', { pos: [x, 0, z], rotY: r, arms: 'phone', tone: 0.55 });
    s.add(o, hold(o, phone(), 'Both', [0, 0.03, 0]));
  }
  for (const [k, z] of [['woman', -4], ['man', -7.5]]) {
    const o = await grey(k, 'sitChair', { pos: [-1.1, 0.03, z], rotY: 90, arms: 'phone', tone: 0.55 });
    s.add(o, hold(o, phone(), 'Both', [0, 0.03, 0]));
  }
  s.add(await him('stand', { pos: [0.35, 0, -0.6], rotY: 160, aim: ARMS.bar }));
  s.add(new THREE.HemisphereLight(0xeef2ee, 0x606460, 1.3));
  for (let i = 0; i < 4; i++) {
    const l = new THREE.PointLight(0xf0f6f0, 5, 7, 1.4);
    l.position.set(0, 2.1, -1 - i * 4);
    s.add(l);
  }
  return { scene: s, camera: cam(48, [1.0, 1.62, 2.5], [-0.2, 1.25, -12]), far: 40 };
}


// ── the car park again: what he sees ──
/** The woman, seated at the wheel, as a child of her car (car-local coordinates). */
async function womanAtWheel() {
  const g = new THREE.Group();
  // the courtesy light left on: the only light in her car
  const dome = new THREE.PointLight(0xffe6c0, 2.2, 2.6, 1.4);
  dome.position.set(0.05, 1.3, -0.25);
  g.add(dome);
  g.add(await grey('woman', 'sitChair', {
    pos: [0.4, 0.4, -0.14], rotY: 0, tone: 0.6,
    aim: { Spine: [0, 1, 0.2], Spine1: [0, 1, 0.25], Neck: [0, 0.5, 1], Head: [0, -0.35, 1], LeftArm: [0.2, -0.45, 1], LeftForeArm: [-0.15, 0.3, 1], RightArm: [-0.2, -0.45, 1], RightForeArm: [0.15, 0.3, 1] },
  }));
  return g;
}

/** A pool of warm light over each of the ones he watches. */
function islands(s, which) {
  const at = { car: [WOMAN_CAR.x, WOMAN_CAR.z, 70], guard: [...GUARD, 100], boy: [...BOY, 80] };
  for (const k of which) {
    const [x, z, power] = at[k];
    const pool = shadowed(new THREE.SpotLight(0xfff0d0, power, 12, D(25), 0.75, 1.3), 1024);
    pool.position.set(x + 0.3, 4.0, z + 0.2);
    pool.target.position.set(x, 0, z);
    s.add(pool, pool.target);
    s.add(emissive(0.9, 0.05, 0.14, [x + 0.3, 4.05, z + 0.2], 2.2));
  }
}

async function p19() {
  const s = await garageSet({ beam: 0 });
  s.add(await him('sitFloor', { ...HIM_AT_PILLAR, aim: { Head: [0.3, 1, 0.5] } }));
  return { scene: s, camera: cam(34, [-2.8, 1.0, 1.6], [0.3, 0.6, -0.6]), far: 80 };
}

async function p20() {
  // through her side window, framed by the pillars: hands on the wheel, head down, the engine off
  const s = await garageSet({ beam: 0, ambient: 0.3, lamp: 0 });
  const c = car(WOMAN_CAR.x, WOMAN_CAR.z, WOMAN_CAR.rotY, 0.42);
  c.add(await womanAtWheel());
  s.add(c);
  islands(s, ['car']);
  c.updateMatrixWorld(true);
  const f = c.localToWorld(new THREE.Vector3(2.9, 1.45, 2.6));
  const t = c.localToWorld(new THREE.Vector3(0.1, 0.9, -0.2));
  return { scene: s, camera: cam(30, f.toArray(), t.toArray()), far: 80 };
}


async function p21() {
  const s = await garageSet({ beam: 0, ambient: 0.25, lamp: 0 });
  const g = await grey('oldman', 'stand', { pos: [GUARD[0], -0.12, GUARD[1]], rotY: 150, arms: 'dance', tone: 0.5 });
  s.add(g);
  islands(s, ['guard']);
  const update = (k, t) => {
    const w = (t / 1.8) * Math.PI * 2; // one bar of his song, looped
    g.aimAll(mixAims(ARMS.dance, mirror(ARMS.dance), 0.5 + 0.5 * Math.sin(w)));
    g.rotation.y = D(150) + 0.4 * Math.sin(w);
  };
  return { scene: s, camera: cam(30, [0.9, 1.2, -6.4], [GUARD[0], 0.85, GUARD[1]]), far: 80, update };
}


async function p22() {
  const s = await garageSet({ beam: 0, ambient: 0.25, lamp: 0 });
  s.add(await grey('boy', 'stand', { pos: [BOY[0], -0.12, BOY[1]], rotY: 200, arms: 'point', tone: 0.62, aim: { RightArm: [-0.35, 0.25, 1], RightForeArm: [-0.25, 0.3, 1], Head: [-0.2, 1, 0.4] } }));
  islands(s, ['boy']);
  return { scene: s, camera: cam(34, [-6.0, 0.8, -1.0], [-9.2, 0.7, -12]), far: 80 };
}


async function p23() {
  // the whole car park: three islands of light, three people who don't know about each other, and him
  const s = await garageSet({ beam: 0, ambient: 0.18, lamp: 3 });
  const c = car(WOMAN_CAR.x, WOMAN_CAR.z, WOMAN_CAR.rotY, 0.42);
  c.add(await womanAtWheel());
  s.add(c);
  s.add(await grey('oldman', 'stand', { pos: [GUARD[0], -0.12, GUARD[1]], rotY: 150, arms: 'dance', tone: 0.5 }));
  s.add(await grey('boy', 'stand', { pos: [BOY[0], -0.12, BOY[1]], rotY: 200, arms: 'point', tone: 0.62, aim: { RightArm: [-0.35, 0.25, 1], RightForeArm: [-0.25, 0.3, 1] } }));
  islands(s, ['car', 'guard', 'boy']);
  s.add(await him('sitFloor', { ...HIM_AT_PILLAR, aim: { Head: [0.15, 1, 0.5] } }));
  return { scene: s, camera: cam(48, [1.0, 2.1, 5.2], [-3.4, 0.5, -7]), far: 80 };
}


// ── EPILOGUE · the breakwater at dawn ──
let _waves = null;
function waves() {
  if (_waves) return _waves;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const img = x.createImageData(256, 256);
  for (let j = 0; j < 256; j++) {
    for (let i = 0; i < 256; i++) {
      const v = Math.sin((j / 256) * Math.PI * 2 * 6 + Math.sin((i / 256) * Math.PI * 2 * 2) * 1.2) * 0.8 + Math.sin((j / 256) * Math.PI * 2 * 17 + i * 0.05) * 0.2;
      const k = (j * 256 + i) * 4;
      img.data[k] = 128;
      img.data[k + 1] = 128 + v * 110;
      img.data[k + 2] = 230;
      img.data[k + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  _waves = new THREE.CanvasTexture(c);
  _waves.wrapS = _waves.wrapT = THREE.RepeatWrapping;
  _waves.repeat.set(300, 300);
  return _waves;
}

async function seaSet({ sun = 0.5, sunX = -62 } = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0.8, 0.8, 0.82);
  s.fog = new THREE.Fog(0xcfd0d4, 30, 420);
  const sea = plane(2000, 2000, 0.5, [0, -0.4, -900]);
  sea.material.normalMap = waves();
  sea.material.normalScale = new THREE.Vector2(0.9, 0.9);
  s.add(sea);
  s.add(boxMesh(3.2, 1.1, 22, 0.62, [-0.8, -1.1, -9]));
  for (let i = 0; i < 16; i++) {
    const r = 0.6 + ((i * 37) % 10) / 14;
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), clay(0.38 + (i % 3) * 0.06));
    b.scale.set(1.2, 0.7, 1);
    b.position.set(1.15 + (i % 2) * 0.6 + Math.sin(i * 2.1) * 0.2, -0.75, 1.5 - i * 1.4);
    b.rotation.set(i * 0.7, i * 1.3, i * 0.4);
    b.castShadow = b.receiveShadow = true;
    b.userData.id = nextId();
    s.add(b);
  }
  if (sun !== null) {
    const sunM = new THREE.Mesh(new THREE.SphereGeometry(20, 48, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
    sunM.position.set(sunX, -0.4 + (sun - 0.5) * 18, -400);
    sunM.userData.id = REDPROP;
    s.add(sunM);
    s.userData.sun = sunM;
  }
  s.add(new THREE.HemisphereLight(0xe8e6ee, 0x55585e, 1.3));
  const low = shadowed(new THREE.DirectionalLight(0xffe7d6, 1.6), 2048, 60);
  low.position.set(-20, 6, -200);
  low.target.position.set(0, 0, -30);
  s.add(low, low.target);
  return s;
}

async function p24() {
  const s = await seaSet({ sun: null });
  const me = await him('walk', { pos: [-0.7, 0, -7], rotY: 180, t: 0.5 });
  s.add(me);
  const update = (k, t) => {
    me.position.z = -2.5 - 0.6 * t;
    me.mixer?.setTime(0.5 + t * 0.62);
  };
  return { scene: s, camera: cam(40, [0.9, 1.6, 2.5], [-0.8, 0.9, -20]), far: 500, update };
}

async function alba() {
  const s = await seaSet({ sun: 0.5 });
  s.add(await him('sitFloor', { pos: [-0.9, 0, -18.6], rotY: 186 }));
  const sun = s.userData.sun;
  const update = (k) => {
    sun.position.y = -0.4 + (-0.42 + 0.97 * ease(k) - 0.5) * 18; // from a sliver on the sea to more than half
  };
  return { scene: s, camera: cam(36, [1.4, 1.35, -3.5], [-2.4, 0.2, -60]), far: 500, update };
}

async function p26() {
  const s = await seaSet({ sun: 0.62, sunX: -120 });
  s.add(await him('sitFloor', { pos: [-0.9, 0, -18.6], rotY: 186 }));
  return { scene: s, camera: cam(30, [-0.15, 0.95, -17.2], [-2.2, 0.85, -60]), far: 500 };
}

async function p27() {
  const s = await seaSet({ sun: 0.7, sunX: 30 });
  s.add(await him('sitFloor', { pos: [-0.9, 0, -18.6], rotY: 186 }));
  return { scene: s, camera: cam(50, [6, 3.2, 14], [-1, 0.4, -40]), far: 500 };
}

export const PANELS = {
  posetest,
  '01': p01, '02': p02, '03': p03,
  '05': kitchen, '06': fridge, '07': aula, '08': cortile, '09': muro, '10': cameretta,
  '11': corridoio, '12': foto, '13': fermata, '14': bus, '15': festa, '16': tetto,
  '17': metro, '18': riunione, '19': p19, '20': p20, '21': p21, '22': p22, '23': p23,
  '24': p24, '25': alba, '26': p26, '27': p27,
  parcheggio: p02, aula, alba,
};
