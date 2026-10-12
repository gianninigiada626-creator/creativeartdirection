import { useEffect, useRef } from 'react';

/** Film grain: one noise tile generated once, shifted in steps by CSS. */
export default function Grain() {
  const ref = useRef(null);
  useEffect(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    ref.current.style.backgroundImage = `url(${canvas.toDataURL('image/png')})`;
  }, []);
  return <div className="grain" ref={ref} aria-hidden="true" />;
}
