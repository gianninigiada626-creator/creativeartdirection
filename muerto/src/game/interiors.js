import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { brushOver, canvas, rng, texture } from '../textures/util.js';
import { flat, signTexture } from '../objects/city.js';
import { drawHead } from '../textures/heads.js';
import { crumple } from '../textures/crumple.js';

// Interiors, dressed full like a painted set: worn colour on every wall, leather, wood, chrome,
// posters, bottles and clutter. Surfaces that people touch are folded like crumpled paper.

const css = ([r, g, b], k = 0) => `rgb(${r + k},${g + k},${b + k})`;

function checker(n = 8) {
  const [c, ctx] = canvas(1024);
  const s = 1024 / n;
  const r = rng(4);
  ctx.fillStyle = '#ddd3bc';
  ctx.fillRect(0, 0, 1024, 1024);
  brushOver(ctx, 0, 0, 1024, 1024, { n: 500, tone: [221, 211, 188], spread: 26, alpha: [0.2, 0.4], seed: 2 });
  // dark squares painted by hand: wobbly edges, brushed fill
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
      ctx.fillStyle = '#1d2220';
      ctx.fill();
      ctx.clip();
      brushOver(ctx, x * s, y * s, s, s, { n: 14, len: [40, 120], wid: [8, 18], tone: [40, 46, 42], spread: 22, alpha: [0.2, 0.45], seed: x * 31 + y });
      ctx.restore();
    }
  }
  // scuffs and the yellowing of old wax
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(110,92,60,${r() * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(r() * 1024, r() * 1024, 4 + r() * 40, 2 + r() * 10, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

/** Painted plaster in any colour [r,g,b]: broad strokes both ways, a few stains running down. */
function plaster(tone = [138, 140, 132], seed = 6, W = 1024, H = 512) {
  if (typeof tone === 'number') tone = [tone, tone + 2, tone - 6];
  const [c, ctx] = canvas(W, H);
  const r = rng(seed);
  ctx.fillStyle = css(tone);
  ctx.fillRect(0, 0, W, H);
  brushOver(ctx, 0, 0, W, H, { n: 300, len: [80, 260], wid: [16, 44], tone, spread: 28, alpha: [0.18, 0.36], angle: 0.4, jitter: 1.6, seed });
  brushOver(ctx, 0, 0, W, H, { n: 60, len: [60, 200], wid: [10, 28], tone, spread: 30, alpha: [0.08, 0.18], angle: Math.PI / 2, jitter: 0.8, seed: seed + 9 });
  // damp at the top, grime at hand height
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(40,34,20,0.22)');
  g.addColorStop(0.25, 'rgba(40,34,20,0)');
  g.addColorStop(0.8, 'rgba(40,34,20,0)');
  g.addColorStop(1, 'rgba(40,34,20,0.18)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = 'rgba(40,32,18,0.09)';
    ctx.fillRect(r() * W, 0, 2 + r() * 6, H * (0.2 + r() * 0.8));
  }
  return c;
}

/** Vertical tongue-and-groove boards, varnished dark. */
function woodPanel(tone = [74, 48, 32], seed = 3) {
  const [c, ctx] = canvas(1024, 256);
  const r = rng(seed);
  ctx.fillStyle = css(tone);
  ctx.fillRect(0, 0, 1024, 256);
  for (let x = 0; x < 1024; x += 64) {
    const k = (r() - 0.5) * 18;
    ctx.fillStyle = css(tone, k);
    ctx.fillRect(x, 0, 64, 256);
    brushOver(ctx, x, 0, 64, 256, { n: 10, len: [120, 260], wid: [4, 10], tone: tone.map((v) => v + k), spread: 20, alpha: [0.2, 0.4], angle: Math.PI / 2, jitter: 0.05, seed: x + seed });
    ctx.fillStyle = 'rgba(15,8,4,0.7)';
    ctx.fillRect(x, 0, 3, 256);
    ctx.fillStyle = 'rgba(255,220,170,0.08)';
    ctx.fillRect(x + 3, 0, 2, 256);
  }
  ctx.fillStyle = 'rgba(20,10,5,0.6)';
  ctx.fillRect(0, 0, 1024, 14); // the rail
  ctx.fillStyle = 'rgba(255,220,170,0.12)';
  ctx.fillRect(0, 14, 1024, 3);
  return c;
}

/** Wall from (x0,z0) to (x1,z1), facing the room centre side. */
function wall(map, x0, z0, x1, z1, h, y0 = 0) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), crumple(new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide }), [len / 1.6, h / 1.6], 0.28));
  m.position.set((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2);
  m.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
  m.receiveShadow = true;
  return m;
}

