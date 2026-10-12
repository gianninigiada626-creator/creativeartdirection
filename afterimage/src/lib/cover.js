import { ARTIST, CATALOG, TITLE } from '../data/album.js';

// Deterministic PRNG so the artwork is the same print every time.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A liquid, slightly deformed disc path. */
function blobPath(ctx, x, y, r, phase) {
  ctx.beginPath();
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const d = 1 + 0.07 * Math.sin(a * 3 + phase) + 0.04 * Math.sin(a * 5 - phase * 1.7) + 0.025 * Math.sin(a * 9 + phase * 0.6);
    const px = x + Math.cos(a) * r * d;
    const py = y + Math.sin(a) * r * d * 1.06;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Dark chrome blob lit by one tall softbox (left) and the red safelight (lower right). */
function chromeBlob(ctx, x, y, r, phase, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  blobPath(ctx, x, y, r, phase);
  const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r * 1.1);
  body.addColorStop(0, '#3a3d42');
  body.addColorStop(0.5, '#111214');
  body.addColorStop(1, '#030303');
  ctx.fillStyle = body;
  ctx.fill();
  ctx.clip();

  // softbox reflection
  ctx.filter = `blur(${Math.max(1, r * 0.02)}px)`;
  const strip = ctx.createLinearGradient(x - r * 0.62, 0, x - r * 0.38, 0);
  strip.addColorStop(0, 'rgba(240,240,236,0)');
  strip.addColorStop(0.5, 'rgba(240,240,236,0.95)');
  strip.addColorStop(1, 'rgba(240,240,236,0)');
  ctx.fillStyle = strip;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.5, y - r * 0.05, r * 0.12, r * 0.78, 0.08, 0, Math.PI * 2);
  ctx.fill();

  // overhead strip
  ctx.fillStyle = 'rgba(201,204,209,0.55)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.05, y - r * 0.74, r * 0.5, r * 0.06, -0.05, 0, Math.PI * 2);
  ctx.fill();

  // safelight
  ctx.filter = `blur(${Math.max(2, r * 0.08)}px)`;
  ctx.fillStyle = 'rgba(211,18,26,0.85)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.55, y + r * 0.62, r * 0.42, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * The AFTERIMAGE cover: a rear-curtain flash long exposure.
 * The object drags a smear of light, then the flash freezes it sharp at the end of the exposure,
 * with a red double exposure slipping off register.
 */
export async function drawCover(canvas, size = 1200) {
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(1203);
  const S = size;

  try {
    await Promise.all([
      document.fonts.load(`500 ${S * 0.02}px "JetBrains Mono Variable"`),
      document.fonts.load(`800 ${S * 0.05}px "Archivo Variable"`),
    ]);
  } catch {
    /* fall back to system fonts */
  }

  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, S, S);

  const cx = S * 0.54;
  const cy = S * 0.47;
  const r = S * 0.24;

  // 1. the long exposure smear
  const passes = 70;
  for (let i = 0; i < passes; i++) {
    const t = i / passes;
    const x = cx - S * 0.34 * (1 - t) ** 1.3;
    const y = cy + S * 0.16 * (1 - t) ** 1.2 - S * 0.04 * Math.sin(t * Math.PI);
    chromeBlob(ctx, x, y, r * (0.92 + t * 0.08), 0.6 + t * 2, 0.05 + t * 0.03);
  }

  // 2. the flash: sharp final frame
  chromeBlob(ctx, cx, cy, r, 2.6, 1);

  // 3. red double exposure, off register
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.5;
  ctx.filter = `blur(${S * 0.003}px)`;
  blobPath(ctx, cx + S * 0.035, cy - S * 0.022, r * 1.01, 2.6);
  ctx.strokeStyle = '#d3121a';
  ctx.lineWidth = S * 0.004;
  ctx.stroke();
  ctx.restore();

  // 4. vignette
  const v = ctx.createRadialGradient(S / 2, S / 2, S * 0.25, S / 2, S / 2, S * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, S, S);

  // 5. silver halide grain
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 34;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);

  // 6. typography — small, exact, like an exposure log
  const m = S * 0.045;
  ctx.fillStyle = '#e8e6e1';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `500 ${S * 0.017}px "JetBrains Mono Variable", monospace`;
  ctx.fillText(ARTIST, m, m + S * 0.012);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#6e737b';
  ctx.fillText(CATALOG, S - m, m + S * 0.012);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8e6e1';
  ctx.font = `800 ${S * 0.052}px "Archivo Variable", sans-serif`;
  ctx.fillText(TITLE, m, S - m);

  // safelight rule
  ctx.fillStyle = '#d3121a';
  ctx.fillRect(m, S - m - S * 0.075, S * 0.12, Math.max(2, S * 0.003));

  // film edge print
  ctx.save();
  ctx.translate(S - m * 0.55, S - m);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(201,204,209,0.45)';
  ctx.font = `500 ${S * 0.012}px "JetBrains Mono Variable", monospace`;
  ctx.fillText('SAFELIGHT 400   ▸ 24   ▸ 24A   1/60s', 0, 0);
  ctx.restore();

  return canvas;
}
