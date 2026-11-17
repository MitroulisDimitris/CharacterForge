import { useEffect, useState } from "react";
import { coinText, coinValue, gpText, rollLoot, type Foe, type Loot } from "../loot";

const RARITY_TIP: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  "very rare": "Very rare",
  legendary: "Legendary",
};

/**
 * Suggested loot: coins for each kind of monster and, once in a while, a magic item.
 * Used on the monster page (one creature) and the Fight over screen (everything beaten).
 */
export function LootCard({ foes, players, title, intro }: { foes: Foe[]; players?: number; title: string; intro: string }) {
  const key = foes.map((f) => `${f.name}:${f.count}:${f.cr}`).join("|");
  const [loot, setLoot] = useState<Loot>(() => rollLoot(foes));
  useEffect(() => setLoot(rollLoot(foes)), [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const each = players && players > 1 ? loot.total / players : 0;
  return (
    <section className="loot" aria-label={title}>
      <div className="loot-head">
        <div>
          <h3>{title}</h3>
          <span className="muted">{intro}</span>
        </div>
        <button type="button" className="btn ghost loot-roll" onClick={() => setLoot(rollLoot(foes))}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.3-5.7" />
            <path d="M20 4v5h-5" />
          </svg>
          Roll again
        </button>
      </div>
      <ul className="loot-list" aria-live="polite">
        {loot.lines.map((l) => (
          <li key={l.name} className={l.coins ? "" : "is-none"}>
            <span className={`loot-badge ${l.coins ? "is-coins" : "is-empty"}`} aria-hidden="true">
              {l.coins ? "GP" : "—"}
            </span>
            <span className="loot-text">
              <strong>{l.coins ? coinText(l.coins) : "Nothing worth taking"}</strong>
              <small>
                {foes.length > 1 || l.count > 1 ? `${l.count} × ${l.name}` : l.coins ? "Coins in a pouch" : ""}
                {l.why ? `${foes.length > 1 || l.count > 1 ? " · " : ""}${l.why}` : ""}
              </small>
            </span>
            {l.coins && <span className="loot-value">{gpText(coinValue(l.coins))}</span>}
          </li>
        ))}
        {loot.item && (
          <li className="is-magic">
            <span className="loot-badge is-magic" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
                <path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
              </svg>
            </span>
            <span className="loot-text">
              <strong>{loot.item.item.name}</strong>
              <small>
                {RARITY_TIP[loot.item.item.rarity]} magic item{foes.length > 1 ? ` · on the ${loot.item.from}` : ""} · {loot.item.item.note}
              </small>
            </span>
          </li>
        )}
      </ul>
      {loot.total > 0 && (
        <p className="loot-total">
          Worth <strong>{gpText(loot.total)}</strong> in coins
          {each > 0 && (
            <>
              {" "}
              · about <strong>{gpText(each)}</strong> each for {players} players
            </>
          )}
        </p>
      )}
      <details className="loot-how">
        <summary>How loot is chosen</summary>
        <p>Coins grow with the monster's challenge rating. Animals, oozes, plants, constructs, elementals and mindless creatures carry none.</p>
        <p>Once in a while (a few fights in a hundred) there's also a magic item. Tougher monsters give rarer items.</p>
        <p>It's only a suggestion: keep what fits your story, or roll again.</p>
      </details>
    </section>
  );
}
