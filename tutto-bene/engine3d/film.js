// FIN QUI TUTTO BENE: the shots. A tower of fifty floors, the man who falls from it (flat red, the protagonist of
// A PARTE's stage), the floors he passes, the square below. Each builder returns { scene, camera, far, update(k, t),
// screens, figure }; update is called with k = 0..1 across the shot and t in seconds.
import { THREE, boxMesh, plane, clay, nextId, D, cam, grey, canvasTex, beam, clamp01, ease, mixAims, ARMS, emissive, hold, shadowed, sky, posed, PROTAGONIST, REDPROP } from '/magenta/engine3d/kit.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const set = (o, a) => {
  o.aimNow = { ...o.baseAims, ...a };
  o.aimAll(o.aimNow);
};
const bell = (t, a, b) => Math.sin(Math.PI * clamp01((t - a) / (b - a))) ** 2;
const ramp = (t, a, b) => ease(clamp01((t - a) / (b - a)));
const lerp = (a, b, u) => a + (b - a) * u;
const lerp3 = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function boneAt(o, name) {
  o.updateMatrixWorld(true);
  return o.bones[name].getWorldPosition(new THREE.Vector3());
}
function facing(from, to) {
  return (Math.atan2(to[0] - from[0], to[2] - from[2]) * 180) / Math.PI;
}
/** Turn someone from the waist up by `a` radians; the legs stay where they are. */
function twist(o, a) {
  o.updateMatrixWorld(true);
  for (const [b, w] of [['Spine1', 0.2], ['Spine2', 0.25], ['Neck', 0.2], ['Head', 0.35]]) o.bones[b]?.rotateY(a * w);
}

// ── the man: flat red, no face, the light passes through him ─────────────────────────────────────
async function him(pose, opts = {}) {
  const o = await posed('readyplayer.me', pose, { clip: 'idle', rate: 0.8, hide: ['Wolf3D_Headwear', 'Wolf3D_Beard'], face: false, dress: false, t: 1.3, ...opts, id: PROTAGONIST });
  o.traverse((m) => m.isMesh && (m.castShadow = !!opts.shadow));
  return o;
}
/** Falling: arms open as if swimming, legs loose. */
const FALL = { LeftArm: [0.95, 0.35, 0.1], LeftForeArm: [0.9, 0.5, 0.2], RightArm: [-0.95, 0.35, 0.1], RightForeArm: [-0.9, 0.5, 0.2], LeftUpLeg: [0.15, -1, 0.25], LeftLeg: [0.1, -1, -0.35], RightUpLeg: [-0.1, -1, 0.1], RightLeg: [-0.05, -1, -0.2], Head: [0, 1, 0.3], Spine: [0, 1, -0.1] };
async function faller() {
  const g = new THREE.Group();
  const m = await him('stand', { aim: FALL });
  m.position.y = -0.9;
  g.add(m);
  g.userData.man = m;
  return g;
}

// ── the tower ─────────────────────────────────────────────────────────────────────────────────────
export const FLOOR = 3.0;
export const TOP = 50 * FLOOR;
const TW = 32, TD = 20;     // the tower's width and depth; its face is the plane z = 0, toward +z

function facadeTex(seed) {
  // forty-four floors of the old concrete, eight bays each: windows dark or lit, small balconies
  return canvasTex(1024, 44 * 48, (c, w, h) => {
    const R = rng(seed);
    c.fillStyle = '#8c8a84';
    c.fillRect(0, 0, w, h);
    for (let f = 0; f < 44; f++) {
      const y = f * 48;
      c.fillStyle = 'rgba(0,0,0,0.12)';
      c.fillRect(0, y + 44, w, 4);
      for (let b = 0; b < 8; b++) {
        const x = b * 128;
        const lit = R() < 0.28;
        c.fillStyle = lit ? '#e8e2cc' : ['#1c1e22', '#26282c', '#30302e'][Math.floor(R() * 3)];
        c.fillRect(x + 30, y + 10, 68, 28);
        c.fillStyle = 'rgba(255,255,255,0.18)';
        c.fillRect(x + 63, y + 10, 2, 28);
        if (R() < 0.5) {
          c.fillStyle = '#6a6862';
          c.fillRect(x + 24, y + 34, 80, 6);
        }
        if (R() < 0.15) {
          c.fillStyle = 'rgba(40,40,40,0.5)';
          c.fillRect(x + 4, y, 6, 48);
        }
      }
    }
  });
}
function glassTex() {
  return canvasTex(512, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#c8ccd0');
    g.addColorStop(0.5, '#8a9098');
    g.addColorStop(1, '#d8dadc');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#3a3e44';
    c.lineWidth = 4;
    for (let x = 0; x <= w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y <= h; y += 128) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  });
}
function numberTex(n) {
  return canvasTex(128, 96, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#f2f0ea';
    c.font = 'bold 78px "DejaVu Sans Mono", monospace';
    c.textAlign = 'center';
    c.fillText(String(n), w / 2, 76);
  });
}
/** The ground floor billboard: what the top of the tower is sold as. */
export function billboardTex(word = 'VOSTRO') {
  return canvasTex(1600, 600, (c, w, h) => {
    c.fillStyle = '#f2f0ea';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a1a1c';
    c.font = 'bold 150px "DejaVu Sans", sans-serif';
    c.textAlign = 'left';
    c.fillText('IL FUTURO', 70, 210);
    c.fillText(`È ${word}`, 70, 380);
    c.font = '46px "DejaVu Sans", sans-serif';
    c.fillText('RESIDENZE AURORA · ATTICI IN CLASSE A', 74, 520);
    c.fillStyle = '#9aa2aa';
    c.fillRect(1180, 40, 340, 520);
    c.fillStyle = '#c8ccd2';
    for (let y = 60; y < 540; y += 26) c.fillRect(1200, y, 300, 14);
  });
}

