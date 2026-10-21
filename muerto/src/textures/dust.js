import { canvas, rng, texture } from './util.js';

/** Black paper backdrop with dust, lint and specks — the void the disc floats in. */
export function dustTexture(W = 2048, H = 1152, seed = 21) {
  const [c, ctx] = canvas(W, H);
  const r = rng(seed);
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);
  // uneven paper tone
  for (let i = 0; i < 60; i++) {
    const g = ctx.createRadialGradient(r() * W, r() * H, 0, r() * W, r() * H, 200 + r() * 500);
    g.addColorStop(0, `rgba(30,30,30,${0.1 + r() * 0.15})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // specks
  for (let i = 0; i < 2600; i++) {
    const a = r();
    ctx.fillStyle = `rgba(235,235,230,${0.08 + a * a * 0.7})`;
    const s = r() < 0.92 ? 1 + r() * 1.5 : 2 + r() * 3;
    ctx.beginPath();
    ctx.arc(r() * W, r() * H, s / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // lint and hairs
  ctx.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(220,220,215,${0.08 + r() * 0.25})`;
    ctx.lineWidth = 0.8 + r() * 1.2;
    let x = r() * W;
    let y = r() * H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const n = 3 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const nx = x + (r() - 0.5) * 60;
      const ny = y + (r() - 0.5) * 60;
      ctx.quadraticCurveTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 40, nx, ny);
      x = nx;
      y = ny;
    }
    ctx.stroke();
  }
  return texture(c);
}
