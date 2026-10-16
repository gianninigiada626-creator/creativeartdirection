// The scenes of MAGENTA, on the stage of A PARTE. Metres; people face +z unless turned (rotY, degrees).
// A scene may return `screens` (planes where a painted frame of the 1962 film is laid in after painting)
// and `figure` (Ada, and how much of her has turned magenta).
import { THREE, boxMesh, plane, clay, nextId, D, cam, shadowed, grey, canvasTex, sheet, emissive, beam, shaft, sky, waves } from './kit.js';

// ── people ───────────────────────────────────────────────────────────────────────────────────────
/** The turn (degrees) that faces someone at `from` toward `to`. */
function facing(from, to) {
  return (Math.atan2(to[0] - from[0], to[2] - from[2]) * 180) / Math.PI;
}
/** The direction from someone at `from`, turned rotY degrees, to `to`, in their own frame (+z ahead, +x their left). */
function toward(from, rotY, to) {
  const d = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]).normalize();
  d.applyAxisAngle(new THREE.Vector3(0, 1, 0), -D(rotY));
  return [d.x, d.y, d.z];
}

const ELIO = { skin: '#d6ac8c', hair: '#8f8a86', top: '#33373f', bottom: '#2a2a2e', shoes: '#1c1a19', sleeves: 'long' };
const ADA_OLD = { skin: '#e3bc9c', top: '#7e8ba0', bottom: '#5f5a50', shoes: '#3a3530', sleeves: 'long' };
const ADA_GIRL = { skin: '#dcae86', top: '#1f7d55', bottom: '#1f7d55', shoes: '#2a2018', sleeves: 'short' };

async function elio(pose, opts = {}) {
  const o = await grey('beard', pose, { seed: 3, hide: ['Wolf3D_Headwear', 'Wolf3D_Hair'], ...opts, wear: { ...ELIO, ...(opts.wear ?? {}) } });
  if (opts.gloves) gloves(o);
  return o;
}
/** Ada at eighty-two: white hair in a soft bob, a cardigan, a little bent. */
async function adaOld(pose, opts = {}) {
  return grey('woman', pose, { bob: '#d6d0c6', bobShape: [0.56, 0.46, -0.12, 1.08], seed: 5, ...opts, wear: { ...ADA_OLD, hair: '#d8d2c8', ...(opts.wear ?? {}) },
    aim: { Spine2: [0, 1, 0.1], Neck: [0, 1, 0.16], ...(opts.aim ?? {}) } });
}
/** Ada at nineteen, in the pale dress that was green. */
async function adaGirl(pose, opts = {}) {
  const o = await grey('woman', pose, { bob: '#231812', bobShape: [0.49, 0.47, -0.1, 1.1], scale: 0.97, seed: 8, ...opts, wear: { ...ADA_GIRL, hair: '#231812', ...(opts.wear ?? {}) } });
  skirt(o, (opts.wear ?? {}).bottom ?? ADA_GIRL.bottom);
  return o;
}
/** A skirt hung from the hips, full, to below the knee. */
function skirt(o, color) {
  o.updateMatrixWorld(true);
  const hips = o.bones.Hips;
  const knee = o.bones.LeftLeg;
  if (!hips || !knee) return;
  const top = hips.getWorldPosition(new THREE.Vector3());
  const bot = knee.getWorldPosition(new THREE.Vector3());
  const len = (top.y - bot.y) * 1.25;
  const ws = hips.getWorldScale(new THREE.Vector3()).x;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15 / ws, 0.245 / ws, len / ws, 28, 1, true), clay(color));
  m.material.side = THREE.DoubleSide;
  m.position.set(0, (-len / 2 + 0.06) / ws, 0);
  m.castShadow = m.receiveShadow = true;
  hips.add(m);
}
/** The archivist's white cotton gloves: a white shell over each hand. */
function gloves(o) {
  o.updateMatrixWorld(true);
  for (const side of ['Left', 'Right']) {
    const b = o.bones[`${side}Hand`];
    if (!b) continue;
    const ws = b.getWorldScale(new THREE.Vector3()).x;
    const g = new THREE.Mesh(new THREE.SphereGeometry(0.052 / ws, 16, 12), clay('#f2f0ea'));
    g.scale.set(0.85, 1.35, 0.6);
    g.position.set(0, 0.06 / ws, 0.01 / ws);
    g.castShadow = true;
    b.add(g);
  }
}

// ── the sea and the sky over it ──────────────────────────────────────────────────────────────────
function sea(color = '#6f8590', y = -0.4, rough = 0.3) {
  const m = plane(3000, 3000, color, [0, y, -1400]);
  m.material.normalMap = waves();
  m.material.normalScale = new THREE.Vector2(0.8, 0.8);
  m.material.roughness = rough;
  return m;
}

