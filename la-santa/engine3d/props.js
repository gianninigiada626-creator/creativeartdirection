// The rest of the cast and the props of SEX ON LA SANTA: the seagull, the singing bottles, the ice cubes,
// the ingredients, the cocktail, and what is on the counter. Felt, foam and ping-pong balls, like the puppets.
import { THREE, nextId, renderer } from '/a-parte/engine3d/stage.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { felt } from './puppet.js';

/** A soft room to reflect in, for metal, glass and the eyes. */
let ENV = null;
export function env() {
  if (!ENV) ENV = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  return ENV;
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
const glossy = (color, clear = 1) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: clear, clearcoatRoughness: 0.08, envMap: env(), envMapIntensity: 0.35 });
const gold = () => new THREE.MeshStandardMaterial({ color: '#e0b040', metalness: 0.95, roughness: 0.25, envMap: env(), envMapIntensity: 1.2 });
const steel = () => new THREE.MeshStandardMaterial({ color: '#c8ccd2', metalness: 0.95, roughness: 0.2, envMap: env(), envMapIntensity: 1.0 });
const tagged = (g) => {
  g.userData.id = nextId();
  g.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  return g;
};

/** Ping-pong eyes with lids, for anything with a face. Returns { group, lids(v), look(x, y) }. */
export function eyes(r = 0.025, gap = 0.055, lidColor = '#f0ece4', iris = '#3a2412') {
  const g = new THREE.Group();
  const lidsArr = [], balls = [];
  const lidM = felt(lidColor);
  for (const k of [-1, 1]) {
    const e = pivot([k * gap / 2, 0, 0]);
    g.add(e);
    e.add(part(new THREE.SphereGeometry(r, 20, 14), glossy('#f6f3ec')));
    const b = pivot();
    e.add(b);
    b.add(part(new THREE.SphereGeometry(r * 0.45, 14, 10), glossy(iris, 0.6), [0, 0, r * 0.8], [0, 0, 0], [1, 1, 0.4]));
    b.add(part(new THREE.SphereGeometry(r * 0.24, 10, 8), glossy('#0a0806', 0.6), [0, 0, r * 0.97], [0, 0, 0], [1, 1, 0.4]));
    b.add(part(new THREE.SphereGeometry(r * 0.09, 6, 4), new THREE.MeshBasicMaterial({ color: '#fff' }), [-r * 0.17, r * 0.2, r * 1.04]));
    balls.push(b);
    const l = pivot();
    e.add(l);
    l.add(part(new THREE.SphereGeometry(r * 1.08, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), lidM));
    lidsArr.push(l);
  }
  const api = {
    group: g,
    lids(v) {
      for (const l of lidsArr) l.rotation.x = -0.9 + Math.max(0, Math.min(1, v)) * 2.25;
    },
    look(x, y) {
      for (const b of balls) b.rotation.set(-y * 0.45, x * 0.6, 0);
    },
  };
  api.lids(0.25);
  return api;
}

