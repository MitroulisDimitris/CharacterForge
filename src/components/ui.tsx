import { useState, type ReactNode } from "react";

export function Card({ title, aside, children, className = "" }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <header className="card-head">
          <h3>{title}</h3>
          {aside && <div className="card-aside">{aside}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={ariaLabel}>
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** A grid of toggle chips limited to `max` selections. */
export function ChipPicker<T extends string>({
  options,
  selected,
  max,
  onChange,
  locked = [],
  lockedLabel = "granted",
}: {
  /** `hint`: what the option means, shown under the chips while hovering it. */
  options: { value: T; label: string; sub?: string; hint?: string }[];
  selected: T[];
  max: number;
  onChange: (next: T[]) => void;
  locked?: T[];
  lockedLabel?: string;
}) {
  const full = selected.length >= max;
  const [hover, setHover] = useState<T | null>(null);
  const hasHints = options.some((o) => o.hint);
  const shown = options.find((o) => o.value === hover);
  return (
    <>
    <div className="chips">
      {options.map((o) => {
        const on = selected.includes(o.value);
        const isLocked = locked.includes(o.value);
        const disabled = isLocked || (!on && full);
        return (
          <button
            type="button"
            key={o.value}
            className={`chip ${on ? "on" : ""} ${isLocked ? "locked" : ""}`}
            disabled={disabled}
            aria-pressed={on}
            title={isLocked ? `Already ${lockedLabel}` : o.hint}
            onClick={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
            onMouseEnter={() => setHover(o.value)}
            onMouseLeave={() => setHover((h) => (h === o.value ? null : h))}
            onFocus={() => setHover(o.value)}
            onBlur={() => setHover((h) => (h === o.value ? null : h))}
          >
            <span>{o.label}</span>
            {o.sub && <small>{isLocked ? lockedLabel : o.sub}</small>}
          </button>
        );
      })}
    </div>
    {hasHints && (
      <p className="chip-hint" aria-live="polite">
        {shown?.hint ? (
          <>
            <strong>{shown.label}:</strong> {shown.hint}
          </>
        ) : (
          <span className="muted">Hover an option to see what it's for.</span>
        )}
      </p>
    )}
    </>
  );
}

export function Counter({ count, max, label }: { count: number; max: number; label: string }) {
  const cls = count === max ? "ok" : count > max ? "over" : "under";
  return (
    <span className={`counter ${cls}`}>
      {label} {count} / {max}
    </span>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button type="button" key={o.value} role="radio" aria-checked={value === o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
