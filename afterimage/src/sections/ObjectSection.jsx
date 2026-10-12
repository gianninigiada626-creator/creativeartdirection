import { useCallback, useRef, useState } from 'react';
import gsap from 'gsap';
import { useStage } from '../components/StageProvider.jsx';
import ArtworkReveal from '../components/ArtworkReveal.jsx';
import { OBJECT_STAGE } from '../lib/stageStates.js';
import { FRAGMENTS } from '../data/album.js';

/** 03 — The object. Pointer tilts it; clicking it develops the album artwork. */
export default function ObjectSection({ reducedMotion }) {
  const { params } = useStage();
  const [open, setOpen] = useState(false);
  const flash = useRef(null);
  const busy = useRef(false);

  const develop = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    if (reducedMotion) {
      setOpen(true);
      busy.current = false;
      return;
    }
    gsap
      .timeline({ onComplete: () => (busy.current = false) })
      // the surface panics, then solidifies under the flash
      .to(params, { agitation: 0.22, duration: 0.45, ease: 'power2.in' })
      .set(flash.current, { opacity: 1 })
      .set(params, { burn: 1, exposure: 2.6, agitation: 0, trail: 0.94 })
      .to(flash.current, { opacity: 0, duration: 1, ease: 'expo.out' }, '+=0.04')
      .to(params, { burn: 0, exposure: 0.4, camZ: 2.2, duration: 1.1, ease: 'power3.inOut' }, '<')
      .add(() => setOpen(true), '-=0.55');
  }, [params, reducedMotion]);

  const close = useCallback(() => {
    setOpen(false);
    gsap.to(params, { ...OBJECT_STAGE, duration: reducedMotion ? 0.4 : 1.8, ease: 'power3.inOut', overwrite: 'auto' });
  }, [params, reducedMotion]);

  return (
    <section id="object" className="object-section" aria-labelledby="object-title">
      <div className="object-section__head">
        <p className="mono section-label">03 — THE OBJECT</p>
        <h2 id="object-title" className="object-section__title">
          <span>RECOVERED</span>
          <span className="is-outline">STILL WARM</span>
        </h2>
      </div>

      <p className="object-section__fragment ghost-type">{FRAGMENTS.object}</p>

      <button
        type="button"
        className="object-section__hit"
        onClick={develop}
        data-cursor="DEVELOP"
        aria-haspopup="dialog"
        aria-label="Develop the object: reveal the album artwork"
      >
        <span className="object-section__hit-ring" aria-hidden="true" />
      </button>

      <dl className="object-section__spec mono">
        <div>
          <dt>MATERIAL</dt>
          <dd>argento liquido</dd>
        </div>
        <div>
          <dt>STATE</dt>
          <dd>instabile</dd>
        </div>
        <div>
          <dt>INPUT</dt>
          <dd>move to tilt · click to develop</dd>
        </div>
      </dl>

      <div className="flash" ref={flash} aria-hidden="true" />
      <ArtworkReveal open={open} onClose={close} reducedMotion={reducedMotion} />
    </section>
  );
}
