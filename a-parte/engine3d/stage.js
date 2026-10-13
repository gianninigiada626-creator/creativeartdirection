// The stage for the A PARTE boards: real perspective, real bodies (Mixamo rigs), soft shadows.
// Each panel renders four passes that the Python stylizer turns into graphite and one red figure:
//   color  — grey clay under the scene's light (shadows included)
//   normal — view-space normals, for creases and folds
//   depth  — linear view depth packed in 24 bits, for silhouettes
//   id     — flat colours per object; the protagonist is pure red, red props (the sun, tail lights) too
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export { THREE };
export const W = 1920;
export const H = 804;

export const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);

const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath('/muerto/node_modules/three/examples/jsm/libs/draco/');
loader.setDRACOLoader(draco);
const cache = {};

const fbx = new FBXLoader();

async function gltf(name) {
  if (!cache[name]) {
    if (name.endsWith('.fbx')) {
      // FBX characters come in centimetres: wrap them so the rest of the stage sees metres
      cache[name] = fbx.loadAsync(`/a-parte/engine3d/models/${name}`).then((g) => {
        const root = new THREE.Group();
        g.scale.setScalar(0.01);
        root.add(g);
        return { scene: root, animations: g.animations };
      });
    } else cache[name] = loader.loadAsync(`/a-parte/engine3d/models/${name}.glb`);
  }
  return cache[name];
}

// ── materials ──
/** A matte material: a grey level (linear), or a colour as '#rrggbb' (sRGB) or [r, g, b] (linear). */
export function clay(v = 0.72, opts = {}) {
  const color = typeof v === 'number' ? new THREE.Color(v, v, v) : Array.isArray(v) ? new THREE.Color(...v) : new THREE.Color(v);
  return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, ...opts });
}

// ── wardrobe: every grey person gets a body and clothes in colour ──
const SKINS = ['#f1c9a5', '#e0ac85', '#c68c63', '#a8714f', '#8a5a3c', '#5e3b28', '#f3d2bb', '#d4a07a'];
const HAIRS = ['#2a1d16', '#3b2a1e', '#1a1514', '#5a3c22', '#7a5530', '#141210', '#4a3a30', '#b08a5a'];
const CLOTH = ['#2e4a6b', '#c49a3a', '#3f6b5c', '#6b4a6e', '#8a8f5a', '#1f2a3a', '#d7cbb0', '#5a6670', '#b56a2e', '#2f5f73', '#7d6a4f', '#454b5e', '#a8b4b0', '#3a3530'];
export function wardrobe(seed) {
  let r = (seed * 9301 + 49297) % 233280;
  const pick = (a) => a[(r = (r * 9301 + 49297) % 233280) % a.length];
  return { skin: pick(SKINS), hair: pick(HAIRS), top: pick(CLOTH), bottom: pick(CLOTH), shoes: pick(['#1c1a19', '#3a2a20', '#2a2f38', '#d9d4c8']) };
}
const PART = (bn) => (/Head|Neck|Eye/.test(bn) ? 'skin' : /Hand/.test(bn) ? 'hands' : /Foot|Toe/.test(bn) ? 'shoes' : /Hips|UpLeg|Leg/.test(bn) ? 'bottom' : 'top');
const RPM = { Wolf3D_Head: 'skin', Wolf3D_Body: 'skin', Wolf3D_Outfit_Top: 'top', Wolf3D_Outfit_Bottom: 'bottom', Wolf3D_Outfit_Footwear: 'shoes', Wolf3D_Beard: 'hair', Wolf3D_Headwear: 'hat', EyeLeft: 'eyes', EyeRight: 'eyes', Wolf3D_Teeth: 'teeth' };
const HVMAT = { hair: 'hair', skin: 'skin', 'T-shirt': 'top', short: 'bottom', brown: 'shoes', belt: 'dark', black: 'dark', white: 'teeth', pupil: 'eyes', iris: 'eyes', 'iris dark': 'eyes' };
function dress(obj, c) {
  const col = { ...c, hands: c.sleeves === 'long' ? c.top : c.skin, eyes: '#15100e', teeth: '#e8e2d6', dark: '#1d1a19', hat: c.hat ?? c.top };
  const mat = (k) => new THREE.MeshStandardMaterial({ color: new THREE.Color(col[k] ?? col.top), roughness: 0.85 });
  obj.traverse((o) => {
    if (!o.isMesh) return;
    if (RPM[o.name]) return (o.material = mat(RPM[o.name]));
    if (Array.isArray(o.material) && o.material.some((m) => HVMAT[m.name])) return (o.material = o.material.map((m) => mat(HVMAT[m.name] ?? 'top')));
    if (o.material?.userData?.hair) return (o.material = mat('hair'));
    if (!o.isSkinnedMesh) return (o.material = mat('top'));
    // a single body: colour each vertex by the bone that moves it most
    const g = o.geometry.clone();
    const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const arr = new Float32Array(si.count * 3);
    const cache = {};
    for (let i = 0; i < si.count; i++) {
      let best = 0, bw = -1;
      for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > bw) (bw = sw.getComponent(i, k)), (best = si.getComponent(i, k));
      const bn = o.skeleton.bones[best].name.replace(/^mixamorig:?/, '');
      const key = PART(bn);
      const cc = (cache[key] ??= new THREE.Color(col[key] ?? col.top));
      arr[i * 3] = cc.r;
      arr[i * 3 + 1] = cc.g;
      arr[i * 3 + 2] = cc.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    o.geometry = g;
    o.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  });
}