/** The tower. floors3d: the floors whose windows are built in 3D, for the shots close to the facade. */
function torre(s, { floors3d = [0, 0], scaffold = true, bill = true } = {}) {
  const tower = new THREE.Group();
  const conc = new THREE.MeshStandardMaterial({ map: facadeTex(5), roughness: 0.95 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(TW, 44 * FLOOR, TD), [clay('#7a7872'), clay('#7a7872'), clay('#6a6862'), clay('#5a5852'), conc, clay('#7a7872')]);
  body.position.set(0, (44 * FLOOR) / 2, -TD / 2);
  tower.add(body);
  // the top six floors: new glass
  const gt = glassTex();
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping;
  gt.repeat.set(4, 3);
  const top = new THREE.Mesh(new THREE.BoxGeometry(TW, 6 * FLOOR, TD), new THREE.MeshStandardMaterial({ map: gt, roughness: 0.25, metalness: 0.4 }));
  top.position.set(0, 44 * FLOOR + 3 * FLOOR, -TD / 2);
  tower.add(top);
  tower.add(boxMesh(TW + 0.6, 0.4, TD + 0.6, '#5a5a58', [0, TOP, -TD / 2]));
  tower.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  tower.userData.id = nextId();
  s.add(tower);
  // windows in relief, and the floor numbers, along the line he falls
  const [f0, f1] = floors3d;
  if (f1 > f0) {
    const frames = [], panes = [], lit = [];
    const R = rng(77);
    for (let f = f0; f < f1; f++) {
      const y = f * FLOOR;
      for (const x of [-10, -6, -2, 2, 6, 10]) {
        const fw = 2.0, fh = 1.6, sill = y + 0.9;
        const add = (g, arr) => arr.push(g);
        const bx = (w, h, d, px, py, pz) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(px, py, pz); return g; };
        if (f < 44) {
          add(bx(fw + 0.3, 0.12, 0.35, x, sill - 0.06, 0.15), frames);
          add(bx(fw + 0.3, 0.1, 0.12, x, sill + fh + 0.05, 0.04), frames);
          add(bx(0.1, fh, 0.12, x - fw / 2 - 0.05, sill + fh / 2, 0.04), frames);
          add(bx(0.1, fh, 0.12, x + fw / 2 + 0.05, sill + fh / 2, 0.04), frames);
          add(bx(0.06, fh, 0.08, x, sill + fh / 2, 0.03), frames);
          const pane = new THREE.PlaneGeometry(fw, fh);
          pane.translate(x, sill + fh / 2, 0.02);
          (R() < 0.3 ? lit : panes).push(pane);
        }
      }
      if (f >= 1) {
        const n = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.68), new THREE.MeshBasicMaterial({ map: numberTex(f), transparent: true }));
        n.position.set(-3.9, y + 1.9, 0.03);
        n.userData.id = nextId();
        s.add(n);
      }
    }
    if (frames.length) {
      const fm = new THREE.Mesh(mergeGeometries(frames), clay('#a4a29c'));
      fm.castShadow = fm.receiveShadow = true;
      fm.userData.id = nextId();
      const pm = new THREE.Mesh(mergeGeometries(panes), new THREE.MeshStandardMaterial({ color: '#16181c', roughness: 0.15, metalness: 0.6 }));
      pm.userData.id = nextId();
      s.add(fm, pm);
    }
    if (lit.length) {
      const lm = new THREE.Mesh(mergeGeometries(lit), new THREE.MeshStandardMaterial({ color: '#111', emissive: new THREE.Color('#d8d0b8'), emissiveIntensity: 1.2 }));
      lm.userData.id = nextId();
      s.add(lm);
    }
  }
  if (scaffold) {
    // the scaffolding of the new facade, on the last three floors
    const sc = new THREE.Group();
    const y0 = 47 * FLOOR, y1 = TOP + 1.2;
    for (let x = -14; x <= 14; x += 2.5) {
      sc.add(beam([x, y0, 0.9], [x, y1, 0.9], 0.05, '#c8c6c0'));
      sc.add(beam([x, y0, 1.9], [x, y1, 1.9], 0.05, '#c8c6c0'));
    }
    for (let y = y0; y <= y1; y += FLOOR) {
      sc.add(boxMesh(28.5, 0.05, 1.1, '#9a8a6a', [0, y, 1.4]));
      sc.add(beam([-14, y + 1.0, 1.95], [14, y + 1.0, 1.95], 0.04, '#c8c6c0'));
    }
    sc.traverse((o) => o.isMesh && (o.castShadow = true));
    sc.userData.id = nextId();
    s.add(sc);
  }
  if (bill) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(24, 9), new THREE.MeshStandardMaterial({ map: billboardTex(), roughness: 0.8 }));
    b.position.set(0, 5.0, 0.45);
    b.userData.id = nextId();
    s.add(b);
    s.userData.billboard = b;
  }
  return tower;
}

/** The city around: blocks of every height, avenues, fog. */
function citta(s, { seed = 3, radius = 420 } = {}) {
  const tex = canvasTex(256, 512, (c, w, h) => {
    const R = rng(11);
    c.fillStyle = '#9a9890';
    c.fillRect(0, 0, w, h);
    for (let y = 8; y < h; y += 22) for (let x = 8; x < w; x += 26) {
      c.fillStyle = R() < 0.18 ? '#e6e0cc' : '#2c2e30';
      c.fillRect(x, y, 14, 12);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const R = rng(seed);
  const geos = [];
  for (let i = 0; i < 260; i++) {
    const a = R() * Math.PI * 2, d = 60 + R() * radius;
    const x = Math.cos(a) * d, z = Math.sin(a) * d - 20;
    if (z > -40 && z < 70 && Math.abs(x) < 50) continue;   // the tower and its square
    const w = 14 + R() * 26, dd = 14 + R() * 26, h = 12 + R() ** 2 * 70;
    const g = new THREE.BoxGeometry(w, h, dd);
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w / 20, uv.getY(k) * h / 30);
    g.translate(x, h / 2, z);
    geos.push(g);
  }
  const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  m.castShadow = m.receiveShadow = true;
  m.userData.id = nextId();
  s.add(m);
  s.add(plane(2000, 2000, '#4a4a48', [0, 0, 0]));
  s.fog = new THREE.Fog('#c8c6c0', 120, 700);
}
function alba(s) {
  s.background = new THREE.Color('#c8c6c0');
  s.add(sky([[-0.1, '#6a6a6a'], [0.0, '#d8d4cc'], [0.08, '#ece8de'], [0.3, '#bcc0c6'], [1.0, '#7c8490']]));
  s.add(new THREE.HemisphereLight('#e8e6e0', '#4a4844', 1.1));
  const sun = shadowed(new THREE.DirectionalLight('#fff4e0', 2.4), 2048, 60);
  sun.position.set(180, 90, 120);
  sun.target.position.set(0, 60, 0);
  s.add(sun, sun.target);
  return sun;
}

// ── PROLOGO: the roof ─────────────────────────────────────────────────────────────────────────────
const EDGE = [3.2, TOP + 0.05, 1.4];   // where he stands: on the scaffold boards, outside the old face
async function tetto(s) {
  alba(s);
  citta(s);
  torre(s, { floors3d: [44, 50] });
  // the crane over the roof
  const cr = new THREE.Group();
  cr.add(beam([0, 0, 0], [0, 38, 0], 1.2, '#4a4a48'));
  cr.add(beam([-12, 38, 0], [40, 38, 0], 0.8, '#4a4a48'));
  cr.add(boxMesh(4, 3, 3, '#5a5a58', [-10, 36, 0]));
  cr.add(beam([30, 38, 0], [30, 14, 0], 0.04, '#2a2a2a'));
  cr.position.set(-8, TOP, -12);
  cr.rotation.y = 0.5;
  cr.userData.id = nextId();
  s.add(cr);
  // glass panels stacked, the sign
  for (let i = 0; i < 6; i++) s.add(boxMesh(2.4, 1.6, 0.03, '#b8bcc2', [-6 + i * 0.05, TOP + 0.2, -3 - i * 0.05]));
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshStandardMaterial({ map: canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#f0ece0'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a1a1a'; c.fillRect(8, 8, w - 16, 60);
    c.fillStyle = '#f0ece0'; c.font = 'bold 40px "DejaVu Sans", sans-serif'; c.textAlign = 'center';
    c.fillText('VIETATO', w / 2, 52);
    c.fillStyle = '#1a1a1a'; c.font = 'bold 34px "DejaVu Sans", sans-serif';
    c.fillText('SALIRE SENZA', w / 2, 140); c.fillText('IMBRACATURA', w / 2, 190);
  }) }));
  sign.position.set(1.0, TOP + 1.25, 1.96);
  sign.userData.id = nextId();
  s.add(sign);
  // two workers with a pane of glass, a third with the hoist rope
  const wk = [];
  for (const [kind, x, z, rot] of [['man', -2.5, 1.2, 90], ['beard', -0.6, 1.2, -90], ['oldman', -6, -1.5, 30]]) {
    const w = await grey(kind, 'stand', { pos: [x, z > 0 ? TOP + 0.05 : TOP + 0.4, z], rotY: rot, seed: 90 + wk.length, wear: { top: '#9a9a96', bottom: '#4a4a4c' }, aim: { LeftArm: [0.4, 0.3, 0.6], LeftForeArm: [0.1, 0.6, 0.8], RightArm: [-0.4, 0.3, 0.6], RightForeArm: [-0.1, 0.6, 0.8] } });
    s.add(w);
    wk.push(w);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), clay('#e8e6e0'));
    w.updateMatrixWorld(true);
    w.bones.Head.add(helmet);
    helmet.position.set(0, 0.16 / w.bones.Head.getWorldScale(new THREE.Vector3()).x, 0);
    helmet.scale.setScalar(1 / w.bones.Head.getWorldScale(new THREE.Vector3()).x);
  }
  s.add(boxMesh(1.7, 1.3, 0.03, '#c0c4ca', [-1.55, TOP + 1.0, 1.2]));
  const man = await him('stand', { pos: EDGE, rotY: 8, aim: { Head: [0, 0.7, 0.7], Neck: [0, 1, 0.35] } });
  s.add(man);
  // his helmet: white, the only thing of his that stays
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), clay('#eceae4'));
  helmet.userData.id = nextId();
  s.add(helmet);
  // the harness's hook, hanging, clipped to nothing
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 16), clay('#2a2a2a'));
  hook.userData.id = nextId();
  s.add(hook);
  return { man, helmet, hook, wk };
}
/** 04 · the roof at dawn, the city below with its lights still on. */
async function s04() {
  const s = new THREE.Scene();
  const { man, helmet, hook } = await tetto(s);
  const update = (k, t) => {
    man.updateMatrixWorld(true);
    const h = boneAt(man, 'Head');
    helmet.position.set(h.x, h.y + 0.12, h.z);
    const hp = boneAt(man, 'Hips');
    hook.position.set(hp.x + 0.1, hp.y - 0.25 + 0.03 * Math.sin(t * 2), hp.z + 0.1);
  };
  update(0, 0);
  // from the air, as the cité is filmed in La Haine: the top of the tower, the boards, the city waking below
  const camera = cam(40, [34, TOP + 9, 44], [0, TOP - 12, 0]);
  return { scene: s, camera, far: 1500, update: (k, t) => { update(k, t); camera.position.set(34 - 6 * k, TOP + 9 - 2 * k, 44 - 8 * k); camera.lookAt(0, TOP - 12, 0); } };
}
/** 05 · the workers and the glass; him at the edge; the hook hanging from his harness. */
async function s05() {
  const s = new THREE.Scene();
  const { man, helmet, hook } = await tetto(s);
  const update = (k, t) => {
    const h = boneAt(man, 'Head');
    helmet.position.set(h.x, h.y + 0.12, h.z);
    const hp = boneAt(man, 'Hips');
    hook.position.set(hp.x + 0.1, hp.y - 0.25 + 0.03 * Math.sin(t * 2), hp.z + 0.1);
  };
  update(0, 0);
  return { scene: s, camera: cam(40, [-3.5, TOP + 2.0, -2.6], [3.0, TOP + 0.6, 4.0]), far: 1500, update };
}
/** 06 · the sign. */
async function s06() {
  const s = new THREE.Scene();
  await tetto(s);
  return { scene: s, camera: cam(20, [1.6, TOP + 1.3, 4.6], [1.0, TOP + 1.25, 1.96]), far: 1500 };
}
/** 07 · Vertigo: he looks down, the camera pulls back as the lens closes; the city behind him stretches. */
async function s07() {
  const s = new THREE.Scene();
  const { man, helmet } = await tetto(s);
  // behind him and above, looking past him into the drop: the camera pulls back as the lens closes; he stays the
  // same size, the square far below comes up toward him
  const P = new THREE.Vector3(EDGE[0] + 0.1, TOP + 0.95, EDGE[2] + 0.1);
  const v = new THREE.Vector3(0.22, -0.72, 1).normalize();
  const camera = cam(60, P.clone().addScaledVector(v, -2.2).toArray(), P.toArray());
  const update = (k, t) => {
    const h = boneAt(man, 'Head');
    helmet.position.set(h.x, h.y + 0.12, h.z);
    const d = lerp(2.2, 10.0, ease(k));
    camera.position.copy(P.clone().addScaledVector(v, -d));
    camera.fov = (2 * Math.atan(1.35 / d) * 180) / Math.PI;
    camera.lookAt(P.clone().addScaledVector(v, 6));
  };
  update(0, 0);
  return { scene: s, camera, far: 1500, update };
}
/** 08 · the edge, empty; his helmet rolls on the boards and stops. */
async function s08() {
  const s = new THREE.Scene();
  const { man, helmet, hook } = await tetto(s);
  man.visible = false;
  hook.visible = false;
  const update = (k, t) => {
    const u = ramp(t, 0, 2.6);
    helmet.position.set(EDGE[0] - 1.6 * u, TOP + 0.3, EDGE[2] - 0.15 + 0.1 * Math.sin(u * 3));
    helmet.rotation.set(Math.PI / 2 + u * 6, 0, 0.3);
  };
  update(0, 0);
  return { scene: s, camera: cam(30, [EDGE[0] - 2.6, TOP + 0.6, EDGE[2] + 2.2], [EDGE[0] - 0.6, TOP + 0.2, EDGE[2] - 0.2]), far: 1500, update };
}