// ── the seagull: Sayf's manager ──────────────────────────────────────────────────────────────────
export function seagull() {
  const root = new THREE.Group();
  const P = {};
  const white = felt('#f2f0ea'), grey = felt('#9aa0a8'), black = felt('#1a1a1c'), yellow = new THREE.MeshPhysicalMaterial({ color: '#f0b418', roughness: 0.45, clearcoat: 0.3 }), orange = felt('#e8873a');
  P.body = pivot([0, 0.3, 0]);
  root.add(P.body);
  P.body.add(part(new THREE.SphereGeometry(0.17, 28, 20), white, [0, 0, 0], [0, 0, 0], [1, 1.05, 1.45]));
  // the tail
  P.body.add(part(new THREE.ConeGeometry(0.08, 0.2, 12), grey, [0, 0.02, -0.25], [-Math.PI / 2 - 0.3, 0, 0], [1.4, 1, 0.4]));
  P.body.add(part(new THREE.ConeGeometry(0.06, 0.08, 12), black, [0, 0.06, -0.34], [-Math.PI / 2 - 0.3, 0, 0], [1.4, 1, 0.4]));
  // wings: grey felt with black tips, on pivots at the shoulders
  for (const [side, k] of [['L', 1], ['R', -1]]) {
    const w = pivot([k * 0.15, 0.06, 0.02]);
    P.body.add(w);
    w.add(part(new THREE.SphereGeometry(0.13, 18, 12), grey, [k * 0.03, -0.05, -0.08], [0.3, 0, 0], [0.25, 0.7, 1.4]));
    w.add(part(new THREE.SphereGeometry(0.07, 14, 10), black, [k * 0.035, -0.06, -0.24], [0.3, 0, 0], [0.22, 0.6, 1.2]));
    P['wing' + side] = w;
  }
  // the head on a neck that bobs
  P.neck = pivot([0, 0.13, 0.12]);
  P.body.add(P.neck);
  P.neck.add(part(new THREE.CylinderGeometry(0.065, 0.09, 0.12, 16), white, [0, 0.03, 0]));
  P.head = pivot([0, 0.1, 0.02]);
  P.neck.add(P.head);
  P.head.add(part(new THREE.SphereGeometry(0.11, 28, 20), white, [0, 0.03, 0], [0, 0, 0], [0.95, 1, 1.05]));
  const E = eyes(0.03, 0.09, '#dcdcdc', '#c8a020');
  E.group.position.set(0, 0.07, 0.085);
  E.group.rotation.x = -0.1;
  P.head.add(E.group);
  // the beak: a long yellow upper half, a hinged lower half with the red spot
  P.head.add(part(new THREE.ConeGeometry(0.035, 0.16, 14), yellow, [0, 0.0, 0.17], [Math.PI / 2 + 0.12, 0, 0], [1.3, 1, 0.7]));
  P.head.add(part(new THREE.SphereGeometry(0.018, 10, 8), yellow, [0, -0.012, 0.245], [0, 0, 0], [1.1, 0.9, 1.3]));
  P.jaw = pivot([0, -0.02, 0.1]);
  P.head.add(P.jaw);
  P.jaw.add(part(new THREE.ConeGeometry(0.03, 0.13, 14), yellow, [0, -0.012, 0.06], [Math.PI / 2 - 0.05, 0, 0], [1.25, 1, 0.5]));
  P.jaw.add(part(new THREE.SphereGeometry(0.012, 10, 8), felt('#d2321e'), [0, -0.016, 0.1]));
  P.jaw.add(part(new THREE.CircleGeometry(0.03, 16), felt('#7a1418'), [0, -0.003, 0.05], [-Math.PI / 2, 0, 0], [1, 2, 1]));
  // the gold chain, link by link
  const g = gold();
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2;
    P.neck.add(part(new THREE.SphereGeometry(0.0075, 8, 6), g, [Math.sin(a) * 0.088, -0.015 - 0.035 * (1 + Math.cos(a)) * 0.5, Math.cos(a) * 0.093]));
  }
  P.neck.add(part(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 16), g, [0, -0.05, 0.1], [Math.PI / 2 - 0.3, 0, 0]));
  // sunglasses, put on when he is the manager
  P.shades = new THREE.Group();
  const shadeM = new THREE.MeshPhysicalMaterial({ color: '#0a0a0c', roughness: 0.1, clearcoat: 1 });
  for (const k of [-1, 1]) P.shades.add(part(new THREE.CylinderGeometry(0.036, 0.036, 0.008, 20), shadeM, [k * 0.045, 0.07, 0.115], [Math.PI / 2, 0, 0], [1.2, 1, 0.8]));
  P.shades.add(part(new THREE.BoxGeometry(0.03, 0.006, 0.006), shadeM, [0, 0.08, 0.12]));
  P.shades.visible = false;
  P.head.add(P.shades);
  // legs and webbed feet
  for (const [side, k] of [['L', 1], ['R', -1]]) {
    const leg = pivot([k * 0.06, -0.15, 0.02]);
    P.body.add(leg);
    leg.add(part(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), orange, [0, -0.08, 0]));
    leg.add(part(new THREE.ConeGeometry(0.05, 0.08, 3), orange, [0, -0.165, 0.035], [Math.PI / 2, 0, 0], [1, 1, 0.25]));
    P['leg' + side] = leg;
  }
  tagged(root);
  return {
    root, P,
    mouth(v) { P.jaw.rotation.x = Math.max(0, Math.min(1, v)) * 0.55; },
    lids: E.lids, look: E.look,
    wings(l, r) { P.wingL.rotation.z = l; P.wingR.rotation.z = -r; },
    pose(p) { for (const [k, v] of Object.entries(p)) if (P[k] && Array.isArray(v)) P[k].rotation.set(...v); },
  };
}

