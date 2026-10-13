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
  g.add(boxMesh(11, 0.1, 2.4, '#9a8030', [0, 2.97, 0]));
  for (let i = 0; i < 7; i++) g.add(boxMesh(1.3, 1.0, 2.54, '#1c2430', [-4.6 + i * 1.45, 1.55, 0]));
  g.add(boxMesh(0.06, 1.5, 2.3, '#1c2430', [5.49, 1.15, 0]));
  for (const dx of [3.9, -0.6]) g.add(boxMesh(1.1, 2.15, 2.53, '#8a7020', [dx, 0.45, 0]));
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

function buildings(s, z0, n, seed = 1, lit = 0.25, tone = '#20283a') {
  // a city block by block; its windows warm or television-blue, each with a moment it comes on (for night shots)
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const wins = [];
  for (let i = 0; i < n; i++) {
    const w = 8 + rnd() * 14;
    const h = 10 + rnd() * 40;
    const x = -90 + i * 13 + rnd() * 6;
    const z = z0 - rnd() * 40;
    s.add(boxMesh(w, h, 10, tone, [x, -20, z]));
    for (let fy = 0; fy < h / 3.2 - 1; fy++) {
      for (let fx = 0; fx < w / 3 - 1; fx++) {
        if (rnd() < lit) {
          const warm = rnd() < 0.8;
          const m = emissive(1.2, 1.4, 0.1, [x - w / 2 + 2 + fx * 3, -20 + 2 + fy * 3.2, z + 5.06], 1.0 + rnd() * 0.8, warm ? '#ffbe6a' : '#8fb4ff');
          m.userData.on = m.material.emissive.clone();
          m.userData.at = rnd() * 22;
          wins.push(m);
          s.add(m);
        }
      }
    }
  }
  return wins;
}

// ── light you can see, sky you can stand under ──
/** A soft cone of light in the air (haze). Drawn only in the colour pass. */
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

/** A painted band of hazard stripes and a bay number, the way car park pillars are marked. */
function pillarMarks(n) {
  return canvasTex(256, 512, (x, w, h) => {
    x.fillStyle = '#5d636c';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#d1a43a';
    x.fillRect(0, h - 120, w, 120);
    x.fillStyle = '#16171a';
    for (let i = -4; i < 10; i++) {
      x.beginPath();
      x.moveTo(i * 48, h);
      x.lineTo(i * 48 + 24, h);
      x.lineTo(i * 48 + 24 + 120, h - 120);
      x.lineTo(i * 48 + 120, h - 120);
      x.fill();
    }
    x.fillStyle = '#e8e2d2';
    x.font = 'bold 96px sans-serif';
    x.fillText(n, 60, 200);
  });
}

// ── PROLOGUE · the car park ──
const GARAGE_PILLARS = [[-9.6, -4.5], [-9.6, -10.5], [-9.6, -16.5], [-9.6, -22.5], [-3.6, -16.5], [2.4, -16.5], [7, -8]];
// what he sees, later: a woman in her car, a guard dancing, a boy counting the pillars
const WOMAN_CAR = { x: -4.2, z: -8.6, rotY: 72 };
const GUARD = [-0.8, -12.8];
const BOY = [-7.9, -4.2];
async function garageSet({ beam = 1, ambient = 0.55, lamp = 26, sodium = 1 } = {}) {
  // concrete gone blue in the dark, pools of sodium light, the floor's yellow lines, numbered pillars
  const s = new THREE.Scene();
  s.background = new THREE.Color('#04060b');
  const apron = plane(14, 9, '#565a61', [0, 0, 1.6]);
  s.add(apron);
  s.add(boxMesh(14, 0.12, 0.25, '#6d7076', [0, 0, -2.85]));
  const deck = plane(60, 40, '#383c43', [0, -0.12, -22]);
  s.add(deck);
  for (let i = -6; i <= 3; i++) {
    const line = plane(0.12, 4.8, '#d6a640', [i * 2.6 - 1.2, -0.115, -6.4]);
    line.rotation.z = D(8);
    line.userData.id = deck.userData.id;
    s.add(line);
  }
  const bayEnd = plane(24, 0.12, '#d6a640', [-2, -0.115, -3.9]);
  bayEnd.userData.id = deck.userData.id;
  s.add(bayEnd);
  for (const x of [-4.2, -1.0]) {
    const j = plane(0.035, 9, '#3a3d43', [x, 0.002, 1.6]);
    j.userData.id = apron.userData.id;
    s.add(j);
  }
  for (const z of [-0.6, 2.4]) {
    const j = plane(14, 0.035, '#3a3d43', [0, 0.002, z]);
    j.userData.id = apron.userData.id;
    s.add(j);
  }
  // oil stains where cars have stood
  for (const [x, z, r] of [[-3.5, -6.2, 0.7], [-0.8, -6.8, 0.55], [1.8, -6.3, 0.6], [-6.3, -6.6, 0.5]]) {
    const st = new THREE.Mesh(new THREE.CircleGeometry(r, 24), clay('#24272c'));
    st.rotation.x = -Math.PI / 2;
    st.position.set(x, -0.112, z);
    st.userData.id = deck.userData.id;
    s.add(st);
  }
  s.add(plane(60, 50, '#1c1f25', [0, 3.0, -15], Math.PI / 2));
  for (const z of [-2.5, -8.5, -14.5, -20.5]) s.add(boxMesh(60, 0.4, 0.45, '#24272e', [0, 2.6, z]));
  // the pillar he leans on, and others further out on the deck
  const pillar = (w, x, y, z, n) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 4.2, w), new THREE.MeshStandardMaterial({ map: pillarMarks(n), roughness: 0.9 }));
    m.position.set(x, y + 2.1, z);
    m.castShadow = m.receiveShadow = true;
    m.userData.id = nextId();
    return m;
  };
  s.add(pillar(1.3, 1.2, 0, -0.35, 'B17'));
  GARAGE_PILLARS.forEach(([x, z], i) => s.add(pillar(1.2, x, -0.12, z, `B${12 + i * 3}`)));
  s.add(new THREE.HemisphereLight('#2f5296', '#06080e', ambient * 1.5));
  // sodium lamps: a warm island under each, the rest left to the blue
  const lamps = [[-1.6, 2.75, 1.4, lamp / 26], [-6, 2.75, -6.5, 1], [3.2, 2.75, -10.5, 0.8], [-12, 2.75, -12, 0.9], [-3.5, 2.75, -18, 0.7]];
  for (const [x, y, z, k] of lamps) {
    if (!(k * sodium)) continue;
    const l = shadowed(new THREE.PointLight('#ffa64a', 13 * k * sodium, 7, 1.9), 1024);
    l.position.set(x, y, z);
    s.add(l);
    s.add(emissive(0.6, 0.06, 0.18, [x, y + 0.03, z], 2.2 * Math.min(1, k * sodium + 0.2), '#ffc27a'));
    s.add(shaft([x, y, z], [x, -0.1, z], 0.15, 2.2, '#ffb361', 0.07 * k * sodium));
  }
  if (beam) {
    const spot = shadowed(new THREE.SpotLight('#fff0d4', 300 * beam, 30, D(16), 0.55, 1.4), 2048);
    spot.position.set(-11, 0.75, -1.2);
    spot.target.position.set(2, 0.4, 0.2);
    s.add(spot, spot.target);
    const sh = shaft([-11, 0.75, -1.2], [2, 0.4, 0.2], 0.25, 3.4, '#fff1d8', 0.16 * beam);
    s.add(sh);
    spot.userData.shaft = sh;
    s.userData.beam = spot;
  }
  return s;
}

/** Point the headlight beam and its haze at a target. */
function aimBeam(spot, from, to) {
  spot.position.set(...from);
  spot.target.position.set(...to);
  const sh = spot.userData.shaft;
  if (sh) {
    sh.position.set(...from);
    sh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(...to).sub(new THREE.Vector3(...from)).normalize());
    sh.material.uniforms.uOp.value = 0.16 * (spot.intensity / 390);
  }
}


const HIM_AT_PILLAR = { pos: [0.3, 0, -0.25], rotY: -90 };

async function p01() {
  // dark; a car turns in and its lights find the pillar
  const s = await garageSet({ beam: 1.3, ambient: 0.06, lamp: 0, sodium: 0.12 });
  s.add(await him('sitFloor', HIM_AT_PILLAR));
  const spot = s.userData.beam, I = spot.intensity;
  const update = (k, t) => {
    const u = ease(clamp01((t - 1.5) / 7));
    spot.intensity = I * clamp01((t - 1) / 1.2);
    aimBeam(spot, [-11, 0.75, -9 + 7.8 * u], [2, 0.4, -9 + 9.2 * u]);
  };
  update(0, 8.5);
  return { scene: s, camera: cam(40, [-1.35, 1.5, 3.9], [0.05, 0.55, -0.55]), far: 80, update };
}


async function p02() {
  const s = await garageSet({ ambient: 0.3 });
  s.add(await him('sitFloor', HIM_AT_PILLAR));
  const spot = s.userData.beam, I = spot.intensity;
  const update = (k, t) => {
    const u = ease(clamp01((t - 3) / 8));
    spot.intensity = I * (1 - clamp01((t - 10) / 3));
    aimBeam(spot, [-11, 0.75, -1.2 + 5 * u], [2, 0.4, 0.2 + 7 * u]);
  };
  update(0, 4);
  return { scene: s, camera: cam(40, [-1.35, 1.5, 3.9], [0.05, 0.55, -0.55]), far: 80, update };
}