// ── the fall, outside: he falls along the face; the camera falls with him ───────────────────────
const FALL_X = -2.2, FALL_Z = 2.5;   // he went off the outer edge of the scaffold boards
function fallShot(fromFloor, toFloor, { side = 1 } = {}) {
  return async () => {
    const s = new THREE.Scene();
    alba(s);
    citta(s);
    const lo = Math.max(0, Math.floor(toFloor) - 3), hi = Math.min(50, Math.ceil(fromFloor) + 3);
    torre(s, { floors3d: [lo, hi], scaffold: fromFloor > 45 });
    const f = await faller();
    s.add(f);
    const camera = cam(56, [0, 0, 0], [0, 0, 0]);
    const update = (k, t) => {
      const y = lerp(fromFloor, toFloor, k) * FLOOR + 1.2;
      f.position.set(FALL_X, y, FALL_Z);
      f.rotation.set(-0.35 + 0.08 * Math.sin(t * 1.3), t * 0.35, 0.12 * Math.sin(t * 0.9));
      camera.position.set(FALL_X + side * 3.4, y - 0.6, FALL_Z + 4.2);
      camera.lookAt(FALL_X - side * 0.6, y - 0.2, 0);
    };
    update(0, 0);
    return { scene: s, camera, far: 1500, update };
  };
}

// ── the floors, inside: a room with the window at the centre, behind the people ─────────────────
/** A room on floor `fl`: the window in the back wall, the city outside at that height; returns the scene and
 * a function that drops him past the window at time tp. */
async function piano(fl, { W = 5.2, Dp = 4.6, H = 2.8, ww = 1.8, wh = 1.5, sill = 0.9, wall = '#b8b6b0', floorC = '#8a8680', big = false, lamp = '#f2ead8', lampI = 1.4 } = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#c8c6c0');
  const y0 = fl * FLOOR;
  const g = new THREE.Group();
  g.add(plane(W, Dp, floorC, [0, 0, -Dp / 2]));
  g.add(plane(W, Dp, '#d8d6d0', [0, H, -Dp / 2], Math.PI / 2));
  for (const k of [-1, 1]) {
    const w = plane(Dp, H, wall, [k * W / 2, H / 2, -Dp / 2], 0);
    w.rotation.y = -k * Math.PI / 2;
    g.add(w);
  }
  const x0 = big ? -W / 2 + 0.2 : -ww / 2, x1 = big ? W / 2 - 0.2 : ww / 2;
  const s0 = big ? 0.05 : sill, s1 = big ? H - 0.1 : sill + wh;
  const wid = nextId();
  g.add(boxMesh(x0 + W / 2, H, 0.2, wall, [(-W / 2 + x0) / 2, 0, -Dp - 0.1], wid));
  g.add(boxMesh(W / 2 - x1, H, 0.2, wall, [(x1 + W / 2) / 2, 0, -Dp - 0.1], wid));
  g.add(boxMesh(x1 - x0, s0, 0.2, wall, [(x0 + x1) / 2, 0, -Dp - 0.1], wid));
  g.add(boxMesh(x1 - x0, H - s1, 0.2, wall, [(x0 + x1) / 2, s1, -Dp - 0.1], wid));
  g.add(boxMesh(0.05, s1 - s0, 0.06, '#e8e6e0', [(x0 + x1) / 2, s0, -Dp - 0.03]));
  for (const x of [x0, x1]) g.add(boxMesh(0.06, s1 - s0, 0.08, '#e8e6e0', [x, s0, -Dp - 0.03]));
  g.position.y = y0;
  s.add(g);
  // outside: the city below and the sky, as seen from that floor
  alba(s);
  citta(s, { seed: 3 + fl });
  s.fog = new THREE.Fog('#c8c6c0', 60, 600);
  const l = new THREE.PointLight(lamp, lampI, 9, 1.4);
  l.position.set(0, y0 + H - 0.3, -Dp / 2 + 0.6);
  s.add(l);
  const f = await faller();
  f.visible = false;
  s.add(f);
  const xw = (x0 + x1) / 2;
  /** He passes the window between tp and tp + 0.45 s, a little off its middle. */
  const drop = (t, tp, dx = -0.25) => {
    const u = (t - tp) / 0.45;
    f.visible = u > -0.05 && u < 1.05;
    f.position.set(xw + dx, y0 + s1 + 1.8 - (s1 - s0 + 3.6) * clamp01(u), -Dp - 1.3);
    f.rotation.set(-0.3, 0.6 + t * 0.4, 0.1);
  };
  return { s, y0, W, Dp, H, drop, xw, s1, s0 };
}
/** People: kinds, poses and colours for the floors. */
async function person(kind, pose, pos, rot, opts = {}) {
  return grey(kind, pose, { pos, rotY: rot, seed: Math.floor(pos[0] * 31 + pos[2] * 17 + 300), ...opts });
}
const look = (o, up) => set(o, mixAims(o.baseAims, { Neck: [0, 1, -0.1], Head: [0, 1, -0.5] }, up));

