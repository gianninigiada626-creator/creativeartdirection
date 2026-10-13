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
export function clay(v = 0.72, opts = {}) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(v, v, v), roughness: 0.92, metalness: 0, ...opts });
}

// ── people ──
const CLIPS = { hvidle: ['HVGirl', 'Idle'], hvwalk: ['HVGirl', 'Walking'], idle: ['Xbot', 'idle'], walk: ['Xbot', 'walk'], run: ['Xbot', 'run'], sad: ['Xbot', 'sad_pose'], sneak: ['Xbot', 'sneak_pose'], samba: ['Michelle', 'SambaDance'], swalk: ['Soldier', 'Walk'], sidle: ['Soldier', 'Idle'] };

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
  // sample a base clip for a natural rest pose — only on the rig it was made for; other rigs are
  // posed entirely by aiming (their bind poses differ, a borrowed clip would twist them)
  const [src, clipName] = CLIPS[opts.clip ?? 'idle'];
  const native = src === name;
  const sg = await gltf(src);
  let clip = native ? sg.animations.find((a) => a.name === clipName) : null;
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
    mixer.setTime(opts.t ?? 0); // the bones keep the sampled pose; the mixer is simply never updated again
  }
  // aim bones at directions given in the character's own frame (+z forward, +y up, +x its left)
  obj.rotation.y = D(opts.rotY ?? 0);
  obj.updateMatrixWorld(true);
  const aims = native ? opts.aim ?? {} : { ...POSE.stand.aim, ...(opts.aim ?? {}) };
  for (const [bn, dir] of Object.entries(aims)) aim(obj, bones, bn, dir);
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
    const cap = new THREE.Mesh(new THREE.SphereGeometry(hh * 0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), clay(opts.hair));
    const ws = bones.Head.getWorldScale(new THREE.Vector3()).x;
    cap.scale.set(1 / ws, 1.05 / ws, 1.08 / ws);
    cap.position.set(0, (hh * 0.62) / ws, (-hh * 0.08) / ws);
    cap.castShadow = true;
    bones.Head.add(cap);
  }
  const tone = opts.tone ?? 0.7;
  obj.traverse((o) => {
    if (o.isMesh && !o.material.userData?.keep) {
      o.material = clay(tone);
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
    }
  });
  obj.scale.setScalar(opts.scale ?? 1);
  obj.position.set(...(opts.pos ?? [0, 0, 0]));
  obj.position.y -= opts.drop ?? 0;
  obj.rotation.y = D(opts.rotY ?? 0);
  obj.userData.id = opts.id ?? nextId();
  obj.updateMatrixWorld(true);
  obj.bones = bones;
  return obj;
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
  sitChair: {
    drop: 0.5,
    aim: {
      Spine: [0, 1, 0.02], Spine1: [0, 1, 0.05], Spine2: [0, 1, 0.05], Neck: [0, 1, 0.1],
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

export function renderPasses(scene, camera, { far = 200 } = {}) {
  const meshes = [];
  scene.traverse((o) => o.isMesh && meshes.push(o));
  const orig = meshes.map((o) => o.material);
  const bg = scene.background;
  const fog = scene.fog;
  const out = {};
  // colour, as lit
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  out.color = renderer.domElement.toDataURL('image/png');
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  scene.fog = null;
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
  scene.background = bg;
  scene.fog = fog;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return out;
}