// ── PANE DURO (1962): the flat ground of Pietralata, the shacks, the blocks going up, the extras ──
function mudTex() {
  return canvasTex(1024, 1024, (x, w, h) => {
    x.fillStyle = '#6d5f50';
    x.fillRect(0, 0, w, h);
    let q = 3;
    const R = () => ((q = (q * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 900; i++) {
      x.fillStyle = R() < 0.5 ? `rgba(60,48,38,${0.15 + R() * 0.25})` : `rgba(150,135,112,${0.1 + R() * 0.2})`;
      x.beginPath();
      x.ellipse(R() * w, R() * h, 4 + R() * 40, 2 + R() * 14, R() * 3, 0, Math.PI * 2);
      x.fill();
    }
    // ruts of cart wheels
    x.strokeStyle = 'rgba(50,40,32,0.5)';
    x.lineWidth = 5;
    for (let i = 0; i < 6; i++) {
      x.beginPath();
      const y0 = R() * h;
      x.moveTo(0, y0);
      x.bezierCurveTo(w * 0.3, y0 + (R() - 0.5) * 200, w * 0.6, y0 + (R() - 0.5) * 200, w, y0 + (R() - 0.5) * 120);
      x.stroke();
    }
  });
}

function corrugated(col = '#7a7268') {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = col;
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 12) {
      x.fillStyle = 'rgba(0,0,0,0.22)';
      x.fillRect(i, 0, 5, h);
      x.fillStyle = 'rgba(255,255,255,0.08)';
      x.fillRect(i + 6, 0, 3, h);
    }
    let q = 9;
    const R = () => ((q = (q * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 40; i++) {
      x.fillStyle = `rgba(120,60,30,${R() * 0.35})`;
      x.fillRect(R() * w, R() * h, 10 + R() * 40, 6 + R() * 30);
    }
  });
}

function shack(x, z, w, d, h, rot, wall = '#8a7f70') {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: corrugated(wall), roughness: 0.9 }));
  body.position.y = h / 2;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.06, d + 0.5), new THREE.MeshStandardMaterial({ map: corrugated('#6a645e'), roughness: 0.8 }));
  roof.position.set(0, h + 0.15, 0);
  roof.rotation.x = 0.12;
  g.add(roof);
  g.add(boxMesh(0.8, 1.75, 0.04, '#2a241e', [-w * 0.2, 0, d / 2 + 0.01]));
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), clay('#3a3836'));
  pipe.position.set(w * 0.3, h + 0.6, -d * 0.2);
  g.add(pipe);
  g.position.set(x, 0, z);
  g.rotation.y = D(rot);
  g.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  g.userData.id = nextId();
  return g;
}

function block(x, z, w, h, d, unfinished = false) {
  // the public housing going up at the edge of the fields: rows of dark windows, a top floor still open
  const t = canvasTex(512, 512, (c, cw, ch) => {
    c.fillStyle = '#c9c0ae';
    c.fillRect(0, 0, cw, ch);
    const nx = 10, ny = 8;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      c.fillStyle = unfinished && j < 2 ? '#8a8378' : '#2c2a28';
      c.fillRect(12 + i * (cw - 24) / nx, 14 + j * (ch - 28) / ny, (cw - 24) / nx * 0.55, (ch - 28) / ny * 0.5);
    }
  });
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
  m.position.y = h / 2;
  g.add(m);
  if (unfinished) {
    // scaffolding on the top floors, and a crane
    for (let i = 0; i <= 8; i++) g.add(beam([-w / 2 + (i * w) / 8, h - 6, d / 2 + 0.8], [-w / 2 + (i * w) / 8, h + 2, d / 2 + 0.8], 0.15, 0.35));
    for (let j = 0; j <= 3; j++) g.add(beam([-w / 2, h - 6 + j * 2.6, d / 2 + 0.8], [w / 2, h - 6 + j * 2.6, d / 2 + 0.8], 0.12, 0.35));
    g.add(beam([w / 2 + 3, 0, 0], [w / 2 + 3, h + 12, 0], 0.7, 0.3));
    g.add(beam([w / 2 + 3 - 18, h + 12, 0], [w / 2 + 3 + 8, h + 12, 0], 0.5, 0.3));
  }
  g.position.set(x, 0, z);
  g.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  g.userData.id = nextId();
  return g;
}

