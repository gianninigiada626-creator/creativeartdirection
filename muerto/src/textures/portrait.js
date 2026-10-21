import { canvas, rng } from './util.js';
import { crumpledPaper } from './paper.js';

// PLACEHOLDER painting for the disc label, until the artist's own painting arrives.
// West Coast afternoon: palms, power lines, a motel sign, a lowrider, the downtown towers in haze,
// and MERCY V. in a patchwork track jacket, crown of spikes, red eyes. Brush dabs, then crumpled paper.

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export function paintPortrait(S = 2048) {
  const [c, ctx] = canvas(S);
  const r = rng(77);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const jit = (h, j = 16) => {
    const [R, G, B] = hex(h);
    const k = (r() - 0.5) * j;
    return `rgb(${R + k},${G + k},${B + k})`;
  };
  const dab = (x, y, len, wid, ang, color, alpha = 0.8) => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = wid;
    ctx.lineCap = 'round';
    const dx = (Math.cos(ang) * len) / 2;
    const dy = (Math.sin(ang) * len) / 2;
    ctx.beginPath();
    ctx.moveTo(x - dx, y - dy);
    ctx.lineTo(x + dx, y + dy);
    ctx.stroke();
  };
  const field = (n, area, colors, { len = [24, 90], wid = [8, 20], ang = [-0.15, 0.15], alpha = 0.75 } = {}) => {
    for (let i = 0; i < n; i++) {
      const [x, y] = area();
      if (x == null) continue;
      dab(x, y, len[0] + r() * (len[1] - len[0]), wid[0] + r() * (wid[1] - wid[0]), ang[0] + r() * (ang[1] - ang[0]), jit(typeof colors === 'function' ? colors(x, y) : pick(colors)), alpha);
    }
  };
  const poly = (pts, color, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * S, y * S) : ctx.moveTo(x * S, y * S)));
    ctx.closePath();
    ctx.fill();
  };

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, S * 0.7);
  sky.addColorStop(0, '#1f5aa8');
  sky.addColorStop(0.6, '#4e8cc8');
  sky.addColorStop(1, '#a9c9e2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, S, S);
  field(2200, () => [r() * S, r() * S * 0.68], (x, y) => (y < S * 0.25 ? '#2361ad' : y < S * 0.5 ? '#4a87c4' : '#9ec2de'));
  // cumulus
  const puff = (x0, y0, w, h, n) =>
    field(n, () => [x0 + (r() - 0.5) * w, y0 + (r() - 0.5) * h * (1 - Math.abs(r() - 0.5))], (x, y) => (y > y0 + h * 0.15 ? pick(['#b9c7d6', '#d4dde6']) : pick(['#ffffff', '#f2f4f5', '#e6ebef'])), { len: [20, 60], wid: [14, 30], ang: [-1, 1] });
  puff(S * 0.72, S * 0.3, S * 0.3, S * 0.12, 500);
  puff(S * 0.3, S * 0.18, S * 0.24, S * 0.08, 300);
  // a plane and its contrail
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = '#f4f6f8';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(S * 0.98, S * 0.1);
  ctx.lineTo(S * 0.74, S * 0.17);
  ctx.stroke();
  poly([[0.735, 0.168], [0.71, 0.177], [0.735, 0.174]], '#22272e');
  poly([[0.727, 0.171], [0.722, 0.16], [0.718, 0.172]], '#22272e');

  // downtown towers in haze (left background)
  const towers = [[0.04, 0.36, 0.06], [0.1, 0.3, 0.05], [0.15, 0.4, 0.07], [0.21, 0.33, 0.04]];
  for (const [x, y, w] of towers) {
    poly([[x, y], [x + w, y], [x + w, 0.62], [x, 0.62]], '#6f8fb3', 0.95);
    field(120, () => [(x + r() * w) * S, (y + r() * (0.62 - y)) * S], ['#7c9bbd', '#6a88aa', '#89a6c4'], { len: [10, 30], wid: [6, 10], ang: [1.45, 1.7] });
  }

  // street in perspective toward the right
  poly([[0, 0.66], [1, 0.6], [1, 1], [0, 1]], '#b7a68b');
  field(1600, () => [r() * S, S * (0.62 + r() * 0.38)], (x, y) => (y < S * 0.75 ? pick(['#c2b195', '#ad9c80']) : pick(['#9c8b70', '#b5a387', '#8a7a61'])), { len: [30, 120], wid: [8, 18], ang: [-0.1, 0.05] });
  poly([[0.35, 0.72], [1, 0.66], [1, 0.79], [0.45, 0.86]], '#575a5c', 0.9); // asphalt
  field(500, () => [S * (0.45 + r() * 0.55), S * (0.68 + r() * 0.12)], ['#5c5f62', '#4b4e51', '#6a6d70'], { len: [30, 100], wid: [6, 14], ang: [-0.12, -0.02] });

  // motel: low pink block + vertical sign
  poly([[0.62, 0.55], [0.86, 0.54], [0.86, 0.66], [0.62, 0.67]], '#d99b9b');
  field(260, () => [S * (0.62 + r() * 0.24), S * (0.55 + r() * 0.11)], ['#e0a6a3', '#c98886', '#efc1b9'], { len: [14, 40], wid: [6, 12] });
  for (let i = 0; i < 6; i++) poly([[0.635 + i * 0.037, 0.59], [0.655 + i * 0.037, 0.59], [0.655 + i * 0.037, 0.635], [0.635 + i * 0.037, 0.635]], '#3d2a33', 0.85);
  poly([[0.875, 0.38], [0.915, 0.38], [0.915, 0.6], [0.875, 0.6]], '#2a2a2e');
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffb347';
  ctx.font = `bold ${S * 0.03}px Georgia, serif`;
  ctx.textAlign = 'center';
  'MOTEL'.split('').forEach((ch, i) => ctx.fillText(ch, S * 0.895, S * (0.415 + i * 0.038)));
  ctx.fillStyle = '#2a2a2e';
  ctx.fillRect(S * 0.892, S * 0.6, S * 0.006, S * 0.08);

  // palms
  const palm = (x, base, h, lean) => {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#5a4635';
    ctx.lineCap = 'round';
    ctx.lineWidth = S * 0.006;
    ctx.beginPath();
    ctx.moveTo(x * S, base * S);
    ctx.quadraticCurveTo((x + lean * 0.5) * S, (base - h * 0.5) * S, (x + lean) * S, (base - h) * S);
    ctx.stroke();
    const tx = (x + lean) * S;
    const ty = (base - h) * S;
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI / 2 + (i - 5) * 0.42 + (r() - 0.5) * 0.2;
      const L = S * (0.05 + r() * 0.03);
      for (let k = 0; k < 9; k++) {
        const t = k / 9;
        const px = tx + Math.cos(a) * L * t;
        const py = ty + Math.sin(a) * L * t + t * t * L * 0.55;
        dab(px, py, 22, 9 - t * 5, a + Math.PI / 2 + (r() - 0.5), jit(pick(['#2f4a2a', '#3c5a33', '#253c22'])), 0.95);
      }
    }
  };
  palm(0.58, 0.64, 0.36, -0.01);
  palm(0.68, 0.62, 0.42, 0.012);
  palm(0.8, 0.6, 0.3, 0.006);
  palm(0.95, 0.61, 0.39, -0.008);

  // power poles and sagging wires
  const poles = [0.55, 0.77, 0.99];
  ctx.globalAlpha = 1;
  for (const x of poles) {
    ctx.fillStyle = '#3e3229';
    ctx.fillRect(x * S, S * 0.3, S * 0.007, S * 0.36);
    ctx.fillRect((x - 0.025) * S, S * 0.32, S * 0.057, S * 0.006);
  }
  ctx.strokeStyle = 'rgba(30,30,32,0.75)';
  ctx.lineWidth = 2.5;
  for (let w = 0; w < 3; w++) {
    for (let i = 0; i < poles.length - 1; i++) {
      const y = S * (0.323 + w * 0.003);
      ctx.beginPath();
      ctx.moveTo(poles[i] * S + w * 18 - 30, y);
      ctx.quadraticCurveTo(((poles[i] + poles[i + 1]) / 2) * S, y + S * 0.04, poles[i + 1] * S + w * 18 - 30, y);
      ctx.stroke();
    }
  }

  // lowrider, long and low, teal paint, chrome
  const car = (x, y, w) => {
    const h = w * 0.22;
    poly([[x, y], [x + w * 0.04, y - h * 0.55], [x + w * 0.28, y - h * 0.62], [x + w * 0.38, y - h], [x + w * 0.66, y - h], [x + w * 0.76, y - h * 0.62], [x + w, y - h * 0.5], [x + w, y]], '#2f5b5e');
    field(220, () => [S * (x + r() * w), S * (y - r() * h * 0.6)], ['#3a6c70', '#2a4f52', '#4b8185'], { len: [14, 50], wid: [6, 12], ang: [-0.1, 0.1] });
    poly([[x + w * 0.4, y - h * 0.93], [x + w * 0.64, y - h * 0.93], [x + w * 0.72, y - h * 0.64], [x + w * 0.33, y - h * 0.64]], '#1a2a33', 0.95);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#d9dde2';
    ctx.fillRect(x * S, (y - h * 0.18) * S, w * S, S * 0.006);
    for (const wx of [0.2, 0.8]) {
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc((x + w * wx) * S, y * S, w * S * 0.075, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cfd4da';
      ctx.beginPath();
      ctx.arc((x + w * wx) * S, y * S, w * S * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  car(0.66, 0.755, 0.3);

  // a wall on the far left with a red crown tag
  poly([[0, 0.35], [0.2, 0.37], [0.2, 0.7], [0, 0.72]], '#cbb89a');
  field(400, () => [S * r() * 0.2, S * (0.36 + r() * 0.35)], ['#d4c2a3', '#bba787', '#e0d0b3'], { len: [16, 50], wid: [8, 14], ang: [1.4, 1.75] });
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = '#c4161c';
  ctx.lineWidth = S * 0.012;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  [[0.03, 0.6], [0.05, 0.44], [0.08, 0.53], [0.1, 0.42], [0.12, 0.53], [0.15, 0.44], [0.17, 0.6]].forEach(([x, y], i) => (i ? ctx.lineTo(x * S, y * S) : ctx.moveTo(x * S, y * S)));
  ctx.stroke();

  // ── MERCY V. ──
  const cx = S * 0.4;
  // patchwork track jacket: torso and the near arm
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - S * 0.06, S * 0.47);
  ctx.bezierCurveTo(cx - S * 0.22, S * 0.49, cx - S * 0.25, S * 0.6, cx - S * 0.25, S * 0.75);
  ctx.lineTo(cx - S * 0.22, S);
  ctx.lineTo(cx + S * 0.2, S);
  ctx.lineTo(cx + S * 0.24, S * 0.72);
  ctx.bezierCurveTo(cx + S * 0.24, S * 0.56, cx + S * 0.16, S * 0.49, cx + S * 0.05, S * 0.47);
  ctx.closePath();
  ctx.clip();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#16161a';
  ctx.fillRect(0, 0, S, S);
  // panels
  const panels = [
    [[0.13, 0.5], [0.3, 0.55], [0.22, 0.75], [0.12, 0.7]],
    [[0.3, 0.55], [0.45, 0.5], [0.42, 0.68], [0.28, 0.72]],
    [[0.45, 0.5], [0.62, 0.55], [0.64, 0.75], [0.46, 0.7]],
    [[0.2, 0.75], [0.36, 0.72], [0.38, 0.92], [0.16, 0.95]],
    [[0.42, 0.68], [0.6, 0.76], [0.56, 0.95], [0.4, 0.9]],
    [[0.12, 0.8], [0.2, 0.75], [0.16, 1], [0.12, 1]],
  ];
  const panelColors = ['#d8d2c4', '#b3202a', '#16161a', '#d8d2c4', '#b3202a', '#2b2c34'];
  panels.forEach((p, i) => {
    poly(p, panelColors[i]);
    const xs = p.map((q) => q[0]);
    const ys = p.map((q) => q[1]);
    field(160, () => [S * (Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs))), S * (Math.min(...ys) + r() * (Math.max(...ys) - Math.min(...ys)))], [panelColors[i]], { len: [16, 50], wid: [8, 16], ang: [-1, 1], alpha: 0.5 });
  });
  // zip and seams
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#0b0b0d';
  ctx.lineWidth = 6;
  panels.forEach((p) => {
    ctx.beginPath();
    p.forEach(([x, y], i) => (i ? ctx.lineTo(x * S, y * S) : ctx.moveTo(x * S, y * S)));
    ctx.closePath();
    ctx.stroke();
  });
  ctx.restore();

  // neck and head, turned three-quarters toward us
  const hx = cx + S * 0.01;
  const hy = S * 0.36;
  poly([[0.375, 0.42], [0.43, 0.42], [0.435, 0.5], [0.37, 0.5]], '#15171d');
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#14161c';
  ctx.beginPath();
  ctx.ellipse(hx, hy, S * 0.072, S * 0.095, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  field(500, () => [hx + (r() - 0.5) * S * 0.16, hy + (r() - 0.5) * S * 0.2], (x, y) => ((x - hx) < -S * 0.02 && (y - hy) < S * 0.03 ? pick(['#353c4b', '#2a303d']) : pick(['#14161c', '#1c2029', '#0f1116', '#232835'])), { len: [10, 34], wid: [6, 12], ang: [-1.5, 1.5], alpha: 0.85 });
  ctx.restore();
  // crown of spikes
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0b0c0f';
  ctx.beginPath();
  const spikes = [[-0.075, 0.0], [-0.09, -0.07], [-0.05, -0.04], [-0.04, -0.12], [-0.01, -0.06], [0.015, -0.14], [0.03, -0.065], [0.06, -0.11], [0.065, -0.04], [0.095, -0.06], [0.075, 0.0]];
  spikes.forEach(([dx, dy], i) => (i ? ctx.lineTo(hx + dx * S, hy - S * 0.06 + dy * S) : ctx.moveTo(hx + dx * S, hy - S * 0.06 + dy * S)));
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 40; i++) {
    poly([[(hx + (r() - 0.5) * S * 0.14) / S, (hy - S * 0.08 - r() * S * 0.08) / S], [(hx + (r() - 0.5) * S * 0.14) / S, (hy - S * 0.08 - r() * S * 0.08) / S], [(hx + (r() - 0.5) * S * 0.14) / S, (hy - S * 0.08 - r() * S * 0.08) / S]], pick(['#1e2128', '#2a2e37']), 0.35);
  }
  // eyes: red, low and cold
  for (const [ex, sc] of [[-0.028, 1], [0.022, 0.8]]) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e0303a';
    ctx.beginPath();
    ctx.ellipse(hx + ex * S, hy - S * 0.005, S * 0.012 * sc, S * 0.0055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0507';
    ctx.beginPath();
    ctx.arc(hx + ex * S + 3, hy - S * 0.004, S * 0.004, 0, Math.PI * 2);
    ctx.fill();
  }
  dab(hx - S * 0.004, hy + S * 0.03, 50, 10, 1.5, '#2c3341', 0.8);
  dab(hx - S * 0.002, hy + S * 0.058, 60, 12, 0.05, '#08090c', 0.95);
  // silver chain
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#dfe3e8';
  ctx.lineWidth = 7;
  ctx.setLineDash([12, 7]);
  ctx.beginPath();
  ctx.moveTo(cx - S * 0.04, S * 0.48);
  ctx.quadraticCurveTo(cx, S * 0.6, cx + S * 0.045, S * 0.48);
  ctx.stroke();
  ctx.setLineDash([]);

  // impasto emboss
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  const lum = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) lum[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
  for (let y = 2; y < S - 2; y++) {
    for (let x = 2; x < S - 2; x++) {
      const i = y * S + x;
      const e = (lum[i - S * 2 - 2] - lum[i + S * 2 + 2]) * 0.3;
      d[i * 4] += e;
      d[i * 4 + 1] += e;
      d[i * 4 + 2] += e;
    }
  }
  ctx.putImageData(img, 0, 0);

  // printed on crumpled paper
  ctx.globalAlpha = 0.55;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(crumpledPaper(1024, 1024, { cell: 30, seed: 9 }), 0, 0, S, S);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  return c;
}
