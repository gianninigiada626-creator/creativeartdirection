import '@fontsource/rammetto-one';
import '@fontsource/mea-culpa';
import '@fontsource/almendra-sc';
import '@fontsource/im-fell-english';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/vt323';
import '@fontsource/oswald/300.css';
import '@fontsource/oswald/400.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
import '@fontsource/oswald/700.css';
import './styles/film.css';
import { Film } from './film/Film.js';
import { encodeWav } from './film/audio.js';
import { DiscAct } from './acts/DiscAct.js';
import { PlayerAct } from './acts/PlayerAct.js';
import { GameAct } from './game/GameAct.js';
import { BackAct } from './acts/BackAct.js';
import { ALBUM, ARTIST, FPS, SONG, schedule } from './data/album.js';
import { fontsReady } from './textures/util.js';

const params = new URLSearchParams(location.search);
const exportMode = params.has('export');
const frame = document.getElementById('frame');
const canvas = document.getElementById('film-canvas');
const overlay = document.getElementById('overlay');
document.documentElement.classList.toggle('is-export', exportMode);

const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function startScreen() {
  const el = document.createElement('div');
  el.className = 'start';
  el.innerHTML = `
    <p class="start__kicker">${ARTIST} presenta</p>
    <p class="start__title">${ALBUM}</p>
    <button type="button" class="start__btn" disabled>CARICAMENTO…</button>
    <p class="start__note" aria-live="polite">Audio attivo · cuffie consigliate</p>`;
  frame.appendChild(el);
  return { el, btn: el.querySelector('.start__btn'), note: el.querySelector('.start__note') };
}

function controls(film, s) {
  const chapters = [
    ['DISCO', s.disc],
    ['LETTORE', s.player],
    ['GIOCO', s.game],
    ['RETRO', s.back],
  ];
  const bar = document.createElement('div');
  bar.className = 'controls';
  bar.innerHTML = `
    <button type="button" class="c-play" aria-label="Riproduci">▶</button>
    <span class="c-time">0:00 / ${fmt(film.duration)}</span>
    <input class="c-scrub" type="range" min="0" max="${film.duration}" step="0.01" value="0" aria-label="Posizione nel film" />
    <span class="c-chapters">${chapters.map(([n, t]) => `<button type="button" data-t="${t}">${n}</button>`).join('')}</span>
    <button type="button" class="c-mute" aria-label="Disattiva audio">AUDIO</button>
    <button type="button" class="c-full" aria-label="Schermo intero">⛶</button>`;
  frame.appendChild(bar);
  const play = bar.querySelector('.c-play');
  const time = bar.querySelector('.c-time');
  const scrub = bar.querySelector('.c-scrub');
  const mute = bar.querySelector('.c-mute');
  let scrubbing = false;

  const toggle = () => (film.playing ? film.pause() : film.play());
  play.addEventListener('click', toggle);
  scrub.addEventListener('input', () => {
    scrubbing = true;
    film.jump(Number(scrub.value));
  });
  scrub.addEventListener('change', () => (scrubbing = false));
  bar.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => film.jump(Number(b.dataset.t))));
  mute.addEventListener('click', () => {
    film.audio.setMuted(!film.audio.muted);
    mute.classList.toggle('is-off', film.audio.muted);
    mute.setAttribute('aria-label', film.audio.muted ? 'Attiva audio' : 'Disattiva audio');
  });
  bar.querySelector('.c-full').addEventListener('click', () => {
    const p = document.fullscreenElement ? document.exitFullscreen() : frame.requestFullscreen?.();
    p?.catch?.(() => {});
  });
  overlay.addEventListener('filmstate', (e) => {
    play.textContent = e.detail.playing ? '❚❚' : '▶';
    play.setAttribute('aria-label', e.detail.playing ? 'Pausa' : 'Riproduci');
    frame.classList.toggle('is-paused', !e.detail.playing);
  });
  film.onTime((t) => {
    time.textContent = `${fmt(t)} / ${fmt(film.duration)}`;
    if (!scrubbing) scrub.value = t;
  });
  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, button') && e.key !== ' ') return;
    if (e.key === ' ') {
      e.preventDefault();
      toggle();
    } else if (e.key === 'ArrowRight') film.jump(film.time + 5);
    else if (e.key === 'ArrowLeft') film.jump(film.time - 5);
    else if (e.key.toLowerCase() === 'm') mute.click();
    else if (e.key.toLowerCase() === 'f') bar.querySelector('.c-full').click();
  });
  // controls show on activity, hide while the film plays
  let idle;
  const wake = () => {
    frame.classList.add('is-active');
    clearTimeout(idle);
    idle = setTimeout(() => frame.classList.remove('is-active'), 2600);
  };
  frame.addEventListener('pointermove', wake);
  frame.addEventListener('focusin', wake);
}

