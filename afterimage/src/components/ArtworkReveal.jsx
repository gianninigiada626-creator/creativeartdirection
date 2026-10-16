import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { drawCover } from '../lib/cover.js';
import { ARTIST, CATALOG, LABEL, RELEASE, TITLE, TOTAL_TIME, TRACKS } from '../data/album.js';

/**
 * Modal that "prints" the album artwork: the image rises out of white paper
 * the way a print emerges in the developer tray, under a red safelight.
 */
export default function ArtworkReveal({ open, onClose, reducedMotion }) {
  const dialog = useRef(null);
  const canvas = useRef(null);
  const drawn = useRef(false);

  useEffect(() => {
    const el = dialog.current;
    if (!open || !el) return undefined;
    if (!el.open) el.showModal();
    if (!drawn.current) {
      drawn.current = true;
      drawCover(canvas.current, 1200);
    }
    const q = gsap.utils.selector(el);
    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        return;
      }
      gsap
        .timeline()
        .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 })
        .fromTo(q('.reveal__safelight'), { opacity: 0.85 }, { opacity: 0, duration: 3.2, ease: 'power2.inOut' }, 0)
        .fromTo(
          q('.reveal__print'),
          { filter: 'brightness(3.2) contrast(0.35) blur(12px)', scale: 1.04 },
          { filter: 'brightness(1) contrast(1) blur(0px)', scale: 1, duration: 3, ease: 'expo.out' },
          0.1,
        )
        .fromTo(q('[data-reveal]'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out' }, 0.9);
    }, el);
    return () => ctx.revert();
  }, [open, reducedMotion]);

  useEffect(() => {
    const el = dialog.current;
    if (!open && el?.open) el.close();
  }, [open]);

  const goToRecord = () => {
    onClose();
    document.getElementById('record')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <dialog
      ref={dialog}
      className="reveal"
      aria-labelledby="reveal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dialog.current && onClose()}
    >
      <div className="reveal__inner">
        <figure className="reveal__figure">
          <div className="reveal__print-wrap">
            <canvas className="reveal__print" ref={canvas} role="img" aria-label={`${TITLE} album artwork: a liquid chrome object frozen by flash at the end of a long exposure`} />
            <div className="reveal__safelight" aria-hidden="true" />
          </div>
          <figcaption className="mono" data-reveal>
            FIG. 01 — rear-curtain flash, long exposure. stampa n.1/1.
          </figcaption>
        </figure>

        <div className="reveal__info">
          <p className="mono reveal__kicker" data-reveal>
            03 — DEVELOPED
          </p>
          <h2 id="reveal-title" className="reveal__title" data-reveal>
            {TITLE}
          </h2>
          <p className="ghost-type reveal__by" data-reveal>
            di {ARTIST}
          </p>
          <dl className="reveal__facts mono" data-reveal>
            <div>
              <dt>RELEASE</dt>
              <dd>{RELEASE}</dd>
            </div>
            <div>
              <dt>TRACKS</dt>
              <dd>
                {TRACKS.length} · {TOTAL_TIME}
              </dd>
            </div>
            <div>
              <dt>LABEL</dt>
              <dd>{LABEL}</dd>
            </div>
            <div>
              <dt>CAT.</dt>
              <dd>{CATALOG}</dd>
            </div>
          </dl>
          <div className="reveal__actions" data-reveal>
            <button type="button" className="btn btn--solid mono" onClick={goToRecord}>
              GO TO THE RECORD ↓
            </button>
            <button type="button" className="btn mono" onClick={onClose}>
              CLOSE <kbd>ESC</kbd>
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
