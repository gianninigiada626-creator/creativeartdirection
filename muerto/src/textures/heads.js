import { canvas, rng } from './util.js';
import { crumpledPaper } from './paper.js';

let FACETS = null;

// PLACEHOLDER heads in the collage-sculpture style: cut-paper silhouettes, glossy dark clay,
// heavy-lidded faces lit from the upper left. Replaced by the artist's heads when they arrive.

const W = 512;
const H = 640;

function silhouette(ctx, p, r, { back = false } = {}) {
  // cut-paper outline: a jaw-weighted oval, ears, and a hair mass; edges slightly jagged
  const cx = W / 2;
  const cy = H * 0.54;
  const rx = 150 * p.width;
  const ry = 205 * p.length;
  ctx.beginPath();
  const n = 46;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const jaw = Math.sin(a) > 0 ? 1 - 0.18 * p.jawTaper * Math.pow(Math.sin(a), 3) : 1;
    const jag = 1 + (r() - 0.5) * 0.025;
    const x = cx + Math.cos(a) * rx * jaw * jag;
    const y = cy + Math.sin(a) * ry * jag;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  // ears
  for (const s of [-1, 1]) {
    ctx.moveTo(cx + s * rx * 0.95, cy - 20);
    ctx.ellipse(cx + s * rx * 0.98, cy, 26, 48, 0, 0, Math.PI * 2);
  }
  return { cx, cy, rx, ry, back };
}

function hairShape(ctx, g, p, r) {
  const { cx, cy, rx, ry } = g;
  ctx.beginPath();
  switch (p.hair) {
    case 'crop':
      ctx.ellipse(cx, cy - ry * 0.42, rx * 1.02, ry * 0.62, 0, Math.PI, Math.PI * 2);
      break;
    case 'flattop':
      ctx.moveTo(cx - rx * 1.02, cy - ry * 0.3);
      ctx.lineTo(cx - rx * 0.98, cy - ry * 1.08);
      ctx.lineTo(cx + rx * 0.98, cy - ry * 1.08);
      ctx.lineTo(cx + rx * 1.02, cy - ry * 0.3);
      ctx.closePath();
      break;
    case 'afro':
      ctx.ellipse(cx, cy - ry * 0.55, rx * 1.35, ry * 0.85, 0, 0, Math.PI * 2);
      break;
    case 'spikes': {
      ctx.moveTo(cx - rx, cy - ry * 0.35);
      const n = 7;
      for (let i = 0; i <= n; i++) {
        const x = cx - rx + (i / n) * rx * 2;
        const tip = i % 2 === 0 ? 1.0 : 1.55 + r() * 0.2;
        ctx.lineTo(x, cy - ry * tip);
      }
      ctx.lineTo(cx + rx, cy - ry * 0.35);
      ctx.closePath();
      break;
    }
    case 'crown': {
      // the artist's crown of spikes: a jagged, slightly irregular star of hair
      const n = 9;
      ctx.moveTo(cx - rx * 1.02, cy - ry * 0.32);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = cx - rx * 1.05 + t * rx * 2.1;
        const arc = Math.sin(t * Math.PI);
        const tip = i % 2 === 1;
        const y = cy - ry * (0.62 + arc * 0.32) - (tip ? ry * (0.35 + r() * 0.22) * (0.6 + arc * 0.5) : 0);
        ctx.lineTo(x + (tip ? (t - 0.5) * rx * 0.25 : 0), y);
      }
      ctx.lineTo(cx + rx * 1.02, cy - ry * 0.32);
      ctx.closePath();
      break;
    }
    case 'cap':
      ctx.ellipse(cx, cy - ry * 0.45, rx * 1.05, ry * 0.6, 0, Math.PI, Math.PI * 2);
      ctx.moveTo(cx - rx * 0.2, cy - ry * 0.5);
      ctx.ellipse(cx + rx * 0.55, cy - ry * 0.48, rx * 0.75, ry * 0.12, -0.05, 0, Math.PI * 2);
      break;
    default:
      return false;
  }
  return true;
}