function layout(film) {
  const vw = exportMode ? 1920 : window.innerWidth;
  const vh = exportMode ? 1080 : window.innerHeight;
  const w = Math.min(vw, (vh * 16) / 9);
  const h = (w * 9) / 16;
  frame.style.width = `${w}px`;
  frame.style.height = `${h}px`;
  film?.setSize(Math.round(w), Math.round(h), exportMode ? 1 : Math.min(window.devicePixelRatio, 2));
}

async function boot() {
  layout(null);
  const ui = exportMode ? null : startScreen();
  const s = schedule();
  const film = new Film({ canvas, overlay, exportMode, fps: FPS });
  await fontsReady(['80px "Rammetto One"', '80px "Mea Culpa"', '40px "Almendra SC"', '40px "IM Fell English"', 'italic 40px "IM Fell English"', '80px "VT323"', '300 40px "Oswald"', '600 40px "Oswald"', '700 40px "Oswald"']);
  let songOk = true;
  try {
    await film.audio.loadSong(SONG.src);
  } catch (err) {
    songOk = false;
    console.warn('[MUERTO] song unavailable, the film plays with sound effects only.', err);
  }
  try {
    await film.init({ acts: [new DiscAct(s), new PlayerAct(s), new GameAct(s), new BackAct(s)], schedule: s });
  } catch (err) {
    console.error('[MUERTO] the film failed to build', err);
    if (ui) {
      ui.btn.textContent = 'ERRORE';
      ui.note.textContent = 'Il film non si è caricato: serve un browser con WebGL2 (Chrome, Edge, Firefox, Safari recenti).';
    }
    return;
  }
  layout(film);
  window.addEventListener('resize', () => layout(film));
  document.addEventListener('fullscreenchange', () => layout(film));
  film.seek(Number(params.get('t')) || 0);

  if (exportMode) {
    let wav = null;
    window.__film = {
      duration: film.duration,
      fps: FPS,
      songStart: s.songStart,
      renderAt: (t) => film.seek(t),
      async prepareAudio() {
        const buf = await film.audio.renderOffline(film.duration);
        wav = encodeWav(buf);
        return wav.length;
      },
      audioChunk(i, size) {
        const part = wav.subarray(i, i + size);
        let bin = '';
        for (let k = 0; k < part.length; k += 0x8000) bin += String.fromCharCode(...part.subarray(k, k + 0x8000));
        return btoa(bin);
      },
    };
    window.__dbg = film;
    window.__filmReady = true;
    return;
  }

  controls(film, s);
  ui.btn.disabled = false;
  ui.btn.textContent = '▶  INSERISCI IL DISCO';
  if (!songOk) ui.note.textContent = 'Brano non trovato: il film parte con i soli effetti sonori.';
  ui.btn.focus();
  ui.btn.addEventListener('click', async () => {
    ui.el.classList.add('is-gone');
    setTimeout(() => ui.el.remove(), 800);
    await film.play();
  });
}

boot();