// ── bottles ─────────────────────────────────────────────────────────────────────────────────────
export function bottleShape(h = 0.3, r = 0.036) {
  const pr = [[0, 0], [r * 0.95, 0], [r, 0.01], [r, h * 0.62], [r * 0.85, h * 0.7], [r * 0.38, h * 0.8], [r * 0.34, h * 0.97], [r * 0.4, h * 0.98], [r * 0.4, h], [0, h]];
  return new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), 20);
}

/** A bottle of the choir: a felt label with a face that sings. */
export function singer(glass = '#3d2a12', label = '#efe2bc', h = 0.32, r = 0.045) {
  const root = new THREE.Group();
  root.add(part(bottleShape(h, r), new THREE.MeshPhysicalMaterial({ color: glass, roughness: 0.1, clearcoat: 1, emissive: new THREE.Color(glass), emissiveIntensity: 0.2 })));
  root.add(part(new THREE.CylinderGeometry(r * 1.03, r * 1.03, h * 0.38, 24, 1, true, -1.1, 2.2), felt(label, { nap: 0.4 }), [0, h * 0.33, 0]));
  const E = eyes(r * 0.28, r * 0.75, label);
  E.group.position.set(0, h * 0.43, r * 1.02);
  root.add(E.group);
  const mouth = part(new THREE.CircleGeometry(r * 0.3, 18), new THREE.MeshStandardMaterial({ color: '#2a0a0e', roughness: 1 }), [0, h * 0.27, r * 1.05]);
  root.add(mouth);
  tagged(root);
  return {
    root, lids: E.lids, look: E.look,
    mouth(v) {
      v = Math.max(0, Math.min(1, v));
      mouth.scale.set(0.6 + 0.6 * v, 0.15 + 1.1 * v, 1);
    },
  };
}

// ── ice cubes that do not want to go in ─────────────────────────────────────────────────────────
export function cube(s = 0.07) {
  const root = new THREE.Group();
  root.add(part(new RoundedBoxGeometry(s, s, s, 3, s * 0.18), new THREE.MeshPhysicalMaterial({ color: '#d8eef6', roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.72 })));
  const E = eyes(s * 0.14, s * 0.38, '#d8eef6');
  E.group.position.set(0, s * 0.12, s * 0.5);
  root.add(E.group);
  const mouth = part(new THREE.CircleGeometry(s * 0.12, 14), new THREE.MeshStandardMaterial({ color: '#2a3a4a' }), [0, -s * 0.18, s * 0.505]);
  root.add(mouth);
  tagged(root);
  return { root, lids: E.lids, look: E.look, mouth(v) { mouth.scale.set(1, 0.3 + v * 1.2, 1); } };
}

// ── the ingredients, a band ─────────────────────────────────────────────────────────────────────
function label(text, w = 0.16) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#efe2bc';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#6e1618';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 244, 84);
  ctx.fillStyle = '#6e1618';
  ctx.textAlign = 'center';
  ctx.font = `${text.length > 9 ? 34 : 46}px Lobster, cursive`;
  ctx.fillText(text, 128, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return part(new THREE.PlaneGeometry(w, w * 0.375), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide }));
}

