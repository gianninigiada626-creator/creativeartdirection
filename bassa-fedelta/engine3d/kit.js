// The kit of BASSA FEDELTÀ: camera, textures, props, and the people (mannequins dressed in wide clothes,
// spiky hair, a doberman's head) that every set is built from. On the A PARTE stage.
import { THREE, W, H, person, posed, boxMesh, plane, clay, nextId } from '/a-parte/engine3d/stage.js';

export { THREE, person, posed, boxMesh, plane, clay, nextId };
export const D = THREE.MathUtils.degToRad;

export function cam(fov, pos, target, far = 60) {
  const c = new THREE.PerspectiveCamera(fov, W / H, 0.05, far);
  c.position.set(...pos);
  c.lookAt(...target);
  c.updateMatrixWorld(true);
  return c;
}

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A framed picture on a wall: the canvas, and a frame around it. */
export function framed(w, h, tex, pos, rotY = 0, frame = '#3a2a1c') {
  const g = new THREE.Group();
  g.add(boxMesh(w + 0.1, h + 0.1, 0.03, frame, [0, -(h + 0.1) / 2, 0]));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  m.position.z = 0.02;
  m.userData.id = nextId();
  g.add(m);
  g.position.set(...pos);
  g.rotation.y = D(rotY);
  return g;
}

/** A cable lying on the floor, through the given points (x, z), a little slack between them. */
export function cable(pts, r = 0.009, y = 0.012) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z, yy]) => new THREE.Vector3(x, yy ?? y, z)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, r, 6), clay('#141416'));
  m.castShadow = true;
  m.userData.id = nextId();
  return m;
}

export const SKIN = '#18120f';
// the three of them at fourteen: jerseys from the market, shorts, trainers
export const BOYS = {
  saimon: { skin: SKIN, hair: '#0c0a09', top: '#f2efe8', bottom: '#2f5fb8', shoes: '#f0eee8', sleeves: 'short' },
  bebo: { skin: SKIN, hair: '#0c0a09', top: '#e6c42a', bottom: '#b8321e', shoes: '#1b1b1d', sleeves: 'short' },
  io: { skin: SKIN, hair: '#0c0a09', top: '#eeeae2', bottom: '#253c9c', shoes: '#f0ece4', sleeves: 'short', shorts: true },
  tyson: { skin: '#16100c', hair: '#16100c', top: '#2f5a32', bottom: '#7d7a3c', shoes: '#d79a2a', sleeves: 'long' },
};

export async function boy(who, pose, opts = {}) {
  const base = { scale: 0.93, wear: BOYS[who], seed: 3, ...(who === 'tyson' ? {} : { hair: '#0c0a09', hairSize: 1.0 }) };
  if (['walk', 'run', 'idle'].includes(pose)) return person('Xbot', { clip: pose, ...base, ...opts });
  return posed('Xbot', pose, { clip: 'idle', t: 7 + Object.keys(BOYS).indexOf(who) * 1.7, rate: 0.9, ...base, ...opts });
}

export function tex(w, h, draw, alpha = false) {
  const t = canvasTex(w, h, draw);
  t.premultiplyAlpha = false;
  return t;
}

export function poster96(ctx, w, h) {
  ctx.fillStyle = '#141216';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e0302a';
  ctx.font = 'bold 230px Anton, Impact, sans-serif';
  ctx.fillText('96', w * 0.12, h * 0.72);
  ctx.fillStyle = '#efe9dc';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('MIXTAPE VOL.2', w * 0.12, h * 0.9);
}

