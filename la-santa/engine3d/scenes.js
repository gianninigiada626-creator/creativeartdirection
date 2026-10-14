// The shots of SEX ON LA SANTA: puppet sets at human scale. Metres; puppets face +z unless turned.
import { THREE, W, H, boxMesh, plane, clay, nextId } from '/a-parte/engine3d/stage.js';
import { puppet, SAYF, SIT, felt } from './puppet.js';

const D = THREE.MathUtils.degToRad;

function cam(fov, pos, target, far = 60) {
  const c = new THREE.PerspectiveCamera(fov, W / H, 0.05, far);
  c.position.set(...pos);
  c.lookAt(...target);
  c.updateMatrixWorld(true);
  return c;
}

/** A light that casts soft shadows without acne on the fleece. */
function shadowed(light, size = 2048, normalBias = 0.012) {
  light.castShadow = true;
  light.shadow.mapSize.set(size, size);
  light.shadow.bias = -0.0002;
  light.shadow.normalBias = normalBias;
  return light;
}

function tex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// ── a puppet portrait, against black, as in the photo of the puppet ──
async function portrait() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#050506');
  const p = puppet(SAYF);
  p.pose({ ...SIT, torso: [-0.05, 0.25, 0.04], neck: [0.05, -0.25, 0], head: [0.04, -0.1, 0.05], shoulderR: [0.3, 0, -0.2], elbowR: [-1.2, 0, 0.1] });
  p.look(0.25, 0.05);
  p.mouth(0.12);
  s.add(p.root);
  const key = new THREE.SpotLight('#fff4e8', 40, 10, 0.5, 0.6, 1.5);
  key.position.set(1.4, 2.2, 2.2);
  key.target.position.set(0, 0.6, 0);
  shadowed(key);
  s.add(key, key.target);
  const fill = new THREE.DirectionalLight('#c8d4ff', 0.6);
  fill.position.set(-2, 1, 2);
  s.add(fill);
  const rim = new THREE.DirectionalLight('#ffffff', 1.2);
  rim.position.set(-1, 2, -2);
  s.add(rim);
  s.add(new THREE.HemisphereLight('#ffffff', '#222222', 0.25));
  return { scene: s, camera: cam(30, [0.25, 0.85, 2.2], [0.0, 0.62, 0]), far: 20 };
}

// ── the head close, three-quarters, to hold against the photo ──
async function head(opts = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#050506');
  const p = puppet(SAYF);
  p.root.rotation.y = -0.35;
  p.pose({ torso: [-0.04, 0, 0.03], neck: [0.04, 0.2, 0], head: [0.05, 0.12, 0.04] });
  p.look(0.15, 0.02);
  p.mouth(opts.mouth ?? 0.1);
  s.add(p.root);
  const key = new THREE.SpotLight('#fff1e2', 14, 10, 0.5, 0.8, 1.5);
  key.position.set(-1.0, 1.9, 2.0);
  key.target.position.set(0, 0.7, 0);
  shadowed(key);
  s.add(key, key.target);
  const fill = new THREE.DirectionalLight('#dfe6ff', 0.7);
  fill.position.set(2, 0.8, 2);
  s.add(fill);
  const rim = new THREE.DirectionalLight('#ffffff', 1.4);
  rim.position.set(1, 2, -2);
  s.add(rim);
  s.add(new THREE.HemisphereLight('#ffffff', '#222222', 0.35));
  return { scene: s, camera: cam(24, [0.05, 0.8, 1.75], [0.0, 0.68, 0]), far: 20 };
}

// ── the front of the Baretto Santissimo, in its alley ──────────────────────────────────────────
/** Old stone and plaster: big soft stains, a fine grain, a few chips, damp running down from the top. */
function stone(base = '#c48a58', seed = 3, { dark = '70,40,20', light = '255,225,180', chips = 140 } = {}) {
  const R = rng(seed);
  const t = stoneTex(base, R, dark, light, chips);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
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

function flame(ctx, cx, cy, s, fill = '#c4261c') {
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

function awningFront(ctx, w, h) {
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
function bottle(col, h = 0.3, r = 0.036, emissive = 0) {
  const pr = [[0, 0], [r * 0.95, 0], [r, 0.01], [r, h * 0.62], [r * 0.85, h * 0.7], [r * 0.38, h * 0.8], [r * 0.34, h * 0.97], [r * 0.4, h * 0.98], [r * 0.4, h], [0, h]];
  const m = new THREE.Mesh(new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), 18),
    new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, emissive: new THREE.Color(col), emissiveIntensity: emissive }));
  m.castShadow = true;
  return m;
}