function pole(x, z, h = 7) {
  const g = new THREE.Group();
  g.add(beam([0, 0, 0], [0, h, 0], 0.16, '#4a3a2c'));
  g.add(beam([-0.7, h - 0.5, 0], [0.7, h - 0.5, 0], 0.08, '#4a3a2c'));
  g.position.set(x, 0, z);
  g.userData.id = nextId();
  return g;
}

function banner() {
  // the procession's standard: a pole, a crossbar, a cloth with the Madonna in her blue mantle
  const t = canvasTex(256, 384, (c, w, h) => {
    c.fillStyle = '#e6dcc4';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#c8a040';
    c.fillRect(8, 8, w - 16, h - 16);
    c.fillStyle = '#e6dcc4';
    c.fillRect(18, 18, w - 36, h - 36);
    c.fillStyle = '#d9b850';
    c.beginPath();
    c.arc(w / 2, 120, 58, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2a4a8a';
    c.beginPath();
    c.moveTo(w / 2, 100);
    c.lineTo(w / 2 + 80, h - 40);
    c.lineTo(w / 2 - 80, h - 40);
    c.closePath();
    c.fill();
    c.fillStyle = '#e8c8a8';
    c.beginPath();
    c.ellipse(w / 2, 120, 26, 32, 0, 0, Math.PI * 2);
    c.fill();
  });
  const g = new THREE.Group();
  g.add(beam([0, 0, 0], [0, 3.9, 0], 0.05, '#5a4a30'));
  g.add(beam([-0.55, 3.55, 0], [0.55, 3.55, 0], 0.04, '#5a4a30'));
  const cloth = sheet(1.0, 1.45, t, [0, 2.8, 0.02]);
  cloth.material.side = THREE.DoubleSide;
  g.add(cloth);
  g.userData.id = nextId();
  return g;
}

/** The flat ground of Pietralata in 1962, from where the camera stood: the extras watching the procession go by. */
export async function pianoPietralata(s, { girlLook = 'lens', camPos = [0.2, 1.3, 1.5] } = {}) {
  s.background = new THREE.Color('#dfe2e2');
  s.fog = new THREE.Fog('#dcdad2', 30, 220);
  s.add(sky([[-0.1, '#c9c3b6'], [0.0, '#e2e0d6'], [0.12, '#e3e7e8'], [1.0, '#c4d2de']]));
  const mt = mudTex();
  mt.wrapS = mt.wrapT = THREE.RepeatWrapping;
  mt.repeat.set(26, 26);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ map: mt, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.userData.id = nextId();
  s.add(ground);
  for (const [x, z, w, d] of [[-0.6, -2.2, 0.7, 0.3], [2.6, -10.5, 2.4, 1.1], [-5, -12, 3, 1.4]]) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: '#5e5850', roughness: 0.1, metalness: 0.35 }));
    p.rotation.x = -Math.PI / 2;
    p.scale.set(w, d, 1);
    p.position.set(x, 0.01, z);
    p.userData.id = nextId();
    s.add(p);
  }
  for (const a of [[-9, -16, 3.4, 2.6, 2.3, 8], [-4.6, -20, 2.8, 2.4, 2.1, -6], [5.2, -18, 3.2, 2.5, 2.4, 12], [10, -14, 3.6, 2.8, 2.5, -15], [14, -23, 3, 2.4, 2.2, 4], [-14, -25, 3.4, 2.6, 2.4, 20], [1.2, -27, 4, 3, 2.6, -3]]) s.add(shack(...a));
  s.add(block(-46, -150, 34, 18, 12), block(-6, -165, 28, 22, 12, true), block(36, -145, 30, 16, 12));
  for (const [x, z] of [[-7, -11], [8, -26], [-20, -40]]) s.add(pole(x, z));
  // the extras: two rows along the edge of the procession's path, turned to it; the hair is a headscarf or a cap
  const crowd = [
    ['woman', -2.2, -5.9, { wear: { top: '#2a2826', bottom: '#2a2826', hair: '#1c1814' } }],
    ['oldman', -1.5, -6.5, { wear: { top: '#5a5248', bottom: '#3a3632' } }],
    ['woman', -0.85, -5.7, { wear: { top: '#4e5a60', bottom: '#4a4238', hair: '#6a5c4e' } }],
    ['boy', -0.3, -5.0, { wear: { top: '#d8d2c4', bottom: '#4a4a52', hair: '#2a1d16' } }],
    ['man', 0.35, -6.3, { wear: { top: '#e2ddd0', bottom: '#3a3836', hair: '#1a1514' } }],
    ['woman', 0.95, -5.8, { wear: { top: '#4a5a6a', bottom: '#3a3a3a', hair: '#2a221c' } }],
    ['boy', 2.1, -5.2, { wear: { top: '#5a5a4c', bottom: '#3a3a40', hair: '#3b2a1e' } }],
    ['beard', 2.3, -6.6, { wear: { top: '#4a4a46', bottom: '#2e2e2c' } }],
    ['woman', -1.9, -7.4, { wear: { top: '#3a3430', bottom: '#2a2622', hair: '#d0c8bc' } }],
    ['man', -0.6, -7.6, { wear: { top: '#5a5e62', bottom: '#2a2a2c', hair: '#2a1d16' } }],
    ['oldman', 0.6, -7.5, { wear: { top: '#3a3a3a', bottom: '#2a2a2a' } }],
    ['woman', 1.7, -7.6, { wear: { top: '#6a4a3a', bottom: '#3a3030', hair: '#1a1514' } }],
  ];
  let i = 0;
  for (const [kind, x, z, o] of crowd) {
    const rot = facing([x, 0, z], [-9, 0, z - 1.5]) + (((i * 37) % 11) - 5) * 2;
    s.add(await grey(kind, 'stand', { pos: [x, 0, z], rotY: rot, seed: 20 + i++, ...o, aim: { Head: [0, 1, 0.12 + (i % 3) * 0.05] } }));
  }
  const bn = banner();
  bn.position.set(-3.1, 0, -9.4);
  bn.rotation.y = D(15);
  s.add(bn);
  // Ada, nineteen: a little apart, nearer the camera, the only one who turns round
  const ap = [1.0, 0, -3.1];
  const look = girlLook === 'lens' ? camPos : [-2.4, 0, 0.5]; // the lens, or the boy with the clapperboard just beside it
  const ada = await adaGirl('stand', { pos: ap, rotY: facing(ap, look), expr: 'neutral', aim: { Spine: [0.1, 1, 0], Head: [0.08, 1, 0.08] } });
  s.add(ada);
  s.add(new THREE.HemisphereLight('#f4f2ea', '#6a5a48', 1.25));
  const sun = shadowed(new THREE.DirectionalLight('#fff2dc', 2.2), 2048, 30);
  sun.position.set(-30, 60, 25);
  sun.target.position.set(0, 0, -8);
  s.add(sun, sun.target);
  return { ada };
}

