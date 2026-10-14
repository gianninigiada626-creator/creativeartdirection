// The shots of BASSA FEDELTÀ as 3D scenes. Metres; characters face +z unless turned (rotY).
// The painter repaints everything thick and loud, so sets are built for colour and shape, not for detail.
// Each scene takes opts.t (seconds into the shot) for the animatic; a still is taken at its middle.
import * as K from './kit.js';

const { THREE, D, boxMesh, plane, clay, nextId, cam, tex, framed, cable, mesh, kid, grown, guest, woman, inHand, cassette, bic, jersey } = K;

// a seeded random, so a texture drawn twice comes out the same
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ease = (x) => x * x * (3 - 2 * x);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
/** 0 before a, 1 after b, eased between. */
const ramp = (t, a, b) => ease(clamp01((t - a) / (b - a)));
/** Blend two sets of aims bone by bone. */
function mixAims(a, b, u) {
  const o = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const p = a[k] ?? b[k], q = b[k] ?? a[k];
    o[k] = p.map((v, i) => v + (q[i] - v) * u);
  }
  return o;
}
/** Put a body in a pose now (and keep it there while its clip breathes). */
function pose(obj, aims) {
  obj.aimNow = { ...obj.baseAims, ...aims };
  obj.aimAll(obj.aimNow);
}
/** A nod on the beat: 88 to the minute, the head down on the one. */
const BEAT = 60 / 88;
const nod = (t, depth = 0.25, phase = 0) => Math.max(0, Math.sin(((t / BEAT + phase) % 1) * Math.PI)) * depth;

// ── poses (aims in the character's own frame: +z forward, +y up, +x its left) ──
const KNEES = { LeftUpLeg: [0.35, -0.1, 1], RightUpLeg: [-0.35, -0.1, 1], LeftLeg: [0.12, -1, 0.14], RightLeg: [-0.12, -1, 0.14] };
const PAD = { LeftArm: [0.25, -0.75, 0.55], LeftForeArm: [-0.4, 0.15, 1], RightArm: [-0.25, -0.75, 0.55], RightForeArm: [0.4, 0.15, 1] };
const CLAP = { LeftArm: [0.2, -0.35, 0.9], LeftForeArm: [-0.55, 0.45, 0.7], RightArm: [-0.2, -0.35, 0.9], RightForeArm: [0.55, 0.45, 0.7] };
const POCKETS = { LeftArm: [0.2, -1, -0.08], LeftForeArm: [0.1, -0.6, 0.5], RightArm: [-0.2, -1, -0.08], RightForeArm: [-0.1, -0.6, 0.5] };
const OPEN = { LeftArm: [0.9, -0.2, 0.4], LeftForeArm: [0.55, 0.35, 0.7], RightArm: [-0.9, -0.2, 0.4], RightForeArm: [-0.55, 0.35, 0.7] };
const GLASS = { RightArm: [-0.15, -0.9, 0.3], RightForeArm: [-0.1, 0.35, 1] };

function lights(s, { hemi = ['#ffffff', '#555555', 1.2], sun = null, points = [] } = {}) {
  s.add(new THREE.HemisphereLight(...hemi));
  if (sun) {
    const d = new THREE.DirectionalLight(sun.color, sun.int);
    d.position.set(...sun.pos);
    d.target.position.set(...(sun.target ?? [0, 0, 0]));
    d.castShadow = true;
    d.shadow.mapSize.set(2048, 2048);
    const a = sun.area ?? 8;
    Object.assign(d.shadow.camera, { left: -a, right: a, top: a, bottom: -a, far: 80 });
    d.shadow.radius = 5;
    d.shadow.bias = -0.0005;
    s.add(d, d.target);
  }
  for (const p of points) {
    const l = new THREE.PointLight(p.color, p.int, p.dist ?? 10, p.decay ?? 1.6);
    l.position.set(...p.pos);
    if (p.shadow) {
      l.castShadow = true;
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.bias = -0.002;
    }
    s.add(l);
  }
}

/** A sky: a big sphere painted with a vertical gradient. */
function sky(s, stops, r = 300) {
  const t = tex(16, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    for (const [at, c] of stops) g.addColorStop(at, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false }));
  m.userData.id = nextId();
  s.add(m);
}

/** The front of a block of flats: windows (some lit), green shutters, balconies on the given floors. */
function facade(w, h, color, { seed = 1, lit = 0.3, floors = 6, cols = 6, balconies = [], warm = '#ffcf7a' } = {}) {
  const g = new THREE.Group();
  const R = rng(seed);
  const t = tex(512, Math.round((512 * h) / w), (ctx, cw, ch) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, cw, ch);
    const fh = ch / floors, fw = cw / cols;
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const x = c * fw + fw * 0.25, y = f * fh + fh * 0.25;
        const on = R() < lit;
        ctx.fillStyle = on ? warm : '#2a2f4a';
        ctx.fillRect(x, y, fw * 0.5, fh * 0.5);
        if (!on && R() < 0.5) {
          ctx.fillStyle = '#3f6a4a';
          ctx.fillRect(x - fw * 0.08, y, fw * 0.1, fh * 0.5);
          ctx.fillRect(x + fw * 0.48, y, fw * 0.1, fh * 0.5);
        }
      }
    }
  });
  const front = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1), [clay(color), clay(color), clay(color), clay(color), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }), clay(color)]);
  front.position.y = h / 2;
  front.castShadow = front.receiveShadow = true;
  g.add(front);
  for (const [f, c] of balconies) {
    const fh = h / floors, fw = w / cols;
    const b = new THREE.Group();
    b.add(boxMesh(fw * 0.9, 0.08, 0.7, '#cfc6b4', [0, 0, 0.35]));
    b.add(boxMesh(fw * 0.9, 0.85, 0.04, '#cfc6b4', [0, 0.08, 0.7]));
    b.position.set(-w / 2 + (c + 0.5) * fw, h - (f + 1) * fh + fh * 0.15, 0.5);
    g.add(b);
  }
  g.userData.id = nextId();
  return g;
}

/** A rolling shutter: grooves, a colour, a little rust. */
function shutterTex(color = '#7a8a7a') {
  return tex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = 0; y < h; y += 12) ctx.fillRect(0, y, w, 3);
    ctx.fillStyle = 'rgba(140,70,30,0.35)';
    ctx.fillRect(0, h * 0.85, w, h * 0.15);
  });
}

/** A white plastic chair, the kind every garage has. */
function plasticChair(color = '#ecebe6') {
  const g = new THREE.Group();
  g.add(boxMesh(0.46, 0.05, 0.44, color, [0, 0.42, 0]));
  const back = boxMesh(0.46, 0.45, 0.04, color, [0, 0.45, -0.21]);
  back.rotation.x = -0.15;
  g.add(back);
  for (const [x, z] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) {
    const l = boxMesh(0.04, 0.43, 0.04, color, [x, 0, z]);
    l.rotation.z = x * 0.3;
    g.add(l);
  }
  for (const x of [-0.25, 0.25]) g.add(boxMesh(0.04, 0.04, 0.4, color, [x, 0.62, 0]));
  g.userData.id = nextId();
  return g;
}

/** A small moped, red, the way they were tuned in the 90s; or the same under a sheet. */
function scooter(color = '#c92a22', covered = false) {
  const g = new THREE.Group();
  if (covered) {
    const sheet = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 12), clay('#7d8088'));
    sheet.scale.set(1.45, 0.95, 0.6);
    sheet.position.y = 0.5;
    sheet.castShadow = true;
    g.add(sheet);
    g.add(boxMesh(1.7, 0.06, 0.7, '#6f727a', [0, 0, 0]));
  } else {
    for (const x of [-0.55, 0.55]) {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.06, 10, 24), clay('#16161a'));
      w.position.set(x, 0.25, 0);
      g.add(w);
    }
    g.add(boxMesh(0.9, 0.3, 0.3, color, [0, 0.3, 0]));
    g.add(boxMesh(0.55, 0.08, 0.28, '#16161a', [-0.15, 0.62, 0]));
    const fork = boxMesh(0.06, 0.75, 0.06, '#8a8a90', [0.5, 0.25, 0]);
    fork.rotation.z = 0.35;
    g.add(fork);
    g.add(boxMesh(0.06, 0.06, 0.6, '#16161a', [0.62, 0.95, 0]));
    g.add(boxMesh(0.25, 0.25, 0.32, color, [0.45, 0.55, 0]));
  }
  g.traverse((m) => m.isMesh && (m.castShadow = true));
  g.userData.id = nextId();
  return g;
}

/** A street lamp: the pole, the arm, the head that glows, and its light. */
function lamp(s, pos, color = '#ffb35a', int = 8, h = 4.2) {
  s.add(boxMesh(0.1, h, 0.1, '#3a3a40', pos));
  s.add(boxMesh(0.8, 0.07, 0.08, '#3a3a40', [pos[0] + 0.35, h, pos[2]]));
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.22), new THREE.MeshStandardMaterial({ color: '#222', emissive: new THREE.Color(color).multiplyScalar(2) }));
  head.position.set(pos[0] + 0.7, h - 0.05, pos[2]);
  head.userData.id = nextId();
  s.add(head);
  const l = new THREE.PointLight(color, int, 14, 1.4);
  l.position.set(pos[0] + 0.7, h - 0.3, pos[2]);
  l.castShadow = true;
  l.shadow.mapSize.set(1024, 1024);
  l.shadow.bias = -0.002;
  s.add(l);
}

