import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { brushOver, canvas, rng, texture } from '../textures/util.js';
import { flat, signTexture } from '../objects/city.js';
import { drawHead } from '../textures/heads.js';

function checker(n = 8) {
  const [c, ctx] = canvas(1024);
  const s = 1024 / n;
  const r = rng(4);
  ctx.fillStyle = '#e2ddd0';
  ctx.fillRect(0, 0, 1024, 1024);
  brushOver(ctx, 0, 0, 1024, 1024, { n: 500, tone: [222, 218, 205], spread: 26, alpha: [0.2, 0.4], seed: 2 });
  // black squares painted by hand: wobbly edges, brushed fill
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if ((x + y) % 2 === 0) continue;
      const w = () => (r() - 0.5) * 6;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x * s + w(), y * s + w());
      ctx.lineTo((x + 1) * s + w(), y * s + w());
      ctx.lineTo((x + 1) * s + w(), (y + 1) * s + w());
      ctx.lineTo(x * s + w(), (y + 1) * s + w());
      ctx.closePath();
      ctx.fillStyle = '#1c1c1d';
      ctx.fill();
      ctx.clip();
      brushOver(ctx, x * s, y * s, s, s, { n: 14, len: [40, 120], wid: [8, 18], tone: [40, 40, 42], spread: 22, alpha: [0.2, 0.45], seed: x * 31 + y });
      ctx.restore();
    }
  }
  // scuffs
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(90,84,70,${r() * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(r() * 1024, r() * 1024, 4 + r() * 40, 2 + r() * 10, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

function plaster(tone = 150, seed = 6, W = 1024, H = 512) {
  const [c, ctx] = canvas(W, H);
  const r = rng(seed);
  ctx.fillStyle = `rgb(${tone},${tone + 2},${tone - 6})`;
  ctx.fillRect(0, 0, W, H);
  // painted wall: broad strokes in two directions, then a few drips
  brushOver(ctx, 0, 0, W, H, { n: 260, len: [80, 260], wid: [16, 40], tone: [tone, tone + 2, tone - 6], spread: 26, alpha: [0.18, 0.36], angle: 0, jitter: 0.5, seed });
  brushOver(ctx, 0, 0, W, H, { n: 120, len: [60, 200], wid: [10, 28], tone: [tone, tone + 2, tone - 6], spread: 30, alpha: [0.12, 0.25], angle: Math.PI / 2, jitter: 0.4, seed: seed + 9 });
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = 'rgba(30,28,22,0.08)';
    ctx.fillRect(r() * W, 0, 2 + r() * 6, H * (0.2 + r() * 0.8));
  }
  return c;
}

/** Wall from (x0,z0) to (x1,z1), facing the room centre side. */
function wall(map, x0, z0, x1, z1, h, y0 = 0) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide }));
  m.position.set((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2);
  m.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
  m.receiveShadow = true;
  return m;
}

function fluorescent(x, y, z, len = 1.6) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.22), flat(0xd8d8d2));
  const tube = new THREE.Mesh(
    new THREE.BoxGeometry(len - 0.1, 0.05, 0.12),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.75, 1.6), toneMapped: false }),
  );
  tube.position.y = -0.05;
  g.add(box, tube);
  g.position.set(x, y, z);
  return g;
}

function chairBarber() {
  const g = new THREE.Group();
  const chrome = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 1, roughness: 0.2 });
  const leather = flat(0x1e1d1d, { roughness: 0.45 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.08, 16), chrome);
  base.position.y = 0.04;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.42, 10), chrome);
  post.position.y = 0.28;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.6), leather);
  seat.position.y = 0.55;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.12), leather);
  back.position.set(0, 0.98, -0.28);
  back.rotation.x = -0.12;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.5), chrome);
  armL.position.set(0.34, 0.8, 0);
  const armR = armL.clone();
  armR.position.x = -0.34;
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.2), chrome);
  foot.position.set(0, 0.2, 0.42);
  g.add(base, post, seat, back, armL, armR, foot);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

