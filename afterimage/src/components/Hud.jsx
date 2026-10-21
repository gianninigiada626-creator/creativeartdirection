import { useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Timecode from './Timecode.jsx';
import { ARTIST, CATALOG, SECTIONS, TITLE } from '../data/album.js';

const FRAMES = 120;

/** Viewfinder HUD: identity, index, timecode and a frame counter bound to scroll. */
export default function Hud({ visible }) {
  const frame = useRef(null);
  const [active, setActive] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const progress = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const n = Math.max(1, Math.round(self.progress * FRAMES));
        if (frame.current) frame.current.textContent = `FR ${String(n).padStart(3, '0')}/${FRAMES}`;
      },
    });
    const sections = SECTIONS.map(({ id }) =>
      ScrollTrigger.create({
        trigger: `#${id}`,
        start: 'top center',
        end: 'bottom center',
        onToggle: (self) => self.isActive && setActive(id),
        onLeaveBack: () => id === SECTIONS[0].id && setActive(null),
      }),
    );
    return () => [progress, ...sections].forEach((t) => t.kill());
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const links = SECTIONS.map(({ id, n, label }) => (
    <li key={id}>
      <a
        href={`#${id}`}
        className={active === id ? 'is-active' : undefined}
        aria-current={active === id ? 'location' : undefined}
        onClick={() => setMenuOpen(false)}
      >
        <span className="hud__n">{n}</span>
        {label}
      </a>
    </li>
  ));

  return (
    <header className={`hud mono ${visible ? 'is-visible' : ''}`} inert={visible ? undefined : true}>
      <a className="hud__corner hud__corner--tl hud__id" href="#top" aria-label={`${ARTIST} — ${TITLE}, back to top`}>
        <strong>{ARTIST}</strong>
        <span>{TITLE} / LP / {CATALOG}</span>
      </a>

      <nav className="hud__corner hud__corner--tr" aria-label="Sections">
        <ul className="hud__nav">{links}</ul>
        <button
          type="button"
          className="hud__menu-btn"
          aria-expanded={menuOpen}
          aria-controls="hud-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? 'CLOSE' : 'INDEX'}
        </button>
      </nav>

      <div id="hud-menu" className={`hud__menu ${menuOpen ? 'is-open' : ''}`} inert={menuOpen ? undefined : true}>
        <ul>{links}</ul>
      </div>

      <div className="hud__corner hud__corner--bl" aria-hidden="true">
        <span className="hud__rec">REC</span>
        <Timecode />
      </div>

      <div className="hud__corner hud__corner--br" aria-hidden="true">
        <span>f/2.8 · 1/60s · ISO 3200</span>
        <span ref={frame}>FR 001/{FRAMES}</span>
      </div>
    </header>
  );
}
