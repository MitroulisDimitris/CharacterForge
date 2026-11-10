import { useState } from "react";
import type { Warning } from "../systems/types";

export function Warnings({ warnings, onJump }: { warnings: Warning[]; onJump: (tab: string) => void }) {
  const [open, setOpen] = useState(true);
  if (warnings.length === 0) return <div className="warnings clean">✓ Everything checks out for this level.</div>;
  const order = { error: 0, warn: 1, info: 2 };
  const sorted = [...warnings].sort((a, b) => order[a.level] - order[b.level]);
  const problems = warnings.filter((w) => w.level !== "info").length;
  return (
    <div className="warnings">
      <button type="button" className="warnings-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{problems > 0 ? `${problems} thing${problems > 1 ? "s" : ""} to fix` : "Notes"}</span>
        <span className="muted">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <ul>
          {sorted.map((w, i) => (
            <li key={i} className={`w-${w.level}`}>
              <span className="w-dot" aria-hidden="true" />
              <span>{w.text}</span>
              {w.tab && (
                <button type="button" className="link" onClick={() => onJump(w.tab!)}>
                  Go
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