/** 03 · the four seconds, as they came out of the can: the girl turns and looks into the lens. */
async function pane(opts = {}) {
  const s = new THREE.Scene();
  const camPos = [0.15, 1.3, 0.6];
  await pianoPietralata(s, { girlLook: opts.girlLook ?? 'lens', camPos });
  return { scene: s, camera: cam(32, camPos, [0.15, 1.2, -10]), far: 400 };
}
/** The girl, enlarged on the restorer's monitor. */
async function paneCu(opts = {}) {
  const s = new THREE.Scene();
  await pianoPietralata(s, { girlLook: 'lens', camPos: [0.15, 1.3, 0.6] });
  return { scene: s, camera: cam(16, [0.55, 1.45, -0.7], [1.0, 1.42, -3.1]), far: 400 };
}

// ── THE CARE HOME AT OSTIA: a pale green room, a window on the winter sea ─────────────────────────
async function room(s, { night = false, rain = false, curtains = false } = {}) {
  const W2 = 2.2, Bk = -4.6, Fr = 1.4, Ht = 2.9;
  const wall = '#a9b6a4';
  s.add(plane(W2 * 2, Fr - Bk, '#b9b5ab', [0, 0, (Bk + Fr) / 2]));
  s.add(plane(W2 * 2, Fr - Bk, '#e2e1db', [0, Ht, (Bk + Fr) / 2], Math.PI / 2));
  for (const k of [-1, 1]) {
    const w = plane(Fr - Bk, Ht, wall, [k * W2, Ht / 2, (Bk + Fr) / 2], 0);
    w.rotation.y = -k * Math.PI / 2;
    s.add(w);
  }
  // the window wall: pieces round a wide window
  const wid = nextId();
  const x0 = -0.2, x1 = 1.9, y0 = 0.55, y1 = 2.35;
  s.add(boxMesh(x0 + W2, Ht, 0.2, wall, [(-W2 + x0) / 2, 0, Bk - 0.1], wid));
  s.add(boxMesh(W2 - x1, Ht, 0.2, wall, [(x1 + W2) / 2, 0, Bk - 0.1], wid));
  s.add(boxMesh(x1 - x0, y0, 0.2, wall, [(x0 + x1) / 2, 0, Bk - 0.1], wid));
  s.add(boxMesh(x1 - x0, Ht - y1, 0.2, wall, [(x0 + x1) / 2, y1, Bk - 0.1], wid));
  for (const x of [x0, (x0 + x1) / 2, x1]) s.add(boxMesh(0.06, y1 - y0, 0.08, '#efeee8', [x, y0, Bk - 0.05], wid));
  s.add(boxMesh(x1 - x0, 0.06, 0.08, '#efeee8', [(x0 + x1) / 2, y0, Bk - 0.05], wid));
  s.add(boxMesh(x1 - x0, 0.06, 0.08, '#efeee8', [(x0 + x1) / 2, y1 - 0.06, Bk - 0.05], wid));
  s.add(boxMesh(1.4, 0.4, 0.12, '#d8d6cc', [(x0 + x1) / 2, 0.1, Bk + 0.1]));
  // outside: the winter sea, a washed sky
  s.add(sky(night
    ? [[-0.1, '#0c1018'], [0.0, '#1a2230'], [0.2, '#10161f'], [1, '#080b10']]
    : rain ? [[-0.1, '#7a8288'], [0.0, '#a4acb0'], [0.2, '#9aa2a8'], [1, '#868e94']]
      : [[-0.1, '#9fa8a8'], [0.0, '#d4d8d4'], [0.15, '#c8d0d0'], [1, '#aebcc2']]));
  s.add(sea(night ? '#141c26' : rain ? '#5f6b70' : '#7c8e92', -1.5, 0.35));
  if (rain) {
    const streaks = canvasTex(512, 512, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      let q = 4;
      const R = () => ((q = (q * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 260; i++) {
        c.strokeStyle = `rgba(230,236,240,${0.15 + R() * 0.35})`;
        c.lineWidth = 1 + R() * 1.5;
        const x = R() * w, y = R() * h;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + (R() - 0.5) * 6, y + 20 + R() * 60);
        c.stroke();
      }
    });
    const g = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), new THREE.MeshBasicMaterial({ map: streaks, transparent: true }));
    g.position.set((x0 + x1) / 2, (y0 + y1) / 2, Bk - 0.02);
    g.userData.id = wid;
    g.userData.colorOnly = true;
    s.add(g);
  }
  if (curtains) {
    for (const k of [0, 1]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry((x1 - x0) / 2 + 0.15, Ht - 0.3, 0.04), clay('#c8c2b0'));
      c.position.set(x0 + (k + 0.5) * (x1 - x0) / 2, (Ht - 0.3) / 2 + 0.05, Bk + 0.15);
      c.castShadow = c.receiveShadow = true;
      c.userData.id = nextId();
      s.add(c);
    }
  }
  return { W2, Bk, Fr, Ht, x0, x1, y0, y1 };
}