function chairWaiting() {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0x8e9196, metalness: 0.8, roughness: 0.35 });
  const vinyl = flat(0x3a2622, { roughness: 0.5 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.48), vinyl);
  seat.position.y = 0.48;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), vinyl);
  back.position.set(0, 0.8, -0.24);
  g.add(seat, back);
  for (const [x, z] of [[0.22, 0.2], [-0.22, 0.2], [0.22, -0.22], [-0.22, -0.22]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.48, 5), frame);
    leg.position.set(x, 0.24, z);
    g.add(leg);
  }
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

function crtTV() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.5), flat(0x2a2a2b));
  const [c, ctx] = canvas(256, 192);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.34), new THREE.MeshBasicMaterial({ map: texture(c), toneMapped: false }));
  screen.position.z = 0.252;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.62, 0.5), flat(0x3b2e25));
  cab.position.y = -0.56;
  g.add(body, screen, cab);
  return { group: g, draw: (fn) => { fn(ctx, c); screen.material.map.needsUpdate = true; } };
}

function plant() {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.42, 8), flat(0x2b2b2d));
  pot.position.y = 0.21;
  g.add(pot);
  const leafMat = flat(0x2c3a28, { side: THREE.DoubleSide });
  const r = rng(8);
  for (let i = 0; i < 14; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.9, 3), leafMat);
    const a = (i / 14) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.12, 0.8 + r() * 0.3, Math.sin(a) * 0.12);
    leaf.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    g.add(leaf);
  }
  return g;
}

/** Poster with a grid of haircut heads, the barbershop classic. */
function haircutPoster() {
  const [c, ctx] = canvas(768, 1024);
  ctx.fillStyle = '#d9d4c4';
  ctx.fillRect(0, 0, 768, 1024);
  const hairs = ['crop', 'flattop', 'afro', 'crown', 'cap', 'crop', 'afro', 'flattop', 'crown'];
  hairs.forEach((hair, i) => {
    const x = (i % 3) * 248 + 14;
    const y = Math.floor(i / 3) * 330 + 40;
    ctx.fillStyle = '#c7c0ad';
    ctx.fillRect(x, y, 230, 300);
    const head = drawHead({ seed: 100 + i, hair, tone: 0.2 + (i % 3) * 0.15, lines: 0 });
    ctx.drawImage(head, x + 10, y + 10, 210, 262);
    ctx.fillStyle = '#2b2b2b';
    ctx.font = '600 22px "Oswald"';
    ctx.fillText(`N.${i + 1}`, x + 10, y + 292);
  });
  ctx.strokeStyle = '#2a2622';
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, 752, 1008);
  return texture(c);
}

function wallClock() {
  const [c, ctx] = canvas(256);
  const tex = texture(c);
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }));
  const draw = (hours, minutes) => {
    ctx.fillStyle = '#e9e6dc';
    ctx.beginPath();
    ctx.arc(128, 128, 126, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 12;
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(128 + Math.sin(a) * 100 - 3, 128 - Math.cos(a) * 100 - 3, 6, 6);
    }
    const hand = (a, len, w) => {
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(128, 128);
      ctx.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len);
      ctx.stroke();
    };
    hand(((hours % 12) + minutes / 60) * (Math.PI / 6), 60, 9);
    hand(minutes * (Math.PI / 30), 92, 5);
    ctx.strokeStyle = '#b3202a';
    hand(minutes * (Math.PI / 30) + 2, 96, 2);
    tex.needsUpdate = true;
  };
  return { mesh, draw };
}

/**
 * Barbershop interior, inside the facade at z = 47.5. Camera looks +z from near the shopfront.
 * Room: x −4.5…4.5, z 47.6…54.6, h 3.4.
 */
