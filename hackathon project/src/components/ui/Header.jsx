function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-8">
        <a className="font-display text-2xl tracking-[0.22em]" href="#">
          PRINT<span className="text-[var(--accent)]">X</span>
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          <a className="tiny-link" href="#upload">
            Upload
          </a>
          <a className="tiny-link" href="#configure">
            Options
          </a>
          <a className="tiny-link" href="#contact">
            Contact
          </a>
        </nav>
        <span className="badge">A4 Only</span>
      </div>
    </header>
  );
}

export default Header;
