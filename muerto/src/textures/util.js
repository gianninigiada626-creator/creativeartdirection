import * as THREE from 'three';

export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

export function texture(c, { srgb = true, repeat = null, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  return t;
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image failed to load: ${src}`));
    img.src = src;
  });
}

/** Load an image if it exists, otherwise return null (assets arrive later from the artist). */
export async function tryImage(src) {
  if (!src) return null;
  try {
    return await loadImage(src);
  } catch {
    return null;
  }
}

/** Draw an image to cover a box, like CSS object-fit: cover. */
export function drawCover(ctx, img, x, y, w, h, focusY = 0.5) {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) * focusY, dw, dh);
}

/** Fine noise / grit over a canvas region. */
export function grit(ctx, w, h, { amount = 18, seed = 3, alpha = 1 } = {}) {
  const r = rng(seed);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
    if (alpha !== 1) d[i + 3] *= alpha;
  }
  ctx.putImageData(img, 0, 0);
}

/** Text along a circle, clockwise, starting at angle a0 (radians, 0 = 12 o'clock). */
export function circleText(ctx, text, cx, cy, r, a0 = 0, { spacing = 1 } = {}) {
  let a = a0;
  for (const ch of text) {
    const w = ctx.measureText(ch).width * spacing;
    a += w / 2 / r;
    ctx.save();
    ctx.translate(cx + Math.sin(a) * r, cy - Math.cos(a) * r);
    ctx.rotate(a);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    a += w / 2 / r;
  }
  return a;
}

/** Text with a hard outline, the 2000s game-cover way. */
export function outlined(ctx, text, x, y, { fill = '#fff', stroke = '#000', width = 8, shadow = 0 } = {}) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  if (shadow) {
    ctx.fillStyle = stroke;
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x + shadow, y + shadow);
    ctx.fillText(text, x + shadow, y + shadow);
  }
  ctx.lineWidth = width;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export async function fontsReady(specs) {
  try {
    await Promise.all(specs.map((s) => document.fonts.load(s)));
  } catch {
    /* system fallback */
  }
}