export function buildBarbershop(skylineCanvas) {
  const g = new THREE.Group();
  const H = 3.4;
  const floorTex = texture(checker(8), { repeat: [2.25, 1.75] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.012, 51.1);
  floor.receiveShadow = true;
  g.add(floor);

  const wallTex = texture(plaster(138, 6), { repeat: [1.5, 1] });
  g.add(wall(wallTex, -4.5, 54.6, 4.5, 54.6, H)); // back
  g.add(wall(wallTex, 4.5, 54.6, 4.5, 47.6, H)); // left (as seen from the shopfront)
  g.add(wall(wallTex, -4.5, 47.6, -4.5, 54.6, H)); // right
  // wainscot
  const wain = flat(0x3b2f27);
  for (const [x, z, w, d] of [[0, 54.55, 9, 0.06], [4.45, 51.1, 0.06, 7], [-4.45, 51.1, 0.06, 7]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 1.0, d), wain);
    b.position.set(x, 0.5, z);
    b.receiveShadow = true;
    g.add(b);
  }
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 7.2), flat(0x2c2b29, { side: THREE.DoubleSide }));
  roof.rotation.x = Math.PI / 2;
  roof.position.set(0, H, 51.1);
  g.add(roof);

  // the shopfront seen from inside: big window with the name painted backwards, and the door
  const [fc, fctx] = canvas(2048, 768);
  fctx.drawImage(plaster(132, 7, 2048, 768), 0, 0);
  fctx.fillStyle = '#f7f7f2';
  fctx.fillRect(130, 150, 1100, 480);
  fctx.fillStyle = 'rgba(110,110,105,0.5)';
  for (let y = 150; y < 630; y += 30) fctx.fillRect(130, y, 1100, 6);
  fctx.save();
  fctx.scale(-1, 1);
  fctx.fillStyle = 'rgba(179,32,42,0.9)';
  fctx.font = '700 120px "Oswald"';
  fctx.textAlign = 'center';
  fctx.fillText('BARBERSHOP', -680, 330);
  fctx.restore();
  fctx.fillStyle = '#2a2420';
  fctx.fillRect(1480, 120, 360, 648);
  fctx.fillStyle = '#f2f2ec';
  fctx.fillRect(1530, 170, 260, 300);
  fctx.fillStyle = '#b3202a';
  fctx.font = '600 44px "Oswald"';
  fctx.fillText('CERRADO', 1560, 330);
  const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), new THREE.MeshStandardMaterial({ map: texture(fc), roughness: 0.9 }));
  frontWall.position.set(0, 1.7, 47.64);
  g.add(frontWall);

  // window on the left wall: overexposed daylight through blinds
  const [wc, wctx] = canvas(512, 512);
  wctx.fillStyle = '#fbfbf6';
  wctx.fillRect(0, 0, 512, 512);
  wctx.fillStyle = 'rgba(120,120,115,0.55)';
  for (let y = 0; y < 512; y += 26) wctx.fillRect(0, y, 512, 7);
  wctx.fillStyle = 'rgba(60,60,58,0.6)';
  wctx.fillRect(300, 0, 10, 512); // a pole outside
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.6), new THREE.MeshBasicMaterial({ map: texture(wc), color: new THREE.Color(1.3, 1.3, 1.25), toneMapped: false }));
  win.position.set(4.44, 1.9, 49.3);
  win.rotation.y = -Math.PI / 2;
  g.add(win);

  // mirror + counter on the right wall
  const mirror = new Reflector(new THREE.PlaneGeometry(3.6, 1.4), { textureWidth: 512, textureHeight: 200, color: 0x8a8d90 });
  mirror.position.set(-4.43, 1.95, 51.6);
  mirror.rotation.y = Math.PI / 2;
  g.add(mirror);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 3.8), flat(0x2e2621));
  counter.position.set(-4.2, 0.475, 51.6);
  counter.castShadow = counter.receiveShadow = true;
  g.add(counter);
  const r = rng(3);
  for (let i = 0; i < 9; i++) {
    const h = 0.12 + r() * 0.2;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, h, 8), new THREE.MeshStandardMaterial({ color: [0x2a4a3a, 0x8a1c22, 0xd9d6cc, 0x1e2a3a][i % 4], roughness: 0.2, metalness: 0.1 }));
    b.position.set(-4.15 + (r() - 0.5) * 0.2, 0.95 + h / 2, 50.1 + i * 0.35);
    g.add(b);
  }
  const towel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.6, 0.35), flat(0xe6e3da));
  towel.position.set(-3.9, 0.7, 53.2);
  g.add(towel);

  // barber chair facing the mirror
  const chair = chairBarber();
  // facing the room, like the painting: the client reads, the barber works behind him
  chair.position.set(-1.4, 0, 52.2);
  chair.rotation.y = Math.PI;
  g.add(chair);

  // waiting chairs along the left wall
  const waits = [];
  for (let i = 0; i < 3; i++) {
    const w = chairWaiting();
    w.position.set(2.5 + i * 0.35, 0, 50.2 + i * 0.62);
    w.rotation.y = -Math.PI / 2 - 0.55;
    g.add(w);
    waits.push(w);
  }
  const table = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.6), flat(0x2a211b));
  table.position.set(3.4, 0.48, 49.0);
  g.add(table);
  for (let i = 0; i < 3; i++) {
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.01, 0.36), flat([0xb3202a, 0xd9d4c8, 0x1e2a3a][i]));
    mag.position.set(3.2 + i * 0.12, 0.52 + i * 0.01, 49.0);
    mag.rotation.y = i * 0.4;
    g.add(mag);
  }

  // back wall: poster grid, TV, plant, clock, painting
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), new THREE.MeshStandardMaterial({ map: haircutPoster(), roughness: 0.7 }));
  poster.position.set(2.1, 2.05, 54.58);
  poster.rotation.y = Math.PI;
  g.add(poster);
  const tv = crtTV();
  tv.group.position.set(0.9, 1.25, 54.2);
  tv.group.rotation.y = Math.PI;
  g.add(tv.group);
  const pl = plant();
  pl.position.set(-0.2, 0, 54.15);
  g.add(pl);
  const clock = wallClock();
  clock.mesh.position.set(-0.8, 2.7, 54.57);
  clock.mesh.rotation.y = Math.PI;
  g.add(clock.mesh);
  if (skylineCanvas) {
    const paint = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.85), new THREE.MeshStandardMaterial({ map: texture(skylineCanvas), roughness: 0.6 }));
    paint.position.set(0.1, 2.25, 54.57);
    paint.rotation.y = Math.PI;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.97, 0.04), flat(0x1e1914));
    frame.position.set(0.1, 2.25, 54.6);
    g.add(frame, paint);
  }

  const tubes = [fluorescent(-1.6, 3.15, 51.3, 1.8), fluorescent(1.6, 3.15, 50.6, 1.8)];
  g.add(...tubes);
  const lampA = new THREE.PointLight(0xe9f4ff, 5.5, 9, 1.4);
  lampA.position.set(-1.6, 2.9, 51.3);
  const lampB = new THREE.PointLight(0xe9f4ff, 5, 9, 1.4);
  lampB.position.set(1.6, 2.9, 50.6);
  const winLight = new THREE.SpotLight(0xfff3dd, 18, 12, 0.7, 0.8, 1.2);
  winLight.position.set(6.5, 2.6, 49.3);
  winLight.target.position.set(1, 0, 50.5);
  winLight.castShadow = true;
  winLight.shadow.mapSize.set(1024, 1024);
  g.add(lampA, lampB, winLight, winLight.target);

  return { group: g, roof, mirror, tv, clock, waits, chair };
}