function fluorescent(x, y, z, len = 1.6) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.22), flat(0xd8d6cc));
  const tube = new THREE.Mesh(
    new THREE.BoxGeometry(len - 0.1, 0.05, 0.12),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.75, 1.55), toneMapped: false }),
  );
  tube.position.y = -0.05;
  g.add(box, tube);
  g.position.set(x, y, z);
  return g;
}

const leather = (color) => crumple(new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0 }), 1.5, 0.4);
const CHROME = new THREE.MeshStandardMaterial({ color: 0xd6d2c8, metalness: 1, roughness: 0.22 });

function chairBarber() {
  const g = new THREE.Group();
  const hide = leather(0x5c1814);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.08, 20), CHROME);
  base.position.y = 0.04;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.42, 12), CHROME);
  post.position.y = 0.28;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.16, 0.62), hide);
  seat.position.y = 0.56;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.14), hide);
  back.position.set(0, 0.99, -0.29);
  back.rotation.x = -0.12;
  const rest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.1), hide);
  rest.position.set(0, 1.48, -0.36);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.52), CHROME);
  armL.position.set(0.36, 0.8, 0);
  const padL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.4), hide);
  padL.position.set(0.36, 0.86, 0.02);
  const armR = armL.clone();
  armR.position.x = -0.36;
  const padR = padL.clone();
  padR.position.x = -0.36;
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.2), CHROME);
  foot.position.set(0, 0.2, 0.42);
  g.add(base, post, seat, back, rest, armL, padL, armR, padR, foot);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  return g;
}

/** Old leather armchair with a wooden frame. */
function chairWaiting() {
  const g = new THREE.Group();
  const hide = leather(0x6a3a22);
  const wood = flat(0x3a2416, { roughness: 0.5 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.56), hide);
  seat.position.y = 0.46;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.62, 0.14), hide);
  back.position.set(0, 0.86, -0.25);
  back.rotation.x = -0.1;
  g.add(seat, back);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.56), wood);
    arm.position.set(s * 0.33, 0.66, 0.0);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.06), wood);
    post.position.set(s * 0.33, 0.33, 0.24);
    const postB = post.clone();
    postB.position.z = -0.26;
    g.add(arm, post, postB);
  }
  g.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
  return g;
}

/** The CRT on its cabinet, showing the afternoon wrestling. */
function crtTV() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.5), flat(0x3a3530, { roughness: 0.5 }));
  const [c, ctx] = canvas(256, 192);
  const sky = ctx.createLinearGradient(0, 0, 0, 192);
  sky.addColorStop(0, '#2a3a6a');
  sky.addColorStop(1, '#c8643a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 256, 192);
  ctx.fillStyle = '#d8c8a0';
  ctx.fillRect(20, 120, 216, 50); // the ring
  ctx.strokeStyle = '#b3202a';
  ctx.lineWidth = 4;
  for (const y of [100, 112, 124]) {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(236, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#1a1414';
  ctx.beginPath();
  ctx.ellipse(100, 92, 14, 30, 0.2, 0, Math.PI * 2);
  ctx.ellipse(150, 96, 16, 30, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8d24a';
  ctx.font = '700 22px "Oswald"';
  ctx.fillText('LUCHA 6', 12, 28);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 0; y < 192; y += 3) ctx.fillRect(0, y, 256, 1);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.34), new THREE.MeshBasicMaterial({ map: texture(c), color: new THREE.Color(0.9, 0.9, 0.9), toneMapped: false }));
  screen.position.z = 0.252;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.62, 0.5), flat(0x5a3a24, { roughness: 0.55 }));
  cab.position.y = -0.56;
  const glow = new THREE.PointLight(0x8aa0ff, 0.6, 2.2, 1.5);
  glow.position.z = 0.5;
  g.add(body, screen, cab, glow);
  return { group: g };
}