async function p03() {
  const s = await garageSet({ beam: 0, ambient: 0.3 });
  s.add(await him('sitFloor', HIM_AT_PILLAR));
  const c = car(-2.4, -7.2, 172, '#24414c', true);
  s.add(c);
  // the brake lights glow on the floor behind it
  const glow = new THREE.PointLight('#ff3a2a', 3, 4, 2);
  glow.position.set(0, 0.6, -2.6);
  c.add(glow);
  const update = (k, t) => {
    const u = clamp01((t - 1) / 9);
    c.position.z = -6.4 - 14 * easeIn(u);
    c.position.x = -2.4 + 0.9 * easeIn(u);
  };
  return { scene: s, camera: cam(30, [-2.6, 0.75, 2.2], [-0.4, 0.55, -4]), far: 80, update };
}


// ── I · SIX · the kitchen ──
async function kitchen() {
  // the table runs away from us: he sits at the far end, facing the camera, his chin at the tablecloth.
  // A Hopper evening: the lamp's amber over the table, the window's blue on everyone's back.
  const s = new THREE.Scene();
  s.background = new THREE.Color('#0a0c14');
  s.add(plane(10, 9, '#6b4a35', [0, 0, -1]));
  s.add(plane(10, 3, '#5d6650', [0, 1.5, -4.2], 0));
  const lw = plane(9, 3, '#535b48', [-2.6, 1.5, -1], 0);
  lw.rotation.y = Math.PI / 2;
  s.add(lw);
  const rw = plane(9, 3, '#535b48', [2.8, 1.5, -1], 0);
  rw.rotation.y = -Math.PI / 2;
  s.add(rw);
  s.add(plane(10, 9, '#2e261f', [0, 2.8, -1], Math.PI / 2));
  // window at the back, the blue hour; cupboards and the fridge on the left
  s.add(emissive(1.4, 1.1, 0.05, [1.3, 1.45, -4.17], 1.2, '#4d6fb8'));
  s.add(boxMesh(1.55, 0.06, 0.14, '#d9d0bf', [1.3, 0.88, -4.12]));
  s.add(boxMesh(0.04, 1.1, 0.06, '#d9d0bf', [1.3, 0.9, -4.15]));
  s.add(boxMesh(1.8, 0.9, 0.6, '#2f5557', [-1.4, 0, -3.9]));
  s.add(boxMesh(1.82, 0.04, 0.62, '#cbbfa6', [-1.4, 0.9, -3.9]));
  s.add(boxMesh(1.8, 0.7, 0.35, '#2f5557', [-1.4, 1.6, -4.0]));
  s.add(boxMesh(0.7, 1.8, 0.65, '#d6cdb8', [-2.2, 0, -3.0]));
  const T = { z0: -2.75, z1: -0.25, y: 0.74 };
  s.add(boxMesh(1.0, 0.05, T.z1 - T.z0, '#ece4d2', [0, T.y, (T.z0 + T.z1) / 2]));
  for (const [x, z] of [[-0.44, T.z0 + 0.06], [0.44, T.z0 + 0.06], [-0.44, T.z1 - 0.06], [0.44, T.z1 - 0.06]]) s.add(boxMesh(0.05, T.y, 0.05, '#4a3426', [x, 0, z]));
  const chair = (x, z, rot) => {
    const g = new THREE.Group();
    g.add(boxMesh(0.42, 0.04, 0.42, '#5a3d2a', [0, 0.44, 0]));
    g.add(boxMesh(0.42, 0.5, 0.04, '#5a3d2a', [0, 0.46, -0.2]));
    for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) g.add(boxMesh(0.03, 0.44, 0.03, '#4a3222', [dx, 0, dz]));
    g.position.set(x, 0, z);
    g.rotation.y = D(rot);
    g.userData.id = nextId();
    return g;
  };
  s.add(chair(-0.78, -1.15, 90), chair(0.78, -1.85, -90), chair(0, T.z0 - 0.3, 0));
  s.add(boxMesh(0.36, 0.14, 0.36, '#3f6b5c', [0, 0.46, T.z0 - 0.3]));
  const salt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.09, 12), clay('#f4f1ea'));
  const SALT0 = [0.08, T.y + 0.07, -1.5];
  salt.position.set(...SALT0);
  salt.userData.id = nextId();
  s.add(salt);
  for (const [x, z] of [[-0.25, -1.15], [0.25, -1.85], [0, -2.45]]) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.02, 24), clay('#f3efe6'));
    plate.position.set(x, T.y + 0.035, z);
    plate.userData.id = nextId();
    s.add(plate);
  }
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.09, 0.09, 24), clay('#c9a23a'));
  bowl.position.set(-0.05, T.y + 0.07, -0.75);
  bowl.userData.id = nextId();
  s.add(bowl);
  // the lamp over the table
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.24, 24, 1, true), clay('#1f4646', { side: THREE.DoubleSide }));
  shade.position.set(0, 1.9, -1.5);
  shade.userData.id = nextId();
  s.add(shade);
  s.add(beam([0, 2.02, -1.5], [0, 3, -1.5], 0.012, 0.2));
  s.add(emissive(0.1, 0.08, 0.1, [0, 1.8, -1.5], 3, '#ffd08a'));
  const bulb = shadowed(new THREE.PointLight('#ffb35e', 9, 5, 1.8), 1024);
  bulb.position.set(0, 1.74, -1.5);
  s.add(bulb);
  s.add(shaft([0, 1.8, -1.5], [0, 0.75, -1.5], 0.28, 0.9, '#ffbe73', 0.05));
  const win = shadowed(new THREE.DirectionalLight('#5c7fc8', 1.1), 1024, 4);
  win.position.set(1.4, 1.8, -7);
  win.target.position.set(0, 0.8, -1.5);
  s.add(win, win.target);
  s.add(new THREE.HemisphereLight('#3a4a78', '#1a1410', 0.4));
  // father behind his paper (left), sister in her headphones (right), mother at the window on the phone
  const dad = await grey('beard', 'sitChair', { pos: [-0.78, 0.0, -1.15], rotY: 90, arms: 'newspaper', expr: 'tired', wear: { skin: '#e0ac85', top: '#6b4a2f', bottom: '#2b2f38', hair: '#3b2a1e' } });
  s.add(dad);
  const paper = sheet(0.56, 0.4, canvasTex(256, 180, (x, w, h) => {
    x.fillStyle = '#e4ddcc';
    x.fillRect(0, 0, w, h);
    x.fillStyle = '#4a4540';
    for (let i = 0; i < 9; i++) x.fillRect(12, 34 + i * 16, w / 2 - 20, 6), x.fillRect(w / 2 + 8, 34 + i * 16, w / 2 - 20, 6);
    x.font = 'bold 26px serif';
    x.fillText('CRONACA', 14, 26);
  }), [0, 0, 0]);
  paper.material.side = THREE.DoubleSide;
  s.add(hold(dad, paper, 'Both', [0.04, 0.08, 0]));
  const sis = await grey('woman', 'sitChair', { pos: [0.78, 0.0, -1.85], rotY: -90, scale: 0.86, arms: 'headphones', expr: 'neutral', trimHead: { r: 0.75 }, bob: 0.3, bobShape: [0.46, 0.42, -0.12, 1.1], wear: { skin: '#e8b892', top: '#c49a3a', bottom: '#1f2a3a', hair: '#2a1d16' } });
  s.add(sis);
  const mum = await grey('woman', 'stand', { pos: [1.35, 0, -3.65], rotY: 160, arms: 'ear', expr: 'smile', wear: { skin: '#e8b892', top: '#5b3a5e', bottom: '#2a2a33', hair: '#3a2618' } });
  s.add(mum);
  const ph = phone();
  s.add(hold(mum, ph, 'Right'));
  const KID = { Head: [0, 1, 0.05], LeftArm: [0.2, -0.5, 0.8], LeftForeArm: [0, 0.05, 1] };
  const kid = await him('sitChair', { pos: [0, 0.4, T.z0 - 0.3], rotY: 0, kid: true, scale: 0.6, aim: KID });
  s.add(kid);
  // the salt, in five beats: "Il sale." — he reaches — she is quicker — it goes — his arm comes down
  const set = (o, a) => {
    o.aimNow = { ...o.baseAims, ...a };
    o.aimAll(o.aimNow);
  };
  const PAPER_UP = ARMS.newspaper;
  const PAPER_DOWN = { LeftArm: [0.25, -1, 0.5], LeftForeArm: [0.05, 0.05, 1], RightArm: [-0.25, -1, 0.5], RightForeArm: [-0.05, 0.05, 1], Head: [0, 0.95, 0.45] };
  const SIS_REST = ARMS.headphones;
  const SIS_REACH = { LeftArm: [0.25, -0.35, 1], LeftForeArm: [0.15, -0.1, 1], Head: [0.1, 0.9, 0.6] };
  const SIS_PASS = { LeftArm: [0.55, -0.3, 0.8], LeftForeArm: [0.6, -0.05, 0.8], Head: [0.4, 0.9, 0.5] };
  const KID_OFFER = { LeftArm: [0.05, 0.05, 1], LeftForeArm: [0, 0.12, 1], Head: [0, 1, 0.3] };
  const update = (k, t) => {
    const down = ease(clamp01((t - 5.0) / 0.7)) * (1 - ease(clamp01((t - 10.5) / 1.2)));
    set(dad, mixAims(PAPER_UP, PAPER_DOWN, down));
    hold(dad, paper, 'Both', [0.04, 0.08 - 0.05 * down, 0]);
    const reach = ease(clamp01((t - 6.4) / 0.8)), pass = ease(clamp01((t - 7.3) / 1.1)), back = ease(clamp01((t - 8.6) / 0.9));
    const nod = 0.12 * Math.sin(t * Math.PI * 2 * 1.9);
    let a = mixAims({ ...SIS_REST, Head: [0, 0.8 + nod, 0.7] }, SIS_REACH, reach);
    a = mixAims(a, SIS_PASS, pass);
    a = mixAims(a, { ...SIS_REST, Head: [0, 0.8 + nod, 0.7] }, back);
    set(sis, a);
    const sp = [SALT0[0] - 0.5 * pass, SALT0[1] + 0.06 * Math.sin(Math.PI * pass), SALT0[2] + 0.3 * pass];
    salt.position.set(...sp);
    const offer = ease(clamp01((t - 6.0) / 0.8)) * (1 - ease(clamp01((t - 9.6) / 1.8)));
    set(kid, mixAims(KID, KID_OFFER, offer));
    mum.rotation.y = D(160) + 0.25 * Math.sin(t * 0.45);
    hold(mum, ph, 'Right');
  };
  update(0, 7.6);
  return { scene: s, camera: cam(40, [0.05, 1.0, 2.5], [0, 0.88, -2.4]), far: 30, update };
}