/** A crane at the port: a lattice tower and a long arm, in silhouette. */
function crane(x, z, h = 22, color = '#2a2440') {
  const g = new THREE.Group();
  for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) g.add(boxMesh(0.3, h, 0.3, color, [dx, 0, dz]));
  for (let y = 2; y < h; y += 2.5) g.add(boxMesh(2.6, 0.2, 2.6, color, [0, y, 0]));
  g.add(boxMesh(2.6, 3, 2.6, color, [0, h, 0]));
  g.add(boxMesh(28, 0.9, 1.0, color, [6, h + 2.2, 0]));
  g.add(boxMesh(0.12, 10, 0.12, color, [18, h - 8, 0]));
  g.position.set(x, 0, z);
  g.userData.id = nextId();
  return g;
}

// ── the living room ─────────────────────────────────────────────────────────────────────────────
// The camera is the television: the three of them on the sofa face us, the room packed full behind them.
function flowersSmall(ctx, w, h) {
  ctx.fillStyle = '#efb9d2';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#3f72d6';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.78, w * 0.16, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4c8a4a';
  ctx.lineWidth = 5;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.62);
    ctx.lineTo(w * (0.22 + i * 0.14), h * 0.25);
    ctx.stroke();
  }
  ctx.fillStyle = '#ec5a42';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(w * (0.2 + i * 0.12), h * (0.2 + (i % 2) * 0.08), w * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
}

function salottoSet(s) {
  s.background = new THREE.Color('#2a1f4a');
  const BW = -2.0;
  s.add(plane(6, 5, '#3c2a4e', [0, 0, 0.3]));
  s.add(plane(6, 3.2, '#5c43b0', [0, 1.6, BW], 0));
  const lw = plane(5, 3.2, '#4b4fb0', [-2.4, 1.6, 0.3], 0);
  lw.rotation.y = Math.PI / 2;
  s.add(lw);
  const rw = plane(5, 3.2, '#5a3fa0', [2.4, 1.6, 0.3], 0);
  rw.rotation.y = -Math.PI / 2;
  s.add(rw);
  s.add(plane(3.6, 2.4, '#5a2f6a', [0, 0.005, -0.6]));
  // the posters, and among them, small, grandmother's flowers: the high culture of the house
  s.add(framed(0.7, 0.9, tex(380, 490, K.poster96), [-1.55, 2.28, BW + 0.02], 0, '#e8e2d6'));
  s.add(framed(0.62, 0.8, tex(340, 440, K.posterFace), [-0.75, 2.22, BW + 0.02], 0, '#e8e2d6'));
  s.add(framed(0.78, 0.98, tex(400, 500, K.posterTarget), [1.25, 2.36, BW + 0.02], 0, '#1a1a1a'));
  s.add(framed(0.36, 0.3, tex(240, 200, flowersSmall), [0.2, 2.4, BW + 0.02], 0, '#c49a3a'));
  s.add(mesh(new THREE.PlaneGeometry(0.5, 0.42), null, [2.0, 2.2, BW + 0.02], [0, 0, 0], { map: tex(300, 250, K.crown), alpha: true }));
  // a little television on a shelf at the back: static, a skater
  s.add(boxMesh(1.1, 0.06, 0.4, '#6a4024', [0.15, 1.42, BW + 0.2]));
  s.add(boxMesh(0.55, 0.45, 0.42, '#1d1d22', [0.15, 1.48, BW + 0.22]));
  const R = rng(7);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.33), new THREE.MeshBasicMaterial({ map: tex(320, 240, (ctx, w, h) => {
    ctx.fillStyle = '#9fb8d8';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = R() > 0.5 ? '#e8eef8' : '#6d84a8';
      ctx.fillRect(R() * w, R() * h, 3, 1);
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
  // the shelf on the right: the stereo and the tapes
  s.add(boxMesh(0.7, 1.15, 0.45, '#6a4024', [2.0, 0, BW + 0.45]));
  s.add(mesh(new THREE.BoxGeometry(0.62, 0.3, 0.2), '#9ea3ab', [2.0, 1.3, BW + 0.45]));
  s.add(mesh(new THREE.PlaneGeometry(0.6, 0.29), null, [2.0, 1.3, BW + 0.552], [0, 0, 0], { map: tex(400, 190, K.boomboxFront) }));
  for (let i = 0; i < 9; i++) s.add(boxMesh(0.11, 0.018, 0.07, ['#c92a22', '#efe9dc', '#2c5fb8', '#e8c22c', '#1a1a1a'][i % 5], [1.85 + (i % 3) * 0.13, 0.85 + Math.floor(i / 3) * 0.02, BW + 0.55]));
  // the skateboard against the sofa, a basketball
  s.add(mesh(new THREE.BoxGeometry(0.22, 0.82, 0.02), null, [-1.62, 0.43, -1.0], [-6, 25, 10], { map: tex(140, 520, K.skateDeck) }));
  s.add(mesh(new THREE.SphereGeometry(0.13, 24, 16), '#d2601e', [-1.3, 0.13, -0.35]));
  // the floor: the console, cords running to the television (us), records, tapes, a comic, a can, a cap
  s.add(boxMesh(0.32, 0.07, 0.22, '#16161a', [0.45, 0, -0.1]));
  s.add(cable([[0.4, 0.01], [0.3, 0.5], [0.2, 1.0], [0.1, 1.8]]));
  s.add(cable([[0.4, -0.2], [0.1, -0.5], [-0.4, -0.85, 0.42], [-0.75, -1.05, 0.62]]));
  s.add(cable([[0.5, -0.2], [0.45, -0.6], [0.3, -0.85, 0.4], [0.15, -1.05, 0.62]]));
  for (const [x, z, r] of [[-0.55, -0.05, 0], [0.55, 0.42, 6]]) {
    const rec = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.006, 40), null, [x, 0.008, z], [0, 0, r], {});
    rec.material = new THREE.MeshStandardMaterial({ map: tex(256, 256, K.vinylLabel), roughness: 0.6 });
    s.add(rec);
  }
  s.add(mesh(new THREE.PlaneGeometry(0.3, 0.38), null, [0.95, 0.008, -0.05], [-90, 0, -15], { map: tex(300, 380, K.magazine) }));
  for (let i = 0; i < 4; i++) s.add(boxMesh(0.11, 0.018, 0.07, ['#efe9dc', '#c92a22', '#2c5fb8', '#1a1a1a'][i], [-0.05 + (i % 2) * 0.02, i * 0.018, 0.1]));
  s.add(mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 16), '#1f7a3a', [1.3, 0.06, -0.3]));
  const tapes = ['#efe9dc', '#c92a22', '#e8c22c', '#2c5fb8', '#1a1a1a', '#2f7a3a'];
  for (let i = 0; i < 9; i++) {
    const t = boxMesh(0.11, 0.018, 0.07, tapes[i % tapes.length], [-1.1 + i * 0.27 + Math.sin(i * 3) * 0.05, 0, 0.28 + Math.cos(i * 2.1) * 0.22]);
    t.rotation.y = i * 0.7;
    s.add(t);
  }
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
    ctx.font = 'bold 40px Anton, Impact, sans-serif';
    ctx.fillText('BOOM!', 20, h * 0.22);
  }) }));
  s.add(boxMesh(0.14, 0.04, 0.09, '#16161a', [0.15, 0, 0.62]));
  // light: the television is where we are, blue on their faces; a lamp on the right, warm; violet all round
  lights(s, {
    hemi: ['#b9a8ff', '#3a1f4a', 1.1],
    sun: { color: '#cfe0ff', int: 1.5, pos: [0.2, 1.2, 4], target: [0, 0.9, -1.5], area: 4 },
    points: [{ color: '#ffa850', int: 6, dist: 7, decay: 1.5, pos: [2.0, 2.1, -0.1] }],
  });
  const rim = new THREE.DirectionalLight('#ff6a8a', 0.8);
  rim.position.set(-2, 3, -3);
  s.add(rim);
  let tvLight = null;
  s.traverse((o) => o.isDirectionalLight && o.color.getHexString() === 'cfe0ff' && (tvLight = o));
  // the television is us: its light flickers on them with the game
  const flicker = (t, amp = 0.25) => {
    if (tvLight) tvLight.intensity = 1.5 * (1 + amp * (Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.1 + 1) * 0.3 + Math.sin(t * 2.1) * 0.2));
  };
  return { BW, seatZ: BW + 0.82, flicker };
}

async function onSofa(s, seatZ, poses) {
  const [sa, be, ty] = poses;
  const saimon = await kid('saimon', 'sitChair', { pos: [-0.95, 0, seatZ], rotY: 8, drop: -0.02, ...sa });
  const bebo = await kid('bebo', 'sitChair', { pos: [0.0, 0, seatZ], rotY: -4, drop: -0.02, ...be });
  const tyson = await kid('tyson', 'sitChair', { pos: [0.98, 0, seatZ + 0.06], rotY: -12, drop: 0.02, ...ty });
  s.add(saimon, bebo, tyson);
  return { saimon, bebo, tyson };
}

const TYSON_SIT = {
  Spine: [0, 1, -0.22], Spine1: [0, 1, -0.12], Neck: [0, 1, 0.15], Head: [0, 1, 0.2],
  LeftUpLeg: [0.3, -0.2, 1], RightUpLeg: [-0.5, -0.12, 1], LeftLeg: [0.06, -1, 0.3], RightLeg: [-0.22, -1, 0.2],
  LeftArm: [0.8, -0.35, -0.2], LeftForeArm: [0.4, -0.2, 1], RightArm: [-0.35, -0.9, 0.3], RightForeArm: [0.05, -0.25, 1],
};

