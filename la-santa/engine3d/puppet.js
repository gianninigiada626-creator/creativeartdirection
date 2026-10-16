// The puppets of SEX ON LA SANTA, built the way a puppet shop builds them: foam shapes covered in fleece,
// ping-pong eyes, a hinged mouth, yarn for hair, rods for arms. Every part hangs on a simple rig of
// pivots, so a performer (here: a function of time) can work the head, the mouth, the lids and the arms.
import { THREE, nextId } from '/a-parte/engine3d/stage.js';

// ── materials ──────────────────────────────────────────────────────────────────────────────────
function fibres(size = 512, n = 26000, seed = 7) {
  // a field of short fibres: light and dark strokes in every direction, the height of the nap
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  let s = seed;
  const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const x = R() * size, y = R() * size, a = R() * Math.PI * 2, l = 2 + R() * 7;
    const v = Math.floor(90 + R() * 90);
    ctx.strokeStyle = `rgba(${v},${v},${v},0.55)`;
    ctx.lineWidth = 0.6 + R() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  return c;
}

let FUZZ = null;
function fuzz() {
  if (FUZZ) return FUZZ;
  const src = fibres();
  const size = src.width;
  const h = src.getContext('2d').getImageData(0, 0, size, size).data;
  const nc = document.createElement('canvas');
  nc.width = nc.height = size;
  const ctx = nc.getContext('2d');
  const out = ctx.createImageData(size, size);
  const H = (x, y) => h[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * 2.5, dy = (H(x, y + 1) - H(x, y - 1)) * 2.5;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      out.data[i] = (-dx / l * 0.5 + 0.5) * 255;
      out.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255;
      out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  const normal = new THREE.CanvasTexture(nc);
  // the colour of fleece is never flat: the same fibres, as a light tint around white
  const tc = document.createElement('canvas');
  tc.width = tc.height = size;
  const tctx = tc.getContext('2d');
  tctx.fillStyle = '#ffffff';
  tctx.fillRect(0, 0, size, size);
  tctx.globalAlpha = 0.22;
  tctx.drawImage(src, 0, 0);
  const mottle = new THREE.CanvasTexture(tc);
  mottle.colorSpace = THREE.SRGBColorSpace;
  for (const t of [normal, mottle]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
  }
  FUZZ = { normal, mottle };
  return FUZZ;
}

/** Fleece: matte, a soft sheen at the edges where the fibres catch the light, the nap in the surface. */
export function felt(color, { sheen = 0.9, nap = 0.8, repeat = 4 } = {}) {
  const f = fuzz();
  const c = new THREE.Color(color);
  // the sheen of fleece is its own colour, lifted a little: on black it stays a dark grey
  const lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
  const m = new THREE.MeshPhysicalMaterial({
    color: c, roughness: 0.95, metalness: 0, sheen: sheen * (0.45 + 0.55 * Math.min(1, lum * 3)) * (1 - 0.4 * Math.min(1, Math.max(0, lum - 0.25) * 2)), sheenRoughness: 0.6,
    sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), 0.02 + 0.3 * Math.min(1, lum * 2) - 0.14 * Math.min(1, Math.max(0, lum - 0.25) * 2)), normalMap: f.normal, normalScale: new THREE.Vector2(nap, nap),
    map: f.mottle,
  });
  if (repeat !== 4) {
    m.normalMap = f.normal.clone();
    m.normalMap.repeat.set(repeat, repeat);
    m.normalMap.needsUpdate = true;
  }
  return m;
}

/** Yarn: twisted strands, for dreadlocks. */
let YARN = null;
function yarnTex() {
  if (YARN) return YARN;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 64, 256);
  for (let y = -64; y < 320; y += 9) {
    ctx.strokeStyle = 'rgba(30,30,30,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(64, y + 26);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220,220,220,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y + 4);
    ctx.lineTo(64, y + 30);
    ctx.stroke();
  }
  YARN = new THREE.CanvasTexture(c);
  YARN.wrapS = YARN.wrapT = THREE.RepeatWrapping;
  return YARN;
}

export function yarn(color, length = 1) {
  // a ply of wool: the fibres of the fleece, stretched along the strand, and a soft sheen that stays its own colour
  const f = fuzz();
  const n = f.normal.clone();
  n.repeat.set(0.6, Math.max(1, length * 8));
  n.needsUpdate = true;
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.92, sheen: 0.7, sheenRoughness: 0.55, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.08), normalMap: n, normalScale: new THREE.Vector2(0.9, 0.9) });
}

/** A rope of two plies twisted around a path, as a twist of yarn is: pts the path, R how far each ply sits from it. */
export function rope(pts, { R = 0.011, ply = 0.013, pitch = 0.05, mat, parent, seg = 0 }) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const len = curve.getLength();
  const N = seg || Math.max(16, Math.round(len / 0.004));
  const fr = curve.computeFrenetFrames(N, false);
  const turns = len / pitch;
  const g = new THREE.Group();
  for (let k = 0; k < 2; k++) {
    const sp = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = t * turns * Math.PI * 2 + k * Math.PI;
      // the plies taper a little at the ends, where they are tucked
      const end = Math.min(1, t / 0.06, (1 - t) / 0.06);
      sp.push(curve.getPointAt(t).addScaledVector(fr.normals[i], Math.cos(a) * R * end).addScaledVector(fr.binormals[i], Math.sin(a) * R * end));
    }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), N * 2, ply, 8), mat);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
  }
  for (const q of [pts[0], pts[pts.length - 1]]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(ply * 1.25, 10, 8), mat);
    e.position.copy(q);
    g.add(e);
  }
  parent.add(g);
  return g;
}