// ── the fridge ──
async function fridge() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#0d1018');
  s.add(plane(6, 4, '#5a4030', [0, 0, 0]));
  s.add(plane(6, 3, '#535b48', [0, 1.5, -0.4], 0));
  s.add(boxMesh(0.7, 1.8, 0.65, '#d8cfba', [0, 0, 0]));
  s.add(boxMesh(0.7, 0.012, 0.66, '#9a9282', [0, 1.25, 0]));
  s.add(boxMesh(0.03, 0.5, 0.04, '#7a7670', [0.28, 0.95, 0.34]));
  s.add(boxMesh(1.4, 0.9, 0.6, '#2f5557', [1.08, 0, -0.05]));
  s.add(boxMesh(1.42, 0.04, 0.62, '#cbbfa6', [1.08, 0.9, -0.05]));
  const drawn = (label, fn) => canvasTex(256, 330, (x, w, h) => {
    x.fillStyle = '#f4f1e8';
    x.fillRect(0, 0, w, h);
    x.lineWidth = 7;
    fn(x, w, h);
    x.fillStyle = '#2f4f8a';
    x.font = 'bold 34px sans-serif';
    x.fillText(label, 20, h - 24);
  });
  const sheets = [
    [drawn('BRAVA!', (x) => { x.strokeStyle = '#d9a321'; x.beginPath(); x.arc(70, 70, 40, 0, 7); x.stroke(); x.strokeStyle = '#2f6b8a'; x.strokeRect(70, 150, 120, 100); x.strokeStyle = '#3f7a4a'; x.beginPath(); x.moveTo(60, 150); x.lineTo(130, 100); x.lineTo(200, 150); x.stroke(); }), [-0.15, 1.42, 0.33], -0.05, '#2f8a8a'],
    [drawn('10 e lode', (x) => { x.strokeStyle = '#2f4f8a'; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(30, 40 + i * 35); x.lineTo(220, 40 + i * 35); x.stroke(); } }), [0.15, 1.38, 0.33], 0.06, '#d9a321'],
    [drawn('BRAVA!', (x) => { x.strokeStyle = '#6b4a8a'; x.beginPath(); x.ellipse(128, 120, 70, 50, 0, 0, 7); x.stroke(); }), [-0.1, 0.98, 0.33], 0.03, '#3a6bb0'],
  ];
  for (const [t, p, r, mc] of sheets) {
    s.add(sheet(0.24, 0.31, t, p, [0, 0, r]));
    const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16), clay(mc));
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
  update(0, 4);
  s.add(new THREE.HemisphereLight('#4a5a88', '#151210', 0.6));
  const l = shadowed(new THREE.PointLight('#ffb35e', 7, 5, 1.6), 1024);
  l.position.set(-1.2, 2.1, 1.4);
  s.add(l);
  return { scene: s, camera: cam(36, [0.12, 1.08, 1.85], [0.12, 1.02, 0]), far: 20, update };
}



// ── the classroom (and, twenty years later, the meeting room) ──
async function room(s, { Wd = 8, Dp = 10, Ht = 3.3, wall = '#cdb98a', floor = '#7a5a3e', ceil = '#d9d2c0', frame = '#e8e2d2' } = {}) {
  const L = -Wd / 2, R = Wd / 2, B = -Dp + 1.5, F = 1.5;
  s.add(plane(Wd, Dp, floor, [0, 0, (B + F) / 2]));
  s.add(plane(Wd, Dp, ceil, [0, Ht, (B + F) / 2], Math.PI / 2));
  s.add(plane(Wd, Ht, wall, [0, Ht / 2, B], 0));
  const rw = plane(Dp, Ht, wall, [R, Ht / 2, (B + F) / 2], 0);
  rw.rotation.y = -Math.PI / 2;
  s.add(rw);
  const wins = [[-6.6, -4.8], [-4.0, -2.2], [-1.4, 0.4]];
  const wallId = nextId();
  const seg = (z0, z1, y0, y1) => s.add(boxMesh(0.2, y1 - y0, z1 - z0, wall, [L - 0.1, y0, (z0 + z1) / 2], wallId));
  seg(B, F, 0, 0.95);
  seg(B, F, 2.75, Ht);
  let z = B;
  for (const [a, b] of wins) {
    seg(z, a, 0.95, 2.75);
    z = b;
  }
  seg(z, F, 0.95, 2.75);
  for (const [a, b] of wins) s.add(boxMesh(0.06, 1.8, 0.06, frame, [L - 0.05, 0.95, (a + b) / 2], wallId));
  return { L, R, B, F, Ht, wins };
}


async function child(i, pose, opts) {
  if (i % 2) return grey('girl', pose, { ...opts, scale: 0.052 * (0.95 + (i % 3) * 0.04) });
  return grey('boy', pose, { ...opts, scale: 0.6 + (i % 3) * 0.03, hair: 0.3 + (i % 4) * 0.08 });
}

async function aula() {
  // morning, sun through the windows in shafts; the teacher asks, the children shout, his hand goes up and stays
  const s = new THREE.Scene();
  s.background = new THREE.Color('#bcd2ea');
  const { B, L, wins } = await room(s, { wall: '#cbb486', floor: '#7a5a3e', ceil: '#d8d0bc' });
  s.add(boxMesh(4.2, 1.2, 0.06, '#24402f', [0.3, 1.0, B + 0.03]));
  s.add(boxMesh(4.3, 0.06, 0.12, '#6b4a30', [0.3, 0.95, B + 0.08]));
  s.add(boxMesh(1.6, 0.78, 0.7, '#6b4a30', [-1.6, 0, B + 1.6]));
  const rows = [-0.4, -1.9, -3.4, -4.9];
  const cols = [-2.6, -0.85, 0.9, 2.65];
  const kids = [];
  let k = 0;
  for (const rz of rows) {
    for (const cx of cols) {
      s.add(boxMesh(0.7, 0.04, 0.5, '#a07c52', [cx, 0.7, rz - 0.45]));
      for (const [dx, dz] of [[-0.3, -0.2], [0.3, -0.2], [-0.3, 0.2], [0.3, 0.2]]) s.add(boxMesh(0.03, 0.7, 0.03, '#3a3c40', [cx + dx, 0, rz - 0.45 + dz]));
      s.add(boxMesh(0.36, 0.04, 0.34, '#2f5f73', [cx, 0.4, rz + 0.12]));
      for (const [dx, dz] of [[-0.15, -0.13], [0.15, -0.13], [-0.15, 0.13], [0.15, 0.13]]) s.add(boxMesh(0.025, 0.4, 0.025, '#3a3c40', [cx + dx, 0, rz + 0.12 + dz]));
      if (rz === -0.4 && cx === 0.9) continue;
      const c = await child(k++, 'sitChair', { pos: [cx, 0.03, rz + 0.12], rotY: 180, seed: k * 7 + 3 });
      kids.push(c);
      s.add(c);
    }
  }
  const teacher = await grey('woman', 'stand', { pos: [0.6, 0, B + 0.75], rotY: 0, expr: 'smile', wear: { skin: '#e0ac85', top: '#3f6b5c', bottom: '#2a2a33', hair: '#4a3020' } });
  s.add(teacher);
  const RAISE = ARMS.raise;
  const me = await him('sitChair', { pos: [0.9, 0.03, -0.28], rotY: 180, kid: true, scale: 0.64 });
  s.add(me);
  s.add(new THREE.HemisphereLight('#c8d8f0', '#5a4632', 0.9));
  const sun = shadowed(new THREE.DirectionalLight('#ffd6a0', 4.2), 2048, 9);
  sun.position.set(-9, 6.5, -1.5);
  sun.target.position.set(1, 0, -2.5);
  s.add(sun, sun.target);
  for (const [a, b] of wins) s.add(shaft([L, 2.4, (a + b) / 2], [L + 5.5, 0, (a + b) / 2 - 1.2], 0.9, 1.3, '#ffe1aa', 0.06));
  const set = (o, a) => {
    o.aimNow = { ...o.baseAims, ...a };
    o.aimAll(o.aimNow);
  };
  const WRITE = { RightArm: [-0.3, 0.7, 0.6], RightForeArm: [-0.1, 0.9, 0.4] };
  const update = (kk, t) => {
    // the teacher faces the class to ask, then turns to the board and writes
    const turn = ease(clamp01((t - 6.5) / 1.0));
    teacher.rotation.y = D(180 * turn);
    set(teacher, turn > 0.6 ? mixAims({}, WRITE, clamp01((turn - 0.6) / 0.4)) : {});
    // "Sììì!": a few hands shoot up and come down
    kids.forEach((c, i) => {
      if (i % 3) return;
      const u = ease(clamp01((t - 2.5 - (i % 5) * 0.05) / 0.3)) * (1 - ease(clamp01((t - 3.6) / 0.5)));
      set(c, mixAims({}, i % 2 ? RAISE : mirror(RAISE), u));
    });
    // his hand goes up after theirs, and stays
    set(me, mixAims({}, RAISE, ease(clamp01((t - 4.0) / 0.6))));
  };
  update(0, 9);
  return { scene: s, camera: cam(54, [-0.2, 0.98, 1.6], [0.5, 0.95, -6]), far: 40, update };
}