// 02 · all three looking at us, the pads in their hands
async function s02() {
  const s = new THREE.Scene();
  const { seatZ, flicker } = salottoSet(s);
  const P = await onSofa(s, seatZ, [
    { expr: 'focus', aim: { ...PAD, ...KNEES, LeftUpLeg: [0.45, -0.1, 1], RightUpLeg: [-0.45, -0.1, 1], Spine: [0, 1, 0.12], Head: [0, 1, 0.12] } },
    { expr: 'focus', aim: { ...PAD, ...KNEES, Spine: [0, 1, 0.1], Head: [0, 1, 0.1] } },
    { aim: { ...TYSON_SIT, RightArm: [-0.25, -0.75, 0.55], RightForeArm: [0.4, 0.15, 1] }, dogYaw: -0.55 },
  ]);
  // they play: thumbs and shoulders on the game, leaning in on the hard bits
  const update = (k, t) => {
    flicker(t);
    const lean = 0.08 * Math.sin(t * 0.9);
    pose(P.saimon, { Spine: [0, 1, 0.12 + lean], LeftForeArm: [-0.4, 0.15 + 0.1 * Math.sin(t * 6), 1] });
    pose(P.bebo, { Spine: [0, 1, 0.1 - lean * 0.6], RightForeArm: [0.4, 0.15 + 0.1 * Math.sin(t * 5 + 1), 1] });
  };
  return { scene: s, camera: cam(60, [0.05, 1.02, 1.75], [0.05, 0.9, -1.4]), far: 30, update };
}

// 03 · the goal
async function s03() {
  const s = new THREE.Scene();
  const { seatZ, flicker } = salottoSet(s);
  const P = await onSofa(s, seatZ, [
    { expr: 'shout', aim: {
      RightArm: [-0.4, 1, 0.1], RightForeArm: [-0.15, 1, 0.05], RightHand: [0, 1, 0], LeftArm: [0.3, -0.7, 0.6], LeftForeArm: [-0.25, 0.25, 1],
      ...KNEES, LeftUpLeg: [0.45, -0.1, 1], RightUpLeg: [-0.45, -0.1, 1], Spine: [0, 1, 0.05], Head: [0, 1, 0.15],
    } },
    { expr: 'sad', aim: {
      RightArm: [-0.75, 0.6, 0.25], RightForeArm: [0.6, 0.75, -0.15], RightHand: [0.4, 0.4, -0.5],
      LeftArm: [0.75, 0.6, 0.25], LeftForeArm: [-0.6, 0.75, -0.15], LeftHand: [-0.4, 0.4, -0.5],
      ...KNEES, LeftUpLeg: [0.3, -0.1, 1], RightUpLeg: [-0.3, -0.1, 1], Spine: [0, 1, 0.2], Neck: [0, 1, 0.2], Head: [0, 0.95, 0.3],
    } },
    { aim: TYSON_SIT },
  ]);
  // the goal goes in at half a second: Saimon's arm goes up, Bebo's hands go to his head; Tyson laughs
  const PADS = { ...PAD, ...KNEES, LeftUpLeg: [0.45, -0.1, 1], RightUpLeg: [-0.45, -0.1, 1], Spine: [0, 1, 0.12], Head: [0, 1, 0.12] };
  const sUp = P.saimon.baseAims, bUp = P.bebo.baseAims;
  const update = (k, t) => {
    flicker(t, t < 3 ? 0.45 : 0.25);
    const g = ramp(t, 0.4, 0.9);
    pose(P.saimon, mixAims({ ...sUp, ...PADS }, { ...sUp, RightArm: [-0.4, 1, 0.1 + 0.15 * Math.sin(t * 9) * (t < 4 ? 1 : 0)] }, g));
    pose(P.bebo, mixAims({ ...bUp, ...PAD, Spine: [0, 1, 0.1], Head: [0, 1, 0.1] }, bUp, ramp(t, 0.6, 1.2)));
    pose(P.tyson, { Neck: [0, 1, 0.15 + 0.2 * Math.abs(Math.sin(t * 6)) * ramp(t, 0.6, 1.0)] });
  };
  return { scene: s, camera: cam(46, [0.05, 1.05, 1.55], [0.05, 0.95, -1.4]), far: 30, update };
}

// 12 · the television goes off: the room in the dark, the dot of the tube, the tape on the floor
async function s12() {
  const s = new THREE.Scene();
  salottoSet(s);
  s.traverse((o) => o.isLight && (o.intensity *= 0.15));
  const tv = new THREE.Group();
  tv.add(boxMesh(0.9, 0.7, 0.6, '#1d1d22', [0, 0, 0]));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.56), new THREE.MeshBasicMaterial({ map: tex(320, 240, (ctx, w, h) => {
    ctx.fillStyle = '#0c0c12';
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 26);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, '#cfe0ff');
    g.addColorStop(1, 'rgba(12,12,18,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }) }));
  glass.position.set(0, 0.36, 0.301);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.035, 24), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  dot.position.set(0, 0.36, 0.303);
  tv.add(dot);
  glass.userData.id = nextId();
  tv.add(glass);
  tv.position.set(0.0, 0.0, 0.2);
  tv.userData.id = nextId();
  s.add(tv);
  const curve = new THREE.CatmullRomCurve3([[0.5, 0.01, 0.9], [0.25, 0.01, 0.75], [0.35, 0.01, 0.55], [0.6, 0.01, 0.6], [0.7, 0.01, 0.8], [0.9, 0.01, 0.7]].map((p) => new THREE.Vector3(...p)));
  const tape = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.006, 4), clay('#6a3a1a'));
  tape.userData.id = nextId();
  s.add(tape);
  const c = cassette();
  c.rotation.x = -Math.PI / 2;
  c.position.set(0.95, 0.01, 0.7);
  s.add(c);
  const glow = new THREE.PointLight('#cfe0ff', 1.2, 2.5, 2);
  glow.position.set(0, 0.4, 0.7);
  s.add(glow);
  const update = (k, t) => {
    const f = 1 - ramp(t, 0.5, 3.0);
    dot.scale.setScalar(Math.max(0.001, f));
    glass.material.color.setScalar(Math.max(0.0, 1 - ramp(t, 0.2, 2.0)));
    glow.intensity = 1.2 * f;
  };
  return { scene: s, camera: cam(40, [0.55, 0.55, 2.2], [0.25, 0.3, 0.2]), far: 30, update };
}

// ── 01 · the Bic ────────────────────────────────────────────────────────────────────────────────
/** A hand made of a few shapes, dark: the palm, four fingers, a thumb, the wrist, a yellow sleeve. */
function hand(color = '#16110e') {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.028, 0.09), clay(color)));
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.05, 4, 8), clay(color));
    f.position.set(-0.03 + i * 0.02, -0.01, 0.065);
    f.rotation.x = 1.1;
    g.add(f);
  }
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.045, 4, 8), clay(color));
  th.position.set(-0.055, -0.005, 0.02);
  th.rotation.set(0.6, 0, 0.9);
  g.add(th);
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.2, 12), clay(color));
  wrist.rotation.x = Math.PI / 2;
  wrist.position.set(0, 0, -0.14);
  g.add(wrist);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.25, 14), clay('#e6c42a'));
  sleeve.rotation.x = Math.PI / 2;
  sleeve.position.set(0, 0, -0.32);
  g.add(sleeve);
  g.traverse((m) => m.isMesh && (m.castShadow = true));
  g.userData.id = nextId();
  return g;
}

async function s01(opts = {}) {
  const t = opts.t ?? 5;
  const s = new THREE.Scene();
  s.background = new THREE.Color('#1c1430');
  s.add(plane(3, 3, '#4a2a5e', [0, 0, 0]));
  const c = cassette('ROCCO MIX 96', 1);
  c.rotation.x = -Math.PI / 2 + 0.25;
  c.position.set(0, 0.035, 0);
  s.add(c);
  // the pen through the left reel, turning
  const pen = bic(1);
  s.add(pen);
  const h = hand();
  h.scale.setScalar(0.8);
  s.add(h);
  const turn = (tt) => {
    const ang = tt * 2.4;
    pen.position.set(-0.018 + Math.cos(ang) * 0.004, 0.105, 0.005 + Math.sin(ang) * 0.004);
    pen.rotation.set(0.25 + Math.sin(ang) * 0.06, ang * 0.5, Math.cos(ang) * 0.06);
    h.position.set(-0.03 + Math.cos(ang) * 0.003, 0.175, -0.035 + Math.sin(ang) * 0.003);
    h.rotation.set(0.2, 0.5 + Math.sin(ang) * 0.15, Math.PI / 2 - 0.35);
  };
  turn(t);
  const h2 = hand();
  h2.scale.setScalar(0.8);
  h2.position.set(0.11, 0.025, 0.02);
  h2.rotation.set(-0.15, -1.75, -0.15);
  s.add(h2);
  s.add(cable([[0.3, -0.25], [0.15, -0.05], [0.2, 0.2], [0.5, 0.3]], 0.006, 0.006));
  lights(s, {
    hemi: ['#a898ff', '#2a1a3a', 0.9],
    sun: { color: '#cfe0ff', int: 1.6, pos: [0.3, 1.5, 1.2], target: [0, 0, 0], area: 1 },
    points: [{ color: '#ff9a50', int: 0.8, dist: 2, pos: [-0.4, 0.3, -0.2] }],
  });
  return { scene: s, camera: cam(40, [0.04, 0.24, 0.34], [0.0, 0.07, 0.0], 10), far: 4, update: (k, tt) => turn(tt) };
}

