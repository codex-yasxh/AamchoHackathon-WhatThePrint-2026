function Hero() {
  return (
    <section className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--border)] px-4 pb-10 pt-16 sm:px-8">
      <h1 className="font-display text-[clamp(2.8rem,6vw,6rem)] leading-[0.9] tracking-[0.03em]">
        A4 <span className="text-[var(--accent)]">PRINT</span>
        <br />
        MADE SIMPLE.
      </h1>
      <div className="max-w-sm">
        <p className="mb-5 text-xs leading-7 text-[var(--muted)]">
          Upload your documents, set your options per file, and place your order. Fast turnaround, clean results.
        </p>
        <a className="btn-accent" href="#upload">
          Upload Files
        </a>
      </div>
    </section>
  );
}

export default Hero;
