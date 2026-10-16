import { useEffect, useRef } from 'react';

/**
 * Oversized display word where every letter carries two afterimages:
 * a red burn and a silver outline, offset by --gx.
 * With `fit`, the font size is solved so the word at full width (wdth 125) spans its container exactly;
 * the result is published as --title-size on the parent for sibling layout.
 */
export default function GhostTitle({ text, as: Tag = 'h1', className = '', fit = false }) {
  const ref = useRef(null);
  const measure = useRef(null);

  useEffect(() => {
    if (!fit) return undefined;
    const el = ref.current;
    const solve = () => {
      const natural = measure.current.getBoundingClientRect().width; // at 20px
      if (!natural) return;
      const size = (el.clientWidth / natural) * 20 * 0.985;
      el.style.fontSize = `${size}px`;
      el.parentElement?.style.setProperty('--title-size', `${size}px`);
    };
    solve();
    document.fonts?.ready.then(solve);
    const ro = new ResizeObserver(solve);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit, text]);

  return (
    <Tag className={`ghost-title ${className}`} ref={ref} aria-label={text}>
      {[...text].map((ch, i) => (
        <span className="gt-ch" aria-hidden="true" key={i}>
          <span className="gt-ghost gt-ghost--red">{ch}</span>
          <span className="gt-ghost gt-ghost--silver">{ch}</span>
          <span className="gt-main">{ch}</span>
        </span>
      ))}
      {fit && (
        <span className="gt-measure" ref={measure} aria-hidden="true">
          {text}
        </span>
      )}
    </Tag>
  );
}