/** 10 · 49th floor: the penthouse for sale. Nobody turns. */
async function s10() {
  const P = await piano(49, { W: 8, Dp: 6, H: 3.2, big: true, wall: '#e6e4de', floorC: '#d6d4cc', lampI: 0.6 });
  const { s, y0 } = P;
  s.add(boxMesh(2.6, 0.92, 0.9, '#f0eee8', [1.6, y0, -2.0]));
  const agent = await person('man', 'stand', [-0.6, y0, -2.4], 25, { wear: { top: '#2a2a2c', bottom: '#2a2a2c' }, aim: { RightArm: [-0.6, 0.1, 0.5], RightForeArm: [-0.8, 0.3, 0.4] } });
  const a = await person('woman', 'stand', [0.4, y0, -1.4], -15, { wear: { top: '#d8d4cc', bottom: '#3a3a3c', hair: '#3a2a1e' } });
  const b = await person('man', 'stand', [0.95, y0, -1.5], -25, { wear: { top: '#6a6a6c', bottom: '#2a2a2a', hair: '#1c1814' } });
  s.add(agent, a, b);
  const update = (k, t) => P.drop(t, 3.4, -1.6);
  return { scene: s, camera: cam(46, [0.1, y0 + 1.35, 2.6], [0.1, y0 + 1.45, -6]), far: 1500, update };
}
/** 11 · 46th floor: the offices at dawn; the cleaner, headphones on. */
async function s11() {
  const P = await piano(46, { W: 7, Dp: 6, H: 2.9, wall: '#d6d4ce', lampI: 1.0 });
  const { s, y0 } = P;
  for (const x of [-2.2, 2.2]) for (const z of [-1.6, -3.4]) {
    s.add(boxMesh(1.6, 0.74, 0.8, '#bcbab4', [x, y0, z]));
    s.add(boxMesh(0.5, 0.32, 0.03, '#202022', [x, y0 + 0.74, z - 0.2]));
  }
  const motto = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.35), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 150, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.fillStyle = '#4a4a4c'; c.font = 'bold 40px "DejaVu Sans", sans-serif'; c.textAlign = 'center';
    c.fillText('LE PERSONE SONO IL NOSTRO CAPITALE', w / 2, 98);
  }), transparent: true }));
  motto.position.set(0, y0 + 2.45, -5.98);
  motto.userData.id = nextId();
  s.add(motto);
  const cl = await person('woman', 'stand', [0.3, y0, -2.4], 70, { wear: { top: '#5a5e64', bottom: '#5a5e64', hair: '#2a2420' }, aim: { RightArm: [-0.2, -0.8, 0.6], RightForeArm: [0, -0.6, 0.8], LeftArm: [0.2, -0.8, 0.6], LeftForeArm: [0, -0.6, 0.8], Head: [0, 0.9, 0.4] } });
  s.add(cl);
  const vac = new THREE.Group();
  vac.add(boxMesh(0.35, 0.3, 0.25, '#2a2a2c', [0, 0, 0]));
  vac.add(beam([0, 0.3, 0], [0.55, 0.9, 0], 0.03, '#2a2a2c'));
  vac.userData.id = nextId();
  s.add(vac);
  const update = (k, t) => {
    P.drop(t, 2.2);
    cl.position.x = 0.3 + 0.25 * Math.sin(t * 2.2);
    vac.position.set(cl.position.x + 0.65, y0, -2.4);
  };
  update(0, 0);
  return { scene: s, camera: cam(46, [0, y0 + 1.35, 2.4], [0, y0 + 1.4, -6]), far: 1500, update };
}
/** 12 · 43rd floor: the call centre, full at dawn. */
async function s12() {
  const P = await piano(43, { W: 7, Dp: 5.5, H: 2.8, wall: '#c4c2bc', lampI: 1.6, lamp: '#e8eef2' });
  const { s, y0 } = P;
  const ops = [];
  for (const [x, z] of [[-2.2, -2.4], [-0.75, -2.4], [0.75, -2.4], [2.2, -2.4], [-1.5, -1.0], [1.5, -1.0]]) {
    s.add(boxMesh(1.2, 0.74, 0.6, '#9a9894', [x, y0, z - 0.45]));
    s.add(boxMesh(0.45, 0.3, 0.03, '#1c1c1e', [x, y0 + 0.74, z - 0.7]));
    s.add(boxMesh(0.04, 0.5, 0.5, '#d0cec8', [x + 0.62, y0 + 0.74, z - 0.45]));
    const o = await person(['man', 'woman', 'man', 'woman', 'man', 'woman'][ops.length], 'sitChair', [x, y0 + 0.02, z], 180, { wear: { top: ['#3a3a3c', '#7a7a7c', '#5a5a5c', '#9a9a9a', '#2a2a2a', '#6a6a6a'][ops.length] }, aim: { LeftArm: [0.2, -0.6, -0.8], LeftForeArm: [0, 0, -1], RightArm: [-0.2, -0.6, -0.8], RightForeArm: [0, 0, -1] } });
    s.add(o);
    ops.push(o);
  }
  // he's in front of us: the headset, the eyes closed
  const op = await person('man', 'sitChair', [0, y0 + 0.02, 0.3], 0, { expr: 'tired', wear: { top: '#4a4a4c', hair: '#1c1814' }, aim: { Head: [0, 0.95, 0.2] } });
  s.add(op);
  s.add(boxMesh(1.4, 0.74, 0.6, '#9a9894', [0, y0, 1.0]));
  const update = (k, t) => P.drop(t, 2.0);
  return { scene: s, camera: cam(44, [0, y0 + 1.3, 3.4], [0, y0 + 1.3, -6]), far: 1500, update };
}
/** 14 · 40th floor: four girls in one room; the one studying in her coat lifts her eyes. The first. */
async function s14() {
  const P = await piano(40, { W: 4.4, Dp: 4.2, H: 2.7, wall: '#bcb8b0', lampI: 0.9, lamp: '#f2e2c0' });
  const { s, y0 } = P;
  for (const k of [-1, 1]) {
    const x = k * 1.6;
    s.add(boxMesh(0.95, 0.4, 2.0, '#8a8680', [x, y0, -2.6]));
    s.add(boxMesh(0.95, 0.12, 2.0, '#d8d4cc', [x, y0 + 0.4, -2.6]));
    s.add(boxMesh(0.95, 0.1, 2.0, '#8a8680', [x, y0 + 1.5, -2.6]));
    s.add(boxMesh(0.95, 0.16, 2.0, '#cfcbc2', [x, y0 + 1.6, -2.6]));
    for (const z of [-1.62, -3.58]) for (const yy of [0, 1.5]) s.add(beam([x - 0.45, y0, z], [x - 0.45, y0 + 1.9, z], 0.05, '#4a4a4a'));
    s.add(boxMesh(0.8, 0.22, 1.6, '#a8a49c', [x, y0 + 1.76, -2.7]));
  }
  // asleep on the lower bunks, dressed
  for (const k of [-1, 1]) {
    const lie = new THREE.Group();
    const g = await person('woman', 'stand', [0, 0, 0], 0, { expr: 'tired', wear: { top: k < 0 ? '#5a5a5c' : '#8a8a8a', bottom: '#3a3a3a', hair: '#2a1d16' } });
    lie.add(g);
    lie.rotation.x = -Math.PI / 2;
    lie.position.set(k * 1.6, y0 + 0.62, -1.7);
    s.add(lie);
  }
  s.add(boxMesh(1.2, 0.74, 0.6, '#9a9690', [0, y0, -3.3]));
  const st = await person('woman', 'sitChair', [0, y0 + 0.02, -2.75], 0, { expr: 'tired', wear: { top: '#3a3a3c', bottom: '#2a2a2c', hair: '#3a2a1e', sleeves: 'long' }, aim: { LeftArm: [0.2, -0.7, 0.7], LeftForeArm: [0.1, -0.1, 1], RightArm: [-0.2, -0.7, 0.7], RightForeArm: [-0.1, -0.1, 1], Head: [0, 0.75, 0.65] } });
  s.add(st);
  s.add(boxMesh(0.4, 0.04, 0.3, '#ece8de', [-0.1, y0 + 0.74, -3.15]));
  const rec = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.12), new THREE.MeshBasicMaterial({ map: canvasTex(256, 160, (c, w, h) => {
    c.fillStyle = '#f2efe6'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a1a'; c.font = 'bold 24px "DejaVu Sans Mono", monospace';
    c.fillText('POSTO LETTO', 18, 60); c.fillText('700,00 €', 18, 110);
  }) }));
  rec.rotation.x = -Math.PI / 2 + 0.3;
  rec.position.set(0.32, y0 + 0.76, -3.2);
  rec.userData.id = nextId();
  s.add(rec);
  const update = (k, t) => {
    P.drop(t, 1.6, -0.5);
    set(st, mixAims(st.baseAims, { Head: [0, 1, -0.25], Neck: [0, 1, -0.1] }, ramp(t, 2.3, 3.0)));
  };
  return { scene: s, camera: cam(42, [0, y0 + 1.25, 1.2], [0, y0 + 1.25, -5]), far: 1500, update, screens: [{ name: 'ricevuta', mode: 'paper', mesh: rec }] };
}
/** 15 · 37th floor: the mirror. We are the mirror; behind him, the window. */
async function s15() {
  const P = await piano(37, { W: 2.6, Dp: 3.0, H: 2.6, ww: 0.9, wh: 1.1, sill: 1.2, wall: '#d8d6d0', lampI: 1.8, lamp: '#f6f2e8' });
  const { s, y0 } = P;
  s.add(boxMesh(0.7, 0.85, 0.5, '#e8e6e0', [0.85, y0, -2.6]));
  // he faces the mirror, which is where we are; the window behind him
  const boy = await person('man', 'stand', [0, y0, -1.1], 0, { wear: { top: '#e4e2dc', bottom: '#2a2a2c', hair: '#1c1814' }, aim: { Head: [0, 1, 0.12] } });
  s.add(boy);
  const update = (k, t) => {
    P.drop(t, 5.2, 0.05);
    // he leans in to the mirror on the second try; when the red goes by behind him, he turns
    boy.position.z = -1.1 + 0.12 * bell(t, 2.4, 4.8);
    boy.rotation.y = D(170) * ramp(t, 5.9, 6.8);
  };
  return { scene: s, camera: cam(40, [0.04, y0 + 1.62, 0.4], [0, y0 + 1.55, -3]), far: 1500, update };
}
/** 16 · 34th floor: the landing; the rider eating standing up. */
async function s16() {
  const P = await piano(34, { W: 3.2, Dp: 3.4, H: 2.7, ww: 0.8, wh: 1.4, sill: 1.0, wall: '#a8a6a0', floorC: '#6a6862', lampI: 0.8, lamp: '#e8e8e0' });
  const { s, y0 } = P;
  for (let i = 0; i < 6; i++) s.add(boxMesh(1.1, 0.17, 0.3, '#7a7872', [1.0, y0 + i * 0.17, -0.6 - i * 0.3]));
  const r = await person('man', 'stand', [-0.4, y0, -1.5], 20, { wear: { top: '#2a2a2c', bottom: '#2a2a2c', hair: '#1c1814' }, aim: { RightArm: [-0.2, -0.6, 0.7], RightForeArm: [0.2, 0.7, 0.6], LeftArm: [0.2, -0.6, 0.7], LeftForeArm: [-0.1, 0.4, 0.8], Head: [0, 0.85, 0.5] } });
  s.add(r);
  s.add(boxMesh(0.45, 0.45, 0.45, '#3a3a3c', [-1.1, y0, -1.2]));
  const update = (k, t) => {
    P.drop(t, 1.3, 0.2);
    set(r, mixAims(r.baseAims, { Head: [0.3, 1, -0.2] }, ramp(t, 1.9, 2.5)));
  };
  return { scene: s, camera: cam(44, [0.2, y0 + 1.4, 1.4], [-0.2, y0 + 1.4, -4]), far: 1500, update };
}
/** 17 · 30th floor: the nurse asleep on the sofa in her uniform; the television without sound. She doesn't wake. */
async function s17() {
  const P = await piano(30, { W: 4.6, Dp: 4.0, H: 2.7, wall: '#bebab2', lampI: 0.5, lamp: '#e0e4e8' });
  const { s, y0 } = P;
  s.add(boxMesh(2.2, 0.42, 0.9, '#5a5854', [0, y0, -3.2]));
  s.add(boxMesh(2.2, 0.5, 0.22, '#5a5854', [0, y0 + 0.42, -3.62]));
  const lie = new THREE.Group();
  const n = await person('woman', 'stand', [0, 0, 0], 0, { expr: 'tired', wear: { top: '#e6e6e2', bottom: '#e6e6e2', hair: '#2a1d16' } });
  lie.add(n);
  lie.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  lie.position.set(0.85, y0 + 0.52, -3.15);
  s.add(lie);
  s.add(boxMesh(0.9, 0.5, 0.4, '#2a2a2a', [1.85, y0, -1.6]));
  s.add(emissive(0.85, 0.5, 0.04, [1.85, y0 + 0.78, -1.38], 1.6, '#c8ccd0'));
  const update = (k, t) => P.drop(t, 1.4);
  return { scene: s, camera: cam(44, [0.1, y0 + 1.3, 1.6], [0, y0 + 1.25, -5]), far: 1500, update };
}
/** 18 · 27th floor: the pensioner puts the coffee back in the bag, then the oil. He lifts his head and keeps it lifted. */
async function s18() {
  const P = await piano(27, { W: 4.0, Dp: 3.8, H: 2.7, wall: '#c2beb4', lampI: 1.0, lamp: '#f2e6c8' });
  const { s, y0 } = P;
  s.add(boxMesh(1.4, 0.76, 0.8, '#8a8274', [0, y0, -1.9]));
  const bag = boxMesh(0.35, 0.4, 0.2, '#d8d4c8', [0.45, y0 + 0.76, -1.9]);
  s.add(bag);
  const items = [];
  for (const [x, h] of [[-0.3, 0.16], [-0.1, 0.24], [0.1, 0.12]]) {
    const it = boxMesh(0.09, h, 0.09, '#4a4a48', [x, y0 + 0.76, -1.75]);
    s.add(it);
    items.push(it);
  }
  s.add(boxMesh(0.45, 0.45, 0.45, '#5a5650', [0, y0, -1.05]));
  const old = await person('oldman', 'sitChair', [0, y0 + 0.02, -1.1], 180, { hide: ['Wolf3D_Headwear'], wear: { top: '#4a4a48', bottom: '#3a3a38' }, aim: { RightArm: [-0.2, -0.7, -0.7], RightForeArm: [0, -0.2, -1], LeftArm: [0.2, -0.7, -0.7], LeftForeArm: [0, -0.2, -1], Head: [0, 0.8, -0.6] } });
  s.add(old);
  const update = (k, t) => {
    P.drop(t, 3.3);
    // the coffee, then the oil, back into the bag
    items[0].position.set(lerp(-0.3, 0.45, ramp(t, 0.5, 1.2)), y0 + 0.76 + 0.25 * bell(t, 0.5, 1.2), -1.75);
    items[1].position.set(lerp(-0.1, 0.45, ramp(t, 1.6, 2.3)), y0 + 0.76 + 0.25 * bell(t, 1.6, 2.3), -1.75);
    old.rotation.y = D(180);
    set(old, mixAims(old.baseAims, { Head: [0, 1, 0.05], Neck: [0, 1, 0.05] }, ramp(t, 3.8, 4.4)));
  };
  update(0, 0);
  // we look at him across the table, the window behind us? No: he sits with his back to the window, we face him
  return { scene: s, camera: cam(44, [0.15, y0 + 1.3, 1.5], [0, y0 + 1.2, -5]), far: 1500, update };
}