/** A tracksuit sleeve or trouser leg: black fleece with three white stripes down the outside. */
function striped(base = '#141416', stripe = '#f2f0ea', side = 1) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = stripe;
  const u0 = side > 0 ? 0.13 : 0.77; // the outside of the limb toward the front, whichever side it is on
  for (let k = 0; k < 3; k++) ctx.fillRect(256 * (u0 + k * 0.035), 0, 256 * 0.018, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = felt(base, { nap: 0.4 });
  m.color = new THREE.Color('#ffffff');
  m.map = t;
  return m;
}

/** A sailor's singlet: horizontal stripes, navy on white. */
function singlet(a = '#f2f0ea', b = '#1f2e4a') {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, 64, 256);
  ctx.fillStyle = b;
  for (let y = 0; y < 256; y += 22) ctx.fillRect(0, y, 64, 11);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = felt('#ffffff', { nap: 0.5 });
  m.map = t;
  m.sheen = 0.35;
  m.sheenColor = new THREE.Color('#4a4448');
  return m;
}

/** A printed foulard: a ground with flowers and a border. */
function foulardMat(ground, motif) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, 512, 512);
  let q = 3;
  const R = () => ((q = (q * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const x = R() * 512, y = R() * 512, rr = 8 + R() * 14;
    ctx.fillStyle = motif;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * rr * 0.6, y + Math.sin(a) * rr * 0.6, rr * 0.45, rr * 0.28, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#2a5a3a';
    ctx.beginPath();
    ctx.arc(x, y, rr * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  const m = felt('#ffffff', { nap: 0.5 });
  m.map = t;
  m.sheen = 0.35;
  m.sheenColor = new THREE.Color('#5a3a30');
  m.side = THREE.DoubleSide;
  return m;
}

function glossy(color, clear = 1) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: clear, clearcoatRoughness: 0.08 });
}

const part = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.scale.set(...scale);
  m.castShadow = m.receiveShadow = true;
  return m;
};
const pivot = (pos = [0, 0, 0]) => {
  const g = new THREE.Group();
  g.position.set(...pos);
  return g;
};

// ── Sayf ───────────────────────────────────────────────────────────────────────────────────────
export const SAYF = { name: 'sayf', skin: '#cc8d66', lips: '#bf7a64', hair: '#4a2a1c', brows: '#3e2216', suit: '#141416', iris: '#4a2a14', shoes: '#f2f0ea',
  top: 'track', bottom: 'track', hairStyle: 'sayf', moustache: 'thin', beard: true };
/** Nonna Zohra: a foulard of oranges and reds, gold glasses, a mustard cardigan, a long green skirt. */
export const ZOHRA = { name: 'zohra', hsx: 0.95, hsy: 1.0, er: 0.032, skin: '#b98262', lips: '#b0645a', hair: '#cfc8c0', brows: '#8a7a70', suit: '#c9962e', iris: '#3a2412', shoes: '#3a2a22',
  top: 'cardigan', bottom: 'skirt', skirt: '#2f5a3e', hairStyle: 'foulard', scarf: '#d2462a', scarf2: '#f0b42a', moustache: 'none', glasses: true, cheeks: '#d8806a', scale: 0.86 };
/** The two camalli of the port: striped singlets, forearms like hams, a wool cap, a moustache to hang a coat on. */
export const GINO = { name: 'gino', hsx: 1.0, hsy: 1.0, er: 0.029, skin: '#d99a78', lips: '#c07868', hair: '#b4542a', brows: '#9a4420', suit: '#1f2e4a', iris: '#2a4a6a', shoes: '#2a2018',
  top: 'tank', bottom: 'trousers', trousers: '#3a4a6a', hairStyle: 'cap', cap: '#a8281e', moustache: 'handlebar', stubble: true, nose: '#d0705a', belly: 1.18, forearm: 1.7 };
export const PIPPO = { ...GINO, name: 'pippo', skin: '#c88a64', hair: '#1e1a18', brows: '#1e1a18', cap: '#1f2e4a', nose: '#c07060', trousers: '#4a3a2a', iris: '#3a2412', belly: 1.25 };


/**
 * A puppet. Returns its root (at the hips), its pivots, and controls:
 *   mouth(0..1)  lids(0..1, 0 open)  look(x, y)  pose({ ... rotations of the pivots ... })
 */
