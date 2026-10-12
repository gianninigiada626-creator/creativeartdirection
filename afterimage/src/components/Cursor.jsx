import { useEffect, useRef } from 'react';

const INTERACTIVE = 'a, button, [data-cursor]';

/** Focus-bracket cursor. Only on fine pointers; the native cursor stays everywhere else. */
export default function Cursor() {
  const bracket = useRef(null);
  const dot = useRef(null);
  const label = useRef(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return undefined;
    document.documentElement.classList.add('has-cursor');
    const pos = { x: -100, y: -100, bx: -100, by: -100 };
    let raf;
    let visible = false;

    const move = (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!visible) {
        visible = true;
        pos.bx = pos.x;
        pos.by = pos.y;
        bracket.current.classList.add('is-visible');
        dot.current.classList.add('is-visible');
      }
      const target = e.target.closest?.(INTERACTIVE);
      bracket.current.classList.toggle('is-active', !!target);
      label.current.textContent = target?.dataset.cursor ?? '';
    };
    const leave = () => {
      visible = false;
      bracket.current.classList.remove('is-visible');
      dot.current.classList.remove('is-visible');
    };
    const loop = () => {
      pos.bx += (pos.x - pos.bx) * 0.2;
      pos.by += (pos.y - pos.by) * 0.2;
      dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      bracket.current.style.transform = `translate3d(${pos.bx}px, ${pos.by}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      document.documentElement.classList.remove('has-cursor');
    };
  }, []);

  return (
    <div className="cursor" aria-hidden="true">
      <div className="cursor__bracket" ref={bracket}>
        <span className="cursor__label mono" ref={label} />
      </div>
      <div className="cursor__dot" ref={dot} />
    </div>
  );
}
