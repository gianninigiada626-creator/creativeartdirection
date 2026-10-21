import { canvas, drawCover, rng } from './util.js';
import { drawHead } from './heads.js';
import { ALBUM, ARTIST } from '../data/album.js';

/** Turn an image into a newsprint halftone of round dots. */
function halftone(img, w, h, cell = 7) {
  const [src, sctx] = canvas(Math.ceil(w / cell), Math.ceil(h / cell));
  drawCover(sctx, img, 0, 0, src.width, src.height, 0.4);
  const px = sctx.getImageData(0, 0, src.width, src.height).data;
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = '#e9e5d8';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#141414';
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const i = (y * src.width + x) * 4;
      const l = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255;
      const r = (1 - l) * cell * 0.62;
      if (r < 0.3) continue;
      ctx.beginPath();
      ctx.arc(x * cell + cell / 2, y * cell + cell / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return c;
}

/**
 * Two facing pages of the neighbourhood paper the client reads in the chair.
 * Left: masthead and the front-page story with the disc portrait in halftone. Right: small ads and mugshots.
 */
export function newspaperPages(portrait) {
  const r = rng(17);
  const W = 768;
  const H = 1024;
  const page = () => {
    const [c, ctx] = canvas(W, H);
    ctx.fillStyle = '#e9e5d8';
    ctx.fillRect(0, 0, W, H);
    return [c, ctx];
  };
  const lines = (ctx, x, y, w, n, gap = 16) => {
    ctx.fillStyle = 'rgba(30,30,30,0.55)';
    for (let i = 0; i < n; i++) ctx.fillRect(x, y + i * gap, w * (i === n - 1 ? 0.5 + r() * 0.4 : 0.92 + r() * 0.08), 6);
  };

  const [left, l] = page();
  l.fillStyle = '#141414';
  l.font = '86px "Mea Culpa"';
  l.textAlign = 'center';
  l.fillText('The Daily Dead', W / 2, 96);
  l.fillRect(30, 118, W - 60, 4);
  l.font = '500 20px "Oswald"';
  l.fillText('EDIZIONE DELLA SERA  ·  CAMPOSANTO  ·  50¢', W / 2, 146);
  l.fillRect(30, 158, W - 60, 2);
  l.font = '700 76px "Oswald"';
  l.fillText(`${ARTIST} IS BACK`, W / 2, 238, W - 60);
  l.font = 'italic 34px "IM Fell English"';
  l.fillText(`"${ALBUM}" in every store tonight`, W / 2, 284);
  if (portrait) l.drawImage(halftone(portrait, 420, 420), 40, 312);
  l.strokeStyle = '#141414';
  l.lineWidth = 3;
  l.strokeRect(40, 312, 420, 420);
  lines(l, 480, 318, 250, 24, 17);
  l.font = '600 22px "Oswald"';
  l.textAlign = 'left';
  l.fillText('Dead man seen at the barber', 40, 768);
  lines(l, 40, 790, 330, 12);
  lines(l, 400, 790, 330, 12);

  const [right, rr] = page();
  rr.fillStyle = '#141414';
  rr.font = '700 44px "Oswald"';
  rr.textAlign = 'center';
  rr.fillText('WANTED: ANYONE WHO SAW HIM', W / 2, 70, W - 60);
  rr.fillRect(30, 88, W - 60, 3);
  const heads = [{ hair: 'crown', tone: 0.12, seed: 11 }, { hair: 'cap', tone: 0.2, seed: 47, beard: true }, { hair: 'afro', tone: 0.3, seed: 61 }, { hair: 'none', tone: 0.45, seed: 83, lines: 1 }];
  heads.forEach((hp, i) => {
    const x = 40 + (i % 2) * 350;
    const y = 120 + Math.floor(i / 2) * 330;
    const face = drawHead(hp);
    rr.drawImage(halftone(face, 300, 270, 6), x, y);
    rr.strokeRect(x, y, 300, 270);
    lines(rr, x, y + 290, 300, 1);
  });
  rr.font = '700 30px "Oswald"';
  rr.fillText('BARBERSHOP · NAVAJA · 1987', W / 2, 820);
  lines(rr, 40, 850, W - 80, 9);
  return [left, right];
}
