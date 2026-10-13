import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { brushOver, canvas, rng, texture } from '../textures/util.js';

// West Coast city kit, low-poly and faceted. Everything is built from code.

export const flat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...o });

/** Painted sign board. */
export function signTexture(text, { font = '700 120px "Oswald"', fg = '#f2efe6', bg = '#1b1b1d', w = 1024, h = 256, border = '#f2efe6', sub = '' } = {}) {
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, w - 24, h - 24);
  }
  ctx.fillStyle = fg;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, sub ? h * 0.42 : h / 2, w - 60);
  if (sub) {
    ctx.font = '400 44px "Oswald"';
    ctx.fillText(sub, w / 2, h * 0.78, w - 60);
  }
  return texture(c);
}

/** Facade: stucco, windows with blinds, a shopfront at street level. Returns a texture for a w × h wall. */
export function facadeTexture({ w, h, seed = 1, tone = 200, shop = true, floors = 2, ppm = 48 }) {
  const W = Math.min(2048, Math.round(w * ppm));
  const H = Math.min(2048, Math.round(h * ppm));
  const [c, ctx] = canvas(W, H);
  const r = rng(seed);
  const t = tone;
  ctx.fillStyle = `rgb(${t},${t - 6},${t - 16})`;
  ctx.fillRect(0, 0, W, H);
  // stucco blotches and grime streaks
  for (let i = 0; i < 260; i++) {
    const v = t + (r() - 0.5) * 40;
    ctx.fillStyle = `rgba(${v},${v - 6},${v - 16},0.25)`;
    ctx.beginPath();
    ctx.ellipse(r() * W, r() * H, 10 + r() * 60, 6 + r() * 30, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  brushOver(ctx, 0, 0, W, H, { n: Math.round((W * H) / 2500), len: [40, 160], wid: [8, 26], tone: [t, t - 6, t - 16], spread: 30, alpha: [0.15, 0.3], jitter: 0.6, seed });
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = 'rgba(40,36,30,0.12)';
    ctx.fillRect(r() * W, r() * H * 0.5, 2 + r() * 5, H * (0.2 + r() * 0.5));
  }
  const px = W / w;
  const floorH = (h - (shop ? 3.4 : 0)) / Math.max(1, floors);
  // upper floors
  for (let f = 0; f < floors; f++) {
    const y0 = H - (shop ? 3.4 : 0) * px - (f + 1) * floorH * px;
    const n = Math.max(1, Math.floor(w / 3));
    for (let i = 0; i < n; i++) {
      const wx = ((i + 0.5) * W) / n - 0.65 * px;
      const wy = y0 + floorH * 0.25 * px;
      ctx.fillStyle = '#2a2a2c';
      ctx.fillRect(wx, wy, 1.3 * px, 1.4 * px);
      // blinds, some half down
      const down = r();
      ctx.fillStyle = 'rgba(210,205,190,0.85)';
      for (let k = 0; k < down * 12; k++) ctx.fillRect(wx + 3, wy + 3 + k * 0.11 * px, 1.3 * px - 6, 0.06 * px);
      ctx.strokeStyle = '#e9e4d6';
      ctx.lineWidth = 5;
      ctx.strokeRect(wx, wy, 1.3 * px, 1.4 * px);
      if (r() < 0.35) {
        ctx.fillStyle = '#2f2f31';
        ctx.fillRect(wx - 0.2 * px, wy + 1.4 * px, 1.7 * px, 0.08 * px); // AC sill
        ctx.fillRect(wx + 0.3 * px, wy + 0.9 * px, 0.7 * px, 0.5 * px);
      }
    }
  }
  if (shop) {
    const y0 = H - 3.4 * px;
    ctx.fillStyle = '#1d1e20';
    ctx.fillRect(0.4 * px, y0 + 0.9 * px, W - 0.8 * px, 2.5 * px);
    ctx.fillStyle = 'rgba(160,170,175,0.35)';
    for (let i = 0; i < 3; i++) ctx.fillRect(0.6 * px + (i * (W - 1.2 * px)) / 3, y0 + 1.1 * px, (W - 1.2 * px) / 3 - 10, 1.8 * px);
    // roll-up shutter on some
    if (r() < 0.4) {
      ctx.fillStyle = '#8d8a84';
      ctx.fillRect(0.4 * px, y0 + 0.9 * px, W - 0.8 * px, 2.5 * px);
      ctx.fillStyle = '#6f6c66';
      for (let k = 0; k < 20; k++) ctx.fillRect(0.4 * px, y0 + 0.9 * px + k * 0.12 * px, W - 0.8 * px, 3);
      // graffiti
      ctx.strokeStyle = r() < 0.5 ? '#b3202a' : '#1a1a1a';
      ctx.lineWidth = 9;
      ctx.beginPath();
      let gx = 0.8 * px + r() * W * 0.3;
      ctx.moveTo(gx, y0 + 2.6 * px);
      for (let k = 0; k < 7; k++) ctx.lineTo((gx += 0.3 * px + r() * 0.2 * px), y0 + (1.5 + r() * 1.2) * px);
      ctx.stroke();
    }
  }
  // cornice
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(0, 0, W, 0.25 * px);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 0.25 * px, W, 0.08 * px);
  return texture(c);
}