function santissimoFront(s) {
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

// 02 · Sayf on the bench outside his bar
async function s02(opts = {}) {
  const s = new THREE.Scene();
  const { wz } = santissimoFront(s);
  const p = puppet(SAYF);
  p.root.position.set(-0.85, 0.47, wz + 0.38);
  p.root.rotation.y = D(4);
  p.pose({ ...SIT, torso: [-0.2, 0.08, 0.05], neck: [0.12, -0.2, 0], head: [0.06, -0.22, 0.08],
    shoulderL: [0.25, 0.3, 0.95], elbowL: [-0.9, 0.2, 0.1], wristL: [0.3, 0, 0.3], shoulderR: [0.35, 0, -0.2], elbowR: [-1.0, 0, 0.1], hipL: [-1.4, 0.15, 0.1], hipR: [-1.4, -0.2, -0.06] });
  p.look(0.12, 0.02);
  p.lids(0.38);
  p.mouth(opts.mouth ?? 0.3);
  s.add(p.root);
  const key = new THREE.SpotLight('#ffdcb4', 9, 6, 0.42, 0.85, 1.5);
  key.position.set(0.6, 1.95, 0.9);
  key.target.position.set(-0.85, 1.1, wz + 0.35);
  shadowed(key);
  s.add(key, key.target);
  const rim = new THREE.SpotLight('#9fb0ff', 7, 6, 0.4, 0.8, 1.5);
  rim.position.set(-2.4, 2.3, wz + 0.2);
  rim.target.position.set(-0.85, 1.15, wz + 0.4);
  s.add(rim, rim.target);
  return { scene: s, camera: cam(40, [-1.75, 0.92, 1.1], [-0.35, 1.45, wz]), far: 30 };
}

// the facade of the Santissimo, wide, at night
async function facade() {
  const s = new THREE.Scene();
  const { wz } = santissimoFront(s);
  const p = puppet(SAYF);
  p.root.position.set(-0.85, 0.47, wz + 0.38);
  p.root.rotation.y = D(10);
  p.pose({ ...SIT, torso: [-0.2, 0.08, 0.05], neck: [0.12, -0.08, 0], shoulderL: [0.25, 0.3, 0.95], elbowL: [-0.9, 0.2, 0.1] });
  s.add(p.root);
  return { scene: s, camera: cam(40, [0.4, 1.45, 4.6], [0.25, 1.75, wz]), far: 30 };
}

// 03 · close on Sayf singing to us, the bar warm behind him
async function s03(opts = {}) {
  const s = new THREE.Scene();
  const { wz } = santissimoFront(s);
  const p = puppet(SAYF);
  p.root.position.set(-0.85, 0.47, wz + 0.38);
  p.root.rotation.y = D(-8);
  p.pose({ ...SIT, torso: [-0.16, -0.05, 0.04], neck: [0.1, -0.12, 0.02], head: [0.0, -0.18, 0.08],
    shoulderL: [0.25, 0.3, 0.95], elbowL: [-0.9, 0.2, 0.1], shoulderR: [0.2, 0, -0.15], elbowR: [-0.9, 0, 0.1] });
  p.look(-0.05, 0.05);
  p.lids(opts.lids ?? 0.36);
  p.mouth(opts.mouth ?? 0.6);
  s.add(p.root);
  const key = new THREE.SpotLight('#ffe2c4', 5, 5, 0.35, 0.9, 1.5);
  key.position.set(-1.7, 1.85, 0.4);
  key.target.position.set(-0.85, 1.2, wz + 0.3);
  shadowed(key);
  s.add(key, key.target);
  // the bar behind him rims his shoulder and the twists
  const rim = new THREE.SpotLight('#ffa860', 10, 4, 0.5, 0.8, 1.5);
  rim.position.set(0.3, 1.7, wz - 0.1);
  rim.target.position.set(-0.85, 1.2, wz + 0.3);
  s.add(rim, rim.target);
  return { scene: s, camera: cam(30, [-1.45, 1.22, 0.55], [-0.62, 1.2, wz + 0.05]), far: 30 };
}

export const SCENES = { portrait, head, s02, s03, facade };