// ── 06:12:02: suspended ───────────────────────────────────────────────────────────────────────────
/** 19 · time stops at the twenty-fifth floor: he hangs in the air, the camera goes round him once. */
async function s19() {
  const s = new THREE.Scene();
  alba(s);
  citta(s);
  torre(s, { floors3d: [21, 29], scaffold: false });
  const f = await faller();
  const y = 25 * FLOOR + 1.2;
  f.position.set(FALL_X, y, FALL_Z);
  f.rotation.set(-0.35, 0.6, 0.1);
  s.add(f);
  // below, very small, the square filling up
  for (let i = 0; i < 40; i++) {
    const R = rng(500 + i);
    s.add(boxMesh(0.5, 1.7, 0.4, '#2a2a2a', [-14 + R() * 28, 0, 8 + R() * 26]));
  }
  const camera = cam(42, [0, 0, 0], [0, 0, 0]);
  const update = (k, t) => {
    const a = D(-30) + k * Math.PI * 2;
    const r = 4.6;
    camera.position.set(FALL_X + Math.sin(a) * r, y + 0.4 - 0.6 * Math.sin(k * Math.PI), FALL_Z + 0.4 + Math.cos(a) * r);
    // never through the wall: when the camera would be inside the tower, it stays just in front of it
    if (camera.position.z < 0.6) camera.position.z = 0.6;
    camera.lookAt(FALL_X, y + 0.1, FALL_Z);
  };
  update(0, 0);
  return { scene: s, camera, far: 1500, update };
}

