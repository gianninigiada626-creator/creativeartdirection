import { canvas, rng } from './util.js';

/**
 * Primed canvas with dry-brush strokes and a fine weave, centred on mid-grey,
 * so the grade can lay it over the picture as relief without shifting its tone.
 */
export function paintedCanvas(W = 1920, H = 1080, seed = 8) {
  const [c, ctx] = canvas(W, H);
  const r = rng(seed);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    const x = r() * W;
    const y = r() * H;
    const len = 40 + r() * 170;
    const a = (r() < 0.7 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.5;
    const dx = Math.cos(a) * len * 0.5;
    const dy = Math.sin(a) * len * 0.5;
    ctx.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.03 + r() * 0.05})` : `rgba(0,0,0,${0.03 + r() * 0.05})`;
    ctx.lineWidth = 5 + r() * 18;
    ctx.beginPath();
    ctx.moveTo(x - dx, y - dy);
    ctx.quadraticCurveTo(x + (r() - 0.5) * 20, y + (r() - 0.5) * 20, x + dx, y + dy);
    ctx.stroke();
    // bristle streaks inside the stroke
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      const o = (r() - 0.5) * 10;
      ctx.beginPath();
      ctx.moveTo(x - dx - Math.sin(a) * o, y - dy + Math.cos(a) * o);
      ctx.lineTo(x + dx - Math.sin(a) * o, y + dy + Math.cos(a) * o);
      ctx.stroke();
    }
  }
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      const weave = Math.sin(x * 1.7) * Math.sin(y * 1.7) * 4 + (r() - 0.5) * 10;
      d[o] += weave;
      d[o + 1] += weave;
      d[o + 2] += weave;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
