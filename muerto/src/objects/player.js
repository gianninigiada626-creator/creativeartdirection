import * as THREE from 'three';
import { canvas, fontsReady, rng, texture } from '../textures/util.js';

// A late-90s hi-fi CD deck. Units: disc radius = 1 (6 cm), so the deck is ~43 × 10 × 30 cm.
export const DECK = {
  W: 7.2,
  H: 1.7,
  D: 5,
  FRONT: 2.5, // z of the front panel
  TRAY_X: -1.35,
  TRAY_Y: 1.12, // top surface of the tray platter
  TRAY_TRAVEL: 2.55,
  DISPLAY: { x: 1.75, y: 1.08, w: 2.5, h: 0.62 },
};

function brushed(W, H, base = 46, seed = 4) {
  const [c, ctx] = canvas(W, H);
  const r = rng(seed);
  ctx.fillStyle = `rgb(${base},${base},${base + 2})`;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < H * 1.4; i++) {
    const v = base + (r() - 0.5) * 22;
    ctx.fillStyle = `rgba(${v},${v},${v + 3},${0.3 + r() * 0.4})`;
    ctx.fillRect(0, r() * H, W, 1 + r());
  }
  return [c, ctx];
}

/** Front panel print: brand, model, button legends and the tray slot. */
async function frontPanel() {
  await fontsReady(['600 40px "Oswald"', '300 30px "Oswald"']);
  const PX = 300; // pixels per unit
  const W = Math.round(DECK.W * PX);
  const H = Math.round(DECK.H * PX);
  const [c, ctx] = brushed(W, H, 44);
  const X = (u) => (u + DECK.W / 2) * PX;
  const Y = (v) => (DECK.H - v) * PX;

  // bevel lines
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  // tray slot
  ctx.fillStyle = '#060606';
  ctx.fillRect(X(DECK.TRAY_X - 1.42), Y(1.42), 2.84 * PX, 0.5 * PX);

  // display window recess
  const d = DECK.DISPLAY;
  ctx.fillStyle = '#030404';
  ctx.fillRect(X(d.x - d.w / 2 - 0.06), Y(d.y + d.h / 2 + 0.06), (d.w + 0.12) * PX, (d.h + 0.12) * PX);

  ctx.fillStyle = '#d7d9dc';
  ctx.textBaseline = 'middle';
  ctx.font = '600 58px "Oswald", sans-serif';
  ctx.letterSpacing = '18px';
  ctx.fillText('VESPERA', X(-3.35), Y(1.42));
  ctx.letterSpacing = '4px';
  ctx.font = '300 26px "Oswald", sans-serif';
  ctx.fillStyle = '#a9adb2';
  ctx.fillText('CD-2000  ·  DIGITAL AUDIO DISC PLAYER', X(-3.35), Y(1.18));
  ctx.fillText('1-BIT DAC  ·  8× OVERSAMPLING', X(-0.08), Y(0.4));

  ctx.font = '400 22px "Oswald", sans-serif';
  ctx.fillStyle = '#b8bcc0';
  ctx.textAlign = 'center';
  ctx.fillText('OPEN/CLOSE', X(0.25), Y(1.43));
  const legends = ['PLAY/PAUSE', 'STOP', '◀◀', '▶▶', 'REPEAT'];
  legends.forEach((l, i) => ctx.fillText(l, X(0.75 + i * 0.5), Y(0.36)));
  ctx.fillText('POWER', X(-3.0), Y(0.33));
  ctx.textAlign = 'left';
  ctx.letterSpacing = '0px';
  return texture(c);
}

/** Vacuum-fluorescent display, redrawn only when its text changes. */
function createDisplay() {
  const W = 1024;
  const H = 256;
  const [c, ctx] = canvas(W, H);
  const tex = texture(c);
  let last = '';
  const GLOW = '#6dffd6';
  const DIM = 'rgba(109,255,214,0.09)';
  const draw = ({ main = '', small = [], indicators = {} }) => {
    const key = JSON.stringify([main, small, indicators]);
    if (key === last) return;
    last = key;
    ctx.fillStyle = '#020605';
    ctx.fillRect(0, 0, W, H);
    // ghost segments of the unlit grid
    ctx.font = '150px "VT323", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = DIM;
    ctx.fillText('88888888888', 30, 136);
    ctx.shadowColor = GLOW;
    ctx.shadowBlur = 18;
    ctx.fillStyle = GLOW;
    ctx.fillText(main, 30, 136);
    ctx.font = '40px "VT323", monospace';
    const ind = [
      ['CD', 30],
      ['TRACK', 120],
      ['MIN', 600],
      ['SEC', 700],
      ['PLAY ▶', 820],
    ];
    for (const [label, x] of ind) {
      ctx.fillStyle = indicators[label] ? GLOW : DIM;
      ctx.shadowBlur = indicators[label] ? 12 : 0;
      ctx.fillText(label, x, 36);
    }
    ctx.shadowBlur = 0;
    small.forEach((s, i) => {
      ctx.fillStyle = GLOW;
      ctx.fillText(s, 30 + i * 260, 228);
    });
    tex.needsUpdate = true;
  };
  return { tex, draw };
}

