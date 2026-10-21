import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { createStageParams } from '../lib/stageStates.js';

const StageContext = createContext(null);

export const useStage = () => useContext(StageContext);

/**
 * Owns the single fixed WebGL canvas shared by the whole experience.
 * status: 'loading' | 'ready' | 'error'. On error a still frame replaces the canvas.
 */
export default function StageProvider({ reducedMotion, children }) {
  const container = useRef(null);
  const params = useMemo(createStageParams, []);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    let stage;
    setStatus('loading');
    // Three.js is split into its own chunk so the opening darkness paints immediately.
    import('../lib/Stage.js')
      .then(({ Stage, webglAvailable }) => {
        if (cancelled) return undefined;
        if (!webglAvailable()) throw new Error('WebGL2 unavailable');
        stage = new Stage(container.current, params, {
          reducedMotion,
          onContextLost: () => setStatus('error'),
        });
        return stage.init();
      })
      .then(() => !cancelled && setStatus('ready'))
      .catch((err) => {
        console.warn('[AFTERIMAGE] 3D stage unavailable, showing still frame.', err);
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
      stage?.dispose();
    };
  }, [params, reducedMotion]);

  // Without WebGL the still frame still follows the choreography: visible only where the object would be lit.
  useEffect(() => {
    if (status !== 'error') return undefined;
    const el = container.current;
    const sync = () => {
      el.style.opacity = params.opacity * Math.min(1, params.exposure);
    };
    gsap.ticker.add(sync);
    return () => gsap.ticker.remove(sync);
  }, [status, params]);

  const value = useMemo(() => ({ params, status, container }), [params, status]);

  return (
    <StageContext.Provider value={value}>
      <div className="stage" ref={container} data-status={status}>
        {status === 'error' && (
          <div className="stage__still" role="img" aria-label="Still frame of the liquid metal object">
            <span className="stage__still-object" />
            <p className="stage__still-note mono">STILL FRAME — WEBGL UNAVAILABLE</p>
          </div>
        )}
      </div>
      {children}
    </StageContext.Provider>
  );
}