// ── 04 / 14 · the market ────────────────────────────────────────────────────────────────────────
function marketSet(s, { seed = 1, today = false } = {}) {
  sky(s, [[0, '#7fb0e8'], [0.45, '#c9def0'], [0.5, '#e8dccb'], [1, '#e8dccb']]);
  s.background = new THREE.Color('#9cc0e8');
  s.add(plane(60, 40, '#6a6670', [0, 0, -5]));
  // the stall: a table under a striped awning, a bar of shirts
  s.add(boxMesh(2.2, 0.8, 0.9, '#e8e2d6', [0, 0, -1.0]));
  s.add(boxMesh(2.3, 0.04, 0.95, '#d9cfb8', [0, 0.8, -1.0]));
  for (const x of [-1.15, 1.15]) s.add(boxMesh(0.06, 2.6, 0.06, '#5a5a62', [x, 0, -1.5]));
  s.add(boxMesh(2.4, 0.05, 0.05, '#5a5a62', [0, 2.15, -1.5]));
  const aw = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.7), new THREE.MeshStandardMaterial({ map: tex(256, 128, (ctx, w, h) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? '#efe9dc' : '#c92a22';
      ctx.fillRect((i * w) / 8, 0, w / 8, h);
    }
  }), side: THREE.DoubleSide, roughness: 0.9 }));
  aw.position.set(0, 2.7, -1.0);
  aw.rotation.x = -Math.PI / 2 + 0.35;
  aw.castShadow = true;
  aw.userData.id = nextId();
  s.add(aw);
  const shirts = today
    ? [['#f2efe8', '#c92a22', '10', '#c92a22'], ['#1f3a8a', '#efe9dc', '9', '#efe9dc'], ['#e6c42a', '#2f7a3a', '10', '#1f3a8a'], ['#141216', '#c92a22', '7', '#efe9dc'], ['#7fb0e8', '#efe9dc', '90', '#141216']]
    : [['#e6c42a', '#2f7a3a', '10', '#1f3a8a'], ['#f2efe8', '#141216', '90', '#141216'], ['#1f3a8a', '#141216', '9', '#efe9dc'], ['#c92a22', '#141216', '7', '#efe9dc'], ['#2f7a3a', '#efe9dc', '11', '#efe9dc']];
  shirts.forEach(([a, b, n, ink], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.62), new THREE.MeshStandardMaterial({ map: tex(256, 320, (ctx, w, h) => jersey(ctx, w, h, a, b, n, ink)), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.9 }));
    m.position.set(-0.92 + i * 0.46, 1.8, -1.48 + (i % 2) * 0.03);
    m.rotation.y = Math.sin(i * 1.7) * 0.15;
    m.castShadow = true;
    m.userData.id = nextId();
    s.add(m);
  });
  for (let i = 0; i < 6; i++) s.add(boxMesh(0.3, 0.06, 0.25, ['#e6c42a', '#f2efe8', '#1f3a8a', '#c92a22', '#2f7a3a', '#7fb0e8'][i], [-0.85 + i * 0.32, 0.82, -1.15 + (i % 2) * 0.12]));
  // other stalls behind, fruit, the block of flats over it all
  const R = rng(seed);
  for (let i = 0; i < 5; i++) {
    const x = -7 + i * 3.4 + R() * 0.5, z = -5.5 - R() * 1.5;
    s.add(boxMesh(2.2, 0.8, 0.9, '#d9cfb8', [x, 0, z]));
    const a = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshStandardMaterial({ map: tex(128, 64, (ctx, w, h) => {
      const c = ['#2f7a3a', '#1f3a8a', '#e6c42a', '#c92a22', '#6a3a8a'][i];
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = k % 2 ? '#efe9dc' : c;
        ctx.fillRect((k * w) / 6, 0, w / 6, h);
      }
    }), side: THREE.DoubleSide }));
    a.position.set(x, 2.5, z);
    a.rotation.x = -Math.PI / 2 + 0.3;
    a.userData.id = nextId();
    s.add(a);
    for (let k = 0; k < 7; k++) s.add(mesh(new THREE.SphereGeometry(0.09, 10, 8), ['#f08a1e', '#d42a22', '#e6c42a'][i % 3], [x - 0.8 + k * 0.25, 0.88, z + 0.1]));
  }
  const f = facade(26, 18, '#d9b08a', { seed: seed + 3, lit: 0.1, floors: 7, cols: 12 });
  f.position.set(0, 0, -16);
  s.add(f);
  lights(s, {
    hemi: ['#dfe8ff', '#8a7a6a', 1.3],
    sun: { color: '#fff0d6', int: 2.0, pos: [6, 12, 8], target: [0, 0, -2], area: 10 },
  });
}

async function s04() {
  const s = new THREE.Scene();
  marketSet(s);
  // Saimon counting the coins on the table, Bebo beside him; the seller behind the stall
  const saimon = await kid('saimon', 'stand', { pos: [-0.15, 0, -0.32], rotY: 172, decal: false, aim: { LeftArm: [0.25, -0.6, 0.75], LeftForeArm: [-0.2, -0.3, 1], RightArm: [-0.25, -0.6, 0.75], RightForeArm: [0.2, -0.3, 1], Neck: [0, 1, 0.3], Head: [0, 0.8, 0.6] } });
  const bebo = await kid('bebo', 'stand', { pos: [0.7, 0, -0.2], rotY: -35, expr: 'neutral', aim: { ...POCKETS, Head: [0.3, 1, 0.2] } });
  const seller = await grown('rocco', 'stand', { pos: [0.1, 0, -1.85], rotY: 0, expr: 'smile', aim: { ...OPEN, Head: [0, 1, 0.2] } });
  s.add(saimon, bebo, seller);
  const s0 = saimon.baseAims;
  const update04 = (k, t) => {
    pose(saimon, { RightForeArm: [0.2 + 0.12 * Math.sin(t * 5), -0.3, 1], LeftForeArm: [-0.2, -0.3 + 0.05 * Math.sin(t * 2.5), 1] });
    pose(bebo, { Head: [0.3 * Math.cos(t * 0.4), 1, 0.2] });
  };
  for (let i = 0; i < 7; i++) s.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 14), '#d8b84a', [-0.32 + (i % 4) * 0.035, 0.825, -0.62 + Math.floor(i / 4) * 0.03]));
  return { scene: s, camera: cam(50, [-1.5, 1.75, 1.05], [0.15, 1.1, -1.0]), far: 60, update: update04 };
}

async function s14() {
  const s = new THREE.Scene();
  marketSet(s, { seed: 4, today: true });
  const saimon = await grown('saimon', 'stand', { pos: [0.0, 0, -1.85], rotY: 0, hair: undefined, expr: 'smile', aim: { ...OPEN, Head: [0.05, 1, 0.2] } });
  const bebo = await grown('bebo', 'stand', { pos: [1.05, 0, 0.15], rotY: 215, expr: 'smile', aim: { ...POCKETS, Head: [-0.1, 1, 0.25] } });
  s.add(saimon, bebo);
  const sO = saimon.baseAims;
  const update = (k, t) => pose(saimon, mixAims({ ...sO, ...POCKETS }, sO, ramp(t, 0.4, 1.2)));
  return { scene: s, camera: cam(50, [0.9, 1.55, 1.9], [-0.15, 1.35, -1.7]), far: 60, update };
}

// ── 05 / 11 · the garages of block C ────────────────────────────────────────────────────────────
function garageSet(s, { winter = false } = {}) {
  const wall = winter ? '#a99a80' : '#cfae7a';
  sky(s, winter ? [[0, '#8a96a8'], [0.5, '#c9ccd2'], [1, '#c9ccd2']] : [[0, '#e8a060'], [0.45, '#f4c890'], [0.5, '#e8cfa8'], [1, '#e8cfa8']]);
  s.background = new THREE.Color(winter ? '#9aa4b4' : '#efb070');
  s.add(plane(40, 30, winter ? '#5a5c64' : '#6a6068', [0, 0, 0]));
  const f = facade(16, 18, wall, { seed: 11, lit: winter ? 0.15 : 0.05, floors: 6, cols: 8 });
  f.position.set(0, 3.0, -3.5);
  s.add(f);
  s.add(boxMesh(16, 3.0, 1, wall, [0, 0, -3.5]));
  // the row of garage doors, one open
  for (let i = 0; i < 4; i++) {
    const x = -4.5 + i * 3;
    const open = i === 2 && !winter;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(2.3, open ? 0.6 : 2.2), new THREE.MeshStandardMaterial({ map: shutterTex(['#7a8a7a', '#8a6a5a', '#6a7a8a', '#7a8a7a'][i]), roughness: 0.8 }));
    door.position.set(x, open ? 1.95 : 1.1, -2.99);
    door.userData.id = nextId();
    s.add(door);
    if (open) {
      const dark = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.6), clay('#1c1820'));
      dark.position.set(x, 0.8, -2.995);
      dark.userData.id = nextId();
      s.add(dark);
      s.add(boxMesh(0.5, 0.3, 0.3, '#9ea3ab', [x + 0.4, 0.9, -2.9]));
    }
  }
  // the moped and the chair
  const chair = plasticChair();
  chair.position.set(-0.6, 0, -1.6);
  chair.rotation.y = D(25);
  s.add(chair);
  const sc = scooter('#c92a22', winter);
  sc.position.set(-2.4, 0, -2.0);
  sc.rotation.y = D(15);
  s.add(sc);
  if (winter) {
    const R = rng(5);
    for (let i = 0; i < 40; i++) s.add(mesh(new THREE.PlaneGeometry(0.06, 0.04), ['#8a5a2a', '#6a4a2a', '#a8782a'][i % 3], [-3 + R() * 6, 0.006, -2.5 + R() * 3.5], [-90, 0, R() * 180]));
    lights(s, { hemi: ['#c9d4e8', '#5a5c64', 1.3], sun: { color: '#dfe6f0', int: 0.9, pos: [-5, 10, 6], target: [0, 0, -2], area: 8 } });
  } else {
    lights(s, { hemi: ['#ffe0b0', '#6a5060', 1.0], sun: { color: '#ffc890', int: 2.4, pos: [-8, 5, 6], target: [0, 0, -2], area: 8 } });
  }
  return { chair };
}