// ── people ──
const CLIPS = { hvidle: ['HVGirl', 'Idle'], hvwalk: ['HVGirl', 'Walking'], idle: ['Xbot', 'idle'], walk: ['Xbot', 'walk'], run: ['Xbot', 'run'], sad: ['Xbot', 'sad_pose'], sneak: ['Xbot', 'sneak_pose'], samba: ['Michelle', 'SambaDance'], swalk: ['Soldier', 'Walk'], sidle: ['Soldier', 'Idle'] };

const samplers = {};
async function sampler(src, clipName) {
  const key = `${src}:${clipName}`;
  if (!samplers[key]) {
    const g = await gltf(src);
    const obj = SkeletonUtils.clone(g.scene);
    const bones = boneMap(obj);
    const { bind } = bindOf(obj, bones);
    let clip = g.animations.find((a) => a.name === clipName).clone();
    clip.tracks = clip.tracks.filter((tr) => tr.name.endsWith('.quaternion') || /Hips\.position$/.test(tr.name));
    const mixer = new THREE.AnimationMixer(obj);
    mixer.clipAction(clip).play();
    samplers[key] = { obj, bones, bind, mixer, dur: clip.duration };
  }
  return samplers[key];
}

/**
 * Every rig into the same T-pose (spine up, arms out with palms down, legs down, feet forward), so a clip
 * made on one body moves another the same way whatever pose each was modelled in. Bones are aimed along
 * their chain and twisted so a second landmark (across the palm, along the foot, across the shoulders) agrees.
 */
const T_POSE = [
  ['Hips', 'Spine', [0, 1, 0], ['RightUpLeg', 'LeftUpLeg', [1, 0, 0]]],
  ['Spine', 'Spine1', [0, 1, 0], ['RightArm', 'LeftArm', [1, 0, 0]]],
  ['Spine1', 'Spine2', [0, 1, 0], ['RightArm', 'LeftArm', [1, 0, 0]]],
  ['Spine2', 'Neck', [0, 1, 0], ['RightArm', 'LeftArm', [1, 0, 0]]],
  ['Neck', 'Head', [0, 1, 0], null],
  ['Head', 'HeadTop_End', [0, 1, 0], ['RightEye', 'LeftEye', [1, 0, 0]]],
  ['LeftShoulder', 'LeftArm', [1, 0, 0], null],
  ['LeftArm', 'LeftForeArm', [1, 0, 0], ['LeftHandPinky1', 'LeftHandIndex1', [0, 0, 1]]],
  ['LeftForeArm', 'LeftHand', [1, 0, 0], ['LeftHandPinky1', 'LeftHandIndex1', [0, 0, 1]]],
  ['LeftHand', 'LeftHandMiddle1', [1, 0, 0], ['LeftHandPinky1', 'LeftHandIndex1', [0, 0, 1]]],
  ['RightShoulder', 'RightArm', [-1, 0, 0], null],
  ['RightArm', 'RightForeArm', [-1, 0, 0], ['RightHandPinky1', 'RightHandIndex1', [0, 0, 1]]],
  ['RightForeArm', 'RightHand', [-1, 0, 0], ['RightHandPinky1', 'RightHandIndex1', [0, 0, 1]]],
  ['RightHand', 'RightHandMiddle1', [-1, 0, 0], ['RightHandPinky1', 'RightHandIndex1', [0, 0, 1]]],
  ['LeftUpLeg', 'LeftLeg', [0, -1, 0], ['LeftFoot', 'LeftToeBase', [0, 0, 1]]],
  ['LeftLeg', 'LeftFoot', [0, -1, 0], ['LeftFoot', 'LeftToeBase', [0, 0, 1]]],
  ['LeftFoot', 'LeftToeBase', [0, -0.45, 1], null],
  ['RightUpLeg', 'RightLeg', [0, -1, 0], ['RightFoot', 'RightToeBase', [0, 0, 1]]],
  ['RightLeg', 'RightFoot', [0, -1, 0], ['RightFoot', 'RightToeBase', [0, 0, 1]]],
  ['RightFoot', 'RightToeBase', [0, -0.45, 1], null],
];

