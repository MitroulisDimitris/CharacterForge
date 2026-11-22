// Tappable pips for spell slots, sorcery points and other pools. Filled pip = still available.
// Tap a filled pip to spend it (and the ones after it); tap an empty pip to get it back. Big pools
// (Lay on Hands) get − / + instead. Rests live in the Sheet's "In play" panel (InPlay.tsx), which
// also brings back HP and Hit Dice.
import type { BaseCharacter, ResourcePool } from "../systems/types";
import { availableOf, clickPip, setAvailable } from "../resources";

export function ResourcePips({
  c,
  pools,
  set,
  compact = false,
}: {
  c: BaseCharacter;
  pools: ResourcePool[];
  set: (patch: Partial<BaseCharacter>) => void;
  compact?: boolean;
  /** Kept for callers; rests are in the In play panel now. */
  noRests?: boolean;
}) {
  if (!pools.length) return null;
  return (
    <div className={`pools ${compact ? "compact" : ""}`}>
      {pools.map((p) => {
        const avail = availableOf(c, p);
        return (
          <div className="pool" key={p.id}>
            <span className={`pool-label ${p.kind}`}>{p.label}</span>
            {p.max > 10 ? (
              <span className="stepper pool-stepper" role="group" aria-label={`${p.label}: ${avail} of ${p.max} left`}>
                <button type="button" aria-label={`Use one ${p.label}`} disabled={!avail} onClick={() => set(setAvailable(c, p, avail - 1))}>
                  −
                </button>
                <strong>{avail}</strong>
                <button type="button" aria-label={`Get one ${p.label} back`} disabled={avail >= p.max} onClick={() => set(setAvailable(c, p, avail + 1))}>
                  +
                </button>
              </span>
            ) : (
            <span className="pool-pips" role="group" aria-label={`${p.label}: ${avail} of ${p.max} left`}>
              {Array.from({ length: p.max }, (_, i) => (
                <button
                  type="button"
                  key={i}
                  className={`pip ${p.kind} ${i < avail ? "on" : ""}`}
                  aria-label={i < avail ? `Use ${p.label} (${avail} left)` : `Get back ${p.label}`}
                  title={i < avail ? "Tap to use" : "Tap to get it back"}
                  onClick={() => set(clickPip(c, p, i))}
                />
              ))}
            </span>
            )}
            <span className="pool-count">
              {avail}/{p.max}
            </span>
          </div>
        );
      })}
    </div>
  );
}