async function s05() {
  const s = new THREE.Scene();
  garageSet(s);
  // Rocco in his chair, holding out the tape; Tyson standing by him; Bebo reaching for it
  const rocco = await grown('rocco', 'sitChair', { pos: [-0.62, 0, -1.55], rotY: 25, expr: 'neutral', aim: {
    RightArm: [-0.25, -0.1, 1], RightForeArm: [-0.15, 0.05, 1], RightHand: [0, 0, 1],
    LeftArm: [0.3, -0.9, 0.25], LeftForeArm: [0.1, -0.2, 1], ...KNEES, Spine: [0, 1, -0.05], Head: [0.05, 1, 0.15],
  } });
  inHand(rocco, 'Right', cassette('ROCCO MIX 96', 1.4), [0, 0.1, 0.03]);
  const tyson = await kid('tyson', 'stand', { pos: [-1.55, 0, -1.75], rotY: 35, dogYaw: -0.7, aim: { ...POCKETS } });
  const bebo = await kid('bebo', 'stand', { pos: [0.75, 0, -0.65], rotY: -125, aim: { RightArm: [-0.2, -0.3, 1], RightForeArm: [-0.1, 0, 1], LeftArm: [0.2, -1, 0], Head: [0, 1, 0.2] } });
  s.add(rocco, tyson, bebo);
  const rOut = rocco.baseAims, bOut = bebo.baseAims;
  const rRest = { ...rOut, RightArm: [-0.3, -0.9, 0.3], RightForeArm: [-0.1, -0.2, 1] };
  const bRest = { ...bOut, RightArm: [-0.2, -1, 0], RightForeArm: [-0.1, -0.6, 0.4] };
  const update = (k, t) => {
    pose(rocco, mixAims(rRest, rOut, ramp(t, 0.6, 1.6)));
    pose(bebo, mixAims(bRest, bOut, ramp(t, 2.2, 3.2)));
    pose(tyson, { Head: [0.25 * Math.sin(t * 0.5), 1, 0.2] });
  };
  return { scene: s, camera: cam(50, [1.05, 0.95, 1.55], [-0.75, 0.95, -1.55]), far: 80, update };
}

async function s11() {
  const s = new THREE.Scene();
  garageSet(s, { winter: true });
  // Tyson on the ground by the empty chair, his head down
  const tyson = await kid('tyson', 'sitFloor', { pos: [-1.15, 0, -1.55], rotY: 30, dogYaw: -0.3, aim: {
    Spine: [0, 1, 0.25], Spine1: [0, 1, 0.3], Neck: [0, 0.7, 0.7], Head: [0, 0.2, 1],
    LeftUpLeg: [0.15, 0.5, 1], LeftLeg: [0.05, -1, 0.3], RightUpLeg: [-0.15, 0.5, 1], RightLeg: [-0.05, -1, 0.3],
    LeftArm: [0.2, -0.6, 0.7], LeftForeArm: [-0.2, -0.2, 1], RightArm: [-0.2, -0.6, 0.7], RightForeArm: [0.2, -0.2, 1],
  } });
  s.add(tyson);
  let sheet = null;
  s.traverse((o) => o.isMesh && o.material?.color?.getHexString?.() === '7d8088' && (sheet = o));
  const update = (k, t) => {
    if (sheet) sheet.scale.set(1.45 + 0.04 * Math.sin(t * 3.1), 0.95 + 0.03 * Math.sin(t * 4.3 + 1), 0.6);
    pose(tyson, { Head: [0.05 * Math.sin(t * 0.7), 0.2, 1] });
  };
  return { scene: s, camera: cam(46, [1.3, 0.75, 2.4], [-0.7, 0.7, -1.5]), far: 80, update };
}

// ── 06 · the bedroom ────────────────────────────────────────────────────────────────────────────
async function s06() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#141030');
  s.add(plane(5, 5, '#3a2a40', [0, 0, 0]));
  s.add(plane(5, 3, '#2f3a8a', [0, 1.5, -1.6], 0));
  const lw = plane(5, 3, '#2a3070', [-1.6, 1.5, 0], 0);
  lw.rotation.y = Math.PI / 2;
  s.add(lw);
  // the window: the block across the road, its windows lit
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.0), new THREE.MeshBasicMaterial({ map: tex(180, 200, (ctx, w, h) => {
    ctx.fillStyle = '#141838';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2a2a50';
    ctx.fillRect(0, h * 0.3, w, h * 0.7);
    const R = rng(3);
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = R() < 0.4 ? '#ffcf7a' : '#3a3a60';
      ctx.fillRect((i % 6) * 30 + 6, h * 0.35 + Math.floor(i / 6) * 40, 16, 22);
    }
    ctx.fillStyle = '#e8e2d6';
    ctx.fillRect(w * 0.48, 0, w * 0.04, h);
    ctx.fillRect(0, h * 0.48, w, h * 0.04);
  }) }));
  win.position.set(0.7, 1.75, -1.59);
  win.userData.id = nextId();
  s.add(win);
  s.add(framed(0.5, 0.7, tex(260, 360, K.poster96), [-0.5, 2.35, -1.58], 0, '#e8e2d6'));
  s.add(framed(0.6, 0.45, tex(320, 240, (ctx, w, h) => {
    ctx.fillStyle = '#e6c42a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#141216';
    ctx.font = 'bold 70px Anton, Impact, sans-serif';
    ctx.fillText('RIME', 30, h * 0.6);
  }), [-1.58, 2.1, -0.6], 90, '#141216'));
  // the bed along the left wall, the blanket, the pillow
  s.add(boxMesh(0.95, 0.45, 2.0, '#6a4024', [-1.1, 0, -0.55]));
  s.add(boxMesh(0.95, 0.12, 2.0, '#c03a1c', [-1.1, 0.45, -0.55]));
  s.add(boxMesh(0.6, 0.14, 0.35, '#efe9dc', [-1.1, 0.57, -1.35]));
  // the bedside table and its lamp
  s.add(boxMesh(0.4, 0.55, 0.4, '#5a3a24', [-0.35, 0, -1.3]));
  s.add(mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.18, 14), '#f0c060', [-0.35, 0.72, -1.3]));
  s.add(boxMesh(0.03, 0.12, 0.03, '#2a2a2a', [-0.35, 0.55, -1.3]));
  // Bebo against the wall, the headphones, the diary on his knees
  const bebo = await kid('bebo', 'sitFloor', { pos: [-1.12, 0.55, -1.0], rotY: 0, expr: 'focus', aim: {
    Spine: [0, 1, -0.2], Spine1: [0, 1, -0.1], Neck: [0, 1, 0.3], Head: [0.05, 0.75, 0.65],
    LeftUpLeg: [0.12, 0.35, 1], LeftLeg: [0.05, -0.8, 0.6], RightUpLeg: [-0.1, 0.3, 1], RightLeg: [-0.05, -0.8, 0.6],
    LeftArm: [0.3, -0.6, 0.6], LeftForeArm: [-0.25, 0.1, 1], RightArm: [-0.3, -0.6, 0.6], RightForeArm: [0.25, 0.2, 1],
  } });
  s.add(bebo);
  bebo.updateMatrixWorld(true);
  const head = bebo.bones.Head;
  const ws = head.getWorldScale(new THREE.Vector3()).x;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 24, Math.PI), clay('#1a1a1e'));
  band.scale.setScalar(1 / ws);
  band.position.set(0, 0.1 / ws, 0);
  head.add(band);
  for (const sx of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 14), clay('#c92a22'));
    cup.rotation.z = Math.PI / 2;
    cup.scale.setScalar(1 / ws);
    cup.position.set((sx * 0.105) / ws, 0.06 / ws, 0);
    head.add(cup);
  }
  const diary = new THREE.Group();
  diary.add(boxMesh(0.36, 0.015, 0.26, '#efe9dc', [0, 0, 0]));
  diary.add(mesh(new THREE.PlaneGeometry(0.34, 0.24), null, [0, 0.017, 0], [-90, 0, 0], { map: tex(340, 240, (ctx, w, h) => {
    ctx.fillStyle = '#f4efe2';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#9ab0d8';
    for (let y = 20; y < h; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#1f3a8a';
    ctx.font = '15px "Permanent Marker", cursive';
    ['siamo quelli del palazzo C', 'quelli che non dormono mai', 'copia di una copia'].forEach((l, i) => ctx.fillText(l, 16, 34 + i * 18));
  }) }));
  diary.position.set(-1.08, 0.86, -0.55);
  diary.rotation.set(0.5, 0, 0);
  diary.userData.id = nextId();
  s.add(diary);
  const update06 = (k, t) => pose(bebo, { Head: [0.05, 0.75 - nod(t, 0.18), 0.65 + nod(t, 0.2)], RightForeArm: [0.25 + 0.06 * Math.sin(t * 7), 0.2, 1] });
  lights(s, {
    hemi: ['#5a5ab0', '#1a1020', 0.8],
    points: [{ color: '#ffb060', int: 3.2, dist: 4, decay: 1.6, pos: [-0.35, 0.95, -1.15], shadow: true }],
  });
  const moon = new THREE.DirectionalLight('#7a8adf', 0.6);
  moon.position.set(1, 2, -3);
  s.add(moon);
  return { scene: s, camera: cam(50, [0.15, 1.4, 0.75], [-1.0, 0.85, -0.85]), far: 30, update: update06 };
}