export function ingredient(kind) {
  const root = new THREE.Group();
  const body = pivot();
  root.add(body);
  let face = 0.1, er = 0.016;
  if (kind === 'basilico' || kind === 'menta') {
    const leafM = felt(kind === 'basilico' ? '#2f7a2a' : '#5aa84a', { nap: 0.5 });
    body.add(part(new THREE.CylinderGeometry(0.008, 0.01, 0.18, 8), felt('#3a6a2a'), [0, 0.09, 0]));
    const n = kind === 'basilico' ? 6 : 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, y = 0.1 + (i % 3) * 0.04;
      body.add(part(new THREE.SphereGeometry(kind === 'basilico' ? 0.06 : 0.04, 14, 10), leafM, [Math.sin(a) * 0.05, y, Math.cos(a) * 0.05], [0.4, a, 0], [0.55, 0.18, 1]));
    }
    body.add(part(new THREE.SphereGeometry(0.055, 16, 12), leafM, [0, 0.18, 0.01], [0, 0, 0], [1, 1.1, 0.7]));
    face = 0.19;
  } else if (kind === 'limone') {
    body.add(part(new THREE.SphereGeometry(0.08, 24, 16), felt('#f2d22a', { nap: 0.9 }), [0, 0.1, 0], [0, 0, Math.PI / 2], [1.35, 1, 1]));
    for (const k of [-1, 1]) body.add(part(new THREE.ConeGeometry(0.02, 0.03, 10), felt('#e8c420'), [k * 0.115, 0.1, 0], [0, 0, -k * Math.PI / 2]));
    body.add(part(new THREE.SphereGeometry(0.03, 10, 8), felt('#3a7a2a'), [0.02, 0.18, -0.01], [0.3, 0, 0.5], [1.4, 0.3, 0.8]));
    face = 0.11;
  } else if (kind === 'fiori') {
    body.add(part(bottleShape(0.2, 0.04), new THREE.MeshPhysicalMaterial({ color: '#d8e8f0', roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.8 })));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      body.add(part(new THREE.SphereGeometry(0.02, 10, 8), felt('#fbf6ee'), [Math.sin(a) * 0.02, 0.215, Math.cos(a) * 0.02], [0, 0, 0], [1, 0.4, 1]));
    }
    body.add(part(new THREE.SphereGeometry(0.01, 8, 6), felt('#f2c230'), [0, 0.225, 0]));
    face = 0.09;
  } else if (kind === 'harissa') {
    body.add(part(new THREE.CylinderGeometry(0.035, 0.04, 0.16, 18), felt('#c42a1c'), [0, 0.08, 0]));
    body.add(part(new THREE.CylinderGeometry(0.014, 0.02, 0.04, 12), steel(), [0, 0.18, 0]));
    face = 0.1;
    er = 0.013;
  }
  const E = eyes(er, er * 2.6);
  E.group.position.set(0, face, kind === 'limone' ? 0.075 : kind === 'basilico' || kind === 'menta' ? 0.05 : 0.04);
  body.add(E.group);
  const mouth = part(new THREE.CircleGeometry(er * 0.9, 14), new THREE.MeshStandardMaterial({ color: '#2a0a0e' }), [0, face - er * 1.9, E.group.position.z + 0.004]);
  body.add(mouth);
  const tag = label({ basilico: 'Basilico', limone: 'Limone', menta: 'Menta', fiori: "Fiori d'arancio", harissa: 'Harissa' }[kind]);
  tag.position.set(0, 0.03, 0.11);
  tag.rotation.x = -0.35;
  root.add(tag);
  tagged(root);
  return { root, body, tag, lids: E.lids, look: E.look, mouth(v) { mouth.scale.set(1, 0.3 + v * 1.3, 1); } };
}

// ── the cocktail, the shaker, the things on the counter ─────────────────────────────────────────
/** The Sex on La Santa: a tall glass, the pink that glows, ice, a basil leaf; fill 0..1. */
export function cocktail(scale = 1) {
  const root = new THREE.Group();
  const h = 0.17, r = 0.036;
  const glass = part(new THREE.CylinderGeometry(r, r * 0.92, h, 28, 1, true), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false, envMap: env(), envMapIntensity: 1.0 }), [0, h / 2, 0]);
  glass.renderOrder = 2;
  root.add(glass);
  root.add(part(new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.012, 28), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.5 }), [0, 0.006, 0]));
  const pink = new THREE.MeshStandardMaterial({ color: '#ff5a8a', emissive: new THREE.Color('#ff3a78'), emissiveIntensity: 0.8, roughness: 0.3 });
  const drink = part(new THREE.CylinderGeometry(r * 0.88, r * 0.85, h * 0.9, 24), pink, [0, 0, 0]);
  root.add(drink);
  const ice = [];
  for (let i = 0; i < 3; i++) {
    const c = part(new RoundedBoxGeometry(0.03, 0.03, 0.03, 2, 0.006), new THREE.MeshPhysicalMaterial({ color: '#f0f8ff', roughness: 0.05, transparent: true, opacity: 0.6 }), [(i - 1) * 0.015, 0, (i % 2) * 0.01], [i, i * 0.7, 0]);
    root.add(c);
    ice.push(c);
  }
  const leaf = part(new THREE.SphereGeometry(0.025, 12, 8), felt('#2f7a2a'), [0.02, h + 0.01, 0], [0.2, 0, 0.6], [0.5, 0.15, 1]);
  root.add(leaf);
  root.add(part(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 8), felt('#f2f0ea'), [-0.015, h * 0.8, 0], [0, 0, 0.18]));
  // the harissa on the rim
  const rim = part(new THREE.TorusGeometry(r, 0.004, 6, 28, 1.2), felt('#c42a1c'), [0, h, 0], [Math.PI / 2, 0, 0]);
  rim.visible = false;
  root.add(rim);
  root.scale.setScalar(scale);
  tagged(root);
  const api = {
    root, pink, rim, leaf,
    fill(v) {
      v = Math.max(0.001, Math.min(1, v));
      drink.scale.y = v;
      drink.position.y = 0.012 + h * 0.9 * v / 2;
      ice.forEach((c, i) => (c.position.y = Math.min(h * 0.9 * v, 0.03 + i * 0.03) + 0.012));
    },
    glow(v) { pink.emissiveIntensity = v; },
  };
  api.fill(1);
  return api;
}