function soft(ctx, blur, fn) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  fn();
  ctx.restore();
}

function rgbaOf(color) {
  const v = color.match(/rgba?\(([^)]+)\)/)[1].split(',').map(Number);
  return [v[0], v[1], v[2], v[3] ?? 1];
}

/** A soft ellipse drawn with a radial gradient: the look of a blurred blob without the cost of a blur filter. */
function glow(ctx, x, y, rx, ry, color, feather) {
  const [r, g, b, a] = rgbaOf(color);
  const R = Math.max(rx, ry) + feather;
  const inner = Math.max(0.05, Math.min(rx, ry) / (Math.min(rx, ry) + feather) - 0.15);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((rx + feather) / R, (ry + feather) / R);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
  grad.addColorStop(inner, `rgba(${r},${g},${b},${a * 0.8})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function blob(ctx, x, y, rx, ry, color, rot = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a head. p: { seed, width, length, jawTaper, tone (0 dark → 1 light), hair, nose, lips, eyes, brow, moustache, beard, lines }
 */
const CACHE = new Map();

export function drawHead(p = {}, opts = {}) {
  const key = JSON.stringify([p, opts]);
  if (!CACHE.has(key)) CACHE.set(key, paintHead(p, opts));
  return CACHE.get(key);
}

function paintHead(p = {}, { back = false } = {}) {
  p = { seed: 1, width: 1, length: 1, jawTaper: 1, tone: 0.25, hair: 'crop', nose: 1, lips: 1, eyes: 1, brow: 1, moustache: false, beard: false, lines: 0, eyeGlow: 0, ...p };
  const [c, ctx] = canvas(W, H);
  const r = rng(p.seed);
  const base = Math.round(30 + p.tone * 70);
  const skin = `rgb(${base},${base + 1},${base + 3})`;
  const lit = `rgb(${base + 125},${base + 127},${base + 130})`;
  const deep = `rgb(${Math.max(4, base - 28)},${Math.max(4, base - 27)},${Math.max(5, base - 25)})`;

  // 1. silhouette fill
  const g = silhouette(ctx, p, r, { back });
  ctx.fillStyle = skin;
  ctx.fill();
  const hairOn = hairShape(ctx, g, p, r);
  if (hairOn) {
    ctx.fillStyle = '#0d0e10';
    ctx.fill();
  }

  // everything else is painted inside the cut-out
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const { cx, cy, rx, ry } = g;

  if (back) {
    glow(ctx, cx - rx * 0.4, cy - ry * 0.5, rx * 0.5, ry * 0.4, 'rgba(255,255,255,0.12)', 30);
    if (p.hair !== 'none') {
      // the whole back of the head is hair, with the nape showing
      ctx.fillStyle = '#0e0f11';
      ctx.beginPath();
      ctx.ellipse(cx, cy - ry * 0.15, rx * 1.1, ry * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.05})`;
        ctx.fillRect(cx + (r() - 0.5) * rx * 2, cy - ry + r() * ry * 1.6, 2, 5);
      }
    }
    glow(ctx, cx, cy + ry * 0.8, rx * 0.5, ry * 0.25, skin, 18);
    glow(ctx, cx - rx * 0.6, cy - ry * 0.5, rx * 0.25, ry * 0.2, 'rgba(255,255,255,0.18)', 20);
    ctx.restore();
    return c;
  }

  // 2. sculpted light: upper-left key, deep core shadow on the right
  glow(ctx, cx + rx * 0.55, cy + ry * 0.1, rx * 0.6, ry * 0.9, deep, 40);
  glow(ctx, cx - rx * 0.35, cy - ry * 0.45, rx * 0.45, ry * 0.28, lit, 46);
  glow(ctx, cx - rx * 0.5, cy + ry * 0.08, rx * 0.22, ry * 0.14, lit, 26); // cheekbone
  glow(ctx, cx + rx * 0.42, cy + ry * 0.1, rx * 0.12, ry * 0.1, `rgba(${base + 60},${base + 60},${base + 62},0.6)`, 26);
  glow(ctx, cx, cy + ry * 0.78, rx * 0.5, ry * 0.18, deep, 30); // under-jaw

  // 3. brow ridge and eye sockets
  const ey = cy - ry * 0.1;
  const ex = rx * 0.4;
  glow(ctx, cx - ex, ey, 44 * p.eyes, 26, deep, 16);
  glow(ctx, cx + ex, ey, 44 * p.eyes, 26, deep, 16);
  soft(ctx, 10, () => {
    ctx.strokeStyle = lit;
    ctx.lineWidth = 12 * p.brow;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(cx - ex - 46, ey - 26);
    ctx.quadraticCurveTo(cx - ex, ey - 44 * p.brow, cx - 12, ey - 28);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(cx + 12, ey - 28);
    ctx.quadraticCurveTo(cx + ex, ey - 44 * p.brow, cx + ex + 46, ey - 26);
    ctx.stroke();
  });
  // heavy lids, eyes almost closed
  for (const s of [-1, 1]) {
    const x = cx + s * ex;
    const shine = s < 0 ? 0.55 : 0.3;
    soft(ctx, 3, () => {
      ctx.fillStyle = p.eyeColor ?? (p.eyeGlow ? `rgba(235,235,235,${0.75 + p.eyeGlow * 0.25})` : 'rgba(200,200,200,0.55)');
      ctx.beginPath();
      ctx.ellipse(x, ey + 5, 22 * p.eyes, 6 + p.eyeGlow * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    soft(ctx, 2, () => {
      ctx.fillStyle = '#060607';
      ctx.beginPath();
      ctx.arc(x + s * 2, ey + 6, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${base + 110},${base + 110},${base + 112},${shine})`;
      ctx.beginPath();
      ctx.ellipse(x, ey - 6, 26 * p.eyes, 9, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    });
  }

  // 4. nose
  const ny = cy + ry * 0.2;
  soft(ctx, 8, () => {
    ctx.fillStyle = lit;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(cx - 6, ny - 34, 9, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    blob(ctx, cx - 24 * p.nose, ny + 6, 16 * p.nose, 12, deep);
    blob(ctx, cx + 24 * p.nose, ny + 6, 16 * p.nose, 12, deep);
    blob(ctx, cx, ny + 22, 36 * p.nose, 9, deep);
  });
  glow(ctx, cx - 4, ny - 2, 10 * p.nose, 7, `rgba(255,255,255,0.28)`, 4);

  // 5. mouth
  const my = cy + ry * 0.5;
  soft(ctx, 5, () => {
    ctx.fillStyle = deep;
    ctx.beginPath();
    ctx.ellipse(cx, my, 46 * p.lips, 14 * p.lips, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#050506';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 44 * p.lips, my);
    ctx.quadraticCurveTo(cx, my + 4, cx + 44 * p.lips, my);
    ctx.stroke();
  });
  glow(ctx, cx - 10, my + 13 * p.lips, 24 * p.lips, 5, `rgba(255,255,255,0.25)`, 6);

  // 6. age, moustache, beard
  if (p.lines) {
    ctx.strokeStyle = `rgba(0,0,0,${0.35 * p.lines})`;
    ctx.lineWidth = 3;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * 40, ny + 20);
      ctx.quadraticCurveTo(cx + s * 62, my - 6, cx + s * 54, my + 26);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 60, cy - ry * 0.45 + i * 12);
      ctx.quadraticCurveTo(cx, cy - ry * 0.5 + i * 12, cx + 60, cy - ry * 0.45 + i * 12);
      ctx.stroke();
    }
  }
  if (p.moustache) {
    soft(ctx, 2, () => {
      ctx.fillStyle = '#0b0c0d';
      ctx.beginPath();
      ctx.moveTo(cx - 64, my - 2);
      ctx.quadraticCurveTo(cx - 30, my - 34, cx, my - 18);
      ctx.quadraticCurveTo(cx + 30, my - 34, cx + 64, my - 2);
      ctx.quadraticCurveTo(cx, my - 10, cx - 64, my - 2);
      ctx.fill();
    });
  }
  if (p.beard) {
    soft(ctx, 3, () => {
      ctx.fillStyle = 'rgba(10,10,11,0.92)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry * 0.7, rx * 0.72, ry * 0.36, 0, 0, Math.PI);
      ctx.fill();
    });
  }

  // crumpled-paper facets, so the head reads as a collage cut-out
  FACETS ??= crumpledPaper(W, H, { cell: 22, seed: 4, crease: 0.9 });
  // overlay paints transparent pixels too, so keep a copy of the cut-out alpha and restore it
  const [mc, mctx] = canvas(W, H);
  mctx.drawImage(c, 0, 0);
  ctx.globalAlpha = 0.6;
  ctx.globalCompositeOperation = 'overlay';
  ctx.drawImage(FACETS, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mc, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  // hair keeps its facets too
  if (hairOn) {
    ctx.save();
    hairShape(ctx, g, p, rng(p.seed));
    ctx.clip();
    ctx.fillStyle = 'rgba(10,11,13,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // 7. clay gloss specks and paper grain
  for (let i = 0; i < 40; i++) {
    blob(ctx, cx - rx * 0.5 + r() * rx * 0.6, cy - ry * 0.7 + r() * ry * 1.2, 2 + r() * 4, 1 + r() * 2, `rgba(255,255,255,${0.08 + r() * 0.15})`);
  }
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] === 0) continue;
    const n = (r() - 0.5) * 16;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  ctx.restore();

  // 8. cut edge: a thin pale paper rim, like the head was cut from a magazine
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.filter = 'blur(0.6px)';
  ctx.translate(W / 2, H / 2);
  ctx.scale(1.025, 1.02);
  ctx.translate(-W / 2, -H / 2);
  silhouette(ctx, p, rng(p.seed), { back });
  ctx.fillStyle = 'rgba(205,205,200,0.9)';
  ctx.fill();
  if (hairShape(ctx, g, p, rng(p.seed))) ctx.fill();
  ctx.restore();
  return c;
}

export const HEADS = {
  mercy: { seed: 11, width: 0.92, length: 1.04, jawTaper: 1.15, tone: 0.1, hair: 'crown', nose: 1.05, lips: 1.05, eyes: 1, brow: 1.15, eyeGlow: 1, eyeColor: 'rgba(225,38,48,0.95)' },
  barber: { seed: 23, width: 1, length: 1.02, jawTaper: 0.8, tone: 0.22, hair: 'crown', nose: 1.2, lips: 0.9, eyes: 0.85, brow: 1.3, lines: 0.6 },
  client: { seed: 29, width: 0.96, length: 1, jawTaper: 1, tone: 0.3, hair: 'crop', nose: 1, lips: 1, eyes: 0.9, brow: 1 },
  barista: { seed: 31, width: 1.12, length: 0.92, jawTaper: 0.5, tone: 0.55, hair: 'none', nose: 1.3, lips: 0.8, eyes: 0.85, brow: 1, moustache: true, lines: 1 },
  driver: { seed: 47, width: 1, length: 1, jawTaper: 0.9, tone: 0.2, hair: 'cap', nose: 1.1, lips: 1.1, eyes: 0.9, brow: 1, beard: true },
  oldwoman: { seed: 53, width: 0.9, length: 0.95, jawTaper: 1.3, tone: 0.6, hair: 'afro', nose: 1, lips: 0.7, eyes: 0.8, brow: 0.8, lines: 1.2 },
  kid: { seed: 61, width: 0.95, length: 0.85, jawTaper: 1.2, tone: 0.18, hair: 'afro', nose: 0.85, lips: 0.95, eyes: 1.15, brow: 0.8 },
  stranger: { seed: 71, width: 1.15, length: 1.1, jawTaper: 0.4, tone: 0.05, hair: 'none', nose: 1.4, lips: 1.3, eyes: 0.7, brow: 1.4, eyeGlow: 1 },
  old: { seed: 83, width: 1.05, length: 1, jawTaper: 0.7, tone: 0.45, hair: 'none', nose: 1.35, lips: 0.85, eyes: 0.8, brow: 1.2, lines: 1.3 },
};