function aimTwist(obj, bones, name, childName, dir, sec) {
  const b = bones[name], c = bones[childName];
  if (!b || !c) return;
  const oq = obj.getWorldQuaternion(new THREE.Quaternion());
  const wp = (x) => x.getWorldPosition(new THREE.Vector3());
  obj.updateMatrixWorld(true);
  const want = new THREE.Vector3(...dir).normalize().applyQuaternion(oq);
  const cur = wp(c).sub(wp(b)).normalize();
  let delta = new THREE.Quaternion().setFromUnitVectors(cur, want);
  const apply = (dq) => {
    const wq = b.getWorldQuaternion(new THREE.Quaternion());
    const pq = b.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    b.quaternion.copy(pq.multiply(dq.multiply(wq)));
    b.updateMatrixWorld(true);
  };
  apply(delta);
  if (sec && bones[sec[0]] && bones[sec[1]]) {
    obj.updateMatrixWorld(true);
    const flat = (v) => v.sub(want.clone().multiplyScalar(v.dot(want))).normalize();
    const v = flat(wp(bones[sec[1]]).sub(wp(bones[sec[0]])));
    const w = flat(new THREE.Vector3(...sec[2]).applyQuaternion(oq));
    if (v.lengthSq() > 0.5 && w.lengthSq() > 0.5) {
      const ang = Math.atan2(v.clone().cross(w).dot(want), v.dot(w));
      apply(new THREE.Quaternion().setFromAxisAngle(want, ang));
    }
  }
}

function bindOf(obj, bones) {
  const saved = Object.fromEntries(Object.entries(bones).map(([n, b]) => [n, b.quaternion.clone()]));
  obj.updateMatrixWorld(true);
  for (const [n, c, dir, sec] of T_POSE) aimTwist(obj, bones, n, c, dir, sec);
  obj.updateMatrixWorld(true);
  const inv = obj.getWorldQuaternion(new THREE.Quaternion()).invert();
  const bind = {};
  for (const [n, b] of Object.entries(bones)) bind[n] = { q: inv.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())), p: b.position.clone() };
  for (const [n, b] of Object.entries(bones)) b.quaternion.copy(saved[n]);
  obj.updateMatrixWorld(true);
  const order = Object.keys(bones).sort((a, b) => depth(bones[a]) - depth(bones[b]));
  return { bind, order };
}
const depth = (o) => (o.parent ? 1 + depth(o.parent) : 0);

function retarget(obj, S, t) {
  S.mixer.setTime(((t % S.dur) + S.dur) % S.dur);
  S.obj.updateMatrixWorld(true);
  const rootInv = obj.getWorldQuaternion(new THREE.Quaternion()).invert();
  const tmp = new THREE.Quaternion();
  for (const n of obj.rig.order) {
    const sb = S.bones[n], tb = obj.bones[n];
    if (!sb || !S.bind[n] || /Hand.+\d|Eye/.test(n)) continue;
    const delta = sb.getWorldQuaternion(tmp).multiply(S.bind[n].q.clone().invert());
    const want = delta.multiply(obj.rig.bind[n].q);
    const parentRel = rootInv.clone().multiply(tb.parent.getWorldQuaternion(new THREE.Quaternion()));
    tb.quaternion.copy(parentRel.invert().multiply(want));
    if (n === 'Hips' && S.bind.Hips.p.y) tb.position.y = obj.rig.bind.Hips.p.y * (sb.position.y / S.bind.Hips.p.y);
    tb.updateMatrixWorld(true);
  }
}