async function riunione() {
  // the same frame as the classroom, twenty years taller: cold light, a whiteboard, him at the end of the table
  const s = new THREE.Scene();
  s.background = new THREE.Color('#9fb2c8');
  const { B, L, wins } = await room(s, { wall: '#8e979c', floor: '#3e464d', ceil: '#b8bec0', frame: '#cfd4d6' });
  s.add(boxMesh(3.6, 1.3, 0.04, '#eef0ee', [0.3, 0.9, B + 0.03]));
  s.add(boxMesh(1.5, 0.05, 6.2, '#2f3439', [0.4, 0.74, -3.6]));
  s.add(boxMesh(0.12, 0.74, 5.6, '#25292d', [0.4, 0, -3.6]));
  const kinds = ['man', 'woman', 'grown', 'beard', 'woman', 'man', 'grown', 'woman'];
  const exprs = ['focus', 'tired', 'neutral', 'focus', 'neutral', 'tired', 'focus', 'neutral'];
  let k = 0;
  for (const z of [-1.4, -2.9, -4.4, -5.9]) {
    for (const side of [-1, 1]) {
      if (z === -1.4 && side === 1) continue; // his place, the end of the table
      s.add(boxMesh(0.48, 0.45, 0.48, '#1c2026', [0.4 + side * 1.05, 0, z]));
      s.add(await grey(kinds[k % kinds.length], 'sitChair', { pos: [0.4 + side * 1.05, 0.03, z], rotY: side > 0 ? -90 : 90, expr: exprs[k % exprs.length], seed: 40 + k++ * 5 }));
    }
  }
  const boss = await grey('man', 'stand', { pos: [1.4, 0, B + 1.1], rotY: 0, aim: ARMS.point, expr: 'neutral', wear: { top: '#1f2a3a', bottom: '#1f2a3a', skin: '#e0ac85' } });
  s.add(boss);
  s.add(boxMesh(0.48, 0.45, 0.48, '#1c2026', [1.45, 0, -1.4]));
  s.add(await him('sitChair', { pos: [1.45, 0.03, -1.4], rotY: -90 }));
  s.add(new THREE.HemisphereLight('#c9d6e2', '#3a4248', 1.0));
  for (const z of [-2, -5]) {
    s.add(emissive(1.4, 0.04, 0.3, [0.4, 3.26, z], 2.2, '#e8fff4'));
    const l = new THREE.PointLight('#e6f6f0', 7, 8, 1.4);
    l.position.set(0.4, 3.0, z);
    s.add(l);
  }
  const sun = shadowed(new THREE.DirectionalLight('#c8d8ea', 1.6), 2048, 9);
  sun.position.set(-9, 6.5, -1.5);
  sun.target.position.set(1, 0, -2.5);
  s.add(sun, sun.target);
  for (const [a, b] of wins) s.add(shaft([L, 2.4, (a + b) / 2], [L + 5, 0, (a + b) / 2 - 1], 0.9, 1.2, '#cfe0f0', 0.035));
  const OPEN = { RightArm: [-0.4, -0.2, 0.9], RightForeArm: [-0.3, 0.2, 1], LeftArm: [0.4, -0.2, 0.9], LeftForeArm: [0.3, 0.2, 1] };
  const update = (kk, t) => {
    const u = 0.5 + 0.5 * Math.sin(t * 1.3);
    boss.aimNow = { ...boss.baseAims, ...mixAims(ARMS.point, OPEN, u) };
    boss.aimAll(boss.aimNow);
  };
  update(0, 3);
  return { scene: s, camera: cam(54, [-0.2, 1.4, 1.6], [0.5, 1.15, -6]), far: 40, update };
}


// ── the playground, the wall ──
async function cortile() {
  // late afternoon: long shadows on the asphalt, the school gone gold, the others running into it
  const s = new THREE.Scene();
  s.background = new THREE.Color('#8fa6c8');
  s.add(sky([[-0.1, '#e8b980'], [0.0, '#f0c48a'], [0.08, '#c9b39a'], [0.25, '#7f9cc4'], [1.0, '#4a6aa0']]));
  s.add(plane(80, 80, '#3d434e', [0, 0, -10]));
  const line = plane(30, 0.14, '#efe9da', [0, 0.003, 0]);
  s.add(line);
  s.add(boxMesh(40, 7, 1, '#c79f62', [0, 0, -26]));
  s.add(boxMesh(40.6, 0.5, 1.6, '#6b5646', [0, 7, -26]));
  for (let i = 0; i < 9; i++) s.add(boxMesh(2, 1.6, 0.1, '#33445a', [-16 + i * 4, 3.5, -25.45]));
  for (let i = 0; i < 9; i++) s.add(boxMesh(2, 1.6, 0.1, '#33445a', [-16 + i * 4, 1.0, -25.45]));
  // the goal at the far end, the others running towards it
  s.add(boxMesh(0.1, 2, 0.1, '#efe9da', [-1.8, 0, -18]));
  s.add(boxMesh(0.1, 2, 0.1, '#efe9da', [1.8, 0, -18]));
  s.add(boxMesh(3.7, 0.1, 0.1, '#efe9da', [0, 2, -18]));
  const runners = [[-2.5, -6, 0.1], [-1, -7.5, 0.35], [0.6, -5.5, 0.6], [2, -8, 0.2], [-3.4, -9, 0.5], [1.2, -10, 0.8], [3.2, -6.8, 0.45], [-0.2, -9.6, 0.15]];
  let k = 0;
  const kids = [];
  for (const [x, z, t] of runners) {
    const girl = k++ % 2;
    const o = girl ? await grey('girl', 'hvwalk', { pos: [x, 0, z], rotY: 180 + (x * -3), t: t * 1.2, seed: k * 11 }) : await grey('boy', 'run', { pos: [x, 0, z], rotY: 180 + x * -3, t, seed: k * 11 });
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
  };
  update(0, 2.2);
  s.add(new THREE.HemisphereLight('#9fb6dc', '#3a2e24', 0.9));
  const sun = shadowed(new THREE.DirectionalLight('#ffc27a', 3.4), 4096, 25);
  sun.position.set(18, 7, 6);
  s.add(sun);
  return { scene: s, camera: cam(40, [-0.6, 2.6, 7.0], [-0.9, 0.2, -8]), far: 120, update };
}


async function muro() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#8fa6c8');
  s.add(plane(40, 40, '#4e4842', [0, 0, 0]));
  s.add(boxMesh(20, 4, 0.5, '#8f8068', [0, 0, -3]));
  s.add(boxMesh(20, 0.6, 0.52, '#8f6e44', [0, 0, -3]));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), clay('#2f6b8a'));
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
  update(0, 0.6);
  s.add(new THREE.HemisphereLight('#9fb6dc', '#3a2e24', 0.7));
  const sun = shadowed(new THREE.DirectionalLight('#ffcf8a', 4.0), 2048, 6);
  sun.position.set(-4, 2.2, 6);
  sun.target.position.set(0, 0.8, -3);
  s.add(sun, sun.target);
  return { scene: s, camera: cam(40, [2.3, 1.0, 3.6], [-0.4, 1.0, -2.6]), far: 60, update };
}


