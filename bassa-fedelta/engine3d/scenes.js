// The shots of BASSA FEDELTÀ as 3D scenes, on the A PARTE stage. Metres; characters face +z unless turned.
// The painter repaints everything flat and bright, so sets are built for colour and shape, not for detail.
import { THREE, W, H, person, posed, boxMesh, plane, clay, nextId } from '/a-parte/engine3d/stage.js';

const D = THREE.MathUtils.degToRad;

function cam(fov, pos, target, far = 60) {
  const c = new THREE.PerspectiveCamera(fov, W / H, 0.05, far);
  c.position.set(...pos);
  c.lookAt(...target);
  c.updateMatrixWorld(true);
  return c;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A framed picture on a wall: the canvas, and a frame around it. */
function framed(w, h, tex, pos, rotY = 0, frame = '#3a2a1c') {
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
function cable(pts, r = 0.009, y = 0.012) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z, yy]) => new THREE.Vector3(x, yy ?? y, z)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, r, 6), clay('#141416'));
  m.castShadow = true;
  m.userData.id = nextId();
  return m;
}

const SKIN = '#18120f';
// the three of them at fourteen: jerseys from the market, shorts, trainers
const BOYS = {
  saimon: { skin: SKIN, hair: '#0c0a09', top: '#f2efe8', bottom: '#2f5fb8', shoes: '#f0eee8', sleeves: 'short' },
  bebo: { skin: SKIN, hair: '#0c0a09', top: '#e6c42a', bottom: '#b8321e', shoes: '#1b1b1d', sleeves: 'short' },
  io: { skin: SKIN, hair: '#0c0a09', top: '#eeeae2', bottom: '#253c9c', shoes: '#f0ece4', sleeves: 'short', shorts: true },
  tyson: { skin: '#16100c', hair: '#16100c', top: '#2f5a32', bottom: '#7d7a3c', shoes: '#d79a2a', sleeves: 'long' },
};

async function boy(who, pose, opts = {}) {
  const base = { scale: 0.93, wear: BOYS[who], seed: 3, ...(who === 'tyson' ? {} : { hair: '#0c0a09', hairSize: 1.0 }) };
  return posed('Xbot', pose, { clip: 'idle', t: 7 + Object.keys(BOYS).indexOf(who) * 1.7, rate: 0.9, ...base, ...opts });
}

// ── 02 · il salotto ─────────────────────────────────────────────────────────────────────────────
// The camera is the television: the three of them on the sofa face us, the room packed full behind them.
function tex(w, h, draw, alpha = false) {
  const t = canvasTex(w, h, draw);
  t.premultiplyAlpha = false;
  return t;
}

function poster96(ctx, w, h) {
  ctx.fillStyle = '#141216';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e0302a';
  ctx.font = 'bold 230px Impact, sans-serif';
  ctx.fillText('96', w * 0.12, h * 0.72);
  ctx.fillStyle = '#efe9dc';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('MIXTAPE VOL.2', w * 0.12, h * 0.9);
}

