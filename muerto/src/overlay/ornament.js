// Procedural baroque frame for the back insert, drawn as SVG paths.
// Own motifs (no copying): C-scroll corners, a rosary draped along the top,
// a sacred heart with flames as the crest, the game's car resting on the bottom rail.

const f = (n) => n.toFixed(1);

/** Logarithmic-ish spiral from (x, y), turning `turns` times, shrinking toward its centre. */
function spiral(x, y, r0, a0, turns, dir = 1, shrink = 0.82) {
  let d = `M${f(x)} ${f(y)}`;
  const steps = Math.round(turns * 28);
  let cx = x - Math.cos(a0) * r0;
  let cy = y - Math.sin(a0) * r0;
  for (let i = 1; i <= steps; i++) {
    const t = i / 28;
    const a = a0 + dir * t * Math.PI * 2;
    const r = r0 * Math.pow(shrink, t * 4);
    d += ` L${f(cx + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)}`;
  }
  return d;
}

/** A C-scroll: a curve ending in two opposite spirals, plus a leaf. */
function cScroll(x, y, sx, sy) {
  const P = (px, py) => `${f(x + px * sx)} ${f(y + py * sy)}`;
  let d = `M${P(0, 0)} C${P(18, -26)} ${P(52, -30)} ${P(74, -12)}`;
  d += ` ${spiral(x + 74 * sx, y - 12 * sy, 9, sx > 0 ? -Math.PI / 2 : -Math.PI / 2, 1.3, sx * sy > 0 ? 1 : -1)}`;
  d += ` M${P(0, 0)} C${P(-8, 22)} ${P(-26, 42)} ${P(-14, 64)}`;
  d += ` ${spiral(x - 14 * sx, y + 64 * sy, 8, Math.PI / 2, 1.2, sx * sy > 0 ? -1 : 1)}`;
  // acanthus leaf
  d += ` M${P(6, -6)} C${P(30, -2)} ${P(38, 16)} ${P(26, 30)} C${P(24, 16)} ${P(14, 6)} ${P(6, -6)}`;
  d += ` M${P(10, -2)} C${P(22, 4)} ${P(28, 12)} ${P(24, 22)}`;
  return d;
}

function heart(cx, cy, s) {
  const P = (px, py) => `${f(cx + px * s)} ${f(cy + py * s)}`;
  let d = `M${P(0, 14)} C${P(-22, -2)} ${P(-18, -20)} ${P(-6, -18)} C${P(-2, -17)} ${P(0, -13)} ${P(0, -11)}`;
  d += ` C${P(0, -13)} ${P(2, -17)} ${P(6, -18)} C${P(18, -20)} ${P(22, -2)} ${P(0, 14)} Z`;
  // flames
  d += ` M${P(-5, -17)} C${P(-9, -26)} ${P(-3, -30)} ${P(-4, -38)} C${P(2, -31)} ${P(4, -27)} ${P(0, -19)}`;
  d += ` M${P(1, -18)} C${P(0, -28)} ${P(7, -32)} ${P(6, -42)} C${P(12, -33)} ${P(10, -25)} ${P(5, -18)}`;
  // small cross on top of the flames
  d += ` M${P(1, -44)} L${P(1, -54)} M${P(-3, -50)} L${P(5, -50)}`;
  // wound / band
  d += ` M${P(-12, -6)} C${P(-4, -2)} ${P(4, -2)} ${P(12, -6)}`;
  // rays
  for (let i = -4; i <= 4; i++) {
    const a = -Math.PI / 2 + i * 0.32;
    d += ` M${P(Math.cos(a) * 26, Math.sin(a) * 26 - 6)} L${P(Math.cos(a) * (i % 2 ? 34 : 40), Math.sin(a) * (i % 2 ? 34 : 40) - 6)}`;
  }
  return d;
}

/** A 2000s four-door sedan in profile. */
function car(cx, cy, s) {
  const P = (px, py) => `${f(cx + px * s)} ${f(cy + py * s)}`;
  let d = `M${P(-60, 0)} L${P(-62, -10)} L${P(-56, -16)} L${P(-30, -18)} L${P(-18, -30)} L${P(16, -31)} L${P(32, -19)} L${P(56, -16)} L${P(62, -9)} L${P(60, 0)}`;
  d += ` L${P(46, 0)} M${P(26, 0)} L${P(-26, 0)} M${P(-46, 0)} L${P(-60, 0)}`;
  // windows
  d += ` M${P(-26, -18)} L${P(-16, -27)} L${P(-1, -27)} L${P(-1, -18)} Z M${P(3, -18)} L${P(3, -27)} L${P(14, -27)} L${P(26, -18)} Z`;
  // wheels
  const wheel = (wx) => {
    let w = ` M${P(wx + 9, 0)}`;
    for (let i = 1; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      w += ` L${P(wx + Math.cos(a) * 9, Math.sin(a) * 9)}`;
    }
    return w + ` M${P(wx + 4, 0)} L${P(wx - 4, 0)} M${P(wx, -4)} L${P(wx, 4)}`;
  };
  d += wheel(-36) + wheel(36);
  // door line and handle
  d += ` M${P(1, -18)} L${P(1, -3)} M${P(-8, -12)} L${P(-4, -12)} M${P(10, -12)} L${P(14, -12)}`;
  return d;
}