const FACADES = new Map();

export function building({ w, h, d = 10, seed = 1, tone, shop = true, floors }) {
  const r = rng(seed * 13);
  tone ??= 150 + Math.floor(r() * 90);
  floors ??= Math.max(0, Math.round((h - 3.4) / 3.2));
  // facades are shared between buildings of the same size: a handful of variants per size
  const key = `${w}|${h}|${shop}|${floors}|${seed % 5}`;
  if (!FACADES.has(key)) FACADES.set(key, new THREE.MeshStandardMaterial({ map: facadeTexture({ w, h, seed: seed % 5 + w, tone: 160 + (seed % 5) * 16, shop, floors, ppm: 36 }), roughness: 0.9 }));
  const front = FACADES.get(key);
  const side = flat(new THREE.Color(`rgb(${tone - 20},${tone - 26},${tone - 36})`));
  const roof = flat(0x3a3a3c);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roof, roof, front, side]);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** One palm: a curved trunk and a crown of fronds, merged into two geometries. */
function palmGeometries(height, lean, seed) {
  const r = rng(seed);
  const trunkParts = [];
  const seg = 8;
  let top = new THREE.Vector3();
  for (let i = 0; i < seg; i++) {
    const t0 = i / seg;
    const t1 = (i + 1) / seg;
    const p0 = new THREE.Vector3(lean * t0 * t0, t0 * height, 0);
    const p1 = new THREE.Vector3(lean * t1 * t1, t1 * height, 0);
    const len = p0.distanceTo(p1);
    const g = new THREE.CylinderGeometry(0.16 - t1 * 0.05, 0.18 - t0 * 0.05, len * 1.02, 6, 1);
    const dir = p1.clone().sub(p0).normalize();
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    g.translate((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, 0);
    trunkParts.push(g);
    top = p1;
  }
  const frondParts = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.3;
    const L = 2.6 + r() * 1.2;
    // a frond: a narrow bent strip of quads
    const strip = [];
    const steps = 6;
    for (let k = 0; k < steps; k++) {
      const s0 = k / steps;
      const s1 = (k + 1) / steps;
      const pt = (s) => new THREE.Vector3(Math.cos(a) * L * s, -0.9 * s * s * L * 0.5 + 0.25 * s, Math.sin(a) * L * s);
      const w0 = 0.42 * Math.sin(Math.PI * Math.min(1, s0 + 0.15));
      const w1 = 0.42 * Math.sin(Math.PI * Math.min(1, s1 + 0.15));
      const side = new THREE.Vector3(-Math.sin(a), 0.25, Math.cos(a)).normalize();
      const A = pt(s0).addScaledVector(side, w0);
      const B = pt(s0).addScaledVector(side, -w0);
      const C = pt(s1).addScaledVector(side, w1);
      const D = pt(s1).addScaledVector(side, -w1);
      const mid0 = pt(s0).add(new THREE.Vector3(0, 0.08, 0));
      const mid1 = pt(s1).add(new THREE.Vector3(0, 0.08, 0));
      strip.push(...A.toArray(), ...mid0.toArray(), ...C.toArray(), ...mid0.toArray(), ...mid1.toArray(), ...C.toArray());
      strip.push(...mid0.toArray(), ...B.toArray(), ...mid1.toArray(), ...B.toArray(), ...D.toArray(), ...mid1.toArray());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(strip, 3));
    g.computeVertexNormals();
    g.translate(top.x, top.y, top.z);
    frondParts.push(g);
  }
  const trunk = mergeGeometries(trunkParts);
  const fronds = mergeGeometries(frondParts);
  return { trunk, fronds };
}