export function puppet(C = SAYF, opts = {}) {
  C = { ...SAYF, top: 'track', bottom: 'track', hairStyle: 'none', moustache: 'none', ...C };
  const skin = felt(C.skin);
  const suit = felt(C.suit, { nap: 0.45 });
  const root = new THREE.Group();
  root.userData.id = nextId();
  const P = {};
  const belly = C.belly ?? 1, fa = C.forearm ?? 1;
  // the body, scaled for the small ones; the root stays at the hips
  const body = new THREE.Group();
  root.add(body);
  const S = C.scale ?? 1;
  body.scale.setScalar(S);

  // torso: a rounded block of black fleece, the zip, the collar
  P.torso = pivot([0, 0, 0]);
  body.add(P.torso);
  // a jacket's shape turned on a lathe: hips, a little waist, a broad chest, square shoulders, the collar
  const prof = [[0.0, -0.02], [0.15, 0.0], [0.16, 0.1], [0.175, 0.24], [0.2, 0.36], [0.215, 0.43], [0.19, 0.48], [0.12, 0.53], [0.075, 0.56], [0.0, 0.565]].map(([x, y]) => new THREE.Vector2(x, y));
  const topM = C.top === 'tank' ? singlet() : suit;
  P.torso.add(part(new THREE.LatheGeometry(prof, 40), topM, [0, 0, 0], [0, 0, 0], [1.05 * belly, 1, 0.68 * (0.6 + 0.4 * belly)]));
  if (C.top === 'track') {
    P.torso.add(part(new THREE.BoxGeometry(0.008, 0.42, 0.012), new THREE.MeshStandardMaterial({ color: '#1a1a1c', roughness: 0.8 }), [0, 0.27, 0.142]));
    const rib = felt(C.suit, { nap: 0.3, repeat: 10 });
    const collar = part(new THREE.CylinderGeometry(0.074, 0.086, 0.055, 32, 1, true, 0.12, Math.PI * 2 - 0.24), rib, [0, 0.555, 0.004]);
    collar.material = rib.clone();
    collar.material.side = THREE.DoubleSide;
    P.torso.add(collar);
    P.torso.add(part(new THREE.TorusGeometry(0.074, 0.0055, 8, 32, Math.PI * 2 - 0.24), rib, [0, 0.582, 0.004], [Math.PI / 2, 0, Math.PI / 2 + 0.12]));
  } else if (C.top === 'cardigan') {
    // buttons down the front, a little white collar of the blouse under it
    for (let i = 0; i < 4; i++) P.torso.add(part(new THREE.SphereGeometry(0.011, 10, 8), glossy('#6a4a1a', 0.4), [0, 0.18 + i * 0.085, 0.15 * (0.92 + i * 0.02)], [0, 0, 0], [1, 1, 0.5]));
    P.torso.add(part(new THREE.TorusGeometry(0.07, 0.012, 8, 28), felt('#efe8da'), [0, 0.552, 0.0], [Math.PI / 2, 0, 0]));
  } else if (C.top === 'tank') {
    // the singlet's straps leave the shoulders bare: skin over the top of the chest
    P.torso.add(part(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, 0.5), skin, [0, 0.4, 0], [0, 0, 0], [1.05 * belly, 0.9, 0.68 * (0.6 + 0.4 * belly)]));
    // a tuft of chest hair at the neckline
    P.torso.add(part(new THREE.SphereGeometry(0.035, 12, 8), felt(C.hair, { nap: 1 }), [0, 0.5, 0.11], [0.5, 0, 0], [1.4, 0.8, 0.5]));
  }
  // neck and head
  P.neck = pivot([0, 0.55, 0]);
  P.torso.add(P.neck);
  P.neck.add(part(new THREE.CylinderGeometry(0.048, 0.055, 0.09, 16), skin, [0, 0.03, 0]));
  P.head = pivot([0, 0.04, 0.01]);
  P.neck.add(P.head);
  // a big oval head, as a puppet's is. The face sits low on it, as on the puppet: the eyes on the middle line,
  // the mouth well below, a broad chin; the forehead is under the fringe and the crown under the twists.
  const r = 0.19, sy = C.hsy ?? 1.1, sx = C.hsx ?? 0.9, sz = 0.88, cut = 0.69 * Math.PI;
  const hc = new THREE.Vector3(0, 0.2, 0);
  const surf = (x, y, off = 0) => {
    // the point on the front of the head at (x, y) from its centre, pushed out along the normal by off
    const u = x / (sx * r), v = y / (sy * r);
    const zz = Math.sqrt(Math.max(0.0001, 1 - u * u - v * v)) * sz * r;
    const n = new THREE.Vector3(x / (sx * sx * r * r), y / (sy * sy * r * r), zz / (sz * sz * r * r)).normalize();
    return new THREE.Vector3(x, y, zz).addScaledVector(n, off).add(hc);
  };
  const along = (pts, rad, mat, parent, seg = 24, scale = null) => {
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, rad, 10), mat);
    m.castShadow = true;
    parent.add(m);
    // round the ends
    for (const q of [pts[0], pts[pts.length - 1]]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8), mat);
      e.position.copy(q);
      parent.add(e);
    }
    return m;
  };
  const taper = (pts, radii, mat, parent, seg = 24) => {
    // a tube whose thickness follows radii along it (linear between the given values)
    const curve = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.TubeGeometry(curve, seg, 1, 14);
    const pos = g.attributes.position;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, f = t * (radii.length - 1), k = Math.min(radii.length - 2, Math.floor(f));
      const rad = radii[k] + (radii[k + 1] - radii[k]) * (f - k);
      const c = curve.getPointAt(t);
      for (let j = 0; j <= 14; j++) {
        const q = i * 15 + j;
        pos.setXYZ(q, c.x + (pos.getX(q) - c.x) * rad, c.y + (pos.getY(q) - c.y) * rad, c.z + (pos.getZ(q) - c.z) * rad);
      }
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  P.skull = part(new THREE.SphereGeometry(r, 64, 40, 0, Math.PI * 2, 0, cut), skin, hc.toArray(), [0, 0, 0], [sx, sy, sz]);
  P.head.add(P.skull);
  P.head.add(part(new THREE.SphereGeometry(r * 0.93, 32, 20), new THREE.MeshStandardMaterial({ color: '#2a0b0e', roughness: 1 }), hc.toArray(), [0, 0, 0], [sx, sy, sz]));
  const my = r * Math.cos(cut) * sy; // the line of the mouth, from the centre
  P.jaw = pivot([0, hc.y + my, -0.08]);
  P.head.add(P.jaw);
  const toJaw = (v) => v.clone().sub(P.jaw.position);
  P.head.add(part(new THREE.SphereGeometry(r * 1.003, 64, 6, Math.PI / 2 + 0.8, Math.PI * 2 - 1.6, cut - 0.05, 0.09), skin, hc.toArray(), [0, 0, 0], [sx, sy, sz]));
  P.jaw.add(part(new THREE.SphereGeometry(r, 64, 14, 0, Math.PI * 2, cut, Math.PI - cut), skin, toJaw(hc).toArray(), [0, 0, 0], [sx, sy, sz]));
  // inside the mouth: a dark roof on the head, a dark floor on the jaw, a flat tongue lying back on the floor
  const inner = felt('#3a0c12', { nap: 0.3 });
  inner.side = THREE.DoubleSide;
  const ring = Math.sin(cut) * 0.985;
  const roof = part(new THREE.CircleGeometry(r, 40), inner, [0, hc.y + my + 0.002, 0], [Math.PI / 2, 0, 0], [sx * ring, sz * ring, 1]);
  P.head.add(roof);
  P.jaw.add(part(new THREE.CircleGeometry(r, 40), inner, toJaw(new THREE.Vector3(0, hc.y + my - 0.002, 0)).toArray(), [-Math.PI / 2, 0, 0], [sx * ring, sz * ring, 1]));
  P.jaw.add(part(new THREE.SphereGeometry(0.05, 18, 10), felt('#b0566a'), toJaw(new THREE.Vector3(0, hc.y + my + 0.002, sz * r * Math.sin(cut) - 0.075)).toArray(), [0, 0, 0], [1.25, 0.22, 1.0]));
  // the mouth: a wide line, a thin upper lip under a thin moustache, a full lower lip; a little beard on the chin
  const arc = (y, half, off, n = 11, sag = 0) => Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1) * 2 - 1;
    return surf(t * half, y - sag * (1 - t * t), off);
  });
  const lipM = felt(C.lips, { nap: 0.4 });
  P.upperLip = along(arc(my + 0.005, 0.084, 0.003, 11, -0.006), 0.0058, felt(new THREE.Color(C.skin).lerp(new THREE.Color(C.lips), 0.4).multiplyScalar(0.85)), P.head, 30);
  if (C.moustache === 'thin') along(arc(my + 0.021, 0.074, 0.006, 11, -0.009), 0.0042, felt(C.brows), P.head, 30);
  if (C.moustache === 'handlebar') {
    // two thick sweeps from under the nose, curling up at the ends
    for (const k of [-1, 1]) {
      const pts = [surf(k * 0.006, my + 0.03, 0.012), surf(k * 0.045, my + 0.022, 0.014), surf(k * 0.085, my + 0.018, 0.01), surf(k * 0.112, my + 0.04, 0.008), surf(k * 0.11, my + 0.062, 0.006)];
      taper(pts, [0.016, 0.017, 0.012, 0.007, 0.004], felt(C.hair, { nap: 1.1 }), P.head, 24);
    }
  }
  P.lowerLip = along(arc(my - 0.01, 0.08, 0.01, 11, 0.004).map(toJaw), 0.0118, lipM, P.jaw, 30);
  if (C.beard) P.jaw.add(part(new THREE.SphereGeometry(0.03, 16, 10), felt(new THREE.Color(C.skin).lerp(new THREE.Color(C.brows), 0.45)), toJaw(surf(0, my - 0.05, -0.006)).toArray(), [0, 0, 0], [1.5, 0.75, 0.35]));
  if (C.stubble) P.jaw.add(part(new THREE.SphereGeometry(r * 1.004, 40, 10, Math.PI / 2 - 1.2, 2.4, cut + 0.05, Math.PI - cut - 0.25), felt(new THREE.Color(C.skin).lerp(new THREE.Color('#3a3030'), 0.35)), toJaw(hc).toArray(), [0, 0, 0], [sx, sy, sz]));
  if (C.cheeks) for (const k of [-1, 1]) P.head.add(part(new THREE.SphereGeometry(0.03, 14, 10), felt(C.cheeks, { nap: 0.4 }), surf(k * 0.085, -0.05, -0.012).toArray(), [0, 0, 0], [1, 0.8, 0.5]));
  // the nose: a long bridge from between the eyes to a big round tip, the nostrils either side of it
  const nt = surf(0, -0.068, 0.034);
  taper([surf(0, 0.022, -0.004), surf(0, -0.01, 0.012), surf(0, -0.042, 0.026), nt], [0.012, 0.016, 0.022, 0.026], skin, P.head, 20);
  P.head.add(part(new THREE.SphereGeometry(0.029 * (C.nose ? 1.2 : 1), 20, 16), C.nose ? felt(C.nose) : skin, nt.toArray(), [0.25, 0, 0], [1.2, 0.95, 1.0]));
  for (const sx_ of [-1, 1]) P.head.add(part(new THREE.SphereGeometry(0.017, 12, 10), skin, surf(sx_ * 0.028, -0.078, 0.015).toArray(), [0, 0, 0], [1.1, 0.85, 0.9]));
  // eyes: glossy whites, brown irises, black pupils, a highlight; heavy lids that roll down, a soft rim under them
  P.eyes = [];
  P.lids = [];
  const er = C.er ?? 0.035;
  for (const sx_ of [-1, 1]) {
    const at = surf(sx_ * 0.06, -0.006, -0.011);
    const eye = pivot(at.toArray());
    P.head.add(eye);
    eye.add(part(new THREE.SphereGeometry(er, 28, 20), glossy('#f6f3ec')));
    const ball = pivot();
    eye.add(ball);
    ball.add(part(new THREE.SphereGeometry(0.0165, 20, 14), glossy(C.iris, 0.6), [0, 0, 0.0272], [0, 0, 0], [1, 1, 0.45]));
    ball.add(part(new THREE.SphereGeometry(0.0092, 14, 10), glossy('#0a0806', 0.6), [0, 0, 0.0335], [0, 0, 0], [1, 1, 0.4]));
    ball.add(part(new THREE.SphereGeometry(0.0032, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), [-0.006, 0.007, 0.0372]));
    P.eyes.push(ball);
    const lid = pivot();
    eye.add(lid);
    lid.add(part(new THREE.SphereGeometry(er + 0.003, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), skin));
    lid.add(part(new THREE.TorusGeometry(er + 0.002, 0.0052, 8, 28, Math.PI), skin));
    P.lids.push(lid);
    // the rim under the eye
    eye.add(part(new THREE.TorusGeometry(er + 0.001, 0.0048, 8, 24, Math.PI * 0.8), skin, [0, -0.002, 0.004], [0.35, 0, Math.PI + Math.PI * 0.1]));
    // the brow: a thick dark bar, a little arched, well above the eye
    const bw = Array.from({ length: 7 }, (_, i) => {
      const t = i / 6;
      return surf(sx_ * (0.02 + t * 0.078), 0.05 + 0.011 * Math.sin(t * Math.PI * 0.9) - t * 0.006, 0.007);
    });
    P[sx_ < 0 ? 'browR' : 'browL'] = along(bw, 0.0095, felt(C.brows), P.head, 16);
    // the ear: a round shell standing off the side of the head, turned a little forward
    if (C.hairStyle === 'foulard') continue;
    const ear = pivot([sx_ * r * sx * 0.96, hc.y - 0.012, -0.02]);
    ear.rotation.set(0, sx_ * 0.45, sx_ * -0.08);
    P.head.add(ear);
    ear.add(part(new THREE.SphereGeometry(0.046, 18, 14), skin, [sx_ * 0.012, 0, 0], [0, 0, 0], [0.38, 1.0, 0.72]));
    ear.add(part(new THREE.SphereGeometry(0.03, 14, 10), felt(new THREE.Color(C.skin).multiplyScalar(0.72)), [sx_ * 0.026, -0.002, 0.004], [0, 0, 0], [0.22, 1.0, 0.68]));
  }
  if (C.glasses) {
    // round gold frames on the nose
    const gold = new THREE.MeshStandardMaterial({ color: '#d4a640', metalness: 0.9, roughness: 0.3 });
    for (const k of [-1, 1]) P.head.add(part(new THREE.TorusGeometry(0.043, 0.0035, 8, 32), gold, surf(k * 0.06, -0.006, 0.03).toArray(), [0, k * 0.25, 0]));
    along([surf(-0.018, 0.0, 0.03), surf(0, 0.006, 0.036), surf(0.018, 0.0, 0.03)], 0.003, gold, P.head, 8);
  }
  // hair: a felt fringe cut straight across the forehead, the shaved sides, rows of twists on top, long locks behind
  const hairF = felt(C.hair, { nap: 0.75 });
  P.twists = [];
  P.locks = [];
  if (C.hairStyle === 'sayf') {
  const fringe = (() => {
    const nu = 48, y0 = 0.084, hh = 0.078, a0 = Math.PI * 0.44;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= nu; i++) {
      const a = (i / nu * 2 - 1) * a0;
      for (let j = 0; j <= 1; j++) {
        const y = y0 + j * hh;
        const k = Math.sqrt(Math.max(0, 1 - (y / (sy * r)) ** 2));
        const x = Math.sin(a) * sx * r * k, zz = Math.cos(a) * sz * r * k;
        const n = new THREE.Vector3(x / (sx * sx), y / (sy * sy), zz / (sz * sz)).normalize();
        const v = new THREE.Vector3(x, y, zz).addScaledVector(n, 0.012 + 0.004 * (1 - j)).add(hc);
        pos.push(v.x, v.y, v.z);
        uv.push(i / nu, j);
      }
    }
    for (let i = 0; i < nu; i++) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    // the cut: a straight edge with square notches snipped into it, rising at the temples
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 512, 64);
    ctx.fillStyle = '#000';
    for (let x = 0; x < 512; x++) {
      const e = Math.max(0, Math.abs(x / 511 * 2 - 1) - 0.72) / 0.28;
      ctx.fillRect(x, 64 - 52 * e * e, 1, 64);
    }
    const R = (() => { let q = 11; return () => ((q = (q * 16807) % 2147483647) / 2147483647); })();
    for (let x = 70; x < 450; x += 34 + R() * 26) ctx.fillRect(x, 64 - (14 + R() * 16), 9 + R() * 8, 64);
    const m = hairF.clone();
    m.alphaMap = new THREE.CanvasTexture(c);
    m.alphaTest = 0.5;
    m.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = true;
    return mesh;
  })();
  P.head.add(fringe);
  // the cap of hair over the crown, and the shaved sides a shade darker than the face
  P.head.add(part(new THREE.SphereGeometry(r * 1.03, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.27), hairF, hc.toArray(), [0, 0, 0], [sx, sy, sz]));
  P.head.add(part(new THREE.SphereGeometry(r * 1.006, 48, 24, Math.PI / 2 + 1.2, Math.PI * 2 - 2.4, Math.PI * 0.2, Math.PI * 0.24), felt(new THREE.Color(C.skin).lerp(new THREE.Color(C.hair), 0.28).multiplyScalar(0.92)), hc.toArray(), [0, 0, 0], [sx, sy, sz]));
  // the twists: ropes of yarn laid in rows across the head, temple to temple, from just over the fringe to the back;
  // the rows in the middle ride higher, so the crown is a mound of rope
  const ply = yarn(C.hair, 1);
  const over = (x, al, lift) => {
    // al: 0 on top of the head, positive toward the face, negative toward the back
    const k = Math.sqrt(Math.max(0.05, 1 - (x / (sx * r * 1.03)) ** 2));
    const v = new THREE.Vector3(x, Math.cos(al) * sy * r * 1.03 * k, Math.sin(al) * sz * r * 1.03 * k);
    const n = new THREE.Vector3(v.x / (sx * sx), v.y / (sy * sy), v.z / (sz * sz)).normalize();
    return v.addScaledVector(n, lift).add(hc);
  };
  const R2 = (() => { let q = 5; return () => ((q = (q * 16807) % 2147483647) / 2147483647); })();
  P.twists = [];
  const rows = [0.66, 0.46, 0.27, 0.08, -0.12, -0.33, -0.55, -0.78, -1.02, -1.28];
  rows.forEach((al0, ri) => {
    const mound = Math.max(0, Math.cos((al0 + 0.25) * 1.25));
    const half = 0.152 - 0.004 * Math.abs(ri - 4);
    const pts = [];
    const ph = R2() * 6;
    for (let j = 0; j <= 14; j++) {
      const t = j / 14, x = (t * 2 - 1) * half;
      const mid = Math.cos((t * 2 - 1) * Math.PI / 2);
      const al = al0 + 0.05 * Math.sin(ph + t * 5) + (ri === 0 ? -0.08 * (1 - mid) : 0);
      pts.push(over(x, al, 0.017 + 0.03 * mound * mid + 0.004 * Math.sin(ph + j * 1.9)));
    }
    P.twists.push(rope(pts, { R: 0.0092, ply: 0.0112, pitch: 0.058 + R2() * 0.012, mat: ply, parent: P.head }));
  });
  // a few loose ones on top, lying every which way, so the mound is not too tidy
  for (let i = 0; i < 4; i++) {
    const al = 0.35 - i * 0.32, x0 = (R2() - 0.5) * 0.08, dir = R2() < 0.5 ? -1 : 1;
    const pts = [];
    for (let j = 0; j <= 8; j++) {
      const t = j / 8;
      pts.push(over(x0 + dir * (t - 0.5) * 0.16, al + (t - 0.5) * 0.35 * dir, 0.04 + 0.014 * Math.sin(t * Math.PI)));
    }
    P.twists.push(rope(pts, { R: 0.0092, ply: 0.0112, pitch: 0.06, mat: ply, parent: P.head }));
  }
  // the locks: long twists falling from the back of the head past the collar
  P.locks = [];
  for (let i = 0; i < 11; i++) {
    const ps = Math.PI + (i / 10 * 2 - 1) * 1.25 + (R2() - 0.5) * 0.1;
    const th = 0.5 * Math.PI + (R2() - 0.5) * 0.25;
    const out = new THREE.Vector3(Math.sin(ps), 0, Math.cos(ps));
    const p = new THREE.Vector3(Math.sin(th) * Math.sin(ps) * sx, Math.cos(th) * sy, Math.sin(th) * Math.cos(ps) * sz).multiplyScalar(r).add(hc);
    const len = 0.3 + R2() * 0.08;
    const sw = (R2() - 0.5) * 0.03;
    const pts = [p, p.clone().addScaledVector(out, 0.03).add(new THREE.Vector3(0, -0.05, 0)),
      p.clone().addScaledVector(out, 0.05).add(new THREE.Vector3(sw, -len * 0.45, -0.01)),
      p.clone().addScaledVector(out, 0.058).add(new THREE.Vector3(sw * 1.6, -len * 0.75, -0.02)),
      p.clone().addScaledVector(out, 0.062).add(new THREE.Vector3(sw * 2, -len, -0.03))];
    P.locks.push(rope(pts, { R: 0.008, ply: 0.0098, pitch: 0.055, mat: ply, parent: P.head }));
  }
  } else if (C.hairStyle === 'foulard') {
    // a little grey hair at the forehead, then the foulard over all of it, knotted under the chin
    const fm = foulardMat(C.scarf, C.scarf2);
    P.scarf = new THREE.Group();
    P.head.add(P.scarf);
    P.scarf.add(part(new THREE.SphereGeometry(r * 1.07, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.35), fm, hc.toArray(), [0, 0, 0], [sx * 1.02, sy, sz * 1.03]));
    P.scarf.add(part(new THREE.TorusGeometry(r * 1.07 * Math.sin(Math.PI * 0.35), 0.012, 8, 40, Math.PI * 1.1), fm, [0, hc.y + r * sy * 1.07 * Math.cos(Math.PI * 0.35), 0], [Math.PI / 2, 0, -Math.PI * 0.05], [sx * 1.02, sz * 1.03, 1]));
    // the sides fall past the ears to the jaw, open at the face
    P.scarf.add(part(new THREE.SphereGeometry(r * 1.075, 48, 20, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, Math.PI * 0.2, Math.PI * 0.58), fm, hc.toArray(), [0, 0, 0], [sx * 1.02, sy, sz * 1.02]));
    P.scarf.add(part(new THREE.SphereGeometry(0.035, 14, 10), fm, [0, hc.y - sy * r * 1.02, 0.02], [0, 0, 0], [1.3, 0.8, 0.9]));
    for (const k of [-1, 1]) P.scarf.add(part(new THREE.ConeGeometry(0.03, 0.09, 10), fm, [k * 0.025, hc.y - sy * r * 1.02 - 0.05, 0.03], [0.2, 0, k * 0.4]));
  } else if (C.hairStyle === 'cap') {
    // a wool docker's cap, rolled at the brim, and the hair showing under it at the back and sides
    P.head.add(part(new THREE.SphereGeometry(r * 1.01, 40, 12, Math.PI / 2 + 1.3, Math.PI * 2 - 2.6, Math.PI * 0.32, Math.PI * 0.16), hairF, hc.toArray(), [0, 0, 0], [sx, sy, sz]));
    const capM = felt(C.cap, { nap: 1.0, repeat: 8 });
    P.cap = new THREE.Group();
    P.head.add(P.cap);
    P.cap.add(part(new THREE.SphereGeometry(r * 1.06, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.36), capM, hc.toArray(), [-0.1, 0, 0], [sx * 1.02, sy * 1.12, sz * 1.02]));
    P.cap.add(part(new THREE.TorusGeometry(r * 1.06 * Math.sin(Math.PI * 0.36), 0.02, 10, 40), capM, [0, hc.y + r * sy * Math.cos(Math.PI * 0.36) * 1.04 + 0.01, 0.02], [Math.PI / 2 - 0.1, 0, 0], [sx * 1.02, sz * 1.02, 1]));
    P.cap.add(part(new THREE.SphereGeometry(0.025, 12, 8), capM, [0, hc.y + r * sy * 1.18, -0.03]));
  }
  // the three stripes of the jacket, from the collar over the top of each shoulder
  if (C.top === 'track') {
    const lathe = (y) => {
      for (let i = 0; i < prof.length - 1; i++) if (y >= prof[i].y && y <= prof[i + 1].y) return prof[i].x + (prof[i + 1].x - prof[i].x) * (y - prof[i].y) / (prof[i + 1].y - prof[i].y);
      return 0.0;
    };
    const onJacket = (ps, y, lift = 0.004) => {
      const rad = lathe(y);
      const n = new THREE.Vector3(Math.sin(ps) / 1.05, 0.4, Math.cos(ps) / 0.68).normalize();
      return new THREE.Vector3(Math.sin(ps) * rad * 1.05, y, Math.cos(ps) * rad * 0.68).addScaledVector(n, lift);
    };
    const white = felt('#f2f0ea', { nap: 0.3 });
    for (const sx_ of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const pts = [];
        for (let j = 0; j <= 8; j++) {
          const t = j / 8;
          const ps = sx_ * (0.55 + t * 1.0 + k * 0.035 * (1 - t));
          const y = 0.535 - t * 0.09 - k * 0.012 * (0.3 + t);
          pts.push(onJacket(ps, y, 0.002 + 0.004 * t));
        }
        along(pts, 0.0034, white, P.torso, 24);
      }
    }
  }
  // arms: rods inside the sleeves; hands of fleece with four fingers
  for (const [side, sx_] of [['L', 1], ['R', -1]]) {
    const sh = pivot([sx_ * 0.205, 0.43, 0]);
    P.torso.add(sh);
    const sleeve = C.top === 'track' ? striped(C.suit, '#f2f0ea', sx_) : C.top === 'tank' ? skin : suit;
    sh.add(part(new THREE.SphereGeometry(0.063, 16, 12), C.top === 'tank' ? skin : suit, [0, 0, 0]));
    sh.add(part(new THREE.CylinderGeometry(0.062, 0.058, 0.27, 18), sleeve, [0, -0.135, 0]));
    const el = pivot([0, -0.27, 0]);
    sh.add(el);
    // the forearm: a camallo's swells like a ham toward the wrist
    el.add(part(new THREE.CylinderGeometry(0.057 * fa, 0.05 * (1 + (fa - 1) * 0.6), 0.24, 18), sleeve, [0, -0.12, 0]));
    if (C.top !== 'tank') el.add(part(new THREE.TorusGeometry(0.048, 0.012, 8, 20), suit, [0, -0.235, 0], [Math.PI / 2, 0, 0]));
    else el.add(part(new THREE.SphereGeometry(0.057 * fa, 16, 10), skin, [0, -0.04, 0], [0, 0, 0], [1, 1.3, 1]));
    const wr = pivot([0, -0.25, 0]);
    el.add(wr);
    wr.add(part(new THREE.SphereGeometry(0.05, 18, 12), skin, [0, -0.05, 0.005], [0, 0, 0], [1.05, 1.15, 0.55]));
    for (let f = 0; f < 3; f++) {
      const fx = (f - 1) * 0.026;
      wr.add(part(new THREE.CapsuleGeometry(0.0125, 0.045, 4, 10), skin, [fx, -0.115, 0.004], [0.15, 0, fx * 2]));
    }
    wr.add(part(new THREE.CapsuleGeometry(0.0135, 0.04, 4, 10), skin, [sx_ * -0.045, -0.06, 0.02], [0.4, 0, sx_ * -0.9]));
    P['shoulder' + side] = sh;
    P['elbow' + side] = el;
    P['wrist' + side] = wr;
  }
  // legs: trousers with the stripes, white trainers
  for (const [side, sx_] of [['L', 1], ['R', -1]]) {
    const hip = pivot([sx_ * 0.1, 0.04, 0]);
    body.add(hip);
    const legM = C.bottom === 'track' ? striped(C.suit, '#f2f0ea', sx_) : C.bottom === 'skirt' ? felt('#3a2a26', { nap: 0.3 }) : felt(C.trousers ?? '#3a4a6a');
    hip.add(part(new THREE.CylinderGeometry(0.085, 0.078, 0.42, 18), legM, [0, -0.21, 0]));
    const kn = pivot([0, -0.42, 0]);
    hip.add(kn);
    kn.add(part(new THREE.SphereGeometry(0.08, 14, 10), C.bottom === 'track' ? suit : legM));
    kn.add(part(new THREE.CylinderGeometry(0.076, 0.07, 0.42, 18), legM, [0, -0.21, 0]));
    const ft = pivot([0, -0.43, 0]);
    kn.add(ft);
    ft.add(part(new THREE.CapsuleGeometry(0.055, 0.15, 6, 14), felt(C.shoes, { nap: 0.3 }), [0, -0.03, 0.06], [Math.PI / 2, 0, 0], [1.15, 1, 0.8]));
    ft.add(part(new THREE.BoxGeometry(0.12, 0.025, 0.28), new THREE.MeshStandardMaterial({ color: '#d8d2c4', roughness: 0.7 }), [0, -0.075, 0.06]));
    P['hip' + side] = hip;
    P['knee' + side] = kn;
    P['ankle' + side] = ft;
  }
  if (C.bottom === 'skirt') {
    // a long skirt from the waist to the shins, hanging from the torso so it follows the hips
    P.skirt = part(new THREE.CylinderGeometry(0.19, 0.3, 0.7, 32, 1, true), felt(C.skirt, { nap: 0.5 }), [0, -0.3, 0], [0, 0, 0], [1, 1, 0.8]);
    P.skirt.material.side = THREE.DoubleSide;
    body.add(P.skirt);
  }
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = o.receiveShadow = true;
  });

  // ── controls ──
  const api = {
    root, P,
    mouth(v) {
      P.jaw.rotation.x = Math.max(0, Math.min(1, v)) * 0.42;
    },
    lids(v) {
      // 0: wide open, 1: shut. Rolled down from the top
      for (const l of P.lids) l.rotation.x = -0.9 + Math.max(0, Math.min(1, v)) * 2.25;
    },
    look(x, y) {
      for (const e of P.eyes) e.rotation.set(-y * 0.45, x * 0.6, 0);
    },
    /** rotations in radians: { torso: [x,y,z], neck, head, shoulderL, elbowL, wristL, ..., hipL, kneeL, ankleL, ... } */
    pose(p) {
      for (const [k, v] of Object.entries(p)) if (P[k] && Array.isArray(v)) P[k].rotation.set(...v);
    },
  };
  api.mouth(0);
  api.lids(0.38);
  return api;
}

/** Sitting on a bench: thighs forward, shins down, one arm along the backrest. */
export const SIT = {
  hipL: [-1.45, 0.08, 0.05], hipR: [-1.45, -0.12, -0.05], kneeL: [1.5, 0, 0], kneeR: [1.35, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0],
  torso: [-0.12, 0, 0], neck: [0.08, 0, 0],
  shoulderL: [0.1, 0, 0.35], elbowL: [-0.5, 0, 0], shoulderR: [0.25, 0, -0.25], elbowR: [-1.3, 0, 0.15], wristR: [0, 0, 0],
};
