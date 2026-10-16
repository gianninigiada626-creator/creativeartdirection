// The sets of SEX ON LA SANTA, at human scale, in metres: the Santissimo's front, the bar inside,
// the caruggio, the port. Shared helpers for the shots: the camera, textures, a seeded random.
import { THREE, W, H, boxMesh, clay, nextId } from '/a-parte/engine3d/stage.js';
import { felt } from './puppet.js';
import * as K from './props.js';

export const D = THREE.MathUtils.degToRad;

export function cam(fov, pos, target, far = 60) {
  const c = new THREE.PerspectiveCamera(fov, W / H, 0.05, far);
  c.position.set(...pos);
  c.lookAt(...target);
  c.updateMatrixWorld(true);
  return c;
}

/** A light that casts soft shadows without acne on the fleece. */
export function shadowed(light, size = 2048, normalBias = 0.012) {
  light.castShadow = true;
  light.shadow.mapSize.set(size, size);
  light.shadow.bias = -0.0002;
  light.shadow.normalBias = normalBias;
  return light;
}

export function tex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// ── the front of the Baretto Santissimo, in its alley ──────────────────────────────────────────
/** Old stone and plaster: big soft stains, a fine grain, a few chips, damp running down from the top. */
const STONES = new Map();
export function stone(base = '#c48a58', seed = 3, { dark = '70,40,20', light = '255,225,180', chips = 140 } = {}) {
  // the same stone is drawn once; each wall gets its own copy of it, offset, to repeat as it likes
  const key = [base, dark, light, chips].join('|');
  if (!STONES.has(key)) STONES.set(key, stoneTex(base, rng(seed), dark, light, chips));
  const t = STONES.get(key).clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.offset.set((seed * 0.137) % 1, (seed * 0.291) % 1);
  t.needsUpdate = true;
  return t;
}
function stoneTex(base, R, dark, light, chips) {
  return tex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      const x = R() * w, y = R() * h, rr = 10 + R() * 90;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, R() < 0.55 ? `rgba(${dark},0.09)` : `rgba(${light},0.08)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    ctx.filter = 'blur(6px)';
    for (let i = 0; i < 22; i++) {
      // patches where the plaster was redone, a shade off the rest
      ctx.fillStyle = R() < 0.5 ? `rgba(${dark},0.07)` : `rgba(${light},0.07)`;
      ctx.beginPath();
      const x = R() * w, y = R() * h, rr = 40 + R() * 110;
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        ctx.lineTo(x + Math.cos(a) * rr * (0.6 + R() * 0.5), y + Math.sin(a) * rr * (0.5 + R() * 0.4));
      }
      ctx.fill();
    }
    ctx.filter = 'none';
    for (let i = 0; i < 26000; i++) {
      const v = R() < 0.5 ? `rgba(${dark},0.16)` : `rgba(${light},0.12)`;
      ctx.fillStyle = v;
      ctx.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2);
    }
    for (let i = 0; i < chips; i++) {
      ctx.fillStyle = `rgba(${dark},${0.25 + R() * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(R() * w, R() * h, 1 + R() * 5, 1 + R() * 3, R() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 18; i++) {
      const x = R() * w, l = 80 + R() * 300, y = R() * h * 0.6;
      const g = ctx.createLinearGradient(0, y, 0, y + l);
      g.addColorStop(0, `rgba(${dark},0.12)`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, 6 + R() * 22, l);
    }
  });
}

function slabs() {
  const R = rng(9);
  return tex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#34312f';
    ctx.fillRect(0, 0, w, h);
    const sw = 210, sh = 150;
    for (let y = 0; y < h; y += sh) {
      for (let x = -((y / sh) % 2) * sw / 2; x < w; x += sw) {
        const v = 78 + R() * 26;
        ctx.fillStyle = `rgb(${v},${v - 3},${v - 7})`;
        ctx.fillRect(x + 4, y + 4, sw - 8, sh - 8);
        for (let i = 0; i < 160; i++) {
          ctx.fillStyle = `rgba(${R() < 0.5 ? '20,20,20' : '200,200,190'},0.12)`;
          ctx.fillRect(x + 4 + R() * (sw - 8), y + 4 + R() * (sh - 8), 2, 2);
        }
      }
    }
  });
}

export function flame(ctx, cx, cy, s, fill = '#c4261c') {
  // the flame of the house: a teardrop with a lick, the S cut out of it
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.bezierCurveTo(cx + s * 0.25, cy - s * 0.55, cx + s * 0.75, cy - s * 0.25, cx + s * 0.62, cy + s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.5, cy + s * 0.85, cx - s * 0.5, cy + s * 0.85, cx - s * 0.62, cy + s * 0.35);
  ctx.bezierCurveTo(cx - s * 0.72, cy - s * 0.05, cx - s * 0.35, cy - s * 0.25, cx - s * 0.12, cy - s * 0.55);
  ctx.bezierCurveTo(cx - s * 0.1, cy - s * 0.3, cx, cy - s * 0.2, cx + s * 0.05, cy - s * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#efe2bc';
  ctx.font = `${s * 1.1}px Lobster, cursive`;
  ctx.textAlign = 'center';
  ctx.fillText('S', cx, cy + s * 0.5);
}

export function awningFront(ctx, w, h) {
  ctx.fillStyle = '#ece0b8';
  ctx.fillRect(0, 0, w, h);
  // the canvas: faint seams and a little dirt at the hem
  for (let x = 0; x < w; x += w / 9) {
    ctx.fillStyle = 'rgba(120,100,60,0.12)';
    ctx.fillRect(x, 0, 3, h);
  }
  const g = ctx.createLinearGradient(0, h * 0.75, 0, h);
  g.addColorStop(0, 'rgba(90,70,40,0)');
  g.addColorStop(1, 'rgba(90,70,40,0.25)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#6e1618';
  ctx.textAlign = 'center';
  ctx.font = `${h * 0.17}px Anton, sans-serif`;
  ctx.fillText('I L   B A R E T T O', w * 0.6, h * 0.25);
  ctx.font = `${h * 0.56}px Lobster, cursive`;
  ctx.fillText('Santissimo', w * 0.6, h * 0.84);
  flame(ctx, w * 0.17, h * 0.5, h * 0.36);
}

function wallSign(ctx, w, h) {
  ctx.fillStyle = '#6a1619';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#e8d8b0';
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 16, w - 32, h - 32);
  ctx.fillStyle = '#efe2bc';
  ctx.textAlign = 'center';
  ctx.font = `${w * 0.19}px Lobster, cursive`;
  ctx.fillText('Santissimo', w / 2, h * 0.15);
  ctx.fillRect(w * 0.3, h * 0.2, w * 0.4, 3);
  ctx.font = `${w * 0.14}px Lobster, cursive`;
  ['Aperitivi', 'Cocktails', 'Taglieri'].forEach((t, i) => {
    ctx.fillText(t, w / 2, h * (0.34 + i * 0.17));
    if (i < 2) ctx.fillRect(w * 0.42, h * (0.385 + i * 0.17), w * 0.16, 2);
  });
  // a half sun at the bottom, its rays
  ctx.save();
  ctx.translate(w / 2, h * 0.93);
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI;
    ctx.strokeStyle = '#efe2bc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * w * 0.1, Math.sin(a) * w * 0.1);
    ctx.lineTo(Math.cos(a) * w * 0.2, Math.sin(a) * w * 0.2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, w * 0.085, Math.PI, 0);
  ctx.fill();
  ctx.restore();
}

/** A bottle turned on a lathe: body, shoulder, neck, lip. */
export function bottle(col, h = 0.3, r = 0.036, emissive = 0) {
  const pr = [[0, 0], [r * 0.95, 0], [r, 0.01], [r, h * 0.62], [r * 0.85, h * 0.7], [r * 0.38, h * 0.8], [r * 0.34, h * 0.97], [r * 0.4, h * 0.98], [r * 0.4, h], [0, h]];
  const m = new THREE.Mesh(new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), 18),
    new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, emissive: new THREE.Color(col), emissiveIntensity: emissive }));
  m.castShadow = true;
  return m;
}

