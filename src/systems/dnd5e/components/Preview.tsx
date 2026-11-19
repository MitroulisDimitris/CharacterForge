// Live previews while choosing (UI rules: calm first, preview before you commit).
// A choice list on the left, a panel on the right that shows what the hovered option changes.
import { useRef, useState, type ReactNode } from "react";
import { useSmoothHeight } from "../../../components/smooth";
import { ABILITIES, ABILITY_NAMES } from "../data/core";
import type { Derived } from "../derive";
import type { ChangeLine } from "../../types";
import { diffDerived } from "../preview";
import { Radar } from "../../../components/Radar";

/** Hover/focus state for a list of options; `bind(id)` goes on each option. */
export function useHover<T extends string>() {
  const [hover, setHover] = useState<T | null>(null);
  const bind = (id: T) => ({
    onMouseEnter: () => setHover(id),
    onMouseLeave: () => setHover((h) => (h === id ? null : h)),
    onFocus: () => setHover(id),
    onBlur: () => setHover((h) => (h === id ? null : h)),
  });
  return { hover, bind };
}

/** Options on the left, a sticky preview panel on the right (stacks on narrow screens). */
export function WithPreview({ children, panel }: { children: ReactNode; panel: ReactNode }) {
  // The panel changes on every hover: it only ever grows (smoothly), so what's below stays put.
  const ref = useRef<HTMLElement>(null);
  useSmoothHeight(ref, { growOnly: true });
  return (
    <div className="with-preview">
      <div className="with-preview-main">{children}</div>
      <aside ref={ref} className="preview-panel">{panel}</aside>
    </div>
  );
}

export function PreviewHead({ title, previewing, empty }: { title: string; previewing: boolean; empty?: boolean }) {
  return (
    <div className="preview-head">
      <strong>{title}</strong>
      <span className={`preview-mode ${previewing || empty ? "" : "chosen"}`}>{empty ? "Nothing chosen" : previewing ? "Previewing" : "Your choice"}</span>
    </div>
  );
}

export function ChangeList({ lines, empty = "No changes to your numbers." }: { lines: ChangeLine[]; empty?: string }) {
  if (!lines.length) return <p className="muted small-text">{empty}</p>;
  return (
    <ul className="change-list">
      {lines.map((l, i) => (
        <li key={i} className={`change ${l.tone}`}>
          <span className="change-label">{l.label}</span>
          {(l.from || l.to) && (
            <span className="change-val">
              {l.from && <span className="from">{l.from}</span>}
              {l.from && l.to && <span className="arrow">→</span>}
              {l.to && <span className="to">{l.to}</span>}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Six-ability hexagon: your scores now (red) and, when previewing, the scores with the option (green),
 * labelled "13 → 15 +2"; plus the other changes it brings (DC, HP, AC, speed, skills…).
 */
export function AbilityPreview({ before, after, title, previewing, chips = [], empty }: { before: Derived; after: Derived | null; title: string; previewing: boolean; chips?: string[]; empty?: string }) {
  const shown = after ?? before;
  const changes = after ? diffDerived(before, after, { abilities: false }) : [];
  const main = before.cls.recommended[0];
  return (
    <div className="preview-card">
      <PreviewHead title={title} previewing={previewing} empty={!after} />
      <div className="radar-legend">
        <span className="leg now">Your scores now</span>
        {after && <span className="leg new">With this choice</span>}
      </div>
      <Radar
        axes={[...ABILITIES]}
        values={ABILITIES.map((a) => shown.scores[a])}
        compare={after ? ABILITIES.map((a) => before.scores[a]) : undefined}
        min={6}
        max={20}
        color={after ? "#6fbf73" : "var(--accent-strong)"}
        width={380}
        height={300}
        ariaLabel={`Ability scores: ${ABILITIES.map((a) => `${ABILITY_NAMES[a]} ${shown.scores[a]}`).join(", ")}`}
        label={(i) => {
          const a = ABILITIES[i];
          const from = before.scores[a];
          const to = shown.scores[a];
          return (
            <>
              <div className="radar-num">
                {to !== from ? (
                  <>
                    <span className="was">{from}</span>
                    <span className="arrow">→</span>
                    <span className="now up">{to}</span>
                  </>
                ) : (
                  <span className={`now ${a === main ? "main" : ""}`}>{to}</span>
                )}
              </div>
              <div className="radar-axis">
                {a}
                {to !== from && <span className="delta">{to > from ? "+" : ""}{to - from}</span>}
              </div>
            </>
          );
        }}
      />
      {after ? <ChangeList lines={changes} /> : <p className="muted small-text">{empty ?? "Hover an option to see what it changes."}</p>}
      {chips.length > 0 && (
        <div className="chip-row">
          {chips.map((t) => (
            <span key={t} className="trait-chip">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** "What changes" only (no chart): for backgrounds, equipment and similar picks. */
export function ChangePreview({ before, after, title, previewing, chips = [], empty }: { before: Derived; after: Derived | null; title: string; previewing: boolean; chips?: string[]; empty?: string }) {
  return (
    <div className="preview-card">
      <PreviewHead title={title} previewing={previewing} empty={!after} />
      {after ? <ChangeList lines={diffDerived(before, after)} /> : <p className="muted small-text">{empty ?? "Hover an option to see what it changes."}</p>}
      {chips.length > 0 && (
        <div className="chip-row">
          {chips.map((t) => (
            <span key={t} className="trait-chip">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
