import { useEffect, useRef } from 'react';

const pad = (n) => String(n).padStart(2, '0');

/** SMPTE-style 24fps timecode since page load. Updates the DOM directly, no re-renders. */
export default function Timecode({ className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const t0 = performance.now();
    let raf;
    let last = '';
    const tick = () => {
      const s = (performance.now() - t0) / 1000;
      const text = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}:${pad(Math.floor((s % 1) * 24))}`;
      if (text !== last && ref.current) ref.current.textContent = last = text;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <span className={`timecode ${className}`} ref={ref} aria-hidden="true">00:00:00:00</span>;
}