// ── his room at night ──
async function cameretta() {
  // night, his breath on the glass; across the way the city lights up one window at a time
  const s = new THREE.Scene();
  s.background = new THREE.Color('#060a18');
  s.add(sky([[-0.1, '#1a2240'], [0.02, '#24305a'], [0.2, '#0d1430'], [1.0, '#050814']]));
  s.add(plane(7, 7, '#4a382c', [0, 0, 0.5]));
  s.add(plane(7, 7, '#1d2236', [0, 2.7, 0.5], Math.PI / 2));
  const wallId = nextId();
  const seg = (x, y, w, h) => s.add(boxMesh(w, h, 0.2, '#2e3b5c', [x, y, -2], wallId));
  seg(-2.75, 0, 3.3, 2.7);
  seg(2.75, 0, 3.3, 2.7);
  seg(0, 0, 2.2, 0.85);
  seg(0, 2.4, 2.2, 0.3);
  s.add(boxMesh(0.05, 1.55, 0.06, '#d9d2c2', [0, 0.85, -1.95], wallId));
  s.add(boxMesh(2.2, 0.05, 0.3, '#d9d2c2', [0, 0.83, -1.85], wallId));
  for (const x of [-3.2, 3.2]) {
    const w = plane(5, 2.7, '#2a3654', [x, 1.35, 0.5], 0);
    w.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    s.add(w);
  }
  // the bed, the blanket thrown back, a night table
  s.add(boxMesh(1.0, 0.42, 2.0, '#4a3426', [-2.4, 0, -0.6]));
  s.add(boxMesh(0.95, 0.12, 1.2, '#2f6b6b', [-2.4, 0.42, -0.25]));
  s.add(boxMesh(0.8, 0.12, 0.4, '#d9d4c8', [-2.4, 0.42, -1.35]));
  s.add(boxMesh(0.45, 0.5, 0.4, '#4a3426', [-1.6, 0, -1.6]));
  const wins = buildings(s, -60, 16, 7, 0.3);
  const me = await him('stand', { pos: [0.05, 0, -1.6], rotY: 180, kid: true, scale: 0.6, shadow: true, aim: { RightArm: [-0.2, 0.25, 1], RightForeArm: [-0.05, 0.7, 1], Head: [0, 1, 0.15] } });
  s.add(me);
  s.add(new THREE.HemisphereLight('#3a4a80', '#0a0a10', 0.7));
  const moon = shadowed(new THREE.DirectionalLight('#9ab0e6', 3.4), 2048, 6);
  moon.position.set(-3, 9, -14);
  moon.target.position.set(0.3, 0, 0.5);
  s.add(moon, moon.target);
  s.add(shaft([0, 1.6, -2], [0.6, 0, 0.3], 0.7, 1.0, '#9ab0e6', 0.05));
  const update = (k, t) => {
    // a window switches on at its own moment, the way a city comes on at dusk
    for (const w of wins) w.material.emissive.copy(w.userData.on).multiplyScalar(t > w.userData.at ? 1 : 0.04);
  };
  update(0, 12);
  return { scene: s, camera: cam(46, [1.0, 1.15, 2.6], [-0.15, 1.0, -3]), far: 200, update };
}



// ── II · FIFTEEN ──
async function corridoio() {
  // fluorescent cold, teal lockers; the river of kids comes at us and parts past the lens on the left,
  // nobody vanishes; he goes the other way along the lockers on the right
  const s = new THREE.Scene();
  s.background = new THREE.Color('#1a2026');
  s.add(plane(4, 60, '#8a8f86', [0, 0, -25]));
  s.add(plane(4, 60, '#d9dfdc', [0, 3, -25], Math.PI / 2));
  for (const side of [-1, 1]) {
    const wl = plane(60, 3, '#c9d2cc', [side * 2, 1.5, -25], 0);
    wl.rotation.y = -side * Math.PI / 2;
    s.add(wl);
    for (let i = 0; i < 70; i++) s.add(boxMesh(0.4, 1.9, 0.5, i % 2 ? '#2f6b73' : '#2a5f6a', [side * 1.73, 0, 3 - i * 0.6]));
  }
  for (let i = 0; i < 6; i++) s.add(boxMesh(0.04, 0.5, 0.7, ['#d9a321', '#3a6bb0', '#e8e2d0'][i % 3], [1.96, 2.1, -3 - i * 6.5]));
  for (let i = 0; i < 11; i++) s.add(emissive(0.6, 0.04, 1.2, [0, 2.97, 2 - i * 5], 2.2, '#e8fff6'));
  const crowd = [];
  for (let i = 0; i < 22; i++) {
    const kind = i % 3 === 1 ? 'teengirl' : 'teen';
    const z = -3 - i * 2.0 - (i % 3) * 0.5;
    const x = ((i * 0.37) % 1.4) - 1.25;
    const o = await grey(kind, kind === 'teengirl' ? 'hvwalk' : 'walk', { pos: [x, 0, z], rotY: 0, t: (i * 0.23) % 1, seed: 60 + i * 7, expr: ['neutral', 'smile', 'neutral', 'shout'][i % 4] });
    crowd.push({ o, x, z, t0: (i * 0.23) % 1 });
    s.add(o);
  }
  const me = await him('walk', { pos: [1.0, 0, -2.6], rotY: 180, scale: 0.94, t: 0.4, rate: 0.45 });
  s.add(me);
  const update = (k, t) => {
    for (const c of crowd) {
      const z = c.z + 1.15 * t;
      c.o.position.z = z;
      // the nearer they come, the more they keep to the left: they pass the camera, they don't go through it
      c.o.position.x = c.x - 0.9 * ease(clamp01((z + 4) / 4));
      c.o.rotation.y = -0.25 * ease(clamp01((z + 4) / 4));
    }
    me.position.z = -2.6 - 0.36 * t;
    me.position.x = 1.0 + 0.06 * Math.sin(t * 0.7);
  };
  update(0, 4);
  s.add(new THREE.HemisphereLight('#dfeee8', '#4a5250', 1.0));
  for (let i = 0; i < 6; i++) {
    const l = new THREE.PointLight('#e8fff4', 6, 9, 1.4);
    l.position.set(0, 2.7, 2 - i * 7);
    s.add(l);
  }
  return { scene: s, camera: cam(42, [0.6, 1.55, 3.2], [0.3, 1.2, -20]), far: 70, update };
}


async function foto() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#1f2c40');
  s.add(plane(20, 20, '#9a7448', [0, 0, 0]));
  s.add(plane(20, 6, '#2f4a6b', [0, 3, -3], 0));
  s.add(boxMesh(6.5, 0.45, 0.5, '#6b4a30', [0, 0, -0.2]));
  s.add(boxMesh(7, 0.3, 0.9, '#6b4a30', [0, 0, -1.9]));
  const kinds = ['teen', 'teengirl'];
  let k = 0;
  for (let i = 0; i < 7; i++) s.add(await grey(kinds[k % 2], 'sitChair', { pos: [-2.7 + i * 0.9, 0.0, -0.2], rotY: 0, expr: 'smile', seed: 90 + k++ * 7 }));
  for (let i = 0; i < 8; i++) s.add(await grey(kinds[k % 2], 'stand', { pos: [-3.1 + i * 0.88, 0, -1.0], rotY: 0, expr: k % 3 ? 'smile' : 'neutral', seed: 90 + k++ * 7 }));
  for (let i = 0; i < 8; i++) s.add(await grey(kinds[k % 2], 'stand', { pos: [-3.0 + i * 0.86, 0.3, -1.9], rotY: 0, expr: k % 4 ? 'smile' : 'neutral', seed: 90 + k++ * 7 }));
  s.add(await him('stand', { pos: [3.75, 0.3, -1.9], rotY: -8, scale: 0.94 }));
  s.add(new THREE.HemisphereLight('#e8eef8', '#4a3a2a', 1.1));
  const flash = shadowed(new THREE.DirectionalLight('#ffffff', 2.6), 2048, 8);
  flash.position.set(0, 3, 10);
  s.add(flash);
  // framed like the print it becomes: the right edge of the photo will cut through him
  return { scene: s, camera: cam(24, [1.2, 1.3, 5.6], [1.2, 1.0, -1]), far: 40 };
}