function posterFace(ctx, w, h) {
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

function posterTarget(ctx, w, h) {
  ctx.fillStyle = '#c92a22';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#141216';
  ctx.font = 'bold 54px Impact, sans-serif';
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

function crown(ctx, w, h) {
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

function chest90(ctx, w, h) {
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
  ctx.font = `bold ${w * 0.42}px Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('90', w / 2, h / 2 + 4);
}

function boomboxFront(ctx, w, h) {
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

function skateDeck(ctx, w, h) {
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

function vinylLabel(ctx, w, h) {
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

function magazine(ctx, w, h) {
  ctx.fillStyle = '#e8c22c';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#141216';
  ctx.font = 'bold 60px Impact, sans-serif';
  ctx.fillText('RIME', w * 0.08, h * 0.2);
  ctx.fillStyle = '#c92a22';
  ctx.fillRect(w * 0.1, h * 0.3, w * 0.8, h * 0.55);
  ctx.fillStyle = '#141216';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.55, w * 0.18, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

const MAT = (c, o = {}) => clay(c, o);
function mesh(geo, color, pos, rot = [0, 0, 0], o = {}) {
  const m = new THREE.Mesh(geo, o.map ? new THREE.MeshStandardMaterial({ map: o.map, roughness: 0.85, transparent: !!o.alpha, alphaTest: o.alpha ? 0.3 : 0 }) : MAT(color));
  m.position.set(...pos);
  m.rotation.set(...rot.map((v) => D(v)));
  m.castShadow = m.receiveShadow = true;
  m.userData.id = nextId();
  return m;
}

/** Spiky black hair, the way the paintings do it: a crown of short points on the head. */
function spikes(obj, n = 11, len = 0.13, color = '#0c0a09') {
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

/** A piece of wide clothing round a limb: a tapered tube from one joint to the next, the colour of the cloth. */
function tube(obj, from, to, r0, r1, color, ext = [0, 0]) {
  const A = obj.bones[from].getWorldPosition(new THREE.Vector3());
  const B = obj.bones[to].getWorldPosition(new THREE.Vector3());
  const d = B.clone().sub(A);
  const L = d.length();
  const u = d.clone().normalize();
  const a = A.clone().addScaledVector(u, -ext[0]), b = B.clone().addScaledVector(u, ext[1]);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L + ext[0] + ext[1], 14, 1), clay(color));
  m.position.copy(a.clone().add(b).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), u);
  m.castShadow = m.receiveShadow = true;
  m.userData.id = obj.userData.id;
  return m;
}

/** A big shoe on a foot: a rounded block from the heel past the toes. */
function shoe(obj, side, color, size = 1) {
  const F = obj.bones[`${side}Foot`].getWorldPosition(new THREE.Vector3());
  const T = obj.bones[`${side}ToeBase`].getWorldPosition(new THREE.Vector3());
  const dir = T.clone().sub(F).setY(0).normalize();
  const g = new THREE.Mesh(new THREE.BoxGeometry(0.13 * size, 0.1 * size, 0.31 * size), clay(color));
  g.position.copy(F.clone().add(T).multiplyScalar(0.5)).setY(0.05 * size);
  g.position.addScaledVector(dir, 0.03);
  g.rotation.y = Math.atan2(dir.x, dir.z);
  g.castShadow = true;
  g.userData.id = obj.userData.id;
  const sole = new THREE.Mesh(new THREE.BoxGeometry(0.14 * size, 0.035 * size, 0.33 * size), clay('#efe9dc'));
  sole.position.copy(g.position).setY(0.018 * size);
  sole.rotation.y = g.rotation.y;
  sole.userData.id = obj.userData.id;
  return [g, sole];
}

/** Wide clothes on a thin mannequin: baggy trousers to the shoe, sleeves, heavy shoes. */
function outfit(obj, w, { legs = 0.105, sleeve = 'short', shoes = 1 } = {}) {
  obj.updateMatrixWorld(true);
  const out = [];
  for (const S of ['Left', 'Right']) {
    out.push(tube(obj, `${S}UpLeg`, `${S}Leg`, legs * 1.05, legs * 1.2, w.bottom, [0.06, 0.03]));
    out.push(tube(obj, `${S}Leg`, `${S}Foot`, legs * 1.15, legs * 0.95, w.bottom, [0.02, -0.02]));
    out.push(tube(obj, `${S}Arm`, `${S}ForeArm`, 0.065, 0.075, w.top, [0.03, sleeve === 'short' ? -0.1 : 0.02]));
    if (sleeve === 'long') out.push(tube(obj, `${S}ForeArm`, `${S}Hand`, 0.062, 0.07, w.top, [0, -0.02]));
    out.push(...shoe(obj, S, w.shoes, shoes));
  }
  return out;
}

/** A doberman's head on a man's shoulders: the dog of the block, sitting with us like one of us. */
function dobermann(obj) {
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
  g.rotation.y = -1.0;
  neck.add(g);
}

async function salotto() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#2a1f4a');
  const BW = -2.0; // back wall
  s.add(plane(6, 5, '#3c2a4e', [0, 0, 0.3]));
  s.add(plane(6, 3.2, '#5c43b0', [0, 1.6, BW], 0));
  const lw = plane(5, 3.2, '#4b4fb0', [-2.4, 1.6, 0.3], 0);
  lw.rotation.y = Math.PI / 2;
  s.add(lw);
  const rw = plane(5, 3.2, '#5a3fa0', [2.4, 1.6, 0.3], 0);
  rw.rotation.y = -Math.PI / 2;
  s.add(rw);
  // a rug under the sofa
  s.add(plane(3.6, 2.4, '#5a2f6a', [0, 0.005, -0.6]));
  // posters, a crown drawn on the wall
  s.add(framed(0.7, 0.9, tex(380, 490, poster96), [-1.55, 2.28, BW + 0.02], 0, '#e8e2d6'));
  s.add(framed(0.62, 0.8, tex(340, 440, posterFace), [-0.75, 2.22, BW + 0.02], 0, '#e8e2d6'));
  s.add(framed(0.78, 0.98, tex(400, 500, posterTarget), [1.25, 2.36, BW + 0.02], 0, '#1a1a1a'));
  s.add(mesh(new THREE.PlaneGeometry(0.5, 0.42), null, [2.0, 2.2, BW + 0.02], [0, 0, 0], { map: tex(300, 250, crown), alpha: true }));
  // a little television on a shelf at the back, showing nothing in particular: static and a skater
  s.add(boxMesh(1.1, 0.06, 0.4, '#6a4024', [0.15, 1.42, BW + 0.2]));
  s.add(boxMesh(0.55, 0.45, 0.42, '#1d1d22', [0.15, 1.48, BW + 0.22]));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.33), new THREE.MeshBasicMaterial({ map: tex(320, 240, (ctx, w, h) => {
    ctx.fillStyle = '#9fb8d8';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#e8eef8' : '#6d84a8';
      ctx.fillRect(Math.random() * w, Math.random() * h, 3, 1);
    }
    ctx.fillStyle = '#1a1a22';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.3, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(w * 0.47, h * 0.36, 20, 40);
    ctx.fillRect(w * 0.36, h * 0.4, 70, 8);
    ctx.fillRect(w * 0.42, h * 0.62, 50, 6);
  }) }));
  scr.position.set(0.15, 1.705, BW + 0.435);
  scr.userData.id = nextId();
  s.add(scr);
  for (let i = 0; i < 5; i++) s.add(boxMesh(0.19, 0.11, 0.025, ['#c92a22', '#e8c22c', '#2c5fb8', '#efe9dc', '#2f7a3a'][i], [-0.25 + i * 0.03, 1.45, BW + 0.12 + i * 0.03]));
  // the sofa, worn red
  const sofa = new THREE.Group();
  sofa.add(boxMesh(2.9, 0.42, 0.95, '#c03a1c', [0, 0, 0]));
  sofa.add(boxMesh(2.9, 0.55, 0.25, '#a8301a', [0, 0.42, -0.36]));
  sofa.add(boxMesh(0.28, 0.3, 0.95, '#a8301a', [-1.45, 0.42, 0]));
  sofa.add(boxMesh(0.28, 0.3, 0.95, '#a8301a', [1.45, 0.42, 0]));
  for (const x of [-0.9, 0, 0.9]) sofa.add(boxMesh(0.86, 0.08, 0.7, '#d34a26', [x, 0.42, 0.08]));
  sofa.position.set(0, 0, BW + 0.75);
  sofa.userData.id = nextId();
  s.add(sofa);
  // on the right, a shelf: the stereo and the tapes
  s.add(boxMesh(0.7, 1.15, 0.45, '#6a4024', [2.0, 0, BW + 0.45]));
  const bb = mesh(new THREE.BoxGeometry(0.62, 0.3, 0.2), '#9ea3ab', [2.0, 1.3, BW + 0.45]);
  s.add(bb);
  s.add(mesh(new THREE.PlaneGeometry(0.6, 0.29), null, [2.0, 1.3, BW + 0.552], [0, 0, 0], { map: tex(400, 190, boomboxFront) }));
  for (let i = 0; i < 9; i++) s.add(boxMesh(0.11, 0.018, 0.07, ['#c92a22', '#efe9dc', '#2c5fb8', '#e8c22c', '#1a1a1a'][i % 5], [1.85 + (i % 3) * 0.13, 0.55 + Math.floor(i / 3) * 0.02 + 0.3, BW + 0.55]));
  // the skateboard against the wall, a basketball
  s.add(mesh(new THREE.BoxGeometry(0.22, 0.82, 0.02), null, [-1.62, 0.43, -1.0], [-6, 25, 10], { map: tex(140, 520, skateDeck) }));
  const ball = mesh(new THREE.SphereGeometry(0.13, 24, 16), '#d2601e', [-1.3, 0.13, -0.35]);
  s.add(ball);
  // the floor in front: the console, its cords running to the television (us), records, tapes, a magazine, a can
  s.add(boxMesh(0.32, 0.07, 0.22, '#16161a', [0.45, 0, -0.1]));
  s.add(cable([[0.4, 0.01], [0.3, 0.5], [0.2, 1.0], [0.1, 1.8]]));
  s.add(cable([[0.4, -0.2], [0.1, -0.5], [-0.4, -0.85, 0.42], [-0.75, -1.05, 0.62]]));
  s.add(cable([[0.5, -0.2], [0.45, -0.6], [0.3, -0.85, 0.4], [0.15, -1.05, 0.62]]));
  s.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.006, 40), null, [-0.55, 0.006, -0.05], [0, 0, 0], {}));
  s.children[s.children.length - 1].material = new THREE.MeshStandardMaterial({ map: tex(256, 256, vinylLabel), roughness: 0.6 });
  s.add(mesh(new THREE.PlaneGeometry(0.3, 0.38), null, [0.95, 0.008, -0.05], [-90, 0, -15], { map: tex(300, 380, magazine) }));
  for (let i = 0; i < 4; i++) s.add(boxMesh(0.11, 0.018, 0.07, ['#efe9dc', '#c92a22', '#2c5fb8', '#1a1a1a'][i], [-0.05 + (i % 2) * 0.02, i * 0.018, 0.1]));
  s.add(mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 16), '#1f7a3a', [1.3, 0.06, -0.3]));
  // more of it: tapes out of their cases, a second record, a cap, a comic, the other controller
  const tapes = ['#efe9dc', '#c92a22', '#e8c22c', '#2c5fb8', '#1a1a1a', '#2f7a3a'];
  for (let i = 0; i < 9; i++) {
    const t = boxMesh(0.11, 0.018, 0.07, tapes[i % tapes.length], [-1.1 + i * 0.27 + Math.sin(i * 3) * 0.05, 0, 0.28 + Math.cos(i * 2.1) * 0.22]);
    t.rotation.y = i * 0.7;
    s.add(t);
  }
  const rec2 = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.006, 40), null, [0.55, 0.012, 0.42], [0, 0, 6], {});
  rec2.material = new THREE.MeshStandardMaterial({ map: tex(256, 256, vinylLabel), roughness: 0.6 });
  s.add(rec2);
  s.add(mesh(new THREE.SphereGeometry(0.11, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#2c5fb8', [-0.95, 0, 0.15]));
  s.add(boxMesh(0.16, 0.012, 0.06, '#2c5fb8', [-0.95, 0, 0.27]));
  s.add(mesh(new THREE.PlaneGeometry(0.26, 0.34), null, [-0.3, 0.01, 0.48], [-90, 0, 20], { map: tex(260, 340, (ctx, w, h) => {
    ctx.fillStyle = '#efe9dc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2c5fb8';
    ctx.fillRect(10, 10, w - 20, h * 0.3);
    ctx.fillStyle = '#e8c22c';
    ctx.fillRect(10, h * 0.36, w * 0.45, h * 0.3);
    ctx.fillStyle = '#c92a22';
    ctx.fillRect(w * 0.52, h * 0.36, w * 0.4, h * 0.6);
    ctx.fillStyle = '#141216';
    ctx.font = 'bold 40px Impact, sans-serif';
    ctx.fillText('BOOM!', 20, h * 0.22);
  }) }));
  s.add(boxMesh(0.14, 0.04, 0.09, '#16161a', [0.15, 0, 0.62]));
  // the three on the sofa: Saimon, the goal just in; Bebo, hands to his head; Tyson, who has seen it all before
  const seatZ = BW + 0.82;
  const saimon = await boy('saimon', 'sitChair', {
    pos: [-0.95, 0, seatZ], rotY: 8, expr: 'shout', drop: -0.02,
    aim: {
      RightArm: [-0.4, 1, 0.1], RightForeArm: [-0.15, 1, 0.05], RightHand: [0, 1, 0],
      LeftArm: [0.3, -0.7, 0.6], LeftForeArm: [-0.25, 0.25, 1],
      LeftUpLeg: [0.45, -0.1, 1], RightUpLeg: [-0.45, -0.1, 1], LeftLeg: [0.18, -1, 0.15], RightLeg: [-0.18, -1, 0.15],
      Spine: [0, 1, 0.05], Head: [0, 1, 0.15],
    },
  });
  const bebo = await boy('bebo', 'sitChair', {
    pos: [0.0, 0, seatZ], rotY: -4, expr: 'sad', drop: -0.02,
    aim: {
      RightArm: [-0.75, 0.6, 0.25], RightForeArm: [0.6, 0.75, -0.15], RightHand: [0.4, 0.4, -0.5],
      LeftArm: [0.75, 0.6, 0.25], LeftForeArm: [-0.6, 0.75, -0.15], LeftHand: [-0.4, 0.4, -0.5],
      LeftUpLeg: [0.3, -0.1, 1], RightUpLeg: [-0.3, -0.1, 1], LeftLeg: [0.1, -1, 0.1], RightLeg: [-0.1, -1, 0.1],
      Spine: [0, 1, 0.2], Neck: [0, 1, 0.2], Head: [0, 0.95, 0.3],
    },
  });
  const tyson = await boy('tyson', 'sitChair', {
    pos: [0.98, 0, seatZ + 0.06], rotY: -12, face: false, drop: 0.02,
    aim: {
      Spine: [0, 1, -0.22], Spine1: [0, 1, -0.12], Neck: [0, 1, 0.15], Head: [0, 1, 0.2],
      LeftUpLeg: [0.3, -0.2, 1], RightUpLeg: [-0.5, -0.12, 1], LeftLeg: [0.06, -1, 0.3], RightLeg: [-0.22, -1, 0.2],
      LeftArm: [0.8, -0.35, -0.2], LeftForeArm: [0.4, -0.2, 1], RightArm: [-0.35, -0.9, 0.3], RightForeArm: [0.05, -0.25, 1],
    },
  });
  spikes(saimon);
  spikes(bebo, 9, 0.1);
  dobermann(tyson);
  s.add(saimon, bebo, tyson);
  s.add(...outfit(saimon, BOYS.saimon, { legs: 0.1 }));
  s.add(...outfit(bebo, BOYS.bebo, { legs: 0.095 }));
  s.add(...outfit(tyson, BOYS.tyson, { legs: 0.115, sleeve: 'long', shoes: 1.2 }));
  // the 90 on Saimon's chest, laid on the front of his tee
  const camera = cam(60, [0.05, 1.02, 1.75], [0.05, 0.9, -1.4]);
  saimon.updateMatrixWorld(true);
  const chest = saimon.bones.Spine1.getWorldPosition(new THREE.Vector3()).add(saimon.bones.Spine2.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
  const ray = new THREE.Raycaster(camera.position.clone(), chest.clone().sub(camera.position).normalize());
  const hit = ray.intersectObject(saimon, true)[0];
  const at = hit ? hit.point.clone().addScaledVector(ray.ray.direction, -0.012) : chest.clone().add(new THREE.Vector3(0, 0, 0.14));
  const tee = mesh(new THREE.PlaneGeometry(0.16, 0.16), null, at.toArray(), [0, 8, 0], { map: tex(256, 256, chest90), alpha: true });
  tee.lookAt(camera.position);
  s.add(tee);
  // light: the television is where we are, blue on their faces; a lamp on the right, warm; the room violet
  s.add(new THREE.HemisphereLight('#b9a8ff', '#3a1f4a', 1.1));
  const tv = new THREE.DirectionalLight('#cfe0ff', 1.5);
  tv.position.set(0.2, 1.2, 4);
  tv.target.position.set(0, 0.9, -1.5);
  tv.castShadow = true;
  tv.shadow.mapSize.set(2048, 2048);
  Object.assign(tv.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, far: 30 });
  tv.shadow.radius = 5;
  tv.shadow.bias = -0.0005;
  s.add(tv, tv.target);
  const lamp = new THREE.PointLight('#ffa850', 6, 7, 1.5);
  lamp.position.set(2.0, 2.1, -0.1);
  s.add(lamp);
  const rim = new THREE.DirectionalLight('#ff6a8a', 0.8);
  rim.position.set(-2, 3, -3);
  s.add(rim);
  return { scene: s, camera, far: 30 };
}

export const SCENES = { salotto };
