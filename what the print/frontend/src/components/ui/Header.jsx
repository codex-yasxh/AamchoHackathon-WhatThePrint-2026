import { useEffect, useState } from "react";

function Header() {
  const isAdmin = window.location.pathname === "/admin";
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }

    const domTheme = document.documentElement.getAttribute("data-theme");
    if (domTheme === "dark" || domTheme === "light") {
      return domTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const userSelectedTheme = localStorage.getItem("theme");

    if (userSelectedTheme) {
      document.documentElement.setAttribute("data-theme", theme);
      return undefined;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onThemeChange = (event) => {
      const nextTheme = event.matches ? "dark" : "light";
      setTheme(nextTheme);
      document.documentElement.setAttribute("data-theme", nextTheme);
    };

    document.documentElement.setAttribute("data-theme", theme);
    media.addEventListener("change", onThemeChange);

    return () => media.removeEventListener("change", onThemeChange);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-8">
        <a className="font-display text-2xl tracking-[0.22em]" href="/">
          PRINT<span className="text-[var(--accent)]">X</span>
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          {!isAdmin && (
            <>
              <a className="tiny-link" href="#upload">
                Upload
              </a>
              <a className="tiny-link" href="#configure">
                Options
              </a>
              <a className="tiny-link" href="#contact">
                Contact
              </a>
            </>
          )}
          <a className="tiny-link" href="/admin">
            Admin
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            className={`theme-switch ${theme === "dark" ? "is-dark" : "is-light"}`}
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="theme-switch-track">
              <span className="theme-switch-icon theme-switch-icon-left">☀</span>
              <span className="theme-switch-icon theme-switch-icon-right">☾</span>
            </span>
            <span className="theme-switch-knob" />
          </button>
          <span className="badge">A4 Only</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