function armchair(x, z, rot) {
  const g = new THREE.Group();
  const vinyl = '#8e9c88';
  g.add(boxMesh(0.75, 0.42, 0.72, vinyl, [0, 0, 0]));
  g.add(boxMesh(0.75, 0.62, 0.16, vinyl, [0, 0.42, -0.3]));
  for (const k of [-1, 1]) g.add(boxMesh(0.14, 0.22, 0.66, vinyl, [k * 0.31, 0.42, 0.02]));
  g.position.set(x, 0, z);
  g.rotation.y = D(rot);
  g.userData.id = nextId();
  return g;
}

function bed(x, z, rot, blanket = '#cbc2ad') {
  // a care home bed: white metal, a high mattress, a raised back
  const g = new THREE.Group();
  g.add(boxMesh(0.95, 0.42, 2.05, '#dcdcd8', [0, 0, 0]));
  g.add(boxMesh(0.92, 0.16, 2.0, '#efede6', [0, 0.42, 0]));
  g.add(boxMesh(0.96, 0.1, 1.45, blanket, [0, 0.55, 0.28]));
  g.add(boxMesh(0.98, 0.95, 0.06, '#dcdcd8', [0, 0, -1.03]));
  g.add(boxMesh(0.98, 0.7, 0.06, '#dcdcd8', [0, 0, 1.03]));
  const pillow = boxMesh(0.62, 0.16, 0.42, '#f2f0ea', [0, 0.62, -0.72]);
  pillow.rotation.x = -0.5;
  g.add(pillow);
  g.position.set(x, 0, z);
  g.rotation.y = D(rot);
  g.userData.id = nextId();
  return g;
}