/** Where a face is, in the head bone's own frame: measured once on the bind pose from the head's own vertices. */
function faceFrame(obj, bones) {
  const head = bones.Head;
  if (!head) return null;
  obj.updateMatrixWorld(true);
  const Hinv = head.matrixWorld.clone().invert();
  const hq = head.getWorldQuaternion(new THREE.Quaternion()).invert();
  const oq = obj.getWorldQuaternion(new THREE.Quaternion());
  const ax = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(oq).applyQuaternion(hq).normalize();
  const L = ax(1, 0, 0), U = ax(0, 1, 0), F = ax(0, 0, 1);
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  const v = new THREE.Vector3();
  obj.traverse((m) => {
    if (!m.isSkinnedMesh || !m.visible || /Headwear|Beard|Hair|Teeth|Eye/.test(m.name)) return;
    const hi_ = m.skeleton.bones.indexOf(head);
    const { skinIndex: si, skinWeight: sw } = m.geometry.attributes;
    const idx = m.geometry.index ? new Set(m.geometry.index.array) : null;
    for (let i = 0; i < si.count; i++) {
      if (idx && !idx.has(i)) continue;
      let w = 0;
      for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === hi_) w += sw.getComponent(i, k);
      if (w < 0.6) continue;
      m.getVertexPosition(i, v);
      v.applyMatrix4(m.matrixWorld).applyMatrix4(Hinv);
      const a = [v.dot(L), v.dot(U), v.dot(F)];
      for (let k = 0; k < 3; k++) (lo[k] = Math.min(lo[k], a[k])), (hi[k] = Math.max(hi[k], a[k]));
    }
  });
  if (lo[0] > hi[0]) return null;
  return { L, U, F, lo, hi };
}

// a face, as fractions of the head's box: [side (−1 right … 1 left), height (0 chin … 1 crown), depth (0 back … 1 nose)]
const FACE = {
  eyeL: [0.36, 0.52, 0.86], eyeR: [-0.36, 0.52, 0.86], browLi: [0.13, 0.62, 0.9], browLo: [0.55, 0.61, 0.82], browRi: [-0.13, 0.62, 0.9], browRo: [-0.55, 0.61, 0.82],
  noseTop: [0, 0.5, 0.95], noseTip: [0, 0.36, 1.0], mouthL: [0.22, 0.2, 0.9], mouthR: [-0.22, 0.2, 0.9], mouthC: [0, 0.2, 0.94], chin: [0, 0.04, 0.88],
  cheekL: [0.5, 0.34, 0.8], cheekR: [-0.5, 0.34, 0.8], center: [0, 0.45, 0.5],
};

function boneMap(root) {
  const m = {};
  root.traverse((o) => {
    if (o.isBone) m[o.name.replace(/^mixamorig:?/, '')] = o;
  });
  return m;
}

const D = THREE.MathUtils.degToRad;

/**
 * A person: model name, a base clip sampled at time t, then local bone rotations (degrees, XYZ) on top.
 * opts: { clip, t, bones: {LeftArm: [x,y,z], ...}, pos: [x,y,z], rotY, scale, tone, id, kid, drop }
 */