function plant(leaf = 0x3f5a2c, pot = 0x8a4a2a, seed = 8) {
  const g = new THREE.Group();
  const potM = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.42, 10), flat(pot, { roughness: 0.8 }));
  potM.position.y = 0.21;
  g.add(potM);
  const leafMat = crumple(flat(leaf, { side: THREE.DoubleSide }), 1, 0.5);
  const r = rng(seed);
  for (let i = 0; i < 16; i++) {
    const l = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.9 + r() * 0.3, 3), leafMat);
    const a = (i / 16) * Math.PI * 2;
    l.position.set(Math.cos(a) * 0.12, 0.8 + r() * 0.3, Math.sin(a) * 0.12);
    l.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
    g.add(l);
  }
  return g;
}

/** Poster with a grid of haircut heads, the barbershop classic. */
function haircutPoster() {
  const [c, ctx] = canvas(768, 1024);
  ctx.fillStyle = '#e0d2ae';
  ctx.fillRect(0, 0, 768, 1024);
  const hairs = ['crop', 'flattop', 'afro', 'crown', 'cap', 'crop', 'afro', 'flattop', 'crown'];
  hairs.forEach((hair, i) => {
    const x = (i % 3) * 248 + 14;
    const y = Math.floor(i / 3) * 330 + 40;
    ctx.fillStyle = ['#c9b48a', '#9fb0a0', '#c89a7a'][(i + Math.floor(i / 3)) % 3];
    ctx.fillRect(x, y, 230, 300);
    const head = drawHead({ seed: 100 + i, hair, tone: 0.15 + (i % 3) * 0.2, lines: 0 });
    ctx.drawImage(head, x + 10, y + 10, 210, 262);
    ctx.fillStyle = '#3a1a14';
    ctx.font = '600 22px "Oswald"';
    ctx.fillText(`N.${i + 1}`, x + 10, y + 292);
  });
  ctx.strokeStyle = '#3a2418';
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, 752, 1008);
  return texture(c);
}