// ── 07 · the stairs ─────────────────────────────────────────────────────────────────────────────
async function s07() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#141418');
  // a flight going up away from us, a landing, the door above
  const steps = 12, rise = 0.17, run = 0.3, width = 1.4;
  for (let i = 0; i < steps; i++) s.add(boxMesh(width, rise * (i + 1), run, '#b8a890', [0, 0, -i * run]));
  const top = rise * steps;
  s.add(boxMesh(width + 1.6, top, 1.6, '#b8a890', [0.8, 0, -steps * run - 0.8]));
  s.add(plane(6, 6, '#8a7a6a', [0, 0, 1]));
  // walls: green below, cream above
  for (const [x, ry] of [[-width / 2 - 0.01, Math.PI / 2], [width / 2 + 1.6, -Math.PI / 2]]) {
    const lo = plane(10, 1.3, '#3f6a5a', [x, 0.65 + 0.9, -2], 0);
    lo.rotation.y = ry;
    s.add(lo);
    const hi = plane(10, 3, '#d8cfb4', [x, 1.3 + 1.5 + 0.9, -2], 0);
    hi.rotation.y = ry;
    s.add(hi);
  }
  s.add(plane(4, 6, '#d8cfb4', [0.8, 3, -steps * run - 1.6], 0));
  // the iron railing up the right side of the flight
  for (let i = 0; i < steps; i += 2) s.add(boxMesh(0.03, 0.9, 0.03, '#1a1a1e', [width / 2 - 0.05, rise * (i + 1), -i * run]));
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, Math.hypot(steps * run, steps * rise) + 0.4, 8), clay('#1a1a1e'));
  rail.position.set(width / 2 - 0.05, (rise * steps) / 2 + 0.95, (-steps * run) / 2);
  rail.rotation.x = Math.atan2(steps * run, steps * rise);
  rail.userData.id = nextId();
  s.add(rail);
  // the door on the landing, ajar: a blade of light
  const doorZ = -steps * run - 1.58;
  s.add(boxMesh(0.95, 2.1, 0.06, '#7a4a24', [0.3, top, doorZ + 0.04]));
  const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.0), new THREE.MeshBasicMaterial({ color: '#fff0c0' }));
  slit.geometry.translate(0.06, 0, 0);
  slit.position.set(0.8, top + 1.0, doorZ + 0.08);
  slit.userData.id = nextId();
  s.add(slit);
  const spot = new THREE.SpotLight('#ffe0a0', 30, 12, 0.35, 0.6, 1.2);
  spot.position.set(0.86, top + 1.2, doorZ + 0.3);
  spot.target.position.set(0.2, 0.5, -1.0);
  spot.castShadow = true;
  s.add(spot, spot.target);
  // the three on the steps: Bebo rapping, Saimon on the railing, Tyson sitting keeping time
  const bebo = await kid('bebo', 'stand', { pos: [-0.35, rise * 3, -2 * run - 0.05], rotY: 170, expr: 'shout', aim: { RightArm: [-0.5, 0.25, 0.8], RightForeArm: [0.05, 0.7, 0.75], LeftArm: [0.25, -0.9, 0.2], Head: [0, 1, 0.1] } }, 99);
  const saimon = await kid('saimon', 'stand', { pos: [0.5, rise * 1, -0.05], rotY: 125, expr: 'smile', aim: { LeftArm: [0.7, -0.2, 0.5], LeftForeArm: [0.2, 0.3, 1], RightArm: [-0.3, -0.5, 0.8], RightForeArm: [0.4, 0.3, 0.9] } }, 99);
  const tyson = await kid('tyson', 'sitChair', { pos: [0.1, rise * 6, -5 * run - 0.05], rotY: 180, dogYaw: 0.4, aim: { ...KNEES, ...PAD } }, 99);
  s.add(bebo, saimon, tyson);
  lights(s, {
    hemi: ['#9ab0c8', '#2a2a30', 0.7],
    points: [{ color: '#d8f0e0', int: 3, dist: 6, decay: 1.6, pos: [0.3, 3.2, 0.8] }],
  });
  const bA = bebo.baseAims;
  const update = (k, t) => {
    const open = ramp(t, 4.2, 4.7);
    slit.scale.x = 1 + open * 4;
    spot.intensity = 30 + open * 70;
    const quiet = 1 - ramp(t, 4.4, 5.0);
    pose(bebo, { RightForeArm: [0.05 + 0.25 * Math.sin(t / BEAT * Math.PI) * quiet, 0.7, 0.75], Head: [0, 1, 0.1 + nod(t, 0.25) * quiet - 0.3 * (1 - quiet)] });
    pose(saimon, { LeftForeArm: [0.2, 0.3 - nod(t, 0.6) * quiet, 1], Head: [0, 1, 0.1 - 0.3 * (1 - quiet)] });
    pose(tyson, { Neck: [0, 1, 0.1 + nod(t, 0.35) * quiet] });
  };
  return { scene: s, camera: cam(58, [-0.25, 0.85, 2.3], [0.05, 1.55, -2.0]), far: 30, update };
}

// ── 08 · the cardboard ──────────────────────────────────────────────────────────────────────────
async function s08() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#0e0c1e');
  sky(s, [[0, '#0a0a1e'], [0.5, '#1e1a40'], [1, '#2a1e3a']]);
  s.add(plane(40, 30, '#3a3440', [0, 0, 0]));
  // the supermarket front: a shutter, the sign
  s.add(boxMesh(14, 4, 1, '#cfc6b4', [0, 0, -4]));
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.6), new THREE.MeshStandardMaterial({ map: shutterTex('#8a8f98'), roughness: 0.8 }));
  sh.position.set(-1, 1.3, -3.49);
  sh.userData.id = nextId();
  s.add(sh);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.8), new THREE.MeshStandardMaterial({ map: tex(600, 80, (ctx, w, h) => {
    ctx.fillStyle = '#c92a22';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#efe9dc';
    ctx.font = 'bold 60px Anton, Impact, sans-serif';
    ctx.fillText('SUPERMERCATO', 90, 62);
  }), emissive: new THREE.Color('#ff4030'), emissiveIntensity: 0.25 }));
  sign.position.set(-1, 3.2, -3.49);
  sign.userData.id = nextId();
  s.add(sign);
  // cardboard, the stereo, the three: Saimon spinning on his back, Tyson with the stereo up, Bebo clapping
  s.add(boxMesh(1.4, 0.012, 1.0, '#c99c40', [0, 0, -0.8]));
  const saimon = await kid('saimon', 'sitFloor', { pos: [0.05, 0.12, -0.75], rotY: 90, expr: 'smile', decal: false, aim: {
    Spine: [0, 1, -0.6], LeftUpLeg: [0.6, 0.6, 0.6], LeftLeg: [0.5, 0.7, 0.3], RightUpLeg: [-0.5, 0.75, 0.5], RightLeg: [-0.4, 0.8, 0.2],
    LeftArm: [1, -0.3, -0.2], RightArm: [-1, -0.3, -0.2],
  } }, 99);
  saimon.rotation.z = 1.25;
  const spin = new THREE.Group();
  spin.position.set(0.05, 0, -0.75);
  saimon.position.sub(spin.position);
  spin.add(saimon);
  const tyson = await kid('tyson', 'stand', { pos: [-1.3, 0, -1.4], rotY: 30, dogYaw: -0.5, aim: { LeftArm: [0.45, 0.7, 0.05], LeftForeArm: [-0.55, 0.8, -0.1], RightArm: [-0.2, -1, 0.05] } }, 99);
  tyson.updateMatrixWorld(true);
  const bb = new THREE.Group();
  bb.add(boxMesh(0.5, 0.25, 0.16, '#9ea3ab', [0, 0, 0]));
  bb.add(mesh(new THREE.PlaneGeometry(0.48, 0.23), null, [0, 0.125, 0.081], [0, 0, 0], { map: tex(400, 190, K.boomboxFront) }));
  bb.userData.id = nextId();
  bb.position.copy(tyson.bones.LeftHand.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0.12, -0.02, 0));
  bb.rotation.y = D(30);
  s.add(bb);
  const bebo = await kid('bebo', 'stand', { pos: [1.15, 0, -1.1], rotY: -40, expr: 'smile', aim: { ...CLAP } }, 99);
  s.add(spin, tyson, bebo);
  const update08 = (k, t) => {
    spin.rotation.y = t * 3.2;
    pose(bebo, { LeftForeArm: [-0.55, 0.45, 0.7 - nod(t, 0.5)], RightForeArm: [0.55, 0.45, 0.7 - nod(t, 0.5)] });
    pose(tyson, { Neck: [0, 1, 0.1 + nod(t, 0.3)] });
  };
  // further off, on a bench under the lamp: Rocco, hood up
  s.add(boxMesh(1.6, 0.45, 0.45, '#5a4a3a', [3.0, 0, -2.6]));
  s.add(boxMesh(1.6, 0.5, 0.08, '#5a4a3a', [3.0, 0.45, -2.82]));
  const rocco = await grown('rocco', 'sitChair', { pos: [2.8, 0, -2.45], rotY: -25, face: false, aim: {
    Spine: [0, 1, 0.35], Spine1: [0, 1, 0.3], Neck: [0, 0.8, 0.6], Head: [0, 0.6, 0.8], ...KNEES,
    LeftArm: [0.2, -0.8, 0.5], LeftForeArm: [-0.3, -0.2, 1], RightArm: [-0.2, -0.8, 0.5], RightForeArm: [0.3, -0.2, 1],
  } });
  K.hood(rocco, '#1f3a8a');
  s.add(rocco);
  lamp(s, [2.4, 0, -3.3], '#ffa850', 10);
  lights(s, { hemi: ['#5a5aa0', '#1a1420', 0.9], points: [{ color: '#ff8a60', int: 4, dist: 8, pos: [-1, 3.0, -2.5] }, { color: '#9ab0ff', int: 3, dist: 7, pos: [0.5, 2.2, 1.5] }] });
  return { scene: s, camera: cam(56, [0.7, 1.45, 3.2], [0.8, 0.8, -1.6]), far: 80, update: update08 };
}