// ── 06:12:03: who looks ───────────────────────────────────────────────────────────────────────────
/** 21 · 21st floor: the letter on the table; the father at the window sees, the children run to the glass. */
async function s21() {
  const P = await piano(21, { W: 4.4, Dp: 4.0, H: 2.7, wall: '#c8c4ba', lampI: 1.2, lamp: '#f2e6c8' });
  const { s, y0 } = P;
  s.add(boxMesh(1.4, 0.76, 0.8, '#8a8274', [0.3, y0, -1.6]));
  const letter = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.3), new THREE.MeshBasicMaterial({ map: canvasTex(256, 360, (c, w, h) => {
    c.fillStyle = '#f2efe6'; c.fillRect(0, 0, w, h); c.fillStyle = '#1a1a1a'; c.font = 'bold 22px "DejaVu Sans", sans-serif';
    c.fillText('LICENZIAMENTO', 20, 60); c.fillText('COLLETTIVO', 20, 90);
    c.font = '14px "DejaVu Sans", sans-serif'; for (let y = 130; y < 330; y += 22) c.fillRect(20, y, 200 - (y % 3) * 20, 3);
  }) }));
  letter.rotation.x = -Math.PI / 2;
  letter.position.set(0.1, y0 + 0.77, -1.45);
  letter.userData.id = nextId();
  s.add(letter);
  const dad = await person('man', 'stand', [-0.3, y0, -3.5], 180, { wear: { top: '#5a5a58', bottom: '#2a2a2c', hair: '#1c1814' } });
  const mum = await person('woman', 'sitChair', [0.75, y0 + 0.02, -1.0], 180, { wear: { top: '#8a8a88', bottom: '#3a3a3a', hair: '#2a1d16' } });
  const kid1 = await person('boy', 'stand', [-1.3, y0, -1.2], 160, { wear: { top: '#d0ccc4', bottom: '#3a3a40', hair: '#2a1d16' } });
  const kid2 = await person('girl', 'stand', [1.5, y0, -1.5], -160, {});
  s.add(dad, mum, kid1, kid2);
  const update = (k, t) => {
    P.drop(t, 0.9, -0.2);
    const run = ramp(t, 1.5, 2.8);
    kid1.position.set(lerp(-1.3, -0.9, run), y0, lerp(-1.2, -3.6, run));
    kid2.position.set(lerp(1.5, 0.6, run), y0, lerp(-1.5, -3.6, run));
    mum.rotation.y = D(180);
  };
  return { scene: s, camera: cam(44, [0.2, y0 + 1.35, 1.6], [0, y0 + 1.3, -5]), far: 1500, update, screens: [{ name: 'lettera', mode: 'paper', mesh: letter }] };
}
/** 22 · 18th floor: the field hands' room, mattresses on the floor; the man praying opens his eyes and looks up. */
async function s22() {
  const P = await piano(18, { W: 5.0, Dp: 4.4, H: 2.7, wall: '#a8a49c', floorC: '#6a6660', lampI: 0.7, lamp: '#e8e0d0' });
  const { s, y0 } = P;
  for (const [x, z] of [[-1.8, -1.2], [-1.8, -2.4], [-1.8, -3.6], [1.8, -1.2], [1.8, -2.4], [1.8, -3.6], [0, -3.9]]) s.add(boxMesh(0.8, 0.12, 1.9, '#cfcbc2', [x, y0, z + 0.3]));
  const men = [];
  for (const [x, z, rot, pose] of [[-1.8, -1.6, 90, 'sitFloor'], [1.8, -2.2, -90, 'sitFloor'], [-1.6, -3.4, 60, 'stand'], [1.5, -1.0, -120, 'stand']]) {
    const m = await person('man', pose, [x, y0 + (pose === 'sitFloor' ? 0.12 : 0), z], rot, { wear: { top: ['#4a4a4a', '#6a6a68', '#3a3a3a', '#7a7a78'][men.length], bottom: '#2a2a2c', hair: '#1c1814' } });
    s.add(m);
    men.push(m);
  }
  // praying: kneeling on the mattress, facing the window
  const pr = await person('beard', 'sitFloor', [0, y0 + 0.12, -2.0], 180, { wear: { top: '#e2e0da', bottom: '#e2e0da' }, aim: { Spine: [0, 1, 0.35], Spine1: [0, 1, 0.3], Neck: [0, 1, 0.3], Head: [0, 0.8, 0.6], LeftArm: [0.25, -0.6, 0.6], LeftForeArm: [0.1, 0.3, 0.9], RightArm: [-0.25, -0.6, 0.6], RightForeArm: [-0.1, 0.3, 0.9] } });
  s.add(pr);
  const update = (k, t) => {
    P.drop(t, 1.0);
    set(pr, mixAims(pr.baseAims, { Spine: [0, 1, -0.05], Spine1: [0, 1, -0.05], Neck: [0, 1, -0.2], Head: [0, 1, -0.6] }, ramp(t, 1.5, 2.3)));
  };
  return { scene: s, camera: cam(46, [0, y0 + 1.3, 1.6], [0, y0 + 1.15, -5]), far: 1500, update };
}
/** 23a · 15th floor: a boy puts a speaker on the sill and turns it on. */
async function s23a() {
  const P = await piano(15, { W: 3.6, Dp: 3.6, H: 2.7, ww: 1.4, sill: 0.95, wall: '#b4b0a8', lampI: 0.6 });
  const { s, y0 } = P;
  const boy = await person('teen', 'stand', [0.05, y0, -3.0], 180, { wear: { top: '#2a2a2c', bottom: '#4a4a4c' }, aim: { LeftArm: [0.25, -0.2, 0.9], LeftForeArm: [0.1, 0.1, 1], RightArm: [-0.25, -0.2, 0.9], RightForeArm: [-0.1, 0.1, 1] } });
  s.add(boy);
  const sp = boxMesh(0.42, 0.3, 0.22, '#1a1a1c');
  s.add(sp);
  const update = (k, t) => {
    P.drop(t, 1.1, 0.4);
    sp.position.set(0.05, y0 + 0.95, lerp(-3.4, -3.62, ramp(t, 0, 0.8)));
  };
  update(0, 0);
  return { scene: s, camera: cam(44, [0.3, y0 + 1.45, 0.9], [0, y0 + 1.25, -5]), far: 1500, update };
}
/** 23b · the music fills the courtyard: the camera flies out over it; windows open, people lean out. */
async function s23b() {
  const s = new THREE.Scene();
  alba(s);
  s.fog = new THREE.Fog('#c8c6c0', 40, 260);
  // a courtyard of old blocks, eight storeys round a well, laundry across it
  const ft = facadeTex(9);
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
  ft.repeat.set(2, 0.2);
  const walls = [];
  for (const [x, z, ry] of [[0, -22, 0], [0, 22, Math.PI], [-22, 0, Math.PI / 2], [22, 0, -Math.PI / 2]]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(44, 26), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.95 }));
    w.position.set(x, 13, z);
    w.rotation.y = ry;
    w.receiveShadow = true;
    w.userData.id = nextId();
    s.add(w);
    walls.push(w);
  }
  s.add(plane(44, 44, '#5a5a58', [0, 0, 0]));
  for (let i = 0; i < 6; i++) s.add(beam([-22, 6 + i * 3, -14 + i * 5], [22, 5 + i * 3, -12 + i * 5], 0.015, '#3a3a3a'));
  const R = rng(13);
  for (let i = 0; i < 40; i++) s.add(boxMesh(0.5 + R() * 0.4, 0.6 + R() * 0.4, 0.02, R() < 0.5 ? '#e8e6e0' : '#8a8a88', [-20 + R() * 40, 4 + Math.floor(R() * 6) * 3, -14 + Math.floor(R() * 6) * 5]));
  // people leaning out of the windows, more and more of them
  const leaners = [];
  for (let i = 0; i < 18; i++) {
    const side = i % 4;
    const fl = 1 + Math.floor(R() * 7);
    const along = -16 + R() * 32;
    const pos = side === 0 ? [along, fl * 3, -21.2] : side === 1 ? [along, fl * 3, 21.2] : side === 2 ? [-21.2, fl * 3, along] : [21.2, fl * 3, along];
    const rot = [0, 180, 90, -90][side];
    const p = await person(['man', 'woman', 'oldman', 'boy'][i % 4], 'stand', pos, rot, { aim: { Spine: [0, 1, 0.45], Head: [0, 0.9, 0.4], LeftArm: [0.3, -0.5, 0.8], RightArm: [-0.3, -0.5, 0.8] } });
    p.visible = false;
    p.userData.at = 0.6 + R() * 5.5;
    s.add(p);
    leaners.push(p);
  }
  const camera = cam(60, [0, 0, 0], [0, 0, 0]);
  const update = (k, t) => {
    // out of the window on the fifteenth floor of the near side, across, up, round
    const a = k * Math.PI * 0.9;
    camera.position.set(lerp(-6, 8, k), lerp(16, 22, ease(k)), lerp(20, -6, ease(k)));
    camera.lookAt(Math.sin(a) * 18, lerp(10, 8, k), lerp(-10, -22, k));
    for (const p of leaners) p.visible = t > p.userData.at;
  };
  update(0, 0);
  return { scene: s, camera, far: 600, update };
}
/** 24 · 12th floor: the substitute teacher marking homework before her second job. She puts the pen down. */
async function s24() {
  const P = await piano(12, { W: 3.8, Dp: 3.6, H: 2.7, wall: '#c8c4bc', lampI: 1.2, lamp: '#f2e6c8' });
  const { s, y0 } = P;
  s.add(boxMesh(1.2, 0.72, 0.7, '#8a8274', [0, y0, -1.75]));
  for (let i = 0; i < 6; i++) s.add(boxMesh(0.21, 0.01, 0.3, '#ece8de', [-0.35 + (i % 3) * 0.25, y0 + 0.72 + Math.floor(i / 3) * 0.01, -1.65 + (i % 2) * 0.05]));
  const tch = await person('woman', 'sitChair', [0, y0 + 0.02, -2.3], 0, { wear: { top: '#6a6a6c', bottom: '#3a3a3c', hair: '#1c1814' }, aim: { LeftArm: [0.2, -0.7, 0.7], LeftForeArm: [0.1, -0.15, 1], RightArm: [-0.2, -0.7, 0.7], RightForeArm: [-0.1, -0.15, 1], Head: [0, 0.75, 0.65] } });
  s.add(tch);
  const update = (k, t) => {
    P.drop(t, 0.5, -0.5);
    set(tch, mixAims(tch.baseAims, { Head: [0, 1, -0.1], RightForeArm: [-0.1, -0.5, 0.8] }, ramp(t, 0.9, 1.5)));
    twist(tch, D(80) * ramp(t, 0.9, 1.8));
  };
  return { scene: s, camera: cam(40, [0.1, y0 + 1.62, 0.1], [0, y0 + 1.1, -4]), far: 1500, update };
}
/** 25 · 9th floor: an eviction on the landing; the furniture out, two officers, the bailiff, a woman with a child.
 * The red goes by in the landing's window: everybody turns, the officers too. */