export function posterFace(ctx, w, h) {
  // a rapper on a black-and-white poster: nobody in particular
  ctx.fillStyle = '#cfcac0';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2a2724';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.42, w * 0.3, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6d6862';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.5, w * 0.2, h * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b1917';
  ctx.fillRect(w * 0.18, h * 0.16, w * 0.64, h * 0.12);
  ctx.fillRect(w * 0.38, h * 0.45, w * 0.08, h * 0.03);
  ctx.fillRect(w * 0.54, h * 0.45, w * 0.08, h * 0.03);
  ctx.fillRect(w * 0.42, h * 0.62, w * 0.16, h * 0.025);
  ctx.fillStyle = '#3a3734';
  ctx.fillRect(w * 0.2, h * 0.78, w * 0.6, h * 0.22);
}

export function posterTarget(ctx, w, h) {
  ctx.fillStyle = '#c92a22';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#141216';
  ctx.font = 'bold 54px Anton, Impact, sans-serif';
  ctx.fillText('BASSA', w * 0.1, h * 0.17);
  ctx.fillText('FEDELTÀ', w * 0.1, h * 0.3);
  ctx.fillStyle = '#f1ece2';
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.64, w * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#141216';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.64, w * 0.24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.36);
  ctx.lineTo(w * 0.5, h * 0.92);
  ctx.moveTo(w * 0.22, h * 0.64);
  ctx.lineTo(w * 0.78, h * 0.64);
  ctx.stroke();
  // a cassette in the cross
  ctx.fillStyle = '#141216';
  ctx.fillRect(w * 0.36, h * 0.58, w * 0.28, h * 0.12);
  ctx.fillStyle = '#f1ece2';
  ctx.beginPath();
  ctx.arc(w * 0.43, h * 0.64, 9, 0, Math.PI * 2);
  ctx.arc(w * 0.57, h * 0.64, 9, 0, Math.PI * 2);
  ctx.fill();
}

export function crown(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#2a1650';
  ctx.lineWidth = 9;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.85);
  ctx.lineTo(w * 0.15, h * 0.2);
  ctx.lineTo(w * 0.35, h * 0.6);
  ctx.lineTo(w * 0.5, h * 0.12);
  ctx.lineTo(w * 0.65, h * 0.6);
  ctx.lineTo(w * 0.85, h * 0.2);
  ctx.lineTo(w * 0.9, h * 0.85);
  ctx.stroke();
}

