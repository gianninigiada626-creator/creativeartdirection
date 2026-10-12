import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useStage } from '../components/StageProvider.jsx';
import GhostTitle from '../components/GhostTitle.jsx';
import Timecode from '../components/Timecode.jsx';
import { HERO_STAGE } from '../lib/stageStates.js';
import { ARTIST, CATALOG, FRAGMENTS, RELEASE, TITLE } from '../data/album.js';

const STAGE_TIMEOUT = 6000;

/**
 * 01 — Cinematic intro. The intro is the hero being "developed":
 * darkness, a typed line, one flash, a retinal burn, the object emerging, the title.
 */
export default function Opening({ reducedMotion, onDone }) {
  const { params, status } = useStage();
  const root = useRef(null);
  const tl = useRef(null);
  const done = useRef(false);
  const [phase, setPhase] = useState('waiting'); // waiting | playing | done
  const [stageTimedOut, setStageTimedOut] = useState(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    document.documentElement.classList.remove('is-locked');
    setPhase('done');
    onDone();
  }, [onDone]);

  // Hide hero elements before first paint; the timeline develops them.
  useLayoutEffect(() => {
    document.documentElement.classList.add('is-locked');
    window.scrollTo(0, 0);
    const q = gsap.utils.selector(root);
    gsap.set(q('.gt-ch'), { opacity: 0 });
    gsap.set(q('[data-develop]'), { opacity: 0 });
    gsap.set(params, { opacity: 1, exposure: 0, burn: 0, spin: -2.2, camZ: 6.8, trail: 0, agitation: 0 });
  }, [params]);

  // Never hold the audience hostage to a slow GPU.
  useEffect(() => {
    const id = setTimeout(() => setStageTimedOut(true), STAGE_TIMEOUT);
    return () => clearTimeout(id);
  }, []);

  const canStart = status !== 'loading' || stageTimedOut;

  useEffect(() => {
    if (!canStart || tl.current || done.current) return;
    const q = gsap.utils.selector(root);
    const letters = q('.gt-ch');
    const ghosts = q('.gt-ghost');
    const develop = q('[data-develop]');
    const chars = q('.opening__line-ch');
    const line = q('.opening__line');
    const flash = q('.opening__flash');
    const overlay = q('.opening__overlay');

    const t = gsap.timeline({ onComplete: finish });
    tl.current = t;
    setPhase('playing');

    if (reducedMotion) {
      t.set(chars, { display: 'inline' })
        .fromTo(line, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.2)
        .to(line, { opacity: 0, duration: 0.6 }, 1.8)
        .set(params, { camZ: HERO_STAGE.camZ, spin: HERO_STAGE.spin }, 1.8)
        .to(params, { exposure: 1, duration: 1.2, ease: 'power1.inOut' }, 1.9)
        .set(letters, { '--wdth': 125 }, 0)
        .to(letters, { opacity: 1, duration: 0.8, stagger: 0.03 }, 2.3)
        .to(develop, { opacity: 1, duration: 0.6, stagger: 0.08 }, 2.7)
        .to(overlay, { autoAlpha: 0, duration: 0.5 }, 3.1);
      return undefined;
    }

    t
      // 0.0 — darkness, a line typed into the void
      .to(chars, { display: 'inline', duration: 0.01, stagger: 0.04, ease: 'none' }, 0.5)
      // 2.2 — hard cut. One flash. The light illuminates the object for a single frame.
      .set(line, { opacity: 0 }, 2.3)
      .set(flash, { opacity: 1 }, 2.3)
      .set(params, { exposure: 2.4, burn: 1, trail: 0.95 }, 2.3)
      .to(flash, { opacity: 0, duration: 1.2, ease: 'expo.out' }, 2.36)
      .to(params, { exposure: 0, duration: 0.4, ease: 'power2.out' }, 2.36)
      // the retinal burn: a red silhouette that will not leave
      .to(params, { burn: 0, duration: 2.8, ease: 'power2.in' }, 2.6)
      // 3.4 — the object emerges; the softbox sweeps across the chrome
      .to(params, { camZ: HERO_STAGE.camZ, duration: 7, ease: 'power2.inOut' }, 2.3)
      .to(params, { exposure: 1, duration: 3.8, ease: 'power2.inOut' }, 3.6)
      .to(params, { spin: HERO_STAGE.spin, duration: 6, ease: 'power3.inOut' }, 2.8)
      .to(params, { trail: HERO_STAGE.trail, duration: 2.5 }, 5)
      // 6.2 — the title develops; each letter leaves its afterimage behind
      .fromTo(
        letters,
        { opacity: 0, filter: 'blur(16px)', '--wdth': 62 },
        { opacity: 1, filter: 'blur(0px)', '--wdth': 125, duration: 1.8, ease: 'expo.out', stagger: { each: 0.07, from: 'random' } },
        6.2,
      )
      .fromTo(ghosts, { '--gx': '0.22em' }, { '--gx': '0.035em', duration: 2.8, ease: 'expo.out' }, 6.4)
      // 7.8 — metadata, like print emerging in the developer tray
      .fromTo(develop, { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: 1.2, stagger: 0.12, ease: 'power2.out' }, 7.8)
      .to(overlay, { autoAlpha: 0, duration: 0.8 }, 9);

    return undefined;
  }, [canStart, finish, params, reducedMotion]);

  // Clean up the timeline on unmount only.
  useEffect(() => () => tl.current?.kill(), []);

  const skip = useCallback(() => {
    const t = tl.current;
    if (done.current) return;
    const cut = root.current.querySelector('.opening__cut');
    gsap
      .timeline()
      .to(cut, { opacity: 1, duration: 0.25, ease: 'power1.in' })
      .add(() => {
        if (t) t.progress(1);
        else {
          gsap.set(params, HERO_STAGE);
          gsap.set(root.current.querySelectorAll('.gt-ch, [data-develop]'), { opacity: 1, '--wdth': 125 });
          gsap.set(root.current.querySelector('.opening__overlay'), { autoAlpha: 0 });
        }
        finish();
      })
      .to(cut, { opacity: 0, duration: 0.7, ease: 'power2.out' });
  }, [finish, params]);

  useEffect(() => {
    if (phase === 'done') return undefined;
    const onKey = (e) => e.key === 'Escape' && skip();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, skip]);

  return (
    <section id="top" className="opening" ref={root} aria-label={`${ARTIST} — ${TITLE}`}>
      <div className="opening__hero">
        <p className="opening__fragment ghost-type" data-develop>
          {FRAGMENTS.hero}
        </p>

        <dl className="opening__meta mono" data-develop>
          <div>
            <dt>ARTIST</dt>
            <dd>{ARTIST}</dd>
          </div>
          <div>
            <dt>FORMAT</dt>
            <dd>LP · 10 TRACKS</dd>
          </div>
          <div>
            <dt>RELEASE</dt>
            <dd>{RELEASE}</dd>
          </div>
          <div>
            <dt>CAT.</dt>
            <dd>{CATALOG}</dd>
          </div>
        </dl>

        <a className="opening__scroll mono" href="#signal" data-develop>
          <span className="opening__scroll-bar" aria-hidden="true" />
          SCROLL TO DEVELOP
        </a>

        <GhostTitle text={TITLE} className="opening__title" fit />
      </div>

      {phase !== 'done' && (
        <div className="opening__overlay" role="presentation">
          <p className="opening__line mono">
            <span className="opening__line-sizer" aria-hidden="true">
              {FRAGMENTS.opening}
            </span>
            <span className="opening__line-typed" aria-label={FRAGMENTS.opening}>
              {[...FRAGMENTS.opening].map((c, i) => (
                <span className="opening__line-ch" aria-hidden="true" key={i}>
                  {c}
                </span>
              ))}
              <span className="opening__caret" aria-hidden="true" />
            </span>
          </p>
          <div className="opening__status mono" aria-live="polite">
            {phase === 'waiting' ? 'DEVELOPING…' : <Timecode />}
          </div>
          <button type="button" className="opening__skip mono" onClick={skip} data-cursor="SKIP">
            SKIP INTRO <kbd>ESC</kbd>
          </button>
        </div>
      )}
      <div className="opening__flash" aria-hidden="true" />
      <div className="opening__cut" aria-hidden="true" />
    </section>
  );
}