export function santissimoFront(s) {
  s.background = new THREE.Color('#0a0f1c');
  const dx = 0.75, dw = 1.15, dh = 2.3, wz = -1.2;
  const ox0 = dx - dw / 2 - 0.12, ox1 = dx + dw / 2 + 0.12, oy = dh + 0.12;
  // the wall: courses of ochre stone (bugnato) over a grey stone plinth, the grooves dark between them
  const wallId = nextId();
  const ochre = new THREE.MeshStandardMaterial({ map: stone('#c08c62', 3), roughness: 0.92 });
  const grey = new THREE.MeshStandardMaterial({ map: stone('#7c766c', 8, { dark: '30,30,30', light: '200,200,190', chips: 400 }), roughness: 0.97 });
  const grout = new THREE.MeshStandardMaterial({ color: '#3a2618', roughness: 1 });
  for (const [x0, x1, y0, y1] of [[-4.5, ox0, 0, 7], [ox1, 4.5, 0, 7], [ox0, ox1, oy, 7]]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), grout);
    b.position.set((x0 + x1) / 2, (y0 + y1) / 2, wz - 0.001);
    b.userData.id = wallId;
    s.add(b);
  }
  const block = (x0, x1, y0, y1, depth, mat) => {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, depth);
    const pos = g.attributes.position, uv = g.attributes.uv;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + cx + pos.getZ(i)) / 3.2, (pos.getY(i) + cy) / 3.2);
    const m = new THREE.Mesh(g, mat);
    m.position.set(cx, cy, wz + depth / 2);
    m.castShadow = m.receiveShadow = true;
    m.userData.id = wallId;
    s.add(m);
  };
  const RB = rng(21);
  const run = (x0, x1, y0, y1, depth, mat, joints) => {
    // a run of blocks from x0 to x1, the joints staggered from course to course
    if (!joints) return block(x0, x1, y0, y1, depth, mat);
    let x = x0 - RB() * 0.9;
    while (x < x1) {
      const nx = x + 0.95 + RB() * 0.5;
      const a = Math.max(x, x0), b = Math.min(nx - 0.02, x1);
      if (b - a > 0.05) block(a, b, y0, y1, depth * (0.85 + RB() * 0.3), mat);
      x = nx;
    }
  };
  const span = (y0, y1, depth, mat, joints = true) => {
    if (y0 < oy) {
      run(-4.5, ox0, y0, y1, depth, mat, joints);
      run(ox1, 4.5, y0, y1, depth, mat, joints);
    } else run(-4.5, 4.5, y0, y1, depth, mat, joints);
  };
  span(0, 0.82, 0.085, grey, false);
  const ch = 0.38, gap = 0.024;
  for (let y = 0.82 + gap; y < 6.5; y += ch + gap) {
    if (y < oy && y + ch > oy) {
      // the course that meets the top of the door: split it at the lintel
      span(y, oy - gap / 2, 0.06, ochre);
      run(-4.5, 4.5, oy + gap / 2, y + ch, 0.06, ochre, true);
    } else span(y, y + ch, 0.06, ochre);
  }
  // the wall across the alley, in the dark, and the slabs
  const across = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), new THREE.MeshStandardMaterial({ map: stone('#9a7048', 5), roughness: 0.95 }));
  across.position.set(-3.4, 4.5, 2.0);
  across.rotation.y = Math.PI / 2 - 0.25;
  across.userData.id = nextId();
  s.add(across);
  const sl = slabs();
  sl.wrapS = sl.wrapT = THREE.RepeatWrapping;
  sl.repeat.set(5, 4);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshStandardMaterial({ map: sl, roughness: 0.75 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 2);
  ground.receiveShadow = true;
  ground.userData.id = nextId();
  s.add(ground);
  // the doorway: a green frame, the bar warm inside, bottles on lit shelves, the counter
  const green = '#1d4a3a';
  for (const x of [ox0 + 0.06, ox1 - 0.06]) s.add(boxMesh(0.12, oy, 0.2, green, [x, 0, wz + 0.02]));
  s.add(boxMesh(ox1 - ox0, 0.12, 0.2, green, [dx, dh, wz + 0.02]));
  const inside = new THREE.Group();
  inside.add(boxMesh(dw + 3.6, 0.02, 2.0, '#2e2018', [dx + 0.7, 0, wz - 1.0]));
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(dw + 3.6, dh + 0.4), new THREE.MeshStandardMaterial({ color: '#7a5030', roughness: 0.9 }));
  rear.position.set(dx + 0.7, (dh + 0.4) / 2, wz - 1.75);
  inside.add(rear);
  const R = rng(4);
  const glass = ['#4a2a10', '#1f3a20', '#c8b888', '#5a1810', '#2a3a40', '#8a6a20'];
  for (let row = 0; row < 3; row++) {
    const y = 0.98 + row * 0.4;
    inside.add(boxMesh(3.3, 0.025, 0.22, '#4a2e18', [dx + 0.7, y, wz - 1.62]));
    const strip = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.01, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc070').multiplyScalar(2.2) }));
    strip.position.set(dx + 0.7, y - 0.01, wz - 1.52);
    inside.add(strip);
    for (let i = 0; i < 25; i++) {
      const b = bottle(glass[Math.floor(R() * glass.length)], 0.24 + R() * 0.1, 0.03 + R() * 0.012, 0.15);
      b.position.set(dx - 0.85 + i * 0.128 + R() * 0.03, y + 0.013, wz - 1.62 + (R() - 0.5) * 0.06);
      inside.add(b);
    }
  }
  const roomM = new THREE.MeshStandardMaterial({ color: '#6a4228', roughness: 0.95, side: THREE.DoubleSide });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(dw + 3.6, 1.9), roomM);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(dx + 0.7, 2.62, wz - 0.9);
  inside.add(ceil);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.7), roomM);
    side.rotation.y = Math.PI / 2;
    side.position.set(dx + 0.7 + sx * 1.8, 1.35, wz - 0.9);
    inside.add(side);
  }
  inside.add(boxMesh(dw + 0.5, 1.02, 0.5, '#3a2416', [dx, 0, wz - 1.05]));
  inside.add(boxMesh(dw + 0.56, 0.05, 0.56, '#6a4426', [dx, 1.02, wz - 1.05]));
  inside.userData.id = nextId();
  s.add(inside);
  const glow = new THREE.PointLight('#ffb060', 7, 5, 1.5);
  glow.position.set(dx, 2.0, wz - 1.0);
  const bar = new THREE.PointLight('#ffa850', 3, 2.5, 1.5);
  bar.position.set(dx, 1.5, wz - 0.4);
  s.add(bar);
  s.add(glow);
  // the awning: cream canvas sloping out over the door, the valance with the name
  const aw = new THREE.Group();
  const cream = new THREE.MeshStandardMaterial({ color: '#e6d7aa', roughness: 0.9, side: THREE.DoubleSide });
  const depth = 1.15, drop = 0.45;
  const top = new THREE.Mesh(new THREE.PlaneGeometry(3.4, Math.hypot(depth, drop)), cream);
  top.rotation.x = -Math.PI / 2 + Math.atan2(drop, depth);
  top.position.set(0, -drop / 2, depth / 2);
  aw.add(top);
  const hem = tex(1700, 200, (ctx, w, h) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    for (let x = 0; x < w; x += w / 24) {
      ctx.beginPath();
      ctx.ellipse(x + w / 48, h, w / 48, h * 0.09, 0, Math.PI, 0);
      ctx.fill();
    }
  });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.44), new THREE.MeshStandardMaterial({ map: tex(1700, 200, awningFront), alphaMap: hem, alphaTest: 0.5, roughness: 0.9, side: THREE.DoubleSide }));
  front.position.set(0, -drop - 0.22, depth);
  aw.add(front);
  for (const sx of [-1, 1]) {
    const tri = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(depth, -drop), new THREE.Vector2(depth, -drop - 0.44), new THREE.Vector2(0, -0.12)]);
    const cheek = new THREE.Mesh(new THREE.ShapeGeometry(tri), cream);
    cheek.rotation.y = -Math.PI / 2;
    cheek.position.set(sx * 1.7, 0, 0);
    aw.add(cheek);
  }
  aw.position.set(-0.2, dh + 0.75, wz);
  aw.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  aw.userData.id = nextId();
  s.add(aw);
  // the board on the wall, right of the door
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.98, 0.04), [clay('#4a1012'), clay('#4a1012'), clay('#4a1012'), clay('#4a1012'), new THREE.MeshStandardMaterial({ map: tex(400, 650, wallSign), roughness: 0.55 }), clay('#4a1012')]);
  sign.position.set(ox1 + 0.55, 1.6, wz + 0.09);
  sign.castShadow = true;
  sign.userData.id = nextId();
  s.add(sign);
  // the red bench against the wall
  const bench = new THREE.Group();
  const red = '#b0261c';
  for (let i = 0; i < 4; i++) bench.add(boxMesh(1.5, 0.035, 0.09, red, [0, 0.43, -0.16 + i * 0.105]));
  for (let i = 0; i < 3; i++) bench.add(boxMesh(1.5, 0.08, 0.03, red, [0, 0.55 + i * 0.12, -0.24]));
  for (const x of [-0.7, 0.7]) {
    bench.add(boxMesh(0.06, 0.43, 0.06, red, [x, 0, 0.14]));
    bench.add(boxMesh(0.06, 0.85, 0.06, red, [x, 0, -0.24]));
    bench.add(boxMesh(0.07, 0.05, 0.44, red, [x, 0.6, -0.03]));
    bench.add(boxMesh(0.06, 0.17, 0.05, red, [x, 0.43, 0.15]));
  }
  bench.position.set(-0.75, 0, wz + 0.4);
  bench.userData.id = nextId();
  s.add(bench);
  // the green barrel, a red top for a table, an ashtray
  const barrel = new THREE.Group();
  const at = (m, x, y, z) => (m.position.set(x, y, z), m);
  barrel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.27, 0.88, 32), new THREE.MeshPhysicalMaterial({ color: '#25683a', roughness: 0.4, clearcoat: 0.6 })));
  for (const y of [-0.28, 0.28]) barrel.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.268, 0.012, 8, 32), clay('#1d5230')), 0, y, 0));
  barrel.children.slice(-2).forEach((m) => (m.rotation.x = Math.PI / 2));
  barrel.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.035, 32), new THREE.MeshPhysicalMaterial({ color: '#b3241c', roughness: 0.35, clearcoat: 0.8 })), 0, 0.46, 0));
  barrel.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.035, 16), new THREE.MeshStandardMaterial({ color: '#a8a8ae', metalness: 0.8, roughness: 0.3 })), 0.08, 0.495, 0.05));
  barrel.position.set(0.05, 0.44, wz + 0.62);
  barrel.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  barrel.userData.id = nextId();
  s.add(barrel);
  // a lantern on a bracket further down the alley, the bulbs under the awning
  const lantern = new THREE.Group();
  lantern.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.5), clay('#1a1a1a')), 0, 0.25, 0.25));
  lantern.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.24, 6), new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: new THREE.Color('#ffc070'), emissiveIntensity: 3.5 })), 0, 0.08, 0.5));
  lantern.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.1, 6), clay('#1a1a1a')), 0, 0.25, 0.5));
  lantern.position.set(2.75, 2.75, wz);
  lantern.userData.id = nextId();
  s.add(lantern);
  const street = new THREE.SpotLight('#ffc27a', 22, 9, 0.85, 0.8, 1.4);
  street.position.set(2.75, 2.8, wz + 0.5);
  street.target.position.set(1.4, 0.4, wz + 0.6);
  shadowed(street);
  s.add(street, street.target);
  for (const x of [dx - 0.6, dx + 0.9]) {
    const bulb = new THREE.PointLight('#ffd8a0', 2.2, 3.2, 1.6);
    bulb.position.set(x, dh + 0.42, wz + 0.45);
    s.add(bulb);
  }
  // a lamp across the alley on the awning and the top of the wall
  const across2 = new THREE.SpotLight('#ffe0b4', 12, 10, 0.62, 0.9, 1.4);
  across2.position.set(-0.4, 1.6, 3.8);
  across2.target.position.set(-0.2, 2.45, wz + 1.1);
  s.add(across2, across2.target);
  s.add(new THREE.HemisphereLight('#4a5c94', '#241c18', 0.9));
  const moon = new THREE.DirectionalLight('#8a9ad8', 0.5);
  moon.position.set(-3, 6, 4);
  s.add(moon);
  return { bench, dx, wz };
}