async function s25() {
  const P = await piano(9, { W: 5.0, Dp: 3.6, H: 2.7, ww: 1.0, wh: 1.4, sill: 1.0, wall: '#a8a6a0', floorC: '#6a6862', lampI: 0.9, lamp: '#e8e8e0' });
  const { s, y0 } = P;
  s.add(boxMesh(0.9, 1.9, 0.5, '#6a6258', [-2.0, y0, -2.8]));
  s.add(boxMesh(1.4, 0.2, 1.9, '#d0ccc2', [1.7, y0 + 0.3, -2.6]));
  s.add(boxMesh(0.5, 0.5, 0.5, '#8a8274', [1.2, y0, -1.2]));
  s.add(boxMesh(0.45, 0.9, 0.45, '#7a7266', [-1.4, y0, -1.0]));
  const cops = [];
  for (const [x, z, rot] of [[-0.9, -1.7, 40], [-0.2, -2.0, 20]]) {
    const c = await person('man', 'stand', [x, y0, z], rot, { wear: { top: '#1c1e24', bottom: '#1c1e24', hair: '#1c1814' } });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), clay('#1c1e24'));
    c.updateMatrixWorld(true);
    const hb = c.bones.Head, ws = hb.getWorldScale(new THREE.Vector3()).x;
    cap.position.set(0, 0.2 / ws, 0.01 / ws);
    cap.scale.setScalar(1 / ws);
    hb.add(cap);
    s.add(c);
    cops.push(c);
  }
  const bailiff = await person('oldman', 'stand', [0.6, y0, -1.5], -40, { wear: { top: '#4a4a48', bottom: '#3a3a38' }, aim: { RightArm: [-0.2, -0.6, 0.7], RightForeArm: [0, 0.3, 1] } });
  const mum = await person('woman', 'stand', [1.4, y0, -0.6], -60, { wear: { top: '#8a8a88', bottom: '#4a4a48', hair: '#1c1814' }, aim: { LeftArm: [0.1, -0.6, 0.6], LeftForeArm: [-0.4, 0.2, 0.9], RightArm: [-0.1, -0.6, 0.6], RightForeArm: [0.4, 0.2, 0.9] } });
  const kid = await person('girl', 'stand', [1.75, y0, -0.45], 220, {});
  s.add(bailiff, mum, kid);
  const update = (k, t) => {
    P.drop(t, 0.9);
    const u = ramp(t, 1.4, 2.4);
    // everybody turns to the window, the officers too
    for (const [c, r0] of [[cops[0], 40], [cops[1], 20], [bailiff, -40], [mum, -60]]) c.rotation.y = D(lerp(r0, 180, u));
  };
  return { scene: s, camera: cam(48, [0.3, y0 + 1.45, 2.6], [0.1, y0 + 1.3, -5]), far: 1500, update };
}