function wood(W = 2048, H = 1024) {
  const [c, ctx] = canvas(W, H);
  const r = rng(12);
  ctx.fillStyle = '#2a1a12';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 420; i++) {
    const y = r() * H;
    ctx.strokeStyle = `rgba(${60 + r() * 40},${35 + r() * 20},${20 + r() * 10},${0.2 + r() * 0.35})`;
    ctx.lineWidth = 1 + r() * 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += 64) ctx.lineTo(x, y + Math.sin(x * 0.004 + i) * (6 + r() * 10));
    ctx.stroke();
  }
  return texture(c, { repeat: [2, 2] });
}

export async function createPlayer() {
  const group = new THREE.Group();
  const { W, H, D, FRONT } = DECK;
  const black = new THREE.MeshStandardMaterial({ color: 0x141416, metalness: 0.55, roughness: 0.42 });

  // chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(W, H - 0.04, D), black);
  chassis.position.set(0, H / 2, FRONT - D / 2 - 0.01);
  chassis.castShadow = chassis.receiveShadow = true;
  group.add(chassis);

  // top cover seam and vents
  const [vc, vctx] = brushed(1024, 712, 22, 8);
  vctx.fillStyle = '#060606';
  for (let i = 0; i < 18; i++) vctx.fillRect(560 + i * 24, 90, 10, 240);
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.02, D - 0.02),
    new THREE.MeshStandardMaterial({ map: texture(vc), metalness: 0.5, roughness: 0.5 }),
  );
  top.rotation.x = -Math.PI / 2;
  top.position.set(0, H - 0.01, FRONT - D / 2);
  group.add(top);

  // front panel
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshStandardMaterial({ map: await frontPanel(), metalness: 0.75, roughness: 0.36 }),
  );
  panel.position.set(0, H / 2, FRONT + 0.001);
  panel.receiveShadow = true;
  group.add(panel);

  // feet
  const footGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.12, 24);
  for (const [fx, fz] of [[-3.1, 2], [3.1, 2], [-3.1, -1.9], [3.1, -1.9]]) {
    const f = new THREE.Mesh(footGeo, black);
    f.position.set(fx, -0.04, fz);
    group.add(f);
  }

  // tray: platter with recess + front lip; the disc rides on it
  const tray = new THREE.Group();
  const [tc, tctx] = canvas(1024);
  tctx.fillStyle = '#0d0d0e';
  tctx.fillRect(0, 0, 1024, 1024);
  tctx.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let rr = 60; rr < 470; rr += 9) {
    tctx.beginPath();
    tctx.arc(512, 512, rr, 0, Math.PI * 2);
    tctx.stroke();
  }
  tctx.fillStyle = '#050505';
  tctx.beginPath();
  tctx.arc(512, 512, 120, 0, Math.PI * 2);
  tctx.fill();
  const platter = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.08, 2.6),
    [black, black, new THREE.MeshStandardMaterial({ map: texture(tc), roughness: 0.6 }), black, black, black],
  );
  platter.position.set(0, -0.04, -1.3);
  platter.castShadow = platter.receiveShadow = true;
  const lip = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.42, 0.08), black);
  lip.position.set(0, 0.06, 0.02);
  lip.castShadow = true;
  tray.add(platter, lip);
  tray.position.set(DECK.TRAY_X, DECK.TRAY_Y, FRONT);
  group.add(tray);

  // buttons
  const btnMat = new THREE.MeshStandardMaterial({ color: 0x2c2d30, metalness: 0.7, roughness: 0.35 });
  const btnGeo = new THREE.BoxGeometry(0.36, 0.12, 0.08);
  const buttons = {};
  const openBtn = new THREE.Mesh(btnGeo, btnMat);
  openBtn.position.set(0.25, 1.26, FRONT + 0.04);
  buttons.open = openBtn;
  group.add(openBtn);
  ['play', 'stop', 'prev', 'next', 'repeat'].forEach((k, i) => {
    const b = new THREE.Mesh(btnGeo, btnMat);
    b.position.set(0.75 + i * 0.5, 0.5, FRONT + 0.04);
    buttons[k] = b;
    group.add(b);
  });
  const power = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32), btnMat);
  power.rotation.x = Math.PI / 2;
  power.position.set(-3.0, 0.62, FRONT + 0.05);
  group.add(power);
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 12, 8),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2a2a').multiplyScalar(3), toneMapped: false }),
  );
  led.position.set(-2.6, 0.62, FRONT + 0.02);
  group.add(led);

  // VFD display behind smoked glass
  await fontsReady(['150px "VT323"']);
  const display = createDisplay();
  const d = DECK.DISPLAY;
  const vfd = new THREE.Mesh(
    new THREE.PlaneGeometry(d.w, d.h),
    new THREE.MeshBasicMaterial({ map: display.tex, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) }),
  );
  vfd.position.set(d.x, d.y, FRONT + 0.004);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(d.w + 0.12, d.h + 0.12),
    new THREE.MeshPhysicalMaterial({ color: 0x0a1210, transparent: true, opacity: 0.25, roughness: 0.05, clearcoat: 1, metalness: 0 }),
  );
  glass.position.set(d.x, d.y, FRONT + 0.03);
  group.add(vfd, glass);

  return { group, tray, buttons, display, woodTexture: wood() };
}