function nightstand(x, z, flowers = true) {
  const g = new THREE.Group();
  g.add(boxMesh(0.45, 0.62, 0.42, '#d6d2c6', [0, 0, 0]));
  if (flowers) {
    // plastic flowers, the only full colour in the room: false, like magenta
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.18, 14), clay('#e8e4d8'));
    vase.position.set(-0.08, 0.71, 0);
    g.add(vase);
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3;
      g.add(beam([-0.08, 0.78, 0], [-0.08 + Math.cos(a) * 0.08, 1.0 + (i % 2) * 0.06, Math.sin(a) * 0.08], 0.008, '#3a6a3a'));
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: '#d0157a', roughness: 0.4 }));
      f.position.set(-0.08 + Math.cos(a) * 0.08, 1.0 + (i % 2) * 0.06, Math.sin(a) * 0.08);
      f.scale.y = 0.6;
      g.add(f);
    }
  }
  g.position.set(x, 0, z);
  g.userData.id = nextId();
  return g;
}

function daylight(s, { rain = false } = {}) {
  s.add(new THREE.HemisphereLight(rain ? '#c4ccce' : '#e2e8e2', '#8a8a80', rain ? 1.5 : 1.9));
  const win = shadowed(new THREE.DirectionalLight(rain ? '#d0d8dc' : '#f2f4f2', rain ? 1.6 : 2.4), 2048, 8);
  win.position.set(1.2, 4.5, -12);
  win.target.position.set(-0.5, 0.5, -1);
  s.add(win, win.target);
  const fill = new THREE.PointLight('#e8ece6', 1.6, 9, 1.2);
  fill.position.set(0.2, 2.4, 0.8);
  s.add(fill);
}

/** 09 · the room, from the door, at the height of someone sitting: Ada in the armchair, Elio on the bed. */
async function stanza(opts = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#c8d0d0');
  await room(s);
  s.add(armchair(1.1, -3.55, -35));
  s.add(bed(-1.62, -2.55, 0));
  s.add(nightstand(-1.75, -4.15));
  s.add(emissive(0.55, 0.34, 0.05, [2.17, 2.05, -1.2], 0.7, '#9fb4c8'));
  const ada = await adaOld('sitChair', { pos: [1.08, 0.1, -3.62], rotY: -35, expr: opts.expr ?? 'neutral' });
  s.add(ada);
  const el = await elio('sitChair', { pos: [-1.18, 0.14, -2.5], rotY: facing([-1.18, 0, -2.5], [1.1, 0, -3.6]), expr: 'neutral' });
  s.add(el);
  daylight(s);
  return { scene: s, camera: cam(30, [0.35, 0.9, 0.9], [-0.15, 0.98, -4.6]), far: 3000, figure: { obj: ada, fade: opts.fade ?? 0 } };
}

/** 18 · rain on the window; Ada in bed, half of her already gone; Elio in his wet coat, on the chair. */
async function visita(opts = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#9aa2a6');
  await room(s, { rain: true });
  s.add(bed(0.6, -3.0, -90, '#c4bba6'));
  s.add(nightstand(1.85, -4.2));
  const ada = await adaOld('sitFloor', { pos: [1.35, 0.58, -2.95], rotY: -70, expr: 'tired', aim: { LeftArm: [0.3, -1, 0.3], RightArm: [-0.3, -1, 0.3] } });
  s.add(ada);
  s.add(boxMesh(0.45, 0.45, 0.45, '#5a5650', [-0.75, 0, -1.95]));
  const el = await elio('sitChair', { pos: [-0.75, 0.12, -1.95], rotY: facing([-0.75, 0, -1.95], [1.35, 0, -2.95]), wear: { top: '#2e3238', bottom: '#26262a' }, expr: 'sad' });
  s.add(el);
  daylight(s, { rain: true });
  return { scene: s, camera: cam(32, [-1.75, 1.0, 1.0], [0.6, 1.05, -3.6]), far: 3000, figure: { obj: ada, fade: opts.fade ?? 0.6 } };
}

