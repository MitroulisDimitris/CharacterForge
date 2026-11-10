import type { Theme } from "../storage";
import { SKINS } from "../skins";

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

/** Skin picker (how the app looks). More skins can be added in skins.ts. */
export function SkinPicker({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <label className="skin-pick" title="Change how the app looks">
      <span>Skin</span>
      <select value={theme} onChange={(e) => onChange(e.target.value as Theme)}>
        {SKINS.map((s) => (
          <option key={s.id} value={s.id} title={s.description}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