export function shaker() {
  const root = new THREE.Group();
  root.add(part(new THREE.CylinderGeometry(0.045, 0.035, 0.18, 24), steel(), [0, 0.09, 0]));
  root.add(part(new THREE.CylinderGeometry(0.035, 0.046, 0.06, 24), steel(), [0, 0.21, 0]));
  root.add(part(new THREE.CylinderGeometry(0.018, 0.03, 0.04, 16), steel(), [0, 0.26, 0]));
  root.add(part(new THREE.SphereGeometry(0.018, 12, 8), steel(), [0, 0.285, 0]));
  return tagged(root);
}

/** A slab of Genoese focaccia: golden, dimpled, glistening with oil. bites(n) takes bites out of the corner. */
export function focaccia(w = 0.32, d = 0.22) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d29236';
  ctx.fillRect(0, 0, 256, 256);
  let q = 7;
  const R = () => ((q = (q * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    const x = R() * 256, y = R() * 256, rr = 6 + R() * 7;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, '#f2cf7a');
    g.addColorStop(0.6, '#e8b860');
    g.addColorStop(1, 'rgba(210,146,54,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = 'rgba(140,80,20,0.35)';
    ctx.beginPath();
    ctx.arc(R() * 256, R() * 256, 2 + R() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const root = new THREE.Group();
  const slab = part(new RoundedBoxGeometry(w, 0.035, d, 3, 0.012), new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 }), [0, 0.0175, 0]);
  root.add(slab);
  const bites = [];
  for (let i = 0; i < 3; i++) {
    // a bite is a dark circle cut on the corner: drawn as a dark hollow over it
    const b = part(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 20), new THREE.MeshStandardMaterial({ color: '#3a2010', roughness: 1 }), [w / 2 - 0.02 - i * 0.06, 0.018, d / 2 - 0.01], [0, 0, 0]);
    b.visible = false;
    root.add(b);
    bites.push(b);
  }
  tagged(root);
  return { root, bites(n) { bites.forEach((b, i) => (b.visible = i < n)); } };
}

/** A felt star on a string, for the reviews. */
export function star(r = 0.12, color = '#f2c230') {
  const sh = new THREE.Shape();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    i ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const root = new THREE.Group();
  root.add(part(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 }), felt(color, { nap: 0.9 }), [0, 0, -0.015]));
  root.add(part(new THREE.CylinderGeometry(0.002, 0.002, 2.0, 4), new THREE.MeshStandardMaterial({ color: '#ddd' }), [0, 1.0 + r, 0]));
  return tagged(root);
}

/** Felt letters hung on strings: the title coming down. */
export function feltTitle(text = 'SEX ON LA SANTA', h = 0.22, color = '#e8466e') {
  const root = new THREE.Group();
  const letters = [];
  let x = 0;
  const widths = [];
  const c = document.createElement('canvas').getContext('2d');
  c.font = `${h * 1000}px Anton, sans-serif`;
  for (const ch of text) widths.push(ch === ' ' ? h * 0.35 : c.measureText(ch).width / 1000 + h * 0.06);
  const total = widths.reduce((a, b) => a + b, 0);
  x = -total / 2;
  [...text].forEach((ch, i) => {
    if (ch !== ' ') {
      const cv = document.createElement('canvas');
      cv.width = 256;
      cv.height = 256;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.font = '220px Anton, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ch, 128, 222);
      const a = new THREE.CanvasTexture(cv);
      const m = felt(color, { nap: 0.9 });
      m.alphaMap = a;
      m.alphaTest = 0.5;
      m.side = THREE.DoubleSide;
      const g = new THREE.Group();
      for (let k = 0; k < 4; k++) g.add(part(new THREE.PlaneGeometry(h, h), m, [0, 0, -k * 0.005]));
      g.add(part(new THREE.CylinderGeometry(0.0015, 0.0015, 3, 4), new THREE.MeshStandardMaterial({ color: '#ddd' }), [0, 1.5 + h / 2 - 0.01, -0.01]));
      g.position.set(x + widths[i] / 2, 0, 0);
      root.add(g);
      letters.push(g);
    }
    x += widths[i];
  });
  tagged(root);
  return { root, letters };
}

