// The kit of MAGENTA: the same stage, people and helpers as A PARTE (copied from its panels3d.js), exported.
import { THREE, person, posed, boxMesh, plane, clay, PROTAGONIST, REDPROP, nextId } from '/a-parte/engine3d/stage.js';
export { THREE, person, posed, boxMesh, plane, clay, PROTAGONIST, REDPROP, nextId };

const D = THREE.MathUtils.degToRad;

function cam(fov, pos, target, far = 2000) {
  const c = new THREE.PerspectiveCamera(fov, (globalThis.STAGE_SIZE?.[0] ?? 1920) / (globalThis.STAGE_SIZE?.[1] ?? 804), 0.05, far);
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
/**
 * The protagonist: the red one, on a man's body (square shoulders, straight flanks), with hair. As a man the
 * light passes through him; as a child he still had a shadow. Seated or leaning, he still breathes (idle).
 */
// no hair cap: in flat red any cap reads as a hat; a round head is what the reference photograph shows
const HIM = { hide: ['Wolf3D_Headwear', 'Wolf3D_Beard'], face: false, dress: false };
async function him(pose, opts = {}) {
  const clip = ['walk', 'idle', 'run'].includes(pose);
  const base = { ...HIM, t: 1.3, ...opts, id: PROTAGONIST };
  const o = clip ? await person('readyplayer.me', { clip: pose, ...base }) : await posed('readyplayer.me', pose, { clip: 'idle', rate: 0.8, ...base });
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
    teengirl: ['Michelle', { scale: 0.9, trimHead: { r: 0.55 }, bob: 0.38, bobShape: [0.5, 0.44, -0.1, 1.1] }],
    boy: ['Xbot', { kid: true, scale: 0.62, hair: 0.34 }],
    teen: ['Xbot', { scale: 0.92, hair: 0.3 }],
    grown: ['Xbot', { hair: 0.32 }],
  }[kind];
  const [name, base] = k;
  const o = { ...base, ...opts, aim: { ...(ARMS[opts.arms] ?? {}), ...(opts.aim ?? {}) } };
  if (['walk', 'run', 'idle', 'hvwalk', 'samba', 'hvidle'].includes(pose)) return person(name, { ...o, clip: pose });
  // nobody holds still: a posed body breathes on an idle clip under its pose
  return posed(name, pose, { clip: 'idle', t: ((opts.pos?.[0] ?? 0) * 3.1 + (opts.pos?.[2] ?? 0) * 1.7) % 6 + 6, rate: 0.9, ...o });
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

function emissive(w, h, d, pos, v = 1.6, color = null) {
  const e = color ? new THREE.Color(color).multiplyScalar(v) : new THREE.Color(v, v * 0.95, v * 0.85);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: e }));
  m.position.set(...pos);
  m.userData.id = nextId();
  return m;
}

/** A thin bar between two points (pillars of a car's greenhouse, poles, rails). */
function beam(a, b, t = 0.06, tone = 0.3) { // tone: grey level or colour
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

function shaft(from, to, r0, r1, color = '#ffd9a0', opacity = 0.18) {
  const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to);
  const len = A.distanceTo(B);
  const geo = new THREE.CylinderGeometry(r1, r0, len, 32, 1, true);
  geo.translate(0, -len / 2, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOp: { value: opacity }, uLen: { value: len } },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ vY = -position.y; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOp; uniform float uLen; varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ float along = clamp(vY/uLen,0.0,1.0); float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
        gl_FragColor = vec4(uColor * uOp * edge * pow(1.0-along, 1.3), 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(A);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), B.clone().sub(A).normalize());
  m.userData.colorOnly = true;
  m.castShadow = m.receiveShadow = false;
  return m;
}

/** A sky: a dome coloured from the horizon up, unlit, never fogged. */
function sky(stops, radius = 900) {
  const geo = new THREE.SphereGeometry(radius, 48, 24);
  const col = [];
  const c = new THREE.Color();
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const e = Math.max(-0.1, p.getY(i) / radius);
    let k = 0;
    while (k < stops.length - 2 && e > stops[k + 1][0]) k++;
    const [e0, c0] = stops[k], [e1, c1] = stops[k + 1];
    c.set(c0).lerp(new THREE.Color(c1), Math.min(1, Math.max(0, (e - e0) / (e1 - e0))));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  m.userData.id = nextId();
  return m;
}


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


export { D, cam, shadowed, ARMS, grey, clamp01, ease, easeIn, mixAims, mirror, arc, canvasTex, sheet, emissive, beam, hold, shaft, sky, waves };