// ── inside the Santissimo: the counter, the back bar, the choir of bottles ──────────────────────
function marble() {
  return tex(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#ece6dc';
    ctx.fillRect(0, 0, w, h);
    const R = rng(13);
    for (let i = 0; i < 14; i++) {
      ctx.strokeStyle = `rgba(120,110,105,${0.15 + R() * 0.2})`;
      ctx.lineWidth = 1 + R() * 2.5;
      ctx.beginPath();
      let x = R() * w, y = R() * h;
      ctx.moveTo(x, y);
      for (let k = 0; k < 12; k++) ctx.lineTo((x += (R() - 0.3) * 120), (y += (R() - 0.5) * 60));
      ctx.stroke();
    }
  });
}

function checker(a = '#e8e0d0', b = '#1e1c1a', n = 8) {
  const t = tex(512, 512, (ctx, w, h) => {
    const s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      ctx.fillStyle = (x + y) % 2 ? b : a;
      ctx.fillRect(x * s, y * s, s, s);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.strokeRect(x * s, y * s, s, s);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function neonSign(text = 'Santissimo', color = '#ff4f8f') {
  // a neon script: the glowing tube drawn twice, a wide soft halo under a thin hot core
  const t = tex(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.font = `${h * 0.7}px Lobster, cursive`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = 14;
    ctx.filter = 'blur(6px)';
    ctx.strokeText(text, w / 2, h * 0.72);
    ctx.filter = 'none';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffe0ec';
    ctx.strokeText(text, w / 2, h * 0.72);
  });
  const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  m.color = new THREE.Color(2.2, 2.2, 2.2);
  return m;
}

function flagTex(kind) {
  return tex(240, 160, (ctx, w, h) => {
    if (kind === 'genova') {
      ctx.fillStyle = '#f4f2ec';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#c8202a';
      ctx.fillRect(w * 0.42, 0, w * 0.16, h);
      ctx.fillRect(0, h * 0.38, w, h * 0.24);
    } else {
      ctx.fillStyle = '#d2101e';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, h * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d2101e';
      ctx.beginPath();
      ctx.arc(w / 2 - h * 0.02, h / 2, h * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(w / 2 + h * 0.06, h / 2, h * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d2101e';
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? h * 0.05 : h * 0.12;
        ctx.lineTo(w / 2 + h * 0.08 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
      }
      ctx.fill();
    }
  });
}

export function barInterior(s, { choir = 9 } = {}) {
  s.background = new THREE.Color('#120c08');
  const id = () => nextId();
  const add = (m) => {
    m.userData.id ??= id();
    m.traverse?.((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
    s.add(m);
    return m;
  };
  // the room: tiles, wainscot, ochre plaster, beams
  const fl = checker();
  fl.repeat.set(8, 6);
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(8, 7), new THREE.MeshStandardMaterial({ map: fl, roughness: 0.5 })));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 1.4);
  const plasterM = new THREE.MeshStandardMaterial({ map: stone('#c9955e', 17), roughness: 0.95 });
  const woodM = new THREE.MeshStandardMaterial({ color: '#4a2c18', roughness: 0.6 });
  const back = add(new THREE.Mesh(new THREE.PlaneGeometry(8, 3.2), plasterM));
  back.position.set(0, 1.6, -1.65);
  for (const k of [-1, 1]) {
    const w = add(new THREE.Mesh(new THREE.PlaneGeometry(7, 3.2), plasterM));
    w.rotation.y = -k * Math.PI / 2;
    w.position.set(k * 3.6, 1.6, 1.4);
    add(boxMesh(0.04, 1.0, 7, '#3a2414', [k * 3.58, 0, 1.4]));
  }
  const ceil = add(new THREE.Mesh(new THREE.PlaneGeometry(8, 7), new THREE.MeshStandardMaterial({ color: '#3a2618', roughness: 0.9 })));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3.2, 1.4);
  for (let z = -1.2; z < 4.5; z += 1.1) add(boxMesh(8, 0.16, 0.14, '#2e1c10', [0, 3.04, z]));
  // the back bar: a mirror, three shelves of bottles, the choir on the middle one, the neon over all
  const mirror = add(new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.3), new THREE.MeshStandardMaterial({ color: '#6a5a4a', metalness: 0.9, roughness: 0.25, envMap: K.env(), envMapIntensity: 0.5 })));
  mirror.position.set(0, 1.75, -1.63);
  add(boxMesh(3.6, 0.9, 0.45, '#3a2414', [0, 0, -1.4]));
  add(boxMesh(3.64, 0.04, 0.5, '#6a4426', [0, 0.9, -1.4]));
  const R = rng(31);
  const glass = ['#4a2a10', '#1f3a20', '#c8b888', '#5a1810', '#2a3a40', '#8a6a20', '#3a1a3a'];
  const singers = [];
  for (let row = 0; row < 3; row++) {
    const y = 1.18 + row * 0.42;
    add(boxMesh(3.4, 0.03, 0.26, '#5a3820', [0, y, -1.5]));
    const strip = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.01, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc070').multiplyScalar(2.0) }));
    strip.position.set(0, y - 0.012, -1.38);
    add(strip);
    if (row === 1) {
      for (let i = 0; i < choir; i++) {
        const b = K.singer(glass[i % glass.length], ['#efe2bc', '#f2d0a8', '#e8e8d8'][i % 3], 0.3 + (i % 3) * 0.03, 0.045);
        b.root.position.set(-1.45 + i * (2.9 / (choir - 1)), y + 0.015, -1.47);
        add(b.root);
        singers.push(b);
      }
    } else {
      for (let i = 0; i < 24; i++) {
        const b = bottle(glass[Math.floor(R() * glass.length)], 0.24 + R() * 0.1, 0.03 + R() * 0.012, 0.12);
        b.position.set(-1.6 + i * 0.138 + R() * 0.03, y + 0.015, -1.5 + (R() - 0.5) * 0.06);
        add(b);
      }
    }
  }
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), neonSign());
  neon.position.set(0, 2.62, -1.6);
  add(neon);
  const neonLight = new THREE.PointLight('#ff5a9a', 2.5, 3.5, 1.6);
  neonLight.position.set(0, 2.6, -1.2);
  s.add(neonLight);
  for (const [k, kind] of [[-1, 'genova'], [1, 'tunisi']]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), new THREE.MeshStandardMaterial({ map: flagTex(kind), roughness: 0.9, side: THREE.DoubleSide }));
    f.position.set(k * 1.45, 2.62, -1.6);
    f.rotation.z = k * 0.05;
    add(f);
  }
  // the counter: dark green wood, a brass rail, a marble top
  const counter = new THREE.Group();
  counter.add(boxMesh(3.6, 1.0, 0.6, '#1d3a2e', [0, 0, 0]));
  for (let i = 0; i < 6; i++) counter.add(boxMesh(0.5, 0.7, 0.02, '#244a3a', [-1.5 + i * 0.6, 0.15, 0.305]));
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.05, 0.7), new THREE.MeshPhysicalMaterial({ map: marble(), roughness: 0.25, clearcoat: 0.6 }));
  top.position.set(0, 1.025, 0);
  counter.add(top);
  const brass = new THREE.MeshStandardMaterial({ color: '#c8a050', metalness: 0.9, roughness: 0.3, envMap: K.env(), envMapIntensity: 0.8 });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.6, 10), brass);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 0.18, 0.42);
  counter.add(rail);
  add(counter);
  // the espresso machine at the end of the counter: the gull's turntables
  const coffee = new THREE.Group();
  const steelM = new THREE.MeshStandardMaterial({ color: '#c8ccd2', metalness: 0.95, roughness: 0.2, envMap: K.env(), envMapIntensity: 1 });
  coffee.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.42), steelM));
  coffee.children[0].position.y = 0.21;
  coffee.add(boxMesh(0.72, 0.03, 0.44, '#1a1a1c', [0, 0.42, 0]));
  for (const x of [-0.18, 0.18]) {
    const gh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.08, 16), steelM);
    gh.position.set(x, 0.14, 0.24);
    coffee.add(gh);
    const cupx = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.05, 14), new THREE.MeshStandardMaterial({ color: '#f4f0e8', roughness: 0.3 }));
    cupx.position.set(x, 0.03, 0.24);
    coffee.add(cupx);
  }
  // the two "decks" on top: saucers that spin under the gull's wings
  const decks = [];
  for (const x of [-0.17, 0.17]) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.012, 32), new THREE.MeshStandardMaterial({ map: tex(256, 256, (ctx) => {
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#2a2a2a';
      for (let r = 30; r < 128; r += 6) { ctx.beginPath(); ctx.arc(128, 128, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#d2462a';
      ctx.beginPath(); ctx.arc(128, 128, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(128, 120, 26, 6);
    }), roughness: 0.3 }));
    d.position.set(x, 0.443, 0);
    coffee.add(d);
    decks.push(d);
  }
  coffee.position.set(-1.3, 1.05, -0.05);
  add(coffee);
  // stools in front of the counter
  const stools = [];
  for (let i = 0; i < 4; i++) {
    const st = new THREE.Group();
    st.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24), new THREE.MeshStandardMaterial({ color: '#8a1c18', roughness: 0.5 })));
    st.children[0].position.y = 0.72;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 10), brass);
    leg.position.y = 0.35;
    st.add(leg);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 20), brass);
    foot.position.y = 0.015;
    st.add(foot);
    st.position.set(-1.2 + i * 0.8, 0, 0.75);
    add(st);
    stools.push(st);
  }
  // pendants with bulbs over the counter
  const pendants = [];
  for (let i = 0; i < 4; i++) {
    const x = -1.35 + i * 0.9;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.8, 6), clay('#111'));
    cord.position.set(x, 2.8, 0);
    add(cord);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#1d3a2e', roughness: 0.5, side: THREE.DoubleSide }));
    shade.position.set(x, 2.36, 0);
    add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), new THREE.MeshStandardMaterial({ color: '#fff0d0', emissive: new THREE.Color('#ffc880'), emissiveIntensity: 3 }));
    bulb.position.set(x, 2.27, 0);
    add(bulb);
    const l = new THREE.PointLight('#ffc58a', 3.2, 4.5, 1.5);
    l.position.set(x, 2.2, 0);
    s.add(l);
    pendants.push({ light: l, bulb });
  }
  // the party lights for the dance, off until the beat says so
  const party = [];
  for (const [x, z] of [[-2.4, 1.5], [2.4, 1.5], [0, 3.2]]) {
    const l = new THREE.PointLight('#ff3a78', 0, 7, 1.2);
    l.position.set(x, 2.7, z);
    s.add(l);
    party.push(l);
  }
  const key = new THREE.SpotLight('#ffe2c0', 14, 9, 0.6, 0.8, 1.4);
  key.position.set(1.2, 2.9, 2.6);
  key.target.position.set(0, 1.3, -0.6);
  shadowed(key);
  s.add(key, key.target);
  const amb = new THREE.HemisphereLight('#ffd8b0', '#2a1a10', 0.55);
  s.add(amb);
  return { singers, coffee, decks, stools, pendants, party, neon, neonLight, key, amb, counterTop: 1.05 };
}