async function fermata() {
  // a rainy morning in blue-grey; her yellow umbrella the only warm thing; she faces the street, waiting
  const s = new THREE.Scene();
  s.background = new THREE.Color('#5d6a80');
  s.fog = new THREE.Fog('#6a7690', 14, 80);
  s.add(sky([[-0.1, '#7d889c'], [0.05, '#8994a8'], [0.3, '#5d6a80'], [1, '#3a4660']]));
  const road = plane(80, 80, '#2e3440', [0, -0.15, -20]);
  road.material.roughness = 0.35;
  s.add(road);
  s.add(boxMesh(80, 0.15, 4, '#59606b', [0, -0.15, 1]));
  // the shelter
  for (const x of [-1.2, 1.4]) s.add(boxMesh(0.08, 2.4, 0.08, '#2a3038', [x, 0, 1.8]));
  s.add(boxMesh(3, 0.08, 1.6, '#2a3038', [0.1, 2.4, 1.2]));
  s.add(boxMesh(2.4, 0.05, 0.4, '#3a4048', [0.1, 0.45, 1.75]));
  s.add(boxMesh(0.06, 2.6, 0.06, '#2a3038', [2.4, 0, -0.6]));
  s.add(sheet(0.5, 0.5, canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#2f5f9a'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = 'bold 80px sans-serif'; x.fillText('7', 40, 100); }), [2.4, 2.55, -0.57]));
  buildings(s, -30, 14, 3, 0.12, '#3a4252');
  s.add(emissive(4, 2.2, 0.1, [-6, 0.1, -9], 1.4, '#ffc27a'));
  // the girl: facing the street, the umbrella in her right hand
  const girl = await grey('teengirl', 'stand', { pos: [0.4, 0, 0.7], rotY: -18, expr: 'neutral', aim: { RightArm: [-0.25, -0.2, 0.6], RightForeArm: [-0.1, 1, 0.3] }, wear: { top: '#2f4a6b', bottom: '#2a2a33', hair: '#2a1d16', skin: '#e8b892' } });
  s.add(girl);
  const umb = new THREE.Group();
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.28, 16, 1, true), clay('#e0aa22', { side: THREE.DoubleSide }));
  canopy.position.y = 1.95;
  umb.add(canopy);
  umb.add(boxMesh(0.02, 0.8, 0.02, '#2a2a2a', [0, 1.15, 0]));
  umb.position.set(0.32, 0, 0.8);
  umb.userData.id = nextId();
  s.add(umb);
  const me = await him('stand', { pos: [-2.6, 0, 0.6], rotY: 110, scale: 0.94 });
  s.add(me);
  const passer = car(-30, -2.2, 90, '#4a5a6b');
  s.add(passer);
  const hl = new THREE.SpotLight('#fff0d0', 60, 25, D(22), 0.5, 1.2);
  hl.position.set(2.2, 0.7, 0);
  hl.target.position.set(10, 0, 0);
  passer.add(hl, hl.target);
  const update = (k, t) => {
    umb.rotation.z = 0.04 * Math.sin(t * 0.9);
    passer.position.x = -30 + 6.5 * Math.max(0, t - 6);
    // he turns towards her and back, rehearsing
    me.rotation.y = D(110) + 0.25 * Math.sin(t * 0.6);
  };
  update(0, 3);
  s.add(new THREE.HemisphereLight('#a8b6cc', '#2a2e36', 1.2));
  const light = shadowed(new THREE.DirectionalLight('#c8d4e6', 0.8), 2048, 10);
  light.position.set(-3, 10, 6);
  s.add(light);
  return { scene: s, camera: cam(40, [-0.6, 1.5, 7.2], [-0.8, 1.1, 0]), far: 120, update };
}


async function bus() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#5d6a80');
  s.fog = new THREE.Fog('#6a7690', 14, 80);
  s.add(sky([[-0.1, '#7d889c'], [0.05, '#8994a8'], [0.3, '#5d6a80'], [1, '#3a4660']]));
  const road = plane(80, 80, '#2e3440', [0, -0.15, -20]);
  road.material.roughness = 0.35;
  s.add(road);
  s.add(boxMesh(80, 0.15, 4, '#59606b', [0, -0.15, 1.6]));
  // the shelter she was under, empty now; the 7 pulling away
  for (const x of [-1.2, 1.4]) s.add(boxMesh(0.08, 2.4, 0.08, '#2a3038', [x, 0, 2.6]));
  s.add(boxMesh(3, 0.08, 1.4, '#2a3038', [0.1, 2.4, 2.1]));
  const b = busBody('#c9a227');
  b.position.set(6.5, 0, -1.5);
  b.rotation.y = D(-4);
  b.userData.id = nextId();
  s.add(b);
  const update = (k, t) => {
    const u = clamp01((t - 1.5) / 7.5);
    b.position.x = 2.4 + 30 * easeIn(u);
  };
  update(0, 1);
  s.add(await him('stand', { pos: [-0.6, 0, 1.6], rotY: 100, scale: 0.94 }));
  buildings(s, -30, 14, 5, 0.12, '#3a4252');
  s.add(new THREE.HemisphereLight('#a8b6cc', '#2a2e36', 1.2));
  const light = shadowed(new THREE.DirectionalLight('#c8d4e6', 0.8), 2048, 12);
  light.position.set(-3, 10, 6);
  s.add(light);
  return { scene: s, camera: cam(40, [-5.8, 1.5, 7.4], [1.5, 1.2, -1]), far: 120, update };
}



async function festa() {
  // one-point perspective, dead centre: he stands against the back wall in the dark; the others dance in
  // turning coloured light on either side. "Andiamo su!" — they dance their way out; the lights keep turning.
  const s = new THREE.Scene();
  s.background = new THREE.Color('#06050c');
  s.add(plane(12, 14, '#2a2018', [0, 0, -2]));
  s.add(plane(12, 14, '#0e0c16', [0, 3.2, -2], Math.PI / 2));
  s.add(plane(12, 3.2, '#1d1a2e', [0, 1.6, -7], 0));
  for (const x of [-5, 5]) {
    const w = plane(14, 3.2, '#1a1728', [x, 1.6, -2], 0);
    w.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    s.add(w);
  }
  // a doorway on the right, lit from the stairs beyond
  s.add(emissive(0.05, 2.2, 1.1, [4.97, 0, -4.2], 1.1, '#ffb867'));
  // a string of bulbs, sagging across the ceiling, the same on both sides
  for (let i = 0; i <= 24; i++) {
    const x = -4.6 + i * (9.2 / 24);
    const y = 3.0 - 0.45 * (1 - (x / 4.6) ** 2);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: new THREE.Color('#ffcf8a').multiplyScalar(2.2) }));
    bulb.position.set(x, y, -5.2);
    bulb.userData.id = nextId();
    s.add(bulb);
  }
  const L = [[-1.9, -3.0], [-2.9, -4.4], [-1.3, -5.0], [-3.4, -2.2], [-2.2, -1.2]];
  const groups = [...L, ...L.map(([x, z]) => [-x, z])];
  const kinds = ['woman', 'teen', 'teengirl', 'teen', 'woman'];
  const poses = ['samba', 'dance', 'hvwalk', 'dance2', 'samba'];
  const moving = [];
  for (let i = 0; i < groups.length; i++) {
    const [x, z] = groups[i];
    const kind = kinds[i % 5], pose = poses[i % 5];
    const opts = { pos: [x, 0, z], rotY: x < 0 ? 60 : -60, t: i * 0.37, seed: 200 + i * 9, expr: i === 6 ? 'shout' : 'smile' };
    if (pose.startsWith('dance')) opts.arms = pose;
    const o = await grey(kind, pose.startsWith('dance') ? 'stand' : pose, opts);
    moving.push({ o, x, z, ph: i * 0.9, r0: o.rotation.y, leave: 9 + (i % 5) * 0.55 + (x > 0 ? 0.3 : 0) });
    s.add(o);
  }
  s.add(await him('lean', { pos: [0, 0, -6.72], rotY: 0, scale: 0.94 }));
  s.add(new THREE.HemisphereLight('#2a2048', '#05040a', 0.25));
  const spots = [];
  for (const [c, x] of [['#36c8d0', -2.4], ['#a77bff', 2.4], ['#ffb347', -1.0], ['#36c8d0', 1.0]]) {
    const l = shadowed(new THREE.SpotLight(c, 120, 14, D(24), 0.6, 1.2), 1024);
    l.position.set(x, 3.1, -1.5);
    l.target.position.set(x, 0, -3.5);
    const sh = shaft([x, 3.1, -1.5], [x, 0, -3.5], 0.1, 1.4, c, 0.09);
    s.add(l, l.target, sh);
    spots.push({ l, sh, x, ph: x });
  }
  const update = (k, t) => {
    for (const m of moving) {
      if (!m.o.mixer) {
        const u = 0.5 + 0.5 * Math.sin((t / 0.55) * Math.PI + m.ph);
        m.o.aimNow = { ...m.o.baseAims, ...mixAims(ARMS.dance, mirror(ARMS.dance2), u) };
        m.o.aimAll(m.o.aimNow);
      }
      // out through the door on the right, still dancing
      const go = ease(clamp01((t - m.leave) / 3.2));
      m.o.position.x = m.x + (6.5 - m.x) * go;
      m.o.position.z = m.z + (-4.2 - m.z) * go;
      m.o.rotation.y = go > 0.02 ? -Math.PI / 2 + 0.2 * Math.sin(t * 3) : m.r0 + 0.3 * Math.sin(t * 1.3 + m.ph);
    }
    // the lights turn, for whoever is there
    for (const sp of spots) {
      const a = t * 0.9 + sp.ph;
      const tx = sp.x + 1.6 * Math.cos(a), tz = -3.6 + 1.4 * Math.sin(a);
      sp.l.target.position.set(tx, 0, tz);
      sp.sh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(tx - sp.x, -3.1, tz + 1.5).normalize());
    }
  };
  update(0, 4);
  return { scene: s, camera: cam(40, [0, 1.5, 4.2], [0, 1.25, -7]), far: 40, update };
}