/** A row of palms as two instanced meshes. positions: [[x, z, height, lean, rotY]] */
export function palms(positions) {
  const group = new THREE.Group();
  // three palm shapes, reused
  const variants = [palmGeometries(9, 0.8, 3), palmGeometries(11, -0.6, 7), palmGeometries(7.5, 0.4, 11)];
  const trunkMat = flat(0x5a4a3c);
  const frondMat = flat(0x2f3d2b, { side: THREE.DoubleSide });
  variants.forEach((v, vi) => {
    const list = positions.filter((_, i) => i % 3 === vi);
    if (!list.length) return;
    const t = new THREE.InstancedMesh(v.trunk, trunkMat, list.length);
    const f = new THREE.InstancedMesh(v.fronds, frondMat, list.length);
    const m = new THREE.Matrix4();
    list.forEach(([x, z, , , ry], i) => {
      m.makeRotationY(ry ?? 0).setPosition(x, 0, z);
      t.setMatrixAt(i, m);
      f.setMatrixAt(i, m);
    });
    t.castShadow = f.castShadow = true;
    group.add(t, f);
  });
  return group;
}

/** Wooden power poles with cross-arms and sagging wires. xs along a line at z. */
export function powerLine(xs, z, height = 9) {
  const group = new THREE.Group();
  const mat = flat(0x4a3f35);
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, height, 6), mat, xs.length);
  const arm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.12, 2.2), mat, xs.length);
  const m = new THREE.Matrix4();
  xs.forEach((x, i) => {
    m.makeTranslation(x, height / 2, z);
    pole.setMatrixAt(i, m);
    m.makeTranslation(x, height - 0.6, z);
    arm.setMatrixAt(i, m);
  });
  pole.castShadow = true;
  group.add(pole, arm);
  const pts = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (const off of [-0.9, 0, 0.9]) {
      const steps = 12;
      for (let k = 0; k < steps; k++) {
        const t0 = k / steps;
        const t1 = (k + 1) / steps;
        const y = (t) => height - 0.55 - Math.sin(t * Math.PI) * 0.9;
        pts.push(xs[i] + (xs[i + 1] - xs[i]) * t0, y(t0), z + off, xs[i] + (xs[i + 1] - xs[i]) * t1, y(t1), z + off);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  group.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x1a1a1a })));
  return group;
}

/** Street lamps: poles, glowing heads and fake light pools that switch on at night. */
export function streetLamps(list) {
  const group = new THREE.Group();
  const poleMat = flat(0x2c2d30, { metalness: 0.4, roughness: 0.5 });
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 7, 6), poleMat, list.length);
  const arm = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), poleMat, list.length);
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.92, 0.75), toneMapped: false });
  const bulb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.12, 0.3), bulbMat, list.length);
  const [pc, pctx] = canvas(256);
  const grad = pctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,240,210,0.65)');
  grad.addColorStop(1, 'rgba(255,240,210,0)');
  pctx.fillStyle = grad;
  pctx.fillRect(0, 0, 256, 256);
  const poolMat = new THREE.MeshBasicMaterial({ map: texture(pc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(7, 7).rotateX(-Math.PI / 2), poolMat, list.length);
  const m = new THREE.Matrix4();
  list.forEach(([x, z, dir], i) => {
    m.makeTranslation(x, 3.5, z);
    pole.setMatrixAt(i, m);
    m.makeTranslation(x, 7, z + dir * 0.8);
    m.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    arm.setMatrixAt(i, m);
    m.makeTranslation(x, 6.92, z + dir * 1.5);
    bulb.setMatrixAt(i, m);
    m.makeTranslation(x, 0.03, z + dir * 1.8);
    pool.setMatrixAt(i, m);
  });
  pole.castShadow = true;
  group.add(pole, arm, bulb, pool);
  return { group, bulbMat, poolMat };
}

/** Lower body of a long 60s sedan up to the beltline, nose toward +x. Wheel arches cut out. */
function bodyShape(len, belt) {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, 0.28);
  s.lineTo(-len / 2 + 0.05, belt - 0.08);
  s.lineTo(-len * 0.2, belt);
  s.lineTo(len * 0.24, belt);
  s.lineTo(len / 2 - 0.05, belt - 0.06);
  s.lineTo(len / 2, 0.28);
  s.lineTo(len * 0.36, 0.28);
  s.absarc(len * 0.3, 0.34, 0.42, 0, Math.PI, false);
  s.lineTo(-len * 0.24, 0.28);
  s.absarc(-len * 0.3, 0.34, 0.42, 0, Math.PI, false);
  s.lineTo(-len / 2, 0.28);
  return s;
}

