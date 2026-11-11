// Pieces of the "Hero" skin layout: class crest with a level ring, and the "⋯" menu for
// secondary actions (UI rules: secondary actions live in a menu, not as visible buttons).
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Class icon and colour, matched on the identity text. */
const ICONS: [RegExp, string, string][] = [
  [/barbarian/i, "M14 3l7 7-4 1-4-4z M13 7L3 17l4 4L17 11", "#e0485e"],
  [/bard/i, "M9 15a4 4 0 1 0 0 .1 M12 12L20 4 M18 2l4 4", "#d98ad0"],
  [/cleric/i, "M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10 M12 1v3 M12 20v3 M1 12h3 M20 12h3", "#ecc46e"],
  [/druid/i, "M5 19c0-9 6-14 15-15-1 9-6 15-15 15z M5 19l7-7", "#6fbf73"],
  [/fighter/i, "M14 4h6v6L9 21l-6-6z M5 13l6 6", "#e8d3a6"],
  [/monk/i, "M7 11V6a2 2 0 0 1 4 0v5 M11 9a2 2 0 0 1 4 0v2 M15 10a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7H11a5 5 0 0 1-5-5v-3", "#5fc4c4"],
  [/paladin/i, "M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z", "#f0c060"],
  [/ranger/i, "M4 20C14 20 20 14 20 4 M4 20L20 4 M15 4h5v5", "#8fbf6f"],
  [/rogue/i, "M14 3l7 7-9 9-4-4z M3 21l5-5", "#b9a3e8"],
  [/sorcerer/i, "M12 2c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-7z", "#e0485e"],
  [/warlock/i, "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6", "#9a7bd8"],
  [/wizard/i, "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z", "#8fb6e3"],
  [/artificer/i, "M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3", "#d4a64a"],
];
const SPARK = "M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z";

/** Class crest with a ring showing how far along levels 1–max the character is. */
export function Crest({ identity, level, maxLevel, size = 132, badge = true }: { identity: string; level: number; maxLevel: number; size?: number; badge?: boolean }) {
  const hit = ICONS.find(([re]) => re.test(identity));
  const icon = hit?.[1] ?? SPARK;
  const r = size / 2 - 5;
  const len = 2 * Math.PI * r;
  const filled = Math.max(0.03, Math.min(1, level / Math.max(1, maxLevel)));
  return (
    <div className="crest" style={{ width: size, height: size, ...(hit ? { ["--crest-color" as string]: hit[2] } : {}) }}>
      <svg aria-hidden="true" width={size} height={size} className="crest-ring">
        <circle cx={size / 2} cy={size / 2} r={r} className="crest-track" />
        <circle cx={size / 2} cy={size / 2} r={r} className="crest-fill" strokeDasharray={len} strokeDashoffset={len * (1 - filled)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="crest-core" style={{ width: size * 0.76, height: size * 0.76 }}>
        <svg aria-hidden="true" width={size * 0.36} height={size * 0.36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      {badge && <span className="crest-level">Level {level}</span>}
    </div>
  );
}

/** "⋯" button with a small menu of secondary actions. */
export function MoreMenu({ children, label = "More actions" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="more" ref={ref}>
      <button type="button" className="more-btn" aria-label={label} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        ⋯
      </button>
      {open && (
        <div className="more-menu" role="menu" onClick={(e) => (e.target as HTMLElement).closest("button") && setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Short labels for the sidebar's stat tiles. */
export const SHORT: Record<string, string> = {
  "Hit Points": "HP",
  "Armor Class": "AC",
  "Proficiency Bonus": "Prof",
  "Spell Save DC": "Save DC",
  "Spell Attack": "Spell atk",
  "Sorcery Points": "Sorcery",
  "Base Attack": "BAB",
  Perception: "Percep.",
};