// ── a caruggio of the old town at night: tall houses, shutters, washing across, lamps on brackets ──
export async function caruggio(s, { len = 34, width = 2.4 } = {}) {
  s.background = new THREE.Color('#0a1226');
  const R = rng(51);
  const hw = width / 2;
  const add = (m) => {
    m.userData.id ??= nextId();
    m.traverse?.((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
    s.add(m);
    return m;
  };
  // the ground: bricks set on edge between stone kerbs, as in a creuza
  const bricks = tex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#3a2a22';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = -((y / 32) % 2) * 32; x < w; x += 64) {
      const v = 120 + R() * 50;
      ctx.fillStyle = `rgb(${v},${v * 0.55},${v * 0.4})`;
      ctx.fillRect(x + 2, y + 2, 60, 28);
    }
  });
  bricks.wrapS = bricks.wrapT = THREE.RepeatWrapping;
  bricks.repeat.set(2, len / 1.2);
  const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(width, len), new THREE.MeshStandardMaterial({ map: bricks, roughness: 0.8 })));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -len / 2 + 6);
  const colours = ['#c98a54', '#d4a06a', '#b8644a', '#e0b878', '#c27a5a', '#d9b48a', '#a85a40', '#cf9a62'];
  // a shutter leaf: green slats drawn on, not built
  const shutterT = tex(64, 192, (ctx, w, h) => {
    ctx.fillStyle = '#2f5a3a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1f3e28';
    for (let y = 10; y < h - 8; y += 9) ctx.fillRect(5, y, w - 10, 4);
    ctx.strokeStyle = '#244a30';
    ctx.lineWidth = 5;
    ctx.strokeRect(2, 2, w - 4, h - 4);
  });
  const shutterM = new THREE.MeshStandardMaterial({ map: shutterT, roughness: 0.8 });
  const corniceM = new THREE.MeshStandardMaterial({ color: '#d8ccb4', roughness: 0.9 });
  const windows = [];
  for (const k of [-1, 1]) {
    let z = 6;
    let hi = 0;
    while (z > -len + 6) {
      const wdt = 3 + R() * 3;
      const col = colours[Math.floor(R() * colours.length)];
      const floors = 5;
      const st = stone(col, 60 + hi++);
      st.repeat.set(wdt / 3, (floors * 3 + 2) / 3);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(wdt, floors * 3 + 2), new THREE.MeshStandardMaterial({ map: st, roughness: 0.95 }));
      f.rotation.y = -k * Math.PI / 2;
      f.position.set(k * hw, (floors * 3 + 2) / 2, z - wdt / 2);
      add(f);
      // a cornice at every floor, and a darker plinth at the street
      for (let fl = 1; fl <= floors; fl++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, wdt), corniceM);
        c.position.set(k * (hw - 0.05), fl * 3 - 0.5, z - wdt / 2);
        add(c);
      }
      const pl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, wdt), new THREE.MeshStandardMaterial({ color: new THREE.Color(col).multiplyScalar(0.55), roughness: 1 }));
      pl.position.set(k * (hw - 0.02), 0.5, z - wdt / 2);
      add(pl);
      // windows: a dark opening, two green shutters, a sill; some lit from inside
      for (let fl = 1; fl < floors; fl++) {
        for (let wi = 0; wi < Math.max(1, Math.floor(wdt / 1.6)); wi++) {
          const wz = z - (wi + 0.5) * (wdt / Math.max(1, Math.floor(wdt / 1.6)));
          const wy = fl * 3 + 0.4;
          const lit = R() < 0.45;
          const win = new THREE.Group();
          win.add(new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.3), lit ? new THREE.MeshStandardMaterial({ color: '#ffcf8a', emissive: new THREE.Color('#ffb060'), emissiveIntensity: 1.2 }) : new THREE.MeshStandardMaterial({ color: '#141010', roughness: 1 })));
          const leaves = [];
          for (const j of [-1, 1]) {
            const hinge = new THREE.Group();
            hinge.position.set(j * 0.375, 0, 0.02);
            const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.32, 0.03), shutterM);
            leaf.position.set(j * 0.2, 0, 0);
            hinge.add(leaf);
            hinge.rotation.y = j * (lit ? 2.2 + R() * 0.6 : 1.4 + R() * 1.2);
            win.add(hinge);
            leaves.push(hinge);
          }
          const sill = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.16), new THREE.MeshStandardMaterial({ color: '#d8d0c0', roughness: 0.9 }));
          sill.position.set(0, -0.7, 0.07);
          win.add(sill);
          win.rotation.y = -k * Math.PI / 2;
          win.position.set(k * (hw - 0.01), wy, wz);
          add(win);
          windows.push({ group: win, leaves, lit, side: k, x: k * hw, y: wy, z: wz });
        }
      }
      z -= wdt;
    }
  }
  // washing lines across, from one house to the other, with the washing hanging
  const lines = [];
  const clothes = ['#f2f0ea', '#d2462a', '#3a5a9a', '#f2c230', '#e88aa8', '#5aa84a', '#ffffff', '#2a2a3a'];
  for (let i = 0; i < 7; i++) {
    const z = 3 - i * 4.2 - R() * 1.5, y = 4.6 + R() * 3.5;
    const line = new THREE.Group();
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, width, 4), clay('#ddd'));
    wire.rotation.z = Math.PI / 2;
    line.add(wire);
    const items = [];
    let x = -hw + 0.2;
    while (x < hw - 0.3) {
      const w = 0.25 + R() * 0.35, h = 0.3 + R() * 0.45;
      const peg = new THREE.Group();
      peg.position.set(x + w / 2, 0, 0);
      const c = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: clothes[Math.floor(R() * clothes.length)], roughness: 0.9 }));
      c.material.side = THREE.DoubleSide;
      c.position.y = -h / 2;
      peg.add(c);
      line.add(peg);
      items.push(peg);
      x += w + 0.08;
    }
    line.position.set(0, y, z);
    add(line);
    lines.push({ group: line, items, y, z });
  }
  // lamps on brackets
  const lamps = [];
  for (let z = 2; z > -len + 8; z -= 8) {
    const k = lamps.length % 2 ? 1 : -1;
    const l = new THREE.Group();
    l.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.03), clay('#151515')));
    l.children[0].position.x = -k * 0.2;
    const glassM = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: new THREE.Color('#ffc070'), emissiveIntensity: 3.5 });
    const g = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.2, 6), glassM);
    g.position.set(-k * 0.4, -0.12, 0);
    l.add(g);
    l.position.set(k * hw, 3.6, z);
    add(l);
    const sp = new THREE.SpotLight('#ffc27a', 16, 9, 0.9, 0.8, 1.4);
    sp.position.set(k * (hw - 0.4), 3.4, z);
    sp.target.position.set(0, 0, z - 0.5);
    s.add(sp, sp.target);
    lamps.push(sp);
  }
  // the strip of sky with its stars
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(width + 2, len + 10), new THREE.MeshBasicMaterial({ map: tex(256, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#0d1a3a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(255,255,240,${0.3 + R() * 0.7})`;
      ctx.fillRect(R() * w, R() * h, 1 + R() * 1.5, 1 + R() * 1.5);
    }
  }) }));
  sky.rotation.x = Math.PI / 2;
  sky.position.set(0, 17.5, -len / 2 + 6);
  s.add(sky);
  // the poster on the wall
  let poster = null;
  try {
    const t = await new THREE.TextureLoader().loadAsync('/la-santa/build/src/cover.jpg');
    t.colorSpace = THREE.SRGBColorSpace;
    poster = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.95), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
    poster.rotation.y = Math.PI / 2;
    poster.position.set(-hw + 0.012, 1.7, -7.5);
    add(poster);
  } catch (e) { /* no poster */ }
  s.add(new THREE.HemisphereLight('#6a7cc0', '#3a2a1c', 1.5));
  const moon = new THREE.DirectionalLight('#9aaae8', 0.9);
  moon.position.set(1.5, 12, -4);
  s.add(moon);
  return { windows, lines, lamps, poster, hw };
}