/** Small printed things for the walls: a fight bill, a price list, a calendar. */
function wallPrint(kind) {
  const [c, ctx] = canvas(512, 720);
  const r = rng(kind.length * 7);
  if (kind === 'fight') {
    ctx.fillStyle = '#e8dcc0';
    ctx.fillRect(0, 0, 512, 720);
    ctx.fillStyle = '#b3202a';
    ctx.fillRect(0, 0, 512, 210);
    ctx.fillStyle = '#f2e8d0';
    ctx.font = '700 92px "Oswald"';
    ctx.textAlign = 'center';
    ctx.fillText('BOX', 256, 120);
    ctx.font = '600 38px "Oswald"';
    ctx.fillText('SÁBADO 9 PM', 256, 180);
    ctx.drawImage(drawHead({ seed: 501, hair: 'none', tone: 0.3, brow: 1.4, lines: 0.6 }), 20, 230, 230, 290);
    ctx.drawImage(drawHead({ seed: 502, hair: 'crop', tone: 0.12, brow: 1.2 }), 262, 230, 230, 290);
    ctx.fillStyle = '#1a1414';
    ctx.font = '700 64px "Oswald"';
    ctx.fillText('VS', 256, 410);
    ctx.font = '600 44px "Oswald"';
    ctx.fillText('EL VIVO · LA MUERTE', 256, 600);
    ctx.font = '400 28px "Oswald"';
    ctx.fillText('ARENA CAMPOSANTO', 256, 660);
  } else if (kind === 'prices') {
    ctx.fillStyle = '#1e2420';
    ctx.fillRect(0, 0, 512, 720);
    ctx.fillStyle = '#efe6cf';
    ctx.font = '700 64px "Oswald"';
    ctx.textAlign = 'center';
    ctx.fillText('PRECIOS', 256, 100);
    ctx.font = '500 40px "Oswald"';
    ctx.textAlign = 'left';
    [['CORTE', '$5'], ['BARBA', '$3'], ['NAVAJA', '$4'], ['CORONA', '$7'], ['NIÑOS', '$3']].forEach(([a, b], i) => {
      ctx.fillText(a, 50, 200 + i * 92);
      ctx.textAlign = 'right';
      ctx.fillText(b, 462, 200 + i * 92);
      ctx.textAlign = 'left';
    });
  } else {
    ctx.fillStyle = '#efe8d8';
    ctx.fillRect(0, 0, 512, 720);
    ctx.fillStyle = '#d07a3a';
    ctx.fillRect(20, 20, 472, 330);
    ctx.fillStyle = '#3a6a5a';
    ctx.beginPath();
    ctx.moveTo(20, 350);
    ctx.lineTo(160, 200);
    ctx.lineTo(300, 300);
    ctx.lineTo(492, 180);
    ctx.lineTo(492, 350);
    ctx.fill();
    ctx.fillStyle = '#1a1414';
    ctx.font = '700 48px "Oswald"';
    ctx.textAlign = 'center';
    ctx.fillText('OCTUBRE', 256, 410);
    ctx.font = '400 26px "Oswald"';
    for (let i = 0; i < 31; i++) ctx.fillText(String(i + 1), 60 + (i % 7) * 66, 470 + Math.floor(i / 7) * 52);
    ctx.fillStyle = '#b3202a';
    ctx.font = '400 20px "Oswald"';
    ctx.fillText('CAMPOSANTO REC.', 256, 700);
  }
  // age it
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(120,90,40,${r() * 0.08})`;
    ctx.beginPath();
    ctx.ellipse(r() * 512, r() * 720, 20 + r() * 80, 10 + r() * 40, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return texture(c);
}

function framed(tex, w, h, frameColor = 0x2a1a10) {
  const g = new THREE.Group();
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), crumple(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }), 1, 0.25));
  pic.position.z = 0.025;
  const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.04), flat(frameColor, { roughness: 0.5 }));
  g.add(fr, pic);
  return g;
}

function wallClock() {
  const [c, ctx] = canvas(256);
  const tex = texture(c);
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }));
  ctx.fillStyle = '#efe6d0';
  ctx.beginPath();
  ctx.arc(128, 128, 126, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a1a16';
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
  ctx.strokeStyle = '#1a1a1a';
  hand((5 + 20 / 60) * (Math.PI / 6), 60, 9);
  hand(20 * (Math.PI / 30), 92, 5);
  return { mesh };
}

/** Bottles, tins and jars for shelves and counters. */
function bottles(n, seed, place) {
  const g = new THREE.Group();
  const r = rng(seed);
  const cols = [0x2f6a4a, 0x8a1c22, 0xd9cfb6, 0x2a3e6a, 0xc8862a, 0x5a2a4a, 0x8aa0a0];
  for (let i = 0; i < n; i++) {
    const h = 0.12 + r() * 0.2;
    const round = r() < 0.7;
    const geo = round ? new THREE.CylinderGeometry(0.035 + r() * 0.02, 0.045, h, 10) : new THREE.BoxGeometry(0.08, h, 0.06);
    const b = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cols[Math.floor(r() * cols.length)], roughness: 0.18, metalness: 0.05 }));
    const [x, y, z] = place(i, r);
    b.position.set(x, y + h / 2, z);
    g.add(b);
    if (round && r() < 0.6) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 8), r() < 0.5 ? CHROME : flat(0x1a1a1a));
      cap.position.set(x, y + h + 0.025, z);
      g.add(cap);
    }
  }
  return g;
}

/**
 * Barbershop interior, inside the facade at z = 47.5. Camera looks +z from near the shopfront.
 * Room: x −4.5…4.5, z 47.6…54.6, h 3.4. +x is screen-left from the shopfront.
 */
export function buildBarbershop(skylineCanvas) {
  const g = new THREE.Group();
  const H = 3.4;
  const floorTex = texture(checker(8), { repeat: [2.25, 1.75] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.32, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.012, 51.1);
  floor.receiveShadow = true;
  g.add(floor);

  // olive walls over a dark wooden wainscot
  const wallTex = texture(plaster([112, 112, 84], 6), { repeat: [1.5, 1] });
  g.add(wall(wallTex, -4.5, 54.6, 4.5, 54.6, H)); // back
  g.add(wall(wallTex, 4.5, 54.6, 4.5, 47.6, H)); // left (as seen from the shopfront)
  g.add(wall(wallTex, -4.5, 47.6, -4.5, 54.6, H)); // right
  const wainTex = texture(woodPanel(), { repeat: [3, 1] });
  const wain = crumple(new THREE.MeshStandardMaterial({ map: wainTex, roughness: 0.5 }), [6, 1], 0.2);
  for (const [x, z, w, d] of [[0, 54.55, 9, 0.06], [4.45, 51.1, 0.06, 7], [-4.45, 51.1, 0.06, 7]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 1.05, d), wain);
    b.position.set(x, 0.525, z);
    b.receiveShadow = true;
    g.add(b);
  }
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 7.2), flat(0x4a4436, { side: THREE.DoubleSide }));
  roof.rotation.x = Math.PI / 2;
  roof.position.set(0, H, 51.1);
  g.add(roof);

  // the shopfront seen from inside: big window with the name painted backwards, and the door
  const [fc, fctx] = canvas(2048, 768);
  fctx.drawImage(plaster([112, 112, 84], 7, 2048, 768), 0, 0);
  const street = fctx.createLinearGradient(0, 150, 0, 630);
  street.addColorStop(0, '#f6efd8');
  street.addColorStop(0.6, '#e8c89a');
  street.addColorStop(1, '#a88c6a');
  fctx.fillStyle = street;
  fctx.fillRect(130, 150, 1100, 480);
  fctx.fillStyle = 'rgba(110,100,80,0.45)';
  for (let y = 150; y < 630; y += 30) fctx.fillRect(130, y, 1100, 6);
  fctx.save();
  fctx.scale(-1, 1);
  fctx.fillStyle = 'rgba(179,32,42,0.9)';
  fctx.font = '700 120px "Oswald"';
  fctx.textAlign = 'center';
  fctx.fillText('BARBERSHOP', -680, 330);
  fctx.restore();
  fctx.fillStyle = '#3a2416';
  fctx.fillRect(1480, 120, 360, 648);
  fctx.fillStyle = '#f0e6cc';
  fctx.fillRect(1530, 170, 260, 300);
  fctx.fillStyle = '#b3202a';
  fctx.font = '600 44px "Oswald"';
  fctx.fillText('CERRADO', 1560, 330);
  const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), new THREE.MeshStandardMaterial({ map: texture(fc), roughness: 0.9 }));
  frontWall.position.set(0, 1.7, 47.64);
  g.add(frontWall);

  // window on the left wall: warm late daylight through the blinds, and the street beyond
  const [wc, wctx] = canvas(512, 512);
  const out = wctx.createLinearGradient(0, 0, 0, 512);
  out.addColorStop(0, '#fff4dc');
  out.addColorStop(0.55, '#f2c890');
  out.addColorStop(0.56, '#9a7a5a');
  out.addColorStop(1, '#6a5a4a');
  wctx.fillStyle = out;
  wctx.fillRect(0, 0, 512, 512);
  for (const [x, w, col] of [[30, 110, '#c87a5a'], [160, 140, '#8aa6a0'], [320, 170, '#d8b06a']]) {
    wctx.fillStyle = col;
    wctx.fillRect(x, 200, w, 90); // the buildings across the street
  }
  wctx.fillStyle = 'rgba(90,80,60,0.5)';
  for (let y = 0; y < 512; y += 26) wctx.fillRect(0, y, 512, 7);
  wctx.fillStyle = 'rgba(50,40,30,0.7)';
  wctx.fillRect(300, 0, 10, 512); // a pole outside
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.6), new THREE.MeshBasicMaterial({ map: texture(wc), color: new THREE.Color(1.25, 1.2, 1.1), toneMapped: false }));
  win.position.set(4.44, 1.9, 49.3);
  win.rotation.y = -Math.PI / 2;
  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 1.9), flat(0x3a2416));
  sill.position.set(4.38, 1.08, 49.3);
  g.add(win, sill);

  // mirror + counter on the right wall
  const mirror = new Reflector(new THREE.PlaneGeometry(3.6, 1.4), { textureWidth: 512, textureHeight: 200, color: 0x9a968a });
  mirror.position.set(-4.43, 1.95, 51.6);
  mirror.rotation.y = Math.PI / 2;
  g.add(mirror);
  const mframe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.52, 3.72), flat(0x2a1a10, { roughness: 0.4 }));
  mframe.position.set(-4.46, 1.95, 51.6);
  g.add(mframe);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 3.8), crumple(new THREE.MeshStandardMaterial({ map: texture(woodPanel([86, 56, 36], 9)), roughness: 0.5 }), 1, 0.2));
  counter.position.set(-4.2, 0.475, 51.6);
  counter.castShadow = counter.receiveShadow = true;
  const ctop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 3.85), flat(0xd8d0bc, { roughness: 0.3 }));
  ctop.position.set(-4.2, 0.97, 51.6);
  g.add(counter, ctop);
  g.add(bottles(12, 3, (i, r) => [-4.2 + (r() - 0.5) * 0.25, 0.99, 50.0 + i * 0.28 + (r() - 0.5) * 0.08]));
  const towelMat = crumple(flat(0xebe4d4), 1, 0.9);
  const towel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.6, 0.35), towelMat);
  towel.position.set(-3.9, 0.7, 53.2);
  const towel2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.36), towelMat);
  towel2.position.set(-4.2, 1.03, 49.95);
  g.add(towel, towel2);
  // shelf over the mirror with jars and tins
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 3.6), flat(0x3a2416));
  shelf.position.set(-4.33, 2.78, 51.6);
  g.add(shelf, bottles(14, 21, (i, r) => [-4.33 + (r() - 0.5) * 0.12, 2.8, 50.0 + i * 0.24]));

  // the barber chair faces the mirror
  const chair = chairBarber();
  chair.position.set(-1.75, 0, 52.1);
  chair.rotation.y = -Math.PI / 2 - 0.35;
  g.add(chair);
  // cut hair on the floor around it
  const hairMat = new THREE.MeshBasicMaterial({ color: 0x14100c, transparent: true, opacity: 0.75, depthWrite: false });
  const hr = rng(44);
  for (let i = 0; i < 40; i++) {
    const tuft = new THREE.Mesh(new THREE.CircleGeometry(0.02 + hr() * 0.05, 5), hairMat);
    tuft.rotation.x = -Math.PI / 2;
    tuft.scale.y = 0.4 + hr();
    const a = hr() * Math.PI * 2;
    const d = 0.3 + hr() * 0.7;
    tuft.position.set(-1.75 + Math.cos(a) * d, 0.016, 52.1 + Math.sin(a) * d);
    g.add(tuft);
  }

  // waiting armchairs along the left wall, turned toward the room
  const waits = [];
  for (let i = 0; i < 3; i++) {
    const w = chairWaiting();
    w.position.set(2.35 + i * 0.32, 0, 50.1 + i * 0.8);
    w.rotation.y = -Math.PI / 2 - 0.85;
    g.add(w);
    waits.push(w);
  }
  // low table in front with magazines and the paper
  const wood = flat(0x4a2c18, { roughness: 0.45 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.05, 0.6), wood);
  table.position.set(1.55, 0.46, 49.0);
  g.add(table);
  for (const [x, z] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.05), wood);
    leg.position.set(1.55 + x, 0.22, 49.0 + z);
    g.add(leg);
  }
  for (let i = 0; i < 4; i++) {
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.34), crumple(flat([0xb3202a, 0xd9cfb6, 0x2a4a6a, 0xd8a03a][i]), 0.5, 0.4));
    mag.position.set(1.3 + i * 0.13, 0.49 + i * 0.012, 48.95 + (i % 2) * 0.06);
    mag.rotation.y = i * 0.45 - 0.3;
    g.add(mag);
  }
  // an ashtray and a coffee cup
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.03, 12), CHROME);
  tray.position.set(1.9, 0.5, 49.15);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.08, 12), flat(0xe8e0cc, { roughness: 0.3 }));
  cup.position.set(1.85, 0.53, 48.85);
  g.add(tray, cup);

  // back wall: poster grid, TV, plant, clock, the painting, prints
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), crumple(new THREE.MeshStandardMaterial({ map: haircutPoster(), roughness: 0.7 }), 1, 0.3));
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
  const pl2 = plant(0x4a6a32, 0x2a2a2a, 19);
  pl2.scale.setScalar(0.8);
  pl2.position.set(4.0, 0, 50.6);
  g.add(pl2);
  const clock = wallClock();
  clock.mesh.position.set(-0.8, 2.75, 54.57);
  clock.mesh.rotation.y = Math.PI;
  g.add(clock.mesh);
  if (skylineCanvas) {
    const paint = framed(texture(skylineCanvas), 1.2, 0.85, 0x6a4a1a);
    paint.position.set(0.1, 2.25, 54.55);
    paint.rotation.y = Math.PI;
    g.add(paint);
  }
  const fight = framed(wallPrint('fight'), 0.55, 0.78);
  fight.position.set(3.55, 2.0, 54.55);
  fight.rotation.y = Math.PI;
  const prices = framed(wallPrint('prices'), 0.5, 0.7, 0x6a4a1a);
  prices.position.set(-2.0, 1.95, 54.55);
  prices.rotation.y = Math.PI;
  const cal = framed(wallPrint('calendar'), 0.42, 0.6, 0xd8d0bc);
  cal.position.set(4.45, 2.05, 51.6);
  cal.rotation.y = -Math.PI / 2;
  g.add(fight, prices, cal);
  // coat stand in the back corner with a jacket and a hat
  const stand = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.85, 8), flat(0x2a1a10));
  pole.position.y = 0.92;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.04, 12), flat(0x2a1a10));
  const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.85, 10, 1, true), crumple(flat(0x4a3424, { side: THREE.DoubleSide }), 1.5, 0.8));
  coat.position.set(0, 1.35, 0.1);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.12, 14), flat(0x1e1814));
  hat.position.set(0, 1.92, 0);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.015, 18), flat(0x1e1814));
  brim.position.set(0, 1.86, 0);
  stand.add(pole, foot, coat, hat, brim);
  stand.position.set(3.95, 0, 54.05);
  g.add(stand);
  // a broom and a bin by the counter
  const broom = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 6), flat(0xb08a5a));
  broom.position.set(-3.75, 0.72, 53.95);
  broom.rotation.z = 0.18;
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.4, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0x7a7a6a, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }));
  bin.position.set(-3.6, 0.2, 49.4);
  g.add(broom, bin);

  const tubes = [fluorescent(-1.6, 3.15, 51.3, 1.8), fluorescent(1.6, 3.15, 50.6, 1.8)];
  g.add(...tubes);
  const lampA = new THREE.PointLight(0xe8f2e0, 4.2, 8, 1.6);
  lampA.position.set(-1.6, 2.9, 51.3);
  const lampB = new THREE.PointLight(0xe8f2e0, 3.4, 8, 1.6);
  lampB.position.set(1.6, 2.9, 50.6);
  const winLight = new THREE.SpotLight(0xffd29a, 17, 12, 0.7, 0.8, 1.2);
  winLight.position.set(6.5, 2.6, 49.3);
  winLight.target.position.set(1, 0, 50.5);
  winLight.castShadow = true;
  winLight.shadow.mapSize.set(1024, 1024);
  g.add(lampA, lampB, winLight, winLight.target);

  return { group: g, roof, mirror, tv, clock, waits, chair, table };
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
  const wallTex = texture(plaster([58, 80, 74], 9), { repeat: [1.5, 1] });
  g.add(wall(wallTex, 9.5, 54.1, 18.5, 54.1, H));
  g.add(wall(wallTex, 18.5, 54.1, 18.5, 47.6, H));
  g.add(wall(wallTex, 9.5, 47.6, 9.5, 54.1, H));
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 6.8), flat(0x1f1d1b, { side: THREE.DoubleSide }));
  roof.rotation.x = Math.PI / 2;
  roof.position.set(14, H, 50.8);
  g.add(roof);
  // the shopfront from inside: daylight through the window, the door
  const [fc, fctx] = canvas(2048, 768);
  fctx.drawImage(plaster([58, 80, 74], 12, 2048, 768), 0, 0);
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

  const lamp = new THREE.PointLight(0xffe4c4, 8, 9, 1.4);
  lamp.position.set(14, 2.9, 51.6);
  const red = new THREE.PointLight(0xff2030, 3, 5, 1.8);
  red.position.set(14.2, 2.4, 53.4);
  g.add(lamp, red);

  // props for the drink
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 10), new THREE.MeshPhysicalMaterial({ color: 0xd8e2e0, transparent: true, opacity: 0.55, roughness: 0.05 }));
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.32, 8), new THREE.MeshStandardMaterial({ color: 0x6b3a1a, roughness: 0.15 }));
  g.add(glass, bottle);
  return { group: g, roof, glass, bottle };
}
