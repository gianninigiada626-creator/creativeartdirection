import { useCallback, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import StageProvider, { useStage } from './components/StageProvider.jsx';
import Grain from './components/Grain.jsx';
import Cursor from './components/Cursor.jsx';
import Hud from './components/Hud.jsx';
import Opening from './sections/Opening.jsx';
import ObjectSection from './sections/ObjectSection.jsx';
import Stub from './sections/Stub.jsx';
import useReducedMotion from './hooks/useReducedMotion.js';
import { directStage } from './lib/director.js';

gsap.registerPlugin(ScrollTrigger);

function Experience({ reducedMotion }) {
  const { params } = useStage();
  const [introDone, setIntroDone] = useState(false);
  const onDone = useCallback(() => setIntroDone(true), []);

  useEffect(() => {
    if (!introDone) return undefined;
    ScrollTrigger.refresh();
    return directStage(params, reducedMotion);
  }, [introDone, params, reducedMotion]);

  return (
    <>
      <a className="skip-link mono" href="#object">
        Skip to content
      </a>
      <Hud visible={introDone} />
      <main>
        <Opening reducedMotion={reducedMotion} onDone={onDone} />
        <Stub id="signal" n="02" title="THE SIGNAL" note="in sviluppo — tipografia cinetica, maschere, distorsione." />
        <ObjectSection reducedMotion={reducedMotion} />
        <Stub id="record" n="04" title="THE RECORD" note="in sviluppo — copertina, tracklist, provino a contatto, visualizer." />
        <Stub id="credits" n="05" title="CREDITS" note="in sviluppo — titoli di coda e dissolvenza finale." />
      </main>
    </>
  );
}

export default function App() {
  const reducedMotion = useReducedMotion();
  return (
    <StageProvider reducedMotion={reducedMotion}>
      <Experience reducedMotion={reducedMotion} />
      <div className="vignette" aria-hidden="true" />
      <Grain />
      <Cursor />
    </StageProvider>
  );
}