// ── the port: the quay, the bollards, the ferry for Tunis, the Lanterna turning ──────────────────
export function porto(s) {
  s.background = new THREE.Color('#0b1430');
  const R = rng(71);
  const add = (m) => {
    m.userData.id ??= nextId();
    m.traverse?.((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
    s.add(m);
    return m;
  };
  // the quay
  const quay = add(new THREE.Mesh(new THREE.BoxGeometry(80, 2, 14), new THREE.MeshStandardMaterial({ map: stone('#6a645c', 81, { dark: '20,20,20', light: '180,180,170', chips: 300 }), roughness: 0.9 })));
  quay.position.set(0, -1, 1);
  quay.material.map.repeat.set(12, 2);
  add(boxMesh(80, 0.12, 0.3, '#8a8478', [0, 0, -5.85]));
  // bollards along the edge
  const bitte = [];
  for (let x = -9; x <= 9; x += 3) {
    const b = new THREE.Group();
    const iron = new THREE.MeshStandardMaterial({ color: '#2a2a2e', metalness: 0.6, roughness: 0.5 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 18), iron);
    post.position.y = 0.25;
    b.add(post);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.1, 18), iron);
    cap.position.y = 0.53;
    b.add(cap);
    b.position.set(x, 0, -5.4);
    add(b);
    bitte.push(b);
  }
  // the water, dark, with the lights of the ship broken in it
  const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 400), new THREE.MeshStandardMaterial({ color: '#0a1a30', roughness: 0.15, metalness: 0.3, envMap: K.env(), envMapIntensity: 0.3, map: tex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(140,160,200,${R() * 0.3})`;
      ctx.fillRect(R() * w, R() * h, 6 + R() * 30, 1.5);
    }
  }) }));
  water.material.map.wrapS = water.material.map.wrapT = THREE.RepeatWrapping;
  water.material.map.repeat.set(30, 20);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -1.4, -200);
  s.add(water);
  // the ferry, along the quay: dark hull, white decks, rows of lit windows, a funnel
  const ship = new THREE.Group();
  const hullM = new THREE.MeshStandardMaterial({ color: '#16224a', roughness: 0.6 });
  const whiteM = new THREE.MeshStandardMaterial({ color: '#ecebe6', roughness: 0.6 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(60, 6, 12), hullM);
  hull.position.set(0, 1.6, 0);
  ship.add(hull);
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 6, 3, 1, false, 0, Math.PI), hullM);
  bow.rotation.set(0, Math.PI / 2, 0);
  bow.scale.set(1, 1, 1.6);
  bow.position.set(30, 1.6, 0);
  ship.add(bow);
  const nameT = tex(1024, 128, (ctx, w, h) => {
    ctx.fillStyle = '#16224a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ecebe6';
    ctx.font = `${h * 0.7}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('GENOVA  ·  TUNIS', w / 2, h * 0.78);
  });
  const name = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.75), new THREE.MeshStandardMaterial({ map: nameT, roughness: 0.6 }));
  name.position.set(8, 2.6, 6.01);
  ship.add(name);
  const decks = [];
  for (let d = 0; d < 3; d++) {
    const w = 54 - d * 10, y = 5.6 + d * 2.4;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 2.4, 11 - d), whiteM);
    deck.position.set(-2 - d * 2, y, 0);
    ship.add(deck);
    const winM = new THREE.MeshStandardMaterial({ color: '#2a2a2a', emissive: new THREE.Color('#ffd48a'), emissiveIntensity: 0, map: tex(1024, 64, (ctx, cw, ch) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, cw, ch);
      for (let x = 8; x < cw; x += 22) {
        ctx.fillStyle = R() < 0.8 ? '#fff' : '#333';
        ctx.fillRect(x, 18, 14, 28);
      }
    }), emissiveMap: null });
    winM.emissiveMap = winM.map;
    const wins = new THREE.Mesh(new THREE.PlaneGeometry(w - 2, 1.2), winM);
    wins.position.set(-2 - d * 2, y + 0.1, (11 - d) / 2 + 0.01);
    ship.add(wins);
    decks.push(winM);
  }
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 5, 20), whiteM);
  funnel.position.set(-14, 14.5, 0);
  ship.add(funnel);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.75, 1.2, 20), new THREE.MeshStandardMaterial({ color: '#c8202a' }));
  band.position.set(-14, 15.4, 0);
  ship.add(band);
  // the rail at the top deck, where Nonna waves
  const rail = new THREE.Mesh(new THREE.BoxGeometry(34, 0.05, 0.05), clay('#ddd'));
  rail.position.set(-12, 11.6, 4.6);
  ship.add(rail);
  for (let x = -29; x < 5; x += 1.2) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4), clay('#ddd'));
    p.position.set(x, 11.1, 4.6);
    ship.add(p);
  }
  ship.position.set(4, 0, -13);
  add(ship);
  // the ship's floodlights on the quay
  const flood = new THREE.SpotLight('#fff0d8', 0, 40, 0.6, 0.7, 1.2);
  flood.position.set(0, 13, -9);
  flood.target.position.set(0, 0, 0);
  s.add(flood, flood.target);
  // the Lanterna, out on its rock, and its beam
  const lan = new THREE.Group();
  const towerM = new THREE.MeshStandardMaterial({ color: '#d8d2c4', roughness: 0.8 });
  const t1 = new THREE.Mesh(new THREE.BoxGeometry(8, 34, 8), towerM);
  t1.position.y = 17;
  lan.add(t1);
  const t2 = new THREE.Mesh(new THREE.BoxGeometry(7, 30, 7), towerM);
  t2.position.y = 34 + 15 + 1;
  lan.add(t2);
  lan.add(boxMesh(9, 1.2, 9, '#c8c0b0', [0, 34, 0]));
  lan.add(boxMesh(8, 1.2, 8, '#c8c0b0', [0, 64, 0]));
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 5, 16), new THREE.MeshStandardMaterial({ color: '#fff4d0', emissive: new THREE.Color('#ffe8a0'), emissiveIntensity: 5 }));
  lamp.position.y = 68;
  lan.add(lamp);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), clay('#2a2a2a'));
  dome.position.y = 70.5;
  lan.add(dome);
  const rock = new THREE.Mesh(new THREE.SphereGeometry(16, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#3a3430', roughness: 1 }));
  rock.scale.y = 0.4;
  lan.add(rock);
  const beam = new THREE.Group();
  const beamM = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2c0').multiplyScalar(0.5), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const k of [0, Math.PI]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(14, 260, 24, 1, true), beamM);
    cone.rotation.z = Math.PI / 2;
    cone.position.x = 130;
    const arm = new THREE.Group();
    arm.rotation.y = k;
    arm.add(cone);
    beam.add(arm);
  }
  beam.position.y = 68;
  lan.add(beam);
  lan.position.set(-120, -1.4, -110);
  add(lan);
  beam.traverse((o) => (o.castShadow = false));
  // the city behind: dark hills dotted with lights
  const city = new THREE.Mesh(new THREE.PlaneGeometry(900, 160), new THREE.MeshBasicMaterial({ transparent: true, map: tex(2048, 360, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a1024';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 32) ctx.lineTo(x, h * (0.25 + 0.2 * Math.sin(x / 260) + 0.1 * Math.sin(x / 70 + 1) + R() * 0.03));
    ctx.lineTo(w, h);
    ctx.fill();
    for (let i = 0; i < 2600; i++) {
      const x = R() * w, y = h * (0.45 + R() * 0.55);
      ctx.fillStyle = `rgba(255,${190 + R() * 50},${110 + R() * 60},${0.5 + R() * 0.5})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }) }));
  city.position.set(0, 50, -380);
  s.add(city);
  // a crane at the container quay
  const crane = new THREE.Group();
  const craneM = new THREE.MeshStandardMaterial({ color: '#2a4a8a', roughness: 0.7 });
  for (const [x, z] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(1, 40, 1), craneM);
    l.position.set(x, 20, z);
    crane.add(l);
  }
  const boom = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 70), craneM);
  boom.position.set(0, 40, -10);
  crane.add(boom);
  const red = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshStandardMaterial({ color: '#f00', emissive: new THREE.Color('#ff2020'), emissiveIntensity: 4 }));
  red.position.set(0, 41.5, -44);
  crane.add(red);
  crane.position.set(70, 0, -70);
  add(crane);
  // the night: a sky light, the quay lamps
  s.add(new THREE.HemisphereLight('#4a5c94', '#1a1410', 0.8));
  const moon = new THREE.DirectionalLight('#8a9ad8', 0.6);
  moon.position.set(-20, 40, 20);
  s.add(moon);
  const lamps = [];
  for (const x of [-8, 8]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5, 8), clay('#222'));
    pole.position.set(x, 2.5, 2.5);
    add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffe0b0', emissive: new THREE.Color('#ffc070'), emissiveIntensity: 3 }));
    head.position.set(x, 5.1, 2.5);
    add(head);
    const sp = new THREE.SpotLight('#ffc27a', 30, 14, 0.9, 0.8, 1.3);
    sp.position.set(x, 5, 2.5);
    sp.target.position.set(x, 0, 0);
    if (x === 8) shadowed(sp);
    s.add(sp, sp.target);
    lamps.push(sp);
  }
  return { bitte, ship, decks, beam, flood, lamps, water };
}