// ── THE LAB, the night of the green ─────────────────────────────────────────────────────────────
async function laboratorio(opts = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#05080a');
  s.add(plane(10, 10, '#262a2c', [0, 0, -1]));
  s.add(plane(10, 3.2, '#1e2224', [0, 1.6, -3.2], 0));
  // shelves of cans in the dark behind
  for (let r = 0; r < 4; r++) {
    s.add(boxMesh(4.5, 0.03, 0.4, '#2a2e30', [0, 0.5 + r * 0.55, -3.0]));
    for (let i = 0; i < 16; i++) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 20), clay(['#5a5e62', '#4a4e52', '#6a5e4e'][i % 3]));
      can.rotation.x = Math.PI / 2;
      can.position.set(-2.1 + i * 0.28, 0.72 + r * 0.55, -2.95);
      can.userData.id = nextId();
      s.add(can);
    }
  }
  // the desk, the scanner with its two reels, the monitor
  s.add(boxMesh(2.6, 0.04, 0.85, '#3a3a38', [0, 0.74, -1.55]));
  for (const x of [-1.2, 1.2]) s.add(boxMesh(0.05, 0.74, 0.8, '#2a2a2a', [x, 0, -1.55]));
  s.add(boxMesh(0.55, 0.3, 0.4, '#2c2e30', [-0.95, 0.78, -1.6]));
  for (const x of [-1.1, -0.8]) {
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.025, 28), clay('#8a8e92'));
    reel.rotation.x = Math.PI / 2;
    reel.position.set(x, 1.22, -1.62);
    reel.userData.id = nextId();
    s.add(reel);
  }
  s.add(boxMesh(0.3, 0.012, 0.012, '#7a3a5a', [-0.95, 1.18, -1.4]));
  s.add(boxMesh(1.04, 0.62, 0.05, '#101214', [0.1, 0.92, -1.82]));
  s.add(boxMesh(0.06, 0.18, 0.06, '#101214', [0.1, 0.76, -1.82]));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.54), new THREE.MeshBasicMaterial({ color: new THREE.Color('#1c3a2a') }));
  screen.position.set(0.1, 1.23, -1.79);
  screen.userData.id = nextId();
  s.add(screen);
  for (let i = 0; i < 4; i++) {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 20), clay('#6a5e4e'));
    can.position.set(0.95, 0.79 + i * 0.065, -1.4);
    can.userData.id = nextId();
    s.add(can);
  }
  const el = await elio('sitChair', { pos: [0.08, 0.03, -0.92], rotY: 180, gloves: true, aim: { LeftArm: [0.2, -0.7, 0.75], LeftForeArm: [0.1, -0.2, 1], RightArm: [-0.2, -0.7, 0.75], RightForeArm: [-0.15, -0.25, 1], Head: [0, 0.95, 0.35] } });
  s.add(el);
  s.add(new THREE.HemisphereLight('#1a2a3a', '#050505', 0.35));
  const glow = new THREE.PointLight(opts.light ?? '#25e07e', 7, 6, 1.4);
  glow.position.set(0.1, 1.25, -1.55);
  glow.castShadow = true;
  glow.shadow.mapSize.set(1024, 1024);
  s.add(glow);
  const rim = new THREE.SpotLight('#2a4a6a', 4, 8, 0.5, 0.8, 1.5);
  rim.position.set(-2, 2.6, 1);
  rim.target.position.set(0, 1, -1);
  s.add(rim, rim.target);
  return { scene: s, camera: cam(30, [0.85, 1.52, 0.75], [-0.02, 1.12, -1.8]), far: 30, screens: [{ name: opts.screen ?? 'verde', mode: 'monitor', mesh: screen }] };
}

// ── THE PROJECTION: the room in the dark, the beam, the girl on the wall between mother and son ──
async function proiezione(opts = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#06080a');
  // a plain wall at the back for the picture; the bed along the right, the chair on the left
  s.add(plane(5, 5.4, '#4a4c46', [0, 0, -1.2]));
  s.add(plane(5, 2.9, '#a9b6a4', [0, 1.45, -3.9], 0));
  for (const k of [-1, 1]) {
    const w = plane(5.4, 2.9, '#a9b6a4', [k * 2.4, 1.45, -1.2], 0);
    w.rotation.y = -k * Math.PI / 2;
    s.add(w);
  }
  s.add(armchair(-1.1, -3.4, 10));
  s.add(bed(1.35, -0.9, 90, '#2f6a4a'));
  s.add(nightstand(1.5, 0.45, true));
  const ada = await adaOld('sitFloor', { pos: [1.95, 0.58, -0.9], rotY: -118, expr: opts.expr ?? 'smile' });
  s.add(ada);
  const el = await elio('sitChair', { pos: [-1.2, 0.12, -1.0], rotY: 84, gloves: true, expr: 'neutral' });
  s.add(el);
  // the projector on a stool between them, near us; its beam full of dust
  const proj = new THREE.Group();
  proj.add(boxMesh(0.28, 0.2, 0.34, '#2a2a2c', [0, 0, 0]));
  for (const z of [-0.1, 0.12]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 24), clay('#6a6e72'));
    r.rotation.z = Math.PI / 2;
    r.position.set(0, 0.36, z);
    proj.add(r);
  }
  proj.position.set(0.35, 1.05, 3.0);
  proj.userData.id = nextId();
  s.add(proj);
  s.add(boxMesh(0.4, 1.05, 0.4, '#3a3a3a', [0.35, 0, 3.0]));
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.37 * 1.3, 1.3), new THREE.MeshBasicMaterial({ color: '#202020' }));
  pic.position.set(0.0, 1.62, -3.89);
  pic.visible = false;
  s.add(pic);
  const lens = new THREE.Vector3(0.35, 1.21, 2.82);
  s.add(shaft(lens.toArray(), [0.0, 1.62, -3.85], 0.02, 0.85, '#f4f0e6', 0.3));
  const beamL = new THREE.SpotLight('#fff4e0', 60, 12, 0.19, 0.0, 1.0);
  beamL.position.copy(lens);
  beamL.target.position.set(0, 1.62, -3.9);
  beamL.map = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff';
    c.filter = 'blur(2px)';
    const rw = w * 0.72, rh = rw / 1.37;
    c.fillRect((w - rw) / 2, (h - rh) / 2, rw, rh);
  });
  beamL.castShadow = true;
  beamL.shadow.mapSize.set(1024, 1024);
  s.add(beamL, beamL.target);
  // what the picture throws back into the room: green and gold on their faces
  const bounce = new THREE.PointLight('#ffd49a', 0.9, 5, 1.6);
  bounce.position.set(0, 1.7, -3.3);
  s.add(bounce);
  s.add(new THREE.HemisphereLight('#1a3a4a', '#08060a', 0.7));
  return { scene: s, camera: cam(30, [-0.55, 1.0, 2.3], [0.85, 1.35, -3.9]), far: 30, screens: [{ name: 'restaurato', mode: 'projection', mesh: pic }], figure: { obj: ada, fade: opts.fade ?? 0 } };
}