/** Rosary beads hanging in a catenary from (x0,y0) to (x1,y1). Returns circle specs. */
function rosary(x0, y0, x1, y1, sag, n) {
  const beads = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag;
    beads.push({ x, y, r: i % 10 === 0 ? 3.4 : 2.1 });
  }
  return beads;
}

/**
 * Build the frame as an SVG string in a 1000 × 400 viewBox.
 * Every <path> carries pathLength="1" so it can be drawn on with stroke-dashoffset.
 */
export function frameSVG() {
  const W = 1000;
  const H = 400;
  const m = 70; // inset of the rails
  const paths = [];
  const add = (d, cls = '') => paths.push(`<path class="orn ${cls}" pathLength="1" d="${d}"/>`);

  // double rails with notched corners
  const rail = (o) => {
    const n = 26;
    return `M${m + n - o} ${m - o} L${W - m - n + o} ${m - o} L${W - m + o} ${m + n - o} L${W - m + o} ${H - m - n + o} L${W - m - n + o} ${H - m + o} L${m + n - o} ${H - m + o} L${m - o} ${H - m - n + o} L${m - o} ${m + n - o} Z`;
  };
  add(rail(0), 'rail');
  add(rail(8), 'rail thin');

  // corner scrolls
  add(cScroll(m - 8, m - 8, -1, -1));
  add(cScroll(W - m + 8, m - 8, 1, -1));
  add(cScroll(m - 8, H - m + 8, -1, 1));
  add(cScroll(W - m + 8, H - m + 8, 1, 1));

  // side flourishes
  for (const sx of [-1, 1]) {
    const x = sx < 0 ? m - 8 : W - m + 8;
    add(`M${x} ${H / 2 - 40} C${x + sx * 30} ${H / 2 - 30} ${x + sx * 30} ${H / 2 + 30} ${x} ${H / 2 + 40} ${spiral(x, H / 2 + 40, 7, Math.PI / 2, 1.1, sx)}`);
    add(`M${x} ${H / 2 - 40} ${spiral(x, H / 2 - 40, 7, -Math.PI / 2, 1.1, -sx)}`);
    add(`M${x + sx * 4} ${H / 2} L${x + sx * 26} ${H / 2} M${x + sx * 30} ${H / 2 - 6} L${x + sx * 30} ${H / 2 + 6}`);
  }

  // crest: sacred heart
  add(heart(W / 2, m - 34, 1.25), 'crest');
  add(`M${W / 2 - 90} ${m - 8} C${W / 2 - 60} ${m - 30} ${W / 2 - 40} ${m - 30} ${W / 2 - 30} ${m - 22} M${W / 2 + 90} ${m - 8} C${W / 2 + 60} ${m - 30} ${W / 2 + 40} ${m - 30} ${W / 2 + 30} ${m - 22}`);

  // the car on the bottom rail
  add(car(W / 2, H - m + 8 - 1, 0.9), 'car');
  add(`M${W / 2 - 110} ${H - m + 8} L${W / 2 - 70} ${H - m + 8} M${W / 2 + 70} ${H - m + 8} L${W / 2 + 110} ${H - m + 8}`);

  // rosary draped from the crest to the top corners
  const beads = [...rosary(m + 40, m - 8, W / 2 - 34, m - 22, 26, 40), ...rosary(W / 2 + 34, m - 22, W - m - 40, m - 8, 26, 40)];
  const beadSVG = beads.map((b) => `<circle class="bead" cx="${f(b.x)}" cy="${f(b.y)}" r="${b.r}"/>`).join('');
  // the crucifix hanging at the left end
  add(`M${m + 40} ${m - 8} L${m + 40} ${m + 20} M${m + 32} ${m + 4} L${m + 48} ${m + 4}`, 'crest');

  return `<svg class="frame-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">${paths.join('')}<g class="beads">${beadSVG}</g></svg>`;
}
