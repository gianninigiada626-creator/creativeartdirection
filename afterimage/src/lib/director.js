import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { STAGE_STATES } from './stageStates.js';

/** Moves the shared 3D object between chapters as the page scrolls. Returns a cleanup. */
export function directStage(params, reducedMotion) {
  const go = (id) =>
    gsap.to(params, {
      ...STAGE_STATES[id],
      duration: reducedMotion ? 0.5 : 1.8,
      ease: 'power3.inOut',
      overwrite: 'auto',
    });
  const triggers = Object.keys(STAGE_STATES).map((id) =>
    ScrollTrigger.create({
      trigger: `#${id}`,
      start: 'top 55%',
      end: 'bottom 45%',
      onToggle: (self) => self.isActive && go(id),
    }),
  );
  return () => triggers.forEach((t) => t.kill());
}