async function tetto() {
  // the roof at night: tar, a brick chimney, an aerial; the city below, warm windows; the sky above
  const s = new THREE.Scene();
  s.background = new THREE.Color('#050916');
  s.add(sky([[-0.1, '#1a2448'], [0.02, '#22305e'], [0.15, '#0d1636'], [1.0, '#040814']]));
  s.add(boxMesh(12, 0.3, 10, '#2e333d', [0, -0.3, 0]));
  s.add(boxMesh(12, 0.6, 0.2, '#3d434e', [0, 0, -5]));
  s.add(boxMesh(0.9, 1.4, 0.9, '#6b4636', [1.4, 0, -1.2]));
  s.add(boxMesh(1.0, 0.1, 1.0, '#4a3a32', [1.4, 1.4, -1.2]));
  s.add(beam([2.6, 0, -2.6], [2.6, 3.2, -2.6], 0.04, '#2a2e36'));
  for (let i = 0; i < 4; i++) s.add(beam([2.6 - 0.5, 2.4 + i * 0.22, -2.6], [2.6 + 0.5, 2.4 + i * 0.22, -2.6], 0.025, '#2a2e36'));
  const wins = buildings(s, -40, 18, 11, 0.32, '#1c2234');
  for (let i = 0; i < 70; i++) s.add(emissive(0.25, 0.25, 0.25, [-120 + ((i * 37) % 240), 30 + ((i * 53) % 60), -180], 1.2 + (i % 3) * 0.4, '#e8eeff'));
  const plane_ = emissive(0.6, 0.3, 0.3, [-60, 45, -170], 3, '#ffffff');
  s.add(plane_);
  s.add(await him('sitFloor', { pos: [0.75, 0, -1.25], rotY: -100, scale: 0.94 }));
  s.add(new THREE.HemisphereLight('#3a4a88', '#0a0a10', 0.55));
  const moon = shadowed(new THREE.DirectionalLight('#a8bce8', 1.4), 2048, 8);
  moon.position.set(-6, 10, 4);
  s.add(moon);
  const update = (k, t) => {
    for (const w of wins) w.material.emissive.copy(w.userData.on).multiplyScalar(((t * 0.3 + w.userData.at) % 9) > 8.2 ? 0.05 : 1);
    plane_.position.set(-60 + t * 4, 45 + t * 0.3, -170);
    plane_.material.emissive.setScalar(Math.sin(t * 6) > 0.6 ? 3 : 0.3);
  };
  update(0, 5);
  return { scene: s, camera: cam(42, [-3.4, 1.6, 2.6], [1.0, 0.2, -6]), far: 300, update };
}


// ── III · THIRTY ──
async function metro() {
  // a teal carriage under fluorescent light; tunnel lamps stream past the black windows; every face lit
  // from below by its own screen; the train sways and nobody looks up
  const s = new THREE.Scene();
  s.background = new THREE.Color('#05080a');
  s.add(plane(3, 24, '#2f3438', [0, 0, -8]));
  s.add(plane(3, 24, '#cfd8d2', [0, 2.3, -8], Math.PI / 2));
  const tunnel = [];
  for (const side of [-1, 1]) {
    const wl = plane(24, 2.3, '#3d6b66', [side * 1.5, 1.15, -8], 0);
    wl.rotation.y = -side * Math.PI / 2;
    s.add(wl);
    for (let i = 0; i < 5; i++) s.add(emissive(0.03, 0.7, 1.4, [side * 1.48, 1.45, -1 - i * 4], 0.25, '#203040'));
    for (let i = 0; i < 9; i++) {
      const m = emissive(0.02, 0.06, 0.5, [side * 1.465, 1.5 + (i % 2) * 0.15, -i * 2.6], 3, '#ffd59a');
      tunnel.push({ m, z0: -i * 2.6 });
      s.add(m);
    }
    s.add(boxMesh(0.45, 0.45, 20, '#2f4f8a', [side * 1.27, 0, -8]));
    s.add(boxMesh(0.03, 0.03, 22, '#c9ccc8', [side * 0.55, 2.0, -8]));
  }
  for (let i = 0; i < 5; i++) s.add(boxMesh(0.04, 2.3, 0.04, '#c9ccc8', [0, 0, -2 - i * 4]));
  for (let i = 0; i < 6; i++) s.add(emissive(0.2, 0.03, 3.4, [0, 2.29, -i * 4], 2, '#e8fff4'));
  const riders = [];
  const people = [['man', -0.6, -2.2, 90], ['woman', 0.6, -3.6, -100], ['grown', -0.4, -5, 70], ['beard', 0.55, -6.4, -80], ['woman', -0.5, -8, 95], ['man', 0.5, -9.5, -90], ['grown', 0.2, -11, 180]];
  let n = 0;
  const glow = (o) => {
    const ph = phone();
    const l = new THREE.PointLight('#a8ccff', 0.5, 0.9, 1.6);
    ph.add(l);
    s.add(o, hold(o, ph, 'Both', [0, 0.03, 0]));
    riders.push({ o, ph, r0: o.rotation.y, ph0: n++ * 1.3 });
  };
  for (const [k, x, z, r] of people) glow(await grey(k, 'stand', { pos: [x, 0, z], rotY: r, arms: 'phone', expr: 'focus', seed: 300 + n * 7 }));
  for (const [k, z] of [['woman', -4], ['man', -7.5]]) glow(await grey(k, 'sitChair', { pos: [-1.1, 0.03, z], rotY: 90, arms: 'phone', expr: 'focus', seed: 300 + n * 7 }));
  const me = await him('stand', { pos: [0.35, 0, -0.6], rotY: 160, aim: ARMS.bar });
  s.add(me);
  s.add(new THREE.HemisphereLight('#d8f0e8', '#20302c', 0.9));
  for (let i = 0; i < 4; i++) {
    const l = new THREE.PointLight('#e0fff2', 5, 7, 1.4);
    l.position.set(0, 2.1, -1 - i * 4);
    s.add(l);
  }
  const update = (k, t) => {
    for (const tl of tunnel) tl.m.position.z = ((tl.z0 + t * 14) % 24) - 22 + 2;
    const sway = 0.05 * Math.sin(t * 1.7) + 0.02 * Math.sin(t * 4.3);
    for (const r of riders) {
      r.o.rotation.y = r.r0 + sway * 0.6;
      hold(r.o, r.ph, 'Both', [0, 0.03, 0]);
    }
    me.rotation.y = D(160) + sway * 0.4;
  };
  update(0, 3);
  return { scene: s, camera: cam(48, [1.0, 1.62, 2.5], [-0.2, 1.25, -12]), far: 40, update };
}



// ── the car park again: what he sees ──
/** The woman, seated at the wheel, as a child of her car (car-local coordinates). */
async function womanAtWheel() {
  const g = new THREE.Group();
  // the courtesy light left on: the only light in her car
  const dome = new THREE.PointLight('#ffd59a', 4.5, 2.6, 1.4);
  dome.position.set(0.2, 1.33, 0.25);
  g.add(dome);
  g.add(emissive(0.14, 0.02, 0.08, [0.05, 1.395, -0.25], 2.5, '#ffe2b0'));
  g.add(await grey('woman', 'sitChair', {
    pos: [0.4, 0.4, -0.14], rotY: 0, expr: 'cry', wear: { skin: '#e3b08a', top: '#2f4f6b', bottom: '#1d2230', hair: '#2b1d15' },
    aim: { Spine: [0, 1, 0.16], Spine1: [0, 1, 0.2], Neck: [0.05, 1, 0.35], Head: [0.1, 1, 0.42], LeftArm: [0.2, -0.45, 1], LeftForeArm: [-0.15, 0.3, 1], RightArm: [-0.2, -0.45, 1], RightForeArm: [0.15, 0.3, 1] },
  }));
  return g;
}

/** A pool of warm light over each of the ones he watches. */
function islands(s, which) {
  const at = { car: [WOMAN_CAR.x, WOMAN_CAR.z, 80], guard: [...GUARD, 120], boy: [...BOY, 100] };
  for (const k of which) {
    const [x, z, power] = at[k];
    const pool = shadowed(new THREE.SpotLight('#ffb760', power, 12, D(25), 0.75, 1.3), 1024);
    pool.position.set(x + 0.3, 2.85, z + 0.2);
    pool.target.position.set(x, 0, z);
    s.add(pool, pool.target);
    s.add(emissive(0.9, 0.05, 0.14, [x + 0.3, 2.9, z + 0.2], 2.4, '#ffc98a'));
    s.add(shaft([x + 0.3, 2.85, z + 0.2], [x, -0.1, z], 0.2, 1.8, '#ffb767', 0.08));
  }
}

async function p19() {
  // back where we started, closer; after a while he turns his head and looks out across the car park
  const s = await garageSet({ beam: 0, ambient: 0.3 });
  const me = await him('sitFloor', { ...HIM_AT_PILLAR });
  s.add(me);
  const LOOK = { Head: [0.35, 1, 0.55], Neck: [0.1, 1, 0.3] };
  const update = (k, t) => {
    const u = ease(clamp01((t - 7) / 1.6));
    me.aimNow = { ...me.baseAims, ...mixAims({ Head: me.baseAims.Head ?? [0, 1, 0.25], Neck: me.baseAims.Neck ?? [0, 1, 0.15] }, LOOK, u) };
    me.aimAll(me.aimNow);
  };
  update(0, 12);
  return { scene: s, camera: cam(34, [-2.8, 1.0, 1.6], [0.3, 0.6, -0.6]), far: 80, update };
}


