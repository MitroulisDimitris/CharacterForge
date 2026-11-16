// The "Sheet" tab: what a player looks at most during a game. It opens first and holds the
// numbers, the "In play" pools (tap to spend, rests) and the full summary, which used to sit in
// the sidebar (user request, 2026-11-16).
import type { AnySystem, BaseCharacter } from "../systems/types";
import { ResourcePips } from "./ResourcePips";

export const SHEET_TAB = "sheet";

export function SheetTab({
  system,
  c,
  d,
  set,
}: {
  system: AnySystem;
  c: BaseCharacter;
  d: unknown;
  set: (patch: Partial<BaseCharacter>) => void;
}) {
  const Summary = system.Summary;
  const pools = system.resources?.(c, d) ?? [];
  return (
    <div className={`sheet-tab ${pools.length ? "with-pools" : ""}`}>
      <section className="sheet-summary" aria-label="Character summary">
        <Summary c={c} d={d} />
      </section>
      {pools.length > 0 && (
        <section className="sheet-pools" aria-label="In play">
          <span className="hero-label">In play · tap to use</span>
          <ResourcePips c={c} pools={pools} set={set} />
        </section>
      )}
    </div>
  );
}
