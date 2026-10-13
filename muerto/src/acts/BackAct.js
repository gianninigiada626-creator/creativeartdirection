import * as THREE from 'three';
import { Act } from './Act.js';
import { frameSVG } from '../overlay/ornament.js';
import { dustTexture } from '../textures/dust.js';
import { ALBUM, ARTIST, CREDITS, LABEL_MARK, PRODUCERS, TRACKS } from '../data/album.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

/** Producers line: roman numerals set upright, names in italic. */
function producersHTML(text) {
  return text.replace(/\b(X{0,3}(IX|IV|V?I{0,3}))\b(?=\s)/g, (m) => (m ? `<b>${m}</b>` : m));
}

/** ACT IV — the back of the jewel case: calligraphic title, baroque frame, tracklist, credits. */
export class BackAct extends Act {
  constructor(s) {
    super('back', { start: s.back, end: s.end + 0.001 });
    this.look = { sat: 1, split: 0, scratch: 0, mono: 0, keepRed: 0, paper: 0, bars: 0, tv: 1, white: 0, scan: 0, grain: 0.07, vignette: 0.7, contrast: 1, tint: [1, 1, 1] };
    this.bloomLook = { strength: 0.2, threshold: 0.9, radius: 0.5 };
    this.tilt = { rx: 9, ry: -7, s: 1.06, sheen: -40 };
  }

  async build(film) {
    // a dim dusty void behind the insert, still on the WebGL side so grain and vignette apply
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshBasicMaterial({ map: dustTexture(2048, 1152, 77), color: 0x6a6a6a }));
    plane.position.z = -5;
    this.scene.add(plane);
    this.camera.position.set(0, 0, 4.5);
    this.camera.lookAt(0, 0, -5);

    const L = this.createLayer(film, 'act-back');
    const perLine = Math.ceil(TRACKS.length / 4);
    const lines = [];
    for (let i = 0; i < TRACKS.length; i += perLine) {
      lines.push(
        TRACKS.slice(i, i + perLine)
          .map((title, k) => `<span class="trk"><b>${ROMAN[i + k]}</b> ${title}</span>`)
          .join(' '),
      );
    }
    L.innerHTML = `
      <div class="insert">
        <div class="insert__title">
          <span class="t-artist">${ARTIST.replace('.', '')}<i>.</i></span>
          <span class="t-album">${ALBUM.charAt(0)}${ALBUM.slice(1).toLowerCase()}</span>
        </div>
        <div class="insert__frame">
          ${frameSVG()}
          <div class="tracklist">${lines.map((l) => `<p>${l}</p>`).join('')}</div>
        </div>
        <p class="insert__producers-title">P R O D U C E R S</p>
        <p class="insert__producers">${producersHTML(PRODUCERS)}</p>
        <p class="insert__credits">${CREDITS}</p>
        <span class="insert__mark">${LABEL_MARK}</span>
        <i class="spark s1">+</i><i class="spark s2">+</i><i class="spark s3">+</i><i class="spark s4">+</i>
        <div class="insert__sheen"></div>
      </div>`;
    this.el = {
      insert: L.querySelector('.insert'),
      title: L.querySelector('.insert__title'),
      orn: L.querySelectorAll('.orn'),
      beads: L.querySelector('.beads'),
      trk: L.querySelectorAll('.trk'),
      ptitle: L.querySelector('.insert__producers-title'),
      prod: L.querySelector('.insert__producers'),
      credits: L.querySelector('.insert__credits'),
      mark: L.querySelector('.insert__mark'),
      sparks: L.querySelectorAll('.spark'),
      sheen: L.querySelector('.insert__sheen'),
    };
  }

  choreograph(tl, s, film) {
    const t0 = s.back;
    const g = film.grade;
    const el = this.el;
    tl.fromTo(g, { fade: 1, mono: 0, keepRed: 0, paper: 0, bars: 0, tv: 1, white: 0, scan: 0, grain: 0.07, vignette: 0.7, contrast: 1 }, { fade: 0, duration: 1.2 }, t0)
      .fromTo(this.tilt, { rx: 9, ry: -7, s: 1.06 }, { rx: 1.5, ry: 1.5, s: 1, duration: s.end - t0, ease: 'sine.inOut' }, t0)
      .fromTo(el.title, { clipPath: 'inset(0 100% 0 0)', filter: 'blur(6px)' }, { clipPath: 'inset(0 0% 0 0)', filter: 'blur(0px)', duration: 2.2, ease: 'power2.inOut' }, t0 + 0.5)
      .fromTo(el.orn, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.8, ease: 'power1.inOut', stagger: 0.05 }, t0 + 1.8)
      .fromTo(el.beads, { opacity: 0 }, { opacity: 1, duration: 1.2 }, t0 + 3.6)
      .fromTo(el.trk, { opacity: 0, filter: 'blur(4px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.6, stagger: 0.22 }, t0 + 3.4)
      .fromTo([el.ptitle, el.prod, el.credits], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 1, stagger: 0.35 }, t0 + 3.4 + TRACKS.length * 0.22 + 0.2)
      .fromTo([el.mark, ...el.sparks], { opacity: 0 }, { opacity: 1, duration: 0.8, stagger: 0.1 }, t0 + 8.6)
      .fromTo(this.tilt, { sheen: -40 }, { sheen: 140, duration: 3.2, ease: 'power1.inOut' }, t0 + 6.2)
      .to(g, { fade: 1, duration: 2, ease: 'power1.in' }, s.end - 2.2)
      .fromTo(el.insert, { opacity: 1 }, { opacity: 0, duration: 2, ease: 'power1.in', immediateRender: false }, s.end - 2.2);
  }

  cues(s) {
    return [
      { t: s.back + 0.3, name: 'roomTone', args: [s.end - s.back - 0.3, { gain: 0.05 }] },
      { t: s.back + 0.5, name: 'whoosh', args: [2.2, { gain: 0.06 }] },
    ];
  }

  update() {
    const { rx, ry, s: sc, sheen } = this.tilt;
    this.el.insert.style.transform = `perspective(calc(var(--u) * 120)) rotateX(${rx}deg) rotateY(${ry}deg) scale(${sc})`;
    this.el.sheen.style.transform = `translateX(${sheen}%) skewX(-18deg)`;
  }
}