/** Corner bar interior behind the facade at x 9…19. Counter along the back, red neon. */
export function buildBar() {
  const g = new THREE.Group();
  const H = 3.3;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.5), new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(14, 0.012, 50.8);
  floor.receiveShadow = true;
  g.add(floor);
  const wallTex = texture(plaster(96, 9), { repeat: [1.5, 1] });
  g.add(wall(wallTex, 9.5, 54.1, 18.5, 54.1, H));
  g.add(wall(wallTex, 18.5, 54.1, 18.5, 47.6, H));
  g.add(wall(wallTex, 9.5, 47.6, 9.5, 54.1, H));
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 6.8), flat(0x1f1d1b, { side: THREE.DoubleSide }));
  roof.rotation.x = Math.PI / 2;
  roof.position.set(14, H, 50.8);
  g.add(roof);
  // the shopfront from inside: daylight through the window, the door
  const [fc, fctx] = canvas(2048, 768);
  fctx.drawImage(plaster(96, 12, 2048, 768), 0, 0);
  fctx.fillStyle = '#f4f3ee';
  fctx.fillRect(700, 140, 1200, 420);
  brushOver(fctx, 700, 140, 1200, 420, { n: 80, tone: [235, 235, 230], spread: 20, alpha: [0.2, 0.4], seed: 5 });
  fctx.fillStyle = '#2a2420';
  fctx.fillRect(220, 140, 330, 628);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(9, H), new THREE.MeshStandardMaterial({ map: texture(fc), roughness: 0.9, emissive: 0xffffff, emissiveIntensity: 0.12, emissiveMap: texture(fc) }));
  front.position.set(14, H / 2, 47.64);
  g.add(front);

  const wood = flat(0x3a2418, { roughness: 0.45 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(7.4, 1.1, 0.7), wood);
  counter.position.set(14.2, 0.55, 52.6);
  counter.castShadow = counter.receiveShadow = true;
  const top = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.06, 0.85), flat(0x1b1310, { roughness: 0.25 }));
  top.position.set(14.2, 1.13, 52.6);
  g.add(counter, top);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.05, 0.3), wood);
  for (const y of [1.4, 1.85]) {
    const s = shelf.clone();
    s.position.set(14.2, y, 53.9);
    g.add(s);
  }
  const r = rng(12);
  const bottles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.05, 0.3, 7), new THREE.MeshStandardMaterial({ roughness: 0.15, metalness: 0.1 }), 40);
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  for (let i = 0; i < 40; i++) {
    m.makeTranslation(11.2 + (i % 20) * 0.31, i < 20 ? 1.58 : 2.03, 53.9);
    bottles.setMatrixAt(i, m);
    bottles.setColorAt(i, col.set([0x274a2e, 0x6b3a1a, 0xd9d6cc, 0x8a1c22, 0x1a1e24][Math.floor(r() * 5)]));
  }
  g.add(bottles);

  // red neon: survives the monochrome grade
  const neon = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.65),
    new THREE.MeshBasicMaterial({ map: signTexture('CERVEZA FRÍA', { fg: '#ff2a33', bg: '#000000', border: '', font: 'italic 600 150px "Oswald"' }), color: new THREE.Color(2.2, 2.2, 2.2), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending }),
  );
  neon.position.set(14.2, 2.7, 54.05);
  neon.rotation.y = Math.PI;
  g.add(neon);

  const stoolMat = flat(0x1a1a1a);
  for (let i = 0; i < 5; i++) {
    const st = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 10), flat(0x6b1a1e, { roughness: 0.4 }));
    seat.position.y = 0.78;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.76, 6), stoolMat);
    leg.position.y = 0.38;
    st.add(seat, leg);
    st.position.set(11.6 + i * 1.3, 0, 51.7);
    g.add(st);
  }
  // jukebox
  const juke = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.6), new THREE.MeshStandardMaterial({ color: 0x2a1a14, emissive: new THREE.Color(0.7, 0.35, 0.15), emissiveIntensity: 0.7 }));
  juke.position.set(10.2, 0.75, 53.6);
  g.add(juke);

  const lamp = new THREE.PointLight(0xffd9a8, 9, 9, 1.4);
  lamp.position.set(14, 2.9, 51.6);
  const red = new THREE.PointLight(0xff2030, 5, 6, 1.6);
  red.position.set(14.2, 2.4, 53.4);
  g.add(lamp, red);

  // props for the drink
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 10), new THREE.MeshPhysicalMaterial({ color: 0xd8e2e0, transparent: true, opacity: 0.55, roughness: 0.05 }));
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.32, 8), new THREE.MeshStandardMaterial({ color: 0x6b3a1a, roughness: 0.15 }));
  g.add(glass, bottle);
  return { group: g, roof, glass, bottle };
}