/** A darbuka, the goblet drum. */
export function darbuka() {
  const pr = [[0, 0], [0.05, 0], [0.04, 0.06], [0.035, 0.12], [0.07, 0.2], [0.1, 0.27], [0.105, 0.3], [0, 0.3]];
  const root = new THREE.Group();
  root.add(part(new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), 24), new THREE.MeshPhysicalMaterial({ color: '#b07a3a', roughness: 0.4, clearcoat: 0.6 })));
  root.add(part(new THREE.CircleGeometry(0.104, 24), felt('#efe2c8', { nap: 0.2 }), [0, 0.301, 0], [-Math.PI / 2, 0, 0]));
  return tagged(root);
}

export function maraca(color = '#d2462a') {
  const root = new THREE.Group();
  root.add(part(new THREE.SphereGeometry(0.05, 16, 12), felt(color), [0, 0.13, 0], [0, 0, 0], [1, 1.2, 1]));
  root.add(part(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), felt('#7a5a3a'), [0, 0.05, 0]));
  return tagged(root);
}

/** The gold Casio on a wrist. */
export function casio() {
  const root = new THREE.Group();
  const g = gold();
  root.add(part(new THREE.TorusGeometry(0.052, 0.009, 6, 24), g, [0, 0, 0], [Math.PI / 2, 0, 0]));
  root.add(part(new THREE.BoxGeometry(0.04, 0.012, 0.034), g, [0, 0.0, 0.055]));
  root.add(part(new THREE.PlaneGeometry(0.024, 0.014), new THREE.MeshBasicMaterial({ color: '#a8b49a' }), [0, 0.0068, 0.055], [-Math.PI / 2, 0, 0]));
  return tagged(root);
}

/** A soap dispenser and a jug of water, for the first gag. */
export function soap() {
  const root = new THREE.Group();
  root.add(part(new THREE.CylinderGeometry(0.035, 0.035, 0.13, 18), new THREE.MeshPhysicalMaterial({ color: '#f0a8c8', roughness: 0.2, clearcoat: 1, transparent: true, opacity: 0.85 }), [0, 0.065, 0]));
  root.add(part(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 10), new THREE.MeshStandardMaterial({ color: '#f2f0ea' }), [0, 0.155, 0]));
  root.add(part(new THREE.BoxGeometry(0.05, 0.012, 0.016), new THREE.MeshStandardMaterial({ color: '#f2f0ea' }), [0.02, 0.18, 0]));
  return tagged(root);
}

/** The bearers' platform for the procession: the cocktail rides it like a saint. */
export function portantina() {
  const root = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#7a4a22', roughness: 0.6 });
  root.add(part(new THREE.BoxGeometry(0.9, 0.12, 0.7), new THREE.MeshPhysicalMaterial({ color: '#c89a3a', metalness: 0.6, roughness: 0.35 })));
  for (const z of [-0.25, 0.25]) root.add(part(new THREE.CylinderGeometry(0.025, 0.025, 2.6, 10), wood, [0, 0, z], [0, 0, Math.PI / 2]));
  // paper flowers round the edge, little bulbs
  const R = (() => { let q = 9; return () => ((q = (q * 16807) % 2147483647) / 2147483647); })();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    root.add(part(new THREE.SphereGeometry(0.04, 10, 8), felt(['#f04a6a', '#f2c230', '#fbf6ee'][i % 3]), [Math.cos(a) * 0.45, 0.08, Math.sin(a) * 0.35], [0, 0, 0], [1, 0.6, 1]));
    root.add(part(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff4d0', emissive: new THREE.Color('#ffd890'), emissiveIntensity: 2 + R() }), [Math.cos(a + 0.17) * 0.42, 0.1, Math.sin(a + 0.17) * 0.32]));
  }
  return tagged(root);
}
