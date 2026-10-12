import { ALBUM, ARTIST, CONSOLE, LABEL } from '../data/album.js';
import { canvas, circleText, drawCover, fontsReady, outlined, rng } from './util.js';

const RIM_TEXT =
  `${CONSOLE} · ${ARTIST} — ${ALBUM} · © 2004 ${LABEL} TUTTI I DIRITTI DEI MORTI RISERVATI · ` +
  'LA DUPLICAZIONE, IL NOLEGGIO E LA RESURREZIONE NON AUTORIZZATI SONO VIETATI · ' +
  'NON ESPORRE AL SOLE NÉ AI VIVI · DISCO 1 DI 1 · MADE IN ITALY · ';

/**
 * Printed face of the game disc: painted portrait full-bleed, console and rating badges,
 * a game-cover logo lockup and the legal micro-text running around the rim.
 * `portrait` is a canvas or image; the label maps 1:1 onto the disc (centre = hole).
 */
export async function drawDiscLabel(portrait, S = 2048) {
  await fontsReady(['80px "Rammetto One"', '500 20px "Oswald"', '300 40px "Oswald"']);
  const [c, ctx] = canvas(S);
  const C = S / 2;
  const R = S / 2;
  const r = rng(9);

  drawCover(ctx, portrait, 0, 0, S, S, 0.5);

  // rim darkening where the print wraps the edge
  const rim = ctx.createRadialGradient(C, C, R * 0.82, C, C, R);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, S, S);

  // legal micro-text around the rim
  ctx.font = '500 19px "Oswald", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let a = 0.02;
  while (a < Math.PI * 2 - 0.08) a = circleText(ctx, RIM_TEXT, C, C, R - 30, a, { spacing: 1.08 });

  // console vertical wordmark on the left
  ctx.save();
  ctx.translate(S * 0.095, C);
  ctx.rotate(-Math.PI / 2);
  const silver = ctx.createLinearGradient(-S * 0.25, 0, S * 0.25, 0);
  silver.addColorStop(0, '#9aa1aa');
  silver.addColorStop(0.5, '#f4f6f8');
  silver.addColorStop(1, '#8b929b');
  ctx.fillStyle = silver;
  ctx.font = '300 46px "Oswald", sans-serif';
  ctx.letterSpacing = '22px';
  ctx.textAlign = 'center';
  ctx.fillText(CONSOLE, 0, 0);
  ctx.restore();
  ctx.letterSpacing = '0px';

  // console badge (left)
  const bx = S * 0.2;
  const by = S * 0.47;
  ctx.fillStyle = '#fbfbf8';
  ctx.fillRect(bx - 92, by - 92, 184, 184);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx - 92, by - 92, 184, 184);
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(bx - 14, by - 6, 48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = '120px "Rammetto One", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  outlined(ctx, '2', bx + 30, by + 18, { fill: '#d01d27', stroke: '#fbfbf8', width: 10 });
  ctx.fillStyle = '#111';
  ctx.fillRect(bx - 92, by + 100, 184, 40);
  ctx.fillStyle = '#fff';
  ctx.font = '500 24px "Oswald", sans-serif';
  ctx.fillText('MRCV-01666', bx, by + 121);

  // rating badge (right)
  const rx = S * 0.8;
  const ry = S * 0.47;
  ctx.fillStyle = '#fbfbf8';
  ctx.fillRect(rx - 80, ry - 105, 160, 210);
  ctx.fillStyle = '#111';
  ctx.fillRect(rx - 80, ry - 105, 160, 44);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 3;
  ctx.strokeRect(rx - 80, ry - 105, 160, 210);
  ctx.fillStyle = '#fff';
  ctx.font = '500 28px "Oswald", sans-serif';
  ctx.fillText('V.M.', rx, ry - 82);
  ctx.fillStyle = '#111';
  ctx.font = '104px "Rammetto One", sans-serif';
  ctx.fillText('18', rx, ry + 8);
  ctx.font = '500 19px "Oswald", sans-serif';
  ctx.fillText('VIETATO AI VIVI', rx, ry + 82);

  // disc format mark (lower left)
  const fx = S * 0.27;
  const fy = S * 0.7;
  ctx.strokeStyle = '#d9e8ff';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(fx - 70, fy, 46, 20, -0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#d9e8ff';
  ctx.font = 'italic 600 46px "Oswald", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Muerto', fx - 20, fy - 4);
  ctx.font = '500 22px "Oswald", sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('DISC', fx - 18, fy + 34);
  ctx.letterSpacing = '0px';

  // game-cover logo lockup (top)
  ctx.textAlign = 'center';
  const lx = C;
  const ly = S * 0.135;
  ctx.font = '62px "Rammetto One", sans-serif';
  const artistW = ctx.measureText(ARTIST).width + 70;
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(lx - artistW / 2, ly - 46, artistW, 92);
  ctx.strokeStyle = '#fbfbf8';
  ctx.lineWidth = 6;
  ctx.strokeRect(lx - artistW / 2, ly - 46, artistW, 92);
  ctx.fillStyle = '#fbfbf8';
  ctx.fillText(ARTIST, lx, ly + 4);
  ctx.font = '170px "Rammetto One", sans-serif';
  // red offset shadow first, then the white word on top
  outlined(ctx, ALBUM, lx + 12, ly + 162, { fill: '#c3141c', stroke: '#0b0b0b', width: 22 });
  outlined(ctx, ALBUM, lx, ly + 150, { fill: '#fbfbf8', stroke: '#0b0b0b', width: 22 });

  // printed ring around the clamping area
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(C, C, R * 0.285, 0, Math.PI * 2);
  ctx.stroke();

  // handling wear: dust and hairline scratches
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.08 + r() * 0.25})`;
    const s = r() < 0.9 ? 1.5 : 3;
    ctx.fillRect(r() * S, r() * S, s, s);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 26; i++) {
    const a0 = r() * Math.PI * 2;
    const rr = R * (0.35 + r() * 0.6);
    ctx.beginPath();
    ctx.arc(C, C, rr, a0, a0 + 0.05 + r() * 0.25);
    ctx.stroke();
  }
  return c;
}
