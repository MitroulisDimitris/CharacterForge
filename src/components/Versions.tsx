// Per-session versions (user, 2026-11-24; mockup canvas "Session Versions and Table Dice"): a character
// can have its own version in a session. The character page switches between "My character" (the
// original) and each version; a strip says which version is open and what differs from the original.
import { useEffect, useMemo, useRef, useState } from "react";
import type { AnySystem, ChangeLine } from "../systems/types";

export interface VersionsProp {
  /** The open version (a session seat id), or null for My character. */
  current: string | null;
  options: { id: string; session: string; level: number }[];
  mainLevel: number;
  /** My character, to compare the open version with (only while a version is open). */
  base?: { data: unknown; books: string[] };
  onPick: (id: string | null) => void;
  onOpenSession?: () => void;
}

/** The "Version" dropdown at the top of the character page. */
export function VersionPicker({ versions }: { versions: VersionsProp }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const rows = [
    { id: null as string | null, label: "My character", sub: `The original · Level ${versions.mainLevel}` },
    ...versions.options.map((o) => ({ id: o.id as string | null, label: o.session, sub: `Session version · Level ${o.level}` })),
  ];
  const cur = rows.find((r) => r.id === versions.current) ?? rows[0];
  return (
    <div className="version-pick" ref={box}>
      <span className="version-label">Version</span>
      <button type="button" className="version-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="version-btn-text">
          <strong>{cur.label}</strong>
          <span>{cur.sub}</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="version-menu" role="listbox" aria-label="Versions">
          {rows.map((r) => (
            <button
              key={r.id ?? "main"}
              type="button"
              role="option"
              aria-selected={r.id === versions.current}
              className={r.id === versions.current ? "on" : ""}
              onClick={() => {
                setOpen(false);
                if (r.id !== versions.current) versions.onPick(r.id);
              }}
            >
              <span>
                <strong>{r.label}</strong>
                <span>{r.sub}</span>
              </span>
              {r.id === versions.current && <span className="version-open">Open</span>}
            </button>
          ))}
          <p className="version-hint">Each session has its own version. New sessions start from My character.</p>
        </div>
      )}
    </div>
  );
}

/** The strip above the tabs while a session version is open, with what differs from My character. */
export function VersionStrip({ versions, system, d }: { versions: VersionsProp; system: AnySystem; d: unknown }) {
  const cur = versions.options.find((o) => o.id === versions.current);
  const base = versions.base;
  const diff = useMemo<ChangeLine[]>(() => {
    if (!base || !system.describeChange) return [];
    try {
      const b = system.derive(system.normalize(base.data), base.books);
      return system.describeChange(b, d).filter((l) => l.tone !== "info" || l.from || l.to);
    } catch {
      return [];
    }
    // The base object is rebuilt on every render; its data and books are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base?.data, base?.books, system, d]);
  if (!cur) return null;
  return (
    <div className="version-strip" role="note">
      <div className="version-strip-row">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l8 4-8 4-8-4 8-4z" />
          <path d="M4 12l8 4 8-4" />
          <path d="M4 17l8 4 8-4" />
        </svg>
        <span className="version-strip-text">
          <strong>{cur.session} version</strong> · changes here stay in this session.
        </span>
        {versions.onOpenSession && (
          <button type="button" className="btn small ghost" onClick={versions.onOpenSession}>
            Open session
          </button>
        )}
      </div>
      {diff.length > 0 ? (
        <details className="version-diff">
          <summary>
            Different from My character <span className="counter">{diff.length}</span>
          </summary>
          <ul>
            {diff.map((l, i) => (
              <li key={i}>
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
        </details>
      ) : (
        <span className="version-same">Same as My character so far.</span>
      )}
    </div>
  );
}