// ── 06:12:05: the landing ─────────────────────────────────────────────────────────────────────────
const RAISE2 = { LeftArm: [0.18, 1, 0.1], LeftForeArm: [0.1, 1, 0.1], RightArm: [-0.18, 1, 0.1], RightForeArm: [-0.1, 1, 0.1], Head: [0, 0.7, -0.7], Neck: [0, 1, -0.3] };
/** The square at the foot of the tower: everybody, arms up; the flares. */
async function piazza(s, { n = 34, seed = 7, near = [], clear = null } = {}) {
  alba(s);
  citta(s);
  torre(s, { floors3d: [0, 6] });
  const R = rng(seed);
  const crowd = [];
  const kinds = ['man', 'woman', 'oldman', 'woman', 'man', 'beard', 'boy', 'teen'];
  const spots = [...near];
  for (let i = 0; i < n; i++) {
    const x = -10 + R() * 20, z = 4 + R() * 14;
    if (clear && Math.hypot(x - clear[0], z - clear[1]) < clear[2]) continue;
    spots.push([x, z]);
  }
  for (const [i, [x, z]] of spots.entries()) {
    const p = await person(kinds[i % kinds.length], 'stand', [x, 0, z], 180 + (R() - 0.5) * 30, { seed: 600 + i, aim: RAISE2 });
    p.userData.base = p.aimNow ?? p.baseAims;
    s.add(p);
    crowd.push(p);
  }
  // the flares: red smoke, the one other red thing
  const flares = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const puffs = [];
    for (let j = 0; j < 30; j++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), clay('#c41a14'));
      m.userData.id = REDPROP;
      g.add(m);
      puffs.push({ m, ph: j / 30, dx: (R() - 0.5) * 1.2, dz: (R() - 0.5) * 1.2 });
    }
    let fx, fz;
    do { fx = -8 + R() * 16; fz = 5 + R() * 12; } while (clear && Math.hypot(fx - clear[0], fz - clear[1]) < 3.5);
    g.position.set(fx, 2.2, fz);
    g.userData.id = REDPROP;
    s.add(g);
    flares.push({ g, puffs, start: R() * 4 });
  }
  const smoke = (t) => {
    for (const f of flares) {
      const age = Math.max(0, t - f.start);
      for (const p of f.puffs) {
        const u = (age * 0.18 + p.ph) % 1;
        const on = age > p.ph * 3;
        p.m.visible = on;
        p.m.scale.setScalar(0.08 + u * 0.55);
        p.m.position.set(p.dx * (0.1 + u * 1.2) + 2.6 * u * u, u * 7.5, p.dz * (0.1 + u * 1.2) - 0.8 * u * u);
      }
    }
  };
  return { crowd, smoke };
}
/** 27 · from the ground, against the light: the crowd, arms up; very high, the red coming down; the flares. */
async function s27() {
  const s = new THREE.Scene();
  const C = [0.4, 12];
  const { smoke } = await piazza(s, { clear: [...C, 1.0], near: [[-0.9, 10.6], [0.8, 10.2], [-0.2, 9.3], [1.7, 11.3], [-1.9, 11.1], [0.4, 8.1], [-1.4, 7.9], [2.1, 9.0]] });
  const f = await faller();
  s.add(f);
  // from inside the crowd, between the raised arms, up at the tower
  const camera = cam(75, [C[0], 0.55, C[1]], [-1.0, 0.55 + 14.3, C[1] - 10]);
  const update = (k, t) => {
    smoke(t + 2);
    const y = lerp(140, 34, ease(k));
    f.position.set(FALL_X, y, FALL_Z + 2);
    f.rotation.set(-1.2, t * 0.3, 0.1);
    f.scale.setScalar(1.6);
  };
  update(0, 0);
  return { scene: s, camera, far: 1500, update };
}
/** 28 · the billboard. A boy climbs on the kiosk and, as in La Haine, changes one letter: the V of VOSTRO becomes
 * an N, in red. The spray strokes follow N_STROKES; the painter lays the billboard's own frames over it. */
export const N_STROKES = [   // [t0, t1, from, to] in billboard pixels (1600 × 600), the N drawn over the V
  [2.0, 2.8, [236, 384], [236, 236]],
  [2.8, 3.7, [236, 236], [330, 384]],
  [3.7, 4.5, [330, 384], [330, 236]],
];
const BILL = { w: 24, h: 9, x: 0, y: 5.0, z: 0.45 };
const billWorld = ([px, py]) => [BILL.x - BILL.w / 2 + (px / 1600) * BILL.w, BILL.y + BILL.h / 2 - (py / 600) * BILL.h, BILL.z];
export function sprayAt(t) {
  for (const [t0, t1, a, b] of N_STROKES) if (t < t1) return lerp3(a, b, clamp01((t - t0) / (t1 - t0)));
  return N_STROKES.at(-1)[3];
}
async function s28() {
  const s = new THREE.Scene();
  alba(s);
  citta(s);
  torre(s, { floors3d: [0, 5] });
  // the news kiosk under the billboard, shutters down at dawn
  s.add(boxMesh(2.4, 2.6, 1.8, '#5a5852', [-7.9, 0, 1.6]));
  s.add(boxMesh(2.7, 0.08, 2.1, '#3a3a38', [-7.9, 2.6, 1.6]));
  const boy = await person('teen', 'stand', [-8.05, 2.68, 0.85], 180, { wear: { top: '#2a2a2c', bottom: '#3a3a40' } });
  s.add(boy);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 10), clay('#d0ccc4'));
  s.add(can);
  const bill = s.userData.billboard;
  const rest = { RightArm: [-0.15, -1, 0.1], RightForeArm: [-0.1, -0.6, 0.6] };
  const update = (k, t) => {
    // the arm straight at the point being sprayed, from the shoulder; local x is his left, he faces -z
    const S = boneAt(boy, 'RightArm');
    const T = new THREE.Vector3(...billWorld(sprayAt(t)));
    const d = T.sub(S).normalize();
    const reach = [-d.x, d.y, -d.z];
    const on = ramp(t, 1.1, 1.9) * (1 - ramp(t, 4.7, 5.3));
    set(boy, mixAims(boy.baseAims, { ...mixAims(rest, { RightArm: reach, RightForeArm: reach }, on), Head: lerp3([0, 0.85, 0.5], [0, 1, -0.6], ramp(t, 5.0, 5.8)) }, 1));
    hold(boy, can, 'Right', [0, 0.05, -0.04]);
  };
  update(0, 0);
  // wide on the slogan, then in to the boy and the letter
  const camera = cam(22, [-5.4, 1.7, 22], [-5.0, 5.2, 0]);
  return {
    scene: s, camera, far: 1500, screens: [{ name: 'cartellone', mode: 'paper', mesh: bill }],
    update: (k, t) => {
      update(k, t);
      const u = ramp(t, 1.0, 3.2) * 0.85 + ramp(t, 3.2, 6.0) * 0.15;
      camera.position.set(lerp(-5.4, -7.3, u), lerp(1.7, 2.3, u), lerp(22, 9.5, u));
      camera.lookAt(lerp(-5.0, -7.7, u), lerp(5.2, 4.1, u), 0);
    },
  };
}
/** 29 · the raised hands in front of us; the red, a metre above them. */
async function s29() {
  const s = new THREE.Scene();
  const { smoke } = await piazza(s, { n: 24, seed: 9, clear: [0.2, 15, 1.0], near: [[-0.6, 13.6], [0.9, 13.2], [-1.5, 12.4], [0.2, 12.0], [1.8, 12.6]] });
  const f = await faller();
  s.add(f);
  const camera = cam(64, [0.2, 1.2, 15], [-0.5, 9, 4]);
  const update = (k, t) => {
    smoke(t + 8);
    const y = lerp(13, 3.7, ease(k));
    f.position.set(-0.6, y, 9);
    f.rotation.set(-1.35, 0.3 + t * 0.2, 0.1);
  };
  update(0, 0);
  return { scene: s, camera, far: 1500, update };
}

export const SHOTS = {
  s04, s05, s06, s07, s08,
  s09: fallShot(49.3, 46.8), s13: fallShot(40.4, 38.9, { side: -1 }), s20: fallShot(24.4, 21.8), s26: fallShot(8.6, 4.6, { side: -1 }),
  s10, s11, s12, s14, s15, s16, s17, s18, s19, s21, s22, s23a, s23b, s24, s25, s27, s28, s29,
};