export async function person(name, opts = {}) {
  const g = await gltf(name);
  const obj = SkeletonUtils.clone(g.scene);
  const bones = boneMap(obj);
  if (opts.trimHead) trimHead(obj, bones, opts.trimHead);
  for (const n of opts.hide ?? []) {
    const m = obj.getObjectByName(n);
    if (m) m.visible = false;
  }
  obj.rig = bindOf(obj, bones);
  obj.bones = bones;
  const face = opts.face !== false && opts.id !== PROTAGONIST ? faceFrame(obj, bones) : null;
  // sample a base clip for a natural rest pose — only on the rig it was made for; other rigs are
  // posed entirely by aiming (their bind poses differ, a borrowed clip would twist them)
  const [src, clipName] = CLIPS[opts.clip ?? 'idle'];
  const native = src === name;
  const sg = await gltf(src);
  let clip = native ? sg.animations.find((a) => a.name === clipName) : null;
  const borrowed = !native && opts.clip ? await sampler(src, clipName) : null;
  if (clip) {
    // rotations only: the root is placed by the scene, and rigs differ in units
    clip = clip.clone();
    clip.tracks = clip.tracks.filter((tr) => tr.name.endsWith('.quaternion'));
    if (!obj.getObjectByName(clip.tracks[0].name.split('.')[0])) clip.tracks.forEach((tr) => (tr.name = tr.name.replace(/^mixamorig:?/, '')));
  }
  if (clip) {
    const mixer = new THREE.AnimationMixer(obj);
    const act = mixer.clipAction(clip);
    act.play();
    mixer.setTime(opts.t ?? 0); // the bones keep the sampled pose until an animated shot moves the clock
    obj.mixer = mixer;
    obj.clipDur = clip.duration;
  }
  // aim bones at directions given in the character's own frame (+z forward, +y up, +x its left)
  obj.rotation.y = D(opts.rotY ?? 0);
  obj.updateMatrixWorld(true);
  if (borrowed) retarget(obj, borrowed, opts.t ?? 0);
  const aims = native || borrowed ? opts.aim ?? {} : { ...POSE.stand.aim, ...(opts.aim ?? {}) };
  for (const [bn, dir] of Object.entries(aims)) aim(obj, bones, bn, dir);
  obj.baseAims = aims;
  // the clock of an animated shot: the clip moves on, then the pose's own aims are laid back over it
  obj.tick = (t) => {
    const tt = (opts.t ?? 0) + t * (opts.rate ?? 1);
    if (obj.mixer) obj.mixer.setTime(tt);
    else if (borrowed) retarget(obj, borrowed, tt);
    obj.updateMatrixWorld(true);
    for (const [bn, dir] of Object.entries(obj.aimNow ?? obj.baseAims)) aim(obj, bones, bn, dir);
    obj.updateMatrixWorld(true);
  };
  for (const [bn, r] of Object.entries(opts.bones ?? {})) {
    const b = bones[bn];
    if (!b) continue;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(D(r[0]), D(r[1]), D(r[2]), 'XYZ'));
    b.quaternion.multiply(q);
  }
  if (opts.kid) {
    // a child: shorter limbs and spine, a bigger head
    bones.Head?.scale.setScalar(1.28);
    for (const k of ['LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg']) bones[k]?.scale.set(1, 0.86, 1);
  }
  if (opts.hair !== undefined && bones.Head && bones.HeadTop_End) {
    // a cap of hair for the bare mannequin: a squashed half-sphere on the skull
    obj.updateMatrixWorld(true);
    const top = bones.HeadTop_End.getWorldPosition(new THREE.Vector3());
    const base = bones.Head.getWorldPosition(new THREE.Vector3());
    const hh = top.distanceTo(base);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(hh * 0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), clay(opts.hair, { userData: { hair: true } }));
    const ws = bones.Head.getWorldScale(new THREE.Vector3()).x;
    cap.scale.set(1 / ws, 1.05 / ws, 1.08 / ws);
    cap.position.set(0, (hh * 0.62) / ws, (-hh * 0.08) / ws);
    cap.castShadow = true;
    bones.Head.add(cap);
  }
  if (opts.bob !== undefined && bones.Head && bones.HeadTop_End) {
    // hair for a trimmed head: a full rounded mass over the skull and the nape, the face left clear
    obj.updateMatrixWorld(true);
    const hh = bones.HeadTop_End.getWorldPosition(new THREE.Vector3()).distanceTo(bones.Head.getWorldPosition(new THREE.Vector3()));
    const ws = bones.Head.getWorldScale(new THREE.Vector3()).x;
    const [R, y, z, sy] = opts.bobShape ?? [0.58, 0.5, -0.14, 1.12];
    const bob = new THREE.Mesh(new THREE.SphereGeometry(hh * R, 28, 18), clay(opts.bob, { userData: { hair: true } }));
    bob.scale.set(1 / ws, sy / ws, 1.02 / ws);
    bob.position.set(0, (hh * y) / ws, (hh * z) / ws);
    bob.castShadow = true;
    bones.Head.add(bob);
  }
  const tone = opts.tone ?? 0.7;
  obj.traverse((o) => {
    if (o.isMesh && !o.material.userData?.keep) {
      o.material = clay(tone, { userData: { hair: !!o.material.userData?.hair } });
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
    }
  });
  if (opts.id !== PROTAGONIST && opts.dress !== false) dress(obj, { ...wardrobe(opts.seed ?? Math.floor((opts.pos?.[0] ?? 0) * 7 + (opts.pos?.[2] ?? 0) * 13 + 99)), ...(opts.wear ?? {}) });
  obj.scale.setScalar(opts.scale ?? 1);
  obj.position.set(...(opts.pos ?? [0, 0, 0]));
  obj.position.y -= opts.drop ?? 0;
  obj.rotation.y = D(opts.rotY ?? 0);
  obj.userData.id = opts.id ?? nextId();
  if (face) obj.userData.face = { ...face, expr: opts.expr ?? 'neutral', look: opts.look ?? null };
  obj.updateMatrixWorld(true);
  // for animated shots: re-aim bones (absolute directions, so it doesn't matter what pose they hold now)
  obj.aimAll = (a) => {
    for (const [bn, dir] of Object.entries(a)) aim(obj, bones, bn, dir);
    obj.updateMatrixWorld(true);
  };
  return obj;
}

