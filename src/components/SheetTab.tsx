// The "Sheet" tab: what a player looks at most during a game. It opens first and holds the
// numbers, the "In play" pools (tap to spend, rests) and the full summary, which used to sit in
// the sidebar (user request, 2026-11-16).
import type { ReactNode } from "react";
import type { AnySystem, BaseCharacter } from "../systems/types";
import { InPlayPanel } from "./InPlay";
import { DiceButton, NextRoll, useCanRoll } from "./Dice";

export const SHEET_TAB = "sheet";

export function SheetTab({
  system,
  c,
  d,
  set,
  top,
  withHp = false,
}: {
  /** Shown above everything. */
  top?: ReactNode;
  /** Layouts without the sidebar show the HP box in the In play panel. */
  withHp?: boolean;
  system: AnySystem;
  c: BaseCharacter;
  d: unknown;
  set: (patch: Partial<BaseCharacter>) => void;
}) {
  const Summary = system.Summary;
  const Numbers = system.SheetNumbers;
  const pools = system.resources?.(c, d) ?? [];
  const canRoll = useCanRoll();
  return (
    <>
    {top}
    {Numbers && <Numbers c={c} d={d} />}
    {canRoll && (
      <div className="sheet-dice">
        <NextRoll />
        <DiceButton />
        <p className="sheet-dice-tip muted">
          <b>Tip ·</b> Tap a gold number to roll it. Your bonus is added for you.
        </p>
      </div>
    )}
    <div className="sheet-tab">
      <InPlayPanel c={c} card={system.tableCard?.(c, d) ?? null} pools={pools} set={set} concSpells={system.concentrationSpells?.(c, d) ?? []} withHp={withHp} />
      <section className="sheet-summary" aria-label="Character summary">
        <Summary c={c} d={d} inSheet />
      </section>
    </div>
    </>
  );
}
