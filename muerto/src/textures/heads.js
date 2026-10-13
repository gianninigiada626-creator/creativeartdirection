import { canvas, rng } from './util.js';

// PLACEHOLDER heads in the painted-collage style: oversized heads cut out with a clean paper edge,
// skin airbrushed like dark clay, lit softly from the front-left, heavy-lidded and still.
// Three views: front, three-quarter (turned toward image-left; mirror it for the other side) and back.
// They are replaced by the artist's own heads when those arrive (see README).

const W = 512;
const H = 640;

function rgbaOf(color) {
  const v = color.match(/rgba?\(([^)]+)\)/)[1].split(',').map(Number);
  return [v[0], v[1], v[2], v[3] ?? 1];
}

/** Airbrush: a soft ellipse made with a radial gradient. */
function air(ctx, x, y, rx, ry, color, feather = 0.6, rot = 0) {
  const [r, g, b, a] = rgbaOf(color);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
  grad.addColorStop(Math.max(0.01, 1 - feather), `rgba(${r},${g},${b},${a * 0.75})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A soft stroke along a quadratic curve (lids, lips, folds). */
function stroke(ctx, pts, width, color, blur = 2) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 3) ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
  else pts.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.stroke();
  ctx.restore();
}

function geometry(p) {
  const cx = W / 2;
  const cy = H * 0.57;
  const rx = 138 * p.width;
  const ry = 188 * p.length;
  const t = p.turn ?? 0;
  // three-quarter: features slide toward the far side, the far half compresses
  const X = (dx) => cx - t * rx * 0.42 + (dx < 0 ? dx * (1 - 0.58 * t) : dx * (1 + 0.08 * t));
  return { cx, cy, rx, ry, t, X };
}

function headPath(ctx, g, p) {
  const { cx, cy, rx, ry, t } = g;
  ctx.beginPath();
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = Math.sin(a);
    const c = Math.cos(a);
    let k = 1;
    if (s > 0) k -= 0.2 * p.jawTaper * Math.pow(s, 3); // jaw narrows to the chin
    k += 0.04 * Math.exp(-Math.pow((s - 0.05) / 0.18, 2)); // cheekbones
    let x = cx + c * rx * k;
    if (t) x += (c < 0 ? -0.12 : 0.03) * t * rx * Math.abs(c); // far side slightly flatter
    const y = cy + s * ry * (s < 0 ? 1.02 : 1);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function earPath(ctx, g, side) {
  const { cy, rx, X } = g;
  const x = X(side * rx * 0.97);
  ctx.moveTo(x + 22, cy - 6);
  ctx.ellipse(x, cy - 6, 24, 46, side * 0.15, 0, Math.PI * 2);
}

function hairPath(ctx, g, p, r) {
  const { cx, cy, rx, ry, t } = g;
  const top = cy - ry * 1.02;
  ctx.beginPath();
  switch (p.hair) {
    case 'crop':
      ctx.ellipse(cx - t * 8, cy - ry * 0.5, rx * 1.03, ry * 0.58, 0, Math.PI, Math.PI * 2);
      ctx.lineTo(cx + rx * 1.03, cy - ry * 0.42);
      ctx.lineTo(cx - rx * 1.03, cy - ry * 0.42);
      break;
    case 'flattop':
      ctx.moveTo(cx - rx * 1.02, cy - ry * 0.35);
      ctx.lineTo(cx - rx * 0.96, top - ry * 0.12);
      ctx.lineTo(cx + rx * 0.96, top - ry * 0.12);
      ctx.lineTo(cx + rx * 1.02, cy - ry * 0.35);
      break;
    case 'afro':
      ctx.ellipse(cx - t * 10, cy - ry * 0.62, rx * 1.38, ry * 0.82, 0, 0, Math.PI * 2);
      break;
    case 'cap':
      ctx.ellipse(cx, cy - ry * 0.48, rx * 1.06, ry * 0.6, 0, Math.PI, Math.PI * 2);
      ctx.moveTo(cx - rx * 0.1, cy - ry * 0.52);
      ctx.ellipse(cx + rx * 0.5 - t * rx * 0.9, cy - ry * 0.5, rx * 0.78, ry * 0.11, -0.05, 0, Math.PI * 2);
      break;
    case 'crown': {
      // the artist's crown of spikes, cut from black paper: a jagged band over the dome
      const ex = rx * 1.02;
      const ey = ry * 0.88;
      const oy = cy - ry * 0.16;
      const n = 14;
      const a0 = Math.PI + 0.12;
      const a1 = Math.PI * 2 - 0.12;
      for (let i = 0; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n;
        let x = cx + Math.cos(a) * ex;
        let y = oy + Math.sin(a) * ey;
        if (i % 2 === 1) {
          const nxv = Math.cos(a) / ex;
          const nyv = Math.sin(a) / ey;
          const l = Math.hypot(nxv, nyv);
          const len = ry * (0.34 + r() * 0.2);
          x += (nxv / l) * len * 0.75;
          y += (nyv / l) * len - len * 0.25;
        }
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      // hairline across the forehead, back to the start
      ctx.quadraticCurveTo(cx + rx * 0.5, cy - ry * 0.5, cx, cy - ry * 0.56);
      ctx.quadraticCurveTo(cx - rx * 0.5, cy - ry * 0.5, cx + Math.cos(a0) * ex, oy + Math.sin(a0) * ey);
      break;
    }
    default:
      return false;
  }
  ctx.closePath();
  return true;
}

/**
 * p: { seed, width, length, jawTaper, tone (0 dark → 1 light), hair, nose, lips, eyes, brow,
 *      moustache, beard, lines, eyeColor, turn }
 */
function paint(p, { back = false } = {}) {
  p = { seed: 1, width: 1, length: 1, jawTaper: 1, tone: 0.25, hair: 'crop', nose: 1, lips: 1, eyes: 1, brow: 1, lines: 0, turn: 0, ...p };
  if (back) p.turn = 0;
  const [c, ctx] = canvas(W, H);
  const r = rng(p.seed);
  const g = geometry(p);
  const { cx, cy, rx, ry, t, X } = g;
  const b = Math.round(40 + p.tone * 66);
  const skin = `rgb(${b},${b + 2},${b + 5})`;
  const hi = (a) => `rgba(${Math.min(255, b + 120)},${Math.min(255, b + 122)},${Math.min(255, b + 124)},${a})`;
  const lo = (a) => `rgba(${Math.max(0, b - 30)},${Math.max(0, b - 29)},${Math.max(0, b - 26)},${a})`;

  // ── the cut-out ──
  headPath(ctx, g, p);
  if (!back) {
    if (t < 0.4) earPath(ctx, g, -1);
    earPath(ctx, g, 1);
  } else {
    earPath(ctx, g, -1);
    earPath(ctx, g, 1);
  }
  ctx.fillStyle = skin;
  ctx.fill();
  const hairOn = hairPath(ctx, g, p, rng(p.seed));
  if (hairOn) {
    ctx.fillStyle = '#0c0d0f';
    ctx.fill();
  }

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';

  if (back) {
    air(ctx, cx - rx * 0.35, cy - ry * 0.35, rx * 0.6, ry * 0.5, hi(0.14));
    air(ctx, cx + rx * 0.5, cy + ry * 0.2, rx * 0.7, ry * 0.9, lo(0.8));
    air(ctx, cx, cy + ry * 0.85, rx * 0.5, ry * 0.25, hi(0.12));
    if (hairOn) {
      ctx.fillStyle = 'rgba(12,13,15,0.92)';
      ctx.beginPath();
      ctx.ellipse(cx, cy - ry * 0.25, rx * 1.04, ry * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    rim(ctx, g, p, back);
    return c;
  }

  // ── broad form: light from front-left, core shadow on the far right, under the jaw ──
  for (let i = 0; i < 14; i++) air(ctx, cx + (r() - 0.5) * rx * 1.6, cy + (r() - 0.5) * ry * 1.6, 30 + r() * 50, 30 + r() * 50, r() < 0.5 ? hi(0.05) : lo(0.12), 0.9); // mottling
  air(ctx, X(rx * 0.66), cy + ry * 0.05, rx * 0.72, ry * 1.0, lo(1), 0.65);
  air(ctx, X(-rx * 0.25), cy - ry * 0.42, rx * 0.6, ry * 0.3, hi(0.62), 0.75); // forehead
  air(ctx, X(-rx * 0.05), cy - ry * 0.55, rx * 0.35, ry * 0.12, hi(0.35), 0.8);
  air(ctx, X(0), cy + ry * 0.94, rx * 0.85, ry * 0.26, lo(0.95), 0.55); // under the jaw
  air(ctx, X(-rx * 0.55), cy + ry * 0.06, rx * 0.3, ry * 0.16, hi(0.78), 0.75); // near cheekbone
  air(ctx, X(-rx * 0.5), cy + ry * 0.3, rx * 0.26, ry * 0.14, lo(0.55), 0.8); // hollow under it
  air(ctx, X(rx * 0.52), cy + ry * 0.06, rx * 0.2, ry * 0.12, hi(0.4 * (1 - t)), 0.75); // far cheekbone
  air(ctx, X(-rx * 0.82), cy - ry * 0.25, rx * 0.16, ry * 0.2, lo(0.5), 0.8); // temple
  air(ctx, X(0), cy + ry * 0.7, rx * 0.26, ry * 0.12, hi(0.55), 0.75); // chin
  air(ctx, X(-rx * 0.78), cy + ry * 0.4, rx * 0.2, ry * 0.3, lo(0.45), 0.8); // near jaw side
  air(ctx, X(rx * 0.92), cy + ry * 0.2, rx * 0.08, ry * 0.5, hi(0.16), 0.8); // bounce on the far edge

  // ── brow and sockets ──
  const ey = cy - ry * 0.12;
  const ex = rx * 0.4;
  const farEye = 1 - 0.3 * t;
  air(ctx, X(-ex), ey + 4, 46 * p.eyes, 26, lo(0.95), 0.7);
  air(ctx, X(ex), ey + 4, 46 * p.eyes * farEye, 26, lo(0.95), 0.7);
  air(ctx, X(-ex), ey - 34 * p.brow, 56, 15, hi(0.6), 0.8); // brow ridge catches light
  air(ctx, X(ex * 0.9), ey - 34 * p.brow, 42 * farEye, 12, hi(0.32), 0.85);
  air(ctx, X(0), ey - 18, 18, 30, hi(0.25), 0.9); // glabella

  // eyes: heavy lids, a wet glint
  for (const [s, sc] of [[-1, 1], [1, farEye]]) {
    const x = X(s * ex);
    const w = 24 * p.eyes * sc;
    ctx.save();
    ctx.fillStyle = p.eyeColor ?? 'rgba(178,176,170,0.55)';
    ctx.beginPath();
    ctx.ellipse(x, ey + 6, w, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#060607';
    ctx.beginPath();
    ctx.arc(x - t * 6, ey + 7, 5.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // upper lid: a lit, heavy crescent
    stroke(ctx, [[x - w * 1.1, ey + 2], [x, ey - 11], [x + w * 1.1, ey + 2]], 10, hi(s < 0 ? 0.8 : 0.5), 2.5);
    stroke(ctx, [[x - w, ey + 4], [x, ey - 3], [x + w, ey + 4]], 3, 'rgba(0,0,0,0.8)', 1);
    // lower lid and bag
    stroke(ctx, [[x - w * 0.9, ey + 15], [x, ey + 21], [x + w * 0.9, ey + 15]], 5, hi(0.18), 3);
    air(ctx, x + 4, ey + 4, 3, 2, 'rgba(255,255,255,0.7)', 0.4);
  }

  // ── nose ──
  const nx = X(-t * rx * 0.12);
  const ny = cy + ry * 0.22;
  stroke(ctx, [[X(-4), ey + 4], [nx - 6, ny - 36], [nx - 4, ny - 6]], 13 * p.nose, hi(0.62), 5); // bridge
  air(ctx, nx - 2, ny - 2, 22 * p.nose, 16, hi(0.8), 0.7); // tip
  air(ctx, nx - 28 * p.nose * (1 - 0.3 * t), ny + 8, 17 * p.nose, 13, lo(0.95), 0.6); // near wing
  air(ctx, nx + 28 * p.nose, ny + 8, 17 * p.nose * (1 - 0.3 * t), 13, lo(0.95), 0.6); // far wing
  air(ctx, nx + 10, ny + 26, 44 * p.nose, 11, lo(0.95), 0.6); // cast shadow under the nose
  air(ctx, nx - 18 * p.nose, ny + 10, 7, 5, 'rgba(0,0,0,0.9)', 0.4); // nostril
  air(ctx, nx + 18 * p.nose, ny + 10, 7 * (1 - 0.3 * t), 5, 'rgba(0,0,0,0.9)', 0.4);
  if (p.lines) {
    stroke(ctx, [[nx - 40, ny + 14], [X(-rx * 0.48), cy + ry * 0.45], [X(-rx * 0.4), cy + ry * 0.62]], 4, `rgba(0,0,0,${0.45 * p.lines})`, 2);
    stroke(ctx, [[nx + 40, ny + 14], [X(rx * 0.48), cy + ry * 0.45], [X(rx * 0.4), cy + ry * 0.62]], 4, `rgba(0,0,0,${0.35 * p.lines})`, 2);
    for (let i = 0; i < 3; i++) stroke(ctx, [[X(-rx * 0.45), cy - ry * 0.52 + i * 13], [X(0), cy - ry * 0.56 + i * 13], [X(rx * 0.45), cy - ry * 0.52 + i * 13]], 2.5, `rgba(0,0,0,${0.3 * p.lines})`, 1.5);
  }

  // ── mouth ──
  const my = cy + ry * 0.5;
  const mw = 50 * p.lips;
  air(ctx, X(0), my - 10, mw, 13 * p.lips, lo(0.85), 0.7); // upper lip
  stroke(ctx, [[X(-mw * 0.95), my], [X(0), my + 5], [X(mw * 0.95), my]], 5, 'rgba(0,0,0,0.92)', 1.5);
  air(ctx, X(-6), my + 13 * p.lips, mw * 0.65, 9 * p.lips, hi(0.65), 0.75); // lower lip shine
  air(ctx, X(-mw), my + 2, 8, 6, 'rgba(0,0,0,0.6)', 0.6); // mouth corners
  air(ctx, X(mw), my + 2, 8, 6, 'rgba(0,0,0,0.6)', 0.6);
  air(ctx, X(0), my + 30 * p.lips, mw * 0.6, 9, lo(0.7), 0.7); // under the lip
  if (p.moustache) {
    ctx.fillStyle = '#0b0c0d';
    ctx.beginPath();
    ctx.moveTo(X(-62), my - 2);
    ctx.quadraticCurveTo(X(-30), my - 34, X(0), my - 20);
    ctx.quadraticCurveTo(X(30), my - 34, X(62), my - 2);
    ctx.quadraticCurveTo(X(0), my - 12, X(-62), my - 2);
    ctx.fill();
  }
  if (p.beard) {
    ctx.fillStyle = 'rgba(10,10,11,0.93)';
    ctx.beginPath();
    ctx.ellipse(X(0), cy + ry * 0.72, rx * 0.72, ry * 0.34, 0, 0, Math.PI);
    ctx.fill();
  }

  // ear shading
  air(ctx, X(rx * 0.97), cy - 6, 18, 36, lo(0.7), 0.7);
  if (t < 0.4) air(ctx, X(-rx * 0.97), cy - 10, 14, 30, hi(0.3), 0.7);

  // hair keeps a little sheen
  if (hairOn) {
    ctx.save();
    hairPath(ctx, g, p, rng(p.seed));
    ctx.clip();
    ctx.fillStyle = '#0c0d0f';
    ctx.fillRect(0, 0, W, H);
    air(ctx, X(-rx * 0.4), cy - ry * 0.9, rx * 0.5, ry * 0.2, 'rgba(120,124,130,0.18)', 0.9);
    ctx.restore();
  }

  // airbrush grain
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] === 0) continue;
    const n = (r() - 0.5) * 10;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  ctx.restore();
  rim(ctx, g, p, back);
  return c;
}

/** The clean paper edge of the cut-out. */
function rim(ctx, g, p) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.translate(W / 2, H * 0.55);
  ctx.scale(1.018, 1.014);
  ctx.translate(-W / 2, -H * 0.55);
  headPath(ctx, g, p);
  earPath(ctx, g, 1);
  if ((g.t ?? 0) < 0.4) earPath(ctx, g, -1);
  ctx.fillStyle = 'rgba(214,212,204,0.95)';
  ctx.fill();
  if (hairPath(ctx, g, p, rng(p.seed))) ctx.fill();
  ctx.restore();
}

const CACHE = new Map();

/** Cached head painter. opts.back for the back of the head; p.turn for a three-quarter view. */
export function drawHead(p = {}, opts = {}) {
  const key = JSON.stringify([p, opts]);
  if (!CACHE.has(key)) CACHE.set(key, paint(p, opts));
  return CACHE.get(key);
}

export const HEADS = {
  mercy: { seed: 11, width: 0.92, length: 1.04, jawTaper: 1.15, tone: 0.12, hair: 'crown', nose: 1.05, lips: 1.05, eyes: 1, brow: 1.15, eyeColor: 'rgba(214,40,48,0.95)' },
  barber: { seed: 23, width: 1.0, length: 1.04, jawTaper: 0.8, tone: 0.22, hair: 'crown', nose: 1.2, lips: 0.95, eyes: 0.85, brow: 1.3, lines: 0.7 },
  client: { seed: 29, width: 0.96, length: 1, jawTaper: 1, tone: 0.3, hair: 'crop', nose: 1, lips: 1, eyes: 0.9, brow: 1 },
  barista: { seed: 31, width: 1.1, length: 0.94, jawTaper: 0.5, tone: 0.5, hair: 'none', nose: 1.3, lips: 0.85, eyes: 0.85, brow: 1, moustache: true, lines: 1 },
  driver: { seed: 47, width: 1, length: 1, jawTaper: 0.9, tone: 0.2, hair: 'cap', nose: 1.1, lips: 1.1, eyes: 0.9, brow: 1, beard: true },
  oldwoman: { seed: 53, width: 0.9, length: 0.95, jawTaper: 1.3, tone: 0.55, hair: 'afro', nose: 1, lips: 0.75, eyes: 0.8, brow: 0.8, lines: 1.2 },
  kid: { seed: 61, width: 0.95, length: 0.88, jawTaper: 1.2, tone: 0.18, hair: 'afro', nose: 0.85, lips: 0.95, eyes: 1.1, brow: 0.8 },
  stranger: { seed: 71, width: 1.12, length: 1.12, jawTaper: 0.45, tone: 0.05, hair: 'none', nose: 1.35, lips: 1.25, eyes: 0.75, brow: 1.45, eyeColor: 'rgba(235,235,230,0.95)' },
  old: { seed: 83, width: 1.05, length: 1, jawTaper: 0.7, tone: 0.42, hair: 'none', nose: 1.35, lips: 0.85, eyes: 0.8, brow: 1.2, lines: 1.3 },
};