/**
 * Cut away what sticks out of a skull (Michelle's flower-shaped hair puffs): triangles bound to the head
 * whose vertices lie further than `r` head-heights to either side of the head, or `up` above it.
 */
function trimHead(obj, bones, { r = 0.62, up = 9 } = {}) { // in the bind pose, before anything turns it
  obj.updateMatrixWorld(true);
  const head = bones.Head, top = bones.HeadTop_End;
  if (!head || !top) return;
  const hp = head.getWorldPosition(new THREE.Vector3());
  const tp = top.getWorldPosition(new THREE.Vector3());
  const hh = tp.distanceTo(hp);
  const v = new THREE.Vector3();
  obj.traverse((m) => {
    if (!m.isSkinnedMesh) return;
    const hi = m.skeleton.bones.indexOf(head);
    const g = m.geometry;
    const pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const out = new Uint8Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      let w = 0;
      for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === hi) w += sw.getComponent(i, k);
      if (w < 0.3) continue;
      m.getVertexPosition(i, v);
      v.applyMatrix4(m.matrixWorld);
      if (Math.abs(v.x - hp.x) > r * hh || v.y - hp.y > up * hh) out[i] = 1;
    }
    const idx = g.index ? g.index.array : [...Array(pos.count).keys()];
    // whole islands go: a puff whose tip sticks out takes its base with it (vertices welded by position)
    const key = new Map(), root = new Int32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const k = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
      root[i] = key.get(k) ?? (key.set(k, i), i);
    }
    const find = (a) => (root[a] === a ? a : (root[a] = find(root[a])));
    for (let t = 0; t < idx.length; t += 3) {
      const a = find(idx[t]), b = find(idx[t + 1]), c = find(idx[t + 2]);
      root[b] = a;
      root[find(c)] = a;
    }
    const bad = new Set();
    for (let i = 0; i < pos.count; i++) if (out[i]) bad.add(find(i));
    const keep = [];
    for (let t = 0; t < idx.length; t += 3) if (!bad.has(find(idx[t]))) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    m.geometry = g.clone();
    m.geometry.setIndex(keep);
  });
}

const CHILD = {
  Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head', Head: 'HeadTop_End',
  LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', LeftHand: 'LeftHandMiddle1',
  RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand', RightHand: 'RightHandMiddle1',
  LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase',
};

/** Rotate a bone so that the segment towards its child points along `dir` (character frame). */
function aim(obj, bones, name, dir) {
  const b = bones[name];
  const c = bones[CHILD[name]];
  if (!b || !c) return;
  obj.updateMatrixWorld(true);
  const pb = b.getWorldPosition(new THREE.Vector3());
  const pc = c.getWorldPosition(new THREE.Vector3());
  const cur = pc.sub(pb).normalize();
  const want = new THREE.Vector3(...dir).normalize().applyQuaternion(obj.getWorldQuaternion(new THREE.Quaternion()));
  const delta = new THREE.Quaternion().setFromUnitVectors(cur, want);
  const wq = b.getWorldQuaternion(new THREE.Quaternion());
  const pq = b.parent.getWorldQuaternion(new THREE.Quaternion());
  b.quaternion.copy(pq.invert().multiply(delta.multiply(wq)));
  b.updateMatrixWorld(true);
}