// ── 09 · under the overpass ─────────────────────────────────────────────────────────────────────
function graffiti(ctx, w, h) {
  ctx.fillStyle = '#9a968e';
  ctx.fillRect(0, 0, w, h);
  const R = rng(9);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(60,55,50,${0.1 + R() * 0.15})`;
    ctx.fillRect(R() * w, R() * h, 40 + R() * 120, 6 + R() * 30);
  }
  const tag = (txt, x, y, size, fill, line, rot) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.font = `${size}px "Permanent Marker", cursive`;
    ctx.lineWidth = size * 0.12;
    ctx.strokeStyle = line;
    ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = fill;
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  };
  tag('BEBO', 60, 330, 210, '#e6c42a', '#141216', -0.06);
  tag('SAIMON', 640, 300, 180, '#f2efe8', '#c92a22', 0.04);
  tag('TYSON', 220, 520, 150, '#2c5fb8', '#efe9dc', 0.03);
  tag('PALAZZO C', 820, 520, 110, '#c92a22', '#141216', -0.03);
}

async function s09(opts = {}) {
  const t = opts.t ?? 6;
  const s = new THREE.Scene();
  sky(s, [[0, '#2a2060'], [0.35, '#8a4a8a'], [0.48, '#f08a50'], [0.52, '#5a4a5a'], [1, '#3a3440']]);
  s.background = new THREE.Color('#5a3a7a');
  s.add(plane(60, 40, '#4a4448', [0, 0, 0]));
  // the deck overhead, on its pillars; the wall under it, covered
  s.add(boxMesh(40, 1.0, 5, '#7a766e', [0, 4.6, -3.5]));
  for (const x of [-7, 7]) s.add(boxMesh(1.0, 4.6, 1.0, '#8a867e', [x, 0, -3.5]));
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.4), new THREE.MeshStandardMaterial({ map: tex(1400, 620, graffiti), roughness: 0.95 }));
  wall.position.set(0, 2.2, -4.5);
  wall.userData.id = nextId();
  s.add(wall);
  // a train going over: carriages with lit windows
  const train = new THREE.Group();
  const side = new THREE.MeshStandardMaterial({ map: tex(480, 130, (ctx, w, h) => {
    ctx.fillStyle = '#d8d4cc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c92a22';
    ctx.fillRect(0, h * 0.72, w, h * 0.12);
    for (let k = 0; k < 8; k++) {
      ctx.fillStyle = '#ffe6a0';
      ctx.fillRect(14 + k * 58, h * 0.22, 40, h * 0.34);
    }
  }), roughness: 0.8 });
  for (let i = 0; i < 4; i++) {
    const car = new THREE.Mesh(new THREE.BoxGeometry(9.6, 2.6, 2.8), [clay('#d8d4cc'), clay('#d8d4cc'), clay('#8a3a2a'), clay('#d8d4cc'), side, clay('#d8d4cc')]);
    car.position.set(i * 10, 0, 0);
    car.castShadow = true;
    train.add(car);
  }
  const go = (tt) => train.position.set(-30 + tt * 4.5, 6.4, -3.5);
  go(t);
  train.userData.id = nextId();
  s.add(train);
  // the three: Bebo spraying, Saimon watching, Tyson by the cans
  const bebo = await kid('bebo', 'stand', { pos: [-1.2, 0, -3.6], rotY: 160, aim: { RightArm: [-0.35, 0.85, 0.5], RightForeArm: [-0.1, 0.6, 0.8], LeftArm: [0.25, -0.9, 0.2], Head: [0, 1, -0.4] } }, 99);
  const can = new THREE.Group();
  can.add(new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.18, 12), clay('#e6c42a')));
  can.userData.id = nextId();
  inHand(bebo, 'Right', can, [0, 0.1, 0.02]);
  const saimon = await kid('saimon', 'stand', { pos: [1.0, 0, -2.6], rotY: 200, expr: 'smile', decal: false, aim: { ...POCKETS, Head: [0.2, 1, 0.1] } }, 99);
  const tyson = await kid('tyson', 'stand', { pos: [2.4, 0, -2.2], rotY: 220, dogYaw: 0.4, aim: { LeftArm: [0.3, -0.8, 0.4], LeftForeArm: [0, -0.2, 1] } }, 99);
  s.add(bebo, saimon, tyson);
  for (let i = 0; i < 5; i++) s.add(mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.18, 12), ['#c92a22', '#2c5fb8', '#efe9dc', '#2f7a3a', '#e6c42a'][i], [1.6 + i * 0.12, 0.09, -3.3 + (i % 2) * 0.1]));
  lights(s, {
    hemi: ['#c88ab8', '#3a3040', 1.0],
    sun: { color: '#ffa070', int: 1.6, pos: [12, 4, 6], target: [0, 1, -4], area: 10 },
  });
  const update = (k, tt) => {
    go(tt);
    pose(bebo, { RightArm: [-0.35 + 0.3 * Math.sin(tt * 1.3), 0.85, 0.5] });
  };
  return { scene: s, camera: cam(62, [0.4, 0.9, 6.4], [0.3, 3.4, -4.0]), far: 120, update };
}

// ── 10 · the balcony ────────────────────────────────────────────────────────────────────────────
async function s10(opts = {}) {
  const t = opts.t ?? 4;
  const s = new THREE.Scene();
  sky(s, [[0, '#3a2a80'], [0.3, '#c05a8a'], [0.47, '#f8a050'], [0.5, '#f8c070'], [1, '#6a5060']]);
  s.background = new THREE.Color('#c06a7a');
  s.add(plane(80, 60, '#5a5058', [0, 0, 0]));
  const f = facade(18, 21, '#d8a070', { seed: 21, lit: 0.35, floors: 7, cols: 7, balconies: [[3, 3], [1, 1], [2, 5], [4, 2], [5, 4]] });
  f.position.set(0, 0, -6);
  s.add(f);
  const f2 = facade(14, 24, '#c09070', { seed: 22, lit: 0.3, floors: 8, cols: 5 });
  f2.position.set(-17, 0, -12);
  f2.rotation.y = D(25);
  s.add(f2);
  // the mother on the fourth floor, leaning out, hands round her mouth
  const fh = 21 / 7, fw = 18 / 7;
  const mum = await woman('stand', { pos: [-9 + 3.5 * fw, 21 - 4 * fh + fh * 0.15 + 0.08, -5.4], rotY: 0, expr: 'shout', aim: {
    RightArm: [-0.35, -0.15, 0.7], RightForeArm: [0.55, 0.75, 0.3], LeftArm: [0.35, -0.15, 0.7], LeftForeArm: [-0.55, 0.75, 0.3], Spine: [0, 1, 0.2],
  } });
  s.add(mum);
  // below, the boys scatter: running off in three directions
  const bebo = await kid('bebo', 'run', { pos: [-1.0 + t * 0.6, 0, -1.0 - t * 0.15], rotY: 70, t: 0.2 + t * 0.9 }, 99);
  const saimon = await kid('saimon', 'run', { pos: [1.5 - t * 0.9, 0, 0.5], rotY: -110, decal: false, t: 0.5 + t * 0.9 }, 99);
  const tyson = await kid('tyson', 'run', { pos: [3.0 + t * 0.4, 0, -1.5 + t * 0.6], rotY: 40, t: 0.8 + t * 0.9 }, 99);
  s.add(bebo, saimon, tyson);
  const update10 = (k, tt) => {
    bebo.position.set(-1.0 + tt * 0.9, 0, -1.0 - tt * 0.25);
    saimon.position.set(1.5 - tt * 1.2, 0, 0.5);
    tyson.position.set(3.0 + tt * 0.6, 0, -1.5 + tt * 0.8);
  };
  update10(t);
  lights(s, {
    hemi: ['#f0b0c0', '#4a3040', 1.1],
    sun: { color: '#ffb070', int: 2.0, pos: [-20, 8, 14], target: [0, 4, -6], area: 16 },
  });
  return { scene: s, camera: cam(64, [1.5, 1.3, 10.5], [0.0, 7.0, -5.0]), far: 200, update: (k, tt) => update10(tt) };
}

// ── 13 · the gallery ────────────────────────────────────────────────────────────────────────────
async function s13() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#e9e7e2');
  s.add(plane(14, 12, '#bcb8b0', [0, 0, 0]));
  s.add(plane(14, 5, '#efede8', [0, 2.5, -4], 0));
  for (const [x, ry] of [[-5, Math.PI / 2], [5, -Math.PI / 2]]) {
    const w = plane(12, 5, '#e9e7e2', [x, 2.5, 0], 0);
    w.rotation.y = ry;
    s.add(w);
  }
  s.add(plane(14, 12, '#f4f2ee', [0, 5, 0], Math.PI / 2));
  // the painting: the living room of panel 02, as painted, framed in white
  const pic = await new THREE.TextureLoader().loadAsync('/bassa-fedelta/out/board/02.jpg').catch(() => null);
  if (pic) pic.colorSpace = THREE.SRGBColorSpace;
  const pw = 3.2, ph = 2.4;
  s.add(boxMesh(pw + 0.16, ph + 0.16, 0.06, '#f4f2ee', [0, 2.2 - (ph + 0.16) / 2, -3.96]));
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: pic, color: pic ? '#ffffff' : '#5c43b0' }));
  canvas.position.set(0, 2.2, -3.92);
  canvas.userData.id = nextId();
  s.add(canvas);
  // the guests, grey, glasses in hand; the gallerist talking
  const glass = () => {
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.07, 12), clay('#9a3040'));
    bowl.position.y = 0.08;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 6), clay('#dcdcdc'));
    stem.position.y = 0.02;
    g.add(bowl, stem);
    g.userData.id = nextId();
    return g;
  };
  const spots = [[-1.6, -1.6, 15], [-0.7, -2.1, -5], [0.9, -1.9, 10], [1.7, -1.3, -25], [-2.4, -0.6, 35], [2.6, -0.4, -40]];
  for (const [i, [x, z, ry]] of spots.entries()) {
    const g = await guest('stand', { pos: [x, 0, z], rotY: 180 + ry, face: false, aim: { ...GLASS, Head: [0, 1, -0.1] }, t: 1 + i * 0.7 });
    inHand(g, 'Right', glass(), [0, 0.08, 0.03]);
    s.add(g);
  }
  const gal = await guest('stand', { pos: [1.9, 0, -2.6], rotY: -120, expr: 'smile', aim: { ...GLASS, LeftArm: [0.6, -0.1, 0.6], LeftForeArm: [0.1, 0.5, 0.8], Head: [-0.2, 1, 0.2] } });
  inHand(gal, 'Right', glass(), [0, 0.08, 0.03]);
  s.add(gal);
  // Bebo at the back, his old tracksuit top, hands in his pockets
  const bebo = await grown('bebo', 'stand', { pos: [-2.7, 0, 0.9], rotY: 160, expr: 'neutral', aim: { ...POCKETS, Head: [0.15, 1, 0.05] } });
  s.add(bebo);
  lights(s, {
    hemi: ['#ffffff', '#c8c4bc', 1.6],
    sun: { color: '#ffffff', int: 1.1, pos: [2, 8, 6], target: [0, 0, -2], area: 8 },
    points: [{ color: '#fff4e0', int: 6, dist: 6, pos: [0, 4.6, -2.2] }],
  });
  const update = (k, t) => pose(gal, { LeftForeArm: [0.1 + 0.25 * Math.sin(t * 2.2), 0.5, 0.8] });
  return { scene: s, camera: cam(56, [-1.2, 1.6, 4.8], [-0.2, 1.6, -3.2]), far: 40, update };
}

// ── 15 · the car at the port ────────────────────────────────────────────────────────────────────
async function s15() {
  const s = new THREE.Scene();
  sky(s, [[0, '#0a0a20'], [0.45, '#1e1a48'], [0.5, '#2a2050'], [1, '#14121c']]);
  s.background = new THREE.Color('#14122a');
  s.add(plane(120, 80, '#2a2630', [0, 0, -10]));
  // the port behind: cranes, containers, the water
  for (const [x, z] of [[-14, -40], [6, -46], [26, -42]]) s.add(crane(x, z));
  for (let i = 0; i < 10; i++) s.add(boxMesh(6, 2.6, 2.4, ['#8a2a22', '#2a4a8a', '#3a6a3a', '#c98a2a'][i % 4], [-28 + i * 6.2, (i % 3) * 2.6, -30]));
  s.add(plane(200, 40, '#14183a', [0, 0.02, -60]));
  // the car: an old boxy hatchback, seen from the bonnet through its windscreen (no glass)
  const car = new THREE.Group();
  const body = '#b8b0a0';
  car.add(boxMesh(1.7, 0.55, 3.6, body, [0, 0.25, 0]));
  car.add(boxMesh(1.7, 0.06, 1.6, body, [0, 1.42, -0.2]));
  for (const x of [-0.8, 0.8]) {
    car.add(boxMesh(0.08, 0.62, 0.08, body, [x, 0.8, 0.62]));
    car.add(boxMesh(0.08, 0.62, 0.08, body, [x, 0.8, -1.0]));
    car.add(boxMesh(0.08, 0.55, 1.6, body, [x * 1.04, 0.8, -0.2]));
  }
  car.add(boxMesh(1.6, 0.25, 0.4, '#2a2628', [0, 0.8, 0.45]));
  car.add(boxMesh(0.24, 0.12, 0.05, '#141416', [0.1, 0.95, 0.3]));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.035), new THREE.MeshBasicMaterial({ color: '#7aff9a' }));
  glow.position.set(0.1, 0.96, 0.275);
  glow.rotation.y = Math.PI;
  glow.userData.id = nextId();
  car.add(glow);
  for (const x of [-0.42, 0.42]) {
    car.add(boxMesh(0.55, 0.12, 0.55, '#3a3438', [x, 0.42, -0.45]));
    car.add(boxMesh(0.55, 0.65, 0.12, '#3a3438', [x, 0.5, -0.75]));
  }
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 8, 24), clay('#141416'));
  wheel.position.set(-0.42, 0.98, 0.2);
  wheel.rotation.x = 0.4;
  car.add(wheel);
  // the mirror, and Tyson's bandana hanging from it; the Bic on the dashboard
  car.add(boxMesh(0.24, 0.07, 0.04, '#141416', [0, 1.3, 0.5]));
  const bandana = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 3), clay('#d42a22'));
  bandana.position.set(0.02, 1.16, 0.5);
  bandana.rotation.set(Math.PI, 0.3, 0.1);
  car.add(bandana);
  const pen = bic(1.2);
  pen.rotation.set(0, 0, Math.PI / 2 - 0.1);
  pen.position.set(0.45, 0.94, 0.5);
  car.add(pen);
  car.userData.id = nextId();
  car.traverse((m) => m.isMesh && (m.castShadow = m.receiveShadow = true));
  s.add(car);
  // the two of them in the front seats
  const saimon = await grown('saimon', 'sitChair', { pos: [-0.42, 0.06, -0.42], rotY: 0, expr: 'smile', aim: { ...KNEES, LeftArm: [0.25, -0.5, 0.8], LeftForeArm: [-0.1, 0.3, 1], RightArm: [-0.25, -0.5, 0.8], RightForeArm: [0.1, 0.3, 1], Head: [0.25, 1, 0.1] } });
  const bebo = await grown('bebo', 'sitChair', { pos: [0.42, 0.06, -0.42], rotY: 0, expr: 'neutral', aim: { ...KNEES, LeftArm: [0.1, -0.4, 0.9], LeftForeArm: [-0.35, 0.2, 1], RightArm: [-0.25, -0.9, 0.2], RightForeArm: [0.2, -0.2, 1], Head: [-0.15, 1, 0.05] } });
  const tape = inHand(bebo, 'Left', cassette('ROCCO MIX 96', 1.2), [0, 0.1, 0.03]);
  s.add(saimon, bebo);
  const bLap = bebo.baseAims;
  const bIn = { ...bLap, LeftArm: [-0.25, -0.2, 1], LeftForeArm: [-0.45, 0.1, 1] };
  lamp(s, [-2.6, 0, 1.8], '#ffa850', 14, 4.6);
  lights(s, { hemi: ['#4a4a9a', '#141018', 0.9], points: [{ color: '#7aff9a', int: 0.8, dist: 1.6, pos: [0.1, 1.05, 0.15] }, { color: '#ffb070', int: 1.2, dist: 2.5, pos: [0, 1.35, 0.3] }] });
  const update = (k, t) => {
    const reach = ramp(t, 1.0, 2.4) * (1 - ramp(t, 3.0, 4.0));
    tape.visible = t < 2.6;
    const beat = ramp(t, 5.0, 6.0);
    pose(bebo, { ...mixAims(bLap, bIn, reach), Head: [-0.15, 1 - nod(t, 0.2) * beat, 0.05 + nod(t, 0.3) * beat] });
    pose(saimon, { Head: [0.25 - 0.2 * ramp(t, 6.0, 7.0), 1 - nod(t, 0.2, 0.1) * beat, 0.1 + nod(t, 0.3, 0.1) * beat] });
    bandana.rotation.z = 0.1 + 0.08 * Math.sin(t * 1.7);
  };
  return { scene: s, camera: cam(46, [0.0, 1.38, 2.05], [0.0, 1.02, -0.4]), far: 200, update };
}

// ── 16 · the title ──────────────────────────────────────────────────────────────────────────────
async function s16() {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#2a1f4a');
  s.add(plane(4, 4, '#4a2a6a', [0, 0, 0]));
  const c = cassette('ROCCO MIX 96', 3);
  c.rotation.x = -Math.PI / 2;
  c.rotation.z = 0.12;
  c.position.set(0, 0.02, 0.28);
  s.add(c);
  const pen = bic(3);
  pen.rotation.set(Math.PI / 2, 0, 0.9);
  pen.position.set(0.36, 0.03, 0.44);
  s.add(pen);
  lights(s, { hemi: ['#c8b8ff', '#2a1a3a', 1.2], sun: { color: '#fff0e0', int: 1.4, pos: [1, 3, 2], target: [0, 0, 0], area: 2 } });
  return { scene: s, camera: cam(40, [0, 1.85, 0.6], [0, 0, -0.02]), far: 10 };
}

export const SCENES = { '01': s01, '02': s02, '03': s03, '04': s04, '05': s05, '06': s06, '07': s07, '08': s08, '09': s09, '10': s10, '11': s11, '12': s12, '13': s13, '14': s14, '15': s15, '16': s16 };