// ── OSTIA AT DAWN: the sea to the west, the pink band of the Earth's shadow over it ──────────────
async function alba(opts = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#2a2c50');
  s.fog = new THREE.Fog('#7a6a96', 120, 900);
  // facing west at dawn: the dark blue of the Earth's shadow on the horizon, the magenta band above it
  s.add(sky([[-0.1, '#3a3a64'], [0.0, '#3e4672'], [0.035, '#56588a'], [0.06, '#c27aa6'], [0.11, '#d98fb4'], [0.2, '#a294c2'], [0.4, '#7d8cbc'], [1.0, '#5a6aa0']]));
  s.add(sea('#8a7cae', -0.2, 0.18));
  const sand = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#a08e94';
    c.fillRect(0, 0, w, h);
    let q = 2;
    const R = () => ((q = (q * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 4000; i++) {
      c.fillStyle = `rgba(${R() < 0.5 ? '40,30,40' : '180,160,170'},0.12)`;
      c.fillRect(R() * w, R() * h, 2, 2);
    }
  });
  sand.wrapS = sand.wrapT = THREE.RepeatWrapping;
  sand.repeat.set(40, 40);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(600, 60), new THREE.MeshStandardMaterial({ map: sand, roughness: 0.95 }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0, 10);
  beach.receiveShadow = true;
  beach.userData.id = nextId();
  s.add(beach);
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(600, 8), new THREE.MeshStandardMaterial({ color: '#b68cb4', roughness: 0.15, metalness: 0.2 }));
  wet.rotation.x = -Math.PI / 2;
  wet.position.set(0, 0.01, -16);
  wet.userData.id = nextId();
  s.add(wet);
  // the pier of Ostia, going out into the sea on the left
  const pier = new THREE.Group();
  pier.add(boxMesh(5, 0.4, 260, '#3a3448', [0, 2.2, -130]));
  for (let z = 0; z > -260; z -= 9) for (const x of [-2.2, 2.2]) pier.add(boxMesh(0.4, 2.6, 0.4, '#2a2638', [x, -0.4, z]));
  for (let z = -10; z > -260; z -= 26) {
    pier.add(boxMesh(0.1, 3, 0.1, '#1e1c28', [2.3, 2.6, z]));
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffe8d0', emissive: new THREE.Color('#ffd0a0'), emissiveIntensity: 2 }));
    l.position.set(2.3, 5.7, z);
    pier.add(l);
  }
  pier.position.set(-34, 0, -12);
  pier.userData.id = nextId();
  s.add(pier);
  const el = await elio('stand', { pos: [0.6, 0, -13.2], rotY: 180, wear: { top: '#2a2c34', bottom: '#222226' } });
  s.add(el);
  s.add(new THREE.HemisphereLight('#d49ac4', '#4a3a58', 1.5));
  const low = shadowed(new THREE.DirectionalLight('#f0a8c0', 0.9), 2048, 30);
  low.position.set(10, 8, 40);
  low.target.position.set(0, 0, -14);
  s.add(low, low.target);
  return { scene: s, camera: cam(30, [1.4, 1.0, 2.0], [0.3, 10, -120]), far: 3000 };
}

export const SCENES = { pane, paneCu, stanza, visita, laboratorio, proiezione, alba };
