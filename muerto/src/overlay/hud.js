// 2000s game HUD, driven purely by film time. Every text block is a list of { from, to, text }
// windows; update(t) picks what is on screen, so scrubbing and export always agree.

const ICONS = {
  fist: '<svg viewBox="0 0 64 64"><path d="M18 30v-8a4 4 0 0 1 8 0v-3a4 4 0 0 1 8 0v1a4 4 0 0 1 8 0v2a4 4 0 0 1 8 0v14c0 9-6 16-15 16h-3c-8 0-14-6-14-14v-8a4 4 0 0 1 8 0" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/></svg>',
  cig: '<svg viewBox="0 0 64 64"><rect x="8" y="30" width="40" height="7" fill="none" stroke="currentColor" stroke-width="3"/><rect x="40" y="30" width="8" height="7" fill="currentColor"/><rect x="48" y="30" width="5" height="7" fill="#d4161f"/><path d="M52 24c3-4-2-6 1-10M56 26c3-4-2-7 1-11" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>',
  bottle: '<svg viewBox="0 0 64 64"><path d="M28 8h8v10l5 8v28a3 3 0 0 1-3 3H26a3 3 0 0 1-3-3V26l5-8z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/><path d="M23 34h18" stroke="#d4161f" stroke-width="5"/></svg>',
};

const pad = (n, l) => String(Math.max(0, Math.floor(n))).padStart(l, '0');

function at(list, t) {
  for (const it of list) if (t >= it.from && t < it.to) return it;
  return null;
}

/** Opacity for a window with short fades at both ends. */
function fadeIn(it, t, f = 0.25) {
  if (!it) return 0;
  return Math.min(1, (t - it.from) / f, (it.to - t) / f);
}

export class Hud {
  constructor(layer, script) {
    this.s = script;
    layer.insertAdjacentHTML(
      'beforeend',
      `<div class="hud">
        <div class="hud__tr">
          <div class="hud__weapon"></div>
          <div class="hud__stats">
            <div class="hud__clock">00:00</div>
            <div class="hud__bar hud__health"><i></i></div>
            <div class="hud__money">$00000000</div>
            <div class="hud__stars">${'<span>★</span>'.repeat(6)}</div>
          </div>
        </div>
        <div class="hud__radar"><canvas width="256" height="256"></canvas><b>N</b></div>
        <div class="hud__radio"><span class="hud__radio-name"></span><span class="hud__radio-song"></span></div>
        <div class="hud__zone"></div>
        <div class="hud__title"><span class="hud__title-main"></span><span class="hud__title-sub"></span></div>
        <div class="hud__objective"></div>
        <div class="hud__sub"><b></b><span></span></div>
      </div>`,
    );
    const q = (s) => layer.querySelector(s);
    this.el = {
      root: q('.hud'),
      tr: q('.hud__tr'),
      weapon: q('.hud__weapon'),
      clock: q('.hud__clock'),
      health: q('.hud__health i'),
      money: q('.hud__money'),
      stars: [...layer.querySelectorAll('.hud__stars span')],
      radar: q('.hud__radar'),
      radarCtx: q('.hud__radar canvas').getContext('2d'),
      radio: q('.hud__radio'),
      radioName: q('.hud__radio-name'),
      radioSong: q('.hud__radio-song'),
      zone: q('.hud__zone'),
      title: q('.hud__title'),
      titleMain: q('.hud__title-main'),
      titleSub: q('.hud__title-sub'),
      objective: q('.hud__objective'),
      sub: q('.hud__sub'),
      subWho: q('.hud__sub b'),
      subText: q('.hud__sub span'),
    };
    this.cache = {};
  }

  set(key, el, value) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    el.textContent = value;
  }

  setHTML(key, el, value) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    el.innerHTML = value;
  }

  /** state: { t, player: {x, z, yaw}, clock: minutes, money, stars, weapon } */
  update(t, state) {
    const { el, s } = this;
    const play = at(s.gameplay, t);
    el.tr.style.opacity = el.radar.style.opacity = fadeIn(play, t, 0.5);

    this.set('clock', el.clock, `${pad((state.clock / 60) % 24, 2)}:${pad(state.clock % 60, 2)}`);
    this.set('money', el.money, `$${pad(state.money, 8)}`);
    el.health.style.transform = `scaleX(${state.health ?? 1})`;
    this.setHTML('weapon', el.weapon, ICONS[state.weapon] ?? ICONS.fist);
    const stars = state.stars ?? 0;
    el.stars.forEach((st, i) => st.classList.toggle('is-on', i < stars));
    el.stars[0].parentElement.classList.toggle('is-flash', stars > 0 && Math.floor(t * 4) % 2 === 0);

    const radio = at(s.radio, t);
    el.radio.style.opacity = fadeIn(radio, t, 0.4);
    if (radio) {
      this.set('radioName', el.radioName, radio.text);
      this.set('radioSong', el.radioSong, radio.sub ?? '');
    }

    const zone = at(s.zones, t);
    el.zone.style.opacity = fadeIn(zone, t, 0.6);
    if (zone) this.set('zone', el.zone, zone.text);

    const title = at(s.titles, t);
    el.title.style.opacity = fadeIn(title, t, 0.3);
    if (title) {
      this.set('titleMain', el.titleMain, title.text);
      this.set('titleSub', el.titleSub, title.sub ?? '');
      el.title.dataset.kind = title.kind ?? '';
    }

    const obj = at(s.objectives, t);
    el.objective.style.opacity = fadeIn(obj, t, 0.3);
    if (obj) this.setHTML('obj', el.objective, obj.text);

    const sub = at(s.subtitles, t);
    el.sub.style.opacity = fadeIn(sub, t, 0.15);
    if (sub) {
      this.set('subWho', el.subWho, sub.who ? `${sub.who}:` : '');
      this.set('subText', el.subText, sub.text);
    }

    if (play) this.drawRadar(state);
  }

  drawRadar({ player, blips = [] }) {
    const ctx = this.el.radarCtx;
    const S = 256;
    const scale = 1.6; // px per metre
    ctx.save();
    ctx.clearRect(0, 0, S, S);
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(28,30,28,0.88)';
    ctx.fillRect(0, 0, S, S);
    ctx.translate(S / 2, S / 2);
    ctx.rotate(-(player.yaw ?? 0));
    ctx.translate(-player.x * scale, -player.z * scale);
    // blocks
    ctx.fillStyle = 'rgba(120,124,118,0.55)';
    for (let x = -80; x < 440; x += 60) {
      ctx.fillRect(x * scale, 47.5 * scale, 52 * scale, 40 * scale);
      ctx.fillRect(x * scale, -10 * scale, 52 * scale, 42.5 * scale);
    }
    // the main street and cross streets
    ctx.strokeStyle = 'rgba(210,212,205,0.85)';
    ctx.lineWidth = 8 * scale;
    ctx.beginPath();
    ctx.moveTo(-100 * scale, 40 * scale);
    ctx.lineTo(432 * scale, 40 * scale);
    for (let x = -28; x < 440; x += 60) {
      ctx.moveTo(x * scale, -60 * scale);
      ctx.lineTo(x * scale, 140 * scale);
    }
    ctx.stroke();
    for (const b of blips) {
      ctx.fillStyle = b.color ?? '#f2efe6';
      ctx.fillRect(b.x * scale - 7, b.z * scale - 7, 14, 14);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x * scale - 7, b.z * scale - 7, 14, 14);
    }
    ctx.restore();
    // player arrow
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.fillStyle = '#f2efe6';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(10, 10);
    ctx.lineTo(0, 4);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#0b0b0b';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}