/** Lowrider convertible: candy paint, chrome, wire wheels, top down. */
export function lowrider({ color = 0x9e1018, len = 5.6 } = {}) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const belt = 0.98;
  const W = 1.95;
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.4, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  const geo = new THREE.ExtrudeGeometry(bodyShape(len, belt), { depth: W, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1 });
  geo.translate(0, 0, -W / 2);
  const shell = new THREE.Mesh(geo, paint);
  shell.castShadow = true;
  body.add(shell);
  // a convertible: only the raked windshield in its chrome frame
  const shieldH = 0.5;
  const rake = 0.55;
  const shield = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, shieldH, W - 0.12),
    new THREE.MeshPhysicalMaterial({ color: 0x9fb0b8, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.16, envMapIntensity: 0.05, depthWrite: false }),
  );
  shield.position.set(len * 0.2 - Math.sin(rake) * shieldH * 0.5, belt + Math.cos(rake) * shieldH * 0.5, 0);
  shield.rotation.z = rake;
  body.add(shield);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x9a9da2, metalness: 0.6, roughness: 0.45, envMapIntensity: 0.15 });
  for (const z of [-(W - 0.12) / 2, (W - 0.12) / 2]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, shieldH, 0.04), frameMat);
    post.position.copy(shield.position).setZ(z);
    post.rotation.z = rake;
    body.add(post);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, W - 0.08), frameMat);
  top.position.set(len * 0.2 - Math.sin(rake) * shieldH, belt + Math.cos(rake) * shieldH, 0);
  body.add(top);
  // seats
  const seatMat = flat(0xd8d2c4, { roughness: 0.5 });
  for (const x of [-len * 0.08, len * 0.08]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, W - 0.25), seatMat);
    seat.position.set(x, 0.75, 0);
    body.add(seat);
  }
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe8ebef, metalness: 1, roughness: 0.15 });
  for (const z of [-W / 2 - 0.03, W / 2 + 0.03]) {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(len * 0.92, 0.05, 0.02), chrome);
    trim.position.set(0, 0.62, z);
    body.add(trim);
  }
  const bumper = new THREE.BoxGeometry(0.12, 0.16, W);
  for (const x of [-len / 2 - 0.04, len / 2 + 0.04]) {
    const b = new THREE.Mesh(bumper, chrome);
    b.position.set(x, 0.42, 0);
    body.add(b);
  }
  const wheels = [];
  const tire = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 14);
  tire.rotateX(Math.PI / 2);
  const rim = new THREE.CylinderGeometry(0.24, 0.24, 0.26, 14);
  rim.rotateX(Math.PI / 2);
  const tireMat = flat(0x0d0d0e, { roughness: 0.9 });
  for (const x of [-len * 0.3, len * 0.3]) {
    for (const z of [-0.95, 0.95]) {
      const w = new THREE.Group();
      w.add(new THREE.Mesh(tire, tireMat), new THREE.Mesh(rim, chrome));
      w.position.set(x, 0.36, z);
      w.children[0].castShadow = true;
      group.add(w);
      wheels.push(w);
    }
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.8), toneMapped: false });
  for (const z of [-0.65, 0.65]) {
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), lightMat);
    l.rotation.y = Math.PI / 2;
    l.position.set(len / 2 + 0.02, 0.62, z);
    body.add(l);
  }
  return { group, body, wheels, lightMat };
}

/** Plain parked sedan in a grey. */
export function sedan(color = 0x6b6d70) {
  const c = lowrider({ color, len: 5 });
  c.body.position.y = 0.12;
  return c;
}

/** Sky dome: day → dusk → night gradient driven by uNight (0..2). */
export function skyDome() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uNight: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uNight; varying vec3 vP;
      void main(){
        float h = clamp(vP.y, 0.0, 1.0);
        vec3 dayZ = vec3(0.32,0.5,0.74), dayH = vec3(0.82,0.85,0.86);
        vec3 duskZ = vec3(0.16,0.14,0.26), duskH = vec3(0.85,0.45,0.26);
        vec3 nightZ = vec3(0.01,0.015,0.03), nightH = vec3(0.08,0.09,0.12);
        vec3 z = uNight < 1.0 ? mix(dayZ, duskZ, uNight) : mix(duskZ, nightZ, uNight - 1.0);
        vec3 hz = uNight < 1.0 ? mix(dayH, duskH, uNight) : mix(duskH, nightH, uNight - 1.0);
        gl_FragColor = vec4(mix(hz, z, pow(h, 0.6)), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), mat);
  return { mesh, mat };
}

/** Distant downtown towers as flat silhouettes. */
export function skyline(x0, x1, z, seed = 2) {
  const r = rng(seed);
  const parts = [];
  for (let x = x0; x < x1; x += 14 + r() * 20) {
    const w = 10 + r() * 18;
    const h = 40 + r() * 110;
    const g = new THREE.BoxGeometry(w, h, 10);
    g.translate(x, h / 2, z + r() * 40);
    parts.push(g);
  }
  return new THREE.Mesh(mergeGeometries(parts), flat(0x8c97a3, { fog: true }));
}
