import type { Theme } from "../storage";

export function Brand({ onClick }: { onClick?: () => void }) {
  const inner = (
    <>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 4 56 18v28L32 60 8 46V18z" className="brand-hex" />
        <path d="M32 16 42 32 32 48 22 32z" className="brand-gem" />
      </svg>
      <span>Character Forge</span>
    </>
  );
  return onClick ? (
    <button type="button" className="brand brand-btn" onClick={onClick} title="My characters">
      {inner}
    </button>
  ) : (
    <div className="brand">{inner}</div>
  );
}

export function ThemeButton({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button type="button" className="btn ghost" onClick={onToggle} title="Switch theme">
      {theme === "dark" ? "☀ Parchment" : "☾ Dark"}
    </button>
  );
}
