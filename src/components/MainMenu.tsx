// The app's main menu (REQUIREMENTS 4.7): My characters · Sessions · Wiki. On PC it sits in the left
// sidebar; on a phone a ☰ button at the left of the top bar slides it in from the left over a
// dimmed page. Not on character pages (sheet, creation, level up): they keep their own way back.
import { useEffect, type ReactNode } from "react";
import { Brand } from "./Brand";

export type Place = "characters" | "sessions" | "wiki";

const ICONS: Record<Place, ReactNode> = {
  characters: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  sessions: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  wiki: (
    <>
      <path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z" />
      <path d="M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" />
    </>
  ),
};
const LABELS: Record<Place, string> = { characters: "My characters", sessions: "Sessions", wiki: "Wiki" };

/** The three main places. `children` render under the current one (the Wiki's sections). */
export function MainNav({ current, go, counts = {}, children }: { current: Place; go: (p: Place) => void; counts?: Partial<Record<Place, number>>; children?: ReactNode }) {
  return (
    <nav className="main-nav" aria-label="Main">
      {(Object.keys(LABELS) as Place[]).map((p) => (
        <div key={p} className="main-nav-item">
          <button type="button" className={`main-nav-link ${current === p ? "on" : ""}`} aria-current={current === p ? "page" : undefined} onClick={() => go(p)}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
              {ICONS[p]}
            </svg>
            <span>{LABELS[p]}</span>
            {counts[p] ? <span className="main-nav-count">{counts[p]}</span> : null}
          </button>
          {current === p && children}
        </div>
      ))}
    </nav>
  );
}

/** ☰: phone only (CSS hides it on wider screens). */
export function MenuButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button type="button" className="menu-btn" aria-label="Open menu" aria-expanded={open} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}

/** Top of the slide-in menu (phone only): the brand and ✕. Esc closes it too. */
export function DrawerHead({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);
  return (
    <div className="drawer-head">
      <Brand />
      <button type="button" className="drawer-x" aria-label="Close menu" onClick={onClose}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

/** The dimmed page behind the open menu (phone only); a tap closes the menu. */
export const DrawerScrim = ({ open, onClose }: { open: boolean; onClose: () => void }) => <div className={`drawer-scrim ${open ? "open" : ""}`} aria-hidden="true" onClick={onClose} />;
