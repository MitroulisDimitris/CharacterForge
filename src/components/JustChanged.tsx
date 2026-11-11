// A small note after each pick: what it just changed ("Charisma 15 → 17 · Spell save DC 12 → 13").
// Systems describe the change with `describeChange`; the note fades after a few seconds.
import { useEffect, useRef, useState } from "react";
import type { AnySystem, ChangeLine } from "../systems/types";

export function JustChanged({ system, d }: { system: AnySystem; d: unknown }) {
  const prev = useRef(d);
  const [shown, setShown] = useState<{ lines: ChangeLine[]; key: number } | null>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = d;
    if (before === d || !system.describeChange) return;
    const lines = system.describeChange(before, d).filter((l) => l.tone !== "info" || l.from || l.to);
    if (!lines.length) return;
    setShown({ lines, key: Date.now() });
  }, [d, system]);

  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), 5000);
    return () => clearTimeout(t);
  }, [shown]);

  if (!shown) return null;
  const MAX = 6;
  return (
    <div className="just-changed" key={shown.key} role="status" aria-live="polite">
      <div className="just-changed-head">
        <span>Just changed</span>
        <button type="button" aria-label="Close" onClick={() => setShown(null)}>
          ×
        </button>
      </div>
      <ul>
        {shown.lines.slice(0, MAX).map((l, i) => (
          <li key={i} className={l.tone}>
            <span>{l.label}</span>
            {(l.from || l.to) && (
              <strong>
                {l.from}
                {l.from && l.to ? " → " : ""}
                {l.to}
              </strong>
            )}
          </li>
        ))}
      </ul>
      {shown.lines.length > MAX && <span className="muted">and {shown.lines.length - MAX} more</span>}
    </div>
  );
}
