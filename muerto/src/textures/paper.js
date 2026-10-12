import { canvas, rng } from './util.js';

/**
 * Crumpled paper: Voronoi facets, each lit as a tilted plane, with creases along the cell borders.
 * Mid-grey on average (0.5) so it can be used as an overlay that adds relief without shifting tone.
 * Jittered-grid Voronoi keeps it fast (3×3 neighbour search).
 */
export function crumpledPaper(W = 1920, H = 1080, { cell = 46, seed = 5, crease = 0.6 } = {}) {
  const [c, ctx] = canvas(W, H);
  const r = rng(seed);
  const gx = Math.ceil(W / cell) + 2;
  const gy = Math.ceil(H / cell) + 2;
  const pts = new Float32Array(gx * gy * 2);
  const shade = new Float32Array(gx * gy * 3); // per-facet plane: base, dx, dy
  const L = [-0.55, -0.65, 0.52];
  for (let j = 0; j < gy; j++) {
    for (let i = 0; i < gx; i++) {
      const k = j * gx + i;
      pts[k * 2] = (i - 1 + r()) * cell;
      pts[k * 2 + 1] = (j - 1 + r()) * cell;
      // a random facet normal, tilted up to ~50°
      const nx = (r() - 0.5) * 1.3;
      const ny = (r() - 0.5) * 1.3;
      const len = Math.hypot(nx, ny, 1);
      const lit = (nx * L[0] + ny * L[1] + L[2]) / len;
      shade[k * 3] = 0.5 + lit * 0.28;
      shade[k * 3 + 1] = (r() - 0.5) * 0.004;
      shade[k * 3 + 2] = (r() - 0.5) * 0.004;
    }
  }
  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    const cy = Math.floor(y / cell) + 1;
    for (let x = 0; x < W; x++) {
      const cx = Math.floor(x / cell) + 1;
      let d1 = 1e9;
      let d2 = 1e9;
      let best = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const k = (cy + oy) * gx + (cx + ox);
          const dx = pts[k * 2] - x;
          const dy = pts[k * 2 + 1] - y;
          const dd = dx * dx + dy * dy;
          if (dd < d1) {
            d2 = d1;
            d1 = dd;
            best = k;
          } else if (dd < d2) d2 = dd;
        }
      }
      const px = pts[best * 2];
      const py = pts[best * 2 + 1];
      let v = shade[best * 3] + (x - px) * shade[best * 3 + 1] + (y - py) * shade[best * 3 + 2];
      // crease: where two facets meet, a thin highlight next to a thin shadow
      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      if (edge < 2.2) v += (edge < 1.1 ? 0.18 : -0.14) * crease;
      v += (r() - 0.5) * 0.05;
      const o = (y * W + x) * 4;
      const b = Math.max(0, Math.min(255, v * 255));
      d[o] = d[o + 1] = d[o + 2] = b;
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