// poses as aims, applied parents first
export const POSE = {
  stand: {
    drop: 0,
    aim: {
      Spine: [0, 1, 0.02], Spine1: [0, 1, 0.02], Spine2: [0, 1, 0], Neck: [0, 1, 0.08], Head: [0, 1, 0.05],
      LeftShoulder: [1, -0.15, 0], RightShoulder: [-1, -0.15, 0],
      LeftArm: [0.18, -1, 0.02], LeftForeArm: [0.08, -1, 0.12], LeftHand: [0.05, -1, 0.1],
      RightArm: [-0.18, -1, 0.02], RightForeArm: [-0.08, -1, 0.12], RightHand: [-0.05, -1, 0.1],
      LeftUpLeg: [0.04, -1, 0], LeftLeg: [0, -1, -0.02], LeftFoot: [0, -0.45, 1],
      RightUpLeg: [-0.04, -1, 0], RightLeg: [0, -1, -0.02], RightFoot: [0, -0.45, 1],
    },
  },
  sitFloor: { // against a wall, legs stretched out
    drop: 0.82,
    aim: {
      Spine: [0, 1, -0.32], Spine1: [0, 1, -0.28], Spine2: [0, 1, -0.2], Neck: [0, 1, 0.15], Head: [0, 1, 0.25],
      LeftUpLeg: [0.12, -0.12, 1], LeftLeg: [0.05, -0.08, 1], LeftFoot: [0.15, 0.7, 0.7],
      RightUpLeg: [-0.1, -0.12, 1], RightLeg: [-0.1, -0.08, 1], RightFoot: [-0.15, 0.7, 0.7],
      LeftArm: [0.25, -1, 0.1], LeftForeArm: [0.2, -0.5, 0.9], RightArm: [-0.25, -1, 0.05], RightForeArm: [-0.15, -0.9, 0.5],
    },
  },
  lean: { drop: 0, aim: { Spine: [0, 1, -0.12], Spine1: [0, 1, -0.08], Neck: [0, 1, 0.12], Head: [0, 1, 0.1], LeftArm: [0.12, -1, -0.15], RightArm: [-0.12, -1, -0.15] } },
  sitChair: {
    drop: 0.5,
    aim: {
      LeftUpLeg: [0.08, -0.05, 1], LeftLeg: [0.02, -1, 0.08], LeftFoot: [0, -0.3, 1],
      RightUpLeg: [-0.08, -0.05, 1], RightLeg: [-0.02, -1, 0.08], RightFoot: [0, -0.3, 1],
      LeftArm: [0.15, -1, 0.35], LeftForeArm: [-0.1, -0.15, 1], RightArm: [-0.15, -1, 0.35], RightForeArm: [0.1, -0.15, 1],
    },
  },
};

export function posed(name, pose, extra = {}) {
  const P = POSE[pose];
  return person(name, { ...extra, drop: (extra.drop ?? 0) + P.drop * (extra.scale ?? 1), aim: { ...P.aim, ...(extra.aim ?? {}) } });
}

let _id = 10;
export function nextId() {
  return _id++;
}
export const PROTAGONIST = 1;
export const REDPROP = 2;

// ── set pieces ──
export function boxMesh(w, h, d, tone = 0.75, pos = [0, 0, 0], id) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), clay(tone));
  m.position.set(pos[0], pos[1] + h / 2, pos[2]);
  m.castShadow = m.receiveShadow = true;
  m.userData.id = id ?? nextId();
  return m;
}

export function plane(w, d, tone = 0.8, pos = [0, 0, 0], rotX = -Math.PI / 2, id) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), clay(tone, { side: THREE.DoubleSide }));
  m.rotation.x = rotX;
  m.position.set(...pos);
  m.receiveShadow = true;
  m.userData.id = id ?? nextId();
  return m;
}

// ── passes ──
const idOf = (o) => {
  let p = o;
  while (p) {
    if (p.userData.id !== undefined) return p.userData.id;
    p = p.parent;
  }
  return 0;
};

function idColor(id) {
  if (id === PROTAGONIST) return new THREE.Color(1, 0, 0);
  if (id === REDPROP) return new THREE.Color(1, 0, 1 / 255);
  // never red-like: green and blue stay above 0.3, so only the protagonist and red props read as red
  const h = Math.imul(id + 7, 2654435761) >>> 0;
  return new THREE.Color(((h >> 16) & 255) / 255, 0.3 + (((h >> 8) & 255) / 255) * 0.7, 0.3 + ((h & 255) / 255) * 0.7);
}

function depthMaterial(far) {
  const m = new THREE.MeshBasicMaterial();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFar = { value: far };
    sh.vertexShader = 'varying float vViewZ;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vViewZ = -mvPosition.z;');
    sh.fragmentShader = 'uniform float uFar; varying float vViewZ;\n' + sh.fragmentShader.replace(
      /}\s*$/,
      ' float d = clamp(vViewZ / uFar, 0.0, 1.0);\n vec3 e = fract(d * vec3(1.0, 255.0, 65025.0));\n e -= e.yzz * vec3(1.0/255.0, 1.0/255.0, 0.0);\n gl_FragColor = vec4(e, 1.0);\n}',
    );
  };
  return m;
}

