import * as THREE from 'three';
import { canvas, rng } from './util.js';

/**
 * Crumpled-paper normal map: tileable Voronoi facets, each a flat plane tilted at random,
 * with a sharp crease where two facets meet. Laid on cloth, skin, heads and walls it makes
 * every surface catch the light like a figure folded out of paper.
 */
function crumpleCanvas(S = 512, { cell = 44, tilt = 0.55, seed = 7 } = {}) {
  const [c, ctx] = canvas(S, S);
  const r = rng(seed);
  const n = Math.round(S / cell);
  const step = S / n;
  const pts = new Float32Array(n * n * 2);
  const nrm = new Float32Array(n * n * 2);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      pts[k * 2] = (i + 0.15 + r() * 0.7) * step;
      pts[k * 2 + 1] = (j + 0.15 + r() * 0.7) * step;
      nrm[k * 2] = (r() - 0.5) * 2 * tilt;
      nrm[k * 2 + 1] = (r() - 0.5) * 2 * tilt;
    }
  }
  const img = ctx.createImageData(S, S);
  const d = img.data;
  for (let y = 0; y < S; y++) {
    const cy = Math.floor(y / step);
    for (let x = 0; x < S; x++) {
      const cx = Math.floor(x / step);
      let d1 = 1e9;
      let d2 = 1e9;
      let best = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          // wrap the grid so the map tiles
          const gi = (cx + ox + n) % n;
          const gj = (cy + oy + n) % n;
          const k = gj * n + gi;
          const dx = pts[k * 2] + (cx + ox - gi) * step - x;
          const dy = pts[k * 2 + 1] + (cy + oy - gj) * step - y;
          const dd = dx * dx + dy * dy;
          if (dd < d1) {
            d2 = d1;
            d1 = dd;
            best = k;
          } else if (dd < d2) d2 = dd;
        }
      }
      let nx = nrm[best * 2];
      let ny = nrm[best * 2 + 1];
      // the crease: a thin ridge between facets
      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      if (edge < 1.6) {
        nx *= -0.6;
        ny *= -0.6;
      }
      const len = Math.hypot(nx, ny, 1);
      const o = (y * S + x) * 4;
      d[o] = (nx / len) * 127.5 + 127.5;
      d[o + 1] = (ny / len) * 127.5 + 127.5;
      d[o + 2] = (1 / len) * 127.5 + 127.5;
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

let BASE = null;

/** A crumple normal map with its own repeat (clones share one image on the GPU). */
export function crumpleMap(repeat = 1) {
  if (!BASE) {
    BASE = new THREE.CanvasTexture(crumpleCanvas());
    BASE.colorSpace = THREE.NoColorSpace;
    BASE.wrapS = BASE.wrapT = THREE.RepeatWrapping;
    BASE.anisotropy = 4;
  }
  const t = BASE.clone();
  const [rx, ry] = Array.isArray(repeat) ? repeat : [repeat, repeat];
  t.repeat.set(rx, ry);
  return t;
}

const MAPS = new Map();

/** Fold a material: add the crumple normal map at a given repeat and strength. */
export function crumple(material, repeat = 1, strength = 0.8) {
  const key = JSON.stringify(repeat);
  if (!MAPS.has(key)) MAPS.set(key, crumpleMap(repeat));
  material.normalMap = MAPS.get(key);
  material.normalScale = new THREE.Vector2(strength, strength);
  return material;
}
