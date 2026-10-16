/** Temporary frame for sections not yet developed (checkpoint build). */
export default function Stub({ id, n, title, note }) {
  return (
    <section id={id} className="stub" aria-labelledby={`${id}-title`}>
      <p className="mono section-label">
        {n} — {title}
      </p>
      <h2 id={`${id}-title`} className="stub__title">
        {title}
      </h2>
      <p className="ghost-type stub__note">{note}</p>
    </section>
  );
}