/** Every visible face in the frame: its landmarks on screen, their depth, which way it looks. */
function facesOf(scene, camera) {
  const out = [];
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const camPos = camera.getWorldPosition(new THREE.Vector3());
  scene.traverse((o) => {
    const f = o.userData.face;
    if (!f || !o.bones?.Head || !o.visible) return;
    let vis = true;
    for (let p = o; p; p = p.parent) if (!p.visible) vis = false;
    if (!vis) return;
    const head = o.bones.Head;
    const pt = (k) => {
      const [a, b, c] = FACE[k];
      const sx = a >= 0 ? f.hi[0] * a : -f.lo[0] * a;
      const sy = f.lo[1] + (f.hi[1] - f.lo[1]) * b;
      const sz = f.lo[2] + (f.hi[2] - f.lo[2]) * c;
      const local = f.L.clone().multiplyScalar(sx).add(f.U.clone().multiplyScalar(sy)).add(f.F.clone().multiplyScalar(sz));
      return local.applyMatrix4(head.matrixWorld);
    };
    const pts = {};
    for (const k of Object.keys(FACE)) {
      const w = pt(k);
      const z = -w.clone().applyMatrix4(camera.matrixWorldInverse).z;
      const n = w.clone().project(camera);
      pts[k] = [(n.x * 0.5 + 0.5) * W, (1 - (n.y * 0.5 + 0.5)) * H, z];
    }
    const hq = head.getWorldQuaternion(new THREE.Quaternion());
    const fwd = f.F.clone().applyQuaternion(hq).normalize();
    const up = f.U.clone().applyQuaternion(hq).normalize();
    const c = pt('center');
    const toCam = camPos.clone().sub(c).normalize();
    // how big a head is on screen: crown to chin in pixels
    const a = pts.chin, b = pts.center;
    out.push({ id: o.userData.id, expr: f.expr, look: f.look, facing: fwd.dot(toCam), side: f.L.clone().applyQuaternion(hq).dot(toCam), tilt: up.dot(toCam), px: Math.hypot(a[0] - b[0], a[1] - b[1]) * 2.2, pts });
  });
  return out;
}

export function renderPasses(scene, camera, { far = 200 } = {}) {
  const meshes = [];
  scene.traverse((o) => o.isMesh && meshes.push(o));
  const orig = meshes.map((o) => o.material);
  const bg = scene.background;
  const fog = scene.fog;
  const out = { faces: JSON.stringify(facesOf(scene, camera)) };
  // colour, as lit
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  out.color = renderer.domElement.toDataURL('image/png');
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  scene.fog = null;
  const ghosts = meshes.filter((o) => o.userData.colorOnly && o.visible);
  ghosts.forEach((o) => (o.visible = false));
  // normals (keeping any normal map, so waves and fabric still draw)
  const nm = new THREE.MeshNormalMaterial();
  meshes.forEach((o, i) => (o.material = orig[i].normalMap ? new THREE.MeshNormalMaterial({ normalMap: orig[i].normalMap, normalScale: orig[i].normalScale }) : nm));
  scene.background = new THREE.Color(0.5, 0.5, 1.0);
  renderer.render(scene, camera);
  out.normal = renderer.domElement.toDataURL('image/png');
  // depth
  const dm = depthMaterial(far);
  meshes.forEach((o) => (o.material = dm));
  scene.background = new THREE.Color(1, 1, 1);
  renderer.render(scene, camera);
  out.depth = renderer.domElement.toDataURL('image/png');
  // ids
  const mats = new Map();
  meshes.forEach((o) => {
    const id = idOf(o);
    if (!mats.has(id)) mats.set(id, new THREE.MeshBasicMaterial({ color: idColor(id) }));
    o.material = mats.get(id);
  });
  scene.background = new THREE.Color(0, 0, 0);
  renderer.render(scene, camera);
  out.id = renderer.domElement.toDataURL('image/png');
  meshes.forEach((o, i) => (o.material = orig[i]));
  ghosts.forEach((o) => (o.visible = true));
  scene.background = bg;
  scene.fog = fog;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return out;
}
