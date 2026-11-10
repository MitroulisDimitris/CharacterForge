// Tappable pips for spell slots, sorcery points and other pools, plus Short/Long rest.
// Filled pip = still available. Tap a filled pip to spend it (and the ones after it); tap an
// empty pip to get it back.
import type { BaseCharacter, ResourcePool } from "../systems/types";
import { availableOf, clickPip, rest } from "../resources";

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
}) {
  if (!pools.length) return null;
  const anyShort = pools.some((p) => p.refresh === "short");
  const anyUsed = pools.some((p) => availableOf(c, p) < p.max);
  return (
    <div className={`pools ${compact ? "compact" : ""}`}>
      {pools.map((p) => {
        const avail = availableOf(c, p);
        return (
          <div className="pool" key={p.id}>
            <span className={`pool-label ${p.kind}`}>{p.label}</span>
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
            <span className="pool-count">
              {avail}/{p.max}
            </span>
          </div>
        );
      })}
      <div className="pool-rests">
        {anyShort && (
          <button type="button" className="btn small ghost" onClick={() => set(rest(c, pools, "short"))} title="Refills pools that come back on a short rest">
            Short rest
          </button>
        )}
        <button type="button" className="btn small ghost" disabled={!anyUsed} onClick={() => set(rest(c, pools, "long"))} title="Refills everything">
          Long rest
        </button>
      </div>
    </div>
  );
}