export function chest90(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#141216';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f3f1ea';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#141216';
  ctx.font = `bold ${w * 0.42}px Anton, Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('90', w / 2, h / 2 + 4);
}

export function boomboxFront(ctx, w, h) {
  ctx.fillStyle = '#9ea3ab';
  ctx.fillRect(0, 0, w, h);
  for (const x of [0.2, 0.8]) {
    ctx.fillStyle = '#26272b';
    ctx.beginPath();
    ctx.arc(w * x, h * 0.58, h * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a5d64';
    ctx.beginPath();
    ctx.arc(w * x, h * 0.58, h * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#2b2c30';
  ctx.fillRect(w * 0.38, h * 0.35, w * 0.24, h * 0.42);
  ctx.fillStyle = '#d9a23a';
  ctx.fillRect(w * 0.36, h * 0.12, w * 0.28, h * 0.1);
}

export function skateDeck(ctx, w, h) {
  ctx.fillStyle = '#16151a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#e0302a';
  ctx.lineWidth = 10;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h * (0.3 + i * 0.04));
    ctx.lineTo(w * 0.8, h * (0.34 + i * 0.04));
    ctx.stroke();
  }
  ctx.strokeStyle = '#efe9dc';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.72, w * 0.25, 0, Math.PI * 2);
  ctx.stroke();
}

export function vinylLabel(ctx, w, h) {
  ctx.fillStyle = '#121114';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#2a2830';
  ctx.lineWidth = 2;
  for (let r = w * 0.2; r < w * 0.5; r += 6) {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#d42a22';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w * 0.17, 0, Math.PI * 2);
  ctx.fill();
}

export function magazine(ctx, w, h) {
  ctx.fillStyle = '#e8c22c';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#141216';
  ctx.font = 'bold 60px Anton, Impact, sans-serif';
  ctx.fillText('RIME', w * 0.08, h * 0.2);
  ctx.fillStyle = '#c92a22';
  ctx.fillRect(w * 0.1, h * 0.3, w * 0.8, h * 0.55);
  ctx.fillStyle = '#141216';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.55, w * 0.18, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

export const MAT = (c, o = {}) => clay(c, o);
export function mesh(geo, color, pos, rot = [0, 0, 0], o = {}) {
  const m = new THREE.Mesh(geo, o.map ? new THREE.MeshStandardMaterial({ map: o.map, roughness: 0.85, transparent: !!o.alpha, alphaTest: o.alpha ? 0.3 : 0 }) : MAT(color));
  m.position.set(...pos);
  m.rotation.set(...rot.map((v) => D(v)));
  m.castShadow = m.receiveShadow = true;
  m.userData.id = nextId();
  return m;
}

/** Spiky black hair, the way the paintings do it: a crown of short points on the head. */
export function spikes(obj, n = 11, len = 0.13, color = '#0c0a09') {
  const head = obj.bones.Head;
  obj.updateMatrixWorld(true);
  const ws = head.getWorldScale(new THREE.Vector3()).x;
  const hh = obj.bones.HeadTop_End.getWorldPosition(new THREE.Vector3()).distanceTo(head.getWorldPosition(new THREE.Vector3()));
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 1.6 - Math.PI * 0.8;
    const tilt = 0.55 + 0.25 * Math.sin(i * 2.3);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.035, len * (0.8 + 0.4 * Math.abs(Math.sin(i * 1.7))), 6), clay(color));
    const dir = new THREE.Vector3(Math.sin(a) * tilt, 1, -Math.abs(Math.cos(a)) * 0.35 - 0.1).normalize();
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    c.position.copy(dir.clone().multiplyScalar(hh * 0.62)).add(new THREE.Vector3(0, hh * 0.45, -hh * 0.05));
    c.castShadow = true;
    g.add(c);
  }
  g.scale.setScalar(1 / ws);
  head.add(g);
}

/** A piece of wide clothing round a limb: a tapered tube from one joint to the next, the colour of the cloth
 * (or a texture: stripes down a tracksuit). It hangs from the first bone, so it moves with the body. */
export function tube(obj, from, to, r0, r1, color, ext = [0, 0]) {
  obj.updateMatrixWorld(true);
  const A = obj.bones[from].getWorldPosition(new THREE.Vector3());
  const B = obj.bones[to].getWorldPosition(new THREE.Vector3());
  const d = B.clone().sub(A);
  const L = d.length();
  const u = d.clone().normalize();
  const a = A.clone().addScaledVector(u, -ext[0]), b = B.clone().addScaledVector(u, ext[1]);
  const mat = color?.isTexture ? new THREE.MeshStandardMaterial({ map: color, roughness: 0.9 }) : clay(color);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L + ext[0] + ext[1], 14, 1, false), mat);
  m.position.copy(a.clone().add(b).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), u);
  m.castShadow = m.receiveShadow = true;
  m.userData.id = obj.userData.id;
  m.updateMatrixWorld(true);
  obj.bones[from].attach(m);
  return m;
}

/** A big shoe on a foot: a block from the heel past the toes, on a pale sole. */
export function shoe(obj, side, color, size = 1, sole = '#efe9dc') {
  obj.updateMatrixWorld(true);
  const F = obj.bones[`${side}Foot`].getWorldPosition(new THREE.Vector3());
  const T = obj.bones[`${side}ToeBase`].getWorldPosition(new THREE.Vector3());
  const dir = T.clone().sub(F).normalize();
  const flat = dir.clone().setY(0).normalize();
  const g = new THREE.Group();
  const up = new THREE.Mesh(new THREE.BoxGeometry(0.13 * size, 0.1 * size, 0.31 * size), clay(color));
  up.position.y = 0.035 * size;
  const so = new THREE.Mesh(new THREE.BoxGeometry(0.14 * size, 0.035 * size, 0.33 * size), clay(sole));
  g.add(up, so);
  // level on the ground when the foot is down; lifted with it when it isn't
  const mid = F.clone().add(T).multiplyScalar(0.5);
  g.position.copy(mid).addScaledVector(flat, 0.03);
  g.position.y = Math.max(mid.y - 0.02, 0.018 * size);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), mid.y > 0.15 ? dir : flat);
  g.traverse((m) => m.isMesh && ((m.castShadow = true), (m.userData.id = obj.userData.id)));
  g.userData.id = obj.userData.id;
  g.updateMatrixWorld(true);
  obj.bones[`${side}Foot`].attach(g);
  return g;
}

/** Wide clothes on a thin mannequin: baggy trousers to the shoe, sleeves, heavy shoes. They hang on the bones. */
export function outfit(obj, w, { legs = 0.105, sleeve = 'short', shoes = 1, pants = null, sole } = {}) {
  for (const S of ['Left', 'Right']) {
    tube(obj, `${S}UpLeg`, `${S}Leg`, legs * 1.05, legs * 1.2, pants ?? w.bottom, [0.06, 0.03]);
    tube(obj, `${S}Leg`, `${S}Foot`, legs * 1.15, legs * 0.95, pants ?? w.bottom, [0.02, -0.02]);
    tube(obj, `${S}Arm`, `${S}ForeArm`, 0.065, 0.075, w.top, [0.03, sleeve === 'short' ? -0.1 : 0.02]);
    if (sleeve === 'long') tube(obj, `${S}ForeArm`, `${S}Hand`, 0.062, 0.07, w.top, [0, -0.02]);
    shoe(obj, S, w.shoes, shoes, sole);
  }
  return [];
}

/** Tracksuit trousers: a colour with two white stripes down the side. */
export function stripes(base = '#c92a22', line = '#f1ece2') {
  const t = canvasTex(128, 64, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = line;
    for (const x of [0.2, 0.7]) {
      ctx.fillRect(w * x, 0, w * 0.04, h);
      ctx.fillRect(w * (x + 0.07), 0, w * 0.04, h);
    }
  });
  return t;
}

/** A belly under a shirt, for the grown-up who stayed. */
export function belly(obj, color, size = 1) {
  obj.updateMatrixWorld(true);
  const sp = obj.bones.Spine;
  const ws = sp.getWorldScale(new THREE.Vector3()).x;
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.17 * size, 18, 12), clay(color));
  m.scale.set(1.15 / ws, 1.0 / ws, 0.95 / ws);
  m.position.set(0, 0.02 / ws, 0.07 / ws);
  m.castShadow = true;
  m.userData.id = obj.userData.id;
  sp.add(m);
}

/** A hood up over the head, in the colour of the sweatshirt. */
export function hood(obj, color) {
  obj.updateMatrixWorld(true);
  const head = obj.bones.Head;
  const ws = head.getWorldScale(new THREE.Vector3()).x;
  const hh = obj.bones.HeadTop_End.getWorldPosition(new THREE.Vector3()).distanceTo(head.getWorldPosition(new THREE.Vector3()));
  const m = new THREE.Mesh(new THREE.SphereGeometry(hh * 0.78, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), clay(color));
  m.scale.set(1 / ws, 1.1 / ws, 1.12 / ws);
  m.position.set(0, (hh * 0.42) / ws, (-hh * 0.12) / ws);
  m.rotation.x = -0.35;
  m.castShadow = true;
  m.userData.id = obj.userData.id;
  head.add(m);
}

/** A doberman's head on a man's shoulders: the dog of the block, sitting with us like one of us. */
export function dobermann(obj, yaw = -1.0) {
  const neck = obj.bones.Neck, head = obj.bones.Head;
  obj.updateMatrixWorld(true);
  head.scale.setScalar(0.02);
  const ws = neck.getWorldScale(new THREE.Vector3()).x;
  const g = new THREE.Group();
  const black = '#1a120d', rust = '#b0581f';
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 14), clay(black));
  skull.scale.set(1, 1.05, 1.15);
  skull.position.set(0, 0.13, 0);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.075, 0.26, 14), clay(black));
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.095, 0.19);
  const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.064, 0.23, 12), clay(rust));
  jaw.rotation.x = Math.PI / 2 + 0.12;
  jaw.position.set(0, 0.06, 0.17);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), clay('#0a0808'));
  nose.position.set(0, 0.1, 0.325);
  const brows = [-1, 1].map((sx) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), clay(rust));
    m.position.set(sx * 0.05, 0.19, 0.09);
    return m;
  });
  const ears = [-1, 1].map((sx) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.17, 8), clay(black));
    m.position.set(sx * 0.07, 0.29, -0.01);
    m.rotation.z = -sx * 0.18;
    return m;
  });
  // round dark glasses and the red bandana
  const lenses = [-1, 1].map((sx) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.012, 16), clay('#0b0b10'));
    m.rotation.x = Math.PI / 2;
    m.position.set(sx * 0.047, 0.165, 0.115);
    return m;
  });
  const band = new THREE.Mesh(new THREE.SphereGeometry(0.122, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), clay('#d42a22'));
  band.scale.set(1.02, 1, 1.18);
  band.position.set(0, 0.155, -0.005);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), clay('#c42620'));
  knot.position.set(0.02, 0.2, -0.14);
  knot.rotation.x = -1.1;
  g.add(skull, snout, jaw, nose, ...brows, ...ears, ...lenses, band, knot);
  g.traverse((m) => m.isMesh && (m.castShadow = true));
  // a tongue, a white tooth: he is laughing at the goal
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.07), clay('#d8506a'));
  tongue.position.set(0, 0.045, 0.24);
  tongue.rotation.x = 0.25;
  g.add(tongue);
  g.scale.setScalar(1.22 / ws);
  g.rotation.y = yaw;
  neck.add(g);
}

// ── grown-ups ──
// the RPM body: outfit meshes take their colours by name; its own hat and beard hidden
export const MEN = {
  bebo: { skin: SKIN, hair: '#0c0a09', top: '#2b4fae', bottom: '#2a2a30', shoes: '#efe9dc', sleeves: 'long' },
  saimon: { skin: SKIN, hair: '#0c0a09', top: '#f2efe8', bottom: '#3a5a9a', shoes: '#efe9dc', sleeves: 'short' },
  rocco: { skin: SKIN, hair: '#0c0a09', top: '#1f3a8a', bottom: '#c92a22', shoes: '#efe9dc', sleeves: 'long' },
};
// the people of the gallery: the tuxedoed body, all grey, faces and all
export const GREY = { skin: '#8d8a86', hair: '#5a5754', top: '#2a2a2e', bottom: '#3a3a3e', shoes: '#1a1a1a' };

/** A grown man: the mannequin at full size, short hair (or none), clothes to be put on with outfit(). */
export async function man(who, pose, opts = {}) {
  const base = { scale: 1.0, wear: MEN[who], seed: 5, hair: '#0c0a09', hairSize: 0.95 };
  if (['walk', 'idle', 'run'].includes(pose)) return person('Xbot', { clip: pose, t: 1.3, ...base, ...opts });
  return posed('Xbot', pose, { clip: 'idle', t: 4 + (opts.pos?.[0] ?? 0) * 2.3, rate: 0.85, ...base, ...opts });
}

/** Someone at the opening: a dark suit, grey all over. */
export async function guest(pose, opts = {}) {
  const base = { hide: ['Wolf3D_Headwear', 'Wolf3D_Beard'], wear: GREY, seed: 5 };
  if (['walk', 'idle'].includes(pose)) return person('readyplayer.me', { clip: pose, t: 1.3, ...base, ...opts });
  return posed('readyplayer.me', pose, { clip: 'idle', t: 2 + (opts.pos?.[0] ?? 0) * 2.3, rate: 0.85, ...base, ...opts });
}

export async function woman(pose, opts = {}) {
  const base = { trimHead: { r: 0.55 }, bob: '#0c0a09', bobShape: [0.52, 0.46, -0.12, 1.08], wear: { skin: SKIN, hair: '#0c0a09', top: '#c92a6a', bottom: '#2a2a40', shoes: '#1a1a1a' }, seed: 9 };
  if (['walk', 'idle', 'run', 'samba'].includes(pose)) return person('Michelle', { clip: pose, ...base, ...opts });
  return posed('Michelle', pose, { clip: 'idle', t: 5, rate: 0.85, ...base, ...opts });
}

// ── the cast, dressed ──
/** One of the boys (or Tyson), with his hair (or his head) and his clothes on. year: 96 or 99 (a little taller). */
export async function kid(who, pose, opts = {}, year = 96) {
  const scale = year === 99 ? 0.97 : 0.93;
  const o = await boy(who, pose, { scale, ...opts, ...(who === 'tyson' ? { face: false } : {}) });
  if (who === 'tyson') dobermann(o, opts.dogYaw ?? -1.0);
  else spikes(o, who === 'bebo' ? 9 : 11, who === 'bebo' ? 0.1 : 0.13);
  const W_ = BOYS[who];
  if (who === 'tyson') outfit(o, W_, { legs: 0.115, sleeve: 'long', shoes: 1.2, sole: '#7a4a1a' });
  else outfit(o, W_, { legs: who === 'saimon' ? 0.1 : 0.095 });
  if (who === 'saimon' && opts.decal !== false) decal(o, chest90);
  return o;
}

/** A print on the front of a shirt: found by casting a ray at the chest from in front, then hung on the spine. */
export function decal(obj, draw, size = 0.16) {
  obj.updateMatrixWorld(true);
  const chest = obj.bones.Spine1.getWorldPosition(new THREE.Vector3()).add(obj.bones.Spine2.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(obj.bones.Spine2.getWorldQuaternion(new THREE.Quaternion()));
  const yaw = new THREE.Vector3(Math.sin(obj.rotation.y), 0, Math.cos(obj.rotation.y));
  const dir = fwd.dot(yaw) > 0.3 ? fwd.setY(fwd.y * 0.3).normalize() : yaw;
  const from = chest.clone().addScaledVector(dir, 1.0);
  const ray = new THREE.Raycaster(from, dir.clone().negate());
  const hits = ray.intersectObject(obj, true).filter((h) => h.object.isSkinnedMesh);
  const at = hits[0] ? hits[0].point.clone().addScaledVector(dir, 0.012) : chest.clone().addScaledVector(dir, 0.14);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: tex(256, 256, draw), roughness: 0.85, transparent: true, alphaTest: 0.3 }));
  m.position.copy(at);
  m.lookAt(at.clone().add(dir));
  m.userData.id = nextId();
  m.updateMatrixWorld(true);
  obj.bones.Spine2.attach(m);
  return m;
}

/** A grown man dressed: Bebo in his old tracksuit top, Saimon with his belly, Rocco in his tracksuit. */
export async function grown(who, pose, opts = {}) {
  const o = await man(who, pose, opts);
  const w = MEN[who];
  if (who === 'rocco') outfit(o, w, { legs: 0.1, sleeve: 'long', pants: stripes('#c92a22') });
  else if (who === 'saimon') {
    outfit(o, w, { legs: 0.11, sleeve: 'short' });
    belly(o, w.top, 1.1);
  } else outfit(o, w, { legs: 0.1, sleeve: 'long', pants: w.bottom });
  return o;
}

/** Something held in a hand: the object is hung on the hand bone, offset in the hand's own frame. */
export function inHand(obj, side, thing, off = [0, 0.09, 0.03]) {
  const hand = obj.bones[`${side}Hand`];
  obj.updateMatrixWorld(true);
  const ws = hand.getWorldScale(new THREE.Vector3()).x;
  thing.scale.multiplyScalar(1 / ws);
  thing.position.set(off[0] / ws, off[1] / ws, off[2] / ws);
  hand.add(thing);
  return thing;
}

/** A cassette: the shell, a label written by hand, two reels. */
export function cassette(label = 'ROCCO MIX 96', scale = 1) {
  const g = new THREE.Group();
  const t = tex(400, 256, (ctx, w, h) => {
    ctx.fillStyle = '#26262c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#efe6d2';
    ctx.fillRect(w * 0.06, h * 0.08, w * 0.88, h * 0.6);
    ctx.fillStyle = '#d42a22';
    ctx.fillRect(w * 0.06, h * 0.08, w * 0.88, h * 0.1);
    ctx.fillStyle = '#1f2a6a';
    ctx.font = '38px "Permanent Marker", cursive';
    ctx.fillText(label, w * 0.12, h * 0.34);
    ctx.fillStyle = '#26262c';
    ctx.fillRect(w * 0.22, h * 0.42, w * 0.56, h * 0.2);
    ctx.fillStyle = '#7a5530';
    for (const x of [0.32, 0.68]) {
      ctx.beginPath();
      ctx.arc(w * x, h * 0.52, h * 0.085, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#efe6d2';
    for (const x of [0.32, 0.68]) {
      ctx.beginPath();
      ctx.arc(w * x, h * 0.52, h * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.064, 0.012), [clay('#26262c'), clay('#26262c'), clay('#26262c'), clay('#26262c'), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }), clay('#26262c')]);
  shell.castShadow = true;
  g.add(shell);
  g.scale.setScalar(scale);
  g.userData.id = nextId();
  return g;
}

/** A Bic: the clear hexagonal barrel, the blue cap. */
export function bic(scale = 1) {
  const g = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.13, 6), clay('#cfe0ee'));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0046, 0.0046, 0.03, 8), clay('#1f4fbf'));
  cap.position.y = 0.075;
  const end = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.0035, 0.008, 8), clay('#1f4fbf'));
  end.position.y = -0.068;
  g.add(barrel, cap, end);
  g.traverse((m) => m.isMesh && (m.castShadow = true));
  g.scale.setScalar(scale);
  g.userData.id = nextId();
  return g;
}

/** A jersey from the market, flat on a hanger: colour, a second colour, a number. */
export function jersey(ctx, w, h, a = '#e6c42a', b = '#2f7a3a', num = '10', ink = '#1f3a8a') {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = a;
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.05);
  ctx.lineTo(w * 0.7, h * 0.05);
  ctx.lineTo(w * 0.98, h * 0.22);
  ctx.lineTo(w * 0.86, h * 0.38);
  ctx.lineTo(w * 0.78, h * 0.32);
  ctx.lineTo(w * 0.78, h * 0.98);
  ctx.lineTo(w * 0.22, h * 0.98);
  ctx.lineTo(w * 0.22, h * 0.32);
  ctx.lineTo(w * 0.14, h * 0.38);
  ctx.lineTo(w * 0.02, h * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = b;
  ctx.fillRect(w * 0.22, h * 0.05, w * 0.56, h * 0.06);
  ctx.fillRect(w * 0.02, h * 0.2, w * 0.12, h * 0.05);
  ctx.fillRect(w * 0.86, h * 0.2, w * 0.12, h * 0.05);
  ctx.fillStyle = ink;
  ctx.font = `bold ${h * 0.36}px Anton, Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(num, w * 0.5, h * 0.72);
}