async function p20() {
  // through her side window, framed by the pillars: hands on the wheel, head down, the engine off
  // close, at the height of her window: the courtesy light on her, the car park's night all round
  const s = await garageSet({ beam: 0, ambient: 0.22, lamp: 0, sodium: 0.6 });
  const c = car(WOMAN_CAR.x, WOMAN_CAR.z, WOMAN_CAR.rotY, '#23404a');
  c.add(await womanAtWheel());
  s.add(c);
  islands(s, ['car']);
  c.updateMatrixWorld(true);
  const f = c.localToWorld(new THREE.Vector3(1.25, 1.32, 2.35));
  const t = c.localToWorld(new THREE.Vector3(0.38, 1.12, -0.12));
  return { scene: s, camera: cam(30, f.toArray(), t.toArray()), far: 80 };
}


async function p21() {
  // a guard dancing alone in a pool of sodium light: a real dance, not a gesture
  const s = await garageSet({ beam: 0, ambient: 0.25, lamp: 0, sodium: 0.5 });
  const g = await grey('oldman', 'samba', { pos: [GUARD[0], -0.12, GUARD[1]], rotY: 150, t: 2, rate: 0.85, expr: 'smile', wear: { top: '#1f2a44', bottom: '#1f2a44', hat: '#1f2a44', skin: '#8a5a3c', hair: '#d8d4cc' } });
  s.add(g);
  islands(s, ['guard']);
  const update = (k, t) => {
    g.rotation.y = D(150) + 0.35 * Math.sin(t * 0.5);
  };
  return { scene: s, camera: cam(30, [0.9, 1.2, -6.4], [GUARD[0], 0.85, GUARD[1]]), far: 80, update };
}



async function p22() {
  // a boy in a yellow raincoat counts the pillars with his finger, one, then the next, then the next
  const s = await garageSet({ beam: 0, ambient: 0.25, lamp: 0, sodium: 0.5 });
  const boy = await grey('boy', 'stand', { pos: [BOY[0], -0.12, BOY[1]], rotY: 200, arms: 'point', expr: 'focus', wear: { top: '#d9a321', bottom: '#2a3a5a', shoes: '#d9a321' }, aim: { RightArm: [-0.35, 0.25, 1], RightForeArm: [-0.25, 0.3, 1], Head: [-0.2, 1, 0.4] } });
  s.add(boy);
  islands(s, ['boy']);
  const update = (k, t) => boyCounts(boy, t);
  update(0, 2);
  return { scene: s, camera: cam(34, [-6.0, 0.8, -1.0], [-9.2, 0.7, -12]), far: 80, update };
}

/** The boy's finger goes from pillar to pillar along the row, his head with it. */
function boyCounts(boy, t) {
  const n = Math.floor(t / 1.6) % 4, u = ease(clamp01((t % 1.6) / 0.5));
  const dirs = [[-0.6, 0.25, 1], [-0.25, 0.2, 1], [0.05, 0.2, 1], [0.3, 0.2, 1]];
  const a = dirs[n], b = dirs[(n + 1) % 4];
  const d = a.map((v, i) => v + (b[i] - v) * u);
  boy.aimNow = { ...boy.baseAims, RightArm: d, RightForeArm: [d[0] * 0.8, d[1] + 0.05, 1], Head: [d[0] * 0.5, 1, 0.4] };
  boy.aimAll(boy.aimNow);
}



async function p23() {
  // the whole car park: three islands of light, three people who don't know about each other, and him
  const s = await garageSet({ beam: 0, ambient: 0.32, lamp: 8, sodium: 0.8 });
  const c = car(WOMAN_CAR.x, WOMAN_CAR.z, WOMAN_CAR.rotY, '#23404a');
  c.add(await womanAtWheel());
  s.add(c);
  const g = await grey('oldman', 'samba', { pos: [GUARD[0], -0.12, GUARD[1]], rotY: 150, t: 2, rate: 0.85, expr: 'smile', wear: { top: '#1f2a44', bottom: '#1f2a44', hat: '#1f2a44', skin: '#8a5a3c', hair: '#d8d4cc' } });
  s.add(g);
  const boy = await grey('boy', 'stand', { pos: [BOY[0], -0.12, BOY[1]], rotY: 200, arms: 'point', expr: 'focus', wear: { top: '#d9a321', bottom: '#2a3a5a', shoes: '#d9a321' }, aim: { RightArm: [-0.35, 0.25, 1], RightForeArm: [-0.25, 0.3, 1] } });
  s.add(boy);
  islands(s, ['car', 'guard', 'boy']);
  s.add(await him('sitFloor', { ...HIM_AT_PILLAR, aim: { Head: [0.15, 1, 0.5] } }));
  const update = (k, t) => {
    g.rotation.y = D(150) + 0.35 * Math.sin(t * 0.5);
    boyCounts(boy, t);
  };
  update(0, 3);
  return { scene: s, camera: cam(44, [0.6, 2.4, 4.0], [-3.6, 0.4, -8]), far: 80, update };
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
  // the breakwater at first light: a deep blue sea, the sky going from night to pink at the horizon
  const s = new THREE.Scene();
  s.background = new THREE.Color('#121a2e');
  s.fog = new THREE.Fog('#5a6488', 60, 520);
  s.add(sky([[-0.1, '#d68a74'], [0.0, '#e9a27a'], [0.04, '#c98a8e'], [0.12, '#6c6d98'], [0.3, '#2c3a66'], [1.0, '#121a33']]));
  const sea = plane(2000, 2000, '#1d3550', [0, -0.4, -900]);
  sea.material.normalMap = waves();
  sea.material.normalScale = new THREE.Vector2(0.9, 0.9);
  sea.material.roughness = 0.35;
  s.add(sea);
  s.add(boxMesh(3.2, 1.1, 22, '#5b5d63', [-0.8, -1.1, -9]));
  for (let i = 0; i < 16; i++) {
    const r = 0.6 + ((i * 37) % 10) / 14;
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), clay(['#2a2e36', '#33363e', '#3b3d44'][i % 3]));
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
  s.userData.sea = sea;
  // gulls, far off: two strokes each
  const gulls = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group();
    for (const sgn of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.2), clay('#1c2230'));
      w.position.x = sgn * 0.42;
      w.userData.sgn = sgn;
      g.add(w);
    }
    g.position.set(-40 + i * 17, 12 + (i % 3) * 4, -90 - i * 12);
    g.userData.id = nextId();
    gulls.push(g);
    s.add(g);
  }
  s.userData.gulls = gulls;
  s.add(new THREE.HemisphereLight('#7c86b8', '#141a26', 1.1));
  const low = shadowed(new THREE.DirectionalLight('#ffb08a', 1.9), 2048, 60);
  low.position.set(-20, 6, -200);
  low.target.position.set(0, 0, -30);
  s.add(low, low.target);
  return s;
}


/** The sea moves, the gulls glide and flap now and then. */
function seaLife(s, t) {
  const sea = s.userData.sea;
  if (sea) sea.material.normalMap.offset.set(t * 0.004, t * 0.012);
  (s.userData.gulls ?? []).forEach((g, i) => {
    g.position.x = -40 + i * 17 + t * (1.2 + i * 0.2);
    g.position.y = 12 + (i % 3) * 4 + 0.6 * Math.sin(t * 0.4 + i);
    const flap = Math.sin(t * 5 + i) > 0.3 ? 0.35 * Math.sin(t * 9 + i) : 0.12;
    g.children.forEach((w) => (w.rotation.z = w.userData.sgn * flap));
  });
}

async function p24() {
  const s = await seaSet({ sun: null });
  const me = await him('walk', { pos: [-0.7, 0, -7], rotY: 180, t: 0.5, rate: 0.62 });
  s.add(me);
  const update = (k, t) => {
    me.position.z = -2.5 - 0.6 * t;
    seaLife(s, t);
  };
  update(0, 7);
  return { scene: s, camera: cam(40, [0.9, 1.6, 2.5], [-0.8, 0.9, -20]), far: 500, update };
}


async function alba() {
  const s = await seaSet({ sun: 0.5, sunX: -175 });
  s.add(await him('sitFloor', { pos: [-0.9, 0, -18.6], rotY: 186 }));
  const sun = s.userData.sun;
  const update = (k, t) => {
    sun.position.y = -0.4 + (-0.42 + 0.97 * ease(k) - 0.5) * 18; // from a sliver on the sea to more than half
    seaLife(s, t);
  };
  return { scene: s, camera: cam(36, [1.4, 1.35, -3.5], [-2.4, 0.2, -60]), far: 500, update };
}


async function p26() {
  const s = await seaSet({ sun: 0.62, sunX: -120 });
  s.add(await him('sitFloor', { pos: [-0.9, 0, -18.6], rotY: 186, rate: 0.5 }));
  const update = (k, t) => seaLife(s, t);
  return { scene: s, camera: cam(30, [-0.15, 0.95, -17.2], [-2.2, 0.85, -60]), far: 500, update };
}


async function p27() {
  const s = await seaSet({ sun: 0.7, sunX: 30 });
  s.add(await him('sitFloor', { pos: [-0.9, 0, -18.6], rotY: 186 }));
  const update = (k, t) => seaLife(s, t);
  update(0, 4);
  return { scene: s, camera: cam(50, [6, 3.2, 14], [-1, 0.4, -40]), far: 500, update };
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
